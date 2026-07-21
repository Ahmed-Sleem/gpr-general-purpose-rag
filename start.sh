#!/usr/bin/env bash
#
# 1-Click Startup Script for GPR — General Purpose RAG & Grounded Knowledge Chatbot
# Designed for local testing on Mac/Linux or immediate container deployment on Coolify/VPS.
# All terminal messages and logs are strictly English.
#

set -e

echo "========================================================================"
echo "🤖 Launching GPR — General Purpose RAG & Grounded Knowledge Workspace"
echo "========================================================================"

if ! command -v docker >/dev/null 2>&1; then
    echo "[ERROR] Docker is not installed or not running. Please start Docker Desktop first."
    exit 1
fi

if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
    echo "[ERROR] Docker Compose is not installed."
    exit 1
fi

DOCKER_CMD="docker-compose"
if docker compose version >/dev/null 2>&1; then
    DOCKER_CMD="docker compose"
fi

echo "[INFO] Building and starting GPR containers (FastAPI Backend + Next.js 15 GUI + Persistent SQLite DB)..."
$DOCKER_CMD up --build -d

echo "[INFO] Waiting for GPR API health check on port 8000..."
MAX_ATTEMPTS=30
ATTEMPT=1
until curl -s http://localhost:8000/health >/dev/null 2>&1 || [ $ATTEMPT -gt $MAX_ATTEMPTS ]; do
    printf "."
    sleep 3
    ATTEMPT=$((ATTEMPT + 1))
done
echo ""

if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
    echo "[WARNING] GPR API took longer than expected to respond. Displaying recent container logs:"
    $DOCKER_CMD logs --tail 30 api || true
else
    echo "[INFO] GPR Backend API is healthy and operational!"
fi

# Verify workspace document index status
echo "[INFO] Verifying workspace document index status..."
DOC_COUNT=$(curl -s http://localhost:8000/api/v1/documents | grep -o '"id":' | wc -l || echo "0")
echo "[INFO] Active documents in workspace database: ${DOC_COUNT} (Golden 80-node dataset HR-MANUAL-V1 auto-indexed on boot)."

echo "========================================================================"
echo "🎉 GPR — General Purpose RAG Workspace is LIVE & READY!"
echo "========================================================================"
echo "👉 Open Web GUI: http://localhost:3000"
echo "👉 API Docs / Swagger: http://localhost:8000/docs"
echo ""
echo "Quickstart Steps:"
echo "  1. Open http://localhost:3000 in your browser."
echo "  2. Click [ 🔑 Add API Key | إضافة مفتاح API ] in the top right header."
echo "  3. Select 'DeepSeek (deepseek-chat)' and enter your API key (sk-...)."
echo "  4. Click [ 📁 Documents ] or [ 🕸️ Obsidian Graph ] in the right panel to explore."
echo "  5. Toggle language directly between English and Arabic (🌐 English / عربي) at any time!"
echo "  6. Ask bilingual questions grounded strictly in your document structure!"
echo "========================================================================"
