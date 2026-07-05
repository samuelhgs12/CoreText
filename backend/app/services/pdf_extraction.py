"""Serviço de extração de texto de arquivos PDF.

Responsável por converter o conteúdo de um PDF em texto plano pronto
para ser enviado a uma LLM para geração de resumos (issues 11-13).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from pypdf import PdfReader
from pypdf.errors import PdfReadError

PAGE_SEPARATOR = "\n\n"


class PDFExtractionError(Exception):
    """Erro genérico de extração de texto de PDF."""


class PDFNotFoundError(PDFExtractionError):
    """O caminho informado não aponta para um arquivo existente."""


class InvalidPDFError(PDFExtractionError):
    """O arquivo não pôde ser lido como PDF (corrompido ou formato inválido)."""


class EmptyPDFError(PDFExtractionError):
    """O PDF é válido, mas não possui nenhuma página."""


class NoExtractableTextError(PDFExtractionError):
    """O PDF possui páginas, mas nenhuma delas contém texto extraível.

    Ocorre tipicamente em PDFs digitalizados (imagens escaneadas) sem
    camada de OCR.
    """


@dataclass(frozen=True)
class ExtractedPage:
    number: int
    text: str


@dataclass(frozen=True)
class PDFExtractionResult:
    """Resultado da extração, pronto para consumo pela integração com a LLM."""

    source: str
    pages: list[ExtractedPage]

    @property
    def page_count(self) -> int:
        return len(self.pages)

    @property
    def text(self) -> str:
        """Texto completo concatenado, na ordem das páginas."""
        return PAGE_SEPARATOR.join(page.text for page in self.pages)


def extract_text_from_pdf(pdf_path: str | Path) -> PDFExtractionResult:
    """Extrai o texto de todas as páginas de um PDF.

    Args:
        pdf_path: caminho para o arquivo PDF no sistema de arquivos.

    Returns:
        PDFExtractionResult contendo o texto por página e o texto completo
        concatenado, em um formato adequado para envio à LLM.

    Raises:
        PDFNotFoundError: se o arquivo não existir.
        InvalidPDFError: se o arquivo não puder ser interpretado como PDF.
        EmptyPDFError: se o PDF não possuir páginas.
        NoExtractableTextError: se nenhuma página tiver texto extraível.
    """
    path = Path(pdf_path)

    if not path.is_file():
        raise PDFNotFoundError(f"Arquivo não encontrado: {path}")

    try:
        reader = PdfReader(path)
    except (PdfReadError, OSError) as exc:
        raise InvalidPDFError(f"Não foi possível ler o PDF '{path}': {exc}") from exc

    if reader.is_encrypted:
        try:
            # Tenta decriptar com senha vazia (comum em PDFs "protegidos" sem senha real).
            reader.decrypt("")
        except Exception as exc:  # pypdf levanta tipos variados conforme o filtro de criptografia
            raise InvalidPDFError(
                f"PDF protegido por senha não pôde ser aberto: {path}"
            ) from exc

    if len(reader.pages) == 0:
        raise EmptyPDFError(f"PDF sem páginas: {path}")

    pages: list[ExtractedPage] = []
    for index, page in enumerate(reader.pages, start=1):
        try:
            raw_text = page.extract_text() or ""
        except Exception as exc:
            raise InvalidPDFError(
                f"Falha ao extrair texto da página {index} de '{path}': {exc}"
            ) from exc
        pages.append(ExtractedPage(number=index, text=raw_text.strip()))

    if not any(page.text for page in pages):
        raise NoExtractableTextError(
            f"PDF sem texto extraível (possivelmente digitalizado sem OCR): {path}"
        )

    return PDFExtractionResult(source=str(path), pages=pages)
