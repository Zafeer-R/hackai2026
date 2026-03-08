from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.errors import PyMongoError

class RepositoryError(RuntimeError):
    pass


class MongoRoadmapRepository:
    def __init__(self, settings: object, client: MongoClient | None = None) -> None:
        self._client = client or MongoClient(
            settings.mongo_uri,
            tlsAllowInvalidCertificates=True,
            serverSelectionTimeoutMS=5000,
        )
        self._db = self._client[settings.mongo_db]
        self._collection: Collection = self._db[settings.mongo_collection]
        self._profiles_collection: Collection = self._db[settings.user_profiles_collection]

    def upsert_user_roadmap(self, *, user_id: str, goal: str, modules: list[dict[str, Any]]) -> None:
        payload = {
            "_id": user_id,
            "userId": user_id,
            "goal": goal,
            "modules": modules,
            "updatedAt": datetime.now(timezone.utc),
        }
        try:
            self._collection.update_one({"_id": user_id}, {"$set": payload}, upsert=True)
        except PyMongoError as exc:
            raise RepositoryError("Failed to upsert user roadmap") from exc

    def get_user_roadmap(self, user_id: str) -> dict[str, Any] | None:
        try:
            print(f"[DEBUG] get_user_roadmap: db={self._db.name} collection={self._collection.name} user_id={user_id!r}")
            result = self._collection.find_one({"_id": user_id}, {"_id": 0})
            print(f"[DEBUG] get_user_roadmap: result={result}")
            return result
        except PyMongoError as exc:
            raise RepositoryError("Failed to fetch user roadmap") from exc

    def get_user_profile(self, user_id: str) -> dict[str, Any] | None:
        try:
            return self._profiles_collection.find_one({"_id": user_id}, {"_id": 0})
        except PyMongoError as exc:
            raise RepositoryError("Failed to fetch user profile") from exc
