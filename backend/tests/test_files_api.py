from pathlib import Path

from fastapi.testclient import TestClient

from app.models import PDFFile
from app.routers import files as files_router
from tests.conftest import create_user, make_pdf_bytes


def test_upload_pdf_success(client: TestClient, test_session_factory, tmp_path):
    user_id = create_user(client, "alice")
    pdf_bytes = make_pdf_bytes(tmp_path, "document.pdf", with_text=True)

    resp = client.post(
        "/files",
        headers={"X-User-Id": str(user_id)},
        files={"file": ("document.pdf", pdf_bytes, "application/pdf")},
    )

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["filename"] == "document.pdf"
    assert body["content_type"] == "application/pdf"
    assert body["file_size_bytes"] == len(pdf_bytes)
    assert body["owner_id"] == user_id

    session = test_session_factory()
    try:
        saved = session.get(PDFFile, body["id"])
        assert saved is not None
        assert saved.owner_id == user_id
        assert saved.file_size_bytes == len(pdf_bytes)
        assert Path(saved.filepath).exists()
    finally:
        session.close()


def test_upload_rejects_non_pdf_extension(client: TestClient):
    user_id = create_user(client, "alice")

    resp = client.post(
        "/files",
        headers={"X-User-Id": str(user_id)},
        files={"file": ("notes.txt", b"%PDF fake content", "application/pdf")},
    )

    assert resp.status_code == 400
    assert "pdf" in resp.json()["detail"].lower()


def test_upload_rejects_invalid_content_type(client: TestClient, tmp_path):
    user_id = create_user(client, "alice")
    pdf_bytes = make_pdf_bytes(tmp_path, "document.pdf", with_text=True)

    resp = client.post(
        "/files",
        headers={"X-User-Id": str(user_id)},
        files={"file": ("document.pdf", pdf_bytes, "text/plain")},
    )

    assert resp.status_code == 400
    assert "tipo" in resp.json()["detail"].lower()


def test_upload_rejects_file_with_pdf_extension_but_invalid_content(client: TestClient):
    user_id = create_user(client, "alice")

    resp = client.post(
        "/files",
        headers={"X-User-Id": str(user_id)},
        files={"file": ("fake.pdf", b"not a real pdf", "application/pdf")},
    )

    assert resp.status_code == 400
    assert "conteúdo" in resp.json()["detail"].lower()


def test_upload_rejects_files_above_max_size(client: TestClient, tmp_path, monkeypatch):
    user_id = create_user(client, "alice")
    pdf_bytes = make_pdf_bytes(tmp_path, "large.pdf", with_text=True)
    monkeypatch.setattr(files_router, "MAX_UPLOAD_SIZE_BYTES", len(pdf_bytes) - 1)

    resp = client.post(
        "/files",
        headers={"X-User-Id": str(user_id)},
        files={"file": ("large.pdf", pdf_bytes, "application/pdf")},
    )

    assert resp.status_code == 413
    assert "50 MB" in resp.json()["detail"]


def test_upload_without_authenticated_user_is_rejected(client: TestClient, tmp_path):
    pdf_bytes = make_pdf_bytes(tmp_path, "document.pdf", with_text=True)

    resp = client.post(
        "/files",
        files={"file": ("document.pdf", pdf_bytes, "application/pdf")},
    )

    assert resp.status_code == 401
