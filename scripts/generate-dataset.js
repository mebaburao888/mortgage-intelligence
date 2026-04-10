/**
 * Generate 150,000 synthetic mortgage lead records as CSV.
 * Pure Node.js — no external dependencies required.
 * Run: node scripts/generate-dataset.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Output path ───────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const OUTPUT_PATH = path.join(DATA_DIR, 'synthetic_150k.csv');
const TOTAL_RECORDS = 150_000;

// ── Seeded pseudo-random (simple LCG for reproducibility) ────────────────────
let seed = 42;
function rand() {
  seed = (seed * 1664525 + 1013904223) & 0xffffffff;
  return (seed >>> 0) / 0xffffffff;
}
function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function randChoice(arr) {
  return arr[Math.floor(rand() * arr.length)];
}
function randBool(pTrue = 0.5) {
  return rand() < pTrue;
}

// Box-Muller normal distribution
function randNormal(mean, std) {
  let u, v, s;
  do {
    u = rand() * 2 - 1;
    v = rand() * 2 - 1;
    s = u * u + v * v;
  } while (s >= 1 || s === 0);
  const mul = Math.sqrt(-2 * Math.log(s) / s);
  return mean + std * u * mul;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// Log-normal: X = e^(mu + sigma*Z)
function randLogNormal(mean, std) {
  const mu = Math.log(mean * mean / Math.sqrt(std * std + mean * mean));
  const sigma = Math.sqrt(Math.log(1 + std * std / (mean * mean)));
  return Math.exp(mu + sigma * randNormal(0, 1));
}

// ── Name data ─────────────────────────────────────────────────────────────────
const FIRST_NAMES_MALE = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
  'Thomas', 'Charles', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Donald',
  'Mark', 'Paul', 'Steven', 'Andrew', 'Kenneth', 'Joshua', 'Kevin', 'Brian',
  'George', 'Timothy', 'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan',
  'Jacob', 'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin',
  'Scott', 'Brandon', 'Benjamin', 'Samuel', 'Raymond', 'Gregory', 'Frank',
  'Alexander', 'Patrick', 'Jack', 'Dennis', 'Jerry',
];

const FIRST_NAMES_FEMALE = [
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth', 'Susan', 'Jessica',
  'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra', 'Ashley',
  'Dorothy', 'Kimberly', 'Emily', 'Donna', 'Michelle', 'Carol', 'Amanda', 'Melissa',
  'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia',
  'Kathleen', 'Amy', 'Angela', 'Shirley', 'Anna', 'Brenda', 'Pamela', 'Emma',
  'Nicole', 'Helen', 'Samantha', 'Katherine', 'Christine', 'Debra', 'Rachel',
  'Carolyn', 'Janet', 'Catherine', 'Maria', 'Heather',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen',
  'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera',
  'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Phillips', 'Evans', 'Turner',
  'Parker', 'Collins', 'Edwards', 'Stewart', 'Morris', 'Murphy', 'Cook',
];

// ── Employer data ─────────────────────────────────────────────────────────────
const EMPLOYERS = [
  // Technology
  { name: 'Google', industry: 'Technology', tier: 'Enterprise' },
  { name: 'Microsoft', industry: 'Technology', tier: 'Enterprise' },
  { name: 'Amazon', industry: 'Technology', tier: 'Enterprise' },
  { name: 'Apple', industry: 'Technology', tier: 'Enterprise' },
  { name: 'Meta', industry: 'Technology', tier: 'Enterprise' },
  { name: 'Salesforce', industry: 'Technology', tier: 'Enterprise' },
  { name: 'Oracle', industry: 'Technology', tier: 'Enterprise' },
  { name: 'IBM', industry: 'Technology', tier: 'Enterprise' },
  // Finance
  { name: 'JPMorgan Chase', industry: 'Finance', tier: 'Enterprise' },
  { name: 'Bank of America', industry: 'Finance', tier: 'Enterprise' },
  { name: 'Wells Fargo', industry: 'Finance', tier: 'Enterprise' },
  { name: 'Goldman Sachs', industry: 'Finance', tier: 'Enterprise' },
  { name: 'Morgan Stanley', industry: 'Finance', tier: 'Enterprise' },
  { name: 'Fidelity Investments', industry: 'Finance', tier: 'Enterprise' },
  // Healthcare
  { name: 'Kaiser Permanente', industry: 'Healthcare', tier: 'Enterprise' },
  { name: 'HCA Healthcare', industry: 'Healthcare', tier: 'Enterprise' },
  { name: 'CVS Health', industry: 'Healthcare', tier: 'Enterprise' },
  { name: 'UnitedHealth Group', industry: 'Healthcare', tier: 'Enterprise' },
  // Retail
  { name: 'Walmart', industry: 'Retail', tier: 'Enterprise' },
  { name: 'Target', industry: 'Retail', tier: 'Enterprise' },
  { name: 'Costco', industry: 'Retail', tier: 'Enterprise' },
  { name: "Lowe's", industry: 'Retail', tier: 'Enterprise' },
  { name: 'Home Depot', industry: 'Retail', tier: 'Enterprise' },
  // Defense
  { name: 'Boeing', industry: 'Defense', tier: 'Enterprise' },
  { name: 'Lockheed Martin', industry: 'Defense', tier: 'Enterprise' },
  { name: 'Raytheon Technologies', industry: 'Defense', tier: 'Enterprise' },
  // Energy
  { name: 'Chevron', industry: 'Energy', tier: 'Enterprise' },
  { name: 'ExxonMobil', industry: 'Energy', tier: 'Enterprise' },
  { name: 'ConocoPhillips', industry: 'Energy', tier: 'Enterprise' },
  // Education
  { name: 'State University System', industry: 'Education', tier: 'Government' },
  { name: 'Community College District', industry: 'Education', tier: 'Government' },
  // Government
  { name: 'US Federal Government', industry: 'Government', tier: 'Government' },
  { name: 'State of California', industry: 'Government', tier: 'Government' },
  { name: 'City of New York', industry: 'Government', tier: 'Government' },
  // SMB
  { name: 'Sunrise Plumbing LLC', industry: 'Construction', tier: 'SMB' },
  { name: 'Riverdale Properties Inc', industry: 'Real Estate', tier: 'SMB' },
  { name: 'Pacific Coast Roofing', industry: 'Construction', tier: 'SMB' },
  { name: 'Main Street Dental', industry: 'Healthcare', tier: 'SMB' },
  { name: 'Blue Ridge Consulting', industry: 'Professional Services', tier: 'SMB' },
  { name: 'Harbor Light Restaurant Group', industry: 'Hospitality', tier: 'SMB' },
  { name: 'Precision Auto Repair', industry: 'Automotive', tier: 'SMB' },
  { name: 'Summit Financial Advisors', industry: 'Finance', tier: 'SMB' },
  // Self-employed
  { name: 'Self-Employed', industry: 'Various', tier: 'Self-Employed' },
  { name: 'Independent Contractor', industry: 'Various', tier: 'Self-Employed' },
  { name: 'Freelance Consultant', industry: 'Professional Services', tier: 'Self-Employed' },
  // Non-profit
  { name: 'Red Cross', industry: 'Non-Profit', tier: 'Non-Profit' },
  { name: 'Habitat for Humanity', industry: 'Non-Profit', tier: 'Non-Profit' },
];

// ── Geographic distribution (US population-weighted) ─────────────────────────
const STATES = [
  { state: 'CA', weight: 12, zips: ['900', '902', '906', '913', '945', '949', '958', '963'] },
  { state: 'TX', weight: 9, zips: ['750', '752', '760', '770', '775', '780', '787', '797'] },
  { state: 'FL', weight: 7, zips: ['320', '322', '330', '337', '341', '346', '349', '342'] },
  { state: 'NY', weight: 6, zips: ['100', '103', '110', '114', '117', '120', '122', '125'] },
  { state: 'PA', weight: 4, zips: ['150', '152', '156', '170', '175', '180', '185', '190'] },
  { state: 'IL', weight: 4, zips: ['600', '601', '602', '603', '604', '605', '606', '620'] },
  { state: 'OH', weight: 4, zips: ['430', '432', '440', '442', '450', '452', '456', '460'] },
  { state: 'GA', weight: 3, zips: ['300', '302', '303', '304', '305', '306', '307', '308'] },
  { state: 'NC', weight: 3, zips: ['270', '271', '272', '273', '274', '275', '276', '277'] },
  { state: 'MI', weight: 3, zips: ['480', '481', '482', '483', '484', '485', '486', '487'] },
  { state: 'NJ', weight: 3, zips: ['070', '071', '072', '073', '074', '075', '076', '077'] },
  { state: 'VA', weight: 2, zips: ['200', '201', '220', '221', '222', '223', '226', '229'] },
  { state: 'WA', weight: 2, zips: ['980', '981', '982', '983', '984', '985', '986', '988'] },
  { state: 'AZ', weight: 2, zips: ['850', '851', '852', '853', '854', '855', '856', '857'] },
  { state: 'MA', weight: 2, zips: ['010', '011', '012', '013', '014', '015', '016', '017'] },
  { state: 'TN', weight: 2, zips: ['370', '371', '372', '373', '374', '375', '376', '377'] },
  { state: 'IN', weight: 2, zips: ['460', '461', '462', '463', '464', '465', '466', '467'] },
  { state: 'MO', weight: 2, zips: ['630', '631', '632', '633', '634', '635', '636', '637'] },
  { state: 'MD', weight: 2, zips: ['206', '207', '208', '209', '210', '211', '212', '214'] },
  { state: 'WI', weight: 2, zips: ['530', '531', '532', '533', '534', '535', '536', '537'] },
  { state: 'CO', weight: 2, zips: ['800', '801', '802', '803', '804', '805', '806', '807'] },
  { state: 'MN', weight: 2, zips: ['550', '551', '553', '554', '555', '556', '557', '558'] },
  { state: 'SC', weight: 1, zips: ['290', '291', '292', '293', '294', '295', '296', '297'] },
  { state: 'AL', weight: 1, zips: ['350', '351', '352', '353', '354', '355', '356', '357'] },
  { state: 'LA', weight: 1, zips: ['700', '701', '703', '704', '705', '706', '707', '708'] },
  { state: 'KY', weight: 1, zips: ['400', '401', '402', '403', '404', '405', '406', '407'] },
  { state: 'OR', weight: 1, zips: ['970', '971', '972', '973', '974', '975', '976', '977'] },
  { state: 'OK', weight: 1, zips: ['730', '731', '733', '734', '735', '736', '737', '738'] },
  { state: 'CT', weight: 1, zips: ['060', '061', '062', '063', '064', '065', '066', '067'] },
  { state: 'UT', weight: 1, zips: ['840', '841', '842', '843', '844', '845', '846', '847'] },
  { state: 'NV', weight: 1, zips: ['889', '890', '891', '893', '894', '895', '897', '898'] },
];

// Build weighted state selection
const STATE_POOL = [];
STATES.forEach(s => {
  for (let i = 0; i < s.weight; i++) STATE_POOL.push(s);
});

const CITIES_BY_STATE = {
  CA: ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'San Jose', 'Fresno', 'Long Beach', 'Oakland'],
  TX: ['Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 'El Paso', 'Arlington', 'Plano'],
  FL: ['Jacksonville', 'Miami', 'Tampa', 'Orlando', 'St. Petersburg', 'Hialeah', 'Tallahassee', 'Fort Lauderdale'],
  NY: ['New York', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse', 'Albany', 'New Rochelle', 'Mount Vernon'],
  PA: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading', 'Scranton', 'Bethlehem', 'Lancaster'],
  IL: ['Chicago', 'Aurora', 'Joliet', 'Naperville', 'Rockford', 'Springfield', 'Peoria', 'Elgin'],
  OH: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Parma', 'Canton'],
  GA: ['Atlanta', 'Columbus', 'Augusta', 'Savannah', 'Athens', 'Sandy Springs', 'Macon', 'Roswell'],
  NC: ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem', 'Fayetteville', 'Cary', 'Wilmington'],
  MI: ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Lansing', 'Ann Arbor', 'Flint', 'Dearborn'],
  NJ: ['Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Edison', 'Woodbridge', 'Lakewood', 'Toms River'],
  VA: ['Virginia Beach', 'Norfolk', 'Chesapeake', 'Richmond', 'Newport News', 'Alexandria', 'Hampton', 'Roanoke'],
  WA: ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue', 'Kent', 'Everett', 'Renton'],
  AZ: ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale', 'Glendale', 'Gilbert', 'Tempe'],
  MA: ['Boston', 'Worcester', 'Springfield', 'Lowell', 'Cambridge', 'New Bedford', 'Brockton', 'Quincy'],
  TN: ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville', 'Murfreesboro', 'Franklin', 'Jackson'],
  IN: ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Carmel', 'Fishers', 'Bloomington', 'Hammond'],
  MO: ['Kansas City', 'St. Louis', 'Springfield', 'Columbia', "Lee's Summit", "O'Fallon", 'St. Joseph', 'St. Charles'],
  MD: ['Baltimore', 'Frederick', 'Rockville', 'Gaithersburg', 'Bowie', 'Hagerstown', 'Annapolis', 'College Park'],
  WI: ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine', 'Appleton', 'Waukesha', 'Oshkosh'],
  CO: ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood', 'Thornton', 'Arvada', 'Westminster'],
  MN: ['Minneapolis', 'Saint Paul', 'Rochester', 'Duluth', 'Bloomington', 'Brooklyn Park', 'Plymouth', 'St. Cloud'],
  SC: ['Columbia', 'Charleston', 'North Charleston', 'Mount Pleasant', 'Rock Hill', 'Greenville', 'Summerville', 'Sumter'],
  AL: ['Birmingham', 'Montgomery', 'Huntsville', 'Mobile', 'Tuscaloosa', 'Hoover', 'Dothan', 'Auburn'],
  LA: ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette', 'Lake Charles', 'Kenner', 'Bossier City', 'Monroe'],
  KY: ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington', 'Hopkinsville', 'Richmond', 'Florence'],
  OR: ['Portland', 'Salem', 'Eugene', 'Gresham', 'Hillsboro', 'Beaverton', 'Bend', 'Medford'],
  OK: ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Edmond', 'Lawton', 'Moore', 'Midwest City'],
  CT: ['Bridgeport', 'New Haven', 'Stamford', 'Hartford', 'Waterbury', 'Norwalk', 'Danbury', 'New Britain'],
  UT: ['Salt Lake City', 'West Valley City', 'Provo', 'West Jordan', 'Orem', 'Sandy', 'Ogden', 'St. George'],
  NV: ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks', 'Carson City', 'Fernley', 'Elko'],
};

// ── Street data ───────────────────────────────────────────────────────────────
const STREET_TYPES = ['St', 'Ave', 'Blvd', 'Dr', 'Ln', 'Rd', 'Way', 'Ct', 'Pl', 'Cir', 'Pkwy', 'Ter'];
const STREET_NAMES = [
  'Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Washington', 'Lake', 'Hill', 'Sunset',
  'Forest', 'Park', 'River', 'Main', 'Church', 'Meadow', 'Valley', 'Ridge', 'Spring',
  'Willow', 'Birch', 'Spruce', 'Cherry', 'Walnut', 'Ash', 'Hickory', 'Poplar',
  'Sycamore', 'Chestnut', 'Magnolia', 'Cypress', 'Juniper', 'Sequoia',
];

// ── Email domains ─────────────────────────────────────────────────────────────
const EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
  'aol.com', 'comcast.net', 'verizon.net', 'att.net', 'live.com',
  'msn.com', 'me.com', 'mac.com', 'protonmail.com', 'sbcglobal.net',
];

// ── Loan data ─────────────────────────────────────────────────────────────────
const LOAN_PURPOSES = [
  { value: 'Purchase', weight: 45 },
  { value: 'Refinance', weight: 25 },
  { value: 'Cash-Out', weight: 20 },
  { value: 'HELOC', weight: 10 },
];

const LOAN_TYPES = [
  { value: 'Conventional', weight: 50 },
  { value: 'FHA', weight: 25 },
  { value: 'VA', weight: 12 },
  { value: 'Jumbo', weight: 8 },
  { value: 'USDA', weight: 5 },
];

const PROPERTY_TYPES = [
  { value: 'Single Family', weight: 55 },
  { value: 'Condo', weight: 20 },
  { value: 'Townhouse', weight: 12 },
  { value: 'Multi-Family', weight: 8 },
  { value: 'Manufactured', weight: 5 },
];

const OCCUPANCIES = [
  { value: 'Primary', weight: 65 },
  { value: 'Secondary', weight: 20 },
  { value: 'Investment', weight: 15 },
];

const CHANNELS = [
  { value: 'Search', weight: 30 },
  { value: 'Social', weight: 25 },
  { value: 'Referral', weight: 20 },
  { value: 'Direct Mail', weight: 15 },
  { value: 'TV', weight: 10 },
];

const LEAD_TYPES = [
  { value: 'Internet Lead', weight: 40 },
  { value: 'Warm Transfer', weight: 30 },
  { value: 'Call-In', weight: 20 },
  { value: 'Direct', weight: 10 },
];

const JOURNEY_STAGES = [
  { value: 'Awareness', weight: 30 },
  { value: 'Consideration', weight: 35 },
  { value: 'Application', weight: 25 },
  { value: 'Decision', weight: 10 },
];

const LOAN_TERMS = [
  { value: 30, weight: 55 },
  { value: 15, weight: 30 },
  { value: 20, weight: 10 },
  { value: 10, weight: 5 },
];

const EMPLOYMENT_STATUSES = [
  { value: 'Employed', weight: 65 },
  { value: 'Self-Employed', weight: 15 },
  { value: 'Retired', weight: 12 },
  { value: 'Unemployed', weight: 8 },
];

const OUTCOMES = [
  { value: 'funded', weight: 35 },
  { value: 'lost', weight: 30 },
  { value: 'in-progress', weight: 20 },
  { value: 'dead', weight: 15 },
];

const GENDERS = [
  { value: 'Male', weight: 50 },
  { value: 'Female', weight: 48 },
  { value: 'Non-binary', weight: 2 },
];

const MARITAL_STATUSES = [
  { value: 'Married', weight: 50 },
  { value: 'Single', weight: 35 },
  { value: 'Divorced', weight: 12 },
  { value: 'Widowed', weight: 3 },
];

// ── Weighted random ───────────────────────────────────────────────────────────
function weightedChoice(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rand() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

// ── Generator helpers ─────────────────────────────────────────────────────────
function generateSSN() {
  const area = randInt(100, 899);
  const group = String(randInt(10, 99)).padStart(2, '0');
  const serial = String(randInt(1000, 9999));
  return `${area}-${group}-${serial}`;
}

function generateDOB() {
  // Age 25-75, skewed 30-50
  const age = clamp(Math.round(randNormal(40, 10)), 25, 75);
  const year = 2026 - age;
  const month = String(randInt(1, 12)).padStart(2, '0');
  const day = String(randInt(1, 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generatePhone() {
  const area = randInt(200, 999);
  const exchange = randInt(200, 999);
  const subscriber = randInt(1000, 9999);
  return `${area}-${exchange}-${subscriber}`;
}

function generateEmail(firstName, lastName) {
  const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  const suffix = randBool(0.4) ? String(randInt(1, 99)) : '';
  const domain = randChoice(EMAIL_DOMAINS);
  return `${base}${suffix}@${domain}`;
}

function generateStreet() {
  const num = randInt(100, 9999);
  const name = randChoice(STREET_NAMES);
  const type = randChoice(STREET_TYPES);
  return `${num} ${name} ${type}`;
}

function generateFICO() {
  return clamp(Math.round(randNormal(680, 80)), 300, 850);
}

function generateIncome() {
  return clamp(Math.round(randLogNormal(65000, 40000) / 1000) * 1000, 25000, 500000);
}

function generateDTI() {
  // Beta-like distribution, mostly 20-45%
  const base = clamp(randNormal(0.33, 0.08), 0.15, 0.60);
  return Math.round(base * 10000) / 10000;
}

function generateLTV(loanPurpose) {
  let mean = 0.88;
  let std = 0.06;
  if (loanPurpose === 'Refinance') { mean = 0.72; std = 0.10; }
  else if (loanPurpose === 'Cash-Out') { mean = 0.80; std = 0.08; }
  else if (loanPurpose === 'HELOC') { mean = 0.75; std = 0.10; }
  return clamp(Math.round(randNormal(mean, std) * 10000) / 10000, 0.50, 0.97);
}

function generateLoanAmount(income, ltv) {
  // Property value roughly 3-5x income, loan = ltv * property value
  const propertyValue = income * clamp(randNormal(3.5, 0.8), 2, 7);
  const loanAmount = Math.round(propertyValue * ltv / 1000) * 1000;
  return clamp(loanAmount, 50000, 3000000);
}

function generateLeadScore(fico, income, journeyStage) {
  let base = (fico - 300) / 5.5; // 0-100 range
  if (income > 100000) base += 10;
  if (income > 200000) base += 10;
  if (journeyStage === 'Decision') base += 15;
  if (journeyStage === 'Application') base += 10;
  return clamp(Math.round(base + randNormal(0, 10)), 1, 100);
}

function generateDaysToClose(outcome) {
  if (outcome === 'funded') {
    return clamp(Math.round(randNormal(42, 15)), 15, 90);
  }
  return '';
}

// ── CSV helpers ───────────────────────────────────────────────────────────────
function escapeCSV(value) {
  const str = String(value === null || value === undefined ? '' : value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const FIELDNAMES = [
  'first_name', 'last_name', 'ssn', 'dob', 'email', 'phone',
  'street', 'city', 'state', 'zip', 'employer', 'income',
  'fico', 'dti', 'ltv', 'loan_amount', 'loan_purpose', 'loan_type',
  'property_type', 'occupancy', 'loan_term', 'channel', 'lead_type',
  'lead_score', 'journey_stage', 'first_time_buyer', 'military',
  'gender', 'marital_status', 'dependents', 'bankruptcy', 'foreclosure',
  'employment_status', 'tenure_years', 'outcome', 'days_to_close', 'tranche_id',
];

// ── Main generation ───────────────────────────────────────────────────────────
function generateRecord(index) {
  const gender = weightedChoice(GENDERS);
  const firstName = gender === 'Male'
    ? randChoice(FIRST_NAMES_MALE)
    : randChoice(FIRST_NAMES_FEMALE);
  const lastName = randChoice(LAST_NAMES);

  const stateData = randChoice(STATE_POOL);
  const { state } = stateData;
  const cityList = CITIES_BY_STATE[state] || ['Springfield'];
  const city = randChoice(cityList);
  const zip3 = randChoice(stateData.zips);
  const zip = zip3 + String(randInt(10, 99)).padStart(2, '0');

  const employer = randChoice(EMPLOYERS);
  const employmentStatus = weightedChoice(EMPLOYMENT_STATUSES);
  const tenureYears = Math.round(clamp(randNormal(5, 4), 0, 35) * 10) / 10;

  const fico = generateFICO();
  const income = generateIncome();
  const loanPurpose = weightedChoice(LOAN_PURPOSES);
  const ltv = generateLTV(loanPurpose);
  const loanAmount = generateLoanAmount(income, ltv);
  const dti = generateDTI();
  const journeyStage = weightedChoice(JOURNEY_STAGES);
  const leadScore = generateLeadScore(fico, income, journeyStage);
  const outcome = weightedChoice(OUTCOMES);
  const daysToClose = generateDaysToClose(outcome);

  // Bankruptcy/foreclosure: rare (5% / 2%)
  const bankruptcy = randBool(0.05) ? 'Yes' : 'No';
  const foreclosure = randBool(0.02) ? 'Yes' : 'No';

  // Military: ~8% of population
  const military = randBool(0.08);

  // First-time buyer: more likely for younger/purchase
  const firstTimeBuyer = loanPurpose === 'Purchase' ? randBool(0.38) : randBool(0.05);

  // Dependents: 0-4
  const maritalStatus = weightedChoice(MARITAL_STATUSES);
  const dependentsMax = maritalStatus === 'Married' ? 4 : 2;
  const dependents = randInt(0, dependentsMax);

  // Tranche: distribute across 10 tranches
  const trancheNum = String(Math.floor((index / TOTAL_RECORDS) * 10) + 1).padStart(3, '0');
  const trancheId = `TRANCHE-${trancheNum}`;

  return {
    first_name: firstName,
    last_name: lastName,
    ssn: generateSSN(),
    dob: generateDOB(),
    email: generateEmail(firstName, lastName),
    phone: generatePhone(),
    street: generateStreet(),
    city,
    state,
    zip,
    employer: employer.name,
    income,
    fico,
    dti,
    ltv,
    loan_amount: loanAmount,
    loan_purpose: loanPurpose,
    loan_type: weightedChoice(LOAN_TYPES),
    property_type: weightedChoice(PROPERTY_TYPES),
    occupancy: weightedChoice(OCCUPANCIES),
    loan_term: weightedChoice(LOAN_TERMS),
    channel: weightedChoice(CHANNELS),
    lead_type: weightedChoice(LEAD_TYPES),
    lead_score: leadScore,
    journey_stage: journeyStage,
    first_time_buyer: firstTimeBuyer,
    military,
    gender,
    marital_status: maritalStatus,
    dependents,
    bankruptcy,
    foreclosure,
    employment_status: employmentStatus,
    tenure_years: tenureYears,
    outcome,
    days_to_close: daysToClose,
    tranche_id: trancheId,
  };
}

// ── Entry point ───────────────────────────────────────────────────────────────
function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log(`Generating ${TOTAL_RECORDS.toLocaleString()} records -> ${OUTPUT_PATH}`);
  const startTime = Date.now();

  const writeStream = fs.createWriteStream(OUTPUT_PATH, { encoding: 'utf8' });

  // Write header
  writeStream.write(FIELDNAMES.join(',') + '\n');

  const CHUNK_SIZE = 1000;
  let written = 0;

  function writeChunk() {
    const end = Math.min(written + CHUNK_SIZE, TOTAL_RECORDS);
    let chunk = '';
    for (let i = written; i < end; i++) {
      const record = generateRecord(i);
      chunk += FIELDNAMES.map(f => escapeCSV(record[f])).join(',') + '\n';
    }
    written = end;

    if (written % 10000 === 0 || written === TOTAL_RECORDS) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const pct = ((written / TOTAL_RECORDS) * 100).toFixed(1);
      console.log(`  ${written.toLocaleString()} / ${TOTAL_RECORDS.toLocaleString()} records (${pct}%) — ${elapsed}s`);
    }

    const canContinue = writeStream.write(chunk);

    if (written < TOTAL_RECORDS) {
      if (canContinue) {
        setImmediate(writeChunk);
      } else {
        writeStream.once('drain', writeChunk);
      }
    } else {
      writeStream.end(() => {
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        const fileSizeMB = (fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(1);
        console.log(`\nDone! ${TOTAL_RECORDS.toLocaleString()} records written in ${totalTime}s`);
        console.log(`File: ${OUTPUT_PATH} (${fileSizeMB} MB)`);
      });
    }
  }

  writeChunk();
}

main();
