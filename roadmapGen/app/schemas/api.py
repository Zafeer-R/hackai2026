from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class GenerateRoadmapRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    user_id: str = Field(min_length=1, max_length=120, alias="userId")
    goal: str = Field(min_length=3, max_length=200)

    @field_validator("goal")
    @classmethod
    def normalize_goal(cls, value: str) -> str:
        return " ".join(value.split()).strip()


class Chapter(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=140)


class Module(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=140)
    chapters: list[Chapter] = Field(min_length=1, max_length=4)


class GeneratedChapter(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=300)


class GeneratedModule(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=300)
    chapters: list[GeneratedChapter] = Field(default_factory=list, max_length=12)


class GeneratedRoadmapPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    modules: list[GeneratedModule] = Field(min_length=1, max_length=10)


class GenerateRoadmapResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    modules: list[Module]


class StoredRoadmapResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    user_id: str = Field(alias="userId")
    goal: str
    modules: list[Module]
    updated_at: datetime = Field(alias="updatedAt")
