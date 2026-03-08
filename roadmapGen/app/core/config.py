from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    app_name: str = "HackAI Roadmap API"
    model_name: str = Field(default="gemini-2.5-flash", alias="MODEL_NAME")
    llm_timeout_sec: float = Field(default=15.0, alias="LLM_TIMEOUT_SEC")
    llm_max_retries: int = Field(default=0, alias="LLM_MAX_RETRIES")

    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    gemini_base_url: str = Field(
        default="https://generativelanguage.googleapis.com/v1beta", alias="GEMINI_BASE_URL"
    )
    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")

    mongo_uri: str = Field(default="mongodb://localhost:27017", alias="MONGO_URI")
    mongo_db: str = Field(default="hackai", alias="MONGO_DB")
    mongo_collection: str = Field(default="user_roadmaps", alias="MONGO_COLLECTION")


@lru_cache
def get_settings() -> Settings:
    return Settings()
