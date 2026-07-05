"""Cliente de comunicação com a LLM (Google Gemini) usado para gerar resumos.

Encapsula o SDK google-genai atrás de uma interface simples e reutilizável,
com tratamento dos erros mais comuns (chave inválida, falha de conexão,
resposta vazia) para que o restante da aplicação não precise conhecer os
detalhes do provedor.
"""

from __future__ import annotations

import httpx
from google import genai
from google.genai import errors as genai_errors

from app.config import settings

_AUTH_ERROR_CODES = {401, 403}
_AUTH_ERROR_HINTS = ("api key not valid", "api_key_invalid", "permission_denied")


class LLMError(Exception):
    """Erro genérico na integração com a LLM."""


class LLMConfigurationError(LLMError):
    """Configuração ausente ou inválida (ex.: chave de API não definida)."""


class LLMAuthenticationError(LLMError):
    """A chave de API foi rejeitada pelo provedor (inválida, revogada, sem permissão)."""


class LLMConnectionError(LLMError):
    """Falha de rede/conexão ou indisponibilidade do serviço da LLM."""


class LLMEmptyResponseError(LLMError):
    """A LLM respondeu, mas sem nenhum texto utilizável."""


class LLMClient:
    """Cliente reutilizável para chamadas de geração de texto à LLM."""

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        self._api_key = api_key if api_key is not None else settings.gemini_api_key
        self._model = model if model is not None else settings.gemini_model

        if not self._api_key:
            raise LLMConfigurationError(
                "GEMINI_API_KEY não configurada. Defina a variável de ambiente "
                "(veja .env.example) antes de usar o cliente de LLM."
            )

        self._client = genai.Client(api_key=self._api_key)

    def generate_text(self, prompt: str, *, system_instruction: str | None = None) -> str:
        """Envia um prompt à LLM e retorna o texto gerado.

        Args:
            prompt: texto de entrada enviado ao modelo.
            system_instruction: instrução de sistema opcional (ex.: papel/persona).

        Returns:
            O texto gerado pela LLM, sem espaços nas extremidades.

        Raises:
            LLMAuthenticationError: chave de API inválida ou sem permissão.
            LLMConnectionError: falha de rede ou indisponibilidade do serviço.
            LLMEmptyResponseError: a LLM respondeu sem texto utilizável.
            LLMError: qualquer outro erro não classificado retornado pela API.
        """
        config = {"system_instruction": system_instruction} if system_instruction else None

        try:
            response = self._client.models.generate_content(
                model=self._model,
                contents=prompt,
                config=config,
            )
        except genai_errors.APIError as exc:
            raise self._translate_api_error(exc) from exc
        except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError) as exc:
            raise LLMConnectionError(f"Falha de conexão com a LLM: {exc}") from exc

        text = getattr(response, "text", None)
        if not text or not text.strip():
            raise LLMEmptyResponseError("A LLM retornou uma resposta vazia.")

        return text.strip()

    @staticmethod
    def _translate_api_error(exc: genai_errors.APIError) -> LLMError:
        message = str(getattr(exc, "message", "") or str(exc)).lower()

        if exc.code in _AUTH_ERROR_CODES or any(hint in message for hint in _AUTH_ERROR_HINTS):
            return LLMAuthenticationError(f"Chave de API do Gemini inválida ou sem permissão: {exc}")

        if isinstance(exc, genai_errors.ServerError) or exc.code >= 500:
            return LLMConnectionError(f"Serviço da LLM indisponível: {exc}")

        return LLMError(f"Erro ao chamar a LLM: {exc}")


def test_connection() -> str:
    """Faz uma chamada simples à LLM para validar a integração ponta a ponta.

    Returns:
        O texto retornado pela LLM.

    Raises:
        LLMConfigurationError, LLMAuthenticationError, LLMConnectionError,
        LLMEmptyResponseError: conforme a falha encontrada.
    """
    client = LLMClient()
    return client.generate_text("Responda apenas com a palavra: ok")
