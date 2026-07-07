from fastapi.testclient import TestClient

from app.models import Summary
from tests.conftest import auth_header, create_user, upload_pdf


def test_generate_individual_summary_success(client: TestClient, tmp_path):
    user_id = create_user(client, "alice")
    upload_resp = upload_pdf(client, user_id, tmp_path, "doc.pdf")
    assert upload_resp.status_code == 201, upload_resp.text
    file_id = upload_resp.json()["id"]

    resp = client.post(f"/files/{file_id}/summary", headers=auth_header(user_id))

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["file_id"] == file_id
    assert body["content"] == "Resumo de teste gerado pela LLM falsa."
    assert body["generation_time_ms"] >= 0


def test_summary_is_persisted_in_database(client: TestClient, test_session_factory, tmp_path):
    user_id = create_user(client, "alice")
    upload_resp = upload_pdf(client, user_id, tmp_path, "doc.pdf")
    file_id = upload_resp.json()["id"]

    resp = client.post(f"/files/{file_id}/summary", headers=auth_header(user_id))
    summary_id = resp.json()["id"]

    session = test_session_factory()
    try:
        saved = session.get(Summary, summary_id)
    finally:
        session.close()

    assert saved is not None
    assert saved.file_id == file_id
    assert saved.generation_time_ms >= 0


def test_cannot_summarize_file_of_another_user(client: TestClient, tmp_path):
    owner_id = create_user(client, "alice")
    other_id = create_user(client, "bob")
    upload_resp = upload_pdf(client, owner_id, tmp_path, "doc.pdf")
    file_id = upload_resp.json()["id"]

    resp = client.post(f"/files/{file_id}/summary", headers=auth_header(other_id))

    assert resp.status_code == 403


def test_summary_of_nonexistent_file_returns_404(client: TestClient):
    user_id = create_user(client, "alice")

    resp = client.post("/files/9999/summary", headers=auth_header(user_id))

    assert resp.status_code == 404


def test_summary_returns_422_when_pdf_has_no_extractable_text(client: TestClient, tmp_path):
    user_id = create_user(client, "alice")
    upload_resp = upload_pdf(client, user_id, tmp_path, "blank.pdf", with_text=False)
    file_id = upload_resp.json()["id"]

    resp = client.post(f"/files/{file_id}/summary", headers=auth_header(user_id))

    assert resp.status_code == 422
