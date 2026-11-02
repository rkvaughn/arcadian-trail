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

### Phase 4B: Strategic Gameplay Depth — *partial* (G4 remaining)

> The SSP system (Phase 5) makes this more valuable: a player choosing SSP5-8.5/2100 should face not just harder event odds but structurally harder route decisions. Route branching and faction reputation pair naturally with the new scenario framing.

| # | Task | Points | Priority | Notes |
|---|------|--------|----------|-------|
| P2-G4 | Faction reputation | 5 | 1 | `game.reputation = {}` per faction (refugees / merchants / militia). Accumulates across run. Expose in dashboard. Gate Iron Caravan trading and refugee checkpoint passage. |

---

### Phase 6: Real Climate Data per Peril — *proposed 2026-11-01*

> Today the event odds come from (a) live OpenWeatherMap conditions *right now* and (b) one global ΔT per SSP/year. Neither is specific to the place the player is driving through, and live 2026 weather says little about a 2100 run. Waypoints already carry lat/lon (`data/routes.js`), so each one can be tied to real, location-specific hazard data. Precompute it offline into static JSON — no runtime API key, works on GitHub Pages.

#### Standing rule — peril documentation (definition of done)

**Every peril the player can encounter must ship with a documentation file before it is enabled in `data/eventDefs.js`.** One file per event id at `docs/perils/<event_id>.md`, covering:

1. **Data source** — dataset name, publisher, URL/DOI, spatial + temporal resolution, license, date accessed, and the script that pulls it.
2. **How the game uses it** — which file/function reads it and which mechanic it drives (event weight, severity, duration, resource drain).
3. **Why it matters for climate risk** — the physical mechanism and who is exposed (plain-language, 1–2 paragraphs).
4. **How much it is likely to change over time** — projected change under each SSP (SSP2-4.5 / SSP3-7.0 / SSP5-8.5) for 2050 / 2075 / 2100, with the uncertainty range, each number cited to a source in `REFERENCES.md`. Where no published projection exists, say so — do not fill the gap.
5. **Limitations** — what the data does not capture and any calibration assumptions (with PI confirmation dates).

A short version of each doc should also surface in-game (event panel "Learn more" link and/or `ui/researchSummary.js`).

Event ids that need docs (climate-driven first): `wildfire`, `toxic_air`, `hurricane`, `flood`, `road_washout`, `swollen_river`, `king_tide`, `drought`, `heatwave`, `dust_storm`, `tornado`, `flash_freeze`, `grey_famine`, `water_contamination`, `power_outage`, `bridge_collapse`, `quarantine_zone`. Non-climate events (`positive`, `social`, `mechanical`) need a one-line note stating they are design-only.

#### Tasks

| # | Task | Points | Priority | Notes |
|---|------|--------|----------|-------|
| D1b | Peril-doc check | 1 | 1 | Template done (`docs/perils/_TEMPLATE.md`). Remaining: a check (script or T3 test) that fails if an enabled event id has no doc. 16 climate event ids still need docs. |
| D2 | Per-waypoint hazard profile pipeline | 5 | 1 | Offline Python script → `data/hazards/waypoints.json`. Candidate source: FEMA National Risk Index (county-level, per-hazard risk for wildfire, hurricane, riverine + coastal flooding, tornado, heat wave, drought, cold wave). Reachable via ArcGIS REST — reuse `~/Projects/utilities/arcgis_rest.py`. |
| D3 | Peril-specific source datasets | 5 | 2 | Evaluate per peril: USFS Wildfire Risk to Communities; NOAA HURDAT2 (hurricane tracks); NOAA SPC tornado database; NOAA Storm Events Database; NOAA 2022 Sea Level Rise Technical Report + high-tide flooding outlooks (`king_tide`); US Drought Monitor; NOAA HMS smoke / EPA AirNow (`toxic_air`). Verify each source is still online before building on it. |
| D4 | Location-specific SSP projections | 5 | 2 | Replace the single global ΔT with downscaled CMIP6 projections at each waypoint (candidates: NASA NEX-GDDP-CMIP6, LOCA2). Use for heat days, extreme precip, and drought indices by SSP/year. Fifth National Climate Assessment (NCA5) for regional context. |
| D5 | Rewire `js/events.js` weighting to hazard JSON | 3 | 3 | Event weight = f(waypoint hazard profile, SSP projection). Keep live weather as flavor text only, or drop it — also resolves T1 (API key). |
| D6 | Scale currently-unscaled perils | 2 | 3 | Hurricane, tornado, drought, dust storm, flash freeze, and smoke currently get no SSP scaling (or borrow the flood rate). Each needs its own cited relationship — or an explicit "no robust projection" note in its doc. |
| D7 | In-game "Learn more" from peril docs | 2 | 4 | Event panel link + research summary section built from `docs/perils/`. |
| D9 | Hurricane track passes near inland waypoints | 2 | 3 | Add "hurricanes whose track passed within 60 nmi" from HUTrackDB `track_points` (NOAA Historical Hurricane Tracks style), so inland stops get local numbers instead of the nearest-coast fallback. |
| D10 | Hurricane projections → severity mechanic | 3 | 3 | `docs/perils/hurricane.md` §4 has verbatim IPCC AR6 / Knutson 2020 values (pending PI review). The sources support scaling hurricane *severity* (rain, Cat 4–5 share, surge) with warming, not frequency. Needs CR1 resolved first (ΔT ↔ warming-level mapping). |
| D8 | Location-gate place-specific events | 2 | 2 | `terrainBonus` only boosts odds (×1.8), never excludes — e.g. `king_tide` ("The Atlantic is reclaiming the highway") fired in the Phoenix desert during testing on 2026-11-01. Gate on the waypoint's hazard profile from D2 (e.g. coastal flood exposure) instead of a hardcoded terrain list. |

#### Calibration review items (found 2026-11-01 — verify, do not change without PI sign-off)

| # | Item | Notes |
|---|------|-------|
| CR1 | `DELTA_T` baseline label | Comment says "above 1995–2014", but the 2100 values match AR6 SPM.1's 1850–1900 baseline. The 2050 values don't clearly match either baseline. Re-check against SPM Table SPM.1. |
| CR2 | `SLR` SSP5-8.5 2100 = 1.01 m | Labeled as median; check against AR6 WG1 Table 9.9 — this may be the upper end of the likely range, not the median. SLR comes from Ch. 9 / SPM B.5, not "Table SPM.2". |
| CR3 | `healthDrainDestination` coefficient | Comment derives ~0.03/°C but code uses 0.012; the 0.85 floor has no cited source. |
| CR4 | `js/weather.js` risk thresholds | 95°F, 110°F, 20%/80% humidity, 30/50 mph wind and the divisors are uncited. Cite them or retire them under D5. |
| CR5 | `baseProbability` in `data/eventDefs.js` | Game-design values, not climate data — label them as such in the code and in the peril docs. |

---

### Phase 7: Graphics Overhaul — *proposed 2026-11-01*

| # | Task | Points | Priority | Notes |
|---|------|--------|----------|-------|
| GX7 | Data-driven visuals | 3 | 2 | Pairs with Phase 6: water line height from the run's SLR value, smoke density from the waypoint's wildfire/smoke data, sun glare from heat projections. Makes the climate data visible. |
| GX8 | Vehicle damage states | 2 | 3 | The family car is now a procedural NES-style sprite with the family visible in the windows and luggage on the roof (GX12/GX13). Remaining: damage states (dents, cracked glass, smoke) driven by the health meter. |
| GX11 | Frogger flood speed-up never triggers | 1 | 4 | `ui/froggerDash.js` checks `weatherData.icon === 'flood'`, but `js/weather.js` never emits `'flood'`. Key it to `'rain'`/`'storm'` or to the event that launched the mini-game. |
| GX10 | Unique scene per climate event | 5 | 4 | Partly done in GX12: cut scenes now branch on event id (drought / dust_storm / heatwave, road_washout / swollen_river / king_tide, toxic_air, flash_freeze, bridge_collapse, the social and health variants). Remaining: hurricane/tornado have one scene each; positive events share a scene with small prop variants. |

> **GX12/GX13 note (2026-11-01):** every scene (travel, events, title, end, mini-game cards) now draws at native 320×180 with the `ui/cutscenes/` kit. GX3–GX6, GX9, V1 and V2 are done; `data/pixelScenes.js` is retired.

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

> **Note:** V1–V6 were written against the ASCII renderer. Since `ui/pixelRenderer.js` replaced `ui/asciiRenderer.js`, these tasks need scope review before execution. V3/V4 are done (see GX12). V1/V2 (terrain variants/animation) require pixel-art equivalents, not ASCII additions.

| # | Task | Points | Notes |
|---|------|--------|-------|
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
| P2-G1 | Route branching at waypoints — `WAYPOINT` state, Safe/Fast route modal, `routeModifier` applied to fuel burn and event chance | 5 | 10 | 2026-06-14 |
| P2-G2 | Game flag system — `game.flags = {}`, `setsFlag` on event choices, `conditions.flags` gating in `selectEvent()` | 2 | 10 | 2026-06-14 |
| P2-G3 | Multi-stage linked events — solar_signal→relay_cache and refugees_helped→refugee_stash pairs | 3 | 10 | 2026-06-14 |
| GX1 | Heat weather now renders — `js/weather.js` emitted `'hot'` but renderer checked `'heat'`; renamed, and added `drawHeatShimmer` overlay to `drawWeather` | 1 | 11 | 2026-11-01 |
| GX2 | Smooth render loop — `requestAnimationFrame` (~60 fps, was 4 fps) with fractional time-based `frame` clock (1 unit = 250 ms, so animation speeds unchanged); `Math.floor(frame)` at `===`/index sites; DOM writes cached; progress map still throttled to 250 ms | 2 | 11 | 2026-11-01 |
| G23 | Shed Dash — replaces ASCII Shelter Dash with a pixel-art canvas mini-game (`ui/shedDash.js`): family line runs to a rickety shed; heat = sluggish drift + stamina/shade, wind = telegraphed gusts + lee cover + flying debris (+ pools for hurricane/flood), fire = ember-warned spot fires, firebreak lines, advancing fire front, smoke. Peril taken from the triggering event; keyboard + tap/drag; outcome effects unchanged. Bot-tested balance across difficulty | 8 | 12 | 2026-11-01 |
| UI1 | One-screen layout + pop-up choices — scene, trip progress bar and US map sized to fit the window together (stage width from window height; landscape phones too); event/result/route cards pop up over the scene (delayed ~1 s for events, peek-to-fold button, phone reveal); graphical trip HUD replaces the ASCII progress bar; game-over card has no dead Continue | 5 | 13 | 2026-11-01 |
| SUP1 | Supplies drive the odds — every hazard choice shows a success % (base 50%, cap 95%) raised by fitting supplies (`js/supplies.js`); failure = losses ×1.5, gains ×0.5, own narrative; consumables spent when they help and give their stated effect; every hazard helped by 4–6 of 11 items; mini-game perks (Shed Dash, Frogger, Barricade); odds + supplies shown on choice buttons and result card | 5 | 12 | 2026-11-01 |
| SUP2 | 1-credit Water Bottles — stackable quantity input + "Fill budget" so the whole budget can be spent; each item shows "Helps with" perils on the setup screen | 2 | 12 | 2026-11-01 |
| G24 | Shed Dash rebuilt as an original 8-bit side-scrolling platformer (NES-era style, own art); stronger gusts, harder overall; respawn past pits (no fall loops); bot-tested balance with and without supplies | 8 | 12 | 2026-11-01 |
| D-HU | HUTrackDB hurricane linkage — `scripts/build_hurricane_stats.py` → `data/hurricaneStats.js` (51 waypoints); "Real hurricane record" card in hurricane events (`ui/hurricaneCard.js`), end-screen record + citation, `docs/perils/hurricane.md` (first peril doc), template `docs/perils/_TEMPLATE.md`, REFERENCES entries. Calibrations (60 nmi radius, 1991 era, nearest-coast fallback) confirmed by PI 2026-11-01 | 5 | 12 | 2026-11-01 |
| GX12 | Cut scene overhaul — NES-quality pixel art for every non-interactive scene. New `ui/cutscenes/` kit at native 320×180 (outlined string-art sprites, 5×7 bitmap font + banded logo text, Bayer-dithered skies, wrapping parallax strips, particles, flame walls, heat shimmer, lightning) and a director with a pixel-dissolve intro + sliding title banner. 10 event scenes rebuilt with per-peril lighting, intro animations, the family + station wagon, and event-id variants; title (V3), win/lose end screens (V4, lose scene by dominant peril), and Barricade/River win-lose cards. Old 80×45 event scenes removed from `data/pixelScenes.js`. Dev viewer: `dev/cutscenes.html` (serve with `python3 dev/serve.py`) | 13 | 13 | 2026-11-01 |
| GX13 | Travel scene overhaul — the driving view rebuilt on the cut scene kit at native 320×180 (`ui/cutscenes/travel/`): 9 terrains × 3 variants (variant per waypoint), 3–4 parallax layers incl. 960 px mid layers, perspective road (per-row scroll), the family car with the family visible in the windows, suspension bob, dust/spray, headlights; dawn/day/dusk/night sky palettes + multiply-tinted land replace the CSS filters (GX5); in-scene weather — rain, drizzle, storm + lightning, snow cover, fog banks, wind streaks/leaves, heat shimmer + glare (V2, GX6); roadside sign with the current waypoint name; Bayer dissolve between scenes and back from cut scenes. Closes GX3, GX4, GX5, GX6, GX9, V1, V2. `data/pixelScenes.js` removed | 13 | 13 | 2026-11-01 |
| GX14 | Mini-games at end-screen quality — all three redrawn at native 320×180 with the `ui/cutscenes/` kit. **Shed Dash:** physics stay in the bot-tested 160×90 logical units (tuning untouched), art drawn at 2× detail (`ui/minigames/shedArt.js`): per-peril dithered skies (heat, dust, wind, storm, fire), mesas/ridges with silhouettes, turbines, 16 px grass/dirt tiles with flowers, outlined runner sprites sized to the hitboxes in the cut-scene family colors (4-frame run, jump, crouch, collapse), wrecked car, crates, fence, swaying trees, saguaro, flame-column vents, chasing fire wall, flooded pits, rickety shed with lit door; banded-logo intro/ending, kit-font HUD. **River crossing:** bark logs and lashed debris rafts on banded water, mini wood-panel wagon, family on the bank, flood storm look; logs now move per second, not per frame. **Crash the Barricade:** ASCII → canvas pixel art on `#asciiDisplay` (burning skyline, 8-lane highway, the wagon, sawhorses/wrecks/jersey barriers, nitro/supply pickups); same rules. Touch buttons on all three; each saves/restores canvas filter and info bar. Shared bits in `ui/minigames/art.js`; dev bench `dev/minigames.html` | 8 | 14 | 2026-11-01 |
| V3 | Title screen pixel art / logo — animated dawn road trip with banded pixel logo (part of GX12) | 2 | 13 | 2026-11-01 |
| V4 | End screen win/lose scene cards — refuge arrival with fireworks / abandoned car at dusk themed by dominant peril (part of GX12) | 2 | 13 | 2026-11-01 |
| P2-G5 | Item consumable limits — `maxUses: N` on first_aid, `game.itemUses = {}` tracker, enforced in `applyChoice()` | 2 | 10 | 2026-06-14 |

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
