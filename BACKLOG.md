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

### Phase 4B: Strategic Gameplay Depth (17 pts) — *next*

> The SSP system (Phase 5) makes this more valuable: a player choosing SSP5-8.5/2100 should face not just harder event odds but structurally harder route decisions. Route branching and faction reputation pair naturally with the new scenario framing.

| # | Task | Points | Priority | Notes |
|---|------|--------|----------|-------|
| P2-G1 | Route branching at waypoints | 5 | 1 | New `WAYPOINT` state in `js/game.js`. At each named waypoint: Safe Route (+20% fuel cost, −30% event chance) vs Fast Route (−10% fuel, +40% event chance). SSP multipliers should compound with route risk choice — SSP5-8.5/Fast Route is brutal. |
| P2-G2 | Game flag system | 2 | 2 | `game.flags = {}`. Add `setsFlag` to eventDef choices; add `conditions: { flags: ['x'] }` to events. Gate access to multi-stage event payoffs. |
| P2-G3 | Multi-stage linked events (2–3 pairs) | 3 | 3 | Author 2–3 event pairs where choice A sets a flag → Event B fires later with payoff/consequence. Ideally one pair references the SSP scenario (e.g., solar farm success in SSP2-4.5 vs. abandoned wreckage in SSP5-8.5). |
| P2-G4 | Faction reputation | 5 | 4 | `game.reputation = {}` per faction (refugees / merchants / militia). Accumulates across run. Expose in dashboard. Gate Iron Caravan trading and refugee checkpoint passage. |
| P2-G5 | Item consumable limits | 2 | 5 | `maxUses: N` on items; track `game.itemUses = {}`; enforce in event resolution. Makes supply decisions carry more weight, especially under high-drain SSP scenarios. |

---

### Phase 3b: Mini-Game Polish (5 pts) — *done*

---

### Phase 4C: Polish & Utility (13 pts)

> Save/load is now more important: the 3×3 scenario matrix (3 SSPs × 3 years) means players will want to compare runs and save in-progress games.

| # | Task | Points | Priority | Notes |
|---|------|--------|----------|-------|
| G8 | Save/load game state to localStorage | 3 | 1 | Must serialize `sspMultipliers`, `year`, `ssp` alongside existing state. Build before faction reputation (P2-G4) makes state complexity worse. |
| G1 | Sound effects — `AudioContext` oscillators, no external files | 5 | 2 | Retro synth bleeps; event stings; resource warning tones. |
| G9 | Local leaderboard | 2 | 3 | Score board indexed by SSP + year — lets players compare across difficulty tiers. |
| G3 | Difficulty tuning (post-playtesting) | 3 | 4 | The SSP multipliers add a new difficulty axis; baseline burn rates may need rebalancing once SSP5-8.5/2100 runs are playtested. |

---

### Unphased — Visual

> **Note:** V1–V6 were written against the ASCII renderer. Since `ui/pixelRenderer.js` replaced `ui/asciiRenderer.js`, these tasks need scope review before execution. V3/V4 (title/end screen art) are renderer-agnostic and can proceed. V1/V2 (terrain variants/animation) require pixel-art equivalents, not ASCII additions.

| # | Task | Points | Notes |
|---|------|--------|-------|
| V1 | 3rd pixel scene variant per terrain | 3 | Pixel art equivalent of ASCII V1 — add third scene drawing function per terrain in `data/pixelScenes.js` |
| V2 | Directional weather animation | 2 | Already partially present in pixel renderer; extend for all weather types |
| V3 | Title screen pixel art / logo | 2 | Renderer-agnostic — HTML/CSS treatment |
| V4 | End screen win/lose scene cards | 2 | Can be pixel art canvas or CSS |
| V5 | Terrain-specific event panel border colors | 1 | CSS only — wire `data-terrain` from V4A work |
| V6 | Dashboard resource bar icons | 1 | CSS/unicode — replace plain labels |

---

### Unphased — Technical

| # | Task | Points | Priority | Notes |
|---|------|--------|----------|-------|
| T1 | API key proxy for OpenWeatherMap | 3 | HIGH | Key is hardcoded in `js/weather.js`. Must fix before any wide publication or press. |
| P3 | README.md | 2 | HIGH | Game now has `REFERENCES.md` and a research narrative — a README explaining the project, its scientific grounding, and how to run it locally is overdue. |
| T2 | Weather API error handling UI | 2 | medium | Silent failure currently; surface weather fetch errors in the log |
| T3 | Unit tests (`js/game.js`, `js/scoring.js`, `data/ssp.js`) | 5 | medium | `data/ssp.js` multiplier functions are now testable pure functions — good place to start |
| T4 | Accessibility (ARIA, keyboard nav) | 3 | low | |
| T5 | PWA offline support | 3 | low | |
| T6 | Analytics | 2 | low | |
| P1 | OG meta tags + social preview | 2 | low | |
| P2 | Personal site screenshot update | 1 | low | |

---

## Completed

| # | Task | Points | Session | Date |
|---|------|--------|---------|------|
| C1 | ASCII terrain renderer (replace canvas) | 8 | 1 | 2025-02-11 |
| C2 | 9 terrain types × 2 variants | 5 | 1 | 2025-02-11 |
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
| C15 | Slow down gameplay — travel speed 1200→2000ms, 1.5s delay on result continue | 1 | 2 | 2025-02-11 |
| C16 | Increase difficulty — higher burn rates, 30% event chance, buffed damage on risky choices | 2 | 2 | 2025-02-11 |
| C17 | Feedback export — download button + `data/feedback.json` seed | 2 | 2 | 2025-02-11 |
| C18 | Favicon refresh — terminal-themed SVG (AT monogram) | 1 | 2 | 2025-02-11 |
| C19 | Journal auto-scroll | 1 | 2 | 2025-02-11 |
| C20 | Narrative variety — 45 terrain-specific narratives | 2 | 2 | 2025-02-11 |
| C21 | Roadside encounters — 20 encounters, non-modal with resource fx | 3 | 2 | 2025-02-11 |
| C22 | Day/night cycle — 4-phase palette shifts via CSS classes | 3 | 2 | 2025-02-11 |
| C23 | Peril deduplication — recent event type suppression (95/70/40% penalties) | 2 | 3 | 2026-02-11 |
| C24 | 8 new event types — river crossing, iron caravan, flash freeze, blight, storm surge, refugee checkpoint, solar farm, abandoned hospital | 5 | 3 | 2026-02-11 |
| C25 | Creative endings — 90s action taglines keyed to dominant peril type | 2 | 3 | 2026-02-11 |
| C26 | Inventory matters — 18 item synergies across 28 events | 3 | 3 | 2026-02-11 |
| C27 | ASCII progress map — US outline with route/waypoint plotting, position tracker | 5 | 3 | 2026-02-11 |
| C28 | Party member deaths — travel & event death paths, family roster UI, end screen roster | 5 | 3 | 2026-02-11 |
| C29 | Pixel art renderer — canvas-based `ui/pixelRenderer.js` replacing ASCII renderer | 8 | 4 | 2026-04-14 |
| C30 | SSP/year scenario selection — setup screen with 3 years (2050/2075/2100) and 3 SSPs (SSP2-4.5 / SSP3-7.0 / SSP5-8.5) | 3 | 5 | 2026-06-13 |
| C31 | Climate risk multiplier system (`data/ssp.js`) — all multipliers grounded in IPCC AR6, Clausius-Clapeyron, Sweet & Park SLR, VPD/wildfire, Martinez-Villalobos heatwave duration, Climate Impact Lab mortality, FRBSF productivity | 5 | 5 | 2026-06-13 |
| C32 | SSP-driven event probability scaling — heat/flood/wildfire weights in `js/events.js` | 2 | 5 | 2026-06-13 |
| C33 | SSP-driven resource burn scaling — fuel and health drain in `js/travel.js` | 2 | 5 | 2026-06-13 |
| C34 | Post-game research summary (`ui/researchSummary.js`) — bespoke per-run narrative with inline citations, personalized to origin city, dominant perils, and specific multiplier values | 5 | 5 | 2026-06-13 |
| C35 | `REFERENCES.md` — full scientific citation record for all 8 sources, calibration assumption table | 1 | 5 | 2026-06-13 |
| CL1 | Remove deprecated/unused code — deleted `ui/asciiRenderer.js` (366 ln), `data/asciiArt.js` (1,257 ln), `ui/progressMap.js` | 2 | 6 | 2026-06-13 |
| CL2 | Update docstrings — JSDoc added to `travelTick()`, `selectEvent()`, `game.setup()`; module-level comments added to `travel.js`, `events.js` | 1 | 6 | 2026-06-13 |
| CL3 | Doc files current — `agents.md` fully rewritten for pixel renderer + SSP system; `CONTEXT.md` flagged as original brief with pointer to `agents.md` | 1 | 6 | 2026-06-13 |
| S1 | SSP-aware origin city descriptions — 6 cities × 3 SSPs, `getOriginDescription()` added to `data/cities.js` | 2 | 7 | 2026-06-13 |
| S2 | Departure journal entry with year and scenario — "Day 1: The Walker family departs Miami — 2100, SSP5-8.5. [city desc]" | 1 | 7 | 2026-06-13 |
| S3 | Dashboard scenario badge — `.scenario-badge` HUD element showing "SSP5-8.5 · 2100 · Hard" wired into `dashboard.setScenario()` | 1 | 7 | 2026-06-13 |
| S4 | Heatwave multi-tick duration — `activeHazard` field + drain-per-tick in `travel.js`, duration from `sspMultipliers.heatwaveDuration`, hazard indicator in dashboard | 3 | 7 | 2026-06-13 |
| S5 | SSP-aware destination descriptions — 4 cities × 3 SSPs in `data/cities.js` | 1 | 7 | 2026-06-13 |
| P2-V1 | Wire `data-terrain` to `.game-layout` in `pixelRenderer.js` so CSS vars cascade to info bar, event panel, dashboard | 3 | 8 | 2026-06-13 |
| P2-V2 | Sky/ground panels — canvas border → `var(--terrain-sky)`, info bar bg → `var(--terrain-ground)` with smooth transitions | 3 | 8 | 2026-06-13 |
| P2-V3 | Weather color tints — day/night + weather composed in `_timeFilter()`/`_weatherFilter()` as single `canvas.style.filter`; replaces CSS class approach | 2 | 8 | 2026-06-13 |
| P2-V4 | Event scene card theming — `[data-terrain^="event-"]` CSS rules tint event panel border/glow and event name to peril-type palette | 2 | 8 | 2026-06-13 |
| G22 | Shelter Dash: sturdy/fragile quality, per-shelter collapse timer (5s fragile / 8s sturdy), interior countdown, rubble flash on collapse | 4 | 9 | 2026-06-14 |
| FB1 | Event choice animation: selected choice highlights green, unchosen fade to 35%, 480ms before result loads | 1 | 9 | 2026-06-14 |

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
