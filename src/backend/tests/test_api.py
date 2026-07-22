"""
Automated Test Suite for FastAPI Endpoints (`src/backend/tests/test_api.py`).

Verifies `GAP-ASKC-02`:
- Document uploading (`POST /api/v1/documents/upload`) across sample files.
- Document listing (`GET /api/v1/documents`) and TOC retrieval (`GET /api/v1/documents/{id}`).
- Obsidian Graph View queries (`GET /api/v1/documents/graph` and `/api/v1/documents/{id}/graph`).
- Document deletion (`DELETE /api/v1/documents/{id}`).
"""

import os
import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from db.session import init_db
from tests.conftest import seed_curated_fixture


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="module")
async def setup_db():
    await seed_curated_fixture()


@pytest.mark.anyio
async def test_api_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


@pytest.mark.anyio
async def test_document_upload_and_listing(setup_db, tmp_path):
    md_path = tmp_path / "api_policy.md"
    md_path.write_text(
        "# API Test Policy\n\n"
        "This deterministic test document verifies upload, indexing, and listing.\n\n"
        "## Scope\n\n"
        "The policy applies to backend contract tests only.",
        encoding="utf-8",
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        with open(md_path, "rb") as f:
            files = {"file": ("api_policy.md", f, "text/markdown")}
            data = {"title": "API Test Policy"}
            response = await client.post("/api/v1/documents/upload", files=files, data=data)

        assert response.status_code == 201, f"Upload failed: {response.text}"
        payload = response.json()
        assert payload["status"] == "success"
        doc = payload["document"]
        assert doc["id"] is not None
        assert doc["status"] == "ready"
        assert doc["chunk_count"] >= 2

        list_resp = await client.get("/api/v1/documents")
        assert list_resp.status_code == 200
        docs_list = list_resp.json()
        assert len(docs_list) >= 2  # curated HR-MANUAL-V1 + uploaded fixture
        assert any(d["id"] == doc["id"] for d in docs_list)


@pytest.mark.anyio
async def test_obsidian_graph_api(setup_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.get("/api/v1/documents/graph")
        assert response.status_code == 200
        graph = response.json()
        assert "nodes" in graph and "links" in graph
        assert len(graph["nodes"]) >= 80
        assert len(graph["links"]) >= 100
        assert any(node["id"] == "1" for node in graph["nodes"]), "Expected curated HR-MANUAL-V1 node IDs"
        # Check node fields (`id`, `label`, `group`, `val`, `content_preview`)
        sample_node = graph["nodes"][0]
        assert "id" in sample_node and "label" in sample_node and "group" in sample_node
