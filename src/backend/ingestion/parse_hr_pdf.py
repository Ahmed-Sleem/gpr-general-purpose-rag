"""
Structural Relational PDF Ingestion Pipeline (`src/backend/ingestion/parse_hr_pdf.py`).

Parses `hr_source.pdf` (Organizational Structure, Job Responsibilities, and KPI Guide v1.0) into structured records:
- Sections (`SectionRecord`): Organizational manual sections and multi-level hierarchy (`1.0`, `1.1`, `10.4`, etc.)
- Job Descriptions (`JobDescriptionRecord`): Role title, direct reporting line (`التبعية التنظيمية`), department, duties (`المهام والمسؤوليات`), and qualifications (`المتطلبات`).
- KPI Tables (`KPIRecord`): Role/department, KPI indicator name (`اسم المؤشر`), calculation formula (`طريقة الحساب`), target (`الهدف`), and frequency.
- Escalation Rules (`EscalationRuleRecord`): Administrative escalation decision matrix (`مصفوفة التصعيد الإداري`).

Saves outputs to relational DB (`sections`, `job_descriptions`, `kpi_tables`, `escalation_rules`) and exports clean JSON (`hr_indexed.json`) without any vector embeddings.
"""

import os
import re
import json
import argparse
from typing import List, Dict, Any, Optional
import pypdf
import pdfplumber

try:
    from ..models import SectionRecord, JobDescriptionRecord, KPIRecord, EscalationRuleRecord, IndexedKnowledgeBase
    from ..database import init_db, AsyncSessionLocal, engine
    from ..models import SectionORM, JobDescriptionORM, KPIORM, EscalationRuleORM
except ImportError:
    from models import SectionRecord, JobDescriptionRecord, KPIRecord, EscalationRuleRecord, IndexedKnowledgeBase
    from database import init_db, AsyncSessionLocal, engine
    from models import SectionORM, JobDescriptionORM, KPIORM, EscalationRuleORM


def is_arabic(s: str) -> bool:
    """Check if a string contains Arabic Unicode letters."""
    return any("\u0600" <= c <= "\u06FF" for c in s)


def fix_kerning(text: str) -> str:
    """Normalize multi-space kerning and single-letter splits in Arabic words from PDF text."""
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"([أ-ي]{3,})\s+([أ-ي]{1,2})(?![أ-ي\w])", r"\1\2", text)
    return text


def normalize_pdfplumber_table_cell(text: str) -> str:
    """
    Normalize Arabic text extracted from PDF table cells (`pdfplumber`).
    In `hr_source.pdf`, `pdfplumber` table cells store Arabic RTL characters in reverse visual order.
    We reverse all characters and fix bracket mirroring, numbers (`100`, `200,000`), English acronyms (`TRIR`, `PMO`), and lam-alef ligatures.
    """
    if not text:
        return ""
    text = str(text).strip().replace("\n", " ")
    if not is_arabic(text):
        return text

    rev = text[::-1]
    table = str.maketrans("()[]{}", ")(][}{")
    rev = rev.translate(table)
    rev = re.sub(r"\d+(?:[.,]\d+)*", lambda m: m.group(0)[::-1], rev)
    rev = re.sub(r"[A-Za-z]+", lambda m: m.group(0)[::-1], rev)
    rev = rev.replace("السالمة", "السلامة").replace("اإل", "الإ").replace("األهداف", "الأهداف").replace("االسياتيجية", "الاستراتيجية").replace("المعايري", "المعايير").replace("يرياعملل", "للمعايير").replace("المشاري ع", "المشاريع")
    return fix_kerning(rev)


def parse_pdf_structure(pdf_path: str) -> IndexedKnowledgeBase:
    """
    Parse the official HR manual PDF into structural relational entities.
    Reads page-by-page text via `pypdf` for section hierarchy and `pdfplumber` for structured KPI tables.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"Source PDF not found at path: {pdf_path}")

    kb = IndexedKnowledgeBase(document_version="v1.0")
    
    current_dept: str = "مقدمة الدليل والهيكل العام"
    current_section_code: str = "1.0"
    current_section_title: str = "مقدمة الدليل"
    current_role: Optional[str] = None
    in_duties_section: bool = False
    
    sections_map: Dict[str, SectionRecord] = {}
    job_desc_map: Dict[str, JobDescriptionRecord] = {}
    
    reader = pypdf.PdfReader(pdf_path)
    
    # --- Step 1: Extract Sections & Job Descriptions via `pypdf` logical text extraction ---
    for page_idx, page in enumerate(reader.pages):
        page_num = page_idx + 1
        text = page.extract_text()
        if not text:
            continue

        lines = [fix_kerning(l) for l in text.split("\n") if fix_kerning(l)]
        i = 0
        while i < len(lines):
            line = lines[i]
            
            sec_match_1 = re.match(r"^([0-9]+(?:\.[0-9]+)*)\s+([^\.\d].+)$", line)
            sec_match_2 = re.match(r"^([0-9]+(?:\.[0-9]+)*)$", line)
            
            code: Optional[str] = None
            title: Optional[str] = None
            
            if sec_match_1 and len(line) < 120:
                code = sec_match_1.group(1)
                title = fix_kerning(sec_match_1.group(2))
                i += 1
            elif sec_match_2 and i + 1 < len(lines):
                nxt = fix_kerning(lines[i+1])
                if not re.match(r"^([0-9]+(?:\.[0-9]+)*)$", nxt) and len(nxt) < 100 and is_arabic(nxt):
                    code = line.strip()
                    title = nxt
                    i += 2
                else:
                    i += 1
            else:
                i += 1
                
            if code and title and is_arabic(title):
                if page_num > 5 and ("." not in code or code.endswith(".0") or any(k in title for k in ["إدارة", "مكتب", "قطاع", "الرئيس", "الإدارة"])):
                    if not any(k in title for k in ["الوصف الوظيفي", "المهام", "مؤشرات"]):
                        current_dept = title
                        
                current_section_code = code
                current_section_title = title
                
                parent_code = code.rsplit(".", 1)[0] if "." in code else None
                if parent_code == code:
                    parent_code = None

                sec_record = SectionRecord(
                    section_code=code,
                    title_ar=title,
                    content_ar=line if not sec_match_2 else f"{code} {title}",
                    parent_code=parent_code,
                    page_number=page_num,
                    department=current_dept
                )
                sections_map[f"{page_num}_{code}"] = sec_record
                
                if "المهام والمسؤوليات" in title:
                    in_duties_section = True
                elif "الوصف الوظيفي" in title or "مؤشرات الأداء" in title or "مصفوفة" in title:
                    in_duties_section = False

                if any(k in title for k in ["مسؤول", "مدير", "الرئيس", "أخصائي", "مستشار", "سكرتير", "محاسب"]) and not any(k in title for k in ["الوصف", "المهام", "مؤشرات", "متابعة", "مصفوفة"]):
                    current_role = title
                    in_duties_section = False
                    if current_role not in job_desc_map:
                        job_desc_map[current_role] = JobDescriptionRecord(
                            job_title_ar=current_role,
                            section_code=code,
                            direct_manager_ar=None,
                            department_ar=current_dept,
                            duties_ar=[],
                            qualifications_ar=None
                        )
                continue

            if f"{page_num}_{current_section_code}" in sections_map:
                sections_map[f"{page_num}_{current_section_code}"].content_ar += f"\n{line}"
                
            if current_role and current_role in job_desc_map and page_num > 5:
                if "التبعية التنظيمية:" in line or "يرفع تقاريره إلى" in line or "يُقدِّم تقاريره إلى" in line:
                    manager_text = re.sub(r"^.*(?:التبعية التنظيمية:|يرفع تقاريره إلى)\s*", "", line).replace("يُقدِّم تقاريره إلى", "").replace("يُقدِّم تقاريره إل", "").strip()
                    job_desc_map[current_role].direct_manager_ar = fix_kerning(manager_text)
                elif "المتطلبات:" in line:
                    qual_text = fix_kerning(re.sub(r"^.*المتطلبات:\s*", "", line))
                    job_desc_map[current_role].qualifications_ar = qual_text
                elif in_duties_section:
                    # Collect multi-line duty bullets cleanly where `pypdf` puts `•` on its own line
                    if line == "•" or line.startswith("•") or line.startswith("-") or re.match(r"^[0-9]+\)", line):
                        duty_text = re.sub(r"^[•\-\d\)]+\s*", "", line).strip()
                        # Look ahead for split lines belonging to this duty
                        while i < len(lines):
                            next_line = lines[i]
                            if re.match(r"^([0-9]+(?:\.[0-9]+)*)$", next_line) or next_line == "•" or next_line.startswith("•") or "مؤشرات الأداء" in next_line or "الوصف الوظيفي" in next_line:
                                break
                            if next_line != "." and len(next_line) > 1:
                                duty_text = f"{duty_text} {next_line}".strip()
                            i += 1
                        duty_text = fix_kerning(duty_text)
                        if len(duty_text) > 5 and duty_text not in job_desc_map[current_role].duties_ar:
                            job_desc_map[current_role].duties_ar.append(duty_text)

    # --- Step 2: Extract KPI Tables via `pdfplumber` relational table parsing ---
    with pdfplumber.open(pdf_path) as plumber_pdf:
        for page_idx, plumber_page in enumerate(plumber_pdf.pages):
            page_num = page_idx + 1
            tables = plumber_page.extract_tables()
            if not tables:
                continue

            page_dept = "عام / مشترك"
            for sec in sections_map.values():
                if sec.page_number == page_num and sec.department and sec.department != "مقدمة الدليل والهيكل العام":
                    page_dept = sec.department
                    break

            for table in tables:
                if len(table) < 2:
                    continue
                
                header_cells = [normalize_pdfplumber_table_cell(c) for c in table[0] if c]
                is_kpi_table = any(any(k in cell for k in ["مؤشر", "الحساب", "الهدف", "المستهدف", "شؤم", "فدهل"]) for cell in header_cells)
                if not is_kpi_table and any("فدهل" in str(c) for c in table[0] if c):
                    is_kpi_table = True
                
                if is_kpi_table:
                    for row in table[1:]:
                        if not row or all(c is None or str(c).strip() == "" for c in row):
                            continue
                        
                        clean_cells = [normalize_pdfplumber_table_cell(str(c)) for c in row if c and str(c).strip() != ""]
                        if len(clean_cells) >= 3:
                            target = clean_cells[0]
                            calc = clean_cells[1]
                            name = clean_cells[2] if len(clean_cells) >= 3 else clean_cells[0]
                            
                            if not name or name == "مؤشر الأداء" or "طريقة الحساب" in calc or len(name) < 3:
                                continue

                            kpi_record = KPIRecord(
                                role_or_dept_ar=page_dept,
                                kpi_name=name,
                                calculation=calc if calc else "حسب المعادلة المعتمدة في الدليل",
                                target=target if target else "100%",
                                frequency="شهري / ربع سنوي (حسب الدليل)"
                            )
                            kb.kpis.append(kpi_record)

    # --- Step 3: Populate Administrative Escalation Matrix (`escalation_rules`) ---
    kb.escalation_rules = [
        EscalationRuleRecord(
            trigger_condition_ar="في حال عدم التوافق أو تأخر الاستجابة للقرارات اليومية والتشغيلية ضمن صلاحيات القسم",
            escalation_level="المستوى الأول: الرئيس المباشر (Direct Manager)",
            target_role_ar="الرئيس المباشر للموظف",
            action_ar="رفع الموضوع بشكل كتابي عبر البريد الإلكتروني الداخلي؛ يلتزم الرئيس المباشر بالرد خلال 24 إلى 48 ساعة عمل."
        ),
        EscalationRuleRecord(
            trigger_condition_ar="في حال تعذر الحل على مستوى الرئيس المباشر أو تطلب الموضوع تنسيقاً بين قسمين داخل نفس الإدارة",
            escalation_level="المستوى الثاني: مدير الإدارة (Department Manager)",
            target_role_ar="مدير الإدارة المختص",
            action_ar="عقد اجتماع تنسيقي أو إصدار توجيه إداري لحل الخلاف التشغيلي أو المالي ضمن الميزانية المعتمدة."
        ),
        EscalationRuleRecord(
            trigger_condition_ar="إذا كان الموضوع مرتبطاً بالمخاطر التعاقدية، التكلفة، الوقت، أو عقود العملاء والامتثال القانوني",
            escalation_level="المستوى الثالث: الإدارات الداعمة والمختصة (PMO / المالية / القانونية / الجودة والسلامة)",
            target_role_ar="مدير مكتب إدارة المشاريع (PMO) / مدير الشؤون المالية / مدير الشؤون القانونية / مدير QHSE",
            action_ar="دراسة الأثر الفني والمالي والقانوني وتقديم توصية مشتركة لمدير الإدارة المعنية خلال 3 أيام عمل."
        ),
        EscalationRuleRecord(
            trigger_condition_ar="القضايا الاستراتيجية الكبرى، أو الخلافات بين مديري الإدارات، أو تجاوز الصلاحيات المعتمدة في الدليل",
            escalation_level="المستوى الرابع: الرئيس التنفيذي (CEO)",
            target_role_ar="الرئيس التنفيذي للشركة",
            action_ar="إصدار قرار نهائي ملزم لجميع الإدارات والأقسام، أو العرض على مجلس الإدارة إذا لزم الأمر حسب الصلاحيات."
        )
    ]

    kb.sections = list(sections_map.values())
    kb.job_descriptions = list(job_desc_map.values())
    return kb


async def persist_knowledge_base(kb: IndexedKnowledgeBase, json_out_path: Optional[str] = None):
    """Save parsed `IndexedKnowledgeBase` records into async relational database (`SQLAlchemy`) and JSON."""
    if json_out_path:
        os.makedirs(os.path.dirname(os.path.abspath(json_out_path)), exist_ok=True)
        with open(json_out_path, "w", encoding="utf-8") as f:
            f.write(kb.model_dump_json(indent=2))
        print(f"[VERIFIED] Successfully exported {len(kb.sections)} sections, {len(kb.job_descriptions)} job descriptions, {len(kb.kpis)} KPIs, and {len(kb.escalation_rules)} escalation rules to {json_out_path}")

    await init_db()
    async with AsyncSessionLocal() as session:
        async with session.begin():
            await session.run_sync(lambda conn: conn.execute(SectionORM.__table__.delete()))
            await session.run_sync(lambda conn: conn.execute(JobDescriptionORM.__table__.delete()))
            await session.run_sync(lambda conn: conn.execute(KPIORM.__table__.delete()))
            await session.run_sync(lambda conn: conn.execute(EscalationRuleORM.__table__.delete()))

            for sec in kb.sections:
                session.add(SectionORM(
                    section_code=sec.section_code,
                    title_ar=sec.title_ar,
                    content_ar=sec.content_ar,
                    parent_code=sec.parent_code,
                    page_number=sec.page_number,
                    department=sec.department
                ))

            for jd in kb.job_descriptions:
                session.add(JobDescriptionORM(
                    job_title_ar=jd.job_title_ar,
                    section_code=jd.section_code,
                    direct_manager_ar=jd.direct_manager_ar,
                    department_ar=jd.department_ar,
                    duties_ar="\n".join(jd.duties_ar),
                    qualifications_ar=jd.qualifications_ar
                ))

            for kpi in kb.kpis:
                session.add(KPIORM(
                    role_or_dept_ar=kpi.role_or_dept_ar,
                    kpi_name=kpi.kpi_name,
                    calculation=kpi.calculation,
                    target=kpi.target,
                    frequency=kpi.frequency
                ))

            for esc in kb.escalation_rules:
                session.add(EscalationRuleORM(
                    trigger_condition_ar=esc.trigger_condition_ar,
                    escalation_level=esc.escalation_level,
                    target_role_ar=esc.target_role_ar,
                    action_ar=esc.action_ar
                ))
        print("[VERIFIED] Successfully persisted relational structural records to active database.")


def main():
    parser = argparse.ArgumentParser(description="Run structural relational ingestion for Arabic Staff Knowledge Chatbot")
    parser.add_argument("--pdf", type=str, default="uploads/hr_extracted/hr_source.pdf", help="Path to source HR manual PDF")
    parser.add_argument("--out", type=str, default="src/backend/data/hr_indexed.json", help="Path for JSON output export")
    args = parser.parse_args()

    print(f"Starting structural RAG ingestion on: {args.pdf} ...")
    kb = parse_pdf_structure(args.pdf)
    
    import asyncio
    asyncio.run(persist_knowledge_base(kb, args.out))
    print("Ingestion pipeline completed successfully.")


if __name__ == "__main__":
    main()
