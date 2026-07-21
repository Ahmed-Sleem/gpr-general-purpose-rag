# GPR — General Purpose RAG & Grounded Knowledge Workspace

## Story-Driven Genesis

In high-growth corporate and technical environments, knowledge is scattered across dense PDFs, Word manuals, Markdown policies, and plain text notes. I noticed that when teams tried to deploy RAG (Retrieval-Augmented Generation) assistants using traditional vector databases, they consistently ran into the same walls: arbitrary token chunking shattered multi-column data tables, Arabic and English terms got confused (`PMO` vs `إدارة المشاريع`), and developers couldn't trace *why* an answer was retrieved without building cumbersome debugging tools. Better yet, users had no visual way to explore how documents and concepts connected across the workspace.

So I built **GPR — General Purpose RAG**: a universal, bilingual (`English / Arabic`) knowledge platform that rejects vector databases in favor of **structural relational RAG**. When you upload any document (`PDF`, `DOCX`, `TXT`, `MD`), GPR dynamically segments it by natural structural boundaries (`H1`, `H2`, `Table`, `List`), extracts multi-column relational data tables (`KPIs`, schedules), constructs the Table of Contents (`toc_tree`), and generates force-directed semantic links between related concepts (`chunk_connections`) inside persistent SQLite/Postgres tables (`tsvector`).

Better yet, GPR includes a high-fidelity **Obsidian Graph View** where every chunk is a node and every semantic link is an edge. As you chat with the non-thinking DeepSeek ReAct agent, the graph view **automatically pans, zooms (`centerAt`), and pulses glowing green rings around the exact chunks the AI is inspecting in real time!** With direct one-click language toggling (`🌐 English / عربي`) and dynamic client-side API key configuration right from the UI, GPR gives teams total control over their enterprise knowledge without hallucination.

---

## Key Capabilities & Architecture

| Capability | Technical Implementation | Justification & User Benefit |
|---|---|---|
| **Universal Ingestion** | `universal_pipeline.py` (`pypdf`, `pdfplumber`, `python-docx`) | Ingests `PDF`, `DOCX`, `TXT`, and `MD` without hardcoded data rules or vector embeddings. |
| **Bilingual Direct Toggle** | Instant UI Switch (`🌐 English | عربي`) + `X-App-Language` header | Flips layout (`dir="rtl" <-> dir="ltr"`), translates interface labels, and adjusts agent grounding. |
| **Obsidian Graph View** | `react-force-graph-2d` HTML5 Canvas + SSE Camera Events | Interactive force-directed mindmap. Automatically pans/zooms (`centerAt`) to active chunks as the agent searches! |
| **Persistent Multi-Doc Storage** | SQLite (`gpr_workspace.db`) or Postgres (`DATABASE_URL`) | Survives app restarts and browser refreshes until explicit deletion (`🗑️`). |
| **Dynamic API Key Management** | `ApiKeyModal.tsx` + `X-LLM-API-Key` HTTP Header | Users or admins enter custom DeepSeek/OpenAI API keys right in the GUI. Zero hardcoded production keys (`Rule 22`). |
| **2-Step Authentication** | Argon2id Password Hash + 6-Digit Email OTP (`auth.py`) | Production-grade security with 10-minute OTP expiration (`otps` table) and 24-hour server sessions. |

---

## Directory Structure

```
gpr-general-purpose-rag/
├── README.md                                # This story-driven architectural specification
├── start.sh                                 # 1-Click English startup runner (checks Docker + pre-indexes)
├── docker-compose.yml                       # Portable container stack (`gpr-api` + `gpr-web` + volume persistence)
├── .dockerignore                            # Blocks host node_modules & cache during Docker builds
├── Dockerfile                               # Root All-in-One Universal Container Build (GUI + API inside one container)
├── docker-entrypoint.sh                     # Root entrypoint (`uvicorn 8000` & `next start $PORT` with auto-indexing)
├── railway.json                             # Railway (`railway.com`) continuous delivery build configuration
├── sample_manuals/                          # Sample documents (`hr_source.pdf`) for immediate out-of-box testing
├── _working_docs/                           # Master agent governance & append-only verification logs (`Rule 29`)
├── src/
│   ├── backend/                             # FastAPI application & GPR ingestion engine (`GAP-ASKC-01` $\rightarrow$ `07`)
│   │   ├── Dockerfile                       # Python 3.11-slim API container build (`gpr-api`)
│   │   ├── main.py                          # CORS-ready server & Lifespan startup initializer
│   │   ├── requirements.txt                 # Default SQLite/relational dependencies
│   │   ├── requirements-postgres.txt        # Optional asyncpg driver for cloud PostgreSQL integration
│   │   ├── models/                          # Universal ORMs (`orm.py`), DTOs (`domain.py`), & Auth (`auth.py`)
│   │   ├── db/                              # Async engine (`session.py`) & SQL repositories (`repositories.py`)
│   │   ├── services/ingestion/              # Universal multi-format ingestion & graph builder
│   │   ├── agent/                           # ReAct agent (`react_agent.py`) & 4 structural retrieval tools
│   │   ├── api/                             # Modular endpoints (`auth.py`, `documents.py`, `chat.py`)
│   │   └── tests/                           # 16 automated integration/unit tests (`pytest`)
│   └── frontend/                            # Next.js 15 App Router Cyrkil 3-Panel GUI (`GAP-ASKC-08 & 06`)
│       ├── Dockerfile                       # Node 20 alpine multi-stage production container build (`gpr-web`)
│       ├── next.config.js                   # API rewrites proxying `/api/v1/*` (`API_INTERNAL_URL`)
│       ├── app/                             # Root layout (`layout.tsx`), grid view (`page.tsx`), & `globals.css`
│       ├── components/                      # `Header.tsx`, `ChatPanel.tsx`, `ObsidianGraphView.tsx`, `FilesView.tsx`
│       └── context/                         # Global state & bilingual i18n (`AppContext.tsx`)
```

---

## Continuous Deployment on Railway (`https://railway.com`)

Railway natively hosts Docker applications directly from GitHub (`Push to GitHub -> Automatic Build -> Live in Production with free SSL`). Whenever code is pushed to our `main` branch on GitHub, Railway automatically detects the commit and rebuilds your container live with zero downtime:

### Option 1: Deploy All-in-One Universal Container (Recommended — 1 Single Free Service!)
By deploying our **Root Dockerfile (`./Dockerfile`)**, Railway hosts both the FastAPI backend and the Next.js 15 Cyrkil GUI together inside one single service (`railway.json` automatically configures this):
1. Log into your **Railway Dashboard** ([https://railway.com](https://railway.com)).
2. Click **New Project** $\rightarrow$ select **Deploy from GitHub repo**.
3. Select and connect repository: **`Ahmed-Sleem/gpr-general-purpose-rag`**.
4. Railway reads `railway.json` from root and automatically builds our Root `Dockerfile` (`~3 minutes`).
5. Under **Settings** $\rightarrow$ **Networking**, click **Generate Domain** (`e.g. https://gpr-general-purpose-rag.up.railway.app`).
   - Open your domain in your browser: the GUI loads immediately, and all `/api/v1/*` backend requests proxy right inside the container (`127.0.0.1:8000`) without CORS configuration!
   - *Optional Cloud PostgreSQL:* In your Railway project, click **`New`** $\rightarrow$ **`Database`** $\rightarrow$ **`Add PostgreSQL`**. Railway automatically injects `DATABASE_URL` into your service, and our engine automatically connects and initializes cloud Postgres!

### Option 2: Deploy Two Separate Microservices (`gpr-api` & `gpr-web`) on Railway
If you prefer separating your backend API and frontend into distinct Railway services:
1. **Create Backend API Service (`gpr-api`)**:
   - In Railway, click **New** $\rightarrow$ **GitHub Repo** $\rightarrow$ select `Ahmed-Sleem/gpr-general-purpose-rag`.
   - Under Settings $\rightarrow$ Build $\rightarrow$ **Dockerfile Path**, enter: **`./src/backend/Dockerfile`**.
   - Generate domain (`e.g. https://gpr-api.up.railway.app`).
2. **Create Next.js 15 GUI Service (`gpr-web`)**:
   - In the same project, click **New** $\rightarrow$ **GitHub Repo** $\rightarrow$ select `Ahmed-Sleem/gpr-general-purpose-rag`.
   - Under Settings $\rightarrow$ Build $\rightarrow$ **Dockerfile Path**, enter: **`./src/frontend/Dockerfile`**.
   - Under Variables, add `NEXT_PUBLIC_API_URL` and `API_INTERNAL_URL` pointing to `https://gpr-api.up.railway.app`.
   - Generate domain. Your frontend is live!

### Step 3: Automated Collaborative Loop
From now on, whenever you request a feature or adjustment, I will push code directly to `main` on GitHub (`Ahmed-Sleem/gpr-general-purpose-rag`). Railway automatically detects the push, hot-swaps your container, and updates your live URL!

---

## Continuous Deployment on Back4App Containers (`https://containers.back4app.com/`)

If deploying to Back4App Containers:
1. Click **New App** $\rightarrow$ select **Containers as a Service**.
2. Connect and select repository: **`Ahmed-Sleem/gpr-general-purpose-rag`**.
3. Select branch: **`main`** and leave Dockerfile Path as **`./Dockerfile`** (All-in-One Root build).
4. Enable **Auto-Deploy** and click **Deploy App**. Back4App assigns your live URL and serves GPR smoothly!

---

## Local Sandboxed Execution & Docker Quickstart

### Option A: Launch with Docker Compose (Recommended)
Our root `start.sh` runner executes everything cleanly in English:
```bash
chmod +x start.sh
./start.sh
```
1. Builds `gpr-api` (`http://localhost:8000`) and `gpr-web` (`http://localhost:3000`).
2. Automatically pre-indexes `sample_manuals/hr_source.pdf` into `data/gpr_workspace.db` so `503 sections, 220 KPIs` are immediately available.
3. Open **`http://localhost:3000`**, click **`[ 🔑 Add API Key ]`**, enter your DeepSeek API key (`sk-...`), and start querying or exploring the Obsidian Graph View!

### Option B: Local Sandboxed Execution (Mac / Linux)
```bash
# 1. Run automated backend verification suite
cd src/backend
PYTHONPATH=. pytest -v tests/

# 2. Start FastAPI Backend Server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 3. In a separate terminal, start Next.js 15 Cyrkil GUI
cd src/frontend
npm run dev
```

---

## Copyright & Intellectual Property

**All Rights Reserved © 2026.**

All rights reserved. No part of this software, including the universal structural RAG ingestion engine (`universal_pipeline.py`), the bilingual Arabic/English normalization algorithms (`normalizer.py`), the force-directed Obsidian Graph View architecture (`ObsidianGraphView.tsx`), or the relational data models (`models/orm.py`), may be reproduced, distributed, copied, modified, or transmitted in any form or by any means—electronic, mechanical, photocopying, recording, or otherwise—without the prior written permission of the copyright owner. Unauthorized use, reverse engineering, or redistribution of any portion of this system is strictly prohibited under international copyright and intellectual property laws.
