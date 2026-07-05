from pathlib import Path

from fastapi.testclient import TestClient

from app.models import PDFFile
from app.routers import files as files_router
from tests.conftest import create_user, make_pdf_bytes, upload_pdf


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


def test_list_files_returns_only_authenticated_user_files(client: TestClient, tmp_path):
    alice_id = create_user(client, "alice")
    bob_id = create_user(client, "bob")
    alice_file = upload_pdf(client, alice_id, tmp_path, "alice.pdf").json()
    upload_pdf(client, bob_id, tmp_path, "bob.pdf")

    resp = client.get("/files", headers={"X-User-Id": str(alice_id)})

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert len(body) == 1
    assert body[0]["id"] == alice_file["id"]
    assert body[0]["owner_id"] == alice_id


def test_list_files_without_authenticated_user_is_rejected(client: TestClient):
    resp = client.get("/files")

    assert resp.status_code == 401


def test_get_file_returns_authenticated_user_file(client: TestClient, tmp_path):
    user_id = create_user(client, "alice")
    uploaded_file = upload_pdf(client, user_id, tmp_path, "document.pdf").json()

    resp = client.get(f"/files/{uploaded_file['id']}", headers={"X-User-Id": str(user_id)})

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["id"] == uploaded_file["id"]
    assert body["filename"] == "document.pdf"
    assert body["owner_id"] == user_id


def test_get_file_of_another_user_is_blocked(client: TestClient, tmp_path):
    owner_id = create_user(client, "alice")
    other_id = create_user(client, "bob")
    uploaded_file = upload_pdf(client, owner_id, tmp_path, "document.pdf").json()

    resp = client.get(f"/files/{uploaded_file['id']}", headers={"X-User-Id": str(other_id)})

    assert resp.status_code == 403


def test_get_nonexistent_file_returns_404(client: TestClient):
    user_id = create_user(client, "alice")

    resp = client.get("/files/9999", headers={"X-User-Id": str(user_id)})

    assert resp.status_code == 404


def test_delete_file_removes_database_record_and_stored_file(
    client: TestClient, test_session_factory, tmp_path
):
    user_id = create_user(client, "alice")
    uploaded_file = upload_pdf(client, user_id, tmp_path, "document.pdf").json()

    session = test_session_factory()
    try:
        saved = session.get(PDFFile, uploaded_file["id"])
        stored_path = Path(saved.filepath)
    finally:
        session.close()
    assert stored_path.exists()

    resp = client.delete(f"/files/{uploaded_file['id']}", headers={"X-User-Id": str(user_id)})

    assert resp.status_code == 204, resp.text
    assert not stored_path.exists()

    session = test_session_factory()
    try:
        assert session.get(PDFFile, uploaded_file["id"]) is None
    finally:
        session.close()


def test_delete_file_of_another_user_is_blocked(
    client: TestClient, test_session_factory, tmp_path
):
    owner_id = create_user(client, "alice")
    other_id = create_user(client, "bob")
    uploaded_file = upload_pdf(client, owner_id, tmp_path, "document.pdf").json()

    session = test_session_factory()
    try:
        saved = session.get(PDFFile, uploaded_file["id"])
        stored_path = Path(saved.filepath)
    finally:
        session.close()

    resp = client.delete(f"/files/{uploaded_file['id']}", headers={"X-User-Id": str(other_id)})

    assert resp.status_code == 403
    assert stored_path.exists()

    session = test_session_factory()
    try:
        assert session.get(PDFFile, uploaded_file["id"]) is not None
    finally:
        session.close()


def test_delete_nonexistent_file_returns_404(client: TestClient):
    user_id = create_user(client, "alice")

    resp = client.delete("/files/9999", headers={"X-User-Id": str(user_id)})

    assert resp.status_code == 404


def test_delete_file_without_authenticated_user_is_rejected(client: TestClient, tmp_path):
    user_id = create_user(client, "alice")
    uploaded_file = upload_pdf(client, user_id, tmp_path, "document.pdf").json()

    resp = client.delete(f"/files/{uploaded_file['id']}")

    assert resp.status_code == 401
