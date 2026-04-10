/**
 * POST/GET /api/query - Semantic similarity search, no PII returned.
 */
import { NextRequest, NextResponse } from 'next/server';
import { embedSingle } from '@/lib/embedder';
import { queryVectors } from '@/lib/pinecone';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query: string = body.query || body.text || '';
    const topK = Math.min(parseInt(body.topK || body.top_k || '20'), 100);
    const filter: Record<string, unknown> = body.filter || {};
    if (!query.trim()) return NextResponse.json({ error: 'query is required' }, { status: 400 });

    const embedding = await embedSingle(query);
    const pineconeFilter: Record<string, unknown> = { vector_type: { $eq: 'profile' } };
    if (filter) Object.entries(filter).forEach(([k, v]) => { if (k !== 'vector_type') pineconeFilter[k] = v; });

    const matches = await queryVectors(embedding, topK, pineconeFilter);
    const results = matches.map((m, idx) => {
      const { email_token: _et, phone_token: _pt, ...safe } = m.metadata as Record<string, unknown>;
      return { rank: idx + 1, score: Math.round((m.score || 0) * 10000) / 10000, id: m.id, ...safe };
    });
    return NextResponse.json({ results, total: results.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const query = url.searchParams.get('query') || url.searchParams.get('q') || '';
  const topK = parseInt(url.searchParams.get('topK') || '20');
  if (!query.trim()) return NextResponse.json({ error: 'query param required' }, { status: 400 });
  return POST(new NextRequest(req.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, topK }),
  }));
}
