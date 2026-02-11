const API_KEY = '529e8d2417a07aca80ccd0fb03036ed3';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Session cache: key = "lat,lon" → { data, timestamp }
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function fetchWeather(lat, lon) {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  // Check cache
  if (cache.has(key)) {
    const cached = cache.get(key);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  try {
    const url = `${BASE_URL}?lat=${lat}&lon=${lon}&units=imperial&appid=${API_KEY}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;

    const json = await resp.json();
    const data = parseWeather(json);
    cache.set(key, { data, timestamp: Date.now() });
    return data;
  } catch {
    return null;
  }
}

function parseWeather(json) {
  const temp = json.main?.temp || 70;
  const humidity = json.main?.humidity || 50;
  const wind = json.wind?.speed || 5;
  const condition = json.weather?.[0]?.main?.toLowerCase() || 'clear';
  const description = json.weather?.[0]?.description || '';

  // Classify icon
  let icon = 'clear';
  if (condition.includes('thunder') || condition.includes('storm')) icon = 'storm';
  else if (condition.includes('rain') || condition.includes('drizzle')) icon = 'rain';
  else if (condition.includes('snow')) icon = 'snow';
  else if (condition.includes('cloud')) icon = 'clouds';
  else if (condition.includes('mist') || condition.includes('fog') || condition.includes('haze')) icon = 'mist';

  if (temp > 100) icon = 'hot';
  if (wind > 35) icon = 'wind';

  return {
    temp,
    humidity,
    wind,
    condition,
    description,
    icon
  };
}

// Convert weather data into risk modifiers for the event engine
export function getWeatherRisk(weatherData) {
  if (!weatherData) {
    return { severity: 0, eventBoost: 0 };
  }

  const { temp, humidity, wind, condition } = weatherData;
  const risk = {
    heat: 0,
    flood: 0,
    wildfire: 0,
    tornado: 0,
    hurricane: 0,
    severity: 0,
    eventBoost: 0
  };

  // Temperature risks
  if (temp > 95) {
    risk.heat = (temp - 95) / 30; // 0 at 95, ~1 at 125
    risk.severity += 0.3;
  }
  if (temp > 110) {
    risk.wildfire += 0.3; // extreme heat + fire risk
  }

  // Humidity
  if (humidity < 20) {
    risk.wildfire += 0.5;
  }
  if (humidity > 80 && temp > 75) {
    risk.hurricane += 0.2;
  }

  // Wind
  if (wind > 30) {
    risk.tornado += (wind - 30) / 20;
    risk.severity += 0.2;
  }
  if (wind > 50) {
    risk.hurricane += 0.4;
  }

  // Precipitation
  if (condition.includes('rain') || condition.includes('drizzle')) {
    risk.flood += 0.3;
  }
  if (condition.includes('thunder') || condition.includes('storm')) {
    risk.flood += 0.5;
    risk.tornado += 0.3;
    risk.severity += 0.3;
  }

  // Overall event boost from bad weather
  risk.eventBoost = Math.min(0.2, risk.severity * 0.15);

  return risk;
}

// Get a narrative snippet about the weather
export function getWeatherNarrative(weatherData) {
  if (!weatherData) return '';

  const { temp, condition, wind } = weatherData;
  const parts = [];

  if (temp > 100) parts.push(`The thermometer reads ${Math.round(temp)}\u00B0F.`);
  else if (temp > 90) parts.push(`It's a sweltering ${Math.round(temp)}\u00B0F.`);
  else if (temp < 32) parts.push(`A bitter ${Math.round(temp)}\u00B0F freeze grips the road.`);

  if (wind > 30) parts.push(`Winds gust at ${Math.round(wind)} mph.`);

  if (condition.includes('storm') || condition.includes('thunder')) parts.push('Thunder rolls in the distance.');
  else if (condition.includes('rain')) parts.push('Rain streaks the windshield.');

  return parts.join(' ');
}
