/**
 * Chroma Cloud client — collection access and batch upsert.
 * Replaces Pinecone as the vector store.
 *
 * Collection config:
 *   Tenant:   CHROMA_TENANT
 *   Database: CHROMA_DATABASE
 *   API key:  CHROMA_API_KEY
 *   Collection name auto-derived from CHROMA_COLLECTION_ID (used as name) or 'mortgage-leads'
 */

import { ChromaClient, Collection, IncludeEnum } from 'chromadb';

let _client: ChromaClient | null = null;
let _collection: Collection | null = null;

function getClient(): ChromaClient {
  if (!_client) {
    if (!process.env.CHROMA_API_KEY) {
      throw new Error('CHROMA_API_KEY is not set');
    }
    _client = new ChromaClient({
      path: 'https://api.trychroma.com',
      auth: {
        provider: 'token',
        credentials: process.env.CHROMA_API_KEY,
        tokenHeaderType: 'X_CHROMA_TOKEN',
      },
      tenant: process.env.CHROMA_TENANT || '62bd10e5-beab-41db-85f9-cdc77617a275',
      database: process.env.CHROMA_DATABASE || 'LDPOC',
    });
  }
  return _client;
}

export async function getCollection(): Promise<Collection> {
  if (!_collection) {
    const client = getClient();
    // Use collection name "mortgage-leads"; cosine distance for normalized embeddings
    _collection = await client.getOrCreateCollection({
      name: 'mortgage-leads',
      metadata: { 'hnsw:space': 'cosine' },
    });
  }
  return _collection;
}

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: Record<string, string | number | boolean | null>;
}

const UPSERT_BATCH_SIZE = 100;

export async function upsertVectors(vectors: VectorRecord[]): Promise<void> {
  const collection = await getCollection();

  for (let i = 0; i < vectors.length; i += UPSERT_BATCH_SIZE) {
    const batch = vectors.slice(i, i + UPSERT_BATCH_SIZE);
    await collection.upsert({
      ids: batch.map((v) => v.id),
      embeddings: batch.map((v) => v.values),
      metadatas: batch.map((v) => v.metadata as Record<string, string | number | boolean>),
    });
  }
}

export async function queryVectors(
  queryVector: number[],
  topK: number = 20,
  filter?: Record<string, unknown>
): Promise<{ id: string; score: number; metadata: Record<string, unknown> }[]> {
  const collection = await getCollection();

  const queryParams: {
    queryEmbeddings: number[][];
    nResults: number;
    include: IncludeEnum[];
    where?: Record<string, unknown>;
  } = {
    queryEmbeddings: [queryVector],
    nResults: topK,
    include: [IncludeEnum.Metadatas, IncludeEnum.Distances],
  };

  if (filter && Object.keys(filter).length > 0) {
    queryParams.where = filter as Record<string, unknown>;
  }

  const response = await collection.query(queryParams);

  const ids = response.ids[0] || [];
  const distances = response.distances?.[0] || [];
  const metadatas = response.metadatas?.[0] || [];

  return ids.map((id, idx) => ({
    id,
    // Cosine distance → similarity: 1 - distance (range 0–1 for normalized vectors)
    score: Math.max(0, 1 - (distances[idx] ?? 0)),
    metadata: (metadatas[idx] as Record<string, unknown>) || {},
  }));
}

/**
 * Fetch vectors with their embeddings for clustering.
 * Uses collection.get() with include=['embeddings','metadatas'].
 */
export async function fetchVectorsForClustering(
  limit: number = 1000,
  filter?: Record<string, unknown>
): Promise<{ id: string; embedding: number[]; metadata: Record<string, unknown> }[]> {
  const collection = await getCollection();

  const getParams: {
    limit: number;
    include: IncludeEnum[];
    where?: Record<string, unknown>;
  } = {
    limit,
    include: [IncludeEnum.Embeddings, IncludeEnum.Metadatas],
  };

  if (filter && Object.keys(filter).length > 0) {
    getParams.where = filter as Record<string, unknown>;
  }

  const response = await collection.get(getParams);

  const ids = response.ids || [];
  const embeddings = (response.embeddings as number[][] | null) || [];
  const metadatas = response.metadatas || [];

  return ids
    .map((id, idx) => ({
      id,
      embedding: embeddings[idx] || [],
      metadata: (metadatas[idx] as Record<string, unknown>) || {},
    }))
    .filter((r) => r.embedding.length > 0);
}

/**
 * Query vectors with filter using zero-vector (broad retrieval for export).
 */
export async function queryWithFilter(
  topK: number,
  filter: Record<string, unknown>
): Promise<{ id: string; metadata: Record<string, unknown> }[]> {
  const collection = await getCollection();

  const dims = 1536; // text-embedding-3-small
  const zeroVector = new Array(dims).fill(0) as number[];

  const response = await collection.query({
    queryEmbeddings: [zeroVector],
    nResults: topK,
    include: [IncludeEnum.Metadatas],
    where: filter as Record<string, unknown>,
  });

  const ids = response.ids[0] || [];
  const metadatas = response.metadatas?.[0] || [];

  return ids.map((id, idx) => ({
    id,
    metadata: (metadatas[idx] as Record<string, unknown>) || {},
  }));
}

export async function getCollectionStats(): Promise<{
  totalVectors: number;
  collectionName: string;
}> {
  const collection = await getCollection();
  const count = await collection.count();
  return {
    totalVectors: count,
    collectionName: collection.name,
  };
}
