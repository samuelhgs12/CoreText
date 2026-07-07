from fastapi.testclient import TestClient

from app.models import IntegratedSummary
from tests.conftest import auth_header, create_user, upload_pdf


def test_generate_integrated_summary_success(client: TestClient, tmp_path):
    user_id = create_user(client, "alice")
    file1 = upload_pdf(client, user_id, tmp_path, "doc1.pdf").json()["id"]
    file2 = upload_pdf(client, user_id, tmp_path, "doc2.pdf").json()["id"]

    resp = client.post(
        "/summaries/integrated",
        headers=auth_header(user_id),
        json={"file_ids": [file1, file2]},
    )

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert sorted(body["file_ids"]) == sorted([file1, file2])
    assert body["content"] == "Resumo de teste gerado pela LLM falsa."
    assert body["generation_time_ms"] >= 0


def test_integrated_summary_is_persisted_in_database(
    client: TestClient, test_session_factory, tmp_path
):
    user_id = create_user(client, "alice")
    file1 = upload_pdf(client, user_id, tmp_path, "doc1.pdf").json()["id"]
    file2 = upload_pdf(client, user_id, tmp_path, "doc2.pdf").json()["id"]

    resp = client.post(
        "/summaries/integrated",
        headers=auth_header(user_id),
        json={"file_ids": [file1, file2]},
    )
    summary_id = resp.json()["id"]

    session = test_session_factory()
    try:
        saved = session.get(IntegratedSummary, summary_id)
        assert saved is not None
        assert sorted(f.id for f in saved.files) == sorted([file1, file2])
        assert saved.generation_time_ms >= 0
    finally:
        session.close()


def test_cannot_generate_integrated_summary_with_empty_file_list(client: TestClient):
    user_id = create_user(client, "alice")

    resp = client.post(
        "/summaries/integrated", headers=auth_header(user_id), json={"file_ids": []}
    )

    assert resp.status_code == 422


def test_cannot_generate_integrated_summary_with_file_of_another_user(
    client: TestClient, tmp_path
):
    owner_id = create_user(client, "alice")
    other_id = create_user(client, "bob")
    owner_file = upload_pdf(client, owner_id, tmp_path, "doc1.pdf").json()["id"]
    other_file = upload_pdf(client, other_id, tmp_path, "doc2.pdf").json()["id"]

    resp = client.post(
        "/summaries/integrated",
        headers=auth_header(owner_id),
        json={"file_ids": [owner_file, other_file]},
    )

    assert resp.status_code == 403


def test_integrated_summary_with_nonexistent_file_returns_404(client: TestClient, tmp_path):
    user_id = create_user(client, "alice")
    file1 = upload_pdf(client, user_id, tmp_path, "doc1.pdf").json()["id"]

    resp = client.post(
        "/summaries/integrated",
        headers=auth_header(user_id),
        json={"file_ids": [file1, 9999]},
    )

    assert resp.status_code == 404


def test_integrated_summary_returns_422_when_a_pdf_has_no_extractable_text(
    client: TestClient, tmp_path
):
    user_id = create_user(client, "alice")
    file1 = upload_pdf(client, user_id, tmp_path, "doc1.pdf").json()["id"]
    file2 = upload_pdf(client, user_id, tmp_path, "blank.pdf", with_text=False).json()["id"]

    resp = client.post(
        "/summaries/integrated",
        headers=auth_header(user_id),
        json={"file_ids": [file1, file2]},
    )

    assert resp.status_code == 422
