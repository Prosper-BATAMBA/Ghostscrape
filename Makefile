# GhostScrape - Makefile
# Target: Python 3.12
# Override PYTHON on Windows if python3.12 is not on PATH:
#   mingw32-make PYTHON=python install-backend

PYTHON ?= python3.12
PIP = backend\\venv\\Scripts\\pip
UVICORN = backend\\venv\\Scripts\\uvicorn

.PHONY: install-backend install-frontend dev-backend dev-frontend build-frontend clean help

help:
	@echo "GhostScrape - Visual Web Scraping Platform"
	@echo "Requires: Python 3.12  |  Node.js 18+"
	@echo ""
	@echo "Commands:"
	@echo "  install-backend     Create venv + pip install"
	@echo "  install-frontend    npm install"
	@echo "  dev-backend         Start FastAPI (localhost:8000)"
	@echo "  dev-frontend        Start Vite (localhost:3000)"
	@echo "  build-frontend      npm run build (production)"
	@echo "  clean               Remove generated files"
	@echo ""
	@echo "Tip: On Windows, use: mingw32-make PYTHON=py -3.12 install-backend"

install-backend:
	$(PYTHON) -m venv --clear backend\\venv
	$(PIP) install --upgrade pip setuptools wheel
	$(PIP) install -r backend\\requirements.txt

install-frontend:
	cd frontend && npm install

dev-backend:
	$(UVICORN) app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

build-frontend:
	cd frontend && npm run build

clean:
	rm -rf backend\\venv frontend\\node_modules frontend\\dist
	rm -rf backend\\app\\__pycache__ backend\\app\\api\\__pycache__
