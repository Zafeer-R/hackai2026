from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
import os
from pathlib import Path
from dotenv import load_dotenv


# ROOT_DIR = Path(__file__).resolve().parent.parent  # hackai2026/
# PROMPT_PATH = ROOT_DIR / "app" / "backend" / "conversation_prompt.md"

# load_dotenv(ROOT_DIR / ".env")

# GOAL_EXTRACTION_PROMPT: str = PROMPT_PATH.read_text(encoding="utf-8").strip()
# TEXT_MODEL: str = "gemini-2.5-flash"
# VOICE_MODEL: str = "gemini-2.5-flash-native-audio-preview-12-2025"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Google AI
    GEMINI_API_KEY: str
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"

    # YouTube
    YOUTUBE_API_KEY: str

    # Tavily (article search)
    TAVILY_API_KEY: str = ""

    # ElevenLabs
    ELEVENLABS_API_KEY: str = ""

    # Feature flags
    ENABLE_VEO: bool = False

    # MongoDB
    MONGO_URI: str = ""
    MONGO_DB: str = "hackai"
    MONGO_COLLECTION: str = "user_roadmaps"
    MONGO_USER_PROFILES_COLLECTION: str = "user_profiles"

    # LLM settings
    MODEL_NAME: str = "gemini-2.5-flash"
    VOICE_MODEL: str = "gemini-2.5-flash-native-audio-preview-12-2025"
    GOAL_EXTRACTION_MAX_FOLLOW_UP_QUESTIONS: int = Field(default=2, ge=0)
    LLM_TIMEOUT_SEC: int = 15
    LLM_MAX_RETRIES: int = 0
    LOG_LEVEL: str = "DEBUG"

    # Roadmap limits
    ROADMAP_MAX_MODULES: int = 3
    ROADMAP_MAX_CHAPTERS_PER_MODULE: int = 2

    # Goal extraction prompt (loaded from file)
    ROOT_DIR: Path = Path(__file__).resolve().parent.parent
    PROMPT_PATH: Path = ROOT_DIR / "app" / "backend" / "conversation_prompt.md"
    GOAL_EXTRACTION_PROMPT: str = PROMPT_PATH.read_text(encoding="utf-8").strip()


@lru_cache()
def get_settings() -> Settings:
    return Settings()
