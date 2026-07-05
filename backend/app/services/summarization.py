"""Serviços de geração de resumo (individual e integrado)."""

from __future__ import annotations

import time

from sqlalchemy.orm import Session

from app.models import IntegratedSummary, PDFFile, Summary
from app.services.llm_client import LLMClient
from app.services.pdf_extraction import extract_text_from_pdf
from app.services.prompts import (
    INDIVIDUAL_SUMMARY_SYSTEM_INSTRUCTION,
    INTEGRATED_SUMMARY_SYSTEM_INSTRUCTION,
    build_individual_summary_prompt,
    build_integrated_summary_prompt,
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


def generate_integrated_summary(
    db: Session, pdf_files: list[PDFFile], llm_client: LLMClient | None = None
) -> IntegratedSummary:
    """Extrai o texto de vários PDFs, gera um resumo integrado via LLM e persiste o resultado.

    Args:
        db: sessão de banco de dados.
        pdf_files: registros dos arquivos já validados (existentes, não vazios e
            pertencentes ao usuário), na ordem em que devem aparecer no prompt.
        llm_client: cliente de LLM a usar; se omitido, um novo é criado a partir
            das configurações padrão (usado em testes para injetar um cliente falso).

    Returns:
        O registro IntegratedSummary já persistido no banco.

    Raises:
        app.services.pdf_extraction.PDFExtractionError: falha ao extrair texto de algum PDF.
        app.services.llm_client.LLMError: falha na comunicação com a LLM.
    """
    start = time.perf_counter()

    documents = [
        (pdf_file.filename, extract_text_from_pdf(pdf_file.filepath).text)
        for pdf_file in pdf_files
    ]
    prompt = build_integrated_summary_prompt(documents)

    client = llm_client if llm_client is not None else LLMClient()
    summary_text = client.generate_text(
        prompt, system_instruction=INTEGRATED_SUMMARY_SYSTEM_INSTRUCTION
    )

    generation_time_ms = (time.perf_counter() - start) * 1000

    summary = IntegratedSummary(content=summary_text, generation_time_ms=generation_time_ms)
    summary.files = pdf_files
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return summary
