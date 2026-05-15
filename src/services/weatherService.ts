/**
 * Weather data service using the free wttr.in API.
 * No API key required. Returns normalized WeatherData objects.
 */
import type { WeatherData } from '../types/prediction';

const WTTR_BASE = 'https://wttr.in';

interface WttrDay {
  date: string;
  avgtempC: string;
  maxtempC: string;
  mintempC: string;
  uvIndex: string;
  hourly: Array<{
    tempC: string;
    FeelsLikeC: string;
    humidity: string;
    windspeedKmph: string;
    weatherDesc: Array<{ value: string }>;
    weatherCode: string;
    chanceofrain: string;
    uvIndex: string;
  }>;
}

function mapConditionCode(code: string): WeatherData['conditionCode'] {
  const c = parseInt(code, 10);
  if (c <= 113) return 'clear';
  if (c <= 176) return 'cloudy';
  if (c <= 302) return 'rain';
  if (c <= 392) return 'snow';
  if (c <= 395) return 'storm';
  return 'fog';
}

function computeWeatherScore(data: {
  conditionCode: WeatherData['conditionCode'];
  tempC: number;
  rainChance: number;
  windKph: number;
}): number {
  let score = 1.0;

  // Weather condition penalty
  const conditionPenalty: Record<string, number> = {
    clear: 0,
    cloudy: 0.05,
    fog: 0.15,
    rain: 0.35,
    snow: 0.5,
    storm: 0.7,
  };
  score -= conditionPenalty[data.conditionCode] || 0;

  // Temperature comfort (ideal 15-28°C for pilgrimages)
  if (data.tempC < 5) score -= 0.2;
  else if (data.tempC < 10) score -= 0.1;
  else if (data.tempC > 35) score -= 0.15;
  else if (data.tempC > 40) score -= 0.3;

  // Rain chance penalty
  score -= (data.rainChance / 100) * 0.2;

  // Wind penalty
  if (data.windKph > 40) score -= 0.15;
  else if (data.windKph > 25) score -= 0.05;

  return Math.max(0, Math.min(1, score));
}

/**
 * Fetch 7-day weather forecast for a location name.
 * Falls back to synthetic data on failure.
 */
export async function fetchWeather(locationName: string): Promise<WeatherData[]> {
  try {
    const url = `${WTTR_BASE}/${encodeURIComponent(locationName)}?format=j1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`wttr.in returned ${res.status}`);

    const json = await res.json();
    const days: WttrDay[] = json.weather || [];

    return days.map((day) => {
      // Use midday hourly data for representative values
      const mid = day.hourly[Math.floor(day.hourly.length / 2)] || day.hourly[0];
      const tempC = parseFloat(mid?.tempC || day.avgtempC);
      const conditionCode = mapConditionCode(mid?.weatherCode || '113');
      const rainChance = parseFloat(mid?.chanceofrain || '0');
      const windKph = parseFloat(mid?.windspeedKmph || '0');

      return {
        date: day.date,
        tempC,
        feelsLikeC: parseFloat(mid?.FeelsLikeC || String(tempC)),
        humidity: parseFloat(mid?.humidity || '50'),
        windKph,
        condition: mid?.weatherDesc?.[0]?.value || 'Unknown',
        conditionCode,
        uvIndex: parseFloat(mid?.uvIndex || day.uvIndex || '5'),
        rainChance,
        weatherScore: computeWeatherScore({ conditionCode, tempC, rainChance, windKph }),
      };
    });
  } catch (err) {
    console.warn('[WeatherService] Fetch failed, using synthetic data:', err);
    return generateSyntheticWeather(7);
  }
}

/**
 * Generate synthetic weather data as fallback when API is unavailable.
 */
function generateSyntheticWeather(days: number): WeatherData[] {
  const results: WeatherData[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const month = date.getMonth(); // 0-11

    // Seasonal temperature ranges for Uttarakhand hills
    let baseTempC: number;
    if (month >= 4 && month <= 6) baseTempC = 18 + Math.random() * 10;      // May-Jul
    else if (month >= 7 && month <= 9) baseTempC = 14 + Math.random() * 8;   // Aug-Oct
    else baseTempC = 2 + Math.random() * 12;                                  // Nov-Apr

    const rainChance = month >= 6 && month <= 8
      ? 40 + Math.random() * 40   // monsoon
      : 5 + Math.random() * 20;

    const conditionCode: WeatherData['conditionCode'] =
      rainChance > 60 ? 'rain' : rainChance > 40 ? 'cloudy' : 'clear';

    const windKph = 5 + Math.random() * 20;

    results.push({
      date: date.toISOString().split('T')[0],
      tempC: Math.round(baseTempC * 10) / 10,
      feelsLikeC: Math.round((baseTempC - 2) * 10) / 10,
      humidity: Math.round(40 + Math.random() * 40),
      windKph: Math.round(windKph),
      condition: conditionCode === 'clear' ? 'Sunny' : conditionCode === 'rain' ? 'Light Rain' : 'Partly Cloudy',
      conditionCode,
      uvIndex: Math.round(3 + Math.random() * 7),
      rainChance: Math.round(rainChance),
      weatherScore: computeWeatherScore({ conditionCode, tempC: baseTempC, rainChance, windKph }),
    });
  }

  return results;
}
