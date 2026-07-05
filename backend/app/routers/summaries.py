"""Rota de geração de resumo individual de um PDF (issue 12)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import PDFFile, Summary, User
from app.schemas import SummaryOut
from app.services.llm_client import (
    LLMAuthenticationError,
    LLMConfigurationError,
    LLMConnectionError,
    LLMEmptyResponseError,
    LLMError,
)
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
    except PDFExtractionError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        ) from exc
    except (LLMConfigurationError, LLMAuthenticationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha na configuração do serviço de LLM.",
        ) from exc
    except LLMConnectionError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Serviço de LLM indisponível no momento. Tente novamente mais tarde.",
        ) from exc
    except LLMEmptyResponseError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="A LLM não retornou um resumo válido.",
        ) from exc
    except LLMError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
