/**
 * De-identification engine — NEVER writes PII to disk.
 * All transformations happen in memory.
 * Ports the Python deid.py logic to TypeScript.
 */

import crypto from 'crypto';

const SALT = process.env.DEID_SALT || 'default-salt-change-in-prod';

// ── Fields to DROP completely (pure identifiers) ──────────────────────────────
export const DROP_FIELDS = ['first_name', 'last_name', 'ssn', 'street', 'phone', 'email'];

// ── HMAC-SHA256 token (pseudonymous — safe to store) ─────────────────────────
export function hashToken(value: string): string {
  return crypto
    .createHmac('sha256', SALT)
    .update(value)
    .digest('hex')
    .slice(0, 16);
}

// ── Age / life-stage / generation ─────────────────────────────────────────────
export function transformDob(dob: string): {
  age_range: string;
  life_stage: string;
  generation: string;
} {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  // 5-year buckets
  const lo = Math.floor(age / 5) * 5;
  const age_range = age >= 65 ? '65+' : `${lo}-${lo + 4}`;

  let life_stage: string;
  if (age < 35) life_stage = 'Young Adult';
  else if (age < 45) life_stage = 'Prime Earner';
  else if (age < 55) life_stage = 'Peak Earner';
  else if (age < 65) life_stage = 'Pre-Retirement';
  else life_stage = 'Senior';

  let generation: string;
  if (age < 12) generation = 'GenAlpha';
  else if (age <= 27) generation = 'GenZ';
  else if (age <= 43) generation = 'Millennial';
  else if (age <= 59) generation = 'GenX';
  else if (age <= 78) generation = 'Boomer';
  else generation = 'Silent';

  return { age_range, life_stage, generation };
}

// ── ZIP → metro / urban class ─────────────────────────────────────────────────
const ZIP3_METRO_MAP: Record<string, { metro: string; urban_class: string }> = {
  '100': { metro: 'New York', urban_class: 'Urban' },
  '103': { metro: 'New York', urban_class: 'Urban' },
  '110': { metro: 'New York', urban_class: 'Urban' },
  '114': { metro: 'New York', urban_class: 'Urban' },
  '117': { metro: 'New York', urban_class: 'Urban' },
  '120': { metro: 'Albany', urban_class: 'Suburban' },
  '200': { metro: 'Washington DC', urban_class: 'Urban' },
  '201': { metro: 'Washington DC', urban_class: 'Suburban' },
  '206': { metro: 'Washington DC', urban_class: 'Suburban' },
  '207': { metro: 'Washington DC', urban_class: 'Suburban' },
  '270': { metro: 'Greensboro', urban_class: 'Suburban' },
  '275': { metro: 'Raleigh-Durham', urban_class: 'Suburban' },
  '290': { metro: 'Columbia SC', urban_class: 'Suburban' },
  '300': { metro: 'Atlanta', urban_class: 'Urban' },
  '302': { metro: 'Atlanta', urban_class: 'Urban' },
  '303': { metro: 'Atlanta', urban_class: 'Suburban' },
  '320': { metro: 'Jacksonville', urban_class: 'Suburban' },
  '330': { metro: 'Miami', urban_class: 'Urban' },
  '337': { metro: 'Tampa', urban_class: 'Urban' },
  '341': { metro: 'Fort Myers', urban_class: 'Suburban' },
  '350': { metro: 'Birmingham', urban_class: 'Suburban' },
  '370': { metro: 'Nashville', urban_class: 'Urban' },
  '400': { metro: 'Louisville', urban_class: 'Suburban' },
  '430': { metro: 'Columbus OH', urban_class: 'Suburban' },
  '440': { metro: 'Cleveland', urban_class: 'Urban' },
  '450': { metro: 'Cincinnati', urban_class: 'Urban' },
  '460': { metro: 'Indianapolis', urban_class: 'Suburban' },
  '480': { metro: 'Detroit', urban_class: 'Urban' },
  '481': { metro: 'Detroit', urban_class: 'Suburban' },
  '530': { metro: 'Milwaukee', urban_class: 'Urban' },
  '550': { metro: 'Minneapolis', urban_class: 'Urban' },
  '553': { metro: 'Minneapolis', urban_class: 'Suburban' },
  '600': { metro: 'Chicago', urban_class: 'Urban' },
  '601': { metro: 'Chicago', urban_class: 'Urban' },
  '602': { metro: 'Chicago', urban_class: 'Urban' },
  '630': { metro: 'St. Louis', urban_class: 'Urban' },
  '700': { metro: 'New Orleans', urban_class: 'Urban' },
  '701': { metro: 'Baton Rouge', urban_class: 'Suburban' },
  '730': { metro: 'Oklahoma City', urban_class: 'Suburban' },
  '750': { metro: 'Dallas-Fort Worth', urban_class: 'Suburban' },
  '752': { metro: 'Dallas-Fort Worth', urban_class: 'Urban' },
  '770': { metro: 'Houston', urban_class: 'Urban' },
  '775': { metro: 'Houston', urban_class: 'Suburban' },
  '780': { metro: 'San Antonio', urban_class: 'Urban' },
  '787': { metro: 'Austin', urban_class: 'Urban' },
  '800': { metro: 'Denver', urban_class: 'Urban' },
  '801': { metro: 'Denver', urban_class: 'Suburban' },
  '840': { metro: 'Salt Lake City', urban_class: 'Urban' },
  '841': { metro: 'Salt Lake City', urban_class: 'Suburban' },
  '850': { metro: 'Phoenix', urban_class: 'Urban' },
  '851': { metro: 'Phoenix', urban_class: 'Suburban' },
  '852': { metro: 'Scottsdale', urban_class: 'Suburban' },
  '889': { metro: 'Las Vegas', urban_class: 'Urban' },
  '890': { metro: 'Las Vegas', urban_class: 'Urban' },
  '900': { metro: 'Los Angeles', urban_class: 'Urban' },
  '902': { metro: 'Los Angeles', urban_class: 'Urban' },
  '906': { metro: 'Los Angeles', urban_class: 'Suburban' },
  '913': { metro: 'Los Angeles', urban_class: 'Suburban' },
  '945': { metro: 'San Francisco Bay Area', urban_class: 'Urban' },
  '949': { metro: 'San Francisco Bay Area', urban_class: 'Suburban' },
  '958': { metro: 'Sacramento', urban_class: 'Suburban' },
  '963': { metro: 'Redding', urban_class: 'Rural' },
  '970': { metro: 'Portland OR', urban_class: 'Urban' },
  '971': { metro: 'Portland OR', urban_class: 'Urban' },
  '972': { metro: 'Portland OR', urban_class: 'Suburban' },
  '980': { metro: 'Seattle', urban_class: 'Urban' },
  '981': { metro: 'Seattle', urban_class: 'Urban' },
  '982': { metro: 'Seattle', urban_class: 'Suburban' },
};

export function transformZip(zip: string): {
  zip3: string;
  metro: string;
  urban_class: string;
} {
  const zip3 = zip.slice(0, 3);
  const mapping = ZIP3_METRO_MAP[zip3];
  return {
    zip3,
    metro: mapping?.metro || 'Other Metro',
    urban_class: mapping?.urban_class || 'Suburban',
  };
}

// ── Income bucket ─────────────────────────────────────────────────────────────
export function transformIncome(income: number): {
  income_range: string;
  income_tier: string;
} {
  let income_range: string;
  if (income < 30000) income_range = '<30k';
  else if (income < 50000) income_range = '30-50k';
  else if (income < 75000) income_range = '50-75k';
  else if (income < 100000) income_range = '75-100k';
  else if (income < 150000) income_range = '100-150k';
  else if (income < 200000) income_range = '150-200k';
  else income_range = '200k+';

  let income_tier: string;
  if (income < 30000) income_tier = 'Low';
  else if (income < 50000) income_tier = 'Lower-Middle';
  else if (income < 100000) income_tier = 'Middle';
  else if (income < 150000) income_tier = 'Upper-Middle';
  else if (income < 250000) income_tier = 'High';
  else income_tier = 'Very High';

  return { income_range, income_tier };
}

// ── Employer → industry / tier / stability ────────────────────────────────────
const EMPLOYER_INDUSTRY_MAP: Record<string, string> = {
  Google: 'Technology',
  Microsoft: 'Technology',
  Amazon: 'Technology',
  Apple: 'Technology',
  Meta: 'Technology',
  Salesforce: 'Technology',
  Oracle: 'Technology',
  IBM: 'Technology',
  'JPMorgan Chase': 'Finance',
  'Bank of America': 'Finance',
  'Wells Fargo': 'Finance',
  'Goldman Sachs': 'Finance',
  'Morgan Stanley': 'Finance',
  'Fidelity Investments': 'Finance',
  'Kaiser Permanente': 'Healthcare',
  'HCA Healthcare': 'Healthcare',
  'CVS Health': 'Healthcare',
  'UnitedHealth Group': 'Healthcare',
  Walmart: 'Retail',
  Target: 'Retail',
  Costco: 'Retail',
  "Lowe's": 'Retail',
  'Home Depot': 'Retail',
  Boeing: 'Defense',
  'Lockheed Martin': 'Defense',
  'Raytheon Technologies': 'Defense',
  Chevron: 'Energy',
  ExxonMobil: 'Energy',
  ConocoPhillips: 'Energy',
  'State University System': 'Education',
  'Community College District': 'Education',
  'US Federal Government': 'Government',
  'State of California': 'Government',
  'City of New York': 'Government',
  'Red Cross': 'Non-Profit',
  'Habitat for Humanity': 'Non-Profit',
};

const ENTERPRISE_EMPLOYERS = new Set(Object.keys(EMPLOYER_INDUSTRY_MAP));

export function transformEmployer(employer: string): {
  industry: string;
  employer_tier: string;
  employer_stability: string;
} {
  const industry = EMPLOYER_INDUSTRY_MAP[employer] || 'SMB';

  let employer_tier: string;
  if (employer === 'Self-Employed' || employer === 'Independent Contractor' || employer === 'Freelance Consultant') {
    employer_tier = 'Self-Employed';
  } else if (employer === 'Red Cross' || employer === 'Habitat for Humanity') {
    employer_tier = 'Non-Profit';
  } else if (
    employer === 'US Federal Government' ||
    employer === 'State of California' ||
    employer === 'City of New York' ||
    employer === 'State University System' ||
    employer === 'Community College District'
  ) {
    employer_tier = 'Government';
  } else if (ENTERPRISE_EMPLOYERS.has(employer)) {
    employer_tier = 'Enterprise';
  } else {
    employer_tier = 'SMB';
  }

  let employer_stability: string;
  if (employer_tier === 'Enterprise' || employer_tier === 'Government') {
    employer_stability = 'High';
  } else if (employer_tier === 'Non-Profit' || employer_tier === 'Mid-Market') {
    employer_stability = 'Medium';
  } else if (employer_tier === 'Self-Employed') {
    employer_stability = 'Medium';
  } else {
    employer_stability = 'Low';
  }

  return { industry, employer_tier, employer_stability };
}

// ── FICO band / credit profile ─────────────────────────────────────────────────
export function transformFico(fico: number): {
  fico_band: string;
  credit_profile: string;
} {
  let fico_band: string;
  if (fico < 580) fico_band = 'Poor (<580)';
  else if (fico < 620) fico_band = 'Fair (580-619)';
  else if (fico < 660) fico_band = 'Fair (620-659)';
  else if (fico < 700) fico_band = 'Good (660-699)';
  else if (fico < 740) fico_band = 'Good (700-739)';
  else if (fico < 760) fico_band = 'Very Good (740-759)';
  else if (fico < 800) fico_band = 'Very Good (760-799)';
  else fico_band = 'Exceptional (800+)';

  let credit_profile: string;
  if (fico < 580) credit_profile = 'Subprime';
  else if (fico < 670) credit_profile = 'Near-Prime';
  else if (fico < 740) credit_profile = 'Prime';
  else credit_profile = 'Super-Prime';

  return { fico_band, credit_profile };
}

// ── DTI bucket ────────────────────────────────────────────────────────────────
export function transformDti(dti: number): { dti_bucket: string } {
  const pct = dti * 100;
  let dti_bucket: string;
  if (pct < 20) dti_bucket = '<20%';
  else if (pct < 29) dti_bucket = '20-28%';
  else if (pct < 37) dti_bucket = '29-36%';
  else if (pct < 44) dti_bucket = '37-43%';
  else if (pct < 51) dti_bucket = '44-50%';
  else dti_bucket = '>50%';
  return { dti_bucket };
}

// ── LTV bucket ────────────────────────────────────────────────────────────────
export function transformLtv(ltv: number): { ltv_bucket: string } {
  const pct = ltv * 100;
  let ltv_bucket: string;
  if (pct < 70) ltv_bucket = '<70%';
  else if (pct < 80) ltv_bucket = '70-80%';
  else if (pct < 90) ltv_bucket = '80-90%';
  else if (pct < 95) ltv_bucket = '90-95%';
  else if (pct < 97) ltv_bucket = '95-97%';
  else ltv_bucket = '>97%';
  return { ltv_bucket };
}

// ── Loan amount bucket ────────────────────────────────────────────────────────
export function transformLoanAmount(amount: number): { loan_amount_bucket: string } {
  let loan_amount_bucket: string;
  if (amount < 150000) loan_amount_bucket = '<150k';
  else if (amount < 250000) loan_amount_bucket = '150-250k';
  else if (amount < 417000) loan_amount_bucket = '250-417k';
  else if (amount < 700000) loan_amount_bucket = '417-700k';
  else if (amount < 1000000) loan_amount_bucket = '700k-1M';
  else loan_amount_bucket = '>1M';
  return { loan_amount_bucket };
}

// ── Tenure band ───────────────────────────────────────────────────────────────
export function transformTenure(years: number): { tenure_band: string } {
  let tenure_band: string;
  if (years < 1) tenure_band = '<1yr';
  else if (years < 3) tenure_band = '1-3yr';
  else if (years < 7) tenure_band = '3-7yr';
  else if (years < 15) tenure_band = '7-15yr';
  else tenure_band = '15+ years';
  return { tenure_band };
}

// ── Region from state ─────────────────────────────────────────────────────────
const REGION_MAP: Record<string, string> = {
  CA: 'West', OR: 'West', WA: 'West', NV: 'West', AZ: 'West',
  CO: 'West', UT: 'West', ID: 'West', MT: 'West', WY: 'West',
  NM: 'West', AK: 'West', HI: 'West',
  TX: 'South', FL: 'South', GA: 'South', NC: 'South', SC: 'South',
  VA: 'South', AL: 'South', MS: 'South', LA: 'South', AR: 'South',
  TN: 'South', KY: 'South', WV: 'South', MD: 'South', DE: 'South', OK: 'South',
  IL: 'Midwest', OH: 'Midwest', MI: 'Midwest', IN: 'Midwest', WI: 'Midwest',
  MN: 'Midwest', IA: 'Midwest', MO: 'Midwest', ND: 'Midwest', SD: 'Midwest',
  NE: 'Midwest', KS: 'Midwest',
  NY: 'Northeast', PA: 'Northeast', NJ: 'Northeast', CT: 'Northeast',
  MA: 'Northeast', RI: 'Northeast', NH: 'Northeast', VT: 'Northeast', ME: 'Northeast',
};

export function getRegion(state: string): string {
  return REGION_MAP[state] || 'Other';
}

// ── Main de-identification function ──────────────────────────────────────────
export interface DeidentifiedRecord {
  // Tokens (pseudonymous, safe to store in vector DB)
  email_token: string;
  phone_token: string;
  // Demographics
  age_range: string;
  life_stage: string;
  generation: string;
  gender: string;
  marital_status: string;
  dependents: number;
  military: boolean;
  first_time_buyer: boolean;
  // Geography
  zip3: string;
  metro: string;
  urban_class: string;
  region: string;
  city: string;
  state: string;
  // Financial
  fico_band: string;
  credit_profile: string;
  income_range: string;
  income_tier: string;
  dti_bucket: string;
  ltv_bucket: string;
  loan_amount_bucket: string;
  bankruptcy: string;
  foreclosure: string;
  // Employment
  industry: string;
  employer_tier: string;
  employer_stability: string;
  employment_status: string;
  tenure_band: string;
  // Loan intent
  loan_purpose: string;
  loan_type: string;
  property_type: string;
  occupancy: string;
  loan_term: number;
  // Lead behavior
  channel: string;
  lead_type: string;
  lead_score: number;
  journey_stage: string;
  // Outcome
  outcome: string;
  days_to_close: number | null;
  tranche_id: string;
}

export function deidentifyRecord(record: Record<string, unknown>): DeidentifiedRecord {
  // Generate tokens BEFORE dropping
  const email_token = hashToken(String(record.email || ''));
  const phone_token = hashToken(String(record.phone || ''));

  // Age transformations
  const dobStr = String(record.dob || '2000-01-01');
  const { age_range, life_stage, generation } = transformDob(dobStr);

  // Geography
  const zip = String(record.zip || '00000');
  const state = String(record.state || '');
  const { zip3, metro, urban_class } = transformZip(zip);
  const region = getRegion(state);

  // Financial
  const income = parseFloat(String(record.income || '0'));
  const { income_range, income_tier } = transformIncome(income);

  const fico = parseInt(String(record.fico || '0'));
  const { fico_band, credit_profile } = transformFico(fico);

  const dti = parseFloat(String(record.dti || '0'));
  const { dti_bucket } = transformDti(dti);

  const ltv = parseFloat(String(record.ltv || '0'));
  const { ltv_bucket } = transformLtv(ltv);

  const loanAmount = parseFloat(String(record.loan_amount || '0'));
  const { loan_amount_bucket } = transformLoanAmount(loanAmount);

  // Employer
  const employer = String(record.employer || '');
  const { industry, employer_tier, employer_stability } = transformEmployer(employer);

  // Tenure
  const tenureYears = parseFloat(String(record.tenure_years || '0'));
  const { tenure_band } = transformTenure(tenureYears);

  // Booleans
  const military = record.military === true || record.military === 'true' || record.military === '1' || record.military === 'True';
  const first_time_buyer =
    record.first_time_buyer === true ||
    record.first_time_buyer === 'true' ||
    record.first_time_buyer === '1' ||
    record.first_time_buyer === 'True';

  // Outcome
  const outcomeRaw = String(record.outcome || '');
  const outcome = outcomeRaw === '' || outcomeRaw === 'null' || outcomeRaw === 'None' ? 'unknown' : outcomeRaw;

  const daysToCloseRaw = record.days_to_close;
  const days_to_close =
    daysToCloseRaw !== null && daysToCloseRaw !== undefined && daysToCloseRaw !== ''
      ? parseInt(String(daysToCloseRaw))
      : null;

  return {
    email_token,
    phone_token,
    age_range,
    life_stage,
    generation,
    gender: String(record.gender || 'Unknown'),
    marital_status: String(record.marital_status || 'Unknown'),
    dependents: parseInt(String(record.dependents || '0')),
    military,
    first_time_buyer,
    zip3,
    metro,
    urban_class,
    region,
    city: String(record.city || ''),
    state,
    fico_band,
    credit_profile,
    income_range,
    income_tier,
    dti_bucket,
    ltv_bucket,
    loan_amount_bucket,
    bankruptcy: String(record.bankruptcy || 'No'),
    foreclosure: String(record.foreclosure || 'No'),
    industry,
    employer_tier,
    employer_stability,
    employment_status: String(record.employment_status || ''),
    tenure_band,
    loan_purpose: String(record.loan_purpose || ''),
    loan_type: String(record.loan_type || ''),
    property_type: String(record.property_type || ''),
    occupancy: String(record.occupancy || ''),
    loan_term: parseInt(String(record.loan_term || '30')),
    channel: String(record.channel || ''),
    lead_type: String(record.lead_type || ''),
    lead_score: parseInt(String(record.lead_score || '0')),
    journey_stage: String(record.journey_stage || ''),
    outcome,
    days_to_close,
    tranche_id: String(record.tranche_id || ''),
  };
}

// ── Text templates for embedding ──────────────────────────────────────────────
export function generateProfileText(r: DeidentifiedRecord): string {
  const firstTimeBuyerStr = r.first_time_buyer ? 'First-time buyer.' : 'Repeat buyer.';
  const militaryStr = r.military ? 'Military/VA eligible.' : '';
  const bankruptcyStr = r.bankruptcy === 'Yes' ? 'Prior bankruptcy.' : '';
  const foreclosureStr = r.foreclosure === 'Yes' ? 'Prior foreclosure.' : '';

  return [
    `Mortgage lead: ${r.age_range} ${r.generation} (${r.life_stage}) in ${r.metro} (${r.urban_class}).`,
    `Credit profile: ${r.fico_band} (${r.credit_profile}). Income: ${r.income_range} (${r.income_tier}).`,
    `Employment: ${r.industry} (${r.employer_tier}), ${r.employment_status} for ${r.tenure_band}.`,
    `DTI: ${r.dti_bucket}, LTV: ${r.ltv_bucket}.`,
    `${firstTimeBuyerStr} ${militaryStr}`,
    `${r.marital_status}, ${r.dependents} dependents.`,
    `${bankruptcyStr} ${foreclosureStr}`,
    `Loan: ${r.loan_amount_bucket} ${r.loan_type} ${r.loan_purpose}.`,
  ]
    .join(' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function generateIntentText(r: DeidentifiedRecord): string {
  return [
    `Intent signal: ${r.journey_stage} stage. Lead type: ${r.lead_type}, score: ${r.lead_score}/100.`,
    `Property: ${r.property_type} (${r.occupancy}), ${r.loan_term} year term via ${r.channel}.`,
    `Location: ${r.city}, ${r.state} (${r.region} region).`,
    `Historical outcome: ${r.outcome}.`,
    r.days_to_close ? `Days to close: ${r.days_to_close}.` : '',
  ]
    .join(' ')
    .trim()
    .replace(/\s+/g, ' ');
}
