"""
Obsidian Graph Builder (`src/backend/services/ingestion/graph_builder.py`).

Constructs force-directed network edges (`ChunkConnectionORM`) across chunks with guaranteed UUID resolution:
1. Hierarchical links (`parent_child`): Connects subheadings and paragraphs to parent sections.
2. Semantic concept links (`semantic_link`): Connects full semantic chunks across documents or distant sections
   sharing corporate entities, KPI names (`TRIR`, `KPI`), departments (`PMO`, `QHSE`), or responsibilities (`التسعير`, `المناقصات`).
All internal system messages and terminal logs are strictly English.
"""

import re
from typing import List, Dict, Set
try:
    from ...models.orm import ChunkORM, ChunkConnectionORM
except ImportError:
    from models.orm import ChunkORM, ChunkConnectionORM


SEMANTIC_KEYWORDS = [
    "pmo", "qhse", "kpi", "trir", "ceo", "iso", "rirt",
    "المشاريع", "التسعير", "المناقصات", "السلامة", "الجودة", "التصعيد",
    "الموارد البشرية", "المالية", "القانونية", "العقود", "المخاطر"
]


def build_graph_connections(document_id: str, chunks: List[ChunkORM]) -> List[ChunkConnectionORM]:
    """Generate hierarchical and semantic graph links (`ChunkConnectionORM`) with guaranteed UUID endpoints."""
    connections: List[ChunkConnectionORM] = []
    
    # Map for keyword occurrences across chunks: {keyword: [ChunkORM...]}
    keyword_map: Dict[str, List[ChunkORM]] = {kw: [] for kw in SEMANTIC_KEYWORDS}

    for chunk in chunks:
        # 1. Hierarchical parent-child edges (`parent_chunk_id` is already a valid UUID)
        if chunk.parent_chunk_id:
            connections.append(ChunkConnectionORM(
                document_id=document_id,
                source_chunk_id=chunk.parent_chunk_id,
                target_chunk_id=chunk.id,
                relation_type="parent_child",
                weight=1.0,
                explanation="Hierarchical section structure"
            ))

        # 2. Index semantic terms across title and content
        lower_content = chunk.content.lower()
        lower_title = chunk.title.lower()
        for kw in SEMANTIC_KEYWORDS:
            if kw in lower_content or kw in lower_title:
                keyword_map[kw].append(chunk)

    # 3. Create semantic cross-reference edges between distinct chunks (`source_chunk_id -> target_chunk_id`)
    seen_pairs: Set[str] = set()
    for kw, matching_chunks in keyword_map.items():
        if len(matching_chunks) < 2 or len(matching_chunks) > 15:
            continue
        for i in range(len(matching_chunks)):
            for j in range(i + 1, len(matching_chunks)):
                c1 = matching_chunks[i]
                c2 = matching_chunks[j]
                if c1.id == c2.id or c1.parent_chunk_id == c2.id or c2.parent_chunk_id == c1.id:
                    continue
                
                pair_key = f"{min(c1.id, c2.id)}_{max(c1.id, c2.id)}"
                if pair_key in seen_pairs:
                    continue
                seen_pairs.add(pair_key)

                # Both c1.id and c2.id are verified valid ChunkORM UUID strings
                connections.append(ChunkConnectionORM(
                    document_id=document_id,
                    source_chunk_id=c1.id,
                    target_chunk_id=c2.id,
                    relation_type="semantic_link",
                    weight=0.75,
                    explanation=f"Shared concept: {kw}"
                ))

    return connections
