/**
 * Gemini One-Shot Service with Firebase Persistence.
 * 1. Checks Local Cache (12 hours)
 * 2. Checks Firestore (Shared today's sync)
 * 3. Calls Gemini API (Last resort)
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

import { saveMasterSync, getMasterSync } from './predictionStore';

export interface GeminiDailyForecast { date: string; count: number; label: string; }
export interface GeminiHourlyForecast { hour: string; count: number; isPeak: boolean; }
export interface GeminiLocationData {
  locationId: string;
  locationName: string;
  current_status: string;
  daily_forecast: GeminiDailyForecast[];
  hourly_today: GeminiHourlyForecast[];
  summary: string;
}

/**
 * Prompt for ALL locations at once.
 */
function buildMasterPrompt(locations: {id: string, name: string}[]): string {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  
  return `Today is ${dayName}, ${dateStr}.
Task: As a Char Dham Analytics AI, provide a crowd estimation for ALL of the following 10 locations in ONE JSON response.

Locations: ${locations.map(l => l.name).join(', ')}

For each location, estimate:
1. Current Status (High/Moderate/Low)
2. Daily counts for 5 days starting ${dateStr}
3. Hourly counts for today (6AM, 10AM, 2PM, 6PM, 10PM)
4. A brief 1-sentence summary based on the current season/day.

Return ONLY a raw JSON object:
{
  "predictions": {
    ${locations.map(l => `
    "${l.id}": {
      "locationId": "${l.id}",
      "locationName": "${l.name}",
      "current_status": "...",
      "daily_forecast": [{"date": "...", "count": 1234, "label": "..."}],
      "hourly_today": [{"hour": "...", "count": 1234, "isPeak": true}],
      "summary": "..."
    }`).join(',')}
  }
}`;
}

async function callGemini(prompt: string, apiKey: string): Promise<any> {
  const res = await fetch(`${GEMINI_API_BASE}/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
    }),
  });

  if (res.status === 429) throw new Error('RATE_LIMITED');
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('NO_RESPONSE');

  const clean = text.trim().replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  return JSON.parse(clean.substring(start, end + 1));
}

/**
 * Fetch all predictions in one go.
 */
export async function fetchAllPredictions(locations: {id: string, name: string}[]): Promise<Record<string, GeminiLocationData>> {
  // 1. Check Local Cache first
  const cached = localStorage.getItem('gemini_master_cache');
  if (cached) {
    const { timestamp, predictions } = JSON.parse(cached);
    if (Date.now() - timestamp < 43200000) return predictions;
  }

  // 2. Check Firebase (Shared Sync)
  console.log('[Gemini] Checking Firebase for shared sync...');
  const firestoreData = await getMasterSync();
  if (firestoreData) {
    // Save to local cache too
    localStorage.setItem('gemini_master_cache', JSON.stringify({
      timestamp: Date.now(),
      predictions: firestoreData
    }));
    return firestoreData;
  }

  // 3. Last resort: Call Gemini API
  console.log('[Gemini] No cache found, calling API...');
  const keys = [import.meta.env.VITE_GEMINI_API_KEY, import.meta.env.VITE_GEMINI_API_KEY_2].filter(Boolean);
  const prompt = buildMasterPrompt(locations);
  
  for (const key of keys) {
    try {
      const result = await callGemini(prompt, key!);
      
      // Save to Firebase for everyone else
      await saveMasterSync(result.predictions);
      
      // Save to Local Cache
      localStorage.setItem('gemini_master_cache', JSON.stringify({
        timestamp: Date.now(),
        predictions: result.predictions
      }));
      
      return result.predictions;
    } catch (e) {
      console.warn('[Gemini] Key failed, trying next...');
    }
  }
  
  throw new Error('RATE_LIMITED');
}
