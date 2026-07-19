# Next Sessions Roadmap

**Architectural Guide for Future Sessions per Rule 29 Context Recovery Protocol.**
Read this file on every session start or context reset.

---

## Current Architecture & Project Status

### The Project: Cyrkil Universal Knowledge Workspace & Arabic/English Staff Chatbot
- **Goal:** Build an enterprise-grade, bilingual (`AR / EN`) internal knowledge platform and chatbot for Kayan Al-Mamlaka Company (`شركة كيان المملكة كاك`) and Cyrkil customers.
- **System Architecture:**
  1. **Relational RAG Backend (`src/backend/`):** FastAPI + Async SQLAlchemy (`models/orm.py`, `db/repositories.py`). Ingests multi-format documents (`PDF`, `DOCX`, `TXT`, `MD`) cleanly without vector DB embeddings. Extracts structural hierarchy (`toc_tree_json`), multi-column tables (`document_tables`), and Obsidian Graph force-directed links (`chunk_connections`). Persistent storage (`data/knowledge_workspace.db`) survives restarts until explicit user deletion.
  2. **Streaming ReAct Agent (`src/backend/agent/react_agent.py`):** DeepSeek ReAct agent with 4 universal tools (`search_chunks`, `get_table`, `get_chunk_relations`, `get_document_toc`). Emits live SSE camera events (`agent_search` / `active_node_ids`) before token generation and enforces strict AR/EN inline citations (`[المصدر: القسم X.Y]`).
  3. **Next.js 15 Cyrkil 3-Panel GUI (`src/frontend/`):** Bilingual RTL/LTR layout, horizontal drag-resizers (`resize-handle`), active conversation stack, interactive `CitationDrawer`, and Data Panel Dual-View Toggle (`[ 📁 Files | 🕸️ Obsidian Graph ]`). The Obsidian Graph (`react-force-graph-2d` Canvas) automatically pans/zooms (`centerAt`) to active chunks during agent retrieval, glowing active nodes with Cyrkil green (`#9BE36B`). Includes `[ 🔑 Add API Key ]` settings modal persisting custom DeepSeek/OpenAI keys to `localStorage`.
  4. **2-Step Authentication (`src/backend/api/auth.py`):** Argon2id password verification + 6-digit email OTP valid for 10 minutes (`otps` table) + server-side session tokens (`GET /api/v1/auth/me`).
  5. **Portable 1-Click Deployment:** `docker-compose.yml`, `src/backend/Dockerfile`, and `src/frontend/Dockerfile`.

- **Phases Completed:** Phase 1 (Requirements), Phase 2 (11 Topic Deep-Dives), Phase 3 (Universal Backend Ingestion, DB Schema & Streaming API), & Phase 4 (Next.js 15 Cyrkil GUI, Obsidian Graph View & 2-Step Auth). All implementation gaps (`GAP-ASKC-01` $\rightarrow$ `GAP-ASKC-08`) are **100% CLOSED AND VERIFIED**.

---

## Next Steps for User Acceptance & Future Feature Additions

1. **User Acceptance Testing (Live / Docker Bundle):**
   - Launch stack via `docker-compose up --build -d` on local Mac bundle or deploy to VPS.
   - Test custom DeepSeek API key insertion in GUI modal (`🔑 Add API Key`).
   - Upload `hr_source.pdf` or custom corporate policies and observe live force-directed node-link network rendering (`Obsidian Graph View`).
   - Submit bilingual queries (`من المسؤول عن متابعة حوادث السلامة...` vs `Who does the PMO Manager report to...`) and observe real-time graph camera panning (`centerAt`) and clickable citation drawers.

2. **Future Enhancements (When Requested):**
   - Live email service wire-up (Resend / Postfix API for production OTP dispatch).
   - Multi-user RBAC role scoping (restricting specific document access to `admin` vs `staff` groups).
