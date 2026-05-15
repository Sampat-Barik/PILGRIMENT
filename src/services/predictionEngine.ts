import { PILGRIM_LOCATIONS } from '../services/predictionLocations';
import type { GeminiLocationData } from './geminiService';
import {
  applyDailyCap,
  blendWithWeather,
  getSamplePilgrimsForDate,
  referenceDailyBaseline,
  referenceHourlyToday,
  resolveShrineKey,
  summaryLine,
} from './chardhamReference';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

function deterministicValue(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const range = Math.max(1, max - min);
  return min + (hash % range);
}

async function fetchDatawisePrediction(locationId: string): Promise<GeminiLocationData> {
  const response = await fetch(`${API_BASE}/datawise/prediction?location_id=${encodeURIComponent(locationId)}`);
  if (!response.ok) throw new Error('DATAWISE_API_ERROR');
  const data = await response.json();
  return data as GeminiLocationData;
}

function weatherScore(rainProb: number, code: number): number {
  const rainPenalty = Math.min(0.45, Math.max(0, rainProb || 0) / 200);
  const severe = new Set([65, 67, 75, 82, 86, 96, 99]);
  const moderate = new Set([61, 63, 71, 73, 80, 81, 85, 95]);
  const codePenalty = severe.has(code) ? 0.35 : moderate.has(code) ? 0.2 : 0.05;
  return Math.max(0.35, Math.min(1, 1 - rainPenalty - codePenalty));
}

async function fetchOpenMeteoClientPrediction(locationId: string): Promise<GeminiLocationData> {
  const loc = PILGRIM_LOCATIONS.find((l) => l.id === locationId);
  if (!loc?.lat || !loc?.lng) throw new Error('NO_LOCATION_COORDS');

  const shrineKey = resolveShrineKey(locationId);

  const params = new URLSearchParams({
    latitude: String(loc.lat),
    longitude: String(loc.lng),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
    forecast_days: '6',
    timezone: 'Asia/Kolkata',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!res.ok) throw new Error('OPEN_METEO_FAILED');
  const data = await res.json();
  const daily = data?.daily;
  if (!daily?.time?.length) throw new Error('OPEN_METEO_EMPTY');

  const daily_forecast = daily.time.slice(0, 6).map((dateText: string, i: number) => {
    const dt = new Date(`${dateText}T12:00:00`);
    const rain = Number(daily.precipitation_probability_max?.[i] ?? 0);
    const code = Number(daily.weather_code?.[i] ?? 0);
    const wx = weatherScore(rain, code);
    const sample = getSamplePilgrimsForDate(shrineKey, dateText);
    const refBase = sample ?? referenceDailyBaseline(locationId, dt);
    let count = blendWithWeather(refBase, wx);
    count = applyDailyCap(locationId, count);
    return {
      date: dateText,
      label: dt.toLocaleDateString('en-US', { weekday: 'short' }),
      count,
    };
  });

  const todayText = daily.time[0];
  const todayDt = new Date(`${todayText}T12:00:00`);
  const todaySample = getSamplePilgrimsForDate(shrineKey, todayText);
  const todayRain = Number(daily.precipitation_probability_max?.[0] ?? 0);
  const todayCode = Number(daily.weather_code?.[0] ?? 0);
  const todayTotal = applyDailyCap(
    locationId,
    blendWithWeather(
      todaySample ?? referenceDailyBaseline(locationId, todayDt),
      weatherScore(todayRain, todayCode)
    )
  );

  const hourly_today = referenceHourlyToday(locationId, todayTotal, shrineKey);

  const maxCount = Math.max(...daily_forecast.map((d: { count: number }) => d.count));
  const current_status =
    maxCount >= loc.baseCapacity * 1.35 ? 'High' : maxCount >= loc.baseCapacity * 0.85 ? 'Moderate' : 'Low';

  return {
    locationId,
    locationName: loc.name,
    current_status,
    summary: summaryLine(),
    daily_forecast,
    hourly_today,
  };
}

/**
 * Statistical engine fallback.
 * Uses `chardham_pilgrim_data.json` reference series + optional weather when online.
 */
export async function getStatisticalPrediction(locationId: string): Promise<GeminiLocationData> {
  // Prefer client: `chardham_pilgrim_data.json` + Open-Meteo (same as UI "Datawise")
  try {
    return await fetchOpenMeteoClientPrediction(locationId);
  } catch {
    // No network or Meteo failed — try backend if running
  }

  try {
    return await fetchDatawisePrediction(locationId);
  } catch {
    // Offline: reference JSON only
  }

  const loc = PILGRIM_LOCATIONS.find((l) => l.id === locationId);
  const shrineKey = resolveShrineKey(locationId);
  const today = new Date();

  return {
    locationId,
    locationName: loc?.name || 'Unknown',
    current_status: 'Moderate',
    summary: summaryLine(),
    daily_forecast: Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i + 1);
      const iso = d.toISOString().split('T')[0];
      const sample = getSamplePilgrimsForDate(shrineKey, iso);
      const count = sample ?? referenceDailyBaseline(locationId, d);
      return {
        date: iso,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        count: applyDailyCap(locationId, Math.max(40, Math.round(count))),
      };
    }),
    hourly_today: referenceHourlyToday(
      locationId,
      applyDailyCap(
        locationId,
        Math.round(referenceDailyBaseline(locationId, today) * (0.85 + deterministicValue(`${locationId}:h`, 0, 15) / 100))
      ),
      shrineKey
    ),
  };
}
