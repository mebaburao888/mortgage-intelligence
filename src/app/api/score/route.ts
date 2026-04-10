/**
 * POST /api/score - Score lead propensity via Pinecone KNN.
 */
import { NextRequest, NextResponse } from 'next/server';
import { deidentifyRecord, generateProfileText, DeidentifiedRecord } from '@/lib/deid';
import { embedSingle } from '@/lib/embedder';
import { queryVectors } from '@/lib/pinecone';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body) return NextResponse.json({ error: 'Request body required' }, { status: 400 });

    const deid = deidentifyRecord(body as Record<string, unknown>);
    const profileText = generateProfileText(deid);
    const embedding = await embedSingle(profileText);
    const matches = await queryVectors(embedding, 20, { vector_type: { $eq: 'profile' } });

    const neighbors = matches.map(m => {
      const meta = m.metadata as Record<string, unknown>;
      return {
        score: m.score,
        outcome: String(meta.outcome || 'unknown'),
        fico_band: String(meta.fico_band || ''),
        credit_profile: String(meta.credit_profile || ''),
        income_range: String(meta.income_range || ''),
        generation: String(meta.generation || ''),
        loan_purpose: String(meta.loan_purpose || ''),
        journey_stage: String(meta.journey_stage || ''),
        metro: String(meta.metro || ''),
      };
    });

    const funded = neighbors.filter(n => n.outcome === 'funded').length;
    const total = neighbors.length;
    const rate = total > 0 ? funded / total : 0;
    const propensityScore = Math.round(rate * 100);
    const confidence: 'High' | 'Medium' | 'Low' =
      total >= 15 && (propensityScore >= 60 || propensityScore <= 25) ? 'High' : total >= 8 ? 'Medium' : 'Low';
    const { email_token: _et, phone_token: _pt, ...leadSummary } = deid as unknown as Record<string, unknown>;

    return NextResponse.json({
      score: propensityScore,
      funded_rate: Math.round(rate * 10000) / 10000,
      neighbor_count: total,
      confidence,
      profile: leadSummary,
      profile_text: profileText,
      top_neighbors: neighbors,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
