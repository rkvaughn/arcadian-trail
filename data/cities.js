/**
 * data/cities.js — Origin and destination city definitions
 *
 * Each origin has SSP-variant descriptions calibrated to scenario severity.
 * Use getOriginDescription(city, ssp) / getDestinationDescription(city, ssp)
 * rather than reading city.description directly.
 *
 * SSP2-4.5: damage is real but managed — infrastructure adapts
 * SSP3-7.0: severe and uneven — some systems failing, displacement underway
 * SSP5-8.5: catastrophic — the worst-case that the game's premise describes
 */

export const origins = [
  {
    id: 'miami',
    name: 'Miami, FL',
    lat: 25.76,
    lon: -80.19,
    riskType: 'hurricane',
    sspDescriptions: {
      'SSP2-4.5': 'Sea walls hold through mid-century, but storm frequency has forced most residents inland. The city breathes on borrowed time — functional but hollowed out.',
      'SSP3-7.0': 'The causeway floods six months a year. What\'s left of Miami is elevated, expensive, and small. Your neighborhood went under two years ago.',
      'SSP5-8.5': 'The levees failed for the last time. What the surge didn\'t take, the permanent tide claimed. The city belongs to the Gulf now.',
    }
  },
  {
    id: 'phoenix',
    name: 'Phoenix, AZ',
    lat: 33.45,
    lon: -112.07,
    riskType: 'heat',
    sspDescriptions: {
      'SSP2-4.5': 'June temperatures routinely hit 120°F. The water authority enforces brutal rationing. Manageable — if you can afford the cooling bills.',
      'SSP3-7.0': 'Temperatures exceed 125°F for three months straight. The Colorado water compact collapsed. Half the city has already left.',
      'SSP5-8.5': 'Temperatures regularly exceed 130°F. The water table is gone. Even the cacti are dying.',
    }
  },
  {
    id: 'sacramento',
    name: 'Sacramento, CA',
    lat: 38.58,
    lon: -121.49,
    riskType: 'wildfire',
    sspDescriptions: {
      'SSP2-4.5': 'Fire season runs eight months. The valley\'s air quality index spends weeks in the hazardous range. Schools now close for smoke the way they once closed for snow.',
      'SSP3-7.0': 'Permanent wildfire season has choked the valley. The sky is orange from June to November. Masks aren\'t optional — they\'re survival gear.',
      'SSP5-8.5': 'The valley burned for three consecutive years. What forest wasn\'t ash became scrubland. Smoke is a permanent condition, not a season.',
    }
  },
  {
    id: 'houston',
    name: 'Houston, TX',
    lat: 29.76,
    lon: -95.37,
    riskType: 'flood',
    sspDescriptions: {
      'SSP2-4.5': 'Harvey-scale flooding now happens every four years. The petrochemical corridor leaks with each surge. The city absorbs it — barely.',
      'SSP3-7.0': 'The ship channel flooded permanently in the last decade. Chronic contamination from refinery flooding made the east side uninhabitable. The evacuation zones keep expanding.',
      'SSP5-8.5': 'Chronic flooding and petrochemical contamination forced the evacuation. The refineries are gone. The groundwater is worse.',
    }
  },
  {
    id: 'new_orleans',
    name: 'New Orleans, LA',
    lat: 29.95,
    lon: -90.07,
    riskType: 'hurricane',
    sspDescriptions: {
      'SSP2-4.5': 'Restored wetlands bought another generation. But the city exists at the pleasure of the storm system now — three close calls in the last decade.',
      'SSP3-7.0': 'Category 4 landfalls are routine. The surge barriers were overwhelmed last year. The French Quarter is accessible only by boat at high tide.',
      'SSP5-8.5': 'The levees failed for the last time. The city belongs to the Gulf now.',
    }
  },
  {
    id: 'charleston',
    name: 'Charleston, SC',
    lat: 32.78,
    lon: -79.93,
    riskType: 'flood',
    sspDescriptions: {
      'SSP2-4.5': 'King tide flooding is managed with raised streets and pump systems — expensive, effective for now. The lower peninsula is a different story.',
      'SSP3-7.0': 'Tidal flooding is permanent below Broad Street. The historic district is accessible only at low tide. Holdouts cluster on what high ground remains.',
      'SSP5-8.5': 'Tidal flooding became permanent. Downtown is underwater at high tide. The last residents left when the grid failed.',
    }
  }
];

export const destinations = [
  {
    id: 'minneapolis',
    name: 'Minneapolis, MN',
    lat: 44.98,
    lon: -93.27,
    sspDescriptions: {
      'SSP2-4.5': 'The Twin Cities remain a climate stronghold — abundant freshwater, winters that are finally manageable. Migration pressure has raised costs, but the city holds.',
      'SSP3-7.0': 'Minneapolis draws millions from the south. The city is crowded and building fast, but there\'s water, food, and air you can breathe.',
      'SSP5-8.5': 'The Twin Cities have absorbed three waves of climate migration. Infrastructure is strained, but the freshwater is real and the heat is survivable. It\'s a refuge — just a crowded one.',
    }
  },
  {
    id: 'buffalo',
    name: 'Buffalo, NY',
    lat: 42.89,
    lon: -78.88,
    sspDescriptions: {
      'SSP2-4.5': 'Great Lakes access and newly mild summers have made Buffalo a model climate city. The infrastructure revival is real.',
      'SSP3-7.0': 'Buffalo\'s winters have retreated — now temperate, sometimes warm. The city is rebuilding around migrants from the South. The Lake is still the draw.',
      'SSP5-8.5': 'Buffalo runs hotter than anyone planned. But it still has the lake, and compared to where you came from, that\'s everything.',
    }
  },
  {
    id: 'boise',
    name: 'Boise, ID',
    lat: 43.62,
    lon: -116.21,
    sspDescriptions: {
      'SSP2-4.5': 'Mountain snowpack holds through mid-century. Cool summers and clean air draw migrants from the burning West. The city is overwhelmed but welcoming.',
      'SSP3-7.0': 'Wildfire smoke reaches Boise most summers, but nothing like the valleys below. The mountains still hold water. It\'s the best of a narrowing set of options.',
      'SSP5-8.5': 'Boise is warmer and drier than anyone hoped, but the Snake River still runs and the altitude gives you six degrees of mercy over the valley floor.',
    }
  },
  {
    id: 'burlington',
    name: 'Burlington, VT',
    lat: 44.48,
    lon: -73.21,
    sspDescriptions: {
      'SSP2-4.5': 'New England resilience — Lake Champlain, intact forests, community infrastructure that absorbed early migration waves without fracturing.',
      'SSP3-7.0': 'Burlington runs warmer and wetter than it used to. The lake rises hard in spring. But the air is clean and the community is real.',
      'SSP5-8.5': 'Vermont is warmer than anyone expected — forests thinner, spring flooding routine. By any comparison with where you came from, it\'s still sanctuary.',
    }
  }
];

/**
 * Return the SSP-appropriate description for an origin city.
 * Falls back to SSP5-8.5 (worst case) if ssp not found.
 *
 * @param {object} city — origin city object
 * @param {string} ssp  — 'SSP2-4.5' | 'SSP3-7.0' | 'SSP5-8.5'
 * @returns {string}
 */
export function getOriginDescription(city, ssp) {
  return city.sspDescriptions?.[ssp] ?? city.sspDescriptions?.['SSP5-8.5'] ?? '';
}

/**
 * Return the SSP-appropriate description for a destination city.
 *
 * @param {object} city — destination city object
 * @param {string} ssp  — 'SSP2-4.5' | 'SSP3-7.0' | 'SSP5-8.5'
 * @returns {string}
 */
export function getDestinationDescription(city, ssp) {
  return city.sspDescriptions?.[ssp] ?? city.sspDescriptions?.['SSP5-8.5'] ?? '';
}
