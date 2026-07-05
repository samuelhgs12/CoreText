from unittest.mock import MagicMock

import httpx
import pytest
from google.genai import errors as genai_errors

from app.services import llm_client as llm_client_module
from app.services.llm_client import (
    LLMAuthenticationError,
    LLMClient,
    LLMConfigurationError,
    LLMConnectionError,
    LLMEmptyResponseError,
)


@pytest.fixture(autouse=True)
def _no_real_genai_client(monkeypatch):
    """Garante que nenhum teste desta suíte tenta criar um client real do SDK."""
    monkeypatch.setattr(llm_client_module.genai, "Client", MagicMock())


def _make_client(response_text: str | None = "ok", side_effect=None) -> LLMClient:
    client = LLMClient(api_key="fake-key", model="fake-model")
    mock_response = MagicMock()
    mock_response.text = response_text
    if side_effect is not None:
        client._client.models.generate_content.side_effect = side_effect
    else:
        client._client.models.generate_content.return_value = mock_response
    return client


def test_raises_configuration_error_when_api_key_missing():
    with pytest.raises(LLMConfigurationError):
        LLMClient(api_key="", model="fake-model")


def test_generate_text_returns_stripped_text():
    client = _make_client(response_text="  Resumo gerado.  ")

    result = client.generate_text("resuma isso")

    assert result == "Resumo gerado."
    client._client.models.generate_content.assert_called_once()


def test_raises_authentication_error_on_invalid_api_key():
    error = genai_errors.ClientError(
        403, {"message": "API key not valid", "status": "PERMISSION_DENIED"}
    )
    client = _make_client(side_effect=error)

    with pytest.raises(LLMAuthenticationError):
        client.generate_text("resuma isso")


def test_raises_connection_error_on_server_error():
    error = genai_errors.ServerError(
        503, {"message": "service unavailable", "status": "UNAVAILABLE"}
    )
    client = _make_client(side_effect=error)

    with pytest.raises(LLMConnectionError):
        client.generate_text("resuma isso")


def test_raises_connection_error_on_network_failure():
    client = _make_client(side_effect=httpx.ConnectError("connection refused"))

    with pytest.raises(LLMConnectionError):
        client.generate_text("resuma isso")


def test_raises_empty_response_error_when_text_is_blank():
    client = _make_client(response_text="   ")

    with pytest.raises(LLMEmptyResponseError):
        client.generate_text("resuma isso")


def test_raises_empty_response_error_when_text_is_none():
    client = _make_client(response_text=None)

    with pytest.raises(LLMEmptyResponseError):
        client.generate_text("resuma isso")
