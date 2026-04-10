# Mortgage Intelligence

A full-stack Next.js 14 application for NIST-compliant mortgage lead de-identification, vector embedding, and audience intelligence. Rebuilt from a Python/Express POC into a TypeScript/Next.js application deployable to Vercel.

## Architecture

```
CSV (PII) → De-identify in memory → Embed (OpenAI) → Upsert (Pinecone) → Intelligence
```

All de-identification happens in API routes. No PII is ever written to disk or stored in the vector database. Only:
- De-identified attributes (age ranges, income buckets, FICO bands, etc.)
- Pseudonymous HMAC tokens (email_token, phone_token) for platform matching

## Prerequisites

- Node.js 18+
- OpenAI account with API key
- Pinecone account (free tier supports 100,000 vectors)

## Installation

```bash
cd mortgage-intelligence
npm install
```

## Environment Setup

Copy the example env file and fill in your keys:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=mortgage-intelligence
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEID_SALT=change-me-to-a-random-string-at-least-32-chars
```

### Pinecone Index Setup

Create a Pinecone index with these settings:
- **Dimensions**: 1536 (text-embedding-3-small)
- **Metric**: cosine
- **Name**: mortgage-intelligence (or whatever you set in PINECONE_INDEX_NAME)

## Generate Synthetic Dataset

Generate 150,000 synthetic mortgage lead records (no external dependencies):

```bash
npm run generate-dataset
```

This creates `scripts/data/synthetic_150k.csv` (~100MB). Progress is logged every 10,000 records.

## Run Locally

```bash
npm run dev
```

Open http://localhost:3000

## Usage

### 1. Ingest Data
- Click **Ingest** tab
- Upload a CSV file OR click **Use Synthetic Dataset**
- Watch real-time streaming progress
- CSV is de-identified in memory before embedding

### 2. Search Profiles
- Click **Query** tab
- Enter natural language query (e.g., "Millennial first-time buyer with good credit")
- Adjust Top K (5-50)
- Results show de-identified profiles only

### 3. Score a Lead
- Click **Score** tab
- Fill in lead details (FICO, income, loan purpose, etc.)
- Click **Score Lead**
- See propensity score (0-100) based on 20 nearest funded neighbors

### 4. Discover Segments
- Click **Segments** tab
- Set number of clusters (2-20)
- Click **Discover Segments**
- K-means clustering runs over profile embeddings

### 5. Export Audience
- Click **Export** tab
- Use similarity query or metadata filters
- Preview count, then download CSV
- CSV contains email_token + phone_token only (no PII)

### 6. Monitor Status
- Click **Status** tab
- See Pinecone index stats and tranche history

## API Reference

### POST /api/ingest
Upload CSV and ingest into Pinecone. Streams ndjson progress.

```bash
# Upload file
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@leads.csv"

# Use synthetic dataset
curl -X POST "http://localhost:3000/api/ingest?source=synthetic"
```

### POST /api/query
Semantic similarity search.

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Millennial first-time buyer", "topK": 20}'
```

### POST /api/score
Propensity score for a new lead.

```bash
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{"fico": 720, "income": 95000, "loan_purpose": "Purchase", "dob": "1988-05-15", ...}'
```

### GET /api/segments?k=8
K-means clustering of profile embeddings.

### GET /api/export?query=...&topK=500
Export audience tokens as CSV.

### GET /api/status
Pinecone index stats and tranche history.

## Deploy to Vercel

1. Push to GitHub
2. Import into Vercel
3. Set environment variables:
   - `OPENAI_API_KEY`
   - `PINECONE_API_KEY`
   - `PINECONE_INDEX_NAME`
   - `DEID_SALT`
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL)
4. Deploy

Note: The synthetic dataset generation script runs locally only. Ingest via file upload on Vercel.

## CSV Format

Required columns:

| Column | Type | Example |
|--------|------|---------|
| first_name | string | John |
| last_name | string | Smith |
| ssn | string | 123-45-6789 |
| dob | date | 1985-06-15 |
| email | string | john.smith@gmail.com |
| phone | string | 555-123-4567 |
| street | string | 123 Oak St |
| city | string | Austin |
| state | string | TX |
| zip | string | 78701 |
| employer | string | Google |
| income | number | 95000 |
| fico | number | 720 |
| dti | number | 0.33 |
| ltv | number | 0.85 |
| loan_amount | number | 350000 |
| loan_purpose | string | Purchase |
| loan_type | string | Conventional |
| property_type | string | Single Family |
| occupancy | string | Primary |
| loan_term | number | 30 |
| channel | string | Search |
| lead_type | string | Internet Lead |
| lead_score | number | 65 |
| journey_stage | string | Consideration |
| first_time_buyer | boolean | true |
| military | boolean | false |
| gender | string | Male |
| marital_status | string | Married |
| dependents | number | 1 |
| bankruptcy | string | No |
| foreclosure | string | No |
| employment_status | string | Employed |
| tenure_years | number | 5 |
| outcome | string | funded |
| days_to_close | number | 42 |
| tranche_id | string | TRANCHE-001 |

## De-Identification Rules

| Field | Treatment |
|-------|-----------|
| first_name, last_name | DROPPED |
| ssn | DROPPED |
| street | DROPPED |
| email | HMAC-SHA256 → email_token |
| phone | HMAC-SHA256 → phone_token |
| dob | → age_range, life_stage, generation |
| zip | → zip3, metro, urban_class |
| income | → income_range, income_tier |
| fico | → fico_band, credit_profile |
| dti | → dti_bucket |
| ltv | → ltv_bucket |
| loan_amount | → loan_amount_bucket |
| employer | → industry, employer_tier, employer_stability |
| tenure_years | → tenure_band |

## Compliance Notes

This system applies NIST Expert Determination de-identification before any data is embedded or stored:
- PII fields are dropped in memory, never persisted
- Quasi-identifiers are generalized into buckets
- Only pseudonymous tokens and de-identified attributes are stored in Pinecone
- GLBA: No consumer financial data retained beyond the processing window
- CCPA: Source data is never stored by the system
