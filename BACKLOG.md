# Arcadian Trail — Task Backlog

> Persistent backlog for tracking work across Claude Code sessions.
> **Points** estimate relative effort/cost (1 = trivial, 2 = small, 3 = medium, 5 = large, 8 = epic).
> A typical session with ~$5 remaining can handle ~8-12 points of work.

---

## In Progress

| # | Task | Points | Notes |
|---|------|--------|-------|
| — | *(none)* | — | — |

---

## Phased Roadmap

> Planned with Gemini (session 2). Build atmosphere first, then depth, then the marquee feature.

### Phase 1: World Feel (8 pts) — *complete*
| # | Task | Points | Status |
|---|------|--------|--------|
| G2 | More narrative variety per terrain | 2 | done |
| G6 | Random roadside encounters (non-modal, journal + minor resource fx) | 3 | done |
| G5 | Day/night cycle — tie to multi-day phases, not per-tick (avoid strobe) | 3 | done |

### Phase 2: Strategic Depth (19 pts) — *current*
| # | Task | Points | Priority | Status |
|---|------|--------|----------|--------|
| G14 | Peril deduplication — ensure back-to-back events can't repeat the same type; add more variety to event pool | 2 | 1 | done |
| G4 | More event types (trade caravan, river crossing, etc.) | 5 | 2 | done |
| G15 | Creative endings — 90s action movie taglines that vary based on perils encountered during the journey | 2 | 3 | done |
| G16 | Make inventory matter at decision points — add more `itemRequired`/`itemBonus` branches to events so starting resource selections have visible impact; surface item usage in outcome narratives | 3 | 4 | done |
| V7 | ASCII progress map — simplified US map outline showing route and current position, airline-flight-tracker style | 5 | 5 | done |
| G17 | Party member deaths — family members can die of dysentery (and other causes) during crisis events. Log iconic "[Name] has died of dysentery" messages. Track family roster, reduce family size, affect morale, trigger game over if leader dies. | 5 | 6 | done |
| G7 | Route branching at waypoints (safer vs. faster) | 5 | 7 | defer |

### Phase 3: Marquee Features (31 pts)
| # | Task | Points | Priority | Status |
|---|------|--------|----------|--------|
| G12 | Shelter Dash mini-game — original side-scrolling runner prototype | 8 | 1 | done |
| G18 | Crash the Barricade — rename existing runner to barricade escape game. Speed-based collision (obstacles slow you down, stall = caught). Win/lose ASCII scene cards. Trigger from "ram the barricade" event choices. | 3 | 2 | done |
| G19 | New Shelter Dash — non-scrolling 2D field, player finds randomly-placed shelters. Exposed = rapid weather-dependent damage (smoke/fire/drought/heat from weather API). In shelter = safe. Survive the timer. Trigger from "find shelter" choices. | 5 | 3 | done |
| G20 | Mini-game choice triggers — add `minigame` property to eventDefs choices, wire through events.js → main.js to launch correct mini-game from player decisions. | 2 | 4 | done |
| G21 | ASCII event scene cards — first-person POV ASCII art per event (e.g., Iron Caravan approaching). Replace driving scene during EVENT/RESULT states. Fallback to perilType generic scene. | 5 | 5 | done |

### Phase 3b: Mini-Game Polish (5 pts)
| # | Task | Points | Priority | Status |
|---|------|--------|----------|--------|
| G22 | Shelter Dash improvements — variable-quality shelters with visual distinction (sturdy vs. fragile), shelters can collapse forcing player to find another, display player health bar during mini-game | 5 | 1 | |

### Phase 4A: Visual Overhaul — 1985 Oregon Trail Color Imagery (10 pts)

> Replace dark-terminal monochrome aesthetic with terrain-differentiated color panels in the style of the 1985 Apple IIe Oregon Trail. Sky/ground color identity per terrain type; weather tinting on top; event scenes color-themed by peril type.

| # | Task | Points | Priority | Notes |
|---|------|--------|----------|-------|
| P2-V1 | Terrain color palette system | 3 | 1 | Add `data-terrain` attribute to `#ascii-display`; define CSS custom properties per terrain in `style.css`; set attribute in `AsciiRenderer.render()` |
| P2-V2 | Sky/ground background panels | 3 | 2 | Split display into sky rows (0–11) and ground rows (12–17); apply terrain-scoped background colors via CSS vars |
| P2-V3 | Weather color tints | 2 | 3 | Rain → darken sky 20%; heat → orange ground cast; snow → lighten all vars; wire into existing weather overlay logic |
| P2-V4 | Event scene card color theming | 2 | 4 | Apply perilType-scoped palettes during EVENT/RESULT states (wildfire → red/orange, flood → blue, freeze → ice) |

**Terrain color targets (Apple IIe composite palette-inspired):**

| Terrain | Sky | Ground | Accent |
|---------|-----|--------|--------|
| Plains / grassland | `#87ceeb` | `#4a7c2f` | `#8b6914` |
| Desert | `#d4a843` | `#c4873a` | `#8b4513` |
| Mountain | `#b0c4de` | `#6b7280` | `#4a5568` |
| Forest | `#7ab648` | `#2d5a1b` | `#5c4a2a` |
| Coastal | `#4a9eda` | `#1a5c7a` | `#c2b280` |
| Urban | `#9ca3af` | `#4b5563` | `#6b7280` |
| Arctic | `#e0f2fe` | `#bfdbfe` | `#93c5fd` |
| Swamp | `#78716c` | `#374151` | `#6b8e23` |

### Phase 4B: Strategic Gameplay Depth (17 pts)

> Add meaningful long-arc decision-making: route branching with tradeoffs, a cross-event flag system for consequence chaining, and faction reputation that accumulates across encounters.

| # | Task | Points | Priority | Notes |
|---|------|--------|----------|-------|
| P2-G1 | Route branching at waypoints (G7) | 5 | 1 | WAYPOINT state at each city; Safe Route (+20% fuel cost) vs. Fast Route (+event chance); implement in `js/travel.js` + new state in `js/game.js` |
| P2-G2 | Game flag system | 2 | 2 | Add `game.flags = {}` to Game class; add `setsFlag` to eventDef choices; check `game.flags[x]` in event `conditions` |
| P2-G3 | Multi-stage linked events (2–3 pairs) | 3 | 3 | Author 2–3 event pairs where choice A sets a flag → Event B fires later with payoff narrative. Use flag system from P2-G2. |
| P2-G4 | Faction reputation (checkpoints / caravans) | 5 | 4 | Add `game.reputation = {}` keyed by faction; expose in dashboard; wire gates into iron caravan + refugee checkpoint events |
| P2-G5 | Item consumable limits | 2 | 5 | Add `maxUses: N` to items in `data/items.js`; track `game.itemUses = {}` in Game; enforce in event resolution |

### Phase 4C: Polish & Utility (13 pts)
| # | Task | Points |
|---|------|--------|
| G8 | Save/load game state to localStorage (build early to avoid serialization debt) | 3 |
| G1 | Sound effects — `AudioContext` oscillators for retro synth, no external files | 5 |
| G9 | Local leaderboard | 2 |
| G3 | Further difficulty tuning (post-playtesting) | 3 |

### Unphased (Visual, Technical, Marketing)
| # | Task | Points | Notes |
|---|------|--------|-------|
| V1 | Add 3rd ASCII art variant per terrain | 3 | |
| V2 | Directional weather animation | 2 | |
| V3 | Title screen ASCII art banner | 2 | |
| V4 | End screen ASCII art (win/lose scenes) | 2 | |
| V5 | Terrain-specific event panel border colors | 1 | |
| V6 | Dashboard ASCII icons | 1 | |
| T1 | API key proxy for production | 3 | |
| T2 | Weather API error handling UI | 2 | |
| T3 | Unit tests (game.js, scoring.js) | 5 | |
| T4 | Accessibility (ARIA, keyboard nav) | 3 | |
| T5 | PWA offline support | 3 | |
| T6 | Analytics | 2 | |
| P1 | OG meta tags + social preview | 2 | |
| P2 | Personal site screenshot update | 1 | |
| P3 | README.md | 2 | |

---

## Completed

| # | Task | Points | Session | Date |
|---|------|--------|---------|------|
| C1 | ASCII terrain renderer (replace canvas) | 8 | 1 | 2025-02-11 |
| C2 | 9 terrain types x 2 variants | 5 | 1 | 2025-02-11 |
| C3 | Weather overlay system (rain, snow, storm, wind, mist, heat) | 3 | 1 | 2025-02-11 |
| C4 | 10 event scenes (wildfire, hurricane, flood, etc.) | 5 | 1 | 2025-02-11 |
| C5 | Deploy to GitHub Pages | 2 | 1 | 2025-02-11 |
| C6 | Personal site project card with links | 2 | 1 | 2025-02-11 |
| C7 | Delete dead `mapRenderer.js` code | 1 | 2 | 2025-02-11 |
| C8 | Mobile responsiveness — ASCII font scaling + media queries | 2 | 2 | 2025-02-11 |
| C9 | Performance caching — terrain grid + info bar skip | 2 | 2 | 2025-02-11 |
| C10 | Extract magic numbers to named constants | 1 | 2 | 2025-02-11 |
| C11 | Vehicle animation — oscillation + wheel frames | 2 | 2 | 2025-02-11 |
| C12 | Terrain transition wipe effect | 2 | 2 | 2025-02-11 |
| C13 | Color highlights via HTML spans (vehicle, weather, events, road) | 3 | 2 | 2025-02-11 |
| C14 | Post-game feedback form — saves to localStorage with game context | 3 | 2 | 2025-02-11 |
| C15 | Slow down gameplay — travel speed 1200→2000ms, 1.5s delay on result continue button | 1 | 2 | 2025-02-11 |
| C16 | Increase difficulty — higher burn rates, 30% event chance, buffed damage on risky choices | 2 | 2 | 2025-02-11 |
| C17 | Feedback export — download button + `data/feedback.json` seed file for repo persistence | 2 | 2 | 2025-02-11 |
| C18 | Favicon refresh — terminal-themed SVG (AT monogram, road, vehicle accent) | 1 | 2 | 2025-02-11 |
| C19 | Journal auto-scroll — `scrollIntoView` on new log entries | 1 | 2 | 2025-02-11 |
| C20 | More narrative variety — 45 terrain-specific narratives | 2 | 2 | 2025-02-11 |
| C21 | Random roadside encounters — 20 encounters, non-modal with resource fx | 3 | 2 | 2025-02-11 |
| C22 | Day/night cycle — 4-phase palette shifts via CSS classes | 3 | 2 | 2025-02-11 |
| C23 | Peril deduplication — recent event type suppression (95/70/40% penalties) | 2 | 3 | 2026-02-11 |
| C24 | 8 new event types — river crossing, iron caravan, flash freeze, blight, storm surge, refugee checkpoint, solar farm, abandoned hospital | 5 | 3 | 2026-02-11 |
| C25 | Creative endings — 90s action taglines keyed to dominant peril type (win + lose pools) | 2 | 3 | 2026-02-11 |
| C26 | Inventory matters — 18 item synergies across 28 events, all 10 items wired up, itemNarrative support | 3 | 3 | 2026-02-11 |
| C27 | ASCII progress map — US outline with route/waypoint plotting, position tracker, color-coded markers | 5 | 3 | 2026-02-11 |
| C28 | Party member deaths — travel & event death paths, family roster UI, end screen roster, scoring fix | 5 | 3 | 2026-02-11 |

---

## Recurring Processes

### Feedback Review (every session start)
1. `git pull` the repo to get latest `data/feedback.json`
2. Read `data/feedback.json` — summarize any new entries since last review
3. Assess feedback for actionable suggestions → propose new backlog items with point estimates
4. Fallback: ask user to paste `localStorage` feedback dump if no file yet

**Last reviewed:** _not yet_

---

## How to Use This Backlog

1. **Start of session:** Read this file, check Recurring Processes, review Phased Roadmap
2. **Pick tasks:** Follow the phase order; choose items that fit remaining credit budget (~1 pt per $0.50)
3. **Move to In Progress:** Cut the row from the phase table, paste under In Progress
4. **On completion:** Move to Completed table with session number and date
5. **Add new tasks:** Append to the relevant section with a point estimate
