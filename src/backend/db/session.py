"""
Database Session Management (`src/backend/db/session.py`).

Provides async SQLAlchemy session factories and multi-document table initialization (`init_db`).
Supports local persistent SQLite (`data/knowledge_workspace.db`) and Postgres (`DATABASE_URL`).
"""

import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

try:
    from ..models.orm import Base as UniversalBase
except ImportError:
    from models.orm import Base as UniversalBase

try:
    from ..models import Base as LegacyBase
except ImportError:
    try:
        from models import Base as LegacyBase
    except ImportError:
        LegacyBase = None

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///data/knowledge_workspace.db")

if DATABASE_URL.startswith("sqlite"):
    os.makedirs("data", exist_ok=True)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """Create all universal (`documents`, `chunks`, `chunk_connections`, `document_tables`) and legacy tables."""
    async with engine.begin() as conn:
        await conn.run_sync(UniversalBase.metadata.create_all)
        if LegacyBase is not None and LegacyBase is not UniversalBase:
            await conn.run_sync(LegacyBase.metadata.create_all)


async def get_db():
    """FastAPI dependency yielding an active async SQLAlchemy session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
