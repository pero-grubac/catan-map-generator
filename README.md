# 🗺️ Catan Map Generator

A random map generator for **Catan** (standard 3-4 player) and the **5-6 player extension**, deployable as a static site on GitHub Pages.

[![Live Demo](https://img.shields.io/badge/🗺️_Live_Demo-pero--grubac.github.io/catan--map-c9973a?style=for-the-badge)](https://pero-grubac.github.io/catan-map)

---

## Features

- **Two map sizes** — Standard (19 land tiles, 3-4 players) and Extended (30 land tiles, 5-6 players)
- **Placement rules** (each toggleable):
  - No adjacent `6` and `8` tokens
  - No adjacent `2` and `12` tokens
  - No same resource type touching
- **Smart generation** — backtracking algorithm guarantees constraint satisfaction; no arbitrary retry limits
- **Scoring system** — generates multiple valid candidates and picks the most balanced one
- **Fixed ports** — official Catan port layout, same positions every game
- **Non-blocking UI** — generation runs asynchronously; page never freezes

---

## Tile counts

### Standard (3-4 players)

| Resource  | Tiles  | Numbers                       |
| --------- | ------ | ----------------------------- |
| Forest    | 4      | 2×(3,4,5,9,10,11), 1×(6,8,12) |
| Grain     | 4      | —                             |
| Sheep     | 4      | —                             |
| Rock      | 3      | —                             |
| Clay      | 3      | —                             |
| Desert    | 1      | — (no token)                  |
| **Total** | **19** | **18 number tokens**          |

Number tokens: `2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12`

### Extended (5-6 players)

| Resource  | Tiles  |
| --------- | ------ |
| Forest    | 6      |
| Grain     | 6      |
| Sheep     | 6      |
| Rock      | 5      |
| Clay      | 5      |
| Desert    | 2      |
| **Total** | **30** |

Number tokens: `2×(2,12), 3×(3,4,5,9,10,11), 3×(6,8)` — 28 tokens total

---

## How it works

### Grid construction

The map is built as a complete hex grid — a fixed sea ring surrounding the land hexes. Sea hex positions are computed automatically: for each land hex, all six pixel-space neighbours that aren't land become sea hexes (duplicates deduplicated by rounded pixel key). This means the frame is always geometrically exact. Ports are placed at fixed sea hex positions that border the land, following the official Catan layout — same port, same spot, every time.

### Generation pipeline

Generation runs in three stages and repeats until a time budget (~2.5s) is exhausted. The highest-scoring valid result is returned.

#### 1. Resource placement — backtracking with random visit order

Instead of shuffle-and-check (which can require thousands of retries), resources are placed one hex at a time using constraint backtracking:

1. The hex **visit order is shuffled** before each run — this prevents rare tiles like Desert from always landing at the end of a fixed sequence (they can end up anywhere on the board).
2. At each hex, available resource types are tried in **random order**.
3. If a type would violate the "no same resource adjacent" rule, it is skipped immediately — no need to place and then undo the whole board.
4. If no type works at a given hex, the algorithm **backtracks** to the previous hex and tries the next option there.

This guarantees a valid placement is found in milliseconds, with no wasted random attempts.

#### 2. Number placement — backtracking with degree ordering

Numbers are placed separately, also via backtracking:

1. Land tiles are sorted by **degree** (number of neighbours) descending — tiles in the dense centre are filled first since they have the most constraints and benefit most from early placement.
2. Number tokens are tried in **random order** at each slot.
3. Adjacent 6-8 or 2-12 pairs are rejected immediately (when those rules are enabled).
4. Each attempt has a **per-attempt deadline** (~150ms). If backtracking stalls and the deadline is hit, the entire attempt is abandoned and restarted with a fresh resource layout — this avoids rare worst-case blowups where a particular resource arrangement makes number placement unusually hard.

#### 3. Scoring & selection

Up to 8 valid candidates are collected within the time budget. Each is scored and the best is displayed:

| Situation                                           | Score     |
| --------------------------------------------------- | --------- |
| Adjacent 6 and 8                                    | −100      |
| Adjacent 2 and 12                                   | −40       |
| Adjacent same resource                              | −20       |
| Unbalanced probability spread across resource types | −variance |

A perfect map scores 0. The score range shown in the UI (e.g. `−2 → −18`) tells you how much variation there was between the best and worst candidates found in that run.

---

## Project structure

```
catan-map/
├── index.html   # Markup and layout
├── style.css    # Dark theme styling
├── map.js       # All generation and rendering logic
└── README.md
```

---

## Deploy to GitHub Pages

1. Create a new repo (e.g. `catan-map`)
2. Push all four files to the `main` branch root
3. Go to **Settings → Pages → Source** → `main` / `/ (root)`
4. Site will be live at `https://pero-grubac.github.io/catan-map`

---

## Local development

No build step needed — open `index.html` directly in a browser, or serve with any static file server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

---

## Known limitations

- **Extended + "no same resource"** — with 6 copies of 3 resource types on a dense 30-hex grid, backtracking is feasible but generation time varies. If it exceeds the time budget, a best-effort result is shown with a warning.
- The generator uses client-side JS only — no server, no dependencies, no build tooling.

---

_Catan is a registered trademark of Catan GmbH. This is an unofficial fan tool._
