"""
Master Curated Knowledge Graph Builder (`build_curated_knowledge.py`).

Per Ahmed's exact confirmed blueprint (`GAP-GPR-18`), this module ingests our golden 80-node dataset
(`deepseek_json_20260720_7bf464.json`) containing exact `id, name, short_description, section_path, content, connections`.

Separates TOC (`toc_tree_json` — strictly metadata & connections) from protected node content (`ChunkORM.content`),
ensuring zero token waste during navigation while protecting pristine full text for node inspections.
"""

import os
import json
import uuid
from typing import List, Dict, Any

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
CURATED_OUT_PATH = os.path.join(DATA_DIR, "curated_knowledge_graph.json")


def get_source_json_path() -> str:
    """Resolve source golden JSON path across local workspace, container root (`/app`), or uploads."""
    candidates = [
        "/home/user/uploads/deepseek_json_20260720_7bf464.json",
        os.path.join(DATA_DIR, "deepseek_json_20260720_7bf464.json"),
        os.path.abspath("uploads/deepseek_json_20260720_7bf464.json"),
        os.path.abspath("src/backend/data/deepseek_json_20260720_7bf464.json"),
        "/app/src/backend/data/deepseek_json_20260720_7bf464.json"
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return os.path.join(DATA_DIR, "deepseek_json_20260720_7bf464.json")


def generate_stable_uuid(code: str) -> str:
    """Generate a deterministic UUID v5 from unique node code."""
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"gpr.workspace.kayan.{code}"))


def build_curated_knowledge_graph() -> Dict[str, Any]:
    source_path = get_source_json_path()
    if not os.path.exists(source_path):
        raise FileNotFoundError(f"Source golden dataset not found at {source_path}")

    with open(source_path, "r", encoding="utf-8") as f:
        raw_items = json.load(f)

    if not isinstance(raw_items, list):
        raise ValueError("Golden dataset must be a list of node objects")

    doc_id = "HR-MANUAL-V1"
    document_meta = {
        "id": doc_id,
        "title": "Kayan Al-Mamlaka Approved Organizational Structure Guide v1.0",
        "filename": "hr_source.pdf",
        "file_type": "pdf",
        "file_size": 1828800,
        "status": "ready",
        "created_at": "2026-07-20T10:00:00Z"
    }

    chunks: List[Dict[str, Any]] = []
    connections: List[Dict[str, Any]] = []
    toc_tree: List[Dict[str, Any]] = []

    # Map all valid IDs to avoid broken foreign keys on connections
    valid_ids = {str(item.get("id")).strip() for item in raw_items if item.get("id")}

    for item in raw_items:
        node_id = str(item.get("id")).strip()
        if not node_id:
            continue

        name = str(item.get("name") or node_id).strip()
        short_desc = str(item.get("short_description") or "").strip()
        section_path = item.get("section_path", [])
        content = str(item.get("content") or "").strip()
        conn_list = item.get("connections", [])
        if isinstance(conn_list, str):
            try:
                conn_list = json.loads(conn_list)
            except Exception:
                conn_list = []

        # Determine parent node ID from hierarchy (e.g. "6.1" -> "6")
        parent_id = None
        if "." in node_id:
            parts = node_id.split(".")
            candidate_parent = ".".join(parts[:-1])
            if candidate_parent in valid_ids:
                parent_id = candidate_parent

        # Determine page/chapter number
        page_num = 1
        try:
            page_num = int(node_id.split(".")[0])
        except Exception:
            pass

        chunks.append({
            "id": node_id,
            "document_id": doc_id,
            "chunk_code": node_id,
            "title": name,
            "content": content,
            "page_number": page_num,
            "chunk_type": "text" if "." in node_id else "heading",
            "parent_chunk_id": parent_id,
            "word_count": len(content.split())
        })

        toc_tree.append({
            "id": node_id,
            "name": name,
            "short_description": short_desc,
            "section_path": section_path,
            "connections": conn_list
        })

        # Build connection edges
        for target in conn_list:
            target_str = str(target).strip()
            if target_str in valid_ids and target_str != node_id:
                connections.append({
                    "id": generate_stable_uuid(f"CONN-{node_id}-{target_str}"),
                    "source_chunk_id": node_id,
                    "target_chunk_id": target_str,
                    "relationship_type": "parent_child" if target_str == parent_id else "semantic_link",
                    "strength": 1.0
                })

    document_meta["chunk_count"] = len(chunks)
    document_meta["toc_tree"] = toc_tree

    result = {
        "document": document_meta,
        "chunks": chunks,
        "connections": connections,
        "summary": {
            "total_nodes": len(chunks),
            "total_connections": len(connections),
            "toc_tree_size": len(toc_tree)
        }
    }

    os.makedirs(os.path.dirname(CURATED_OUT_PATH), exist_ok=True)
    with open(CURATED_OUT_PATH, "w", encoding="utf-8") as f_out:
        json.dump(result, f_out, ensure_ascii=False, indent=2)

    print(f"[GPR INFO] Successfully built golden curated graph from {source_path}")
    print(f"[GPR INFO] Summary: {result['summary']}")
    return result


if __name__ == "__main__":
    build_curated_knowledge_graph()
