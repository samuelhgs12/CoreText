"""Rota de geração de resumo integrado de múltiplos PDFs (issue 13)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import IntegratedSummary, PDFFile, Summary, User, integrated_summary_files
from app.routers.errors import summary_generation_http_exception
from app.schemas import IntegratedSummaryOut, IntegratedSummaryRequest, SummaryHistoryItemOut
from app.services.llm_client import LLMError
from app.services.pdf_extraction import PDFExtractionError
from app.services.summarization import generate_integrated_summary

router = APIRouter(prefix="/summaries", tags=["summaries"])


def _ensure_integrated_summary_owner(
    summary: IntegratedSummary, current_user: User
) -> None:
    if not summary.files or any(file.owner_id != current_user.id for file in summary.files):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para acessar este resumo.",
        )


@router.get("", response_model=list[SummaryHistoryItemOut])
def list_summaries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    individual_summaries = (
        db.query(Summary)
        .join(PDFFile, Summary.file_id == PDFFile.id)
        .filter(PDFFile.owner_id == current_user.id)
        .order_by(Summary.created_at.desc(), Summary.id.desc())
        .all()
    )

    integrated_summaries = (
        db.query(IntegratedSummary)
        .join(
            integrated_summary_files,
            IntegratedSummary.id == integrated_summary_files.c.integrated_summary_id,
        )
        .join(PDFFile, integrated_summary_files.c.file_id == PDFFile.id)
        .filter(PDFFile.owner_id == current_user.id)
        .distinct()
        .order_by(IntegratedSummary.created_at.desc(), IntegratedSummary.id.desc())
        .all()
    )

    history_items = [
        {
            "id": f"individual-{summary.id}",
            "type": "individual",
            "title": summary.file.filename,
            "files": [summary.file.filename],
            "content": summary.content,
            "generation_time_ms": summary.generation_time_ms,
            "created_at": summary.created_at,
        }
        for summary in individual_summaries
    ]

    history_items.extend(
        {
            "id": f"integrated-{summary.id}",
            "type": "integrated",
            "title": f"Resumo integrado de {len(summary.files)} arquivos",
            "files": [file.filename for file in summary.files],
            "content": summary.content,
            "generation_time_ms": summary.generation_time_ms,
            "created_at": summary.created_at,
        }
        for summary in integrated_summaries
    )

    return sorted(history_items, key=lambda item: item["created_at"], reverse=True)


@router.delete("/{summary_type}/{summary_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_summary(
    summary_type: str,
    summary_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    if summary_type == "individual":
        summary = db.get(Summary, summary_id)
        if summary is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Resumo não encontrado."
            )

        if summary.file.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para acessar este resumo.",
            )

        db.delete(summary)
        db.commit()
        return

    if summary_type == "integrated":
        summary = db.get(IntegratedSummary, summary_id)
        if summary is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Resumo não encontrado."
            )

        _ensure_integrated_summary_owner(summary, current_user)
        db.delete(summary)
        db.commit()
        return

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Tipo de resumo inválido.",
    )


@router.post(
    "/integrated", response_model=IntegratedSummaryOut, status_code=status.HTTP_201_CREATED
)
def create_integrated_summary(
    payload: IntegratedSummaryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> IntegratedSummary:
    # Pydantic (Field(min_length=1)) já impede lista vazia com 422 automático.
    # Remove duplicatas preservando a ordem escolhida pelo usuário.
    unique_ids = list(dict.fromkeys(payload.file_ids))

    pdf_files = db.query(PDFFile).filter(PDFFile.id.in_(unique_ids)).all()
    files_by_id = {f.id: f for f in pdf_files}

    missing_ids = [i for i in unique_ids if i not in files_by_id]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Arquivo(s) não encontrado(s): {missing_ids}.",
        )

    not_owned_ids = [i for i in unique_ids if files_by_id[i].owner_id != current_user.id]
    if not_owned_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Você não tem permissão para acessar o(s) arquivo(s): {not_owned_ids}.",
        )

    ordered_files = [files_by_id[i] for i in unique_ids]

    try:
        return generate_integrated_summary(db, ordered_files)
    except (PDFExtractionError, LLMError) as exc:
        raise summary_generation_http_exception(exc) from exc
