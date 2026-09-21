"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    azure_ai_project_endpoint: str = Field(default="", alias="AZURE_AI_PROJECT_ENDPOINT")
    azure_ai_agent_name: str = Field(default="ATLAS", alias="AZURE_AI_AGENT_NAME")
    azure_ai_agent_version: str = Field(default="", alias="AZURE_AI_AGENT_VERSION")
    database_url: str = Field(default="sqlite:///./atlas.db", alias="DATABASE_URL")
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        alias="CORS_ORIGINS",
    )
    atlas_llm_mode: str = Field(default="mock", alias="ATLAS_LLM_MODE")
    chat_history_limit: int = Field(default=10, alias="CHAT_HISTORY_LIMIT")
    session_timeout_minutes: int = Field(default=30, alias="SESSION_TIMEOUT_MINUTES")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
