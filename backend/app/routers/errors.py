"""Mapeamento de exceções dos serviços de resumo para HTTPException.

Compartilhado entre as rotas de resumo individual (issue 12) e integrado (issue 13).
"""

from fastapi import HTTPException, status

from app.services.llm_client import (
    LLMAuthenticationError,
    LLMConfigurationError,
    LLMConnectionError,
    LLMEmptyResponseError,
    LLMError,
)
from app.services.pdf_extraction import PDFExtractionError


def summary_generation_http_exception(exc: Exception) -> HTTPException:
    """Traduz uma exceção lançada durante a geração de resumo em um HTTPException."""
    if isinstance(exc, PDFExtractionError):
        return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc))
    if isinstance(exc, (LLMConfigurationError, LLMAuthenticationError)):
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha na configuração do serviço de LLM.",
        )
    if isinstance(exc, LLMConnectionError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Serviço de LLM indisponível no momento. Tente novamente mais tarde.",
        )
    if isinstance(exc, LLMEmptyResponseError):
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="A LLM não retornou um resumo válido."
        )
    if isinstance(exc, LLMError):
        return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    raise exc
