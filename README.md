# GhostScrape — Scraping web visuel, local & gratuit

**GhostScrape** est une plateforme de web scraping qui permet d'extraire le contenu d'une page web (titres, images, liens, tableaux, métadonnées, sélecteurs CSS personnalisés) en temps réel, sans écrire une ligne de code.

| Composant | Technologie | Version |
|---|---|---|
| Extension Chrome | Manifest V3 | 0.3.0 |
| Backend | Python / FastAPI | 0.3.0 |
| Dashboard | React 18 + Vite 5 + Tailwind 3 | 0.1.0 |

**Services hébergés :**
- **Dashboard** : [https://ghostscrape-front.netlify.app](https://ghostscrape-front.netlify.app)
- **Backend API** : [https://ghostscrape.onrender.com](https://ghostscrape.onrender.com)

---

## Table des matières

- [Aperçu](#aperçu)
- [Installation de l'extension](#installation-de-lextension)
- [Démarrage rapide (15 secondes)](#démarrage-rapide-15-secondes)
- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Utilisation](#utilisation)
- [Développement local](#développement-local)
  - [Docker](#docker)
  - [Scripts automatisés](#scripts-automatisés)
  - [Manuel](#manuel)
  - [Makefile](#makefile)
- [Structure du projet](#structure-du-projet)
- [Tests](#tests)
- [Dépannage](#dépannage)
- [Documentation](#documentation)
- [Licence](#licence)

---

## Aperçu

Le scraping web est dominé par deux approches : les solutions **programmatiques** (BeautifulSoup, Scrapy, Puppeteer) qui exigent des compétences en développement, et les solutions **SaaS** (Octoparse, ParseHub, Apify) qui sont payantes, hébergent les données chez un tiers et limitent les volumes.

**GhostScrape résout ce problème :**

- Gratuit et open source
- Aucune installation serveur — backend et frontend sont déjà hébergés
- Seule l'extension Chrome est à installer localement
- Extraction en temps réel via WebSocket
- Export CSV et ZIP en un clic

---

## Installation de l'extension

La seule chose à installer manuellement. L'extension permet de scraper le DOM réel de la page que vous visitez.

1. **Télécharger** [extension.zip](https://github.com/Prosper-BATAMBA/Ghostscrape/raw/main/extension/extension.zip) et décompresser

2. **Ouvrir Chrome** et aller sur `chrome://extensions`

3. **Activer le Mode développeur** (coin supérieur droit)

4. **Cliquer sur « Charger l'extension non empaquetée »**

5. **Sélectionner le dossier `extension/`** décompressé

6. ✅ **L'icône GhostScrape apparaît** dans la barre d'outils — prêt !

---

## Démarrage rapide (15 secondes)

```bash
# 1. Cliquer sur l'icône GhostScrape → « Open Dashboard »

# 2. Naviguer sur une page web → cliquer Extract
```

➡️ **Aucune installation serveur.** Rien à configurer. Juste Chrome + l'extension.

---

## Fonctionnalités

### 4 modes d'extraction

| Mode | Description |
|---|---|
| **FullPage** | Extrait tous les éléments de la page (images, titres, liens, paragraphes, listes) |
| **DataTypes** | Filtre par type de données : images, tableaux, métadonnées, données structurées |
| **CssSelector** | Sélecteurs CSS personnalisés saisis librement |
| **HistoryView** | Historique des sessions d'extraction avec reprise possible |

### Temps réel

- L'extension injecte un content script au `document_idle`
- Les données sont relayées via WebSocket (backend FastAPI)
- Le dashboard React met à jour l'interface instantanément

### Export

- **CSV** — données tabulaires (liens, tableaux, sélecteurs CSS)
- **ZIP** — lots d'images avec métadonnées JSON, pages complètes HTML
- Génération 100% client (JSZip dans le navigateur)

---

## Architecture

```
┌──────────────────────────┐       ┌──────────────────────────────────┐
│   Extension Chrome MV3   │       │   Dashboard (Netlify)            │
│   (locale)               │       │   https://...netlify.app         │
│                          │       │                                  │
│  content.js ──port──►    │       │  WebSocket ◄────────────────────┐│
│  background.js           │       │  JSZip / export                 ││
│       │                  │       │                                  ││
│  offscreen.js (WS) ──────├───────┼────────────────────────────────┘│
└──────────────────────────┘       └──────────────────────────────────┘
         │                                    │
         └────────── WebSocket (WSS) ─────────┘
                           │
                ┌──────────▼───────────────────────────┐
                │  Backend (Render)                    │
                │  https://ghostscrape.onrender.com     │
                │                                      │
                │  ┌─ WebSocket relay ────────────┐    │
                │  │  /ws/extension               │    │
                │  │  /ws/dashboard               │    │
                │  └──────────────────────────────┘    │
                │                                      │
                │  ┌─ Scraping statique (httpx) ───┐   │
                │  │  GET /scrape/html              │   │
                │  │  GET /scrape/selectors         │   │
                │  └────────────────────────────────┘   │
                │                                      │
                │  ┌─ Scraping JS (Playwright) ─────┐  │
                │  │  POST /scrape/playwright       │  │
                │  │  (stealth + profile + proxy)   │  │
                │  └────────────────────────────────┘  │
                │                                      │
                │  /health                             │
                └──────────────────────────────────────┘
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

## Utilisation

1. **L'extension doit être chargée** dans Chrome (`chrome://extensions`)
2. **Cliquer sur l'icône GhostScrape** → **« Open Dashboard »** (ou ouvrir [https://ghostscrape-front.netlify.app](https://ghostscrape-front.netlify.app))
3. **Naviguer** sur n'importe quelle page web
4. **Choisir un mode** dans la sidebar (FullPage, DataTypes, CssSelector)
5. **Lancer l'extraction** → les résultats apparaissent en temps réel
6. **Exporter** en CSV ou ZIP

---

## Développement local

Pour contribuer ou exécuter le projet en local (sans dépendre des services hébergés).

### Prérequis (développement)

- **Chrome** ou **Edge** (pour l'extension)
- **Docker** (recommandé — évite les problèmes de versions Python/Node.js)
  - Windows : Docker Desktop (WSL2 backend recommandé)
  - macOS : Docker Desktop ou OrbStack
  - Linux : Docker Engine + docker compose plugin
- **Node.js 18+** (uniquement sans Docker)
- **Python 3.12.x** (uniquement sans Docker)
- **Make** optionnel — `make` (Linux/macOS) ou `mingw32-make` (Windows)

### Docker

**Sans Node.js installé :**
```bash
docker compose run --rm frontend-builder
docker compose up -d
```

**Avec Node.js installé :**
```bash
cd frontend && npm install && npm run build
docker compose up -d --build
```

Dashboard : `http://localhost:3000`
Backend : `http://localhost:8000`

### Scripts automatisés

**Windows (PowerShell uniquement) :**
```powershell
.\setup.ps1
.\start-dev.ps1
```

**Linux / macOS :**
```bash
chmod +x setup.sh run.sh
./setup.sh
./run.sh
```

### Manuel

**Windows :** utilisez impérativement **PowerShell** (pas CMD, pas Git Bash).
**Linux / macOS :** utilisez bash ou zsh standard.

```powershell
# Backend
python3.12 -m venv backend\venv
.\backend\venv\Scripts\pip install --upgrade pip setuptools wheel
.\backend\venv\Scripts\pip install -r backend\requirements.txt
.\backend\venv\Scripts\uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

### Makefile

```bash
make help                      # Linux/macOS
mingw32-make help              # Windows
```

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
│   ├── INSTALL.md            # Guide d'installation
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
├── ARCHITECTURE.md           # Architecture technique détaillée
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

## Dépannage

### L'extension ne se connecte pas au dashboard

1. Vérifiez que l'extension est chargée dans `chrome://extensions`
2. Ouvrez la console de l'extension : `chrome://extensions` → GhostScrape → **Inspect views: offscreen.html**
3. Vous devriez voir `[GS Offscreen] WS connected`
4. Si vous voyez des erreurs WebSocket, vérifiez que le backend est en ligne :
   ```bash
   curl https://ghostscrape.onrender.com/health
   # → {"status":"ok"}
   ```

### Le backend ne répond pas (développement local)

Voir les instructions de [Développement local](#développement-local) ci-dessus.

---

## Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — architecture technique détaillée (C4 diagrams, data flow, anti-blocking)
- **[CAHIER_DES_CHARGES.pdf](CAHIER_DES_CHARGES.pdf)** — spécification complète en français (7 parties, 28 sections, 14 diagrammes)

---

## Licence

GhostScrape est un projet open source. Voir le fichier `LICENSE` pour plus d'informations.
