import pytest

from app.services.pdf_extraction import (
    EmptyPDFError,
    InvalidPDFError,
    NoExtractableTextError,
    PDFNotFoundError,
    extract_text_from_pdf,
)


def test_extract_text_from_valid_pdf(valid_pdf_with_text):
    result = extract_text_from_pdf(valid_pdf_with_text)

    assert result.page_count == 2
    assert "Hello, this is page one." in result.pages[0].text
    assert "Segunda pagina com texto." in result.pages[1].text


def test_result_text_joins_all_pages_in_order(valid_pdf_with_text):
    result = extract_text_from_pdf(valid_pdf_with_text)

    assert result.text == "\n\n".join(page.text for page in result.pages)
    assert "Hello" in result.text and "Segunda" in result.text


def test_accepts_string_path_as_well_as_pathlib_path(valid_pdf_with_text):
    result = extract_text_from_pdf(str(valid_pdf_with_text))

    assert result.page_count == 2


def test_raises_when_file_does_not_exist(tmp_path):
    missing_path = tmp_path / "does_not_exist.pdf"

    with pytest.raises(PDFNotFoundError):
        extract_text_from_pdf(missing_path)


def test_raises_when_file_is_corrupted(corrupted_pdf):
    with pytest.raises(InvalidPDFError):
        extract_text_from_pdf(corrupted_pdf)


def test_raises_when_pdf_has_no_pages(empty_pdf):
    with pytest.raises(EmptyPDFError):
        extract_text_from_pdf(empty_pdf)


def test_raises_when_pdf_has_no_extractable_text(pdf_without_text):
    with pytest.raises(NoExtractableTextError):
        extract_text_from_pdf(pdf_without_text)
