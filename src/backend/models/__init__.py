"""Models package exporting universal relational ORMs, domain DTOs, and legacy HR schemas."""
from .orm import Base, DocumentORM, ChunkORM, ChunkConnectionORM, DocumentTableORM
from .domain import (
    TOCTreeNode, ChunkDTO, ChunkConnectionDTO, DocumentTableDTO,
    DocumentDTO, GraphNodeDTO, GraphLinkDTO, GraphViewDTO
)
from .legacy import (
    SectionRecord, JobDescriptionRecord, KPIRecord, EscalationRuleRecord, IndexedKnowledgeBase,
    SectionORM, JobDescriptionORM, KPIORM, EscalationRuleORM
)
