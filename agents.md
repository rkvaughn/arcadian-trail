# agents.md — Arcadian Trail

> First file any AI agent should read. Provides context-efficient orientation. Read this before touching any code.

---

## Project in One Sentence

A browser-based climate migration survival game (Oregon Trail format) built in vanilla ES6 modules — player leads a family across a crisis-altered USA under a selectable year (2050/2075/2100) and IPCC emission pathway (SSP2-4.5 / SSP3-7.0 / SSP5-8.5), managing five resources, surviving climate events, and playing three mini-games.

---

## Minimal Context Load (Token Budget)

Read these files, in this order, to be oriented. Skip everything else unless the task specifically requires it.

| Priority | File | Why |
|----------|------|-----|
| 1 | `agents.md` (this file) | Orientation |
| 2 | `BACKLOG.md` | Current phase, task priorities, completion status |
| 3 | `js/game.js` | State machine (9 states), Game class, resource model |
| 4 | `js/main.js` | GameController — wires all modules together |

**Only if task involves rendering or visuals:**
- `ui/pixelRenderer.js` — canvas-based pixel art renderer (replaced ASCII renderer in Phase 4)
- `data/pixelScenes.js` — procedural pixel scene drawing functions per terrain/event type
- `data/ssp.js` — terrain and scenario color context (SSP difficulty palette used by HUD)
- `style.css` — terrain palette CSS vars (`[data-terrain="..."]`), day/night classes, SSP/year UI, research summary panel

**Only if task involves events, gameplay logic, or SSP mechanics:**
- `data/eventDefs.js` — 28+ crisis events with choices, itemRequired/itemBonus branches, minigame triggers
- `js/events.js` — event selection (peril deduplication + SSP multipliers) and choice resolution
- `js/travel.js` — per-tick resource burn with terrain, weather, family trait, and SSP multipliers
- `data/ssp.js` — SSP scenario definitions and `computeSSPMultipliers()` — the scientific core
- `data/items.js` — 10 inventory items with synergy definitions
- `REFERENCES.md` — full citations for all 8 scientific sources calibrating the SSP system

**Only if task involves mini-games:**
- `ui/shelterDash.js` — non-scrolling 2D shelter-find mini-game (466 ln)
- `ui/barricadeRunner.js` — speed-based escape runner mini-game (535 ln)
- `ui/froggerDash.js` — canvas-based Frogger river crossing mini-game

**Only if task involves setup UI or end screen:**
- `ui/screens.js` — setup (year/SSP/city/trait/items), end screen (research summary, feedback)
- `ui/researchSummary.js` — post-game bespoke research narrative generator

**Skip unless explicitly needed:**
- `data/narratives.js` — terrain flavor text (45 entries)
- `data/routes.js` — city-to-city waypoint graph
- `data/cities.js` — city metadata (6 origins, 4 destinations)
- `data/encounterDefs.js` — roadside encounter table
- `js/characters.js`, `js/scoring.js`, `js/weather.js` — family creation, end-game scoring, OpenWeatherMap fetch
- `ui/dashboard.js`, `ui/logger.js`, `ui/eventPanel.js`, `ui/mapOverlay.js`

---

## Current State (as of 2026-06-13)

**Phase 5 in progress (SSP narrative integration).** Phases 0–4 are complete.

| Feature | Status |
|---------|--------|
| 9 terrain types, pixel art renderer (`ui/pixelRenderer.js`) | ✅ |
| Weather overlay (rain/snow/fire/heat/mist) | ✅ |
| 28+ climate crisis events with item synergies | ✅ |
| Peril deduplication (no back-to-back same type) | ✅ |
| Party member deaths (dysentery + event causes) | ✅ |
| ASCII progress map (US outline, route, position) | ✅ |
| Shelter Dash mini-game (2D field, weather damage) | ✅ |
| Barricade Runner mini-game (speed/collision escape) | ✅ |
| Frogger river crossing mini-game (canvas, pixel art) | ✅ |
| Mini-game choice triggers from eventDefs | ✅ |
| Pixel art event scene cards (per-event POV) | ✅ |
| Creative endings (90s action taglines by peril) | ✅ |
| Day/night cycle (4-phase CSS palette) | ✅ |
| Real-time weather API (OpenWeatherMap) | ✅ |
| Year selection: 2050 / 2075 / 2100 (Easy/Medium/Hard) | ✅ |
| SSP scenario selection: SSP2-4.5 / SSP3-7.0 / SSP5-8.5 | ✅ |
| SSP climate risk multipliers (IPCC-grounded, `data/ssp.js`) | ✅ |
| SSP-scaled event probabilities (heat/flood/wildfire) | ✅ |
| SSP-scaled resource burn (fuel/health) | ✅ |
| Post-game research summary with inline citations | ✅ |
| `REFERENCES.md` — 8 scientific sources, calibration table | ✅ |
| SSP-aware city descriptions (Phase 5 S1) | ⬜ |
| Dashboard scenario badge (Phase 5 S3) | ⬜ |
| Multi-tick heatwave duration events (Phase 5 S4) | ⬜ |

**Next priority:** Phase 0 cleanup (CL1–CL3), then Phase 5 SSP narrative integration.

---

## Architecture Reference

### State Machine (`js/game.js`)
```
TITLE → SETUP → TRAVELING → EVENT → DECISION → RESULT → TRAVELING
                                               ↘ MINIGAME ↗
                          ↘ WIN / LOSE
```

### SSP Scenario System (`data/ssp.js`)
Called once at game setup from `game.setup()`. Draws stochastic sub-lethal health multiplier
from Uniform[5, 10] and computes all risk multipliers from published IPCC/literature values:

```
flood_risk_inland  = 1.07^ΔT              (Clausius-Clapeyron; Fischer & Knutti 2016)
flood_risk_coastal = 1.07^ΔT × (1+SLR_m) (+ Sweet & Park 2014 surge amplification)
wildfire_risk      = 1.07^(2×ΔT)          (VPD × fire area ∝ VPD²; Abatzoglou 2016)
heatwave_duration  = exp(ΔT / σ), σ=4°C   (Martinez-Villalobos et al. 2025)
fuel_burn          = 1 + ΔT × 0.021       (FRBSF 2023; −1.05%/°C × 2× amplifier)
health_drain       = 1 + ΔT × 0.0069 × U[5,10]  (Climate Impact Lab 2026)
```

Multipliers stored on `game.sspMultipliers`. Applied in `js/travel.js` (burn rates) and
`js/events.js` (event probability weights). Full derivations in `REFERENCES.md`.

### Rendering Pipeline (`ui/pixelRenderer.js`)
1. Select procedural pixel scene from `data/pixelScenes.js` based on terrain/event type
2. Composite vehicle sprite at road position
3. Apply weather overlay (pixel-level color pass)
4. Apply terrain transition wipe if `transitionFrame >= 0`
5. Set `canvas.setAttribute('data-terrain', terrain)` to activate CSS palette vars
6. Apply day/night CSS class to canvas container

### Resource Model
Five meters: `fuel`, `water`, `food`, `health`, `morale` (0–100).
- Travel burns all five per tick (base rates in `js/travel.js`)
- SSP multipliers scale `fuel` and `health` burn after terrain and trait modifiers
- Events modify deltas — risky choices amplify loss
- Family deaths reduce `morale`; leader death = `LOSE`

### Event System
- `data/eventDefs.js` — static pool: `perilType`, `choices[]`, `itemRequired`, `itemBonus`, `minigame`
- `js/events.js` — weights events by terrain + weather + peril deduplication + SSP multipliers; resolves choice outcomes
- `applyChoice()` handles item consumption, minigame routing, family death RNG

### Mini-Game Interface
All three mini-games accept a callback `onComplete(result)` where `result = { survived: bool, effects: {}, narrative: string }`.
The caller (`js/main.js`) applies `result.effects` to resources and routes to RESULT state.

---

## Agent Roles

### Claude
Primary agent for all work on this project:
- All JavaScript, HTML, CSS changes
- Game logic, events, items, routes, flags
- Pixel art scene authoring (follow 80×45 logical pixel format in `data/pixelScenes.js`)
- Backlog management — update `BACKLOG.md` on task completion
- Scientific calibration — all quantitative values must cite a source in `REFERENCES.md`
- Git commits and pushes
- Maintaining this `agents.md`

### Gemini
Use for:
- Designing a multi-stage event flag system (graph design, consequence mapping)
- Reviewing gameplay balance (resource curves, event severity distribution)
- Generating large batches of new event definitions or narrative text

When delegating to Gemini: pass `data/eventDefs.js` + `js/game.js` + the specific design question. Do not pass the full project.

---

## Key Technical Constraints

- **No build tool** — vanilla ES6 `import`/`export`. All modules referenced by relative path. No npm packages at runtime.
- **GitHub Pages auto-deploy** — push to `main` → live within ~60 seconds. No build step needed.
- **No inline styles** — all colors via CSS classes or CSS custom properties. Terrain palettes live in `style.css` as `[data-terrain="..."]` blocks; activated by setting `data-terrain` attribute on the canvas element.
- **Pixel scene format** — scenes are procedural drawing functions in `data/pixelScenes.js` operating on an 80×45 logical pixel grid rendered at 4× scale. Do not add static ASCII art — the ASCII renderer has been removed.
- **OpenWeatherMap API key hardcoded** in `js/weather.js` — known security gap (backlog T1). Do not add any additional secrets to source files.
- **Data integrity** — all quantitative values in `data/ssp.js` must be traceable to a source in `REFERENCES.md`. Never hardcode invented numbers for climate risk mechanics.

---

## What NOT to Do

- Do not reference or recreate `ui/asciiRenderer.js` or `data/asciiArt.js` — both deleted; the pixel renderer is the sole renderer
- Do not reference `ui/progressMap.js` — deleted; use `ui/mapOverlay.js` for map overlay work
- Do not hardcode colors as inline styles — always use CSS classes or CSS custom properties
- Do not add npm dependencies — the project has no build step; everything must run natively in the browser
- Do not commit the OpenWeatherMap API key to any new file (it's already in `js/weather.js` — don't spread it)
- Do not modify `data/feedback.json` manually — it is written by the in-game feedback form
- Do not invent quantitative climate values — all SSP multipliers must cite `REFERENCES.md`

---

## Running Locally

```bash
cd ~/Projects/climate-platformer
npx serve .   # or: python3 -m http.server 8080
# open http://localhost:8080
```

GitHub Pages deployment: push to `main` → auto-deploys via `.github/workflows/deploy.yml`.
