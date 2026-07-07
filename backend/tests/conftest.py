from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from reportlab.pdfgen import canvas
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_db
from app.main import app
from app.routers import files as files_router
from app.services import summarization as summarization_module


AUTH_TOKENS: dict[int, str] = {}


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


# --- Fixtures e helpers compartilhados pelos testes de API (issues 12 e 13) ---


class FakeLLMClient:
    """Substitui o LLMClient real nos testes de API, sem depender de rede/API key."""

    def __init__(self, *args, **kwargs) -> None:
        pass

    def generate_text(self, prompt: str, *, system_instruction: str | None = None) -> str:
        return "Resumo de teste gerado pela LLM falsa."


@pytest.fixture()
def test_session_factory(tmp_path):
    """Substitui o banco da aplicação por um SQLite temporário isolado por teste."""
    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield testing_session_local
    app.dependency_overrides.clear()


@pytest.fixture()
def client(test_session_factory) -> TestClient:
    AUTH_TOKENS.clear()
    return TestClient(app)


@pytest.fixture(autouse=True)
def _fake_llm(monkeypatch):
    monkeypatch.setattr(summarization_module, "LLMClient", FakeLLMClient)


@pytest.fixture(autouse=True)
def _isolated_upload_dir(monkeypatch, tmp_path):
    """Evita que os testes gravem PDFs de upload na pasta real storage/uploads."""
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    monkeypatch.setattr(files_router, "UPLOAD_DIR", upload_dir)


def create_user(client: TestClient, username: str) -> int:
    email = f"{username}@example.com"
    resp = client.post(
        "/auth/register",
        json={"full_name": username.title(), "email": email, "password": "12345678"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    AUTH_TOKENS[body["user"]["id"]] = body["access_token"]
    return body["user"]["id"]


def auth_header(user_id: int) -> dict[str, str]:
    token = AUTH_TOKENS[user_id]
    return {"Authorization": f"Bearer {token}"}


def make_pdf_bytes(tmp_path: Path, filename: str, with_text: bool) -> bytes:
    pdf_path = tmp_path / filename
    c = canvas.Canvas(str(pdf_path))
    if with_text:
        c.drawString(100, 750, "Conteudo de teste do PDF para resumo.")
    c.showPage()
    c.save()
    return pdf_path.read_bytes()


def upload_pdf(
    client: TestClient, user_id: int, tmp_path: Path, filename: str, with_text: bool = True
):
    pdf_bytes = make_pdf_bytes(tmp_path, filename, with_text)
    return client.post(
        "/files",
        headers=auth_header(user_id),
        files={"file": (filename, pdf_bytes, "application/pdf")},
    )
