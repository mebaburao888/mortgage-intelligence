/**
 * POST /api/query
 * Semantic similarity search over ingested mortgage leads.
 * Never returns raw PII — only de-identified fields.
 */

import { NextRequest, NextResponse } from 'next/server';
import { embedSingle } from '@/lib/embedder';
import { queryVectors } from '@/lib/chroma';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query: string = body.query || body.text || '';
    const topK: number = Math.min(parseInt(body.topK || body.top_k || '20'), 100);
    const filter: Record<string, unknown> = body.filter || {};

    if (!query.trim()) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const queryEmbedding = await embedSingle(query);

    // Search profile vectors by default; merge any user-provided filters
    const chromaFilter: Record<string, unknown> = { vector_type: 'profile' };
    if (filter && typeof filter === 'object') {
      Object.entries(filter).forEach(([k, v]) => {
        if (k !== 'vector_type') chromaFilter[k] = v;
      });
    }

    const matches = await queryVectors(queryEmbedding, topK, chromaFilter);

    // Strip tokens — return only de-identified signal fields
    const results = matches.map((match, idx) => {
      const { email_token: _et, phone_token: _pt, ...safeMetadata } = match.metadata as Record<string, unknown>;
      return {
        rank: idx + 1,
        score: Math.round((match.score || 0) * 10000) / 10000,
        id: match.id,
        ...safeMetadata,
      };
    });

    return NextResponse.json({ results, total: results.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/query] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const query = url.searchParams.get('query') || url.searchParams.get('q') || '';
  const topK = parseInt(url.searchParams.get('topK') || url.searchParams.get('top_k') || '20');

  if (!query.trim()) {
    return NextResponse.json({ error: 'query param is required' }, { status: 400 });
  }

  const syntheticReq = new NextRequest(req.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, topK }),
  });

  return POST(syntheticReq);
}
