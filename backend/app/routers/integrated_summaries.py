"""Rota de geração de resumo integrado de múltiplos PDFs (issue 13)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import IntegratedSummary, PDFFile, User
from app.routers.errors import summary_generation_http_exception
from app.schemas import IntegratedSummaryOut, IntegratedSummaryRequest
from app.services.llm_client import LLMError
from app.services.pdf_extraction import PDFExtractionError
from app.services.summarization import generate_integrated_summary

router = APIRouter(prefix="/summaries", tags=["summaries"])


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
