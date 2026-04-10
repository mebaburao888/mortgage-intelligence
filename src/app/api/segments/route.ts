/**
 * GET /api/segments - K-means clustering over Pinecone profile vectors.
 */
import { NextRequest, NextResponse } from 'next/server';
import { fetchVectorsForClustering, getCollectionStats } from '@/lib/chroma';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { kmeans } = require('ml-kmeans');

export const runtime = 'nodejs';

interface SegmentProfile {
  id: number; label: string; description: string;
  recordCount: number; fundedRate: number; dominantAttributes: Record<string, string>;
}

function mostCommon(vals: string[]): string {
  const counts: Record<string, number> = {};
  vals.forEach(v => { if (v && v !== 'unknown') counts[v] = (counts[v] || 0) + 1; });
  const entries = Object.entries(counts);
  return entries.length ? entries.sort((a, b) => b[1] - a[1])[0][0] : '';
}

function autoLabel(a: Record<string, string>): string {
  return [a.generation, a.urban_class !== 'Suburban' ? a.urban_class : '', a.credit_profile, a.loan_purpose]
    .filter(Boolean).join(' ') || 'Mixed Segment';
}

function buildDesc(a: Record<string, string>, rate: number, n: number): string {
  const p: string[] = [];
  if (a.generation) p.push(a.generation + ' buyers');
  if (a.metro) p.push('in ' + a.metro);
  if (a.credit_profile) p.push('with ' + a.credit_profile + ' credit');
  if (a.income_range) p.push('(' + a.income_range + ' income)');
  if (a.loan_purpose) p.push('seeking ' + a.loan_purpose);
  p.push((rate * 100).toFixed(1) + '% funded across ' + n + ' records.');
  return p.join(' ');
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const k = Math.min(parseInt(url.searchParams.get('k') || '8'), 20);
    
    const stats = await getCollectionStats();
    if (stats.totalVectors === 0) return NextResponse.json({ error: 'No vectors. Ingest data first.' }, { status: 404 });

    const vectors = await fetchVectorsForClustering(
      Math.min(1000, stats.totalVectors), { vector_type: { $eq: 'profile' } }
    );
    if (vectors.length < k) return NextResponse.json(
      { error: 'Not enough vectors for ' + k + ' clusters. Found ' + vectors.length + '.' }, { status: 422 }
    );

    const result = kmeans(vectors.map(v => v.embedding), k, { initialization: 'kmeans++', maxIterations: 100 });
    const labels: number[] = result.clusters;
    const metadatas = vectors.map(v => v.metadata as Record<string, string | number | boolean>);

    const segments: SegmentProfile[] = [];
    for (let cid = 0; cid < k; cid++) {
      const idxs = labels.map((l, i) => l === cid ? i : -1).filter(i => i >= 0);
      if (!idxs.length) continue;
      const metas = idxs.map(i => metadatas[i]);
      const funded = metas.filter(m => String(m.outcome || '') === 'funded').length;
      const rate = metas.length ? funded / metas.length : 0;
      const get = (key: string) => metas.map(m => String(m[key] || ''));
      const dom: Record<string, string> = {
        generation: mostCommon(get('generation')), credit_profile: mostCommon(get('credit_profile')),
        income_range: mostCommon(get('income_range')), loan_purpose: mostCommon(get('loan_purpose')),
        metro: mostCommon(get('metro')), industry: mostCommon(get('industry')),
        urban_class: mostCommon(get('urban_class')), journey_stage: mostCommon(get('journey_stage')),
      };
      Object.keys(dom).forEach(key => { if (!dom[key]) delete dom[key]; });
      segments.push({
        id: cid, label: autoLabel(dom), description: buildDesc(dom, rate, idxs.length),
        recordCount: idxs.length, fundedRate: Math.round(rate * 10000) / 10000, dominantAttributes: dom,
      });
    }
    segments.sort((a, b) => b.fundedRate - a.fundedRate);
    return NextResponse.json({ segments, totalVectorsAnalyzed: vectors.length, k });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

