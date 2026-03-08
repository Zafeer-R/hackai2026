from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes import router
from app.core.dependencies import get_roadmap_service
from app.repository.mongodb import RepositoryError
from app.services.roadmap_service import GenerationError


def test_generate_endpoint_happy_path(client_with_service) -> None:
    client, provider, repository = client_with_service
    payload = {"userId": "user-1", "goal": "Kubernetes operators in Go"}
    response = client.post("/v1/roadmap/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == {"modules"}
    assert len(data["modules"]) >= 1
    assert provider.calls == 1
    assert "user-1" in repository.docs


def test_generate_endpoint_invalid_payload(client_with_service) -> None:
    client, _, _ = client_with_service
    response = client.post("/v1/roadmap/generate", json={})
    assert response.status_code == 422


def test_generate_endpoint_generation_error() -> None:
    class TimeoutService:
        def generate(self, request_data):
            raise GenerationError("Timed out while calling model")

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_roadmap_service] = lambda: TimeoutService()
    client = TestClient(app)

    response = client.post(
        "/v1/roadmap/generate",
        json={"userId": "abc", "goal": "foo bar"},
    )
    assert response.status_code == 502


def test_generate_endpoint_database_error() -> None:
    class DbFailService:
        def generate(self, request_data):
            raise RepositoryError("db offline")

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_roadmap_service] = lambda: DbFailService()
    client = TestClient(app)

    response = client.post(
        "/v1/roadmap/generate",
        json={"userId": "abc", "goal": "foo bar"},
    )
    assert response.status_code == 503


def test_edit_endpoint_happy_path(client_with_service) -> None:
    client, provider, repository = client_with_service
    repository.docs["user-1"] = {
        "userId": "user-1",
        "goal": "Kubernetes operators in Go",
        "modules": [
            {
                "title": "Operator Foundations",
                "chapters": [
                    {"title": "Controller pattern basics"},
                    {"title": "CRD design essentials"},
                ],
            },
            {
                "title": "Operator Delivery",
                "chapters": [
                    {"title": "Reconciliation logic in Go"},
                    {"title": "Testing and deployment"},
                ],
            },
        ],
        "updatedAt": "2026-01-01T00:00:00Z",
    }
    provider.payload = {
        "modules": [
            {
                "title": "Operator Foundations",
                "chapters": [
                    {"title": "Controller pattern basics"},
                    {"title": "CRD design essentials"},
                ],
            },
            {
                "title": "Operator Delivery",
                "chapters": [
                    {"title": "Simplified reconciliation logic in Go"},
                    {"title": "Testing and deployment"},
                ],
            },
        ]
    }
    response = client.post(
        "/v1/roadmap/edit",
        json={
            "userId": "user-1",
            "instruction": "Make chapter 3 easier",
            "roadmap": {
                "modules": repository.docs["user-1"]["modules"],
            },
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["modules"][1]["chapters"][0]["title"] == "Simplified reconciliation logic in Go"
    assert repository.docs["user-1"]["goal"] == "Kubernetes operators in Go"

    get_response = client.get("/v1/roadmap/user/user-1")
    assert get_response.status_code == 200
    assert get_response.json()["modules"][1]["chapters"][0]["title"] == "Simplified reconciliation logic in Go"


def test_edit_endpoint_invalid_payload(client_with_service) -> None:
    client, _, _ = client_with_service
    response = client.post("/v1/roadmap/edit", json={})
    assert response.status_code == 422


def test_edit_endpoint_generation_error() -> None:
    class BrokenEditService:
        def edit(self, request_data):
            raise GenerationError("Model changed unrelated chapters")

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_roadmap_service] = lambda: BrokenEditService()
    client = TestClient(app)

    response = client.post(
        "/v1/roadmap/edit",
        json={
            "userId": "abc",
            "instruction": "Make chapter 1 easier",
            "roadmap": {
                "modules": [{"title": "M1", "chapters": [{"title": "C1"}]}],
            },
        },
    )
    assert response.status_code == 502


def test_edit_endpoint_database_error() -> None:
    class DbFailEditService:
        def edit(self, request_data):
            raise RepositoryError("db offline")

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_roadmap_service] = lambda: DbFailEditService()
    client = TestClient(app)

    response = client.post(
        "/v1/roadmap/edit",
        json={
            "userId": "abc",
            "instruction": "Make chapter 1 easier",
            "roadmap": {
                "modules": [{"title": "M1", "chapters": [{"title": "C1"}]}],
            },
        },
    )
    assert response.status_code == 503


def test_get_roadmap_for_user_happy_path(client_with_service) -> None:
    client, _, _ = client_with_service
    post_response = client.post(
        "/v1/roadmap/generate",
        json={"userId": "user-42", "goal": "Kubernetes operators in Go"},
    )
    assert post_response.status_code == 200

    get_response = client.get("/v1/roadmap/user/user-42")
    assert get_response.status_code == 200
    data = get_response.json()
    assert data["userId"] == "user-42"
    assert data["goal"] == "Kubernetes operators in Go"
    assert len(data["modules"]) >= 1


def test_get_roadmap_for_user_not_found(client_with_service) -> None:
    client, _, _ = client_with_service
    response = client.get("/v1/roadmap/user/missing-user")
    assert response.status_code == 404
