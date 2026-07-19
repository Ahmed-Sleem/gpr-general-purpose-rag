# Changelog

**Append-only session log per Rule 5. Format: `## YYYY-MM-DD session N`**

---

## 2026-07-10 session 1 (Historical Setup - Phase 1 & 2)
- Read PRD (`PRD_ Arabic Staff Knowledge Chatbot.pdf`), Cyrkil design system (`DESIGN_SYSTEM.md`), and general development rules.
- Renamed and extracted source HR organizational manual (`uploads/hr_extracted/hr_source.pdf`).
- Completed Phase 2 deep-dive research across 11 architectural topics (`research/01` $\rightarrow$ `11`).
- Created consolidated `IMPLEMENTATION_PLAN.md` and `PROJECT_MAP.md` under `_development_docs_REMOVE_BEFORE_DEPLOYMENT/`.

---

## 2026-07-19 session 2 (Workspace Recovery & Agent Rules Governance Lock)
- Recovered extracted project structure (`workspace-019f77a8-9fbc-70cb-a35c-b6d5442a6015.zip`).
- Read and analyzed `uploads/AGENT_RULES copy 2.md` containing Ahmed's 29 mandatory standing instructions, standing context, and repository/storytelling requirements.
- Created `_working_docs/AGENT_RULES.md` containing all 29 original rules plus Rule 30 (Workspace Architecture & Document Governance), ensuring seamless integration between general project docs and mandatory AI workflow docs.
- Initialized `_working_docs/AUDIT_AND_TODO.md` with active gaps for Phase 3/4 execution (`GAP-ASKC-01` $\rightarrow$ `GAP-ASKC-05`).
- Initialized `_working_docs/IMPLEMENTATION_LOG.md`, `CHANGELOG.md`, and `NEXT_SESSIONS_ROADMAP.md` to guarantee 100% adherence to Rule 29 context recovery protocol.
- Inspected and analyzed `uploads/improved_rag_gui (16).html` via BeautifulSoup/regex and presented the interactive sketch to Ahmed using `present_file`.
- Locked the exact UI/UX patterns from the sketch (3-panel resizable layout, knowledge base scope cards with Cyrkil green `1px solid rgba(155,227,107,.55)` outlines, RTL typography, and theme toggling) into `GAP-ASKC-04` (`_working_docs/AUDIT_AND_TODO.md`) and recorded closure of `GAP-INIT-03`.

---

## 2026-07-19 session 3 (GitHub Genesis Repository Creation & `GAP-ASKC-01` Ingestion Execution)
- Verified GitHub PAT and created repository `https://github.com/Ahmed-Sleem/arabic-staff-knowledge-chatbot.git` using GitHub REST API via curl (`GAP-INIT-04`).
- Initialized git repository at root, wrote story-driven `README.md` per **Ahmed's Repository Creation & Storytelling Style (Mandatory Rule)**, configured `.gitignore`, and pushed initial project state to `origin/main` (`commit 257dbb9`).
- Updated `_working_docs/AUDIT_AND_TODO.md` (`GAP-ASKC-06`) to formally add the requirement: **LLM API Key Settings UI** (allowing staff/admins to save custom DeepSeek/OpenAI API keys in the GUI and transmit via `X-LLM-API-Key` headers).
- Scaffolded `src/backend/` structure (`models.py`, `database.py`, `ingestion/parse_hr_pdf.py`, `tests/test_ingestion.py`).
- Implemented `parse_hr_pdf.py` with custom text normalizers (`fix_kerning` + `normalize_pdfplumber_table_cell`) handling Arabic font kerning and reversing RTL visual ordering while preserving formulas and English acronyms (`TRIR`, `PMO`).
- Executed ingestion against `hr_source.pdf`: extracted and persisted `503 sections, 58 job descriptions, 220 KPIs, and 4 escalation rules` to relational database and `data/hr_indexed.json`.
- Verified `GAP-ASKC-01` closure via 100% green automated pytest suite (`4 passed in 17.78s`).
