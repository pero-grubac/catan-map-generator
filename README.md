<div align="center">

# 🗺️ Catan Map Generator

![HTML](https://img.shields.io/badge/HTML-5-e34f26?style=flat-square&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-3-1572b6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2024-f7df1e?style=flat-square&logo=javascript&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-offline--ready-5a0fc8?style=flat-square&logo=pwa&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-deployed-4c1?style=flat-square&logo=github&logoColor=white)

[![Live Demo](https://img.shields.io/badge/🗺️_Live_Demo-catan--map--generator-c9973a?style=for-the-badge)](https://pero-grubac.github.io/catan-map-generator/)

</div>

---

## 📌 Project Overview

**Catan Map Generator** is a random map generator for the Catan board game. It supports both the standard 3-4 player map and the 5-6 player extension, with configurable placement rules and a scoring system that picks the most balanced result from multiple valid candidates. Runs entirely in the browser — no backend, no dependencies, no build step. Works offline as a PWA.

---

## ✨ Features

- 🗺️ **Two map sizes** — Standard (19 land tiles, 3-4 players) and Extended (30 land tiles, 5-6 players)
- ⚙️ **Placement rules** (each toggleable):
  - No adjacent `6` and `8` tokens
  - No adjacent `2` and `12` tokens
  - No same resource type touching
- 🧠 **Smart generation** — backtracking algorithm guarantees constraint satisfaction; no arbitrary retry limits
- 🏆 **Scoring system** — generates multiple valid candidates and picks the most balanced one
- ⚓ **Fixed ports** — official Catan port layout, same positions every game
- ⚡ **Non-blocking UI** — generation runs asynchronously; page never freezes
- 📱 **PWA** — installable on mobile and desktop, works fully offline

---

## 🗃️ Tile counts

### Standard (3-4 players)

| Resource | Tiles | Numbers |
|----------|-------|---------|
| Forest   | 4     | 2×(3,4,5,9,10,11), 1×(6,8,12) |
| Grain    | 4     | — |
| Sheep    | 4     | — |
| Rock     | 3     | — |
| Clay     | 3     | — |
| Desert   | 1     | — (no token) |
| **Total** | **19** | **18 number tokens** |

Number tokens: `2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12`

### Extended (5-6 players)

| Resource | Tiles |
|----------|-------|
| Forest   | 6     |
| Grain    | 6     |
| Sheep    | 6     |
| Rock     | 5     |
| Clay     | 5     |
| Desert   | 2     |
| **Total** | **30** |

Number tokens: `2×(2,12), 3×(3,4,5,9,10,11), 3×(6,8)` — 28 tokens total

---

## ⚙️ How it works

### Grid construction

The map is built as a complete hex grid — a fixed sea ring surrounding the land hexes. Sea hex positions are computed automatically: for each land hex, all six pixel-space neighbours that aren't land become sea hexes (duplicates deduplicated by rounded pixel key). Ports are placed at fixed sea hex positions following the official Catan layout — same port, same spot, every time.

### Generation pipeline

Generation runs in three stages and repeats until a time budget (~2.5s) is exhausted. The highest-scoring valid result is returned.

#### 1. Resource placement — backtracking with random visit order

| Step | Description |
|------|-------------|
| Shuffle visit order | Every hex has equal chance of getting any resource — Desert won't always land at the end |
| Random type order | At each hex, resource types are tried in random order |
| Immediate rejection | Violating types are skipped on the spot, no full-board undo needed |
| Backtrack | If no type works, the algorithm steps back and tries the next option |

#### 2. Number placement — backtracking with degree ordering

| Step | Description |
|------|-------------|
| Degree sort | Dense centre tiles are filled first — most constrained slots placed earliest |
| Random token order | Tokens tried randomly at each slot |
| Immediate rejection | Adjacent 6-8 or 2-12 pairs rejected on placement |
| Per-attempt deadline | If backtracking stalls (~150ms), restart with a fresh resource layout |

#### 3. Scoring & selection

Up to 8 valid candidates are collected within the time budget. Each is scored and the best is displayed:

| Situation | Score |
|-----------|-------|
| Adjacent 6 and 8 | −100 |
| Adjacent 2 and 12 | −40 |
| Adjacent same resource | −20 |
| Unbalanced probability spread | −variance |

A perfect map scores `0`. The score range shown in the UI (e.g. `−2 → −18`) tells you how much variation there was between the best and worst candidates found in that run.

---

## 📁 Project structure

| File | Purpose |
|------|---------|
| `index.html` | Markup and layout |
| `style.css` | Dark theme styling |
| `map.js` | All generation and rendering logic |
| `manifest.json` | PWA manifest (name, icons, display mode) |
| `service-worker.js` | Offline caching (cache-first strategy) |

<details>
<summary>📁 fonts/</summary>

All typefaces served locally — no Google Fonts requests, works fully offline.

`cinzel-400.woff2`, `cinzel-600.woff2`, `cinzel-700.woff2`
`crimson-pro-400.woff2`, `crimson-pro-500.woff2`, `crimson-pro-600.woff2`
`oswald-400.woff2`, `oswald-600.woff2`, `oswald-700.woff2`

</details>

<details>
<summary>🔷 icons/</summary>

PWA icons used by the browser for home screen shortcuts and splash screens.

`icon-192.png`, `icon-512.png`

</details>

<details>
<summary>🖼️ images/</summary>

Resource and port icons rendered inside the SVG hex tiles.

`forest.png`, `grain.png`, `sheep.png`, `rock.png`, `clay.png`, `desert.png`, `port.png`

</details>

---

## 🚀 Deploy to GitHub Pages

1. Create a new repo (e.g. `catan-map-generator`)
2. Push all files to the `main` branch root
3. Go to **Settings → Pages → Source** → `main` / `/ (root)`
4. Site will be live at `https://pero-grubac.github.io/catan-map-generator`

> **After each update:** bump `CACHE_NAME` in `service-worker.js` (e.g. `v2` → `v3`) so returning users get fresh files.

---

## 🛠️ Local development

No build step needed. A local HTTP server is required — Service Workers don't run on `file://`.

**VS Code Live Server:**
```
Right-click index.html → Open with Live Server
```
Open `http://localhost:5500`

**Python:**
```bash
python3 -m http.server 8080
```
Open `http://localhost:8080`

---

## ⚠️ Known limitations

- **Extended + "no same resource"** — with 6 copies of 3 resource types on a dense 30-hex grid, backtracking is feasible but generation time varies. If it exceeds the time budget, a best-effort result is shown with a warning.
- The generator uses client-side JS only — no server, no dependencies, no build tooling.

---

*Catan is a registered trademark of Catan GmbH. This is an unofficial fan tool.*
