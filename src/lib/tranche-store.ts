/**
 * In-memory tranche manifest store.
 * Resets on cold start — acceptable for demo/POC.
 * In production, persist to a database or Vercel KV.
 */

export interface TrancheManifest {
  id: string;
  timestamp: string;
  recordCount: number;
  vectorCount: number;
  source: string;
  status: 'processing' | 'complete' | 'error';
  durationMs?: number;
  errorMessage?: string;
}

// Module-level in-memory store
const tranches: TrancheManifest[] = [];

export function addTranche(t: TrancheManifest): void {
  const existing = tranches.findIndex((x) => x.id === t.id);
  if (existing >= 0) {
    tranches[existing] = t;
  } else {
    tranches.unshift(t); // newest first
  }
}

export function getTranches(): TrancheManifest[] {
  return [...tranches];
}

export function getTranche(id: string): TrancheManifest | undefined {
  return tranches.find((t) => t.id === id);
}

export function updateTranche(id: string, updates: Partial<TrancheManifest>): void {
  const idx = tranches.findIndex((t) => t.id === id);
  if (idx >= 0) {
    tranches[idx] = { ...tranches[idx], ...updates };
  }
}
