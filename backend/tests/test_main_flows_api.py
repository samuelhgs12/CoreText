from fastapi.testclient import TestClient

from app.routers import files as files_router
from tests.conftest import make_pdf_bytes


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _register(
    client: TestClient,
    *,
    full_name: str = "Alice Example",
    username: str = "alice",
    email: str = "alice@example.com",
    password: str = "12345678",
) -> dict:
    resp = client.post(
        "/auth/register",
        json={
            "full_name": full_name,
            "username": username,
            "email": email,
            "password": password,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _upload_pdf(
    client: TestClient,
    token: str,
    tmp_path,
    filename: str,
    *,
    with_text: bool = True,
):
    pdf_bytes = make_pdf_bytes(tmp_path, filename, with_text=with_text)
    return client.post(
        "/files",
        headers=_auth_header(token),
        files={"file": (filename, pdf_bytes, "application/pdf")},
    )


def test_main_application_flows_before_final_delivery(client: TestClient, tmp_path):
    register_body = _register(client)
    user = register_body["user"]
    register_token = register_body["access_token"]
    assert user["email"] == "alice@example.com"
    assert register_token

    login_resp = client.post(
        "/auth/login",
        json={"email": "alice@example.com", "password": "12345678"},
    )
    assert login_resp.status_code == 200, login_resp.text
    token = login_resp.json()["access_token"]
    headers = _auth_header(token)

    profile_resp = client.patch(
        "/auth/me",
        headers=headers,
        json={"full_name": "Alice Updated", "username": "alice.updated"},
    )
    assert profile_resp.status_code == 200, profile_resp.text
    assert profile_resp.json()["full_name"] == "Alice Updated"
    assert profile_resp.json()["username"] == "alice.updated"

    first_upload = _upload_pdf(client, token, tmp_path, "doc1.pdf")
    second_upload = _upload_pdf(client, token, tmp_path, "doc2.pdf")
    assert first_upload.status_code == 201, first_upload.text
    assert second_upload.status_code == 201, second_upload.text
    file1_id = first_upload.json()["id"]
    file2_id = second_upload.json()["id"]

    non_pdf_resp = client.post(
        "/files",
        headers=headers,
        files={"file": ("notes.txt", b"%PDF fake content", "application/pdf")},
    )
    assert non_pdf_resp.status_code == 400

    list_resp = client.get("/files", headers=headers)
    assert list_resp.status_code == 200, list_resp.text
    listed_ids = {item["id"] for item in list_resp.json()}
    assert {file1_id, file2_id}.issubset(listed_ids)

    selected_resp = client.get(f"/files/{file1_id}", headers=headers)
    assert selected_resp.status_code == 200, selected_resp.text
    assert selected_resp.json()["id"] == file1_id

    individual_summary_resp = client.post(f"/files/{file1_id}/summary", headers=headers)
    assert individual_summary_resp.status_code == 201, individual_summary_resp.text
    assert individual_summary_resp.json()["file_id"] == file1_id

    integrated_summary_resp = client.post(
        "/summaries/integrated",
        headers=headers,
        json={"file_ids": [file1_id, file2_id]},
    )
    assert integrated_summary_resp.status_code == 201, integrated_summary_resp.text
    assert sorted(integrated_summary_resp.json()["file_ids"]) == sorted([file1_id, file2_id])

    delete_resp = client.delete(f"/files/{file2_id}", headers=headers)
    assert delete_resp.status_code == 204, delete_resp.text

    deleted_file_resp = client.get(f"/files/{file2_id}", headers=headers)
    assert deleted_file_resp.status_code == 404


def test_upload_above_size_limit_is_rejected_in_main_flow(
    client: TestClient, tmp_path, monkeypatch
):
    token = _register(client, username="sizeuser", email="size@example.com")["access_token"]
    pdf_bytes = make_pdf_bytes(tmp_path, "large.pdf", with_text=True)
    monkeypatch.setattr(files_router, "MAX_UPLOAD_SIZE_BYTES", len(pdf_bytes) - 1)

    resp = client.post(
        "/files",
        headers=_auth_header(token),
        files={"file": ("large.pdf", pdf_bytes, "application/pdf")},
    )

    assert resp.status_code == 413


def test_private_routes_reject_requests_without_login(client: TestClient):
    private_requests = [
        ("GET", "/auth/me", None),
        ("PATCH", "/auth/me", {"full_name": "No Session"}),
        ("GET", "/files", None),
        ("POST", "/summaries/integrated", {"file_ids": [1]}),
    ]

    for method, path, json_body in private_requests:
        resp = client.request(method, path, json=json_body)
        assert resp.status_code == 401, f"{method} {path}: {resp.text}"


def test_cannot_access_file_from_another_user_in_main_flow(
    client: TestClient, tmp_path
):
    owner_token = _register(
        client,
        username="owner",
        email="owner@example.com",
    )["access_token"]
    other_token = _register(
        client,
        username="other",
        email="other@example.com",
    )["access_token"]

    upload_resp = _upload_pdf(client, owner_token, tmp_path, "private.pdf")
    assert upload_resp.status_code == 201, upload_resp.text
    file_id = upload_resp.json()["id"]

    get_resp = client.get(f"/files/{file_id}", headers=_auth_header(other_token))
    summary_resp = client.post(f"/files/{file_id}/summary", headers=_auth_header(other_token))
    delete_resp = client.delete(f"/files/{file_id}", headers=_auth_header(other_token))

    assert get_resp.status_code == 403
    assert summary_resp.status_code == 403
    assert delete_resp.status_code == 403
