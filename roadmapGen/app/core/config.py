from __future__ import annotations

import os
from functools import lru_cache


class Settings:
    def __init__(self) -> None:
        self.app_name: str = "HackAI Roadmap API"
        self.model_name: str = os.environ.get("MODEL_NAME", "gemini-2.5-flash")
        self.llm_timeout_sec: float = float(os.environ.get("LLM_TIMEOUT_SEC", "15.0"))
        self.llm_max_retries: int = int(os.environ.get("LLM_MAX_RETRIES", "0"))
        self.log_level: str = os.environ.get("LOG_LEVEL", "INFO")
        self.gemini_base_url: str = os.environ.get(
            "GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta"
        )
        self.gemini_api_key: str | None = os.environ.get("GEMINI_API_KEY")
        self.mongo_uri: str = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
        self.mongo_db: str = os.environ.get("MONGO_DB", "hackai")
        self.mongo_collection: str = os.environ.get("MONGO_COLLECTION", "user_roadmaps")


@lru_cache
def get_settings() -> Settings:
    return Settings()
