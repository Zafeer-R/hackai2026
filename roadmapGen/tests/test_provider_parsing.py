import pytest

from app.providers.base import LLMProviderError
from app.providers.parsing import parse_json_content


def test_parse_json_plain_string() -> None:
    parsed = parse_json_content('{"ok": true}')
    assert parsed == {"ok": True}


def test_parse_json_fenced_markdown() -> None:
    text = '```json\n{\n  "ok": true,\n  "msg": "hello"\n}\n```'
    parsed = parse_json_content(text)
    assert parsed["ok"] is True
    assert parsed["msg"] == "hello"


def test_parse_json_with_extra_text() -> None:
    text = 'Result:\n{\n  "ok": true\n}\nThanks'
    parsed = parse_json_content(text)
    assert parsed == {"ok": True}


def test_parse_json_rejects_invalid() -> None:
    with pytest.raises(LLMProviderError):
        parse_json_content("not json")
