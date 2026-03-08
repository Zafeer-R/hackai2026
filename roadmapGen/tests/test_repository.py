import mongomock

from app.core.config import Settings
from app.repository.mongodb import MongoRoadmapRepository


def test_repository_upsert_and_get() -> None:
    settings = Settings(MONGO_DB="test_db")
    repo = MongoRoadmapRepository(settings=settings, client=mongomock.MongoClient())

    modules = [{"title": "Foundations", "chapters": [{"title": "Basics"}]}]
    repo.upsert_user_roadmap(user_id="user-123", goal="Kubernetes operators", modules=modules)
    stored = repo.get_user_roadmap("user-123")

    assert stored is not None
    assert stored["userId"] == "user-123"
    assert stored["goal"] == "Kubernetes operators"
    assert stored["modules"] == modules
