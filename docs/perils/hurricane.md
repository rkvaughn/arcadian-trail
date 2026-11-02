# Peril: Hurricane (`hurricane`)

| | |
|---|---|
| Event id(s) | `hurricane` |
| `perilType` | `hurricane` |
| Status | draft. Data source and calibrations PI-confirmed 2026-11-01; projections in §4 pending PI review |
| Last updated | 2026-11-01 |

## 1. Data source

- **Dataset:** HUTrackDB, a curated hurricane track and landfall database
  (R. K. Vaughn, 2026). Build of 2026-10-07, commit `175e561`, schema 1.0.0.
- **URL:** https://github.com/rkvaughn/HUTrackDB
- **Built from:** NOAA National Hurricane Center HURDAT2 best-track data:
  - Atlantic 1851–2025 (`hurdat2-atl-1851-2025-092326.txt`, revised 2026-09-23)
  - NE / N-Central Pacific 1949–2025 (`hurdat2-nepac-1949-2025-092926.txt`, revised 2026-09-29)
- **What HUTrackDB adds:** HURDAT2's own landfall flag is incomplete. Most
  importantly, continental US landfalls in 1971–1990 are not reliably flagged.
  HUTrackDB detects every coastline crossing geometrically and records the wind
  and Saffir-Simpson category at the crossing. It is validated against NOAA's
  *All U.S. Hurricanes* list: zero reference storms missed (see its QA report).
- **Coverage:** point locations of every landfall, 1851–2025 (Atlantic) and
  1949–2025 (Pacific).
- **License:** HURDAT2 is a US Government work (public domain). HUTrackDB is a
  public repository; cite it as above.
- **Pipeline:** `scripts/build_hurricane_stats.py` (reads HUTrackDB's committed
  GeoParquet tables) → `data/hurricaneStats.js` (generated; do not hand-edit).
  To refresh after HUTrackDB's annual HURDAT2 update:

  ```bash
  ~/HUTrackDB/.venv/bin/python -I scripts/build_hurricane_stats.py --hutrack ~/HUTrackDB
  ```

### What is counted

For each route waypoint:

| Field | Definition |
|---|---|
| Landfall | A HUTrackDB `landfalls` row with `is_landfall` (not an overland re-entry), `is_tropical_at_landfall`, and `exact_ss_category` of 1–5 (wind at the crossing ≥ 64 kt) |
| Near | Landfall point within **60 nautical miles (111.12 km)** geodesic distance of the waypoint |
| Count | Distinct **storms**, not crossings. A storm that crosses twice inside the radius (barrier island, then mainland) counts once, at its strongest crossing |
| Rate | Storms ÷ years of record. Each HURDAT2 file is divided by its own record length: Atlantic from 1851; NE/N-Central Pacific (basins EP + CP, one file) from 1949 |
| Modern rate | The same, from 1991 onward |
| Major | Category 3–5 (NOAA/NHC Saffir-Simpson scale) |
| Inland fallback | If no landfall lies within 60 nmi of the waypoint, the stats describe the 60 nmi around the **nearest hurricane landfall** instead, and the card says how far away it is |

Wind speeds are shown in knots (as recorded in HURDAT2) and in mph, converted
exactly (1 kt = 1.852 km/h; 1 mi = 1.609344 km) and rounded to the nearest mph.
NOAA products may round mph differently, so a displayed mph value can differ
slightly from one quoted elsewhere; the knot value is authoritative.

## 2. How the game uses it

**Display only.** When the `hurricane` event fires, `ui/eventPanel.js` adds a
"Real hurricane record" card (`ui/hurricaneCard.js`) for the waypoint the
player is at. It shows:

- the landfall count
- the frequency for the full record and since 1991
- a Saffir-Simpson category breakdown
- the strongest and most recent storms
- attribution to HUTrackDB

`js/game.js` records each waypoint where a hurricane fired
(`game.hurricaneSites`). The end-screen research summary then repeats the
record for those places and lists HUTrackDB in its references.

The data does **not** change hurricane event odds or damage. Hurricane odds
still come from `baseProbability`, live weather, and the SSP inland-flood
multiplier (`data/ssp.js`). Using local landfall frequency to set odds, and
gating hurricane events to exposed waypoints, is tracked as backlog D5/D8.

## 3. Why it matters for climate risk

Hurricanes are the costliest weather hazard in the United States. The damage
comes from three things acting together: wind, storm surge, and extreme
rainfall. Surge and rain usually cause most of the deaths and flood losses.
Exposure is concentrated on the Gulf and Atlantic coasts. These are the same
places the game's coastal origin cities (Miami, Houston, New Orleans,
Charleston) are fleeing. Rising seas raise the base level that every surge
starts from.

The historical record matters for two reasons. It shows how often a place has
actually been hit, and how hard: New Orleans and Miami have very different
histories from New York, even though all three are "coastal". It also gives the
baseline that any projected change is measured against.

## 4. How much it is likely to change

### Observed record (HUTrackDB, continental US)

Distinct hurricanes making continental-US landfall (Atlantic basin; Hawaii,
Alaska and territories excluded). Strongest crossing per storm:

| Period | Years | Hurricanes | Per year | Major (Cat 3+) | Major per year |
|---|---:|---:|---:|---:|---:|
| 1851–1990 | 140 | 233 | 1.66 | 72 | 0.51 |
| 1991–2025 | 35 | 58 | 1.66 | 21 | 0.60 |
| 1851–2025 | 175 | 291 | 1.66 | 93 | 0.53 |

Computed 2026-11-01 from HUTrackDB `landfalls` + `storms` (build 2026-10-07,
commit `175e561`) by `scripts/hurricane_observed_trend.py`. Rerun it after each
HUTrackDB refresh and paste the new table here.

**Reading this honestly:**
- The landfall rate is flat across the 1991 boundary.
- The major-landfall rate is somewhat higher since 1991, but 35 seasons is a
  short window.
- Pre-satellite counts are known to be under-reported (HURDAT2 era notes).
- Annual landfall counts swing widely with ENSO and other natural variability
  (see HUTrackDB's ENSO analysis).

So this table does not by itself show a climate trend. It is the baseline.

### Projected change

> **PENDING PI REVIEW.** Quotes below are verbatim from the sources, retrieved
> 2026-11-01. None is used in game mechanics yet. The game's SSPs map to
> warming levels via `data/ssp.js` ΔT, but that mapping is under review (BACKLOG
> CR1), so this doc does not yet fill in values per SSP/year.

**Global, by warming level: IPCC AR6 WG1 Ch. 11, Table 11.2** (Seneviratne et
al., 2021, pp. 1533–1534; [PDF](https://www.ipcc.ch/report/ar6/wg1/downloads/report/IPCC_AR6_WGI_Chapter11.pdf)):

| Quantity (median projected change) | +1.5°C | +2°C | +4°C | Confidence |
|---|---|---|---|---|
| TC rain rates | "11%" | "14%" | "28%" | high |
| Proportion of TCs reaching Category 4–5 | "10%" | "13%" | "20%" | high |
| Mean lifetime-max wind speed | — | — | — | medium (1.5°C) / high (2°C, 4°C); no percentage given |

- **Frequency.** "The total global frequency of TC formation will decrease or
  remain unchanged with increasing global warming (medium confidence)" (Ch. 11
  Executive Summary). At 2°C: "the median proportion of Category 4–5 TCs
  increases by 13%, while the median global TC frequency decreases by 14%,
  which implies that the median of the global Category 4–5 TC frequency is
  slightly reduced by 1% or almost unchanged" (§11.7.1.5, p. 1590).
- **Wind.** "The increase in global TC maximum surface wind speeds is about 5%
  for a 2°C global warming" (§11.7.1.5).
- **Surge.** "there is high confidence that sea level rise will lead to a
  higher possibility of extreme coastal water levels in most regions, with all
  other factors assumed equal" (§11.7.1.5). SPM C.2.5: "extreme sea level
  events that occurred once per century in the recent past are projected to
  occur at least annually at more than half of all tide gauge locations by
  2100 (high confidence)."
- **Observed.** SPM A.3.4: "There is low confidence in long-term
  (multi-decadal to centennial) trends in the frequency of all-category
  tropical cyclones."
- **Source inconsistency.** AR6 gives the 2°C rain-rate increase as "about
  14%" in Table 11.2 but "about 12%" in §11.7.1.5. Knutson's median is +14%.

**Knutson et al. (2020)**, *BAMS* 101(3), E303–E322,
https://doi.org/10.1175/BAMS-D-18-0194.1. These are the medians IPCC relies on
for 2°C:

- **Rain rate:** "median: +14%; range: +6% to +22%" (p. E312).
- **Wind:** "The median projected increase in lifetime maximum surface wind
  speeds is about 5% (range: 1%–10%)" (abstract).
- **Category 4–5 proportion:** "a median projected change of +13%" (abstract).
- **Global frequency:** "The median change across all estimates in Fig. 1 is
  −14% with a range from −28% to +22%" (p. E306). Elsewhere the paper gives
  "about −13%" (p. E318).

**United States / Atlantic:**

- NCA5 Ch. 2, Key Message 2.2 (Marvel et al., 2023,
  https://doi.org/10.7930/NCA5.2023.CH2; read via the
  [Internet Archive copy](http://web.archive.org/web/20250630041240/https://nca2023.globalchange.gov/chapter/2/)
  because globalchange.gov is offline): "Hurricanes have been intensifying
  more rapidly since the 1980s (high confidence) and causing heavier rainfall
  and higher storm surges (high confidence)." Also: "There is no long-term
  trend in the frequency of landfalling hurricanes in the United States since
  the late 19th century."
- NCA5 KM 2.3: "stronger tropical cyclones globally, with winds 5% faster (3%
  for the Atlantic basin) at a GWL of 2°C."
- NOAA GFDL, *Global Warming and Hurricanes* (rev. 2024-11-20,
  [archive copy](https://web.archive.org/web/20260103181329/https://www.gfdl.noaa.gov/global-warming-and-hurricanes/)):
  "There is no strong evidence of century-scale increasing trends in U.S.
  landfalling hurricanes or major hurricanes." Also: "at present we have only
  low confidence for an increase in category 4 and 5 storms in the Atlantic."

**What this means for the game.** The sources agree on more rain, stronger
peak winds, a larger share of Category 4–5 storms, and higher surge from sea
level rise. They do **not** agree on, or project, a rise in how *often*
hurricanes make landfall.

The HUTrackDB record above is consistent with that: there is no landfall-rate
trend across 1991. So any future mechanic should scale hurricane *severity*
(damage, surge) with warming, not event *frequency*. Not yet found: an
Atlantic- or Gulf-specific numeric Cat 4–5 projection, and a numeric surge
change by warming level (AR6 Ch. 9 §9.6.4.2 not yet retrieved).

## 5. Limitations

- **Point landfalls, not footprints.** Only the storm centre's crossing point
  is tested against the 60 nmi radius. A storm whose centre lands just outside
  it can still bring hurricane-force wind, surge and flooding to a waypoint. HUTrackDB
  `track_points` could add "passed within 60 nmi" counts (not yet used).
- **Inland waypoints** show the nearest coast's record, not local wind or rain
  impacts. Inland flooding from decaying storms is not captured.
- **Wind at the crossing.** If HURDAT2 is missing wind at either end of the
  crossing segment, HUTrackDB leaves the crossing intensity null, and such
  crossings are not counted as hurricanes. For hurricane-strength tropical
  landfalls this currently affects 0 cases.
- **Early record.** 1851 to the late 1960s undercounts storms and
  under-analyses intensity. The 1991+ rate is shown alongside for this reason.
- **Lagoon crossings may count as landfalls.** HUTrackDB counts Milton (2024)
  twice more after its Siesta Key landfall, at 68 kt as it crossed the Indian
  River lagoon onto Merritt Island and Cape Canaveral. As a result, Orlando's
  card shows "Most recent: Milton (2024), Category 1".

  The game counts each storm once, so this does not inflate counts. It can,
  however, add a storm to a radius that only its lagoon crossing reaches. This
  is HUTrackDB's definition, reported as-is and flagged there for review.
- **Small counts.** Rates built from one or two storms (e.g. Phoenix's
  nearest-coast fallback: one Baja California landfall) are not stable.
- **Calibrations:**
  - 60 nmi radius: confirmed by PI 2026-11-01. It is NOAA's Historical
    Hurricane Tracks default and matches HUTrackDB `bypass_radius_km`.
  - 1991 modern-era boundary: confirmed by PI 2026-11-01. Sourced from the
    HURDAT2 format spec.
  - Nearest-coast fallback: confirmed by PI 2026-11-01.
