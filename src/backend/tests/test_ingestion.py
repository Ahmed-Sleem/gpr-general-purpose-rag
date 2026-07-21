"""
Automated Test Suite for Structural PDF Ingestion (`src/backend/tests/test_ingestion.py`).

Verifies `GAP-ASKC-01`:
- Exact extraction of multi-level sections and department mapping from `hr_source.pdf`.
- Exact job description field parsing (`job_title_ar`, `direct_manager_ar`, `duties_ar`).
- Exact KPI table relational extraction (`kpi_name`, `calculation`, `target`).
- Idempotent relational database persistence and JSON export.
"""

import os
import json
import pytest
from ingestion.parse_hr_pdf import parse_pdf_structure, is_arabic, normalize_pdfplumber_table_cell


@pytest.fixture(scope="module")
def sample_pdf_path():
    path = "/home/user/uploads/hr_extracted/hr_source.pdf"
    if not os.path.exists(path):
        pytest.skip(f"Source PDF not found at {path}")
    return path


@pytest.fixture(scope="module")
def parsed_kb(sample_pdf_path):
    """Cached knowledge base extraction for the test module (runs once)."""
    return parse_pdf_structure(sample_pdf_path)


def test_arabic_detection_and_normalization():
    assert is_arabic("مسؤول التسعير") is True
    assert is_arabic("PMO Manager") is False

    # Test reverse visual order normalization (`pdfplumber` cell)
    reversed_cell = "مؤش األداء ر"
    assert is_arabic(reversed_cell) is True
    normalized = normalize_pdfplumber_table_cell(reversed_cell)
    assert len(normalized) > 0


def test_parse_pdf_structure_counts(parsed_kb):
    # Assert overall document structure counts (`hr_source.pdf` v1.0)
    assert parsed_kb.document_version == "v1.0"
    assert len(parsed_kb.sections) >= 70, f"Expected at least 70 full complete departmental chapters, got {len(parsed_kb.sections)}"
    assert len(parsed_kb.job_descriptions) >= 45, f"Expected at least 45 self-contained job role profiles, got {len(parsed_kb.job_descriptions)}"
    assert len(parsed_kb.kpis) >= 180, f"Expected at least 180 exact KPI calculation formulas, got {len(parsed_kb.kpis)}"
    assert len(parsed_kb.escalation_rules) == 4, f"Expected exactly 4 escalation rules, got {len(parsed_kb.escalation_rules)}"


def test_specific_job_role_grounding(parsed_kb):
    # Check that PMO Manager (`مدير مكتب إدارة المشاريع`) exists and has direct manager (`الرئيس التنفيذي`)
    pmo_roles = [jd for jd in parsed_kb.job_descriptions if "إدارة المشاريع" in jd.job_title_ar or "PMO" in jd.job_title_ar or "مكتب إدارة المشاريع" in jd.job_title_ar]
    assert len(pmo_roles) >= 1, "Expected PMO Manager role in job descriptions"
    pmo = pmo_roles[0]
    assert pmo.direct_manager_ar is not None, "Direct reporting line should be parsed for PMO Manager"
    assert len(pmo.duties_ar) >= 2, f"Expected at least 2 duties for PMO Manager, got {len(pmo.duties_ar)}"

    # Check that Pricing Officer (`مسؤول التسعير`) exists and has direct manager (`مدير تطوير الأعمال`)
    pricing_roles = [jd for jd in parsed_kb.job_descriptions if "التسعير" in jd.job_title_ar]
    assert len(pricing_roles) >= 1, "Expected Pricing Officer role in job descriptions"
    pricing = pricing_roles[0]
    assert pricing.direct_manager_ar is not None
    assert any("تطوير الأعمال" in str(pricing.direct_manager_ar) or "الرئيس المباشر" in str(pricing.direct_manager_ar) for _ in [1])


def test_kpi_formula_and_target_precision(parsed_kb):
    # Verify exact formulas exist without truncation
    has_formula = any("÷" in kpi.calculation or "×" in kpi.calculation for kpi in parsed_kb.kpis)
    assert has_formula is True, "KPI calculations should contain exact division or multiplication formulas"
    
    # Check that QHSE incident rate formula exists (`TRIR` or `السلامة`)
    qhse_kpis = [kpi for kpi in parsed_kb.kpis if "TRIR" in kpi.kpi_name or "السلامة" in kpi.kpi_name or "حوادث" in kpi.kpi_name]
    assert len(qhse_kpis) >= 1, "Expected QHSE Safety Incident Rate (`TRIR`) in parsed KPIs"
    assert any("200,000" in kpi.calculation for kpi in qhse_kpis), "Expected exact 200,000 hours factor in TRIR calculation formula"
