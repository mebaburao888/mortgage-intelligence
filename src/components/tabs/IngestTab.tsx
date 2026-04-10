'use client';

import { useRef, useState } from 'react';
import { Upload, FileText, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Progress from '@/components/ui/Progress';
import Badge from '@/components/ui/Badge';

interface ProgressEvent {
  type: 'progress' | 'complete' | 'error';
  phase?: string;
  processed?: number;
  total?: number;
  vectorCount?: number;
  message?: string;
  trancheId?: string;
  recordCount?: number;
  durationMs?: number;
  source?: string;
}

interface CompletedResult {
  trancheId: string;
  recordCount: number;
  vectorCount: number;
  durationMs: number;
  source: string;
}

export default function IngestTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [result, setResult] = useState<CompletedResult | null>(null);
  const [recentTranches, setRecentTranches] = useState<CompletedResult[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError('');
      setProgress(null);
    }
  };

  async function runIngest(url: string, body?: FormData) {
    setLoading(true);
    setError('');
    setProgress(null);
    setResult(null);

    try {
      const response = await fetch(url, {
        method: 'POST',
        body,
      });

      if (!response.ok && !response.body) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event: ProgressEvent = JSON.parse(line);
            if (event.type === 'progress') {
              setProgress(event);
            } else if (event.type === 'complete') {
              const completed: CompletedResult = {
                trancheId: event.trancheId!,
                recordCount: event.recordCount!,
                vectorCount: event.vectorCount!,
                durationMs: event.durationMs!,
                source: event.source!,
              };
              setResult(completed);
              setRecentTranches((prev) => [completed, ...prev.slice(0, 9)]);
              setProgress(null);
            } else if (event.type === 'error') {
              throw new Error(event.message || 'Ingest failed');
            }
          } catch {
            // skip non-JSON lines
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const uploadFile = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    runIngest('/api/ingest', formData);
  };

  const useSynthetic = () => {
    runIngest('/api/ingest?source=synthetic');
  };

  const progressPct =
    progress?.processed && progress?.total
      ? (progress.processed / progress.total) * 100
      : 0;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Upload area */}
      <Card header="Upload CSV">
        <div className="space-y-4">
          <div
            onClick={() => !loading && fileInputRef.current?.click()}
            className={`
              flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all
              ${file
                ? 'border-electric-500/50 bg-electric-500/5'
                : 'border-navy-600 hover:border-navy-500 hover:bg-navy-700/30'
              }
              ${loading ? 'cursor-not-allowed opacity-50' : ''}
            `}
          >
            {file ? (
              <>
                <FileText size={32} className="mb-3 text-electric-400" />
                <div className="text-sm font-semibold text-white">{file.name}</div>
                <div className="mt-1 text-xs text-gray-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB — click to change
                </div>
              </>
            ) : (
              <>
                <Upload size={32} className="mb-3 text-gray-500" />
                <div className="text-sm font-medium text-gray-300">Click to select a CSV file</div>
                <div className="mt-1 text-xs text-gray-500">
                  Fields: first_name, last_name, ssn, dob, email, phone, fico, income...
                </div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex gap-3">
            <Button
              onClick={uploadFile}
              disabled={!file || loading}
              loading={loading && !!file}
              className="flex-1"
            >
              <Upload size={16} />
              Upload & Ingest
            </Button>
            <Button
              variant="secondary"
              onClick={useSynthetic}
              disabled={loading}
              loading={loading && !file}
              className="flex-1"
            >
              <Zap size={16} />
              Use Synthetic Dataset
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            De-identification happens in memory — no PII is ever written to disk or stored in Chroma Cloud.
          </p>
        </div>
      </Card>

      {/* Progress */}
      {loading && progress && (
        <Card header="Ingestion Progress">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400 capitalize">{progress.phase || 'Processing'}...</span>
              {progress.processed && progress.total && (
                <span className="text-gray-400">
                  {progress.processed.toLocaleString()} / {progress.total.toLocaleString()}
                </span>
              )}
            </div>
            <Progress
              value={progressPct}
              label={progress.message || ''}
              showValue
            />
            {progress.vectorCount && (
              <div className="text-xs text-electric-400">
                {progress.vectorCount.toLocaleString()} vectors created
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle size={18} className="shrink-0 text-red-400 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-red-400">Ingest Failed</div>
            <div className="mt-1 text-xs text-red-300/80">{error}</div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <Card>
          <div className="flex items-start gap-3">
            <CheckCircle size={20} className="shrink-0 text-green-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-green-400">Ingest Complete</div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Tranche ID', value: result.trancheId, mono: true },
                  { label: 'Records', value: result.recordCount.toLocaleString() },
                  { label: 'Vectors', value: result.vectorCount.toLocaleString() },
                  {
                    label: 'Duration',
                    value: `${(result.durationMs / 1000).toFixed(1)}s`,
                  },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="rounded-lg bg-navy-900 p-3">
                    <div
                      className={`text-sm font-semibold text-white truncate ${
                        mono ? 'font-mono text-xs' : ''
                      }`}
                    >
                      {value}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Recent tranches */}
      {recentTranches.length > 0 && (
        <Card header="Recent Tranches">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="pb-2 text-left text-xs font-medium text-gray-500">Tranche ID</th>
                  <th className="pb-2 text-right text-xs font-medium text-gray-500">Records</th>
                  <th className="pb-2 text-right text-xs font-medium text-gray-500">Vectors</th>
                  <th className="pb-2 text-right text-xs font-medium text-gray-500">Duration</th>
                  <th className="pb-2 text-right text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTranches.map((t, i) => (
                  <tr key={i} className="border-b border-navy-700/50">
                    <td className="py-2 font-mono text-xs text-electric-400">{t.trancheId}</td>
                    <td className="py-2 text-right text-gray-300">{t.recordCount.toLocaleString()}</td>
                    <td className="py-2 text-right text-gray-300">{t.vectorCount.toLocaleString()}</td>
                    <td className="py-2 text-right text-gray-300">{(t.durationMs / 1000).toFixed(1)}s</td>
                    <td className="py-2 text-right">
                      <Badge color="green">complete</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
