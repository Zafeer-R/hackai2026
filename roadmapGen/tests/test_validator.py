import pytest

from app.schemas.api import GeneratedRoadmapPayload
from app.services.validator import SemanticValidationError, validate_roadmap_semantics


def test_module_overflow_sets_flag() -> None:
    payload = GeneratedRoadmapPayload.model_validate(
        {
            "modules": [
                {"title": "m1 topic", "chapters": [{"title": "c1"}]},
                {"title": "m2 topic", "chapters": [{"title": "c2"}]},
                {"title": "m3 topic", "chapters": [{"title": "c3"}]},
                {"title": "m4 topic", "chapters": [{"title": "c4"}]},
                {"title": "m5 topic", "chapters": [{"title": "c5"}]},
                {"title": "m6 topic", "chapters": [{"title": "c6"}]},
            ]
        }
    )
    flags = validate_roadmap_semantics("topic", payload.modules)
    assert "module_overflow_used" in flags


def test_duplicate_module_intent_fails(valid_generated_payload: dict) -> None:
    duplicated = valid_generated_payload["modules"][0]
    payload = GeneratedRoadmapPayload.model_validate({"modules": [duplicated, duplicated]})
    with pytest.raises(SemanticValidationError):
        validate_roadmap_semantics("operator", payload.modules)


def test_semantic_validation_success(valid_generated_payload: dict) -> None:
    payload = GeneratedRoadmapPayload.model_validate(valid_generated_payload)
    flags = validate_roadmap_semantics("kubernetes operators", payload.modules)
    assert flags == []
