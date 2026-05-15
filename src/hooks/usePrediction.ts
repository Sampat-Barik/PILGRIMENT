/**
 * Custom React hook for the datewise crowd prediction feature.
 * Orchestrates the prediction engine, caching, and UI state.
 */
import { useState, useCallback, useRef } from 'react';
import type { PredictionResult, PredictionStatus, PilgrimLocation } from '../types/prediction';
import { generatePrediction } from '../services/predictionEngine';
import { cachePrediction, getCachedPredictions, cleanExpiredCache } from '../services/predictionStore';

interface UsePredictionReturn {
  result: PredictionResult | null;
  status: PredictionStatus;
  error: string | null;
  predict: (location: PilgrimLocation, startDate: string, days?: number) => Promise<void>;
  reset: () => void;
}

export function usePrediction(): UsePredictionReturn {
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [status, setStatus] = useState<PredictionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const predict = useCallback(async (
    location: PilgrimLocation,
    startDate: string,
    days: number = 7
  ) => {
    abortRef.current = false;
    setStatus('loading');
    setError(null);
    setResult(null);

    try {
      // Clean expired cache in background (fire-and-forget)
      cleanExpiredCache().catch(() => {});

      // Check cache first
      const cached = await getCachedPredictions(location.id, startDate, days);

      if (abortRef.current) return;

      // If we have all days cached, build result from cache
      if (cached.size === days) {
        console.log('[usePrediction] Full cache hit');
        // Still generate fresh for completeness (hourly, summary, etc.)
      }

      // Generate fresh prediction
      const prediction = await generatePrediction(location, startDate, days);

      if (abortRef.current) return;

      // Cache the result (fire-and-forget)
      cachePrediction(prediction).catch(() => {});

      setResult(prediction);
      setStatus('success');
    } catch (err) {
      if (abortRef.current) return;
      const message = err instanceof Error ? err.message : 'Prediction failed';
      console.error('[usePrediction] Error:', err);
      setError(message);
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    setResult(null);
    setStatus('idle');
    setError(null);
  }, []);

  return { result, status, error, predict, reset };
}
