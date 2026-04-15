# agents.md — Arcadian Trail

> First file any AI agent should read. Provides context-efficient orientation. Read this before touching any code.

---

## Project in One Sentence

A browser-based climate migration survival game (Oregon Trail format) built in vanilla ES6 modules — player leads a family across a crisis-altered USA, making resource tradeoffs, surviving climate events, and playing two mini-games.

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
- `ui/asciiRenderer.js` — terrain/event/vehicle rendering, colorization pipeline, day/night CSS
- `data/asciiArt.js` — all ASCII art: 9 terrain types × 2 variants, vehicle sprite, weather overlays, event scene cards
- `style.css` — color classes (`ascii-vehicle`, `ascii-fire`, `ascii-water`, etc.), day/night palette CSS vars

**Only if task involves events or gameplay logic:**
- `data/eventDefs.js` — 28+ crisis events with choices, itemRequired/itemBonus branches, minigame triggers
- `js/events.js` — event selection (peril deduplication) and choice resolution
- `js/travel.js` — per-tick resource burn rates, weather risk application
- `data/items.js` — 10 inventory items with synergy definitions

**Only if task involves mini-games:**
- `ui/shelterDash.js` — non-scrolling 2D shelter-find mini-game (466 ln)
- `ui/barricadeRunner.js` — speed-based escape runner mini-game (535 ln)

**Skip unless explicitly needed:**
- `data/narratives.js` — terrain flavor text (45 entries)
- `data/routes.js` — city-to-city waypoint graph
- `data/cities.js` — city metadata
- `data/encounterDefs.js` — roadside encounter table
- `js/characters.js`, `js/scoring.js`, `js/weather.js` — family creation, end-game scoring, OpenWeatherMap fetch
- `ui/screens.js`, `ui/dashboard.js`, `ui/logger.js`, `ui/eventPanel.js`, `ui/progressMap.js`

---

## Current State (as of 2026-04-14)

**Phase 3 complete.** All planned features through Phase 3 are shipped and deployed to GitHub Pages.

| Feature | Status |
|---------|--------|
| 9 terrain types × 2 ASCII variants | ✅ |
| Weather overlay (rain/snow/fire/heat/mist) | ✅ |
| 28+ climate crisis events with item synergies | ✅ |
| Peril deduplication (no back-to-back same type) | ✅ |
| Party member deaths (dysentery + event causes) | ✅ |
| ASCII progress map (US outline, route, position) | ✅ |
| Shelter Dash mini-game (2D field, weather damage) | ✅ |
| Barricade Runner mini-game (speed/collision escape) | ✅ |
| Mini-game choice triggers from eventDefs | ✅ |
| ASCII event scene cards (per-event first-person POV) | ✅ |
| Creative endings (90s action taglines by peril) | ✅ |
| Day/night cycle (4-phase CSS palette) | ✅ |
| Real-time weather API (OpenWeatherMap) | ✅ |

**Next:** Phase 3b (mini-game polish, G22) and the two new strategic priorities below.

---

## Strategic Priorities (New Direction — 2026-04-14)

The user has specified two high-priority improvement goals that should guide all new work:

### Priority 1 — Strategic Gameplay Depth

The current game plays primarily as a linear resource-drain survival march. The goal is to add **meaningful strategic decisions** with long-term consequences — choices that feel like tradeoffs between competing goods, not just obvious risk/reward.

**Design targets:**
- Route branching at waypoints (backlog G7): safer path costs more time/fuel; faster path risks higher event severity
- Resource trading at encounter sites (trade caravans, checkpoints, abandoned hospitals)
- Faction or alliance mechanics: make choices that affect how groups (checkpoints, caravans, militias) treat you later
- Multi-stage events: decisions in early events have downstream consequences in later ones (not just per-event isolation)
- Inventory scarcity: items should feel scarce enough that players agonize over use — currently synergies trigger without enough constraint

**Implementation guidance:**
- G7 (route branching) is already in the backlog — implement this first; it has the most structural leverage
- To add multi-stage consequences, add an optional `setsFlag` field to eventDef choices and check `game.flags[flagName]` in later event `conditions`
- For faction relationships, add a `relationships` dict to `Game` state and expose numeric reputation values that gate event choices

### Priority 2 — 1985 Oregon Trail Color Imagery

The current aesthetic is dark-terminal monochrome (post-apocalyptic green-on-black). The goal is to shift toward the **visual character of the 1985 Apple IIe Oregon Trail**: color-differentiated terrain panels with strong chromatic identity — greens for grassland, browns for desert, blues for water, grays for mountains — with solid color fields rather than monochrome text.

**What the 1985 Oregon Trail looked like:**
- Apple IIe composite video: ~4–6 distinct colors, applied in horizontal bands
- Sky panel (cyan/blue), ground panel (green or brown), road stripe, weather color
- NOT photorealistic — solid color blocks with text/ASCII overlaid
- Color was terrain identity: you knew immediately you were in plains vs. desert vs. mountains

**Implementation approach:**
- Replace the current dark `#0d1117` terminal background with terrain-specific background colors per zone
- Each terrain type gets a CSS color palette: sky color, ground color, accent color
- Apply via CSS variables scoped to terrain type (`data-terrain="coastal"` → `--sky: #5ba3c9; --ground: #3d7a8a`)
- ASCII art characters can remain; the colored background panels behind them carry the visual weight
- The `AsciiRenderer` already applies day/night CSS phase classes — extend the same mechanism for terrain palette
- Weather overlays should tint on top of terrain colors (rain → darken, heat → orange cast)

**Terrain color targets (1985 Oregon Trail palette-inspired):**

| Terrain | Sky | Ground | Accent |
|---------|-----|--------|--------|
| Plains / grassland | `#87ceeb` (sky blue) | `#4a7c2f` (grass green) | `#8b6914` (dirt) |
| Desert | `#d4a843` (ochre) | `#c4873a` (sand brown) | `#8b4513` (rock) |
| Mountain | `#b0c4de` (steel blue) | `#6b7280` (slate) | `#4a5568` (stone) |
| Forest | `#7ab648` (canopy) | `#2d5a1b` (deep green) | `#5c4a2a` (bark) |
| Coastal | `#4a9eda` (ocean blue) | `#1a5c7a` (deep water) | `#c2b280` (sand) |
| Urban | `#9ca3af` (overcast) | `#4b5563` (concrete) | `#6b7280` (asphalt) |
| Arctic | `#e0f2fe` (pale sky) | `#bfdbfe` (snow blue) | `#93c5fd` (ice) |
| Swamp | `#78716c` (murk) | `#374151` (dark mud) | `#6b8e23` (algae) |

---

## Agent Roles

### Claude
Primary agent for all work on this project:
- All JavaScript, HTML, CSS changes
- Game logic additions (events, items, routes, flags)
- ASCII art authoring (follow existing 18-row × 70-char format exactly)
- Backlog management — update BACKLOG.md on task completion
- Git commits and pushes
- Writing and maintaining this `agents.md`

### Gemini
Use for:
- Designing a multi-stage event flag system (graph design, consequence mapping)
- Reviewing gameplay balance (resource curves, event severity distribution)
- Generating large batches of new event definitions or narrative text

When delegating to Gemini: pass `data/eventDefs.js` + `js/game.js` + the specific design question. Do not pass the full project.

---

## Architecture Reference

### State Machine (js/game.js)
```
TITLE → SETUP → TRAVELING → EVENT → DECISION → RESULT → TRAVELING
                                               ↘ MINIGAME ↗
                          ↘ WIN / LOSE
```

### Rendering Pipeline (ui/asciiRenderer.js)
1. Select terrain variant or event scene card (`data/asciiArt.js`)
2. Composite vehicle sprite at `vehicleCol` position
3. Apply weather overlay (character substitution)
4. Apply terrain transition wipe if `transitionFrame >= 0`
5. Colorize via `colorize()` → character → CSS span mapping
6. Apply day/night CSS class to `#ascii-display`

### Resource Model
Five meters: `fuel`, `water`, `food`, `health`, `morale` (0–100).
- Travel burns all five per tick (rates in `js/travel.js`)
- Events modify deltas — risky choices amplify loss
- Family deaths reduce `morale`; leader death = `LOSE`

### Event System
- `data/eventDefs.js` — static event pool with `perilType`, `choices[]`, `itemRequired`, `itemBonus`, `minigame`
- `js/events.js` — selects event (suppresses recent peril types), resolves choice outcomes
- `applyChoice()` in `js/events.js` handles item consumption, minigame routing, family death RNG

### Mini-Game Interface
Both mini-games accept a callback `onComplete(result)` where `result = { won: bool }`. The caller (`js/main.js`) reads `result.won` and branches to the win or lose outcome narrative.

---

## Key Technical Constraints

- **No build tool** — vanilla ES6 `import`/`export`. All modules referenced by relative path. No npm packages at runtime.
- **GitHub Pages auto-deploy** — push to `main` → live within ~60 seconds. No build step needed.
- **No inline styles** — all colors via CSS classes or CSS custom properties. The `colorize()` function in `ui/asciiRenderer.js` maps character tokens → CSS class names defined in `style.css`.
- **ASCII art format is strict** — every terrain scene must be exactly 18 rows × 70 chars. Shorter rows cause rendering misalignment.
- **OpenWeatherMap API key hardcoded** in `js/weather.js` — known security gap (backlog T1). Do not add any additional secrets to source files.

---

## Task Registry (New Work)

Prioritized list for the two strategic priorities. Add to BACKLOG.md before starting each item.

### Visual Priority (P2-V series)

| # | Task | Points | Description |
|---|------|--------|-------------|
| P2-V1 | Terrain color palette system | 3 | Add `data-terrain` attribute to `#ascii-display`; define CSS vars per terrain in `style.css`; set attribute in `AsciiRenderer.render()` before colorizing |
| P2-V2 | Sky/ground background panels | 3 | Split `#ascii-display` into sky rows (0–11) and ground rows (12–17) via CSS nth-child or row wrapping; apply terrain-scoped background colors |
| P2-V3 | Weather color tints | 2 | On rain → darken sky vars 20%; on heat → shift ground to orange cast; on snow → lighten all vars |
| P2-V4 | Event scene card color theming | 2 | Apply perilType-scoped colors during EVENT/RESULT states (wildfire → red/orange, flood → blue, freeze → ice palette) |

### Gameplay Priority (P2-G series)

| # | Task | Points | Description |
|---|------|--------|-------------|
| P2-G1 | Route branching at waypoints (G7) | 5 | At each waypoint, offer Safe Route (costs +20% fuel) vs Fast Route (higher event chance). Implement choice in `js/travel.js` + new WAYPOINT state. |
| P2-G2 | Game flag system | 2 | Add `game.flags = {}` to `Game` class; add `setsFlag` field to eventDef choices; check `game.flags[x]` in event `conditions` |
| P2-G3 | Multi-stage events (2–3 linked events) | 3 | Author 2–3 event pairs where completing Event A with choice X sets a flag that unlocks/triggers Event B later with a callback payoff |
| P2-G4 | Faction reputation (checkpoints/caravans) | 5 | Add `game.reputation = {}` (keyed by faction name); expose in dashboard; wire reputation gates into 3–4 existing events (iron caravan, refugee checkpoint) |
| P2-G5 | Item scarcity — consumable limits | 2 | Mark items with `maxUses: N` in `data/items.js`; track `game.itemUses = {}` in Game; check in event resolution |

---

## What NOT to Do

- Do not load `data/asciiArt.js` (1,257 ln) unless you are specifically editing art or the rendering pipeline
- Do not load both mini-game files unless you are editing mini-game logic
- Do not hardcode colors as inline styles — always use CSS classes or CSS custom properties
- Do not break the 18 × 70 ASCII art grid constraint
- Do not add npm dependencies — the project has no build step; everything must run natively in the browser
- Do not commit the OpenWeatherMap API key to any new file (it's already in `js/weather.js` — don't spread it)
- Do not modify `data/feedback.json` manually — it is written by the in-game feedback form

---

## Running Locally

```bash
cd ~/Projects/climate-platformer
npx serve .   # or: python3 -m http.server 8080
# open http://localhost:8080
```

GitHub Pages deployment: push to `main` → auto-deploys.
