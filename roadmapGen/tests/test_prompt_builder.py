from app.services.prompt_builder import build_edit_system_prompt, build_edit_user_prompt


def test_edit_system_prompt_has_preservation_rules() -> None:
    prompt = build_edit_system_prompt()

    assert "Keep the same module count" in prompt
    assert "Keep all module titles identical." in prompt
    assert "Leave every untouched chapter title exactly unchanged." in prompt


def test_edit_user_prompt_includes_instruction_and_roadmap() -> None:
    prompt = build_edit_user_prompt(
        roadmap={
            "modules": [
                {
                    "title": "Foundations",
                    "chapters": [{"title": "Basics"}],
                }
            ]
        },
        instruction="Make chapter 1 easier",
    )

    assert '"instruction": "Make chapter 1 easier"' in prompt
    assert '"existing_roadmap"' in prompt
    assert '"required_response_schema"' in prompt
