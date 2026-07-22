"""
Shared pytest fixtures for the GPR backend test suite.

The production app seeds the curated HR-MANUAL-V1 graph through FastAPI lifespan,
but ASGITransport-based tests do not reliably execute that startup path. These
helpers make each test module explicit and deterministic so the suite can run
from a clean checkout without relying on `/home/user/uploads` side effects.
"""

from pathlib import Path
from sqlalchemy import delete

from db.session import init_db, AsyncSessionLocal
from models.orm import DocumentORM, ChunkORM, ChunkConnectionORM, DocumentTableORM


REPO_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = Path(__file__).resolve().parents[1]
SAMPLE_HR_PDF = REPO_ROOT / "uploads" / "hr_extracted" / "hr_source.pdf"


async def reset_universal_tables() -> None:
    """Clear universal document/graph tables while leaving legacy/auth tables alone."""
    async with AsyncSessionLocal() as session:
        await session.execute(delete(ChunkConnectionORM))
        await session.execute(delete(DocumentTableORM))
        await session.execute(delete(ChunkORM))
        await session.execute(delete(DocumentORM))
        await session.commit()


async def seed_curated_fixture() -> None:
    """Seed the production curated 80-node graph deterministically for graph/chat tests."""
    await init_db()
    try:
        from services.ingestion.seed_curated import seed_curated_knowledge_graph
    except ImportError:  # pragma: no cover - package import fallback
        from src.backend.services.ingestion.seed_curated import seed_curated_knowledge_graph
    async with AsyncSessionLocal() as session:
        await seed_curated_knowledge_graph(session)
