/**
 * ui/hurricaneCard.js — Real hurricane landfall record for the player's location
 *
 * Shown in the event panel when a hurricane event fires, and summarised on the
 * end screen. All numbers come from data/hurricaneStats.js, which is generated
 * from HUTrackDB by scripts/build_hurricane_stats.py. See docs/perils/hurricane.md.
 */

import { HURRICANE_STATS, HUTRACK_META } from '../data/hurricaneStats.js';

// Exact: 1 mi = 1.609344 km.
const KM_PER_MILE = 1.609344;

const COUNTRY_NAMES = { US: '', MX: 'Mexico', CU: 'Cuba', BS: 'Bahamas' };

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function place(name, iso) {
  const country = iso in COUNTRY_NAMES ? COUNTRY_NAMES[iso] : iso;
  return esc(country ? `${name}, ${country}` : name);
}

function stormName(s) {
  return s.name ? `${esc(s.name)} (${s.season})` : `an unnamed ${s.season} storm`;
}

// Turn an annual rate into "about 1 every N years".
export function returnPeriodText(perYear) {
  if (!perYear) return 'none on record';
  const years = Math.round(1 / perYear);
  return years <= 1 ? 'about once a year' : `about 1 every ${years} years`;
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Stats for a waypoint name, or null if the build has none for it. */
export function getHurricaneStats(waypointName) {
  return HURRICANE_STATS[waypointName] || null;
}

function attributionHtml() {
  return `<p class="data-card-source">Data:
      <a href="${HUTRACK_META.url}" target="_blank" rel="noopener">HUTrackDB</a>
      — landfall analysis of NOAA HURDAT2, ${HUTRACK_META.recordEnd} season.</p>`;
}

/**
 * Event-panel card for a hurricane encountered at `waypointName`.
 * Returns '' when there is no data for the waypoint.
 */
export function hurricaneCardHtml(waypointName) {
  const s = getHurricaneStats(waypointName);
  if (!s) return '';

  const radius = `${HUTRACK_META.radiusNmi} nautical miles`;
  const span = `${s.recordStart}–${HUTRACK_META.recordEnd}`;
  const modernYears = HUTRACK_META.recordEnd - HUTRACK_META.modernStart + 1;

  let intro;
  if (s.mode === 'local') {
    intro = `<p><strong>${plural(s.landfalls, 'hurricane')}</strong> made landfall within ${radius}
      of ${esc(waypointName)} in ${span} — ${returnPeriodText(s.perYear)}.</p>`;
  } else {
    const miles = Math.round(s.nearestLandfallKm / KM_PER_MILE);
    intro = `<p>No hurricane on record has made landfall within ${radius} of ${esc(waypointName)}.
      The nearest landfall was <strong>${miles} mi away</strong>, in ${place(s.nearestPlace, s.nearestCountry)}.
      Near that coast: <strong>${plural(s.landfalls, 'hurricane')}</strong> in ${span} —
      ${returnPeriodText(s.perYear)}.</p>`;
  }

  const modernCount = s.landfallsModern
    ? `${s.landfallsModern} in ${modernYears} seasons (${returnPeriodText(s.perYearModern)})`
    : `none in ${modernYears} seasons`;
  const modern = `<p>Since ${HUTRACK_META.modernStart}: ${modernCount}.
      Major (Category 3+): ${s.major} of ${s.landfalls}.</p>`;

  const cats = ['1', '2', '3', '4', '5'].map(c => `
      <span class="cat-cell cat-${c}${s.byCategory[c] ? '' : ' cat-zero'}">
        <span class="cat-label">Cat ${c}</span>
        <span class="cat-count">${s.byCategory[c]}</span>
      </span>`).join('');

  const st = s.strongest, mr = s.mostRecent;
  const notable = st ? `<p>Strongest: ${stormName(st)}, Category ${st.category},
      ${st.windKt} kt (${st.windMph} mph) at landfall in ${place(st.place, st.country)}.
      ${mr && (mr.season !== st.season || mr.name !== st.name)
        ? `Most recent: ${stormName(mr)}, Category ${mr.category}.` : ''}</p>` : '';

  return `
    <div class="data-card hurricane-data">
      <div class="data-card-title">Real hurricane record${s.mode === 'local' ? ` · ${esc(waypointName)}` : ' · nearest coast'}</div>
      ${intro}
      <div class="cat-row">${cats}</div>
      ${modern}
      ${notable}
      ${attributionHtml()}
    </div>`;
}

/** One-sentence summary for the end-screen research section. */
export function hurricaneSummaryText(waypointName) {
  const s = getHurricaneStats(waypointName);
  if (!s) return '';
  const nmi = `${HUTRACK_META.radiusNmi} nautical miles`;
  const tally = `${plural(s.landfalls, 'hurricane landfall')}, ${s.recordStart}–${HUTRACK_META.recordEnd}
    (${returnPeriodText(s.perYear)}; ${s.major} major)`;
  if (s.mode === 'local') {
    return `${esc(waypointName)}: ${tally} within ${nmi}.`;
  }
  // Inland: the tally is for the coast around the nearest landfall, not the waypoint.
  const miles = Math.round(s.nearestLandfallKm / KM_PER_MILE);
  return `${esc(waypointName)}: no hurricane landfall within ${nmi}. Its nearest
    hurricane coast, ${place(s.nearestPlace, s.nearestCountry)} (${miles} mi away), has had ${tally}
    within ${nmi}.`;
}

export const HUTRACK_CITATION =
  `HUTrackDB (${HUTRACK_META.builtAtUtc?.slice(0, 4) ?? ''}). Curated hurricane track and landfall database built from NOAA HURDAT2 ` +
  `(${HUTRACK_META.recordStart}–${HUTRACK_META.recordEnd}). ${HUTRACK_META.url}`;
