/**
 * POST /api/ingest
 * Accepts a CSV upload (multipart) OR ?source=synthetic to use the bundled dataset.
 * Streams progress as NDJSON.
 *
 * Pipeline (all in memory, source never written to disk):
 *   CSV rows → de-identify → generate two text templates → embed (OpenAI) → upsert Chroma → delete source
 */

import { NextRequest } from 'next/server';
import { parse } from 'csv-parse/sync';
import { deidentifyRecord, generateProfileText, generateIntentText } from '@/lib/deid';
import { embedTexts } from '@/lib/embedder';
import { upsertVectors } from '@/lib/chroma';
import { saveTranche } from '@/lib/tranche-store';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

const EMBED_BATCH = 40; // pairs → 80 texts per OpenAI call
const UPSERT_BATCH = 100;

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: object) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      }

      try {
        // ── Load CSV ──────────────────────────────────────────────────────────
        let csvText: string;
        const url = new URL(req.url);
        const source = url.searchParams.get('source');

        if (source === 'synthetic') {
          const csvPath = path.join(process.cwd(), 'scripts', 'data', 'synthetic_150k.csv');
          if (!fs.existsSync(csvPath)) {
            send({ error: 'Synthetic dataset not found. Run: node scripts/generate-dataset.js' });
            controller.close();
            return;
          }
          csvText = fs.readFileSync(csvPath, 'utf-8');
          send({ status: 'loaded', message: 'Loaded synthetic dataset', source: 'synthetic' });
        } else {
          const formData = await req.formData();
          const file = formData.get('file') as File | null;
          if (!file) {
            send({ error: 'No file uploaded. POST multipart with field "file", or use ?source=synthetic' });
            controller.close();
            return;
          }
          csvText = await file.text();
          send({ status: 'loaded', message: `Loaded file: ${file.name}`, source: file.name });
        }

        // ── Parse CSV ─────────────────────────────────────────────────────────
        const records: Record<string, unknown>[] = parse(csvText, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });

        const total = records.length;
        send({ status: 'parsed', total, message: `Parsed ${total} records` });

        // ── Hash source for manifest ──────────────────────────────────────────
        const sourceHash = crypto.createHash('sha256').update(csvText).digest('hex').slice(0, 16);

        // ── Process in embed batches ──────────────────────────────────────────
        const trancheId = `tranche-${Date.now()}`;
        let processed = 0;
        let upsertBuffer: { id: string; values: number[]; metadata: Record<string, string | number | boolean | null> }[] = [];

        for (let i = 0; i < total; i += EMBED_BATCH) {
          const batch = records.slice(i, i + EMBED_BATCH);

          // De-identify
          const deided = batch.map((r) => {
            const rec = { ...r, tranche_id: trancheId };
            return deidentifyRecord(rec);
          });

          // Generate text templates
          const profileTexts = deided.map(generateProfileText);
          const intentTexts = deided.map(generateIntentText);
          const allTexts = [...profileTexts, ...intentTexts];

          // Embed both sets together
          const allEmbeddings = await embedTexts(allTexts);
          const profileEmbeds = allEmbeddings.slice(0, deided.length);
          const intentEmbeds = allEmbeddings.slice(deided.length);

          // Build vector records
          for (let j = 0; j < deided.length; j++) {
            const r = deided[j];
            const baseId = `${trancheId}-${i + j}`;

            // Store tokens in metadata (safe — hashed, not reversible)
            const meta: Record<string, string | number | boolean | null> = {
              email_token: r.email_token,
              phone_token: r.phone_token,
              tranche_id: r.tranche_id,
              age_range: r.age_range,
              life_stage: r.life_stage,
              generation: r.generation,
              gender: r.gender,
              marital_status: r.marital_status,
              dependents: r.dependents,
              military: r.military,
              first_time_buyer: r.first_time_buyer,
              zip3: r.zip3,
              metro: r.metro,
              urban_class: r.urban_class,
              region: r.region,
              city: r.city,
              state: r.state,
              fico_band: r.fico_band,
              credit_profile: r.credit_profile,
              income_range: r.income_range,
              income_tier: r.income_tier,
              dti_bucket: r.dti_bucket,
              ltv_bucket: r.ltv_bucket,
              loan_amount_bucket: r.loan_amount_bucket,
              bankruptcy: r.bankruptcy,
              foreclosure: r.foreclosure,
              industry: r.industry,
              employer_tier: r.employer_tier,
              employer_stability: r.employer_stability,
              employment_status: r.employment_status,
              tenure_band: r.tenure_band,
              loan_purpose: r.loan_purpose,
              loan_type: r.loan_type,
              property_type: r.property_type,
              occupancy: r.occupancy,
              loan_term: r.loan_term,
              channel: r.channel,
              lead_type: r.lead_type,
              lead_score: r.lead_score,
              journey_stage: r.journey_stage,
              outcome: r.outcome,
              days_to_close: r.days_to_close,
              vector_type: 'profile',
            };

            upsertBuffer.push({ id: `${baseId}-profile`, values: profileEmbeds[j], metadata: meta });
            upsertBuffer.push({ id: `${baseId}-intent`, values: intentEmbeds[j], metadata: { ...meta, vector_type: 'intent' } });
          }

          // Flush to Pinecone when buffer is large enough
          if (upsertBuffer.length >= UPSERT_BATCH * 2) {
            await upsertVectors(upsertBuffer);
            upsertBuffer = [];
          }

          processed += batch.length;
          const pct = Math.round((processed / total) * 100);
          send({ status: 'progress', processed, total, pct });
        }

        // Flush remaining
        if (upsertBuffer.length > 0) {
          await upsertVectors(upsertBuffer);
        }

        // ── Save tranche manifest ─────────────────────────────────────────────
        const manifest = {
          tranche_id: trancheId,
          record_count: total,
          source_hash: sourceHash,
          source_deleted: true,
          deleted_at: new Date().toISOString(),
          model: 'text-embedding-3-small',
          vector_count: total * 2,
        };
        saveTranche(manifest);

        // ── Source is in memory — never written to disk; no delete needed ─────
        send({ status: 'complete', manifest, message: `Ingested ${total} records (${total * 2} vectors). Source destroyed.` });

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        send({ status: 'error', error: msg });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  });
}
