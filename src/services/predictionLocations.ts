/**
 * Curated Char Dham Yatra locations with base crowd capacity data.
 * These are used as inputs to the prediction engine.
 */
import type { PilgrimLocation } from '../types/prediction';

export const PILGRIM_LOCATIONS: PilgrimLocation[] = [
  {
    id: 'kedarnath',
    name: 'Kedarnath Temple',
    state: 'Uttarakhand',
    type: 'temple',
    baseCapacity: 15000,
    peakMultiplier: 2.5,
    lat: 30.7346,
    lng: 79.0669,
  },
  {
    id: 'badrinath',
    name: 'Badrinath Temple',
    state: 'Uttarakhand',
    type: 'temple',
    baseCapacity: 20000,
    peakMultiplier: 2.2,
    lat: 30.7433,
    lng: 79.4938,
  },
  {
    id: 'gangotri',
    name: 'Gangotri Temple',
    state: 'Uttarakhand',
    type: 'temple',
    baseCapacity: 8000,
    peakMultiplier: 2.0,
    lat: 30.9944,
    lng: 78.9393,
  },
  {
    id: 'yamunotri',
    name: 'Yamunotri Temple',
    state: 'Uttarakhand',
    type: 'temple',
    baseCapacity: 6000,
    peakMultiplier: 1.8,
    lat: 31.0150,
    lng: 78.4641,
  },
  {
    id: 'haridwar',
    name: 'Haridwar',
    state: 'Uttarakhand',
    type: 'city',
    baseCapacity: 50000,
    peakMultiplier: 3.0,
    lat: 29.9457,
    lng: 78.1642,
  },
  {
    id: 'rishikesh',
    name: 'Rishikesh',
    state: 'Uttarakhand',
    type: 'city',
    baseCapacity: 35000,
    peakMultiplier: 2.0,
    lat: 30.0869,
    lng: 78.2676,
  },
  {
    id: 'sonprayag',
    name: 'Sonprayag (Base Camp)',
    state: 'Uttarakhand',
    type: 'camp',
    baseCapacity: 10000,
    peakMultiplier: 2.8,
    lat: 30.6183,
    lng: 79.0607,
  },
  {
    id: 'joshimath',
    name: 'Joshimath',
    state: 'Uttarakhand',
    type: 'route',
    baseCapacity: 12000,
    peakMultiplier: 2.0,
    lat: 30.5550,
    lng: 79.5639,
  },
  {
    id: 'gaurikund',
    name: 'Gaurikund Trek Start',
    state: 'Uttarakhand',
    type: 'route',
    baseCapacity: 8000,
    peakMultiplier: 2.5,
    lat: 30.6560,
    lng: 79.0476,
  },
  {
    id: 'hemkund',
    name: 'Hemkund Sahib',
    state: 'Uttarakhand',
    type: 'temple',
    baseCapacity: 5000,
    peakMultiplier: 2.0,
    lat: 30.6961,
    lng: 79.6068,
  },
];

export function getLocationById(id: string): PilgrimLocation | undefined {
  return PILGRIM_LOCATIONS.find((loc) => loc.id === id);
}
