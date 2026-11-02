"""Build data/hurricaneStats.js from HUTrackDB landfall data.

For every waypoint the game can visit, summarise the historical record of
hurricane landfalls near it, for display when the player hits a hurricane event.

Source: HUTrackDB (https://github.com/rkvaughn/HUTrackDB), a landfall-complete
database built from NOAA HURDAT2. This script reads its committed GeoParquet
tables; it never edits them.

Run with an environment that has geopandas + pyproj (HUTrackDB's own venv works):

    ~/HUTrackDB/.venv/bin/python -I scripts/build_hurricane_stats.py \
        --hutrack ~/HUTrackDB

Output is deterministic: same HUTrackDB build + same routes -> identical file.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
from pyproj import Geod

GAME_ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = GAME_ROOT / "data" / "hurricaneStats.js"

# 1 nautical mile = 1.852 km exactly (international definition).
NAUTICAL_MILE_KM = 1.852

# calibration confirmed by PI 2026-11-01: "near" = within 60 nautical miles
# (111.12 km), the default search radius of NOAA's Historical Hurricane Tracks
# tool (https://coast.noaa.gov/hurricanes/). Same value as HUTrackDB's
# PI-confirmed bypass_radius_km (2026-08-05), so the two projects match.
RADIUS_NMI = 60
RADIUS_KM = RADIUS_NMI * NAUTICAL_MILE_KM

# calibration confirmed by PI 2026-11-01: report a modern-era rate alongside
# the full record. 1991 is a sourced boundary: per the HURDAT2 format spec
# (Landsea, 2022), to-the-minute landfall times and complete native landfall
# flagging resume in 1991. Earlier counts are known to be under-reported.
MODERN_ERA_START = 1991

# Saffir-Simpson hurricane categories (NOAA/NHC SSHWS; HUTrackDB
# exact_ss_category labels). "Major" = Category 3+ per NHC.
HURRICANE_CATEGORIES = ["1", "2", "3", "4", "5"]
MAJOR_CATEGORIES = {"3", "4", "5"}

# Exact unit conversion: 1 kt = 1.852 km/h; 1 mi = 1.609344 km.
KT_TO_MPH = 1.852 / 1.609344

# HURDAT2 ships two files: Atlantic (basin AL) and NE/N-Central Pacific
# (basins EP + CP in one file). Years of record are counted per FILE, since a
# basin code with no storm in the file's first year (CP: first storm 1950) was
# still being recorded from that file's first season (1949).
RECORD_GROUP = {"AL": "Atlantic", "EP": "Pacific", "CP": "Pacific"}

GEOD = Geod(ellps="WGS84")


def load_waypoints() -> list[dict]:
    out = subprocess.run(
        ["node", "--no-warnings", str(GAME_ROOT / "scripts" / "dump_waypoints.mjs")],
        check=True, capture_output=True, text=True, cwd=GAME_ROOT,
    )
    return json.loads(out.stdout)


def load_hurricane_landfalls(hutrack: Path) -> tuple[pd.DataFrame, dict]:
    pq = hutrack / "data" / "processed" / "parquet"
    lf = gpd.read_parquet(pq / "landfalls.parquet")
    storms = pd.read_parquet(pq / "storms.parquet")

    # Countable landfalls (not overland re-entries) by a tropical system at
    # hurricane strength at the crossing. Intensity uses the exact_* fields:
    # the wind at the crossing itself (HUTrackDB FIELD_DEFINITIONS.md).
    hu = lf[lf["is_landfall"] & lf["is_tropical_at_landfall"]
            & lf["exact_ss_category"].isin(HURRICANE_CATEGORIES)].copy()
    hu = hu.merge(storms[["storm_id", "basin", "season", "name"]], on="storm_id", how="left")
    assert hu["season"].notna().all(), "landfall with no matching storm row"
    unknown = set(storms["basin"]) - set(RECORD_GROUP)
    assert not unknown, f"unmapped basin codes: {unknown}"
    hu["record"] = hu["basin"].map(RECORD_GROUP)

    # Record span per HURDAT2 file, read from the data (Atlantic 1851+, Pacific 1949+).
    spans = storms.assign(record=storms["basin"].map(RECORD_GROUP)).groupby("record")["season"].agg(["min", "max"])
    record = {g: (int(r["min"]), int(r["max"])) for g, r in spans.iterrows()}
    return pd.DataFrame(hu.drop(columns="geometry")), record


def distances_km(lat: float, lon: float, df: pd.DataFrame) -> np.ndarray:
    n = len(df)
    _, _, d_m = GEOD.inv(np.full(n, lon), np.full(n, lat),
                         df["exact_lon"].to_numpy(), df["exact_lat"].to_numpy())
    return d_m / 1000.0


def storm_label(row) -> dict:
    name = row["name"]
    return {
        "name": None if (not isinstance(name, str) or name.upper() == "UNNAMED") else name.title(),
        "season": int(row["season"]),
        "category": int(row["exact_ss_category"]),
        "windKt": int(round(row["exact_wind_kt"])),
        "windMph": int(round(row["exact_wind_kt"] * KT_TO_MPH)),
        "place": row["landfall_admin1"],
        "country": row["landfall_iso"],
    }


def annual_rate(storms: pd.DataFrame, record: dict, start_floor: int | None) -> float:
    """Landfalling hurricanes per year. Each HURDAT2 file (Atlantic, Pacific)
    is divided by its own years of record; rates from the two files add."""
    rate = 0.0
    for group, grp in storms.groupby("record"):
        first, last = record[group]
        start = max(first, start_floor) if start_floor else first
        years = last - start + 1
        rate += len(grp[grp["season"] >= start]) / years
    return rate


def summarise(anchor_lat: float, anchor_lon: float, hu: pd.DataFrame, record: dict) -> dict:
    near = hu[distances_km(anchor_lat, anchor_lon, hu) <= RADIUS_KM]
    # One row per storm: a storm can cross the coast more than once inside the
    # radius (barrier island, then mainland). Keep its strongest crossing.
    storms = (near.sort_values(["exact_wind_kt", "exact_time"], ascending=[False, False])
                  .drop_duplicates("storm_id"))
    modern = storms[storms["season"] >= MODERN_ERA_START]
    by_cat = {c: int((storms["exact_ss_category"] == c).sum()) for c in HURRICANE_CATEGORIES}

    out = {
        "landfalls": int(len(storms)),
        "landfallsModern": int(len(modern)),
        "byCategory": by_cat,
        "major": int(storms["exact_ss_category"].isin(MAJOR_CATEGORIES).sum()),
        "majorModern": int(modern["exact_ss_category"].isin(MAJOR_CATEGORIES).sum()),
        "perYear": round(annual_rate(storms, record, None), 6),
        "perYearModern": round(annual_rate(storms, record, MODERN_ERA_START), 6),
        # First season of record for the basin(s) these storms come from
        # (Atlantic 1851; Pacific later), so "since <year>" is never overstated.
        "recordStart": int(min(record[g][0] for g in storms["record"].unique())) if len(storms) else None,
        "strongest": None,
        "mostRecent": None,
    }
    if len(storms):
        strongest = storms.sort_values(["exact_wind_kt", "season"], ascending=[False, False]).iloc[0]
        recent = storms.sort_values("exact_time", ascending=False).iloc[0]
        out["strongest"] = storm_label(strongest)
        out["mostRecent"] = storm_label(recent)
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--hutrack", type=Path, default=Path.home() / "HUTrackDB")
    args = ap.parse_args()

    hu, record = load_hurricane_landfalls(args.hutrack)
    meta_tbl = pd.read_parquet(args.hutrack / "data/processed/parquet/pipeline_metadata.parquet")
    meta_kv = dict(zip(meta_tbl["key"], meta_tbl["value"]))
    commit = subprocess.run(["git", "-C", str(args.hutrack), "rev-parse", "--short", "HEAD"],
                            capture_output=True, text=True).stdout.strip() or None

    stats = {}
    for w in load_waypoints():
        d = distances_km(w["lat"], w["lon"], hu)
        nearest = hu.iloc[int(np.argmin(d))]
        local = bool((d <= RADIUS_KM).any())
        # PI decision 2026-11-01: if nothing landed within the radius of the
        # waypoint, report the record around the nearest hurricane landfall
        # instead, labelled as the nearest exposed coast.
        anchor_lat, anchor_lon = (w["lat"], w["lon"]) if local else (nearest["exact_lat"], nearest["exact_lon"])
        entry = {
            "mode": "local" if local else "nearestCoast",
            "nearestLandfallKm": int(round(float(d.min()))),
            "nearestPlace": nearest["landfall_admin1"],
            "nearestCountry": nearest["landfall_iso"],
        }
        entry.update(summarise(anchor_lat, anchor_lon, hu, record))
        stats[w["name"]] = entry

    al_first, al_last = record["Atlantic"]
    meta = {
        "source": "HUTrackDB",
        "url": "https://github.com/rkvaughn/HUTrackDB",
        "commit": commit,
        "schemaVersion": meta_kv.get("schema_version"),
        "builtAtUtc": meta_kv.get("generated_at_utc"),
        "hurdat2Files": [Path(p.strip()).name for p in meta_kv.get("hurdat2_sources", "").split(";") if p.strip()],
        "radiusNmi": RADIUS_NMI,
        "radiusKm": RADIUS_KM,
        "recordStart": al_first,
        "recordEnd": al_last,
        "modernStart": MODERN_ERA_START,
        "recordByFile": {g: list(v) for g, v in record.items()},
    }

    header = (
        "// AUTO-GENERATED by scripts/build_hurricane_stats.py — do not edit by hand.\n"
        "// Historical hurricane landfall statistics near each route waypoint.\n"
        "// Source: HUTrackDB (https://github.com/rkvaughn/HUTrackDB), built from NOAA HURDAT2.\n"
        "// Method and field meanings: docs/perils/hurricane.md\n\n"
    )
    body = (
        f"export const HUTRACK_META = {json.dumps(meta, indent=2, ensure_ascii=False)};\n\n"
        f"export const HURRICANE_STATS = {json.dumps(stats, indent=2, ensure_ascii=False)};\n"
    )
    OUT_PATH.write_text(header + body, encoding="utf-8")
    n_local = sum(1 for s in stats.values() if s["mode"] == "local")
    print(f"Wrote {OUT_PATH.relative_to(GAME_ROOT)}: {len(stats)} waypoints ({n_local} with landfalls in range)")


if __name__ == "__main__":
    main()
