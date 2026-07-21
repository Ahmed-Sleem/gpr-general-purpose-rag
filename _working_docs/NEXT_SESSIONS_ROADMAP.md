# Next Sessions Roadmap

**Architectural Guide for Future Sessions per Rule 29 Context Recovery Protocol.**
Read this file on every session start or context reset.

---

## Current Architecture & Project Status

### The Project: GPR — General Purpose RAG & Grounded Knowledge Workspace
- **Goal:** Build an enterprise-grade, bilingual (`AR / EN`) internal knowledge platform and chatbot for Kayan Al-Mamlaka Company (`شركة كيان المملكة كاك`) and Cyrkil customers.
- **System Architecture:**
  1. **Relational RAG Backend (`src/backend/`):** FastAPI + Async SQLAlchemy (`models/orm.py`, `db/repositories.py`). Ingests multi-format documents (`PDF`, `DOCX`, `TXT`, `MD`) cleanly without vector DB embeddings. Extracts full complete self-contained semantic units (~250-450 words each) via `llm_semantic_analyzer.py` calling Groq/DeepSeek dynamically or high-fidelity pre-indexer (`parse_hr_pdf.py`). Persistent storage (`data/gpr_workspace.db`) survives restarts until explicit user deletion.
  2. **Streaming ReAct Agent (`src/backend/agent/react_agent.py`):** ReAct agent across Groq/DeepSeek/OpenAI with 4 universal tools (`search_chunks`, `get_table`, `get_chunk_relations`, `get_document_toc`). Emits live SSE camera events (`agent_search` / `active_node_ids`) before token generation and enforces strict AR/EN inline citations (`[المصدر: القسم X.Y]`).
  3. **Next.js 15 Cyrkil 3-Panel GUI (`src/frontend/`):** Monochrome Black & White liquid frosted glass aesthetic (`#020202` / `#FFFFFF` with `backdrop-filter: blur(24px)`), orbital atom favicon (`favicon.svg`) and header logo (`Header.tsx`), active conversation stack, full-panel drag-and-drop file overlay (`FilesView.tsx`), API Key guard (`NoApiKeyModal`), live cancelable analysis progress card (`AbortController`), and preloaded high-speed `ObsidianGraphView.tsx` (`warmupTicks={80}`, `cooldownTicks={40}`).
  4. **Dynamic API Key & Provider Modal (`ApiKeyModal.tsx` & `auth.py check-api`):** Staff select provider (`DeepSeek`, `Groq`, `OpenAI Compatible`) and model (`llama-3.3-70b-versatile`, `deepseek-chat`), input `sk-...` / `gsk_...`, and test connection with **`[ ⚡ Test API Connection ]` check button**.
  5. **Continuous Deployment (`Railway` & `VPS`):** Root `Dockerfile` (Universal All-in-One build), `docker-entrypoint.sh`, `docker-compose.yml`, `start.sh`, `.dockerignore`, `.gitignore`.

- **Phases Completed:** Phase 1 (Requirements), Phase 2 (11 Topic Deep-Dives), Phase 3 (Universal Backend Ingestion, DB Schema & Streaming API), & Phase 4 (Next.js 15 Cyrkil GUI, Obsidian Graph View & 2-Step Auth). All implementation gaps (`GAP-ASKC-01` $\rightarrow$ `GAP-ASKC-13`) are **100% CLOSED AND VERIFIED**.

---

## Next Steps for User Acceptance & Future Feature Additions

1. **User Acceptance Testing (Live Railway / Docker Bundle):**
   - Connect `Ahmed-Sleem/gpr-general-purpose-rag` on Railway (`railway.com`) or launch via `./start.sh`.
   - Open GUI, click `[ 🔑 Add API Key ]`, select Groq/DeepSeek, and click `[ ⚡ Test API Connection ]`.
   - Drag and drop any corporate policy or PDF over the panel to test full-panel frosted overlay and cancelable analysis drawer.
   - Switch to `[ 🕸️ Obsidian Graph ]` and observe instant preloading across nodes and links.
   - Submit bilingual queries and observe real-time camera panning (`centerAt`).

2. **Future Enhancements (When Requested):**
   - Live email service wire-up (Resend / Postfix API for production OTP dispatch).
   - Multi-user RBAC role scoping (restricting specific document access to `admin` vs `staff` groups).
