import pytest
from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_db
from app.main import app
from app.models import Summary
from app.routers import files as files_router
from app.services import summarization as summarization_module


class FakeLLMClient:
    """Substitui o LLMClient real nos testes para não depender de rede/API key."""

    def __init__(self, *args, **kwargs) -> None:
        pass

    def generate_text(self, prompt: str, *, system_instruction: str | None = None) -> str:
        return "Resumo de teste gerado pela LLM falsa."


@pytest.fixture()
def test_session_factory(tmp_path):
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
def client(test_session_factory):
    return TestClient(app)


@pytest.fixture(autouse=True)
def _fake_llm(monkeypatch):
    monkeypatch.setattr(summarization_module, "LLMClient", FakeLLMClient)


@pytest.fixture(autouse=True)
def _isolated_upload_dir(monkeypatch, tmp_path):
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    monkeypatch.setattr(files_router, "UPLOAD_DIR", upload_dir)


def _create_user(client: TestClient, username: str) -> int:
    resp = client.post("/users", json={"username": username})
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _make_pdf_bytes(tmp_path, filename: str, with_text: bool) -> bytes:
    pdf_path = tmp_path / filename
    c = canvas.Canvas(str(pdf_path))
    if with_text:
        c.drawString(100, 750, "Conteudo de teste do PDF para resumo.")
    c.showPage()
    c.save()
    return pdf_path.read_bytes()


def _upload_pdf(client: TestClient, user_id: int, tmp_path, filename: str, with_text: bool = True):
    pdf_bytes = _make_pdf_bytes(tmp_path, filename, with_text)
    return client.post(
        "/files",
        headers={"X-User-Id": str(user_id)},
        files={"file": (filename, pdf_bytes, "application/pdf")},
    )


def test_generate_individual_summary_success(client, tmp_path):
    user_id = _create_user(client, "alice")
    upload_resp = _upload_pdf(client, user_id, tmp_path, "doc.pdf")
    assert upload_resp.status_code == 201, upload_resp.text
    file_id = upload_resp.json()["id"]

    resp = client.post(f"/files/{file_id}/summary", headers={"X-User-Id": str(user_id)})

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["file_id"] == file_id
    assert body["content"] == "Resumo de teste gerado pela LLM falsa."
    assert body["generation_time_ms"] >= 0


def test_summary_is_persisted_in_database(client, test_session_factory, tmp_path):
    user_id = _create_user(client, "alice")
    upload_resp = _upload_pdf(client, user_id, tmp_path, "doc.pdf")
    file_id = upload_resp.json()["id"]

    resp = client.post(f"/files/{file_id}/summary", headers={"X-User-Id": str(user_id)})
    summary_id = resp.json()["id"]

    session = test_session_factory()
    try:
        saved = session.get(Summary, summary_id)
    finally:
        session.close()

    assert saved is not None
    assert saved.file_id == file_id
    assert saved.generation_time_ms >= 0


def test_cannot_summarize_file_of_another_user(client, tmp_path):
    owner_id = _create_user(client, "alice")
    other_id = _create_user(client, "bob")
    upload_resp = _upload_pdf(client, owner_id, tmp_path, "doc.pdf")
    file_id = upload_resp.json()["id"]

    resp = client.post(f"/files/{file_id}/summary", headers={"X-User-Id": str(other_id)})

    assert resp.status_code == 403


def test_summary_of_nonexistent_file_returns_404(client):
    user_id = _create_user(client, "alice")

    resp = client.post("/files/9999/summary", headers={"X-User-Id": str(user_id)})

    assert resp.status_code == 404


def test_summary_returns_422_when_pdf_has_no_extractable_text(client, tmp_path):
    user_id = _create_user(client, "alice")
    upload_resp = _upload_pdf(client, user_id, tmp_path, "blank.pdf", with_text=False)
    file_id = upload_resp.json()["id"]

    resp = client.post(f"/files/{file_id}/summary", headers={"X-User-Id": str(user_id)})

    assert resp.status_code == 422
