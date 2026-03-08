import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
PROMPT_PATH = BASE_DIR / "conversation_prompt.md"

load_dotenv(BASE_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GOAL_EXTRACTION_PROMPT = PROMPT_PATH.read_text(encoding="utf-8").strip()
TEXT_MODEL = "gemini-2.5-flash"
VOICE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"
