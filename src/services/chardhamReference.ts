import chardhamJson from '../../chardham_pilgrim_data.json';

type ShrineMonthlyRow = {
  month_num?: number;
  pilgrims?: number;
  days_open?: number;
  avg_daily?: number;
  temple_open?: boolean;
};

type ShrineBundle = {
  monthly_data_2025?: ShrineMonthlyRow[];
  monthly_data_2024?: ShrineMonthlyRow[];
  annual_data?: Array<{ year: number; avg_daily?: number; total_pilgrims?: number; days_open?: number }>;
  daily_sample_data?: { data?: Array<{ date: string; pilgrims: number }> } | Array<{ date: string; pilgrims: number }>;
  hourly_sample_data?: {
    hours?: Array<{ hour: string; pilgrims_in_hour?: number }>;
    total_day_pilgrims?: number;
  };
};

const METADATA = chardhamJson.metadata as {
  daily_cap_kedarnath?: number;
};

const SHRINES = chardhamJson.shrines as Record<string, ShrineBundle>;

const DAILY_PATTERN = (
  chardhamJson as { projections_methodology?: { daily_pattern_model?: { pattern?: Record<string, number> } } }
).projections_methodology?.daily_pattern_model?.pattern ?? {
  opening_week_factor: 2.5,
  pre_closing_week_factor: 2.2,
  peak_season_may_june_factor: 1.6,
  monsoon_july_aug_factor: 0.55,
  post_monsoon_sep_oct_factor: 1.1,
  weekend_multiplier: 1.3,
  holiday_multiplier: 2.0,
};

/** Maps app location id → shrine key in JSON (or derived hub scaling). */
export const LOCATION_TO_SHRINE: Record<string, keyof typeof SHRINES | 'scaled_from_kedarnath'> = {
  kedarnath: 'Kedarnath',
  badrinath: 'Badrinath',
  gangotri: 'Gangotri',
  yamunotri: 'Yamunotri',
  hemkund: 'Hemkund_Sahib',
  sonprayag: 'Kedarnath',
  gaurikund: 'Kedarnath',
  joshimath: 'Badrinath',
  haridwar: 'scaled_from_kedarnath',
  rishikesh: 'scaled_from_kedarnath',
};

const KEDARNATH_BASE_CAPACITY_REF = 15000;

export function resolveShrineKey(locationId: string): keyof typeof SHRINES {
  const m = LOCATION_TO_SHRINE[locationId];
  if (m === 'scaled_from_kedarnath') return 'Kedarnath';
  if (m && typeof m === 'string') return m as keyof typeof SHRINES;
  return 'Kedarnath';
}

export function applyDailyCap(locationId: string, count: number): number {
  const cap = METADATA.daily_cap_kedarnath ?? 12000;
  if (locationId === 'kedarnath' || locationId === 'gaurikund' || locationId === 'sonprayag') {
    return Math.min(count, cap);
  }
  return count;
}

function shrineEntries(row: ShrineMonthlyRow | undefined): { pilgrims: number; days: number; avg: number } {
  if (!row || row.temple_open === false) return { pilgrims: 0, days: 0, avg: 0 };
  const pilgrims = Number(row.pilgrims ?? 0);
  const days = Number(row.days_open ?? 30);
  const avg =
    row.avg_daily != null && !Number.isNaN(Number(row.avg_daily))
      ? Number(row.avg_daily)
      : days > 0
        ? pilgrims / days
        : 0;
  return { pilgrims, days, avg };
}

function monthlyAvgForShrine(shrine: ShrineBundle, monthNum: number): number {
  const prefer2025 = shrine.monthly_data_2025;
  const fallback2024 = shrine.monthly_data_2024;
  const rows = prefer2025?.length ? prefer2025 : fallback2024;
  if (!rows?.length) return 0;
  const row = rows.find((r) => r.month_num === monthNum);
  if (!row) return 0;
  const { avg } = shrineEntries(row as ShrineMonthlyRow);
  return avg;
}

function projectedAnnualAvgDaily(shrine: ShrineBundle): number {
  const rows = shrine.annual_data ?? [];
  const y2026 = rows.find((a) => a.year === 2026);
  if (y2026?.avg_daily != null) return y2026.avg_daily;
  const y2025 = rows.find((a) => a.year === 2025);
  if (y2025?.avg_daily != null) return y2025.avg_daily;
  const last = rows[rows.length - 1];
  if (last?.avg_daily != null) return last.avg_daily;
  return 4000;
}

export function getSamplePilgrimsForDate(shrineKey: string, isoDate: string): number | null {
  const shrine = SHRINES[shrineKey];
  if (!shrine) return null;
  const raw = shrine.daily_sample_data;
  const list: Array<{ date: string; pilgrims: number }> | undefined = Array.isArray(raw)
    ? raw
    : raw?.data;
  if (!list?.length) return null;
  const hit = list.find((x) => x.date === isoDate);
  return hit ? Number(hit.pilgrims) : null;
}

/** Season-phase multiplier from dataset methodology (May–Jun peak, monsoon dip, etc.). */
function phaseMultiplier(date: Date): number {
  const m = date.getMonth() + 1;
  if (m === 5 || m === 6) return DAILY_PATTERN.peak_season_may_june_factor;
  if (m === 7 || m === 8) return DAILY_PATTERN.monsoon_july_aug_factor;
  if (m === 9 || m === 10) return DAILY_PATTERN.post_monsoon_sep_oct_factor;
  if (m === 4) return 1.35;
  if (m === 11) return 1.2;
  return 0.85;
}

function openingClosingBump(date: Date, shrineKey: string): number {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 5 && d <= 12) return DAILY_PATTERN.opening_week_factor / DAILY_PATTERN.peak_season_may_june_factor;
  if (m === 11 && d >= 25) return DAILY_PATTERN.pre_closing_week_factor / 1.1;
  if (m === 11 && d <= 5) return DAILY_PATTERN.pre_closing_week_factor / 1.15;
  return 1.0;
}

function weekendBump(date: Date): number {
  const wd = date.getDay();
  if (wd === 0 || wd === 6) return DAILY_PATTERN.weekend_multiplier;
  return 1.0;
}

export function referenceDailyBaseline(locationId: string, date: Date): number {
  const map = LOCATION_TO_SHRINE[locationId];
  const monthNum = date.getMonth() + 1;

  if (map === 'scaled_from_kedarnath') {
    const ked = SHRINES.Kedarnath;
    const kedMonthly = monthlyAvgForShrine(ked, monthNum) || projectedAnnualAvgDaily(ked);
    const scale =
      locationId === 'haridwar'
        ? 50000 / KEDARNATH_BASE_CAPACITY_REF
        : locationId === 'rishikesh'
          ? 35000 / KEDARNATH_BASE_CAPACITY_REF
          : 1.2;
    let v = kedMonthly * scale * phaseMultiplier(date) * weekendBump(date);
    return Math.max(80, Math.round(v));
  }

  const shrineKey = typeof map === 'string' && map !== 'scaled_from_kedarnath' ? map : 'Kedarnath';
  const shrine = SHRINES[shrineKey];
  if (!shrine) return 4000;

  let base = monthlyAvgForShrine(shrine, monthNum);
  if (base <= 0) base = projectedAnnualAvgDaily(shrine);

  base *= phaseMultiplier(date) * openingClosingBump(date, shrineKey) * weekendBump(date);

  const capped =
    shrineKey === 'Kedarnath' || locationId === 'gaurikund' || locationId === 'sonprayag'
      ? Math.min(base, METADATA.daily_cap_kedarnath ?? 12000)
      : base;

  return Math.max(50, Math.round(capped));
}

export function blendWithWeather(referenceCount: number, weatherFactor01: number): number {
  const blended = referenceCount * (0.72 + 0.28 * weatherFactor01);
  return Math.max(30, Math.round(blended));
}

type HourRow = { hour: string; pilgrims_in_hour?: number };

function parseHour(h: string): number {
  const [hh] = h.split(':').map(Number);
  return Number.isFinite(hh) ? hh : 0;
}

/** Build hourly bars using shrine-specific hourly_sample_data when present; scale to predicted daily total. */
export function referenceHourlyToday(
  locationId: string,
  predictedDailyTotal: number,
  shrineKeyOverride?: string
): Array<{ hour: string; count: number; isPeak: boolean }> {
  const shrineKey = (shrineKeyOverride as keyof typeof SHRINES | undefined) ?? resolveShrineKey(locationId);
  const shrine = SHRINES[shrineKey];
  const hours: HourRow[] = shrine?.hourly_sample_data?.hours ?? [];
  const weights = new Map<number, number>();
  if (hours.length) {
    for (const row of hours) {
      const hr = parseHour(row.hour);
      const w = Number(row.pilgrims_in_hour ?? 0);
      weights.set(hr, (weights.get(hr) ?? 0) + w);
    }
  }

  const labels = ['04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '21:00', '22:00', '23:00'];
  const fallback = [0.2, 0.35, 0.52, 0.7, 0.9, 1.0, 0.88, 0.72, 0.58, 0.5, 0.42, 0.3];

  let sumWeights = 0;
  const slotWeights = labels.map((lab, i) => {
    const h = parseHour(lab);
    if (weights.size) {
      const a = weights.get(h) ?? 0;
      const b = weights.get(h + 1) ?? 0;
      const w = (a + b) / 2 || fallback[i];
      sumWeights += w;
      return w;
    }
    sumWeights += fallback[i];
    return fallback[i];
  });

  const scale = predictedDailyTotal / Math.max(1e-6, sumWeights);
  let peakIdx = 0;
  let peakVal = -1;
  slotWeights.forEach((w, idx) => {
    if (w > peakVal) {
      peakVal = w;
      peakIdx = idx;
    }
  });

  return labels.map((hour, i) => ({
    hour,
    count: Math.max(15, Math.round(slotWeights[i] * scale)),
    isPeak: i === peakIdx || slotWeights[i] >= peakVal * 0.98,
  }));
}

export function summaryLine(): string {
  const sources = (chardhamJson.metadata as { sources?: string[] }).sources?.slice(0, 3).join('; ') ?? '';
  return `Crowd estimate blends Char Dham reference dataset (${sources}) with live weather adjustment.`;
}
