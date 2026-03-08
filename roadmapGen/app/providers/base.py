from __future__ import annotations

from typing import Protocol


class LLMProviderError(RuntimeError):
    pass


class LLMProvider(Protocol):
    def generate_json(self, *, system_prompt: str, user_prompt: str) -> dict:
        """Generate a JSON response from prompt input."""
