"""
Generates a meme image using Google Imagen 3.
Returns the image as a base64-encoded string (PNG).
"""
from __future__ import annotations
import asyncio
import base64
from typing import Optional

from google import genai
from google.genai import types

from app.config import get_settings


async def generate_meme(meme_prompt: str, chapter_title: str) -> Optional[str]:
    """
    Returns base64-encoded PNG, or None if generation fails.
    """
    settings = get_settings()
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    full_prompt = (
        f"A funny and educational meme image about '{chapter_title}'. "
        f"{meme_prompt}. "
        "Clean, bold text style. Suitable for students. No offensive content."
    )

    def _generate() -> Optional[str]:
        try:
            response = client.models.generate_images(
                model="imagen-3.0-generate-002",
                prompt=full_prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="1:1",
                    safety_filter_level="block_low_and_above",
                    person_generation="dont_allow",
                ),
            )
            image_bytes: bytes = response.generated_images[0].image.image_bytes
            return base64.b64encode(image_bytes).decode("utf-8")
        except Exception as e:
            print(f"[Imagen] Failed for '{chapter_title}': {e}")
            return None

    return await asyncio.to_thread(_generate)
