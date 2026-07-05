# GhostScrape — Installation de l'extension Chrome

> L'extension GhostScrape se charge **manuellement** dans Chrome (elle n'est pas sur le Chrome Web Store). L'opération prend 30 secondes et ne nécessite aucune compétence technique.

---

## Prérequis

- **Google Chrome** (ou Microsoft Edge / Brave / tout navigateur Chromium)
- L'extension communique avec le backend hébergé sur `wss://ghostscrape.onrender.com`

---

## Installation (30 secondes)

### Étape 1 — Télécharger l'extension

**Option A — Dossier complet (recommandé)**
- Recevez le dossier `extension/` complet par email, clé USB ou partage réseau
- Gardez-le dans un endroit où vous ne le supprimerez pas (ex: `Documents/GhostScrape/extension/`)

**Option B — Depuis GitHub**
```bash
git clone https://github.com/Prosper-BATAMBA/Ghostscrape.git
```

### Étape 2 — Ouvrir la page des extensions

Dans Chrome, cliquez sur l'URL et tapez :
```
chrome://extensions
```

### Étape 3 — Activer le Mode développeur

- **Coin supérieur droit** → basculer l'interrupteur **« Mode développeur »** sur ON

### Étape 4 — Charger l'extension

- Cliquer sur **« Charger l'extension non empaquetée »**
- Sélectionner le dossier **`extension/`** (pas le dossier parent, pas un sous-dossier)

### Étape 5 — Vérifier

- ✅ L'icône GhostScrape apparaît dans la barre d'outils de Chrome
- ✅ L'extension est active sur toutes les pages web

---

## Que faire si ça ne marche pas ?

### Problème : « Cette extension peut ne pas être prise en charge »

Chrome affiche parfois un avertissement pour les extensions non empaquetées. Ignorez-le, l'extension fonctionne parfaitement.

### Problème : L'icône n'apparaît pas

1. Vérifiez que vous êtes bien dans `chrome://extensions`
2. L'icône peut être cachée dans le menu Puzzle (🧩) à droite de la barre d'adresse
3. Épinglez-la pour y accéder facilement

### Problème : L'extension ne se connecte pas

1. Ouvrez la console : `chrome://extensions` → GhostScrape → **Inspect views: offscreen.html**
2. Vous devriez voir le message : `[GS Offscreen] WS connected`
3. Si ce n'est pas le cas, vérifiez que le backend est en ligne :
   - [https://ghostscrape.onrender.com/health](https://ghostscrape.onrender.com/health) doit afficher `{"status":"ok"}`

---

## Utiliser l'extension

1. Ouvrir le dashboard : [https://ghostscrape-front.netlify.app](https://ghostscrape-front.netlify.app)
2. Naviguer sur n'importe quelle page web
3. Choisir un mode d'extraction (FullPage, DataTypes, CssSelector)
4. Cliquer **Extract**
5. Les résultats apparaissent en temps réel

---

## Mettre à jour l'extension

Si une nouvelle version est disponible :

1. Remplacer le dossier `extension/` par la nouvelle version
2. Aller dans `chrome://extensions`
3. Cliquer sur l'icône **↻ (Actualiser)** sur la carte GhostScrape

---

## Désinstaller l'extension

1. `chrome://extensions`
2. Cliquer sur **« Supprimer »** sur la carte GhostScrape
