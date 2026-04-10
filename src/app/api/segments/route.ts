/**
 * GET /api/segments
 * Fetch vectors with embeddings, run k-means clustering, return segment profiles.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchVectorsForClustering, getCollectionStats } from '@/lib/chroma';
// ml-kmeans is a CommonJS module
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { kmeans } = require('ml-kmeans');

export const runtime = 'nodejs';

interface SegmentProfile {
  id: number;
  label: string;
  description: string;
  recordCount: number;
  fundedRate: number;
  dominantAttributes: Record<string, string>;
}

function mostCommon(values: string[]): string {
  if (values.length === 0) return '';
  const counts: Record<string, number> = {};
  for (const v of values) {
    if (v && v !== 'unknown' && v !== '') {
      counts[v] = (counts[v] || 0) + 1;
    }
  }
  const entries = Object.entries(counts);
  if (entries.length === 0) return '';
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function autoLabel(attrs: Record<string, string>): string {
  const parts: string[] = [];
  if (attrs.generation) parts.push(attrs.generation);
  if (attrs.urban_class && attrs.urban_class !== 'Suburban') parts.push(attrs.urban_class);
  if (attrs.credit_profile) parts.push(attrs.credit_profile);
  if (attrs.loan_purpose) parts.push(attrs.loan_purpose);
  if (parts.length === 0) return 'Mixed Segment';
  return parts.join(' ');
}

function buildDescription(attrs: Record<string, string>, fundedRate: number, count: number): string {
  const parts: string[] = [];
  if (attrs.generation) parts.push(`${attrs.generation} buyers`);
  if (attrs.metro) parts.push(`in ${attrs.metro}`);
  if (attrs.credit_profile) parts.push(`with ${attrs.credit_profile} credit`);
  if (attrs.income_range) parts.push(`(${attrs.income_range} income)`);
  if (attrs.loan_purpose) parts.push(`seeking ${attrs.loan_purpose}`);
  if (attrs.industry) parts.push(`working in ${attrs.industry}`);
  parts.push(`— ${(fundedRate * 100).toFixed(1)}% funded rate across ${count} records.`);
  return parts.join(' ');
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const k = Math.min(parseInt(url.searchParams.get('k') || '8'), 20);

    // Check index has data
    const stats = await getCollectionStats();
    if (stats.totalVectors === 0) {
      return NextResponse.json({ error: 'No vectors found. Ingest data first.' }, { status: 404 });
    }

    // Fetch up to 1000 profile vectors with embeddings for clustering
    const sampleSize = Math.min(1000, stats.totalVectors);
    const vectors = await fetchVectorsForClustering(sampleSize, { vector_type: 'profile' });

    if (vectors.length < k) {
      return NextResponse.json(
        { error: `Not enough vectors for ${k} clusters. Found ${vectors.length}.` },
        { status: 422 }
      );
    }

    const embeddings = vectors.map((v) => v.embedding);
    const metadatas = vectors.map((v) => v.metadata as Record<string, string | number | boolean>);

    // Run k-means
    const result = kmeans(embeddings, k, { initialization: 'kmeans++', maxIterations: 100 });
    const labels: number[] = result.clusters;

    const segments: SegmentProfile[] = [];

    for (let clusterId = 0; clusterId < k; clusterId++) {
      const indices = labels
        .map((lbl, i) => (lbl === clusterId ? i : -1))
        .filter((i) => i >= 0);

      if (indices.length === 0) continue;

      const clusterMetas = indices.map((i) => metadatas[i]);

      const fundedCount = clusterMetas.filter((m) => String(m.outcome || '') === 'funded').length;
      const fundedRate = clusterMetas.length > 0 ? fundedCount / clusterMetas.length : 0;

      const getValues = (key: string) => clusterMetas.map((m) => String(m[key] || ''));

      const dominantAttributes: Record<string, string> = {
        generation: mostCommon(getValues('generation')),
        credit_profile: mostCommon(getValues('credit_profile')),
        income_range: mostCommon(getValues('income_range')),
        loan_purpose: mostCommon(getValues('loan_purpose')),
        metro: mostCommon(getValues('metro')),
        industry: mostCommon(getValues('industry')),
        urban_class: mostCommon(getValues('urban_class')),
        journey_stage: mostCommon(getValues('journey_stage')),
      };

      Object.keys(dominantAttributes).forEach((key) => {
        if (!dominantAttributes[key]) delete dominantAttributes[key];
      });

      const label = autoLabel(dominantAttributes);
      const description = buildDescription(dominantAttributes, fundedRate, indices.length);

      segments.push({
        id: clusterId,
        label,
        description,
        recordCount: indices.length,
        fundedRate: Math.round(fundedRate * 10000) / 10000,
        dominantAttributes,
      });
    }

    segments.sort((a, b) => b.fundedRate - a.fundedRate);

    return NextResponse.json({
      segments,
      totalVectorsAnalyzed: embeddings.length,
      k,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/segments] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
