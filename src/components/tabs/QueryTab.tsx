'use client';

import { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { OutcomeBadge } from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';

interface QueryResult {
  rank: number;
  score: number;
  id: string;
  generation?: string;
  credit_profile?: string;
  loan_purpose?: string;
  loan_type?: string;
  income_range?: string;
  metro?: string;
  state?: string;
  age_range?: string;
  outcome?: string;
  journey_stage?: string;
  industry?: string;
  fico_band?: string;
  loan_amount_bucket?: string;
  channel?: string;
  first_time_buyer?: boolean;
  military?: boolean;
  tranche_id?: string;
}

const EXAMPLE_QUERIES = [
  'Millennial first-time buyer with good credit in the Pacific Northwest',
  'High-income executive seeking jumbo purchase loan in urban metro',
  'Military veteran eligible for VA loan, excellent credit',
  'Boomer cash-out refinance, investment property, low LTV',
  'GenZ first-time buyer, FHA loan, lower income, high lead score',
  'Self-employed professional in technology, high DTI, prime credit',
];

export default function QueryTab() {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(20);
  const [results, setResults] = useState<QueryResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async (queryText?: string) => {
    const q = queryText ?? query;
    if (!q.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, topK }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const useExample = (example: string) => {
    setQuery(example);
    search(example);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Search input */}
      <Card header="Semantic Search">
        <div className="space-y-4">
          <Input
            label="Search Query"
            placeholder="e.g. Millennial first-time buyer with good credit in Pacific Northwest..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            leftIcon={<Search size={16} />}
          />

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-medium text-gray-300">Top K Results</span>
                <span className="text-electric-400 font-semibold">{topK}</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full accent-electric-500"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-600">
                <span>5</span>
                <span>50</span>
              </div>
            </div>
          </div>

          <Button onClick={() => search()} loading={loading} disabled={!query.trim() || loading}>
            <Search size={16} />
            Search
          </Button>
        </div>
      </Card>

      {/* Example queries */}
      {!results && !loading && (
        <Card header="Example Queries">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example}
                onClick={() => useExample(example)}
                className="rounded-lg border border-navy-600 bg-navy-900/50 px-3 py-2.5 text-left text-sm text-gray-300 hover:border-electric-500/50 hover:bg-electric-500/5 hover:text-white transition-all"
              >
                {example}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-12 text-gray-400">
          <Spinner />
          <span>Searching profiles...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle size={18} className="shrink-0 text-red-400 mt-0.5" />
          <div className="text-sm text-red-300">{error}</div>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <Card
          header={
            <div className="flex items-center justify-between">
              <span>{results.length} results</span>
              <span className="text-xs font-normal text-gray-500">Sorted by similarity score</span>
            </div>
          }
        >
          {results.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No results found. Try a different query or ingest more data.
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-navy-600/50 bg-navy-900/50 p-4"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-600">#{r.rank}</span>
                      {r.generation && (
                        <span className="text-sm font-medium text-white">{r.generation}</span>
                      )}
                      {r.age_range && (
                        <span className="text-xs text-gray-400">{r.age_range}</span>
                      )}
                      {r.metro && (
                        <span className="text-xs text-gray-400">{r.metro}</span>
                      )}
                      {r.outcome && <OutcomeBadge outcome={r.outcome} />}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-electric-400">
                        {(r.score * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-600">similarity</div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4 text-xs">
                    {[
                      { label: 'Credit', value: r.credit_profile },
                      { label: 'FICO', value: r.fico_band },
                      { label: 'Income', value: r.income_range },
                      { label: 'Loan', value: `${r.loan_type} ${r.loan_purpose}` },
                      { label: 'Amount', value: r.loan_amount_bucket },
                      { label: 'Industry', value: r.industry },
                      { label: 'Channel', value: r.channel },
                      { label: 'Stage', value: r.journey_stage },
                    ]
                      .filter((f) => f.value && f.value.trim() !== '')
                      .map(({ label, value }) => (
                        <div key={label}>
                          <span className="text-gray-600">{label}: </span>
                          <span className="text-gray-300">{value}</span>
                        </div>
                      ))}
                  </div>

                  <div className="mt-2 flex gap-2 flex-wrap">
                    {r.first_time_buyer && (
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                        First-time buyer
                      </span>
                    )}
                    {r.military && (
                      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
                        Military/VA
                      </span>
                    )}
                    {r.tranche_id && (
                      <span className="rounded-full bg-navy-700 px-2 py-0.5 text-xs text-gray-500 font-mono">
                        {r.tranche_id}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
