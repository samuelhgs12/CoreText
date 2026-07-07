from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configurações da aplicação, carregadas de variáveis de ambiente / .env."""

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    auth_secret_key: str = "coretext-dev-auth-secret"
    auth_token_ttl_minutes: int = 60 * 24 * 7

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
