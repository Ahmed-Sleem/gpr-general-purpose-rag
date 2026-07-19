"""
Database Engine & Session Management (`src/backend/database.py`).

Provides SQLAlchemy async session factories and table initialization for structural RAG persistence.
Supports portable local SQLite (`sqlite+aiosqlite:///data/hr_knowledge.db`) and Postgres (`postgresql+asyncpg://...`).
"""

import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

try:
    from .models import Base
except ImportError:
    from models import Base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///data/hr_knowledge.db")

# Ensure local data directory exists when using SQLite
if DATABASE_URL.startswith("sqlite"):
    os.makedirs("data", exist_ok=True)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """Create all relational tables (`sections`, `job_descriptions`, `kpi_tables`, `escalation_rules`)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """Dependency for FastAPI route handlers yielding an active async SQLAlchemy session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
