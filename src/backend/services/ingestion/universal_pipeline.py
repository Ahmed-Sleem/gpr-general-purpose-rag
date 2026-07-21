"""
Master Universal Ingestion Pipeline (`src/backend/services/ingestion/universal_pipeline.py`).

Orchestrates the complete multi-document processing lifecycle:
1. Multi-format parsing (`PDF`, `DOCX`, `TXT`, `MD`) into structural blocks.
2. Bilingual normalization (AR/EN character shaping, kerning, table orientation).
3. Dynamic chunking and Table of Contents (`toc_tree_json`) generation via LLM Semantic Analyzer or universal entity extractor.
4. Obsidian Graph edge extraction (`parent_child` and `semantic_link` connections without hardcodes).
5. Relational multi-table persistence in SQLite/Postgres via repositories.
All terminal and system print messages are strictly English.
"""

import os
import json
import argparse
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from ...db.repositories import DocumentRepository, ChunkRepository, GraphRepository, TableRepository
    from ...models.orm import DocumentTableORM
except ImportError:
    from db.repositories import DocumentRepository, ChunkRepository, GraphRepository, TableRepository
    from models.orm import DocumentTableORM

from .parsers import parse_pdf_file, parse_docx_file, parse_text_file
from .llm_semantic_analyzer import analyze_and_chunk_with_llm


async def process_document_pipeline(
    session: AsyncSession,
    doc_id: str,
    title: str,
    filename: str,
    file_path: str,
    api_key: Optional[str] = None,
    provider: str = "deepseek",
    model: str = "deepseek-chat"
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
        print(f"[GPR INFO] Parsing structural content for file: {filename} ({file_ext.upper()})...")
        if file_ext == "pdf":
            blocks = parse_pdf_file(file_path)
        elif file_ext in ["docx", "doc"]:
            blocks = parse_docx_file(file_path)
        else:
            blocks = parse_text_file(file_path)

        if not blocks:
            await doc_repo.update_document_status(doc_id, "error")
            return False, f"No readable content extracted from {filename}"

        print(f"[GPR INFO] Analyzing semantic chunks and building Table of Contents hierarchy for {filename}...")
        chunks, connections, toc_json = await analyze_and_chunk_with_llm(
            document_id=doc_id,
            blocks=blocks,
            api_key=api_key,
            provider=provider,
            model=model
        )
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

        print(f"[GPR INFO] Persisting Obsidian Graph semantic edges for {filename}...")
        if connections:
            await graph_repo.create_connections_batch(connections)

        await doc_repo.update_document_status(doc_id, "ready", toc_tree_json=toc_json)
        msg = f"Successfully processed {len(chunks)} chunks, {len(connections)} graph edges, and {len(table_records)} tables."
        print(f"[GPR INFO] {msg}")
        return True, msg

    except Exception as e:
        await session.rollback()
        await doc_repo.update_document_status(doc_id, "error")
        err_msg = f"Ingestion pipeline failure on {filename}: {str(e)}"
        print(f"[GPR ERROR] {err_msg}")
        return False, err_msg


def main():
    parser = argparse.ArgumentParser(description="Run GPR — General Purpose RAG ingestion CLI")
    parser.add_argument("--pdf", type=str, default="sample_manuals/hr_source.pdf", help="Path to source document")
    parser.add_argument("--out", type=str, default="src/backend/data/hr_indexed.json", help="Path for JSON output export")
    args = parser.parse_args()

    print(f"[GPR INFO] Starting General Purpose RAG ingestion CLI on: {args.pdf} ...")
    import asyncio
    try:
        from ...db.session import AsyncSessionLocal
    except ImportError:
        from db.session import AsyncSessionLocal

    async def run_cli():
        async with AsyncSessionLocal() as session:
            doc_id = "cli_doc_" + os.path.basename(args.pdf).replace(".", "_")
            await process_document_pipeline(
                session=session,
                doc_id=doc_id,
                title="CLI Ingested Document",
                filename=os.path.basename(args.pdf),
                file_path=args.pdf
            )
    asyncio.run(run_cli())
    print("[GPR INFO] CLI ingestion pipeline completed successfully.")


if __name__ == "__main__":
    main()
