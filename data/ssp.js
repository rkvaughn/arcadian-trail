/**
 * data/ssp.js — SSP scenario definitions and climate risk multipliers
 *
 * All multipliers are derived from published research. See REFERENCES.md for full citations.
 *
 * Sources:
 *   Temperature (ΔT): IPCC AR6 WG1 SPM Table SPM.1, median, relative to 1995–2014
 *   Sea level rise: IPCC AR6 WG1 Table SPM.2, median (2075 interpolated linearly)
 *   Inland flood: Fischer & Knutti (2016) — CC scaling ~7%/°C
 *   Coastal surge: Sweet & Park (2014) — surge_mult = 1 + SLR_m
 *   Wildfire: Abatzoglou & Williams (2016); Williams et al. (2019) — fire ∝ VPD²; VPD scales at CC rate
 *   Health: Climate Impact Lab (2026) — +5.9 deaths/100k/°C in Sun Belt; sub-lethal burden 5–10×
 *   Heatwave duration: Martinez-Villalobos et al. (2025) — τ ∝ exp(ΔT / σ)
 *   Fuel burn: Fernandez-Navia et al., FRBSF (2023) — hot-region productivity −1.05%/°C × 2× sector amplifier
 */

// IPCC AR6 WG1 SPM Table SPM.1 — global mean ΔT above 1995–2014, median (°C)
const DELTA_T = {
  'SSP2-4.5': { 2050: 1.5, 2075: 2.0, 2100: 2.7 },
  'SSP3-7.0': { 2050: 1.7, 2075: 2.6, 2100: 3.6 },
  'SSP5-8.5': { 2050: 2.0, 2075: 3.2, 2100: 4.4 },
};

// IPCC AR6 WG1 Table SPM.2 — sea level rise above 1995–2014, median (meters)
// 2075 values interpolated linearly between 2050 and 2100
const SLR = {
  'SSP2-4.5': { 2050: 0.25, 2075: 0.40, 2100: 0.56 },
  'SSP3-7.0': { 2050: 0.27, 2075: 0.47, 2100: 0.68 },
  'SSP5-8.5': { 2050: 0.30, 2075: 0.65, 2100: 1.01 },
};

// Origin city IDs subject to sea level rise storm surge amplification
// These are coastal cities where SLR compounds flood risk on top of CC scaling
const COASTAL_ORIGIN_IDS = ['miami', 'houston', 'new_orleans', 'charleston'];

// Assumption: Sun Belt summer day-to-day temperature variability (σ)
// Used in Martinez-Villalobos et al. (2025) heatwave duration formula: τ ∝ exp(ΔT/σ)
// ASSUMPTION confirmed by PI [2026-06-13]. Replace with paper's regional values if accessible.
const SIGMA_SUNBELT = 4.0;

// Baseline US Sun Belt excess mortality per 100,000 per °C (Climate Impact Lab 2026)
// Derived: +10 deaths/100k by 2050 at ~1.7°C → 10/1.7/100000
const EXCESS_MORTALITY_PER_DEGREE = 5.9 / 100000;

// US baseline all-cause mortality rate (CDC) used to compute relative health risk
const BASELINE_MORTALITY_US = 860 / 100000;

export const SSP_DEFS = {
  'SSP2-4.5': {
    id: 'SSP2-4.5',
    shortName: 'Managed Transition',
    difficulty: 'Easy',
    narrative: 'Emissions peak mid-century and decline. Renewable energy scales, international cooperation holds. A damaged but navigable world — warmer and wetter, but infrastructure adapts.',
    color: '#2ecc71',
  },
  'SSP3-7.0': {
    id: 'SSP3-7.0',
    shortName: 'Fragmented World',
    difficulty: 'Medium',
    narrative: 'Regional conflict stalls global cooperation. Emissions remain high through mid-century. Heat and flood impacts are severe and uneven — some regions adapt, others collapse.',
    color: '#f39c12',
  },
  'SSP5-8.5': {
    id: 'SSP5-8.5',
    shortName: 'Fossil Fuel Resurgence',
    difficulty: 'Hard',
    narrative: 'High-energy, high-emission economic growth. Infrastructure overwhelmed. Coastal cities largely abandoned. The road ahead is brutal.',
    color: '#e74c3c',
  },
};

export const YEAR_DEFS = {
  2050: { label: 'Easy',   tagline: 'The window is closing.' },
  2075: { label: 'Medium', tagline: 'The damage is done.' },
  2100: { label: 'Hard',   tagline: 'The long emergency.' },
};

/**
 * Compute all SSP risk multipliers for a given scenario/year/origin combination.
 * Called once at game setup; stored as game.sspMultipliers.
 *
 * @param {string} sspId   — 'SSP2-4.5' | 'SSP3-7.0' | 'SSP5-8.5'
 * @param {number} year    — 2050 | 2075 | 2100
 * @param {string} originId — city id from data/cities.js
 * @returns {object} multiplier set
 */
export function computeSSPMultipliers(sspId, year, originId) {
  const dT  = DELTA_T[sspId][year];
  const slr = SLR[sspId][year];
  const isCoastal = COASTAL_ORIGIN_IDS.includes(originId);

  // Sub-lethal health burden multiplier: Uniform[5, 10]
  // Reflects uncertainty in heat morbidity-to-mortality ratio (literature range: 5–10×)
  // Source: Climate Impact Lab (2026); standard heat health epidemiology
  const subleth = 5 + Math.random() * 5; // calibration confirmed by PI [2026-06-13]

  // ── INLAND FLOOD RISK ─────────────────────────────────────────────────────
  // Clausius-Clapeyron: extreme precipitation intensity ∝ 1.07^ΔT
  // Source: Fischer & Knutti (2016); IPCC AR6 WG1 §11.4
  const floodRiskInland = Math.pow(1.07, dT);

  // ── COASTAL STORM SURGE RISK ──────────────────────────────────────────────
  // surge_multiplier = 1 + SLR_m; applied on top of CC inland flood risk
  // Source: Sweet & Park (2014); IPCC AR6 WG1 Table SPM.2
  const surgeMultiplier   = 1 + slr;
  const floodRiskCoastal  = floodRiskInland * surgeMultiplier;

  // Active flood risk for this run (coastal or inland)
  const floodRisk = isCoastal ? floodRiskCoastal : floodRiskInland;

  // ── WILDFIRE RISK ─────────────────────────────────────────────────────────
  // VPD scales at CC rate (~7%/°C); fire area ∝ VPD² → wildfire_risk = 1.07^(2·ΔT)
  // Source: Abatzoglou & Williams (2016); Williams et al. (2019)
  const wildfireRisk = Math.pow(1.07, 2 * dT);

  // ── FUEL BURN RATE ────────────────────────────────────────────────────────
  // Hot-region productivity −1.05%/°C × 2× sector amplifier for fuel price-inelasticity
  // Source: Fernandez-Navia et al., FRBSF Economic Letter (2023)
  const fuelBurn = 1 + dT * 0.021;

  // ── HEALTH DRAIN (ORIGIN / TRAVEL CORRIDOR) ───────────────────────────────
  // Excess mortality: +5.9/100k/°C in Sun Belt (Climate Impact Lab 2026)
  // Relative to US baseline 860/100k; multiplied by sub-lethal burden subleth ~ U[5,10]
  const relMortalityPerDegree = EXCESS_MORTALITY_PER_DEGREE / BASELINE_MORTALITY_US; // ≈ 0.00686
  const healthDrain = 1 + dT * relMortalityPerDegree * subleth;

  // ── HEALTH DRAIN (DESTINATION — NORTHERN CITIES) ─────────────────────────
  // Northern US sees −30 to −60 deaths/100k from reduced cold mortality (Impact Lab 2026)
  // Using midpoint: −45/100k; at 1.7°C ≈ −26/100k/°C → relative benefit ~0.03/°C
  // Bounded: health bonus cannot exceed 15% below baseline
  const healthDrainDestination = Math.max(0.85, 1 - dT * 0.012);

  // ── HEATWAVE DURATION MULTIPLIER ─────────────────────────────────────────
  // τ(ΔT) = τ₀ · exp(ΔT / σ); σ = SIGMA_SUNBELT = 4°C (assumption, see above)
  // Source: Martinez-Villalobos et al. (2025), Nature Geoscience
  const heatwaveDuration = Math.exp(dT / SIGMA_SUNBELT);

  // Heat risk: probability of heat events scales with heatwave duration multiplier
  const heatRisk = heatwaveDuration;

  return {
    // Scenario metadata
    dT,
    slr,
    isCoastal,
    subleth,

    // Risk multipliers (applied in js/events.js)
    floodRisk,
    floodRiskInland,
    floodRiskCoastal: isCoastal ? floodRiskCoastal : null,
    surgeMultiplier:  isCoastal ? surgeMultiplier : null,
    wildfireRisk,
    heatRisk,
    heatwaveDuration,

    // Resource burn multipliers (applied in js/travel.js)
    fuelBurn,
    healthDrain,
    healthDrainDestination,
  };
}
