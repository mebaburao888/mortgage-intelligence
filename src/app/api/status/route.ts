/**
 * GET /api/status - Returns Pinecone index stats and tranche history.
 */
import { NextResponse } from 'next/server';
import { getCollectionStats } from '@/lib/chroma';
import { getTranches } from '@/lib/tranche-store';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const [stats, tranches] = await Promise.all([getCollectionStats(), Promise.resolve(getTranches())]);
    return NextResponse.json({
      totalVectors: stats.totalVectors,
      collectionName: stats.collectionName,
      tranches,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/status] Error:', message);
    return NextResponse.json({
      totalVectors: 0,
      collectionName: 'mortgage-leads',
      tranches: getTranches(),
      error: message,
    });
  }
}