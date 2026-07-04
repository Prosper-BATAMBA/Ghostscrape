#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
    echo ""
    echo "Arret des serveurs..."
    kill "$BACKEND_PID" 2>/dev/null || true
    kill "$FRONTEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
    echo "  Arrete."
    exit 0
}
trap cleanup SIGINT SIGTERM

# Verification
if [[ ! -f "$ROOT_DIR/backend/venv/bin/uvicorn" ]]; then
    echo "  [FAIL] Backend non installe. Lancez d'abord : ./setup.sh"
    exit 1
fi
if [[ ! -d "$ROOT_DIR/frontend/node_modules" ]]; then
    echo "  [FAIL] Frontend non installe. Lancez d'abord : ./setup.sh"
    exit 1
fi

clear
echo "========================================"
echo "     GhostScrape - Developpement"
echo "========================================"
echo ""
echo "Demarrage des serveurs..."
echo "    Backend  -> http://localhost:8000"
echo "    Frontend -> http://localhost:3000"
echo "    Dashboard -> http://localhost:3000"
echo ""
echo "    Appuyez sur Ctrl+C pour tout arreter"
echo ""

# Backend
cd "$ROOT_DIR/backend"
"$ROOT_DIR/backend/venv/bin/uvicorn" app.main:app --reload --port 8000 --log-level info &
BACKEND_PID=$!

# Frontend
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

# Attendre les deux processus
wait
