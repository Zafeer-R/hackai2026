"""
Single Gemini call that returns the entire course skeleton:
  - Chapter titles, summaries, key concepts
  - Quiz questions (type-mixed, expertise-scaled)
  - Prompts for Veo (video), Imagen (meme), ElevenLabs (song)
  - Optimised search queries for YouTube and articles
"""
from __future__ import annotations
import json
import re
from typing import Any

from google import genai
from google.genai import types

from functools import lru_cache

from app.config import get_settings


@lru_cache(maxsize=1)
def _get_client() -> genai.Client:
    return genai.Client(api_key=get_settings().GEMINI_API_KEY)


_QUIZ_GUIDANCE = {
    "beginner": (
        "5 questions per chapter. "
        "Use: 3 true_false, 2 multiple_choice. "
        "Simple language, concrete examples."
    ),
    "intermediate": (
        "6 questions per chapter. "
        "Use: 1 true_false, 2 multiple_choice, 2 fill_blank, 1 short_answer. "
        "Mix conceptual and applied questions."
    ),
    "advanced": (
        "7 questions per chapter. "
        "Use: 1 true_false, 2 multiple_choice, 2 fill_blank, 2 short_answer. "
        "Favour edge cases, trade-offs, and 'why' questions."
    ),
}

_EXPERTISE_CONTEXT = {
    "beginner": "Assume zero prior knowledge. Use simple analogies. Avoid jargon.",
    "intermediate": "Assume foundational knowledge. Connect concepts to real-world usage.",
    "advanced": "Use precise technical language. Cover nuance, performance, and trade-offs.",
}

_PROMPT_TEMPLATE = """\
You are an expert curriculum designer. Generate a course on "{topic}" for a {expertise} level learner.

Expertise context: {expertise_context}

Rules:
- 3-5 chapters, each learnable in 10-15 minutes
- Summaries must be under 80 words
- learn_more: 2-3 short topic names (NOT URLs)
- Quiz: {quiz_guidance}
- For multiple_choice, always provide exactly 4 options
- For true_false, answer must be "true" or "false" (lowercase string)
- meme_prompt: describe a funny but educational meme image about the chapter concept (keep it safe)
- video_prompt: describe an animated 8-10 second whiteboard explainer clip for this chapter
- song_prompt: describe a short catchy educational jingle about this chapter (topic + mood)
- youtube_search_query: a precise search query to find the best tutorial video
- article_search_query: a precise query to find a good written explanation

Return ONLY valid JSON (no markdown fences) matching this exact schema:
{{
  "title": "string",
  "description": "string",
  "estimated_time": "string",
  "chapters": [
    {{
      "number": 1,
      "title": "string",
      "summary": "string",
      "key_concepts": ["string"],
      "youtube_search_query": "string",
      "article_search_query": "string",
      "meme_prompt": "string",
      "video_prompt": "string",
      "song_prompt": "string",
      "quiz": [
        {{
          "id": 1,
          "type": "multiple_choice | fill_blank | true_false | short_answer",
          "question": "string",
          "options": ["A", "B", "C", "D"],
          "answer": "string",
          "explanation": "string"
        }}
      ],
      "learn_more": ["string"]
    }}
  ]
}}
"""


def _clean_json(text: str) -> str:
    """Strip markdown code fences if Gemini wraps the response."""
    text = text.strip()
    text = re.sub(r"^```json\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


_MODULE_PROMPT = """\
You are an expert educator. Generate a focused learning module on "{subtopic}" for a {expertise} level learner.

Expertise context: {expertise_context}
Language: Generate ALL content (title, summary, key concepts, quiz questions, answers, explanations, song lyrics, learn_more) in {language}. For youtube_search_query and article_search_query, use keywords that will find {language}-language resources.

Rules:
- summary: under 80 words
- key_concepts: 3-5 items
- learn_more: 2-3 short topic names (NOT URLs)
- Quiz: {quiz_guidance}
- For multiple_choice, always provide exactly 4 options
- For true_false, answer must be "true" or "false" (lowercase string)
- meme_prompt: describe a funny but educational meme image about {subtopic} (keep it safe, write this in English)
- video_prompt: describe an animated 8-10 second whiteboard explainer clip for {subtopic} (write this in English)
- song_lyrics: write 6-10 lines of educational rap/song lyrics about {subtopic} in {language} that rhyme, are fun, and summarize the key concepts in a memorable way
- youtube_search_query: a precise search query in {language} to find the best tutorial video
- article_search_query: a precise query in {language} to find a good written explanation

Return ONLY valid JSON (no markdown fences):
{{
  "title": "string",
  "summary": "string",
  "key_concepts": ["string"],
  "youtube_search_query": "string",
  "article_search_query": "string",
  "meme_prompt": "string",
  "video_prompt": "string",
  "song_lyrics": "string",
  "quiz": [
    {{
      "id": 1,
      "type": "multiple_choice | fill_blank | true_false | short_answer",
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "answer": "string",
      "explanation": "string"
    }}
  ],
  "learn_more": ["string"]
}}
"""


async def generate_module_outline(subtopic: str, expertise: str, language: str = "English") -> dict[str, Any]:
    client = _get_client()

    prompt = _MODULE_PROMPT.format(
        subtopic=subtopic,
        expertise=expertise,
        expertise_context=_EXPERTISE_CONTEXT[expertise],
        quiz_guidance=_QUIZ_GUIDANCE[expertise],
        language=language,
    )

    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.7,
            max_output_tokens=4096,
        ),
    )

    raw = _clean_json(response.text)
    return json.loads(raw)


async def generate_course_outline(topic: str, expertise: str) -> dict[str, Any]:
    client = _get_client()

    prompt = _PROMPT_TEMPLATE.format(
        topic=topic,
        expertise=expertise,
        expertise_context=_EXPERTISE_CONTEXT[expertise],
        quiz_guidance=_QUIZ_GUIDANCE[expertise],
    )

    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.7,
            max_output_tokens=8192,
        ),
    )

    raw = _clean_json(response.text)
    return json.loads(raw)
