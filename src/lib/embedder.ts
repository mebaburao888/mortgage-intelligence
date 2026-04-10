/**
 * Embedder — uses OpenAI text-embedding-3-small.
 * Batches requests to stay within rate limits.
 */

import OpenAI from 'openai';

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

const EMBED_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 50;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const client = getClient();
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const response = await client.embeddings.create({
      model: EMBED_MODEL,
      input: batch,
      encoding_format: 'float',
    });

    // Sort by index to maintain order
    const sorted = response.data.sort((a, b) => a.index - b.index);
    for (const item of sorted) {
      results.push(item.embedding);
    }
  }

  return results;
}

export async function embedSingle(text: string): Promise<number[]> {
  const client = getClient();

  const response = await client.embeddings.create({
    model: EMBED_MODEL,
    input: text,
    encoding_format: 'float',
  });

  return response.data[0].embedding;
}
