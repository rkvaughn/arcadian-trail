/**
 * ui/researchSummary.js — Post-game bespoke research narrative
 *
 * Generates a personalized, citation-backed summary of the climate science
 * behind what the player experienced on their run. Displayed as a collapsible
 * panel on the end screen.
 *
 * References: See REFERENCES.md for full citations.
 */

import { SSP_DEFS, YEAR_DEFS } from '../data/ssp.js';

// Abbreviated inline citations for display
const CITE = {
  ipcc:       'IPCC AR6 WG1, 2021',
  fischer:    'Fischer & Knutti, <em>Nature Climate Change</em>, 2016',
  sweet:      'Sweet & Park, <em>Earth\'s Future</em>, 2014',
  abatzoglou: 'Abatzoglou & Williams, <em>PNAS</em>, 2016',
  williams:   'Williams et al., <em>Earth\'s Future</em>, 2019',
  cil:        'Climate Impact Lab, 2026',
  frbsf:      'Fernandez-Navia et al., <em>FRBSF Economic Letter</em>, 2023',
  martinez:   'Martinez-Villalobos et al., <em>Nature Geoscience</em>, 2025',
};

// Origin-city-specific climate context sentences
const ORIGIN_CONTEXT = {
  miami: (m) =>
    `Miami faces ${m.slr.toFixed(2)} m of sea level rise by your scenario year (${CITE.ipcc}), ` +
    `raising baseline water levels enough that storm surges once considered 100-year events now ` +
    `arrive several times per decade. The city the models describe is not science fiction.`,

  houston: (m) =>
    `Houston faces ${m.slr.toFixed(2)} m of sea level rise compounded by intensifying Gulf precipitation. ` +
    `Chronic flooding and petrochemical contamination become structural, not episodic ` +
    `(${CITE.ipcc}; ${CITE.sweet}).`,

  new_orleans: (m) =>
    `New Orleans sits below sea level. At ${m.slr.toFixed(2)} m of additional rise (${CITE.ipcc}), ` +
    `the levee system faces surge loads it was never designed to absorb. ` +
    `Your departure was not a choice — it was a reckoning.`,

  charleston: (m) =>
    `Charleston's tidal flooding, already chronic in the 2020s, becomes structural under ` +
    `${m.slr.toFixed(2)} m of sea level rise (${CITE.ipcc}). ` +
    `Sunny-day flooding — streets underwater at high tide — becomes the new baseline, not the exception.`,

  phoenix: (m) =>
    `Phoenix sits well above 13°C — the threshold above which economic productivity falls ` +
    `at −1.05%/°C (${CITE.frbsf}). At +${m.dT.toFixed(1)}°C, heat waves last ` +
    `${m.heatwaveDuration.toFixed(2)}× longer than pre-warming baselines, ` +
    `and the aquifer recharge rate falls further behind demand.`,

  sacramento: (m) =>
    `Sacramento's Central Valley sits in the wildfire interface. Vapor pressure deficit (VPD) ` +
    `at +${m.dT.toFixed(1)}°C drives a ${m.wildfireRisk.toFixed(2)}× increase in wildfire risk. ` +
    `When VPD doubles, fire area roughly quadruples — smoke becomes a permanent condition, ` +
    `not a seasonal one (${CITE.abatzoglou}).`,
};

// Science explanations per peril type — called with (mults, originId, count, year, sspId)
const PERIL_SCIENCE = {
  heat: (m, originId, count) => `
    <div class="science-block">
      <div class="science-peril-header">
        <span class="science-peril-type">HEAT</span>
        <span class="science-peril-stat">${count} event${count !== 1 ? 's' : ''} &nbsp;·&nbsp;
          ${m.heatRisk.toFixed(2)}× frequency &nbsp;·&nbsp;
          ${m.heatwaveDuration.toFixed(2)}× longer duration
        </span>
      </div>
      <p>
        Heat waves in your scenario are not just more frequent — they last dramatically longer.
        The characteristic duration of long heat waves scales as
        <em>τ(ΔT) = τ₀ · exp(ΔT / σ)</em>,
        where σ ≈ 4°C represents Sun Belt summer day-to-day temperature variability.
        At +${m.dT.toFixed(1)}°C, this yields a <strong>${m.heatwaveDuration.toFixed(2)}×
        increase in heat wave duration</strong>. The acceleration is nonlinear: each additional
        fraction of a degree adds more days than the last.
        <span class="science-citation">[${CITE.martinez}]</span>
      </p>
      <p>
        The chronic health drain in your run used a sub-lethal burden multiplier of
        <strong>${m.subleth.toFixed(1)}×</strong> (drawn from a Uniform[5, 10] distribution
        reflecting uncertainty in the heat morbidity-to-mortality ratio). The Climate Impact Lab
        projects +10 excess deaths per 100,000 per year in the US Sun Belt by 2050 — your
        scenario's burden is larger and accumulates over the full journey.
        <span class="science-citation">[${CITE.cil}]</span>
      </p>
    </div>`,

  flood: (m, originId, count) => {
    const coastal = m.isCoastal;
    return `
    <div class="science-block">
      <div class="science-peril-header">
        <span class="science-peril-type">FLOODING</span>
        <span class="science-peril-stat">${count} event${count !== 1 ? 's' : ''} &nbsp;·&nbsp;
          ${m.floodRisk.toFixed(2)}× baseline risk
          ${coastal ? ` (CC: ${m.floodRiskInland.toFixed(2)}× × surge: ${m.surgeMultiplier.toFixed(2)}×)` : '(Clausius-Clapeyron)'}
        </span>
      </div>
      <p>
        ${coastal
          ? `Your flood risk compounded from two independent forces. First, the Clausius-Clapeyron
             equation: a warmer atmosphere holds ~7% more moisture per degree of warming,
             intensifying extreme precipitation by <strong>${m.floodRiskInland.toFixed(2)}×</strong>
             at +${m.dT.toFixed(1)}°C. Second, ${m.slr.toFixed(2)} m of sea level rise by your scenario
             year raises baseline water levels, amplifying surge frequency by
             <strong>${m.surgeMultiplier.toFixed(2)}×</strong>. These multiply — not add.`
          : `The Clausius-Clapeyron equation dictates that a warmer atmosphere holds ~7% more moisture
             per degree of warming. At +${m.dT.toFixed(1)}°C, extreme precipitation intensity increases
             by <strong>${m.floodRiskInland.toFixed(2)}×</strong>, making 1-in-20-year floods
             far more frequent in the travel corridor.`}
        <span class="science-citation">[${CITE.fischer}${coastal ? `; ${CITE.sweet}; ${CITE.ipcc}` : '; ' + CITE.ipcc}]</span>
      </p>
    </div>`;
  },

  hurricane: (m, originId, count) => PERIL_SCIENCE.flood(m, originId, count).replace('FLOODING', 'HURRICANE / STORM SURGE'),

  wildfire: (m, originId, count) => `
    <div class="science-block">
      <div class="science-peril-header">
        <span class="science-peril-type">WILDFIRE</span>
        <span class="science-peril-stat">${count} event${count !== 1 ? 's' : ''} &nbsp;·&nbsp;
          ${m.wildfireRisk.toFixed(2)}× baseline risk
        </span>
      </div>
      <p>
        Wildfire risk tracks vapor pressure deficit (VPD) — the drying power of the air. VPD
        increases at the Clausius-Clapeyron rate (~7%/°C) as temperatures rise, while burned
        area scales approximately as VPD². This gives a compounded
        <strong>${m.wildfireRisk.toFixed(2)}×</strong> wildfire risk at +${m.dT.toFixed(1)}°C.
        Human-caused warming has already doubled western US forest fire area since 1984 — a
        trend that continues without bound under high-emission pathways.
        <span class="science-citation">[${CITE.abatzoglou}; ${CITE.williams}]</span>
      </p>
    </div>`,

  infrastructure: (m, originId, count) => `
    <div class="science-block">
      <div class="science-peril-header">
        <span class="science-peril-type">INFRASTRUCTURE BREAKDOWN</span>
        <span class="science-peril-stat">${count} event${count !== 1 ? 's' : ''} &nbsp;·&nbsp;
          fuel burn ${m.fuelBurn.toFixed(3)}× baseline
        </span>
      </div>
      <p>
        Economic productivity in hot regions (above 13°C annual mean — which includes every
        origin city in this game) falls at −1.05%/°C of warming.
        <span class="science-citation">[${CITE.frbsf}]</span>
        This degrades road maintenance, supply chain reliability, and fuel availability.
        A 2× sector amplifier reflects the price-inelasticity of fuel and transport
        relative to economy-wide averages, giving a <strong>${m.fuelBurn.toFixed(3)}×</strong>
        fuel burn rate in your run.
      </p>
    </div>`,

  health: (m, originId, count) => `
    <div class="science-block">
      <div class="science-peril-header">
        <span class="science-peril-type">MEDICAL EMERGENCY</span>
        <span class="science-peril-stat">${count} event${count !== 1 ? 's' : ''} &nbsp;·&nbsp;
          health drain ${m.healthDrain.toFixed(3)}× baseline
        </span>
      </div>
      <p>
        The chronic health burden of climate change operates below the threshold of acute events.
        The Climate Impact Lab projects +10 excess deaths per 100,000 per year in the US Sun Belt
        by 2050 from temperature alone. Your run applied a sub-lethal multiplier of
        <strong>${m.subleth.toFixed(1)}×</strong> — drawn from a Uniform[5, 10] distribution
        reflecting the 5–10× ratio of heat-related hospitalizations to mortality — giving a
        <strong>${m.healthDrain.toFixed(3)}×</strong> baseline health drain rate.
        <span class="science-citation">[${CITE.cil}]</span>
      </p>
    </div>`,

  mechanical: (m, originId, count) => `
    <div class="science-block">
      <div class="science-peril-header">
        <span class="science-peril-type">VEHICLE / MECHANICAL FAILURE</span>
        <span class="science-peril-stat">${count} event${count !== 1 ? 's' : ''}</span>
      </div>
      <p>
        Mechanical failures reflect the broader infrastructure degradation driven by economic
        productivity losses in hot regions (−1.05%/°C).
        <span class="science-citation">[${CITE.frbsf}]</span>
        Road conditions, supply chains for spare parts, and repair services all degrade as
        the economic base erodes under sustained heat stress.
      </p>
    </div>`,

  tornado: (m, originId, count) => `
    <div class="science-block">
      <div class="science-peril-header">
        <span class="science-peril-type">TORNADO / SEVERE CONVECTION</span>
        <span class="science-peril-stat">${count} event${count !== 1 ? 's' : ''}</span>
      </div>
      <p>
        Extreme convective events are among the most complex hazards to project under climate
        change. IPCC AR6 finds high confidence that the proportion of intense (Category 4–5)
        tropical cyclones increases with warming, and that convective available potential energy
        (CAPE) rises in a warmer, moister atmosphere — even as the total count of storms may not
        change significantly.
        <span class="science-citation">[${CITE.ipcc}]</span>
      </p>
    </div>`,

  social: (m, originId, count) => `
    <div class="science-block">
      <div class="science-peril-header">
        <span class="science-peril-type">SOCIAL BREAKDOWN / CONFLICT</span>
        <span class="science-peril-stat">${count} event${count !== 1 ? 's' : ''}</span>
      </div>
      <p>
        Climate migration, resource scarcity, and infrastructure failure compound into social
        instability. SSP3-7.0 is explicitly characterized by fragmented geopolitical cooperation
        and regional conflict as a driver of high emissions. Even under SSP2-4.5, the uneven
        distribution of climate impacts creates tension at borders, checkpoints, and resource
        chokepoints.
        <span class="science-citation">[${CITE.ipcc}]</span>
      </p>
    </div>`,
};

/**
 * Generate the full bespoke research summary HTML for a completed run.
 * @param {Game} game — completed game state
 * @returns {string} HTML string
 */
export function generateResearchSummary(game) {
  const { ssp, year, origin, destination, perilHistory, sspMultipliers } = game;
  const sspDef  = SSP_DEFS[ssp];
  const yearDef = YEAR_DEFS[year];
  const m       = sspMultipliers;

  if (!sspDef || !yearDef || !m) {
    return '<p class="research-error">Research summary unavailable — scenario data missing.</p>';
  }

  // Count peril types from run history
  const perilCounts = {};
  for (const p of (perilHistory || [])) {
    perilCounts[p] = (perilCounts[p] || 0) + 1;
  }

  // Top peril types (excluding 'positive'), sorted by frequency
  const topPerils = Object.entries(perilCounts)
    .filter(([type]) => type !== 'positive')
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([type, count]) => ({ type, count }));

  // Origin context paragraph
  const originContextFn = ORIGIN_CONTEXT[origin?.id];
  const originContext = originContextFn
    ? originContextFn(m)
    : `Under ${ssp} at ${year}, the climate corridor you traveled through operates at ` +
      `+${m.dT.toFixed(1)}°C above the 1995–2014 baseline (${CITE.ipcc}).`;

  // Peril science blocks
  const perilBlocks = topPerils
    .map(({ type, count }) => {
      const fn = PERIL_SCIENCE[type];
      return fn ? fn(m, origin?.id, count) : '';
    })
    .join('');

  // Difficulty color
  const diffColor = sspDef.color;

  return `
    <div class="research-summary">

      <div class="research-scenario-header">
        <div class="research-ssp-badge" style="border-color:${diffColor};color:${diffColor}">
          ${ssp}
        </div>
        <div class="research-scenario-meta">
          <span class="research-scenario-name">${sspDef.shortName}</span>
          <span class="research-scenario-year">${year} &nbsp;·&nbsp; ${yearDef.label} difficulty</span>
          <span class="research-delta-t">+${m.dT.toFixed(1)}°C above 1995–2014 baseline
            ${m.isCoastal ? `&nbsp;·&nbsp; +${m.slr.toFixed(2)} m sea level rise` : ''}
          </span>
        </div>
      </div>

      <p class="research-narrative">${sspDef.narrative}</p>

      <div class="research-section">
        <h4 class="research-section-title">Your Origin: ${origin?.name || 'Unknown'}</h4>
        <p>${originContext}</p>
      </div>

      ${topPerils.length > 0 ? `
      <div class="research-section">
        <h4 class="research-section-title">The Hazards You Faced</h4>
        ${perilBlocks}
      </div>` : ''}

      <div class="research-section">
        <h4 class="research-section-title">Your Economy</h4>
        <p>
          Fuel burned at <strong>${m.fuelBurn.toFixed(3)}×</strong> the pre-warming baseline rate.
          Hot-region economic productivity falls at −1.05%/°C, compounding across
          infrastructure, supply chains, and transport. A 2× sector amplifier reflects
          the price-inelasticity of fuel relative to economy-wide productivity.
          <span class="science-citation">[${CITE.frbsf}]</span>
        </p>
      </div>

      <div class="research-section">
        <h4 class="research-section-title">Your Destination: ${destination?.name || 'Unknown'}</h4>
        <p>
          Northern climate refuges are not immune to warming, but they experience a fundamentally
          different kind of change. The Climate Impact Lab finds northern US cities see
          <em>reduced</em> all-cause mortality under warming — cold-related deaths decline faster
          than heat deaths increase. Health drain in the destination corridor was
          <strong>${m.healthDrainDestination.toFixed(3)}×</strong> baseline — a real but modest
          advantage over the ${origin?.name} corridor's <strong>${m.healthDrain.toFixed(3)}×</strong>.
          This asymmetry is the engine of climate migration.
          <span class="science-citation">[${CITE.cil}]</span>
        </p>
      </div>

      <div class="research-section research-refs">
        <h4 class="research-section-title">References</h4>
        <ul class="research-ref-list">
          <li>IPCC (2021). <em>Climate Change 2021: The Physical Science Basis.</em> AR6 WG1. Cambridge University Press.</li>
          <li>Fischer, E.M. & Knutti, R. (2016). Anthropogenic contribution to global occurrence of heavy-precipitation and high-temperature extremes. <em>Nature Climate Change</em>, 6, 931–936.</li>
          <li>Sweet, W.V. & Park, J. (2014). From the extreme to the mean: Acceleration and tipping points of coastal inundation from sea level rise. <em>Earth's Future</em>, 2, 579–600.</li>
          <li>Abatzoglou, J.T. & Williams, A.P. (2016). Impact of anthropogenic climate change on wildfire across western US forests. <em>PNAS</em>, 113, 11770–11775.</li>
          <li>Williams, A.P. et al. (2019). Observed impacts of anthropogenic climate change on wildfire in California. <em>Earth's Future</em>, 7, 892–910.</li>
          <li>Martinez-Villalobos, C. et al. (2025). Accelerating increase in the duration of heatwaves under global warming. <em>Nature Geoscience</em>, 18, 716–723.</li>
          <li>Climate Impact Lab (2026). Human Health: Measuring the Impact of Rising Temperatures on Mortality. CIL_MortalityReport_2026.</li>
          <li>Fernandez-Navia, T.M. et al. (2023). How Long Do Rising Temperatures Affect Economic Growth? <em>FRBSF Economic Letter</em>, 2023-15.</li>
        </ul>
        <p class="research-refs-note">Full citations and calibration notes: <code>REFERENCES.md</code></p>
      </div>

    </div>`;
}
