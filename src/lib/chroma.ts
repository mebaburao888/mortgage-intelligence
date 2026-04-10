/**
 * Vector store adapter — backed by Pinecone (cloud), same interface as original chroma.ts.
 * Routes import from this file unchanged; Pinecone is the actual backend.
 */
import { Pinecone, type RecordMetadata } from '@pinecone-database/pinecone';

let _client: Pinecone | null = null;

function getClient(): Pinecone {
  if (!_client) {
    if (!process.env.PINECONE_API_KEY) throw new Error('PINECONE_API_KEY is not set');
    _client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return _client;
}

function getIndex() {
  return getClient().index(process.env.PINECONE_INDEX_NAME || 'mortgage-intelligence');
}

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: Record<string, string | number | boolean | null>;
}

const BATCH = 100;

export async function upsertVectors(vectors: VectorRecord[]): Promise<void> {
  const index = getIndex();
  for (let i = 0; i < vectors.length; i += BATCH) {
    const batch = vectors.slice(i, i + BATCH);
    await index.upsert(batch.map(v => ({ id: v.id, values: v.values, metadata: v.metadata as RecordMetadata })));
  }
}

export async function queryVectors(
  queryVector: number[], topK = 20, filter?: Record<string, unknown>
): Promise<{ id: string; score: number; metadata: Record<string, unknown> }[]> {
  const index = getIndex();
  const params: Parameters<typeof index.query>[0] = { vector: queryVector, topK, includeMetadata: true };
  if (filter && Object.keys(filter).length > 0) params.filter = filter as RecordMetadata;
  const res = await index.query(params);
  return (res.matches || []).map(m => ({ id: m.id, score: m.score ?? 0, metadata: (m.metadata as Record<string, unknown>) || {} }));
}

export async function fetchVectorsForClustering(
  limit = 1000, filter?: Record<string, unknown>
): Promise<{ id: string; embedding: number[]; metadata: Record<string, unknown> }[]> {
  const index = getIndex();
  const dims = 1536;
  const rv = Array.from({ length: dims }, () => Math.random() - 0.5);
  const norm = Math.sqrt(rv.reduce((s, v) => s + v * v, 0));
  const nv = rv.map(v => v / norm);
  const params: Parameters<typeof index.query>[0] = { vector: nv, topK: Math.min(limit, 10000), includeMetadata: true, includeValues: false };
  if (filter && Object.keys(filter).length > 0) params.filter = filter as RecordMetadata;
  const q = await index.query(params);
  const matches = q.matches || [];
  if (!matches.length) return [];
  const results: { id: string; embedding: number[]; metadata: Record<string, unknown> }[] = [];
  for (let i = 0; i < matches.length; i += BATCH) {
    const ids = matches.slice(i, i + BATCH).map(m => m.id);
    const fetched = (await index.fetch(ids)).records || {};
    for (const id of ids) {
      const r = fetched[id];
      if (r?.values?.length) results.push({ id, embedding: r.values, metadata: (r.metadata as Record<string, unknown>) || {} });
    }
  }
  return results;
}

export async function queryWithFilter(
  topK: number, filter: Record<string, unknown>
): Promise<{ id: string; metadata: Record<string, unknown> }[]> {
  const index = getIndex();
  const dims = 1536;
  const rv = Array.from({ length: dims }, () => Math.random() - 0.5);
  const norm = Math.sqrt(rv.reduce((s, v) => s + v * v, 0));
  const nv = rv.map(v => v / norm);
  const res = await index.query({ vector: nv, topK: Math.min(topK, 10000), includeMetadata: true, filter: filter as RecordMetadata });
  return (res.matches || []).map(m => ({ id: m.id, metadata: (m.metadata as Record<string, unknown>) || {} }));
}

export async function getCollectionStats(): Promise<{
  totalVectors: number;
  collectionName: string;
}> {
  return getIndexStats();
}

export async function getIndexStats(): Promise<{
  totalVectors: number; indexName: string; collectionName: string;
  namespaces: Record<string, { vectorCount: number }>; indexFullness: number;
}> {
  const index = getIndex();
  const stats = await index.describeIndexStats();
  const namespaces: Record<string, { vectorCount: number }> = {};
  for (const [ns, s] of Object.entries(stats.namespaces || {})) {
    namespaces[ns] = { vectorCount: (s as any).recordCount ?? 0 };
  }
  const name = process.env.PINECONE_INDEX_NAME || "mortgage-intelligence";
  return { totalVectors: stats.totalRecordCount ?? 0, indexName: name, collectionName: name, namespaces, indexFullness: stats.indexFullness ?? 0 };
}