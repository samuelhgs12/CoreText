"""Rota de geração de resumo individual de um PDF (issue 12)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import PDFFile, Summary, User
from app.routers.errors import summary_generation_http_exception
from app.schemas import SummaryOut
from app.services.llm_client import LLMError
from app.services.pdf_extraction import PDFExtractionError
from app.services.summarization import generate_individual_summary

router = APIRouter(prefix="/files", tags=["summaries"])


@router.post(
    "/{file_id}/summary", response_model=SummaryOut, status_code=status.HTTP_201_CREATED
)
def create_individual_summary(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Summary:
    pdf_file = db.get(PDFFile, file_id)
    if pdf_file is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não encontrado."
        )

    if pdf_file.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para acessar este arquivo.",
        )

    try:
        return generate_individual_summary(db, pdf_file)
    except (PDFExtractionError, LLMError) as exc:
        raise summary_generation_http_exception(exc) from exc
