import pytest
from copy import deepcopy
from pydantic import ValidationError

from app.schemas.api import GenerateRoadmapRequest, GenerateRoadmapResponse


def test_request_schema_accepts_goal_only() -> None:
    request = GenerateRoadmapRequest.model_validate(
        {"userId": "user-1", "goal": "Kubernetes operators in Go"}
    )
    assert request.goal == "Kubernetes operators in Go"
    assert request.user_id == "user-1"


def test_response_schema_rejects_extra_fields(valid_generated_payload: dict) -> None:
    invalid = deepcopy(valid_generated_payload)
    invalid["meta"] = {"x": 1}
    with pytest.raises(ValidationError):
        GenerateRoadmapResponse.model_validate(invalid)
