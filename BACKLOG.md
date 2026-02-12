# Arcadian Trail — Task Backlog

> Persistent backlog for tracking work across Claude Code sessions.
> **Points** estimate relative effort/cost (1 = trivial, 2 = small, 3 = medium, 5 = large, 8 = epic).
> A typical session with ~$5 remaining can handle ~8-12 points of work.

---

## In Progress

| # | Task | Points | Notes |
|---|------|--------|-------|
| — | *(none — Phase 2 in progress)* | — | — |

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
| G7 | Route branching at waypoints (safer vs. faster) | 5 | 6 | defer |

### Phase 3: Marquee Feature (8 pts)
| # | Task | Points |
|---|------|--------|
| G12 | Shelter Dash mini-game — own `requestAnimationFrame` loop, `@` character dodges climate hazards, collects supplies, reaches shelter. Prototype standalone first, then integrate. | 8 |

### Phase 4: Polish & Utility (13 pts)
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
