"""
Automated Test Suite for Universal Relational RAG Pipeline (`src/backend/tests/test_universal_pipeline.py`).

Verifies `GAP-ASKC-07`:
- Multi-format ingestion (`PDF` + `MD` documents).
- Persistent multi-document database storage across simulated session resets.
- Table of Contents (`toc_tree`) generation and exact full complete chunk counting.
- Obsidian Graph View node and edge extraction (`GraphViewDTO`).
- Bilingual AR/EN keyword grounding and retrieval.
"""

import os
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import init_db, AsyncSessionLocal
from db.repositories import DocumentRepository, ChunkRepository, GraphRepository, TableRepository
from services.ingestion.universal_pipeline import process_document_pipeline


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="module")
async def setup_db():
    await init_db()


@pytest.mark.anyio
async def test_universal_pdf_ingestion(setup_db):
    pdf_path = "/home/user/uploads/hr_extracted/hr_source.pdf"
    if not os.path.exists(pdf_path):
        pytest.skip(f"Source PDF not found at {pdf_path}")

    async with AsyncSessionLocal() as session:
        doc_id = "test_doc_hr_v1"
        success, msg = await process_document_pipeline(
            session=session,
            doc_id=doc_id,
            title="دليل الهيكل التنظيمي المعتمد v1.0",
            filename="hr_source.pdf",
            file_path=pdf_path
        )
        assert success is True, f"Ingestion failed: {msg}"


@pytest.mark.anyio
async def test_universal_markdown_ingestion(setup_db):
    md_path = "/tmp/sample_policy.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# سياسة الأمان السيبراني\n\nيجب على جميع الموظفين الالتزام بمعايير ISO 27001 وحماية البيانات.\n\n## 1.1 متطلبات أمان الحسابات\n\nتغيير كلمة المرور كل 90 يوماً وتفعيل المصادقة الثنائية.\n")

    async with AsyncSessionLocal() as session:
        doc_id = "test_doc_md_policy"
        success, msg = await process_document_pipeline(
            session=session,
            doc_id=doc_id,
            title="سياسة الأمان السيبراني",
            filename="sample_policy.md",
            file_path=md_path
        )
        assert success is True, f"Markdown ingestion failed: {msg}"


@pytest.mark.anyio
async def test_document_repository_and_toc(setup_db):
    async with AsyncSessionLocal() as session:
        doc_repo = DocumentRepository(session)
        doc = await doc_repo.get_document_by_id("test_doc_hr_v1")
        assert doc is not None, "Document test_doc_hr_v1 not found in persistent DB"
        assert doc.status == "ready"
        assert doc.chunk_count >= 300, f"Expected at least 300 full complete semantic chunks, got {doc.chunk_count}"
        assert len(doc.toc_tree) >= 1, "Expected TOC hierarchy items"


@pytest.mark.anyio
async def test_obsidian_graph_generation(setup_db):
    async with AsyncSessionLocal() as session:
        graph_repo = GraphRepository(session)
        graph = await graph_repo.get_document_graph("test_doc_hr_v1")
        assert len(graph.nodes) >= 300, f"Expected graph nodes for each full semantic chunk, got {len(graph.nodes)}"
        assert len(graph.links) >= 50, f"Expected exact UUID graph edges (parent-child & semantic), got {len(graph.links)}"

        has_semantic = any(link.label == "semantic_link" for link in graph.links)
        has_hierarchy = any(link.label == "parent_child" for link in graph.links)
        assert has_hierarchy is True, "Expected parent_child hierarchical links in graph"
        assert has_semantic is True, "Expected semantic keyword cross-reference links in graph"


@pytest.mark.anyio
async def test_bilingual_keyword_retrieval(setup_db):
    async with AsyncSessionLocal() as session:
        chunk_repo = ChunkRepository(session)
        
        ar_results = await chunk_repo.search_chunks("حوادث السلامة", document_id="test_doc_hr_v1")
        assert len(ar_results) >= 1, "Expected Arabic search results for 'حوادث السلامة'"

        en_results = await chunk_repo.search_chunks("TRIR", document_id="test_doc_hr_v1")
        assert len(en_results) >= 1, "Expected English acronym results for 'TRIR'"


@pytest.mark.anyio
async def test_persistent_storage_survives_restarts(setup_db):
    """Verify data remains stored across completely separate database session instances (simulated restart)."""
    async with AsyncSessionLocal() as new_session:
        doc_repo = DocumentRepository(new_session)
        graph_repo = GraphRepository(new_session)
        
        docs = await doc_repo.list_documents()
        assert len(docs) >= 2, f"Expected at least 2 persistent documents across sessions, got {len(docs)}"
        
        all_graph = await graph_repo.get_document_graph(document_id=None)
        assert len(all_graph.nodes) >= 300, "Unified multi-document workspace graph should return persistent nodes across restart"
