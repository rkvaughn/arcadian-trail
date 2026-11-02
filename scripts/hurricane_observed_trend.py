"""Print the observed continental-US hurricane landfall table in
docs/perils/hurricane.md §4, from HUTrackDB.

    ~/HUTrackDB/.venv/bin/python -I -B scripts/hurricane_observed_trend.py --hutrack ~/HUTrackDB

Definitions match scripts/build_hurricane_stats.py:
- Hurricane landfall: is_landfall, is_tropical_at_landfall, exact_ss_category 1-5.
- Continental US: is_us_landfall, excluding the non-contiguous admin units
  HUTrackDB folds into is_us_landfall (Hawaii, Alaska, Puerto Rico,
  US Virgin Islands; see HUTrackDB README "Two things to know").
- One row per storm (strongest crossing). Major = Category 3-5 (NOAA/NHC).
- Periods split at 1991, the PI-confirmed modern-era boundary (2026-11-01).
"""

from __future__ import annotations

import argparse
from pathlib import Path

import geopandas as gpd
import pandas as pd

NON_CONUS = {"Hawaii", "Alaska", "Puerto Rico", "United States Virgin Islands"}
MODERN_ERA_START = 1991  # PI-confirmed 2026-11-01; HURDAT2 format spec boundary


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--hutrack", type=Path, default=Path.home() / "HUTrackDB")
    args = ap.parse_args()
    pq = args.hutrack / "data" / "processed" / "parquet"

    lf = gpd.read_parquet(pq / "landfalls.parquet")
    storms = pd.read_parquet(pq / "storms.parquet")
    hu = lf[lf["is_landfall"] & lf["is_tropical_at_landfall"]
            & lf["exact_ss_category"].isin(list("12345"))
            & lf["is_us_landfall"] & ~lf["landfall_admin1"].isin(NON_CONUS)]
    hu = hu.merge(storms[["storm_id", "season"]], on="storm_id")
    per_storm = hu.sort_values("exact_wind_kt", ascending=False).drop_duplicates("storm_id")

    first, last = int(storms["season"].min()), int(storms["season"].max())
    print("| Period | Years | Hurricanes | Per year | Major (Cat 3+) | Major per year |")
    print("|---|---:|---:|---:|---:|---:|")
    for lo, hi in [(first, MODERN_ERA_START - 1), (MODERN_ERA_START, last), (first, last)]:
        x = per_storm[(per_storm["season"] >= lo) & (per_storm["season"] <= hi)]
        years = hi - lo + 1
        major = int(x["exact_ss_category"].isin(list("345")).sum())
        print(f"| {lo}–{hi} | {years} | {len(x)} | {len(x) / years:.2f} | {major} | {major / years:.2f} |")


if __name__ == "__main__":
    main()
