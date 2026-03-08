from __future__ import annotations

import logging
import time

import httpx

from .base import LLMProviderError
from .parsing import parse_json_content

logger = logging.getLogger(__name__)


class GeminiProvider:
    def __init__(self, *, base_url: str, api_key: str, model_name: str, timeout_sec: float) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model_name = model_name
        self.timeout_sec = timeout_sec

    def generate_json(self, *, system_prompt: str, user_prompt: str) -> dict:
        endpoint = (
            f"{self.base_url}/models/{self.model_name}:generateContent?key={self.api_key}"
        )
        payload = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "responseMimeType": "application/json",
                "maxOutputTokens": 1800,
            },
        }
        t0 = time.perf_counter()
        try:
            with httpx.Client(timeout=self.timeout_sec) as client:
                response = client.post(endpoint, json=payload)
            response.raise_for_status()
            data = response.json()

            block_reason = data.get("promptFeedback", {}).get("blockReason")
            if block_reason:
                raise LLMProviderError(f"Gemini blocked request: {block_reason}")

            content = (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text")
            )
            if not content:
                raise LLMProviderError("Gemini response did not include text content")
            parsed = parse_json_content(content)
            elapsed_ms = (time.perf_counter() - t0) * 1000
            logger.debug(
                "gemini.generate_json success model=%s elapsed_ms=%.1f chars=%s",
                self.model_name,
                elapsed_ms,
                len(content),
            )
            return parsed
        except httpx.TimeoutException as exc:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            logger.warning(
                "gemini.generate_json timeout model=%s elapsed_ms=%.1f timeout_sec=%.1f",
                self.model_name,
                elapsed_ms,
                self.timeout_sec,
            )
            raise LLMProviderError("Timed out while calling Gemini provider") from exc
        except httpx.HTTPError as exc:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            logger.warning(
                "gemini.generate_json http_error model=%s elapsed_ms=%.1f error=%s",
                self.model_name,
                elapsed_ms,
                exc,
            )
            raise LLMProviderError(f"Gemini HTTP error: {exc}") from exc
        except (KeyError, IndexError, TypeError) as exc:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            logger.warning(
                "gemini.generate_json parse_error model=%s elapsed_ms=%.1f error=%s",
                self.model_name,
                elapsed_ms,
                exc,
            )
            raise LLMProviderError("Gemini response format was invalid") from exc
