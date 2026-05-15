/**
 * Holiday and event detection service.
 * Uses the free Nager.Date API for public holidays,
 * plus a curated list of Hindu religious festivals and Char Dham events.
 */
import type { HolidayEvent } from '../types/prediction';

const NAGER_BASE = 'https://date.nager.at/api/v3';

/**
 * Curated list of major Hindu pilgrim festivals that cause crowd surges.
 * Dates are approximate — we match by month+day range.
 */
const RELIGIOUS_FESTIVALS: Array<{
  name: string;
  month: number;   // 1-12
  dayStart: number;
  dayEnd: number;
  impact: number;  // 0-1
}> = [
  { name: 'Akshaya Tritiya (Portals Open)', month: 5, dayStart: 1, dayEnd: 10, impact: 0.95 },
  { name: 'Buddha Purnima', month: 5, dayStart: 12, dayEnd: 14, impact: 0.5 },
  { name: 'Ganga Dussehra', month: 6, dayStart: 5, dayEnd: 12, impact: 0.7 },
  { name: 'Guru Purnima', month: 7, dayStart: 10, dayEnd: 20, impact: 0.6 },
  { name: 'Raksha Bandhan', month: 8, dayStart: 10, dayEnd: 20, impact: 0.4 },
  { name: 'Janmashtami', month: 8, dayStart: 20, dayEnd: 30, impact: 0.65 },
  { name: 'Ganesh Chaturthi', month: 9, dayStart: 1, dayEnd: 10, impact: 0.5 },
  { name: 'Navratri (Sharad)', month: 10, dayStart: 1, dayEnd: 15, impact: 0.85 },
  { name: 'Dussehra', month: 10, dayStart: 12, dayEnd: 16, impact: 0.7 },
  { name: 'Diwali Week', month: 10, dayStart: 25, dayEnd: 31, impact: 0.6 },
  { name: 'Diwali Week', month: 11, dayStart: 1, dayEnd: 5, impact: 0.6 },
  { name: 'Kartik Purnima', month: 11, dayStart: 10, dayEnd: 18, impact: 0.55 },
  { name: 'Makar Sankranti', month: 1, dayStart: 13, dayEnd: 15, impact: 0.5 },
  { name: 'Maha Shivaratri', month: 2, dayStart: 20, dayEnd: 28, impact: 0.9 },
  { name: 'Maha Shivaratri', month: 3, dayStart: 1, dayEnd: 5, impact: 0.9 },
  { name: 'Holi', month: 3, dayStart: 10, dayEnd: 18, impact: 0.35 },
  { name: 'Ram Navami', month: 4, dayStart: 5, dayEnd: 15, impact: 0.7 },
  { name: 'Char Dham Yatra Season Start', month: 4, dayStart: 25, dayEnd: 30, impact: 0.85 },
  { name: 'Char Dham Peak Season', month: 5, dayStart: 15, dayEnd: 31, impact: 0.9 },
  { name: 'Char Dham Peak Season', month: 6, dayStart: 1, dayEnd: 15, impact: 0.9 },
];

/**
 * Fetch public holidays from Nager.Date for India.
 */
async function fetchPublicHolidays(year: number): Promise<HolidayEvent[]> {
  try {
    const res = await fetch(`${NAGER_BASE}/PublicHolidays/${year}/IN`);
    if (!res.ok) throw new Error(`Nager.Date returned ${res.status}`);
    const holidays: Array<{ date: string; localName: string; name: string }> = await res.json();

    return holidays.map((h) => ({
      date: h.date,
      name: h.localName || h.name,
      type: 'public_holiday' as const,
      impactScore: 0.5, // Moderate impact for public holidays
    }));
  } catch (err) {
    console.warn('[HolidayService] Nager.Date fetch failed:', err);
    return [];
  }
}

/**
 * Check religious festivals for a specific date.
 */
function getLocalFestivals(dateStr: string): HolidayEvent[] {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();
  const results: HolidayEvent[] = [];

  for (const fest of RELIGIOUS_FESTIVALS) {
    if (fest.month === month && day >= fest.dayStart && day <= fest.dayEnd) {
      results.push({
        date: dateStr,
        name: fest.name,
        type: 'religious',
        impactScore: fest.impact,
      });
    }
  }

  return results;
}

/**
 * Check if a date is a weekend (Sat/Sun).
 */
function getWeekendEvent(dateStr: string): HolidayEvent | null {
  const date = new Date(dateStr);
  const dow = date.getDay();
  if (dow === 0 || dow === 6) {
    return {
      date: dateStr,
      name: dow === 0 ? 'Sunday' : 'Saturday',
      type: 'weekend',
      impactScore: 0.35,
    };
  }
  return null;
}

/**
 * Get all events (holidays, festivals, weekends) for a date range.
 */
export async function getEventsForRange(
  startDate: string,
  endDate: string
): Promise<Map<string, HolidayEvent[]>> {
  const eventsMap = new Map<string, HolidayEvent[]>();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const year = start.getFullYear();

  // Fetch public holidays (may fail — non-blocking)
  const publicHolidays = await fetchPublicHolidays(year);
  const publicMap = new Map<string, HolidayEvent[]>();
  for (const h of publicHolidays) {
    const existing = publicMap.get(h.date) || [];
    existing.push(h);
    publicMap.set(h.date, existing);
  }

  // Iterate through each date in range
  const cursor = new Date(start);
  while (cursor <= end) {
    const dateStr = cursor.toISOString().split('T')[0];
    const dayEvents: HolidayEvent[] = [];

    // Add public holidays
    const pub = publicMap.get(dateStr);
    if (pub) dayEvents.push(...pub);

    // Add religious festivals
    dayEvents.push(...getLocalFestivals(dateStr));

    // Add weekend
    const weekend = getWeekendEvent(dateStr);
    if (weekend) dayEvents.push(weekend);

    if (dayEvents.length > 0) {
      eventsMap.set(dateStr, dayEvents);
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return eventsMap;
}

/**
 * Get the maximum event impact score for a given date.
 */
export function getMaxEventImpact(events: HolidayEvent[]): number {
  if (events.length === 0) return 0;
  // Combine impacts: take max + small bonus for overlapping events
  const sorted = events.map((e) => e.impactScore).sort((a, b) => b - a);
  let combined = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    combined += sorted[i] * 0.15; // Diminishing overlap bonus
  }
  return Math.min(1, combined);
}
