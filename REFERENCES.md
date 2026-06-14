# Arcadian Trail — Scientific References

This file documents the peer-reviewed research and institutional reports that calibrate
climate risk mechanics in Arcadian Trail. All quantitative multipliers in `data/ssp.js`
are derived from or directly cited to these sources.

---

## Temperature Projections & Sea Level Rise

**IPCC AR6 WG1 (2021)**
Masson-Delmotte, V., Zhai, P., Pirani, A., et al. (Eds.).
*Climate Change 2021: The Physical Science Basis.*
Contribution of Working Group I to the Sixth Assessment Report of the
Intergovernmental Panel on Climate Change. Cambridge University Press.
https://www.ipcc.ch/report/ar6/wg1/

- **Game use:** Global mean temperature increase projections by SSP and year
  (SPM Table SPM.1); sea level rise projections (SPM Table SPM.2).
  These are the ΔTΔT and SLR anchor values in `data/ssp.js`.

---

## Inland Flood Risk — Clausius-Clapeyron Scaling

**Fischer, E. M. & Knutti, R. (2016)**
Anthropogenic contribution to global occurrence of heavy-precipitation
and high-temperature extremes.
*Nature Climate Change*, 6(9), 931–936.
https://doi.org/10.1038/nclimate3051

- **Game use:** Grounds the `flood_risk_inland = 1.07^ΔT` multiplier.
  Extreme precipitation intensity scales at ~7%/°C (the Clausius-Clapeyron
  rate) under global warming. Applied to inland flood and hurricane event
  probability weights in `js/events.js`.

---

## Coastal Storm Surge Risk — Sea Level Rise Frequency Amplification

**Sweet, W. V. & Park, J. (2014)**
From the extreme to the mean: Acceleration and tipping points of coastal
inundation from sea level rise.
*Earth's Future*, 2(12), 579–600.
https://doi.org/10.1002/2014EF000272

- **Game use:** Grounds the `surge_multiplier = 1 + SLR_meters` formula.
  Each meter of SLR raises baseline water levels, dramatically amplifying
  the frequency of historically rare surge events. Applied multiplicatively
  on top of CC inland flood risk for coastal origin cities
  (Miami, Houston, New Orleans, Charleston).

---

## Wildfire Risk — Vapor Pressure Deficit Scaling

**Abatzoglou, J. T. & Williams, A. P. (2016)**
Impact of anthropogenic climate change on wildfire across western US forests.
*Proceedings of the National Academy of Sciences*, 113(42), 11770–11775.
https://doi.org/10.1073/pnas.1607171113

- **Game use:** Primary calibration source for `wildfire_risk = 1.07^(2×ΔT)`.
  Human-caused climate change doubled cumulative forest fire area in western
  US since 1984, driven by increased vapor pressure deficit (VPD). VPD
  scales at the CC rate (~7%/°C) and fire area scales approximately as VPD².

**Williams, A. P., Abatzoglou, J. T., Gershunov, A., et al. (2019)**
Observed impacts of anthropogenic climate change on wildfire in California.
*Earth's Future*, 7(8), 892–910.
https://doi.org/10.1029/2019EF001210

- **Game use:** Corroborating source for VPD-fire relationship.

---

## Heat Wave Duration — Nonlinear Acceleration

**Martinez-Villalobos, C., Fu, D., Loikith, P. C., & Neelin, J. D. (2025)**
Accelerating increase in the duration of heatwaves under global warming.
*Nature Geoscience*, 18, 716–723.
https://doi.org/10.1038/s41561-025-01737-w

- **Game use:** Grounds the `heatwave_duration = exp(ΔT / σ)` formula.
  Heat wave characteristic duration scales exponentially with regional mean
  temperature change, normalized by local temperature variability σ.
  **Assumption:** σ = 4°C for the US Sun Belt (summer day-to-day temperature
  variability); confirmed as working assumption by PI [2026-06-13]. The
  paper's regional σ values are behind the journal paywall and should replace
  this value when accessible.

---

## Chronic Health Drain — Temperature and Mortality

**Climate Impact Lab (2026)**
*Human Health: Measuring the Impact of Rising Temperatures on Mortality
to Target Adaptation Planning.* CIL_MortalityReport_2026.
https://impactlab.org/research/human-health-measuring-the-impact-of-rising-temperatures-on-mortality-to-target-adaptation-planning/

Underlying econometric research: Carleton, T., Jina, A., Delgado, M., et al. (2022).
Valuing the Global Mortality Consequences of Climate Change Accounting for
Adaptation Costs and Benefits.
*Quarterly Journal of Economics*, 137(4), 2037–2105.
https://doi.org/10.1093/qje/qjac020

- **Game use:** Grounds the `health_drain = 1 + ΔT × 0.0069 × subleth` formula.
  US Sun Belt projects +10 excess deaths per 100,000 per year by 2050,
  implying ~5.9 deaths/100,000/°C (at ~1.7°C mean 2050 warming).
  Relative to a US baseline of ~860/100,000: +0.69%/°C mortality risk.
  Sub-lethal burden (heat exhaustion, hospitalizations) multiplies this by
  a factor drawn from Uniform[5, 10] per run, reflecting the 5–10× ratio
  of heat-related hospitalizations to deaths in the literature.
  Northern destination cities (Minneapolis, Buffalo, Burlington, Boise)
  receive a health drain reduction of `max(0.85, 1 − ΔT × 0.012)`, reflecting
  Impact Lab findings of −30 to −60 deaths/100,000 in northern US from
  reduced cold-related mortality.

---

## Fuel Burn Rate — Economic Productivity and Climate

**Fernandez-Navia, T. M., Kochen, M., & Ricco, R. (2023)**
How Long Do Rising Temperatures Affect Economic Growth?
*FRBSF Economic Letter*, 2023-15. Federal Reserve Bank of San Francisco.
https://www.frbsf.org/research-and-insights/publications/economic-letter/2023/06/how-long-do-rising-temperatures-affect-economic-growth/

- **Game use:** Grounds the `fuel_burn = 1 + ΔT × 0.021` formula.
  Hot-region (>13°C baseline) economic productivity falls at −1.05%/°C.
  A 2× sector amplifier (reflecting price-inelasticity of fuel/transport
  relative to economy-wide averages) gives 0.0105 × 2 = 0.021 per °C.
  The game's travel corridor (Sun Belt origins) passes through regions
  where the hot-country coefficient applies rather than the US-wide −0.05%/°C.

---

## Notes on Calibration Assumptions

| Parameter | Value | Status |
|-----------|-------|--------|
| CC scaling rate | 7%/°C | Published physics; standard in literature |
| SLR surge amplifier | `1 + SLR_m` | Derived from Sweet & Park (2014) |
| VPD-fire exponent | 2 (fire ∝ VPD²) | Abatzoglou & Williams (2016) |
| Heatwave σ (Sun Belt) | 4°C | **Assumption** — confirmed by PI [2026-06-13] |
| Sub-lethal multiplier | Uniform[5, 10] | Reflects morbidity:mortality ratio uncertainty |
| Fuel sector amplifier | 2× | Design calibration over SF Fed economy-wide estimate |
| SLR 2075 values | Linear interpolation between 2050 and 2100 | IPCC AR6 does not publish 2075 directly |
