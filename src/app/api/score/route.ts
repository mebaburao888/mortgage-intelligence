/**
 * POST /api/score
 * Score a new lead's propensity to fund.
 * De-identifies in memory, embeds, queries Pinecone neighbors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { deidentifyRecord, generateProfileText, DeidentifiedRecord } from '@/lib/deid';
import { embedSingle } from '@/lib/embedder';
import { queryVectors } from '@/lib/chroma';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body) {
      return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
    }

    // De-identify in memory — never write PII to disk
    const deid = deidentifyRecord(body as Record<string, unknown>);
    const profileText = generateProfileText(deid);

    const embedding = await embedSingle(profileText);

    // Find 20 nearest neighbors among profile vectors
    const topK = 20;
    const matches = await queryVectors(embedding, topK, { vector_type: 'profile' });

    const neighbors = matches.map((m) => {
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

    const fundedCount = neighbors.filter((n) => n.outcome === 'funded').length;
    const totalNeighbors = neighbors.length;
    const fundedRate = totalNeighbors > 0 ? fundedCount / totalNeighbors : 0;
    const propensityScore = Math.round(fundedRate * 100);

    let confidence: 'High' | 'Medium' | 'Low';
    if (totalNeighbors >= 15 && (propensityScore >= 60 || propensityScore <= 25)) {
      confidence = 'High';
    } else if (totalNeighbors >= 8) {
      confidence = 'Medium';
    } else {
      confidence = 'Low';
    }

    // Return de-identified summary + score — NO PII
    const leadSummary: Omit<DeidentifiedRecord, 'email_token' | 'phone_token'> = (
      ({ email_token: _et, phone_token: _pt, ...rest }) => rest
    )(deid);

    return NextResponse.json({
      score: propensityScore,
      funded_rate: Math.round(fundedRate * 10000) / 10000,
      neighbor_count: totalNeighbors,
      confidence,
      profile: leadSummary,
      profile_text: profileText,
      top_neighbors: neighbors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/score] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
