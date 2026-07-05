from fastapi.testclient import TestClient

from tests.conftest import make_pdf_bytes


def register_user(client: TestClient, full_name: str, email: str, password: str = "12345678"):
    return client.post(
        "/auth/register",
        json={"full_name": full_name, "email": email, "password": password},
    )


def login_user(client: TestClient, email: str, password: str):
    return client.post("/auth/login", json={"email": email, "password": password})


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_register_user_returns_token_and_user(client: TestClient):
    resp = register_user(client, "Alice Example", "alice@example.com")

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["full_name"] == "Alice Example"
    assert body["user"]["email"] == "alice@example.com"
    assert body["user"]["username"] == "alice@example.com"


def test_login_user_returns_token_and_me_endpoint(client: TestClient):
    register_resp = register_user(client, "Alice Example", "alice@example.com")
    assert register_resp.status_code == 201, register_resp.text

    login_resp = login_user(client, "alice@example.com", "12345678")
    assert login_resp.status_code == 200, login_resp.text
    token = login_resp.json()["access_token"]

    me_resp = client.get("/auth/me", headers=auth_header(token))

    assert me_resp.status_code == 200, me_resp.text
    me_body = me_resp.json()
    assert me_body["email"] == "alice@example.com"
    assert me_body["full_name"] == "Alice Example"


def test_update_profile_changes_full_name_and_email(client: TestClient):
    register_resp = register_user(client, "Alice Example", "alice@example.com")
    assert register_resp.status_code == 201, register_resp.text
    token = register_resp.json()["access_token"]

    update_resp = client.patch(
        "/auth/me",
        headers=auth_header(token),
        json={"full_name": "Alice Updated", "email": "alice.updated@example.com"},
    )

    assert update_resp.status_code == 200, update_resp.text
    body = update_resp.json()
    assert body["full_name"] == "Alice Updated"
    assert body["email"] == "alice.updated@example.com"
    assert body["username"] == "alice.updated@example.com"

    old_login = login_user(client, "alice@example.com", "12345678")
    assert old_login.status_code == 401

    new_login = login_user(client, "alice.updated@example.com", "12345678")
    assert new_login.status_code == 200, new_login.text


def test_bearer_token_allows_file_upload_without_legacy_header(
    client: TestClient, tmp_path
):
    register_resp = register_user(client, "Alice Example", "alice@example.com")
    user = register_resp.json()["user"]

    login_resp = login_user(client, "alice@example.com", "12345678")
    token = login_resp.json()["access_token"]

    pdf_bytes = make_pdf_bytes(tmp_path, "authenticated.pdf", with_text=True)
    upload_resp = client.post(
        "/files",
        headers=auth_header(token),
        files={"file": ("authenticated.pdf", pdf_bytes, "application/pdf")},
    )

    assert upload_resp.status_code == 201, upload_resp.text
    body = upload_resp.json()
    assert body["owner_id"] == user["id"]
    assert body["filename"] == "authenticated.pdf"
