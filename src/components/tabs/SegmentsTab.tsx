'use client';

import { useState } from 'react';
import { PieChart, AlertCircle, RefreshCw } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Progress from '@/components/ui/Progress';
import Spinner from '@/components/ui/Spinner';
import clsx from 'clsx';

interface Segment {
  id: number;
  label: string;
  description: string;
  recordCount: number;
  fundedRate: number;
  dominantAttributes: Record<string, string>;
}

interface SegmentsResponse {
  segments: Segment[];
  totalVectorsAnalyzed: number;
  k: number;
}

function fundedRateColor(rate: number) {
  if (rate > 0.5) return 'text-green-400';
  if (rate >= 0.25) return 'text-yellow-400';
  return 'text-red-400';
}

function fundedRateBarColor(rate: number): 'green' | 'yellow' | 'red' {
  if (rate > 0.5) return 'green';
  if (rate >= 0.25) return 'yellow';
  return 'red';
}

const ATTRIBUTE_LABELS: Record<string, string> = {
  generation: 'Generation',
  credit_profile: 'Credit',
  income_range: 'Income',
  loan_purpose: 'Loan Purpose',
  metro: 'Metro',
  industry: 'Industry',
  urban_class: 'Location Type',
  journey_stage: 'Journey Stage',
};

export default function SegmentsTab() {
  const [k, setK] = useState(8);
  const [segments, setSegments] = useState<SegmentsResponse | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const discover = async () => {
    setLoading(true);
    setError('');
    setSelectedId(null);

    try {
      const res = await fetch(`/api/segments?k=${k}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSegments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const selectedSegment = segments?.segments.find((s) => s.id === selectedId);

  return (
    <div className="space-y-6 max-w-6xl">
      <Card header="Cluster Configuration">
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="font-medium text-gray-300">Number of Clusters (k)</span>
              <span className="text-electric-400 font-semibold">{k}</span>
            </div>
            <input
              type="range"
              min={2}
              max={20}
              value={k}
              onChange={(e) => setK(parseInt(e.target.value))}
              className="w-full accent-electric-500"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-600">
              <span>2</span>
              <span>20</span>
            </div>
          </div>

          <Button onClick={discover} loading={loading} disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" />
                Clustering...
              </>
            ) : (
              <>
                <PieChart size={16} />
                Discover Segments
              </>
            )}
          </Button>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          K-means clustering over profile embeddings. Analyzes up to 1,000 vectors. Higher k reveals finer segments.
        </p>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle size={18} className="shrink-0 text-red-400 mt-0.5" />
          <div className="text-sm text-red-300">{error}</div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-12 text-gray-400">
          <Spinner />
          <span>Running k-means clustering...</span>
        </div>
      )}

      {/* Segments grid */}
      {segments && !loading && (
        <>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {segments.segments.length} segments from {segments.totalVectorsAnalyzed.toLocaleString()} vectors
            </div>
            <Button variant="ghost" size="sm" onClick={discover}>
              <RefreshCw size={14} />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {segments.segments.map((seg) => (
              <div
                key={seg.id}
                onClick={() => setSelectedId(selectedId === seg.id ? null : seg.id)}
                className={clsx(
                  'cursor-pointer rounded-xl border p-4 transition-all',
                  selectedId === seg.id
                    ? 'border-electric-500/60 bg-electric-500/5 ring-1 ring-electric-500/30'
                    : 'border-navy-700 bg-navy-800/80 hover:border-navy-600'
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {seg.label || `Segment ${seg.id}`}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {seg.recordCount.toLocaleString()} records
                    </div>
                  </div>
                  <span
                    className={clsx(
                      'shrink-0 text-lg font-bold tabular-nums',
                      fundedRateColor(seg.fundedRate)
                    )}
                  >
                    {(seg.fundedRate * 100).toFixed(1)}%
                  </span>
                </div>

                {/* Funded rate bar */}
                <div className="mt-3">
                  <Progress
                    value={seg.fundedRate * 100}
                    color={fundedRateBarColor(seg.fundedRate)}
                    size="sm"
                  />
                  <div className="mt-1 text-xs text-gray-600">funded rate</div>
                </div>

                {/* Attribute chips */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(seg.dominantAttributes)
                    .filter(([, v]) => v)
                    .slice(0, 5)
                    .map(([k, v]) => (
                      <span
                        key={k}
                        className="rounded-full bg-navy-700 px-2 py-0.5 text-xs text-gray-300"
                        title={ATTRIBUTE_LABELS[k] || k}
                      >
                        {v}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* Selected segment detail */}
          {selectedSegment && (
            <Card header={`Segment Detail: ${selectedSegment.label}`}>
              <div className="space-y-4">
                <p className="text-sm text-gray-300 leading-relaxed">
                  {selectedSegment.description}
                </p>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Records', value: selectedSegment.recordCount.toLocaleString() },
                    { label: 'Funded Rate', value: `${(selectedSegment.fundedRate * 100).toFixed(1)}%` },
                    { label: 'Cluster ID', value: `#${selectedSegment.id}` },
                    {
                      label: '% of Total',
                      value: `${((selectedSegment.recordCount / segments.totalVectorsAnalyzed) * 100).toFixed(1)}%`,
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-navy-900 p-3 text-center">
                      <div className="text-base font-bold text-white">{value}</div>
                      <div className="text-xs text-gray-500">{label}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dominant Attributes
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {Object.entries(selectedSegment.dominantAttributes)
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-navy-900 p-2">
                          <div className="text-xs text-gray-500">{ATTRIBUTE_LABELS[k] || k}</div>
                          <div className="mt-0.5 text-sm font-medium text-white">{v}</div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
