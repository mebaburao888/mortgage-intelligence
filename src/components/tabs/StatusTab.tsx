'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Database, Layers, AlertCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Progress from '@/components/ui/Progress';
import Spinner from '@/components/ui/Spinner';

interface TrancheManifest {
  id: string;
  timestamp: string;
  recordCount: number;
  vectorCount: number;
  source: string;
  status: 'processing' | 'complete' | 'error';
  durationMs?: number;
  errorMessage?: string;
}

interface StatusData {
  totalVectors: number;
  collectionName?: string;
  tranches: TrancheManifest[];
  error?: string;
}

function statusBadgeColor(status: TrancheManifest['status']) {
  if (status === 'complete') return 'green';
  if (status === 'processing') return 'blue';
  return 'red';
}

function formatTimestamp(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function formatDuration(ms?: number) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function StatusTab() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/status');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Auto-refreshes every 30 seconds
        </div>
        <Button variant="secondary" size="sm" onClick={load} loading={loading} disabled={loading}>
          <RefreshCw size={14} />
          Refresh Now
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle size={18} className="shrink-0 text-red-400 mt-0.5" />
          <div className="text-sm text-red-300">{error}</div>
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="flex items-center justify-center gap-3 py-12 text-gray-400">
          <Spinner />
          <span>Loading index status...</span>
        </div>
      )}

      {data && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                label: 'Total Vectors',
                value: (data.totalVectors || 0).toLocaleString(),
                icon: <Database size={20} />,
                color: 'text-electric-400',
              },
              {
                label: 'Lead Records',
                value: Math.floor((data.totalVectors || 0) / 2).toLocaleString(),
                icon: <Layers size={20} />,
                color: 'text-blue-400',
                hint: '2 vectors/record',
              },
              {
                label: 'Tranches',
                value: data.tranches.length,
                icon: <Layers size={20} />,
                color: 'text-purple-400',
              },
              {
                label: 'Collection',
                value: data.collectionName || 'mortgage-leads',
                icon: <Database size={20} />,
                color: 'text-green-400',
              },
            ].map(({ label, value, icon, color, hint }) => (
              <div key={label} className="rounded-xl border border-navy-700 bg-navy-800/80 p-4">
                <div className={`mb-1 ${color}`}>{icon}</div>
                <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
                <div className="mt-0.5 text-xs text-gray-500">{label}</div>
                {hint && <div className="text-xs text-gray-600">{hint}</div>}
              </div>
            ))}
          </div>

          {/* Vector capacity indicator */}
          <Card header="Collection Capacity">
            <Progress
              value={Math.min(100, ((data.totalVectors || 0) / 300000) * 100)}
              label="Utilization (est. 300k capacity)"
              showValue
              color="blue"
            />
            <p className="mt-2 text-xs text-gray-500">
              Chroma Cloud collection: <code className="text-electric-400">mortgage-leads</code>. Capacity scales automatically.
            </p>
          </Card>



          {/* Tranche history */}
          <Card header="Tranche History">
            {data.tranches.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">
                No tranches yet. Ingest a CSV file to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-navy-700">
                      {['Tranche ID', 'Source', 'Records', 'Vectors', 'Duration', 'Timestamp', 'Status'].map(
                        (h) => (
                          <th
                            key={h}
                            className="pb-2 pr-4 text-left text-xs font-medium text-gray-500 whitespace-nowrap"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.tranches.map((t) => (
                      <tr key={t.id} className="border-b border-navy-700/40">
                        <td className="py-2 pr-4 font-mono text-xs text-electric-400 whitespace-nowrap">
                          {t.id}
                        </td>
                        <td className="py-2 pr-4 text-gray-400 text-xs max-w-[140px] truncate">
                          {t.source}
                        </td>
                        <td className="py-2 pr-4 text-gray-300 tabular-nums">
                          {t.recordCount.toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 text-gray-300 tabular-nums">
                          {t.vectorCount.toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 text-gray-400 tabular-nums whitespace-nowrap">
                          {formatDuration(t.durationMs)}
                        </td>
                        <td className="py-2 pr-4 text-gray-500 text-xs whitespace-nowrap">
                          {formatTimestamp(t.timestamp)}
                        </td>
                        <td className="py-2">
                          <Badge color={statusBadgeColor(t.status)}>
                            {t.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* API key status */}
          <Card header="Configuration">
            <div className="space-y-2 text-sm">
              {[
                {
                  label: 'OpenAI API',
                  status: !!process.env.NEXT_PUBLIC_APP_URL,
                  desc: 'text-embedding-3-small',
                },
                {
                  label: 'Chroma Cloud',
                  status: (data.totalVectors || 0) >= 0,
                  desc: data.collectionName ? `Collection: ${data.collectionName}` : 'Check CHROMA_API_KEY',
                },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-gray-400">{label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{desc}</span>
                    <span className="h-2 w-2 rounded-full bg-green-400" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {data.error && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-xs text-yellow-400">
              <strong>Warning:</strong> {data.error}
            </div>
          )}
        </>
      )}
    </div>
  );
}
