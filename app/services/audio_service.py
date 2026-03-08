"""
Generates audio of educational song lyrics using ElevenLabs Text-to-Speech API.
  POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
  Body: { text, model_id, voice_settings }
  Returns: audio/mpeg bytes

If ELEVENLABS_API_KEY is not set, returns None gracefully.
"""
from __future__ import annotations
import base64
from typing import Optional

import httpx

from app.config import get_settings

# Adam — clear, expressive voice suitable for spoken lyrics
_VOICE_ID = "pNInz6obpgDQGcFmaJgB"
_TTS_URL = f"https://api.elevenlabs.io/v1/text-to-speech/{_VOICE_ID}"


async def generate_song(song_lyrics: str, chapter_title: str) -> Optional[dict]:
    settings = get_settings()
    if not settings.ELEVENLABS_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                _TTS_URL,
                headers={
                    "xi-api-key": settings.ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "text": song_lyrics,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.35,
                        "similarity_boost": 0.75,
                        "style": 0.5,
                        "use_speaker_boost": True,
                    },
                },
            )
            response.raise_for_status()
            audio_bytes = response.content
            return {
                "audio_b64": base64.b64encode(audio_bytes).decode("utf-8"),
                "lyrics": song_lyrics,
                "duration_seconds": len(song_lyrics.split()) / 2.5,
            }
    except httpx.HTTPStatusError as e:
        print(f"[ElevenLabs] HTTP {e.response.status_code} for '{chapter_title}': {e.response.text}")
        return None
    except Exception as e:
        print(f"[ElevenLabs] Failed for '{chapter_title}': {e}")
        return None
