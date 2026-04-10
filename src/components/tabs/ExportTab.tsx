'use client';

import { useState } from 'react';
import { Download, Search, Filter, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

type ExportMode = 'query' | 'filter';

const FILTER_KEYS = [
  { value: 'outcome', label: 'Outcome' },
  { value: 'generation', label: 'Generation' },
  { value: 'credit_profile', label: 'Credit Profile' },
  { value: 'loan_purpose', label: 'Loan Purpose' },
  { value: 'loan_type', label: 'Loan Type' },
  { value: 'state', label: 'State' },
  { value: 'metro', label: 'Metro Area' },
  { value: 'income_range', label: 'Income Range' },
  { value: 'journey_stage', label: 'Journey Stage' },
  { value: 'industry', label: 'Industry' },
  { value: 'tranche_id', label: 'Tranche ID' },
];

interface FilterRow {
  key: string;
  value: string;
}

interface PreviewResult {
  count: number;
}

export default function ExportTab() {
  const [mode, setMode] = useState<ExportMode>('query');
  const [queryText, setQueryText] = useState('');
  const [topK, setTopK] = useState(500);
  const [filters, setFilters] = useState<FilterRow[]>([{ key: 'outcome', value: 'funded' }]);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const addFilter = () => setFilters((f) => [...f, { key: 'outcome', value: '' }]);
  const removeFilter = (i: number) => setFilters((f) => f.filter((_, idx) => idx !== i));
  const setFilterField = (i: number, field: keyof FilterRow, val: string) =>
    setFilters((f) => f.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));

  const buildPayload = (isPreview = false) => {
    if (mode === 'query') {
      return { query: queryText.trim(), topK, ...(isPreview ? { preview: true } : {}) };
    } else {
      const validFilters = filters.filter((f) => f.key.trim() && f.value.trim());
      const filterObj = Object.fromEntries(validFilters.map((f) => [f.key, f.value]));
      return { filter: filterObj, topK, ...(isPreview ? { preview: true } : {}) };
    }
  };

  const previewCount = async () => {
    if (mode === 'query' && !queryText.trim()) {
      setError('Enter a search query');
      return;
    }
    if (mode === 'filter' && filters.every((f) => !f.value.trim())) {
      setError('Add at least one filter value');
      return;
    }

    setLoading(true);
    setError('');
    setPreview(null);

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(true)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
    if (mode === 'query' && !queryText.trim()) {
      setError('Enter a search query');
      return;
    }

    setDownloading(true);
    setError('');

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(false)),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      // Download file
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      a.href = url;
      a.download = `audience_export_${timestamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Privacy notice */}
      <div className="flex items-start gap-3 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
        <Shield size={18} className="shrink-0 text-green-400 mt-0.5" />
        <div>
          <div className="text-sm font-medium text-green-400">Token-Only Export</div>
          <div className="mt-0.5 text-xs text-green-300/70">
            CSV contains only pseudonymous HMAC tokens (email_token, phone_token). No names, SSNs, emails, or phone numbers.
            Tokens are platform-ready for Facebook Custom Audiences and Google Customer Match.
          </div>
        </div>
      </div>

      {/* Mode selector */}
      <Card header="Export Configuration">
        <div className="space-y-4">
          {/* Mode tabs */}
          <div className="flex rounded-lg border border-navy-700 p-1">
            {[
              { id: 'query' as ExportMode, label: 'Similarity Query', icon: <Search size={14} /> },
              { id: 'filter' as ExportMode, label: 'Metadata Filter', icon: <Filter size={14} /> },
            ].map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => { setMode(id); setPreview(null); setError(''); }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all ${
                  mode === id
                    ? 'bg-electric-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* Query mode */}
          {mode === 'query' && (
            <div className="space-y-3">
              <Input
                label="Search Query"
                placeholder="e.g. funded Millennial purchase loans in Pacific Northwest..."
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                leftIcon={<Search size={16} />}
              />
              <div>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-medium text-gray-300">Max Records</span>
                  <span className="text-electric-400 font-semibold">{topK.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={2000}
                  step={50}
                  value={topK}
                  onChange={(e) => setTopK(parseInt(e.target.value))}
                  className="w-full accent-electric-500"
                />
                <div className="mt-1 flex justify-between text-xs text-gray-600">
                  <span>50</span>
                  <span>2,000</span>
                </div>
              </div>
            </div>
          )}

          {/* Filter mode */}
          {mode === 'filter' && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-300">Metadata Filters</div>
              {filters.map((filter, i) => (
                <div key={i} className="flex gap-2">
                  <Select
                    value={filter.key}
                    onChange={(e) => setFilterField(i, 'key', e.target.value)}
                    options={FILTER_KEYS}
                    className="flex-1"
                  />
                  <Input
                    placeholder="value"
                    value={filter.value}
                    onChange={(e) => setFilterField(i, 'value', e.target.value)}
                    className="flex-1"
                  />
                  {filters.length > 1 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeFilter(i)}
                      className="shrink-0"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addFilter}>
                + Add Filter
              </Button>

              <div>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-medium text-gray-300">Max Records</span>
                  <span className="text-electric-400 font-semibold">{topK.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={2000}
                  step={50}
                  value={topK}
                  onChange={(e) => setTopK(parseInt(e.target.value))}
                  className="w-full accent-electric-500"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle size={18} className="shrink-0 text-red-400 mt-0.5" />
          <div className="text-sm text-red-300">{error}</div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={previewCount} loading={loading} disabled={loading || downloading}>
          <Search size={16} />
          Preview Count
        </Button>
        <Button onClick={download} loading={downloading} disabled={loading || downloading}>
          <Download size={16} />
          Download CSV
        </Button>
      </div>

      {/* Preview result */}
      {preview && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
          <CheckCircle size={18} className="shrink-0 text-blue-400 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-blue-400">
              {preview.count.toLocaleString()} unique records matched
            </div>
            <div className="mt-0.5 text-xs text-blue-300/70">
              Click &quot;Download CSV&quot; to export email_token and phone_token columns.
            </div>
          </div>
        </div>
      )}

      {/* Format info */}
      <Card header="Export Format">
        <div className="text-sm text-gray-400 space-y-2">
          <p>The exported CSV contains two columns:</p>
          <div className="rounded-lg bg-navy-900 p-3 font-mono text-xs text-green-300">
            <div>email_token,phone_token</div>
            <div>a1b2c3d4e5f6a7b8,9f8e7d6c5b4a3b2c</div>
            <div>b2c3d4e5f6a7b8c9,0a9b8c7d6e5f4g3h</div>
          </div>
          <p className="text-xs text-gray-500">
            Tokens are HMAC-SHA256 digests. Upload directly to Facebook Custom Audiences or Google Customer Match.
            No PII ever leaves the system.
          </p>
        </div>
      </Card>
    </div>
  );
}
