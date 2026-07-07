# Rapport de participation — GhostScrape

## Membres du groupe

| Membre | Nom | Taux de participation |
|--------|-----|---------------------|
| Membre A | BATAMBA Prosper | **60 %** |
| Membre B | M'VILA Vernon | **40 %** |

---

## Répartition des responsabilités

### 1. Backend FastAPI

| Tâche | Responsable |
|-------|------------|
| Serveur WebSocket (relais extension ↔ dashboard) | BATAMBA Prosper |
| Point de terminaison `/health` | BATAMBA Prosper |
| Gestion des sessions (session_id) | BATAMBA Prosper |
| Proxy de secours (Playwright / httpx) | BATAMBA Prosper |
| Middleware CORS | BATAMBA Prosper |
| Dockerisation | BATAMBA Prosper |
| Déploiement Render | BATAMBA Prosper |
| **Total** | **BATAMBA Prosper : 100 %** |

### 2. Extension Chrome — Cœur (content.js)

| Tâche | Responsable |
|-------|------------|
| Injection du script (IIFE, garde __gs_initialized) | BATAMBA Prosper |
| MessagingService (port, reconnexion, handlers) | BATAMBA Prosper |
| PageDetector (blocage Cloudflare, 403, empty page) | BATAMBA Prosper |
| RetryManager (backoff, validation) | BATAMBA Prosper |
| Timeout helper | BATAMBA Prosper |
| waitForSelector, waitAndScroll | BATAMBA Prosper |
| extractFullPage (mode page entière) | BATAMBA Prosper |
| extractDataTypes (modes données structurées) | BATAMBA Prosper |
| extractCssSelectors (mode sélecteurs CSS) | BATAMBA Prosper |
| extractImages + imageElementMap | BATAMBA Prosper |
| fetchImagesAsBase64 (3 niveaux : DOM → Image() → fetch) | BATAMBA Prosper |
| domImageToBase64, newImageToBase64 | BATAMBA Prosper |
| Gestion des messages (TRIGGER_EXTRACTION, DOWNLOAD_IMAGES, etc.) | BATAMBA Prosper |
| Routage des modes (full-page, data-types, css-selector) | BATAMBA Prosper |
| **Total** | **BATAMBA Prosper : 100 %** |

### 3. Extension Chrome — Service Worker (background.js)

| Tâche | Responsable |
|-------|------------|
| Cycle de vie de l'offscreen document (création, vérification) | BATAMBA Prosper |
| Routage des messages content ↔ offscreen ↔ serveur | BATAMBA Prosper |
| Gestion des content ports (connect, disconnect, replay queue) | BATAMBA Prosper |
| Gestion de l'état (dashboardTabId, activeMode, wsConnected) | BATAMBA Prosper |
| Keepalive alarm | BATAMBA Prosper |
| Gestion des messages NAVIGATE_TO, ACTIVATE_MODE | BATAMBA Prosper |
| **Total** | **BATAMBA Prosper : 100 %** |

### 4. Extension Chrome — Offscreen (offscreen.js)

| Tâche | Responsable |
|-------|------------|
| Connexion WebSocket persistante | M'VILA Vernon |
| Logique de reconnexion (backoff progressif) | M'VILA Vernon |
| Ping/Pong keepalive | M'VILA Vernon |
| Routage des messages vers background.js | M'VILA Vernon |
| Gestion FORCE_RECONNECT | M'VILA Vernon |
| **Total** | **M'VILA Vernon : 100 %** |

### 5. Extension Chrome — Popup (popup.js / popup.html)

| Tâche | Responsable |
|-------|------------|
| Interface popup (statut, badge, bouton reconnect) | M'VILA Vernon |
| Communication avec background.js (CONNECTION_STATUS, RECONNECT) | M'VILA Vernon |
| Mise à jour temps réel du statut | M'VILA Vernon |
| **Total** | **M'VILA Vernon : 100 %** |

### 6. Manifest & Configuration

| Tâche | Responsable |
|-------|------------|
| Manifest (permissions, host_permissions, content_scripts) | BATAMBA Prosper |
| Définition des URLs backend | M'VILA Vernon |
| **Total** | **BATAMBA Prosper : 50 % — M'VILA Vernon : 50 %** |

### 7. Frontend — Hooks & Services

| Tâche | Responsable |
|-------|------------|
| useExtension (connexion WebSocket dashboard) | BATAMBA Prosper |
| useModeEngine (machine à états extraction) | BATAMBA Prosper |
| useSessionHistory (historique des extractions) | BATAMBA Prosper |
| messageRouter (filtrage et routage des messages WS) | BATAMBA Prosper |
| modeRegistry (définition des modes) | BATAMBA Prosper |
| **Total** | **BATAMBA Prosper : 100 %** |

### 8. Frontend — Sidebar & App

| Tâche | Responsable |
|-------|------------|
| Sidebar (routage des panneaux, activation/désactivation des modes) | BATAMBA Prosper |
| App.jsx (composant racine, routage messages vers engine) | BATAMBA Prosper |
| **Total** | **BATAMBA Prosper : 100 %** |

### 9. Frontend — Panneaux d'extraction

| Tâche | Responsable |
|-------|------------|
| FullPagePanel (mode page entière) | BATAMBA Prosper |
| DataTypePanel (mode types de données) | M'VILA Vernon |
| CssSelectorPanel (mode sélecteurs CSS) | M'VILA Vernon |
| ModeCard (carte de sélection de mode) | M'VILA Vernon |
| **Total** | **BATAMBA Prosper : 33 % — M'VILA Vernon : 67 %** |

### 10. Frontend — Vues détaillées

| Tâche | Responsable |
|-------|------------|
| DetailView (prévisualisation détaillée avec renderCssSelector) | M'VILA Vernon |
| HistoryView (historique des extractions) | M'VILA Vernon |
| **Total** | **M'VILA Vernon : 100 %** |

### 11. Déploiement & Infrastructure

| Tâche | Responsable |
|-------|------------|
| Déploiement Render (backend) | BATAMBA Prosper |
| Déploiement Netlify (frontend) | BATAMBA Prosper |
| Configuration UptimeRobot (ping /health) | BATAMBA Prosper |
| Docker (Dockerfile, docker-compose) | BATAMBA Prosper |
| Scripts de déploiement | BATAMBA Prosper |
| Génération extension.zip | BATAMBA Prosper |
| **Total** | **BATAMBA Prosper : 100 %** |

### 12. Documentation

| Tâche | Responsable |
|-------|------------|
| README.md | M'VILA Vernon |
| ARCHITECTURE.md | M'VILA Vernon |
| CAHIER_DES_CHARGES.md | BATAMBA Prosper |
| INSTALL.md | M'VILA Vernon |
| RAPPORT_PARTICIPATION.md (ce document) | BATAMBA Prosper |
| **Total** | **BATAMBA Prosper : 40 % — M'VILA Vernon : 60 %** |

### 13. Tests & Débogage

| Tâche | Responsable |
|-------|------------|
| Tests backend | BATAMBA Prosper |
| Tests extension (content script, messaging) | BATAMBA Prosper |
| Tests frontend (panneaux, hooks) | M'VILA Vernon |
| Débogage fortnite.gg (Cloudflare, DOM image map) | BATAMBA Prosper |
| Débogage connexion WebSocket (offscreen, reconnexion) | M'VILA Vernon |
| Débogage CssSelectorPanel (aperçu, nouvelle extraction) | M'VILA Vernon |
| **Total** | **BATAMBA Prosper : 50 % — M'VILA Vernon : 50 %** |

---

## Synthèse

| Module | BATAMBA Prosper (60 %) | M'VILA Vernon (40 %) |
|--------|----------------------|---------------------|
| Backend FastAPI | 8 % | — |
| Extension content.js | 15 % | — |
| Extension background.js | 6 % | — |
| Extension offscreen.js | — | 4 % |
| Extension popup | — | 2 % |
| Manifest & config | 1 % | 1 % |
| Frontend hooks & services | 8 % | — |
| Frontend Sidebar & App | 5 % | — |
| Frontend panneaux extraction | 2 % | 6 % |
| Frontend vues détaillées | — | 5 % |
| Déploiement & infra | 8 % | — |
| Documentation | 2 % | 3 % |
| Tests & débogage | 5 % | 5 % |
| **TOTAL** | **60 %** | **40 %** |

---

## Rôles résumés

- **BATAMBA Prosper** — Lead développeur : architecture générale, backend, cœur de l'extension (content.js, background.js), hooks frontend, déploiement, gestion de projet.
- **M'VILA Vernon** — Développeur support : interface utilisateur (panneaux extraction, popup, vues détaillées), documentation, offscreen WebSocket, QA et débogage.
