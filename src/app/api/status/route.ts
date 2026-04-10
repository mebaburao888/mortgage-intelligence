/**
 * GET /api/status - Returns Pinecone index stats and tranche history.
 */
import { NextResponse } from 'next/server';
import { getIndexStats } from '@/lib/pinecone';
import { getTranches } from '@/lib/tranche-store';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const [stats, tranches] = await Promise.all([getIndexStats(), Promise.resolve(getTranches())]);
    return NextResponse.json({
      totalVectors: stats.totalVectors,
      indexName: stats.indexName,
      namespaces: stats.namespaces,
      indexFullness: stats.indexFullness,
      tranches,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/status] Error:', message);
    return NextResponse.json({
      totalVectors: 0,
      indexName: process.env.PINECONE_INDEX_NAME || 'mortgage-intelligence',
      namespaces: {},
      indexFullness: 0,
      tranches: getTranches(),
      error: message,
    });
  }
}