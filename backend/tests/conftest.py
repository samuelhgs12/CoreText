from pathlib import Path

import pytest
from pypdf import PdfWriter
from reportlab.pdfgen import canvas


@pytest.fixture
def valid_pdf_with_text(tmp_path) -> Path:
    """PDF pequeno e válido, com texto extraível em duas páginas."""
    path = tmp_path / "valid.pdf"
    c = canvas.Canvas(str(path))
    c.drawString(100, 750, "Hello, this is page one.")
    c.showPage()
    c.drawString(100, 750, "Segunda pagina com texto.")
    c.showPage()
    c.save()
    return path


@pytest.fixture
def empty_pdf(tmp_path) -> Path:
    """PDF válido, mas sem nenhuma página."""
    path = tmp_path / "empty.pdf"
    writer = PdfWriter()
    with open(path, "wb") as f:
        writer.write(f)
    return path


@pytest.fixture
def pdf_without_text(tmp_path) -> Path:
    """PDF válido com página, mas sem texto extraível (ex.: apenas um desenho)."""
    path = tmp_path / "no_text.pdf"
    c = canvas.Canvas(str(path))
    c.line(50, 50, 200, 200)
    c.showPage()
    c.save()
    return path


@pytest.fixture
def corrupted_pdf(tmp_path) -> Path:
    """Arquivo com extensão .pdf, mas conteúdo inválido/corrompido."""
    path = tmp_path / "corrupted.pdf"
    path.write_bytes(b"this is not a real pdf content at all")
    return path
