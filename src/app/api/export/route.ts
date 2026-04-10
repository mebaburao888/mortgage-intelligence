/**
 * GET|POST /api/export - Export pseudonymous tokens only, no PII.
 */
import { NextRequest, NextResponse } from 'next/server';
import { embedSingle } from '@/lib/embedder';
import { queryVectors, queryWithFilter } from '@/lib/pinecone';

export const runtime = 'nodejs';

function buildCsv(records: { email_token: string; phone_token: string }[]) {
  const seen = new Set<string>();
  const unique = records.filter(r => {
    if (!r.email_token || seen.has(r.email_token)) return false;
    seen.add(r.email_token); return true;
  });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return {
    csv: 'email_token,phone_token
' + unique.map(r => r.email_token + ',' + r.phone_token).join('
'),
    count: unique.length,
    filename: 'audience_export_' + ts + '.csv',
  };
}

const toRec = (m: { metadata: Record<string, unknown> }) => ({
  email_token: String(m.metadata.email_token || ''),
  phone_token: String(m.metadata.phone_token || ''),
});

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('query') || '';
    const segment = url.searchParams.get('segment') || '';
    const topK = Math.min(parseInt(url.searchParams.get('topK') || '500'), 2000);
    const format = url.searchParams.get('format') || 'csv';
    let records: { email_token: string; phone_token: string }[] = [];

    if (query.trim()) {
      const emb = await embedSingle(query);
      records = (await queryVectors(emb, topK, { vector_type: { $eq: 'profile' } })).map(toRec);
    } else if (segment) {
      const filter: Record<string, unknown> = { vector_type: { $eq: 'profile' } };
      try { Object.assign(filter, JSON.parse(segment)); } catch { if (segment) filter.outcome = { $eq: segment }; }
      records = (await queryWithFilter(topK, filter)).map(toRec);
    } else {
      return NextResponse.json({ error: 'Provide query or segment parameter' }, { status: 400 });
    }

    const { csv, count, filename } = buildCsv(records);
    if (format === 'json') return NextResponse.json({ count, records });
    return new Response(csv, { headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="' + filename + '"',
      'Cache-Control': 'no-cache',
    }});
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, filter, topK: rawTopK = 500, preview } = body;
    const topK = Math.min(parseInt(String(rawTopK)), 2000);
    let records: { email_token: string; phone_token: string }[] = [];

    if (query?.trim()) {
      const emb = await embedSingle(query);
      const pf: Record<string, unknown> = { vector_type: { $eq: 'profile' } };
      if (filter) Object.entries(filter as Record<string, unknown>).forEach(([k, v]) => { pf[k] = { $eq: v }; });
      records = (await queryVectors(emb, topK, pf)).map(toRec);
    } else if (filter) {
      const pf: Record<string, unknown> = { vector_type: { $eq: 'profile' } };
      Object.entries(filter as Record<string, unknown>).forEach(([k, v]) => { pf[k] = { $eq: v }; });
      records = (await queryWithFilter(topK, pf)).map(toRec);
    } else {
      return NextResponse.json({ error: 'Provide query or filter' }, { status: 400 });
    }

    const { csv, count, filename } = buildCsv(records);
    if (preview) return NextResponse.json({ count });
    return new Response(csv, { headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="' + filename + '"',
      'Cache-Control': 'no-cache',
    }});
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}