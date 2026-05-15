/**
 * Core type definitions for the Datewise Crowd Prediction feature.
 * Covers locations, forecasts, weather, holidays, and crowd scoring.
 */

// ─── Location ────────────────────────────────────────
export interface PilgrimLocation {
  id: string;
  name: string;
  state: string;
  type: 'temple' | 'city' | 'route' | 'camp';
  baseCapacity: number;
  peakMultiplier: number;
  lat?: number;
  lng?: number;
}

// ─── Weather ─────────────────────────────────────────
export interface WeatherData {
  date: string;
  tempC: number;
  feelsLikeC: number;
  humidity: number;
  windKph: number;
  condition: string;
  conditionCode: 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';
  uvIndex: number;
  rainChance: number;
  /** 0-1 score: 1 = perfect weather, 0 = terrible */
  weatherScore: number;
}

// ─── Holiday / Event ─────────────────────────────────
export interface HolidayEvent {
  date: string;
  name: string;
  type: 'public_holiday' | 'religious' | 'festival' | 'weekend' | 'special_event';
  /** 0-1 multiplier for crowd surge */
  impactScore: number;
}

// ─── Hourly Breakdown ────────────────────────────────
export interface HourlyPrediction {
  hour: string;          // "04:00"
  count: number;
  isPeak: boolean;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
}

// ─── Daily Forecast ──────────────────────────────────
export interface DailyForecast {
  date: string;          // "2026-05-13"
  label: string;         // "Today", "Thu", etc.
  predictedCount: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  confidence: number;    // 0-100
  weather?: WeatherData;
  events: HolidayEvent[];
  bestTime: string;
  worstTime: string;
  trafficIntensity: 'light' | 'moderate' | 'heavy' | 'gridlock';
}

// ─── Full Prediction Result ──────────────────────────
export interface PredictionResult {
  id: string;
  location: PilgrimLocation;
  generatedAt: string;
  dateRange: { start: string; end: string };
  dailyForecasts: DailyForecast[];
  hourlyToday: HourlyPrediction[];
  summary: string;
  overallConfidence: number;
  dataSourcesUsed: string[];
  peakDay: DailyForecast;
  quietestDay: DailyForecast;
}

// ─── Crowd Score (internal) ──────────────────────────
export interface CrowdScoreFactors {
  basePopularity: number;       // 0-100
  weatherFactor: number;        // 0-1
  holidayFactor: number;        // 0-1
  dayOfWeekFactor: number;      // 0-1
  seasonalFactor: number;       // 0-1
  trendFactor: number;          // 0-1
  timeFactor: number;           // 0-1
  computedScore: number;        // final score
}

// ─── UI State ────────────────────────────────────────
export interface PredictionFilters {
  locationId: string;
  startDate: string;
  endDate: string;
  crowdCategory: 'all' | 'low' | 'moderate' | 'high' | 'critical';
}

export type PredictionStatus = 'idle' | 'loading' | 'success' | 'error';

// ─── Firebase cached prediction doc ──────────────────
export interface CachedPrediction {
  locationId: string;
  dateKey: string;           // "2026-05-13"
  prediction: DailyForecast;
  createdAt: string;
  expiresAt: string;
  source: 'computed' | 'gemini' | 'fallback';
}

// ─── Gemini API (optional enhancement) ───────────────
export interface GeminiPredictionResponse {
  location: string;
  daily_forecast: Array<{
    date: string;
    count: number;
    label: string;
  }>;
  hourly_today: Array<{
    hour: string;
    count: number;
    isPeak: boolean;
  }>;
  summary: string;
}
