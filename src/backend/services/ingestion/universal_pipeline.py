"""
Master Universal Ingestion Pipeline (`src/backend/services/ingestion/universal_pipeline.py`).

Orchestrates the complete multi-document processing lifecycle:
1. Multi-format parsing (`PDF`, `DOCX`, `TXT`, `MD`) into structural blocks.
2. Bilingual normalization (AR/EN character shaping, kerning, table orientation).
3. Dynamic chunking and Table of Contents (`toc_tree_json`) generation.
4. Obsidian Graph edge extraction (`parent_child` and `semantic_link` connections).
5. Relational multi-table persistence in SQLite/Postgres via repositories.
"""

import os
import json
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from ...db.repositories import DocumentRepository, ChunkRepository, GraphRepository, TableRepository
    from ...models.orm import DocumentTableORM
except ImportError:
    from db.repositories import DocumentRepository, ChunkRepository, GraphRepository, TableRepository
    from models.orm import DocumentTableORM

from .parsers import parse_pdf_file, parse_docx_file, parse_text_file
from .chunker import build_chunks_and_toc
from .graph_builder import build_graph_connections


async def process_document_pipeline(
    session: AsyncSession,
    doc_id: str,
    title: str,
    filename: str,
    file_path: str
) -> Tuple[bool, str]:
    """
    Execute universal ingestion for an uploaded document and persist relational entities.
    Returns `(success: bool, message: str)`.
    """
    if not os.path.exists(file_path):
        return False, f"File not found at path: {file_path}"

    doc_repo = DocumentRepository(session)
    chunk_repo = ChunkRepository(session)
    graph_repo = GraphRepository(session)
    table_repo = TableRepository(session)

    file_ext = os.path.splitext(filename)[-1].lower().replace(".", "")
    if not file_ext:
        file_ext = "txt"

    file_size = os.path.getsize(file_path)
    await doc_repo.create_document(
        doc_id=doc_id,
        title=title,
        filename=filename,
        file_type=file_ext,
        file_size=file_size,
        file_path=file_path
    )

    try:
        if file_ext == "pdf":
            blocks = parse_pdf_file(file_path)
        elif file_ext in ["docx", "doc"]:
            blocks = parse_docx_file(file_path)
        else:
            blocks = parse_text_file(file_path)

        if not blocks:
            await doc_repo.update_document_status(doc_id, "error")
            return False, f"No readable content extracted from {filename}"

        chunks, toc_json = build_chunks_and_toc(doc_id, blocks)
        await chunk_repo.create_chunks_batch(chunks)

        table_records = []
        for b in blocks:
            if b.get("type") == "table":
                table_records.append(DocumentTableORM(
                    document_id=doc_id,
                    table_name=b.get("title", "Extracted Table"),
                    headers_json=json.dumps(b.get("table_headers", []), ensure_ascii=False),
                    rows_json=json.dumps(b.get("table_rows", []), ensure_ascii=False)
                ))
        if table_records:
            await table_repo.create_tables_batch(table_records)

        connections = build_graph_connections(doc_id, chunks)
        if connections:
            await graph_repo.create_connections_batch(connections)

        await doc_repo.update_document_status(doc_id, "ready", toc_tree_json=toc_json)
        return True, f"Successfully processed {len(chunks)} chunks, {len(connections)} graph edges, and {len(table_records)} tables."

    except Exception as e:
        await session.rollback()
        await doc_repo.update_document_status(doc_id, "error")
        return False, f"Ingestion pipeline failure on {filename}: {str(e)}"
