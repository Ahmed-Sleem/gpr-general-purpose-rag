"""
Relational Data Models for Arabic Staff Knowledge Chatbot (`src/backend/models.py`).

Defines structural schemas for:
- Sections (`SectionRecord`): Multi-level organizational hierarchy and text blocks.
- Job Descriptions (`JobDescriptionRecord`): Roles, direct managers, and duties.
- KPI Tables (`KPIRecord`): Specific roles, metrics, calculation formulas, and targets.
- Escalation Rules (`EscalationRuleRecord`): Administrative escalation levels and trigger conditions.

Supports zero-vector structured keyword and SQL search (`tsvector` and exact metadata lookups).
"""

from typing import List, Optional
from pydantic import BaseModel, Field
from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


# --- SQLAlchemy ORM Models (for Postgres / SQLite relational persistence) ---

class SectionORM(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    section_code = Column(String(50), index=True, nullable=False)  # e.g., "1.0", "10.4"
    title_ar = Column(String(255), index=True, nullable=False)
    content_ar = Column(Text, nullable=False)
    parent_code = Column(String(50), index=True, nullable=True)
    page_number = Column(Integer, nullable=False)
    department = Column(String(255), index=True, nullable=True)


class JobDescriptionORM(Base):
    __tablename__ = "job_descriptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_title_ar = Column(String(255), index=True, nullable=False)
    section_code = Column(String(50), index=True, nullable=False)
    direct_manager_ar = Column(String(255), index=True, nullable=True)
    department_ar = Column(String(255), index=True, nullable=True)
    duties_ar = Column(Text, nullable=False)
    qualifications_ar = Column(Text, nullable=True)


class KPIORM(Base):
    __tablename__ = "kpi_tables"

    id = Column(Integer, primary_key=True, autoincrement=True)
    role_or_dept_ar = Column(String(255), index=True, nullable=False)
    kpi_name = Column(String(500), index=True, nullable=False)
    calculation = Column(Text, nullable=False)
    target = Column(String(255), nullable=False)
    frequency = Column(String(100), nullable=True)


class EscalationRuleORM(Base):
    __tablename__ = "escalation_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trigger_condition_ar = Column(Text, nullable=False)
    escalation_level = Column(String(100), index=True, nullable=False)
    target_role_ar = Column(String(255), index=True, nullable=False)
    action_ar = Column(Text, nullable=False)


# --- Pydantic Schemas (for Ingestion Export & ReAct Tool Returns) ---

class SectionRecord(BaseModel):
    section_code: str = Field(..., description="Unique hierarchical section code (e.g., '1.0', '10.4')")
    title_ar: str = Field(..., description="Arabic section header title")
    content_ar: str = Field(..., description="Complete Arabic text passage of this section")
    parent_code: Optional[str] = Field(None, description="Parent section code (if applicable)")
    page_number: int = Field(..., description="Page number where the section appears in the PDF")
    department: Optional[str] = Field(None, description="Associated department name")


class JobDescriptionRecord(BaseModel):
    job_title_ar: str = Field(..., description="Exact Arabic job title (e.g., 'مسؤول التسعير')")
    section_code: str = Field(..., description="Section code in the manual where this role is defined")
    direct_manager_ar: Optional[str] = Field(None, description="Direct reporting line (e.g., 'الرئيس التنفيذي')")
    department_ar: Optional[str] = Field(None, description="Department name (e.g., 'إدارة تطوير الأعمال')")
    duties_ar: List[str] = Field(..., description="List of exact duties and responsibilities")
    qualifications_ar: Optional[str] = Field(None, description="Required educational or professional qualifications")


class KPIRecord(BaseModel):
    role_or_dept_ar: str = Field(..., description="Role or department responsible for this KPI")
    kpi_name: str = Field(..., description="Name of the Key Performance Indicator (`اسم المؤشر`)")
    calculation: str = Field(..., description="Exact mathematical calculation formula (`طريقة الحساب`)")
    target: str = Field(..., description="Target objective value (`الهدف` or `المستهدف`)")
    frequency: Optional[str] = Field(None, description="Measurement frequency (`دورية القياس`)")


class EscalationRuleRecord(BaseModel):
    trigger_condition_ar: str = Field(..., description="Condition triggering administrative escalation")
    escalation_level: str = Field(..., description="Escalation level (e.g., 'المستوى الأول: الرئيس المباشر')")
    target_role_ar: str = Field(..., description="Role or department receiving the escalation")
    action_ar: str = Field(..., description="Required administrative action or time SLA")


class IndexedKnowledgeBase(BaseModel):
    document_version: str = "v1.0"
    sections: List[SectionRecord] = []
    job_descriptions: List[JobDescriptionRecord] = []
    kpis: List[KPIRecord] = []
    escalation_rules: List[EscalationRuleRecord] = []
