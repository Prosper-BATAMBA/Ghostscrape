# GhostScrape — Scraping web visuel, local & gratuit

**GhostScrape** est une plateforme de web scraping 100% locale qui permet d'extraire le contenu d'une page web (titres, images, liens, tableaux, métadonnées, sélecteurs CSS personnalisés) en temps réel, sans écrire une ligne de code.

| Composant | Technologie | Version |
|---|---|---|
| Extension Chrome | Manifest V3 | 0.3.0 |
| Backend | Python / FastAPI | 0.3.0 |
| Dashboard | React 18 + Vite 5 + Tailwind 3 | 0.1.0 |

---

## Table des matières

- [Aperçu](#aperçu)
- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Installation](#installation)
  - [1. Backend (Python/FastAPI)](#1-backend-pythonfastapi)
  - [2. Frontend (React/Vite)](#2-frontend-reactvite)
  - [3. Extension Chrome](#3-extension-chrome)
  - [4. Makefile (optionnel)](#4-makefile-optionnel)
- [Utilisation](#utilisation)
- [Structure du projet](#structure-du-projet)
- [Tests](#tests)
- [Documentation](#documentation)
- [Licence](#licence)

---

## Aperçu

Le scraping web est dominé par deux approches : les solutions **programmatiques** (BeautifulSoup, Scrapy, Puppeteer) qui exigent des compétences en développement, et les solutions **SaaS** (Octoparse, ParseHub, Apify) qui sont payantes, hébergent les données chez un tiers et limitent les volumes.

**GhostScrape résout ce problème :**

- Gratuit et open source
- 100% local — aucune donnée ne quitte votre machine
- Aucune compétence technique requise — interface visuelle
- Extraction en temps réel via WebSocket
- Export CSV et ZIP en un clic

---

## Fonctionnalités

### 🔍 4 modes d'extraction

| Mode | Description |
|---|---|
| **FullPage** | Extrait tous les éléments de la page (images, titres, liens, paragraphes, listes) |
| **DataTypes** | Filtre par type de données : images, tableaux, métadonnées, données structurées |
| **CssSelector** | Sélecteurs CSS personnalisés saisis librement |
| **HistoryView** | Historique des sessions d'extraction avec reprise possible |

### ⚡ Temps réel

- L'extension injecte un content script au `document_idle`
- Les données sont relayées via WebSocket (backend FastAPI)
- Le dashboard React met à jour l'interface instantanément

### 📦 Export

- **CSV** — données tabulaires (liens, tableaux, sélecteurs CSS)
- **ZIP** — lots d'images avec métadonnées JSON, pages complètes HTML
- Génération 100% client (JSZip dans le navigateur)

---

## Architecture

```
┌──────────────────────────┐       ┌──────────────────────────┐
│   Extension Chrome MV3   │       │   Dashboard React        │
│                          │       │   Vite :3000             │
│  content.js ──port──►    │       │                          │
│  background.js           │       │  WebSocket ◄────────────┐│
│       │                  │       │  JSZip / export         ││
│  offscreen.js (WS) ──────├───────┼────────────────────────┘│
└──────────────────────────┘       └──────────────────────────┘
         │                                    │
         └────────── WebSocket ───────────────┘
                          │
               ┌──────────▼──────────────────────┐
               │  Backend FastAPI :8000           │
               │                                  │
               │  ┌─ WebSocket relay ─────────┐   │
               │  │  /ws/extension            │   │
               │  │  /ws/dashboard            │   │
               │  └───────────────────────────┘   │
               │                                  │
               │  ┌─ Scraping statique (httpx) ─┐ │
               │  │  GET /scrape/html           │ │
               │  │  GET /scrape/selectors      │ │
               │  └─────────────────────────────┘ │
               │                                  │
               │  ┌─ Scraping JS (Playwright) ──┐ │
               │  │  POST /scrape/playwright    │ │
               │  │  (stealth + profile + proxy)│ │
               │  └─────────────────────────────┘ │
               │                                  │
               │  /health                         │
               └──────────────────────────────────┘
```

### Flux de données

#### Scraping via extension (mode normal)
1. L'utilisateur navigue sur une page web dans Chrome
2. Le content script (`content.js`) est injecté automatiquement
3. Le dashboard React envoie une commande d'extraction (mode + paramètres)
4. Le backend relaie la commande à l'extension via WebSocket
5. L'extension exécute l'extraction dans la page et renvoie les résultats
6. Le dashboard affiche les résultats et permet l'export (CSV/ZIP)

#### Scraping via backend (fallback anti-blocage)
Quand l'extension est bloquée (CSP, Cloudflare, bot detection) :
1. Le dashboard envoie une requête HTTP au backend
2. Le backend choisit le moteur adapté :
   - **httpx+BS4** pour les pages statiques (rotation UA, retry ×3, proxy)
   - **Playwright+stealth** pour les pages JS (profil aléatoire, proxy pool, auto-scroll)
3. Le backend détecte les pages bloquées, réessaie avec backoff et retourne les résultats

---

## Stack technique

### Extension Chrome

| Technologie | Rôle |
|---|---|
| Manifest V3 | Service worker + offscreen document (WebSocket stable) |
| `content.js` | Injection DOM, 8 extracteurs (images, titres, liens, paragraphes, listes, tableaux, métadonnées, données structurées) |
| `offscreen.js` | Propriétaire unique de la connexion WebSocket |

### Backend

| Dépendance | Version | Rôle |
|---|---|---|
| Python | 3.12 | — |
| FastAPI | 0.115.6 | Framework API |
| Uvicorn | 0.34.0 | Serveur ASGI |
| Pydantic | 2.10.4 | Validation |
| httpx | 0.28.1 | Client HTTP (scraping statique) |
| orjson | 3.10.12 | JSON rapide |
| beautifulsoup4 | 4.12.3 | Parsing HTML (scraping statique) |
| lxml | 5.3.0 | Parseur XML/HTML |
| playwright | 1.49.1 | Chromium headless (scraping JS) |
| playwright-stealth | 1.0.6 | Anti-détection (23 evasions) |

Le backend embarque **2 moteurs de scraping** :
- **httpx + BeautifulSoup** — pages statiques, rapide, rotation UA, retry ×3, proxy
- **Playwright + stealth** — pages JS, profil navigateur aléatoire, proxy pool, auto-scroll

### Dashboard

| Dépendance | Version |
|---|---|
| React | 18.3.1 |
| Vite | 5.4.11 |
| Tailwind CSS | 3.4.17 |
| Vitest | 4.1.9 |
| JSZip | 3.10.1 |

---

## Prérequis

- **Chrome** ou **Edge** (pour l'extension)
- **Docker** (recommandé — évite les problèmes de versions Python/Node.js)
  - Windows : Docker Desktop (WSL2 backend recommandé)
  - macOS : Docker Desktop ou OrbStack
  - Linux : Docker Engine + docker compose plugin
- **Node.js 18+** (uniquement si vous installez sans Docker)
- **Python 3.12.x** (uniquement si vous installez sans Docker)
- **Make** optionnel — `make` (Linux/macOS) ou `mingw32-make` (Windows)

---

## Installation

### Option Docker (recommandé — multiplateforme)

**Sans Node.js installé :**
```bash
# 1. Builder le frontend (une seule fois)
docker compose run frontend-builder

# 2. Lancer tous les services
docker compose up -d
```

**Avec Node.js installé :**
```bash
# 1. Builder le frontend manuellement
cd frontend && npm install && npm run build

# 2. Lancer tous les services
docker compose up -d --build
```

Le dashboard est accessible sur `http://localhost:3000`.
Le backend est accessible sur `http://localhost:8000`.

**Étapes suivantes (quel que soit le mode) :**
1. Charger l'extension dans Chrome : `chrome://extensions` → Mode développeur → Charger extension non empaquetée → dossier `extension/`
2. Ouvrir `http://localhost:3000` dans Chrome

### Option rapide — Scripts automatisés

**Windows (PowerShell uniquement) :**
```powershell
.\setup.ps1      # Vérifie Python 3.12 + Node 18+, installe tout
.\start-dev.ps1  # Lance backend + frontend en parallèle
```

**Linux / macOS :**
```bash
chmod +x setup.sh run.sh
./setup.sh       # Vérifie Python 3.12, crée le venv, installe tout
./run.sh         # Lance backend + frontend en parallèle
```

Puis chargez l'extension dans Chrome → [étape 3](#3-extension-chrome).

### Option manuelle

> **Windows :** utilisez impérativement **PowerShell** (pas CMD, pas Git Bash).  
> **Linux / macOS :** utilisez bash ou zsh standard.

### 1. Backend (Python/FastAPI)

```powershell
# Créer l'environnement virtuel
python3.12 -m venv backend\venv

# Installer les dépendances (sans activation)
.\backend\venv\Scripts\pip install --upgrade pip setuptools wheel
.\backend\venv\Scripts\pip install -r backend\requirements.txt

# Lancer le serveur (rester à la racine du projet)
.\backend\venv\Scripts\uvicorn app.main:app --reload --port 8000
```

Le backend est accessible sur `http://localhost:8000`.
- WebSocket extension : `ws://localhost:8000/ws/extension`
- WebSocket dashboard : `ws://localhost:8000/ws/dashboard`
- Health check : `GET http://localhost:8000/health`

### 2. Frontend (React/Vite)

```powershell
cd frontend
npm install
npm run dev
```

Le frontend est accessible sur `http://localhost:3000`

Le proxy Vite redirige `/api/*` vers `http://localhost:8000`.

### 3. Extension Chrome

1. Ouvrir Chrome et naviguer vers `chrome://extensions`
2. Activer le **Mode développeur** (coin supérieur droit)
3. Cliquer sur **Charger l'extension non empaquetée**
4. Sélectionner le dossier `extension/` du projet
5. L'icône GhostScrape apparaît dans la barre d'outils

> **Popups et onglets locaux :** l'extension peut nécessiter l'activation des permissions sur les pages `chrome://extensions` ou `localhost` depuis `chrome://extensions/?ignore=localhost` selon la configuration.

### 4. Makefile (optionnel — cross-platform)

```bash
# Voir les commandes disponibles
make help                      # Linux/macOS
mingw32-make help              # Windows

# Installer tout
make install                   # Linux/macOS
mingw32-make PYTHON="py -3.12" install  # Windows

# Lancer les serveurs (terminal 1 : backend, terminal 2 : frontend)
make dev-backend               # Linux/macOS
make dev-frontend              # Linux/macOS
```

---

## Dépannage

### Docker Desktop — overlayfs / read-only file system (Windows)

Si le build Docker échoue avec `read-only file system` :
```powershell
# 1. Nettoyer le cache Docker
docker system prune -a

# 2. Redémarrer Docker Desktop (icône tray → Restart)

# 3. Rebuilder
docker compose build --no-cache backend
```

### Docker ne répond pas (timeout sur `docker ps`)

Docker Desktop est probablement arrêté :
1. Lancez Docker Desktop manuellement depuis le menu Démarrer
2. Attendez que l'icône soit stable (pas d'animation)
3. Relancez la commande

### Backend — CMD python3 au lieu de uvicorn

Si le conteneur backend crash avec `python3: can't open file '...main.py'` :
```powershell
# Reconstruire l'image avec le bon CMD
docker compose build --no-cache backend
docker compose up -d
```

---

## Utilisation

1. **Lancer le backend** : `.\backend\venv\Scripts\uvicorn app.main:app --reload --port 8000` (PowerShell, depuis la racine)
2. **Lancer le frontend** : `cd frontend && npm run dev`
3. **Charger l'extension** dans Chrome via `chrome://extensions`
4. **Ouvrir le dashboard** : `http://localhost:3000`
5. **Naviguer** sur n'importe quelle page web
6. **Choisir un mode** dans la sidebar (FullPage, DataTypes, CssSelector)
7. **Lancer l'extraction** → les résultats apparaissent en temps réel
8. **Exporter** en CSV ou ZIP

---

## Structure du projet

```
GhostScrape/
├── backend/                  # API Python / FastAPI
│   ├── app/
│   │   ├── main.py           # Point d'entrée FastAPI (CORS, /health, WS)
│   │   ├── api/
│   │   │   ├── endpoint_ws.py         # WebSocket relay extension ↔ dashboard
│   │   │   ├── endpoint_scrape.py     # GET /scrape/html, /scrape/selectors (httpx+BS4)
│   │   │   └── endpoint_playwright.py # POST /scrape/playwright (Playwright+stealth)
│   │   └── scraper/
│   │       ├── profile.py     # Profiles navigateur aléatoires (UA, viewport, timezone)
│   │       └── proxy_pool.py  # Pool de proxies avec health tracking
│   ├── tests/                # Tests pytest
│   ├── proxies.txt           # Liste de proxies (exemple)
│   └── requirements.txt      # Dépendances Python
│
├── extension/                # Extension Chrome Manifest V3
│   ├── manifest.json
│   ├── background.js         # Service worker (gestion cycle de vie offscreen)
│   ├── content.js            # Content script injecté (8 extracteurs DOM)
│   ├── offscreen.js          # Propriétaire WebSocket (document hors-écran)
│   ├── popup.html / popup.js # Popup de contrôle
│   ├── icons/                # Icones 16/48/128 px
│   └── test/                 # Tests HTML manuels
│
├── frontend/                 # Dashboard React / Vite / Tailwind
│   ├── src/
│   │   ├── App.jsx           # Composant racine
│   │   ├── components/       # UI : Sidebar, ModeCard, ConnectionStatus, etc.
│   │   ├── hooks/            # Hooks : useExtension, useModeEngine, useSessionHistory
│   │   ├── services/         # Logique métier : téléchargements, routage, registre
│   │   └── __tests__/        # Tests Vitest
│   ├── tailwind.config.js    # Thème sombre personnalisé (surface/accent)
│   └── vite.config.js        # Dev :3000, proxy /api → :8000
│
├── .dockerignore              # Build context Docker (exclut fichiers inutiles)
├── Dockerfile                 # Image Docker du backend (Playwright + Python 3.12)
├── docker-compose.yml         # Orchestration Docker (backend + frontend Nginx + build frontend)
├── nginx/
│   └── default.conf           # Proxy Nginx (API + WebSocket → backend)
├── scripts/
│   └── generate-pdf.js       # Génération du PDF via Puppeteer/Edge
│
├── setup.ps1                 # Script d'installation Windows (PowerShell)
├── setup.sh                  # Script d'installation Unix (bash)
├── start-dev.ps1             # Lance backend + frontend (Windows)
├── run.sh                    # Lance backend + frontend (Unix)
├── CAHIER_DES_CHARGES.pdf    # Cahier des charges complet (7 parties, 14 diagrammes)
├── Makefile                  # Automatisation build/dev (cross-platform)
└── .gitignore
```

---

## Tests

```bash
# Backend (pytest)
cd backend
pytest tests/ -v

# Frontend (vitest)
cd frontend
npx vitest run
```

### Backend
- `test_websocket.py` — validation du relais WebSocket entre extension et dashboard

### Frontend
- `downloadCsv.test.js` — génération CSV
- `messageRouter.test.js` — routage des messages WebSocket
- `modeRegistry.test.js` — registre des modes d'extraction

### Extension
Tests manuels HTML disponibles dans `extension/test/` :
- `extractImages.test.html`
- `resolveUrl.test.html`

---

## Documentation

- **[CAHIER_DES_CHARGES.pdf](CAHIER_DES_CHARGES.pdf)** — spécification complète en français (7 parties, 28 sections, 14 diagrammes)

---

## Licence

GhostScrape est un projet open source. Voir le fichier `LICENSE` pour plus d'informations.
