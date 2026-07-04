#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================"
echo "       GhostScrape - Setup (Unix)"
echo "========================================"

# --------------- Python ---------------
echo ""
echo "--- Verification des prerequis ---"

PYTHON=""
for cmd in python3.12 python3.11 python3 python; do
    if command -v "$cmd" &>/dev/null; then
        version="$("$cmd" --version 2>&1 | grep -oP '\d+\.\d+')"
        major="${version%.*}"
        minor="${version#*.}"
        if [[ "$major" -ge 3 && "$minor" -ge 12 ]]; then
            PYTHON="$cmd"
            echo "  [OK]  Python $version ($cmd)"
            break
        fi
    fi
done

if [[ -z "$PYTHON" ]]; then
    echo "  [FAIL] Python 3.12+ introuvable"
    echo "  Installez Python 3.12 :"
    echo "    brew install python@3.12           (macOS)"
    echo "    sudo apt install python3.12         (Debian/Ubuntu)"
    echo "    sudo dnf install python3.12         (Fedora)"
    exit 1
fi

# --------------- Backend ---------------
echo ""
echo "--- Installation du backend ---"

VENV_DIR="$ROOT_DIR/backend/venv"
if [[ ! -f "$VENV_DIR/bin/python" ]]; then
    echo "  -> Creation du venv..."
    "$PYTHON" -m venv --clear "$VENV_DIR"
    echo "  [OK]  Environnement virtuel cree"
else
    echo "  [OK]  Environnement virtuel existant"
fi

echo "  -> Installation des dependances..."
"$VENV_DIR/bin/pip" install --quiet --upgrade pip setuptools wheel
"$VENV_DIR/bin/pip" install --quiet -r "$ROOT_DIR/backend/requirements.txt"
echo "  [OK]  Dependances backend installees"

echo "  -> Installation de Playwright Chromium..."
"$VENV_DIR/bin/python" -m playwright install chromium
echo "  [OK]  Playwright Chromium installe"

# --------------- Frontend ---------------
echo ""
echo "--- Installation du frontend ---"

if [[ -d "$ROOT_DIR/frontend/node_modules" ]]; then
    echo "  [OK]  node_modules existant"
else
    echo "  -> npm install..."
    cd "$ROOT_DIR/frontend"
    npm install --silent
    echo "  [OK]  Dependances frontend installees"
fi

# --------------- Extension ---------------
echo ""
echo "--- Extension Chrome ---"

if [[ -f "$ROOT_DIR/extension/manifest.json" ]]; then
    echo "  [OK]  Extension trouvee dans extension/"
else
    echo "  [FAIL] extension/manifest.json introuvable"
    exit 1
fi

# --------------- Resume ---------------
echo ""
echo "========================================"
echo "           Resume du setup"
echo "========================================"
echo ""
echo "  Tout est pret !"
echo ""
echo "  Prochaines etapes :"
echo "  1. Lancez les serveurs :  ./run.sh"
echo "  2. Ouvrez Chrome -> chrome://extensions"
echo "  3. Activez le Mode developpeur"
echo "  4. Chargez l'extension non empaquetee depuis :"
echo "     $ROOT_DIR/extension"
echo "  5. Ouvrez http://localhost:3000"
echo ""
