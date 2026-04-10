/**
 * GET /api/export
 * Export email_token and phone_token for matching leads.
 * ONLY pseudonymous tokens are exported — no PII.
 */

import { NextRequest, NextResponse } from 'next/server';
import { embedSingle } from '@/lib/embedder';
import { queryVectors, queryWithFilter } from '@/lib/chroma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('query') || '';
    const segmentFilter = url.searchParams.get('segment') || '';
    const topK = Math.min(parseInt(url.searchParams.get('topK') || '500'), 2000);
    const format = url.searchParams.get('format') || 'csv';

    let records: { email_token: string; phone_token: string; outcome?: string; tranche_id?: string }[] = [];

    if (query.trim()) {
      // Similarity search
      const embedding = await embedSingle(query);
      const filter: Record<string, unknown> = { vector_type: { $eq: 'profile' } };

      const matches = await queryVectors(embedding, topK, filter);
      records = matches.map((m) => ({
        email_token: String((m.metadata as Record<string, unknown>).email_token || ''),
        phone_token: String((m.metadata as Record<string, unknown>).phone_token || ''),
        outcome: String((m.metadata as Record<string, unknown>).outcome || ''),
        tranche_id: String((m.metadata as Record<string, unknown>).tranche_id || ''),
      }));
    } else if (segmentFilter) {
      // Filter by metadata field using Pinecone metadata filter
      const metaFilter: Record<string, unknown> = {
        vector_type: { $eq: 'profile' },
      };

      // Support JSON filter from query param
      try {
        const filterObj = JSON.parse(segmentFilter);
        Object.assign(metaFilter, filterObj);
      } catch {
        // segmentFilter is not JSON, treat as outcome filter
        if (segmentFilter) {
          metaFilter.outcome = { $eq: segmentFilter };
        }
      }

      const matches = await queryWithFilter(topK, metaFilter);
      records = matches.map((m) => ({
        email_token: String((m.metadata as Record<string, unknown>).email_token || ''),
        phone_token: String((m.metadata as Record<string, unknown>).phone_token || ''),
        outcome: String((m.metadata as Record<string, unknown>).outcome || ''),
        tranche_id: String((m.metadata as Record<string, unknown>).tranche_id || ''),
      }));
    } else {
      return NextResponse.json(
        { error: 'Provide query or segment parameter' },
        { status: 400 }
      );
    }

    // De-duplicate by email_token
    const seen = new Set<string>();
    const unique = records.filter((r) => {
      if (!r.email_token || seen.has(r.email_token)) return false;
      seen.add(r.email_token);
      return true;
    });

    if (format === 'json') {
      return NextResponse.json({ count: unique.length, records: unique });
    }

    // Build CSV
    const header = 'email_token,phone_token\n';
    const rows = unique.map((r) => `${r.email_token},${r.phone_token}`).join('\n');
    const csv = header + rows;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `audience_export_${timestamp}.csv`;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/export] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST version for more complex filters
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, filter, topK: rawTopK = 500 } = body;
    const topK = Math.min(parseInt(String(rawTopK)), 2000);

    let records: { email_token: string; phone_token: string }[] = [];

    if (query?.trim()) {
      const embedding = await embedSingle(query);
      const chromaFilter: Record<string, unknown> = {
        vector_type: { $eq: 'profile' },
        ...(filter
          ? Object.fromEntries(
              Object.entries(filter as Record<string, unknown>).map(([k, v]) => [k, { $eq: v }])
            )
          : {}),
      };
      const matches = await queryVectors(embedding, topK, chromaFilter);
      records = matches.map((m) => ({
        email_token: String((m.metadata as Record<string, unknown>).email_token || ''),
        phone_token: String((m.metadata as Record<string, unknown>).phone_token || ''),
      }));
    } else if (filter) {
      const chromaFilter: Record<string, unknown> = {
        vector_type: { $eq: 'profile' },
        ...Object.fromEntries(
          Object.entries(filter as Record<string, unknown>).map(([k, v]) => [k, { $eq: v }])
        ),
      };
      const matches = await queryWithFilter(topK, chromaFilter);
      records = matches.map((m) => ({
        email_token: String((m.metadata as Record<string, unknown>).email_token || ''),
        phone_token: String((m.metadata as Record<string, unknown>).phone_token || ''),
      }));
    } else {
      return NextResponse.json({ error: 'Provide query or filter' }, { status: 400 });
    }

    // De-duplicate
    const seen = new Set<string>();
    const unique = records.filter((r) => {
      if (!r.email_token || seen.has(r.email_token)) return false;
      seen.add(r.email_token);
      return true;
    });

    // Count preview
    if (body.preview) {
      return NextResponse.json({ count: unique.length });
    }

    const header = 'email_token,phone_token\n';
    const rows = unique.map((r) => `${r.email_token},${r.phone_token}`).join('\n');
    const csv = header + rows;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `audience_export_${timestamp}.csv`;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/export POST] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
