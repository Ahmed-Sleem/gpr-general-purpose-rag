"""
Dynamic Structural Chunker & TOC Generator (`src/backend/services/ingestion/chunker.py`).

Transforms raw structural blocks (`heading`, `text`, `table`) into relational `ChunkORM` records
and constructs the hierarchical Table of Contents (`toc_tree_json`) for document navigation.
"""

import json
import uuid
from typing import List, Dict, Any, Tuple, Optional

try:
    from ...models.orm import ChunkORM
    from ...models.domain import TOCTreeNode
except ImportError:
    from models.orm import ChunkORM
    from models.domain import TOCTreeNode


def build_chunks_and_toc(document_id: str, blocks: List[Dict[str, Any]]) -> Tuple[List[ChunkORM], str]:
    """
    Process raw document blocks into `ChunkORM` entities and JSON TOC tree.
    Enforces parent-child hierarchy across multi-level headings and paragraphs.
    """
    chunks: List[ChunkORM] = []
    toc_nodes: List[TOCTreeNode] = []
    
    heading_stack: Dict[int, Tuple[str, str, TOCTreeNode]] = {}

    for idx, block in enumerate(blocks):
        block_type = block.get("type", "text")
        level = block.get("level", 0)
        title = block.get("title", f"Section {idx+1}")
        content = block.get("content", "")
        page_num = block.get("page_number", 1)
        code = block.get("code", f"c_{idx+1}")

        word_count = len(content.split())

        parent_chunk_id: Optional[str] = None
        if block_type == "heading":
            for l in list(heading_stack.keys()):
                if l >= level:
                    del heading_stack[l]
            parent_level = max([l for l in heading_stack.keys() if l < level], default=0)
            if parent_level in heading_stack:
                parent_chunk_id = heading_stack[parent_level][0]
        else:
            deepest_level = max(heading_stack.keys(), default=0)
            if deepest_level in heading_stack:
                parent_chunk_id = heading_stack[deepest_level][0]

        chunk_uuid = str(uuid.uuid4())
        chunk = ChunkORM(
            id=chunk_uuid,
            document_id=document_id,
            chunk_code=code,
            title=title[:250],
            content=content,
            page_number=page_num,
            chunk_type=block_type,
            parent_chunk_id=parent_chunk_id,
            word_count=word_count
        )
        chunks.append(chunk)

        if block_type in ["heading", "table"]:
            node = TOCTreeNode(
                id=chunk_uuid,
                code=code,
                title=title[:80],
                page_number=page_num,
                children=[]
            )
            if block_type == "heading":
                parent_level = max([l for l in heading_stack.keys() if l < level], default=0)
                if parent_level in heading_stack:
                    heading_stack[parent_level][2].children.append(node)
                else:
                    toc_nodes.append(node)
                heading_stack[level] = (chunk_uuid, code, node)
            else:
                deepest_level = max(heading_stack.keys(), default=0)
                if deepest_level in heading_stack:
                    heading_stack[deepest_level][2].children.append(node)
                else:
                    toc_nodes.append(node)

    toc_json = json.dumps([node.model_dump() for node in toc_nodes], ensure_ascii=False)
    return chunks, toc_json
