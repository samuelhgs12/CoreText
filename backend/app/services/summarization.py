"""Serviço de geração de resumo individual de um PDF."""

from __future__ import annotations

import time

from sqlalchemy.orm import Session

from app.models import PDFFile, Summary
from app.services.llm_client import LLMClient
from app.services.pdf_extraction import extract_text_from_pdf
from app.services.prompts import (
    INDIVIDUAL_SUMMARY_SYSTEM_INSTRUCTION,
    build_individual_summary_prompt,
)


def generate_individual_summary(
    db: Session, pdf_file: PDFFile, llm_client: LLMClient | None = None
) -> Summary:
    """Extrai o texto do PDF, gera um resumo via LLM e persiste o resultado.

    Args:
        db: sessão de banco de dados.
        pdf_file: registro do arquivo já validado (existente e pertencente ao usuário).
        llm_client: cliente de LLM a usar; se omitido, um novo é criado a partir
            das configurações padrão (usado em testes para injetar um cliente falso).

    Returns:
        O registro Summary já persistido no banco.

    Raises:
        app.services.pdf_extraction.PDFExtractionError: falha ao extrair texto do PDF.
        app.services.llm_client.LLMError: falha na comunicação com a LLM.
    """
    start = time.perf_counter()

    extraction_result = extract_text_from_pdf(pdf_file.filepath)
    prompt = build_individual_summary_prompt(extraction_result.text)

    client = llm_client if llm_client is not None else LLMClient()
    summary_text = client.generate_text(
        prompt, system_instruction=INDIVIDUAL_SUMMARY_SYSTEM_INSTRUCTION
    )

    generation_time_ms = (time.perf_counter() - start) * 1000

    summary = Summary(
        file_id=pdf_file.id,
        content=summary_text,
        generation_time_ms=generation_time_ms,
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return summary
