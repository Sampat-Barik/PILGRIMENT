/**
 * Firebase Firestore service layer for AI Master Sync.
 * Stores and retrieves full-circuit predictions to minimize API costs.
 */
import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { GeminiLocationData } from './geminiService';

const MASTER_SYNC_COLLECTION = 'master_ai_predictions';

/**
 * Get the document ID for today (e.g., "sync_2026-05-13")
 */
function getSyncKey(): string {
  return `sync_${new Date().toISOString().split('T')[0]}`;
}

/**
 * Save the master AI sync result to Firestore.
 */
export async function saveMasterSync(predictions: Record<string, GeminiLocationData>): Promise<void> {
  try {
    const key = getSyncKey();
    const docRef = doc(db, MASTER_SYNC_COLLECTION, key);
    
    await setDoc(docRef, {
      timestamp: Date.now(),
      dateStr: new Date().toISOString().split('T')[0],
      predictions
    });
    
    console.log(`[Firestore] Master Sync saved for ${key}`);
  } catch (err) {
    console.warn('[Firestore] Sync save failed:', err);
  }
}

/**
 * Retrieve today's master AI sync from Firestore.
 * Returns null if no sync has been performed today.
 */
export async function getMasterSync(): Promise<Record<string, GeminiLocationData> | null> {
  try {
    const key = getSyncKey();
    const docRef = doc(db, MASTER_SYNC_COLLECTION, key);
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
      const data = snap.data();
      console.log(`[Firestore] Master Sync found for ${key}`);
      return data.predictions as Record<string, GeminiLocationData>;
    }
  } catch (err) {
    console.warn('[Firestore] Sync read failed:', err);
  }
  return null;
}
