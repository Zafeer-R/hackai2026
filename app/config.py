from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    GEMINI_API_KEY: str
    YOUTUBE_API_KEY: str
    ELEVENLABS_API_KEY: str = ""
    ENABLE_VEO: bool = True          # set to false to skip AI video generation

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
