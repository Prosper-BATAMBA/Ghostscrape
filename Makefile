# GhostScrape - Makefile cross-platform
# Usage:
#   make install          Tout installer (backend + frontend)
#   make dev-backend      Lancer le backend (terminal 1)
#   make dev-frontend     Lancer le frontend (terminal 2)
#   make help             Afficher l'aide
#
# Windows (mingw32-make) :
#   mingw32-make PYTHON="py -3.12" install

ifeq ($(OS),Windows_NT)
    PYTHON ?= py -3.12
    VENV_BIN = backend\\venv\\Scripts
    PIP = $(VENV_BIN)\\pip
    UVICORN = $(VENV_BIN)\\uvicorn
    NPM = npm.cmd
    RM = rmdir /s /q
else
    PYTHON ?= python3.12
    VENV_BIN = backend/venv/bin
    PIP = $(VENV_BIN)/pip
    UVICORN = $(VENV_BIN)/uvicorn
    NPM = npm
    RM = rm -rf
endif

.PHONY: help install install-backend install-frontend dev-backend dev-frontend build-frontend clean

help:
	@echo "GhostScrape - Visual Web Scraping Platform"
	@echo ""
	@echo "Commands:"
	@echo "  make install            Install everything (backend + frontend)"
	@echo "  make install-backend    Create venv + pip install + playwright browsers"
	@echo "  make install-frontend   npm install"
	@echo "  make dev-backend        Start FastAPI (localhost:8000)"
	@echo "  make dev-frontend       Start Vite dev server (localhost:3000)"
	@echo "  make build-frontend     npm run build (production)"
	@echo "  make clean              Remove generated files"
	@echo ""
	@echo "Windows: mingw32-make PYTHON=\"py -3.12\" install"

install: install-backend install-frontend

install-backend:
	$(PYTHON) -m venv --clear backend/venv
	$(PIP) install --upgrade pip setuptools wheel
	$(PIP) install -r backend/requirements.txt
	$(PYTHON) -m playwright install chromium

install-frontend:
	cd frontend && $(NPM) install

dev-backend:
	cd backend && $(UVICORN) app.main:app --reload --port 8000 --log-level info

dev-frontend:
	cd frontend && $(NPM) run dev

build-frontend:
	cd frontend && $(NPM) run build

clean:
	$(RM) backend\\venv 2>nul || true
	$(RM) backend/venv 2>/dev/null || true
	$(RM) frontend\\node_modules 2>nul || true
	$(RM) frontend/node_modules 2>/dev/null || true
	$(RM) frontend\\dist 2>nul || true
	$(RM) frontend/dist 2>/dev/null || true
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
