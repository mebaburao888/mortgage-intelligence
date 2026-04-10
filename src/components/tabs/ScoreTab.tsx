'use client';

import { useState } from 'react';
import { TrendingUp, AlertCircle, Info } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import clsx from 'clsx';

interface ScoreResult {
  score: number;
  funded_rate: number;
  neighbor_count: number;
  confidence: 'High' | 'Medium' | 'Low';
  profile: Record<string, unknown>;
  profile_text: string;
  top_neighbors: Array<{
    score: number;
    outcome: string;
    fico_band: string;
    credit_profile: string;
    income_range: string;
    generation: string;
    loan_purpose: string;
    journey_stage: string;
    metro: string;
  }>;
}

const DEFAULTS = {
  fico: '700',
  income: '80000',
  dob: '1985-06-15',
  dti: '0.33',
  ltv: '0.85',
  loan_amount: '350000',
  loan_purpose: 'Purchase',
  loan_type: 'Conventional',
  loan_term: '30',
  property_type: 'Single Family',
  occupancy: 'Primary',
  employment_status: 'Employed',
  employer: 'Google',
  tenure_years: '5',
  channel: 'Search',
  lead_type: 'Internet Lead',
  lead_score: '65',
  journey_stage: 'Consideration',
  first_time_buyer: 'true',
  military: 'false',
  gender: 'Male',
  marital_status: 'Married',
  dependents: '1',
  bankruptcy: 'No',
  foreclosure: 'No',
  state: 'CA',
  city: 'Los Angeles',
  zip: '90210',
};

function scoreColor(score: number) {
  if (score >= 60) return 'text-green-400';
  if (score >= 35) return 'text-yellow-400';
  return 'text-red-400';
}

function scoreLabel(score: number) {
  if (score >= 60) return 'High Propensity';
  if (score >= 35) return 'Medium Propensity';
  return 'Low Propensity';
}

function confidenceColor(conf: string) {
  if (conf === 'High') return 'text-green-400 bg-green-500/10 border-green-500/20';
  if (conf === 'Medium') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
  return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
}

export default function ScoreTab() {
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScoreResult | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const score = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const payload = {
        ...form,
        fico: parseInt(form.fico),
        income: parseFloat(form.income),
        dti: parseFloat(form.dti),
        ltv: parseFloat(form.ltv),
        loan_amount: parseFloat(form.loan_amount),
        loan_term: parseInt(form.loan_term),
        lead_score: parseInt(form.lead_score),
        tenure_years: parseFloat(form.tenure_years),
        dependents: parseInt(form.dependents),
        first_time_buyer: form.first_time_buyer === 'true',
        military: form.military === 'true',
      };

      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card header="Lead Details">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Financial */}
            <Input
              label="FICO Score"
              type="number"
              min={300}
              max={850}
              value={form.fico}
              onChange={(e) => set('fico', e.target.value)}
            />
            <Input
              label="Annual Income ($)"
              type="number"
              min={0}
              step={1000}
              value={form.income}
              onChange={(e) => set('income', e.target.value)}
            />
            <Input
              label="Date of Birth"
              type="date"
              value={form.dob}
              onChange={(e) => set('dob', e.target.value)}
            />
            <Input
              label="DTI Ratio (e.g. 0.33)"
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={form.dti}
              onChange={(e) => set('dti', e.target.value)}
            />
            <Input
              label="LTV Ratio (e.g. 0.85)"
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={form.ltv}
              onChange={(e) => set('ltv', e.target.value)}
            />
            <Input
              label="Loan Amount ($)"
              type="number"
              min={0}
              step={5000}
              value={form.loan_amount}
              onChange={(e) => set('loan_amount', e.target.value)}
            />

            {/* Loan */}
            <Select
              label="Loan Purpose"
              value={form.loan_purpose}
              onChange={(e) => set('loan_purpose', e.target.value)}
              options={['Purchase', 'Refinance', 'Cash-Out', 'HELOC'].map((v) => ({ value: v, label: v }))}
            />
            <Select
              label="Loan Type"
              value={form.loan_type}
              onChange={(e) => set('loan_type', e.target.value)}
              options={['Conventional', 'FHA', 'VA', 'Jumbo', 'USDA'].map((v) => ({ value: v, label: v }))}
            />
            <Select
              label="Loan Term (years)"
              value={form.loan_term}
              onChange={(e) => set('loan_term', e.target.value)}
              options={['10', '15', '20', '30'].map((v) => ({ value: v, label: `${v} years` }))}
            />
            <Select
              label="Property Type"
              value={form.property_type}
              onChange={(e) => set('property_type', e.target.value)}
              options={['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Manufactured'].map((v) => ({ value: v, label: v }))}
            />
            <Select
              label="Occupancy"
              value={form.occupancy}
              onChange={(e) => set('occupancy', e.target.value)}
              options={['Primary', 'Secondary', 'Investment'].map((v) => ({ value: v, label: v }))}
            />

            {/* Employment */}
            <Select
              label="Employment Status"
              value={form.employment_status}
              onChange={(e) => set('employment_status', e.target.value)}
              options={['Employed', 'Self-Employed', 'Retired', 'Unemployed'].map((v) => ({ value: v, label: v }))}
            />
            <Input
              label="Employer"
              type="text"
              value={form.employer}
              onChange={(e) => set('employer', e.target.value)}
            />
            <Input
              label="Tenure (years)"
              type="number"
              min={0}
              max={40}
              step={0.5}
              value={form.tenure_years}
              onChange={(e) => set('tenure_years', e.target.value)}
            />

            {/* Lead */}
            <Select
              label="Channel"
              value={form.channel}
              onChange={(e) => set('channel', e.target.value)}
              options={['Search', 'Social', 'Referral', 'Direct Mail', 'TV'].map((v) => ({ value: v, label: v }))}
            />
            <Select
              label="Lead Type"
              value={form.lead_type}
              onChange={(e) => set('lead_type', e.target.value)}
              options={['Internet Lead', 'Warm Transfer', 'Call-In', 'Direct'].map((v) => ({ value: v, label: v }))}
            />
            <Select
              label="Journey Stage"
              value={form.journey_stage}
              onChange={(e) => set('journey_stage', e.target.value)}
              options={['Awareness', 'Consideration', 'Application', 'Decision'].map((v) => ({ value: v, label: v }))}
            />
            <Input
              label="Lead Score (1-100)"
              type="number"
              min={1}
              max={100}
              value={form.lead_score}
              onChange={(e) => set('lead_score', e.target.value)}
            />

            {/* Demographics */}
            <Select
              label="Gender"
              value={form.gender}
              onChange={(e) => set('gender', e.target.value)}
              options={['Male', 'Female', 'Non-binary'].map((v) => ({ value: v, label: v }))}
            />
            <Select
              label="Marital Status"
              value={form.marital_status}
              onChange={(e) => set('marital_status', e.target.value)}
              options={['Married', 'Single', 'Divorced', 'Widowed'].map((v) => ({ value: v, label: v }))}
            />
            <Input
              label="Dependents"
              type="number"
              min={0}
              max={10}
              value={form.dependents}
              onChange={(e) => set('dependents', e.target.value)}
            />
            <Select
              label="First-Time Buyer"
              value={form.first_time_buyer}
              onChange={(e) => set('first_time_buyer', e.target.value)}
              options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            />
            <Select
              label="Military / VA Eligible"
              value={form.military}
              onChange={(e) => set('military', e.target.value)}
              options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]}
            />
            <Select
              label="Prior Bankruptcy"
              value={form.bankruptcy}
              onChange={(e) => set('bankruptcy', e.target.value)}
              options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
            />

            {/* Location */}
            <Input
              label="State (2-letter)"
              type="text"
              maxLength={2}
              value={form.state}
              onChange={(e) => set('state', e.target.value.toUpperCase())}
            />
            <Input
              label="City"
              type="text"
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
            />
            <Input
              label="ZIP Code"
              type="text"
              maxLength={5}
              value={form.zip}
              onChange={(e) => set('zip', e.target.value)}
            />
          </div>

          <div className="pt-2">
            <Button onClick={score} loading={loading} size="lg" className="w-full sm:w-auto">
              <TrendingUp size={18} />
              Score Lead
            </Button>
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle size={18} className="shrink-0 text-red-400 mt-0.5" />
          <div className="text-sm text-red-300">{error}</div>
        </div>
      )}

      {/* Result */}
      {result && (
        <>
          {/* Score display */}
          <Card>
            <div className="flex flex-col items-center gap-4 py-4 sm:flex-row sm:justify-between">
              <div className="text-center sm:text-left">
                <div className={clsx('text-7xl font-bold tabular-nums', scoreColor(result.score))}>
                  {result.score}
                </div>
                <div className={clsx('mt-2 text-lg font-semibold', scoreColor(result.score))}>
                  {scoreLabel(result.score)}
                </div>
                <div className="mt-1 text-sm text-gray-500">Propensity score out of 100</div>
              </div>

              <div className="flex flex-col gap-4 sm:items-end">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-center">
                  {[
                    { label: 'Funded Rate', value: `${(result.funded_rate * 100).toFixed(1)}%` },
                    { label: 'Neighbors', value: result.neighbor_count },
                    { label: 'Confidence', value: result.confidence },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-navy-900 px-4 py-3">
                      <div className={clsx(
                        'text-lg font-bold',
                        label === 'Confidence' ? confidenceColor(String(value)).split(' ')[0] : 'text-white'
                      )}>
                        {value}
                      </div>
                      <div className="text-xs text-gray-500">{label}</div>
                    </div>
                  ))}
                </div>

                <div
                  className={clsx(
                    'rounded-lg border px-4 py-2 text-center text-xs font-medium',
                    confidenceColor(result.confidence)
                  )}
                >
                  {result.confidence} Confidence
                </div>
              </div>
            </div>
          </Card>

          {/* Profile text */}
          <Card header="Generated Profile">
            <div className="flex items-start gap-2">
              <Info size={16} className="shrink-0 text-electric-400 mt-0.5" />
              <p className="text-sm text-gray-300 leading-relaxed">{result.profile_text}</p>
            </div>
          </Card>

          {/* Nearest neighbors */}
          {result.top_neighbors.length > 0 && (
            <Card
              header={`${result.top_neighbors.length} Nearest Neighbors (No PII)`}
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {result.top_neighbors.slice(0, 12).map((n, i) => {
                  const outcomeColor: Record<string, string> = {
                    funded: 'border-green-500/30 bg-green-500/5',
                    lost: 'border-red-500/20 bg-red-500/5',
                    dead: 'border-red-500/20 bg-red-500/5',
                    'in-progress': 'border-blue-500/20 bg-blue-500/5',
                    unknown: 'border-navy-600',
                  };
                  return (
                    <div
                      key={i}
                      className={clsx(
                        'rounded-lg border p-3 text-xs space-y-1',
                        outcomeColor[n.outcome] || 'border-navy-600'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-300">{n.generation}</span>
                        <span
                          className={clsx(
                            'rounded-full px-1.5 py-0.5 text-xs font-medium',
                            n.outcome === 'funded'
                              ? 'bg-green-500/20 text-green-400'
                              : n.outcome === 'in-progress'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-red-500/20 text-red-400'
                          )}
                        >
                          {n.outcome}
                        </span>
                      </div>
                      <div className="text-gray-500">{n.credit_profile} · {n.income_range}</div>
                      <div className="text-gray-500">{n.loan_purpose} · {n.journey_stage}</div>
                      <div className="text-electric-400 font-mono">
                        {(n.score * 100).toFixed(1)}% match
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
