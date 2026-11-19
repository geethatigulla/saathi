// Saathi rules engine. Shared by the browser (public/app.js) and the API functions.
// Everything here is deterministic: eligibility, scoring and affordability never come from the AI.

export const RATE = 0.11; // indicative annual interest rate used for EMI estimates

/* ---------- months ---------- */
const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTH_KN = ['ಜನವರಿ', 'ಫೆಬ್ರವರಿ', 'ಮಾರ್ಚ್', 'ಏಪ್ರಿಲ್', 'ಮೇ', 'ಜೂನ್', 'ಜುಲೈ', 'ಆಗಸ್ಟ್', 'ಸೆಪ್ಟೆಂಬರ್', 'ಅಕ್ಟೋಬರ್', 'ನವೆಂಬರ್', 'ಡಿಸೆಂಬರ್'];

/** The 12 calendar months ending with last month. */
export function last12Months(ref = new Date()) {
  const out = [];
  for (let k = 12; k >= 1; k--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - k, 1);
    const m = d.getMonth();
    out.push({ key: `${d.getFullYear()}-${String(m + 1).padStart(2, '0')}`, m, s: MN[m], full: MF[m], y: String(d.getFullYear()) });
  }
  return out;
}

/* ---------- money helpers ---------- */
export const fmt = n => '₹' + Math.round(n || 0).toLocaleString('en-IN');
export const fmtK = v => (v >= 100000 ? (v / 100000).toFixed(v % 100000 === 0 ? 0 : 1) + 'L' : Math.round(v / 1000) + 'k');
export const pctS = x => Math.round(x * 100) + '%';
const mean = a => a.reduce((s, v) => s + v, 0) / (a.length || 1);

export function emiOf(P, rate, n) { const r = rate / 12, f = Math.pow(1 + r, n); return P * r * f / (f - 1); }
export function maxPrincipal(cap, rate, n) { if (cap <= 0) return 0; const r = rate / 12, f = Math.pow(1 + r, n); return cap * (f - 1) / (r * f); }
export function firstYearInterest(P, rate, n) {
  const r = rate / 12, e = emiOf(P, rate, n); let bal = P, t = 0;
  for (let i = 0; i < 12 && i < n; i++) { const it = bal * r; t += it; bal -= e - it; }
  return t;
}

/* ---------- official sources (paraphrased for the demo) ---------- */
export const DOCSRC = {
  mudra: { title: 'Pradhan Mantri MUDRA Yojana (PMMY)', url: 'https://www.mudra.org.in/' },
  pmegp: { title: 'PMEGP Scheme Guidelines (KVIC)', url: 'https://www.kviconline.gov.in/pmegpeportal/' },
  standup: { title: 'Stand-Up India Scheme', url: 'https://www.standupmitra.in/' },
  cgtmse: { title: 'CGTMSE Credit Guarantee Scheme', url: 'https://www.cgtmse.in/' }
};
export const SRC = {
  M1: { doc: 'mudra', sec: 'Who can borrow', text: 'Loans under PMMY are given to non-corporate, non-farm small and micro enterprises for <mark>income-generating activities in manufacturing, trading and services</mark>, including <mark>activities allied to agriculture</mark> such as dairy, poultry and fisheries.' },
  M2: { doc: 'mudra', sec: 'Loan categories', text: 'Loans come in four categories: <mark>Shishu up to ₹50,000; Kishore above ₹50,000 up to ₹5 lakh; Tarun above ₹5 lakh up to ₹10 lakh</mark>; and Tarun Plus above ₹10 lakh up to ₹20 lakh, only for borrowers who have taken and <mark>successfully repaid a Tarun loan</mark>.' },
  M3: { doc: 'mudra', sec: 'Borrower conditions', text: 'The borrower <mark>should not be a defaulter</mark> to any bank or financial institution and should have a satisfactory credit record.' },
  M4: { doc: 'mudra', sec: 'Security', text: '<mark>No collateral is required</mark> for loans under PMMY. These loans are covered by the Credit Guarantee Fund for Micro Units (CGFMU).' },
  P1: { doc: 'pmegp', sec: 'Eligibility', text: 'Assistance is available <mark>only for new projects</mark>. Existing units, and units that have already received a government subsidy under any scheme, <mark>are not eligible</mark>.' },
  P2: { doc: 'pmegp', sec: 'Eligibility', text: 'Any individual <mark>above 18 years of age</mark> is eligible.' },
  P3: { doc: 'pmegp', sec: 'Project cost', text: 'The maximum project cost is <mark>₹50 lakh for manufacturing</mark> and <mark>₹20 lakh for business or service</mark> units.' },
  P4: { doc: 'pmegp', sec: 'Education', text: 'Applicants must have <mark>passed at least Class VIII</mark> for projects costing <mark>above ₹10 lakh in manufacturing</mark> or above ₹5 lakh in business or service.' },
  P5: { doc: 'pmegp', sec: 'Subsidy and own contribution', text: 'General category: own contribution 10%; subsidy <mark>15% urban, 25% rural</mark>. Special categories (including SC, ST, OBC, minorities, <mark>women</mark>, ex-servicemen and persons with disabilities): own contribution <mark>5%</mark>; subsidy <mark>25% urban, 35% rural</mark>. The bank finances the balance.' },
  P6: { doc: 'pmegp', sec: 'Training', text: 'Completing an <mark>Entrepreneurship Development Programme (EDP)</mark> is <mark>mandatory before the subsidy is released</mark>.' },
  P7: { doc: 'pmegp', sec: 'Subsidy lock-in', text: 'The subsidy is kept as a <mark>term deposit for three years</mark> in the beneficiary\'s name and adjusted against the loan after that, if the unit is running.' },
  P8: { doc: 'pmegp', sec: 'Permitted activities', text: 'Projects must be in activities that are <mark>not on the scheme\'s negative list</mark>; the implementing agency confirms whether an activity is permitted.' },
  S1: { doc: 'standup', sec: 'Who can borrow', text: '<mark>SC/ST and/or women entrepreneurs above 18 years</mark> of age. For non-individual enterprises, at least 51% of the shareholding must be held by an SC/ST or woman entrepreneur.' },
  S2: { doc: 'standup', sec: 'Greenfield only', text: 'Loans are only for <mark>greenfield projects</mark>, meaning the beneficiary\'s <mark>first venture</mark> in manufacturing, services, trading or activities allied to agriculture.' },
  S3: { doc: 'standup', sec: 'Loan size', text: 'Composite loans <mark>between ₹10 lakh and ₹1 crore</mark>, covering term loan and working capital.' },
  S4: { doc: 'standup', sec: 'Borrower conditions', text: 'The borrower <mark>should not be in default</mark> to any bank or financial institution.' },
  C1: { doc: 'cgtmse', sec: 'Eligible borrowers', text: 'Guarantee cover is available for <mark>collateral-free credit</mark> given by eligible lenders to <mark>new and existing micro and small enterprises</mark> in <mark>manufacturing or service</mark> activity, including retail trade.' },
  C2: { doc: 'cgtmse', sec: 'How cover is obtained', text: 'The guarantee is <mark>applied for by the lending institution</mark>. The borrower does not apply separately.' }
};

/* ---------- profile ---------- */
export const PROFILE_FIELDS = ['name', 'activity', 'sector', 'isNewVenture', 'yearsInBusiness', 'monthlyIncome', 'paymentMode', 'bankAccountMonths',
  'loanPurpose', 'loanAmount', 'projectCost', 'expectedExtraIncome', 'existingLoans', 'gender', 'socialCategory', 'age', 'educationClass',
  'area', 'place', 'pastAttempt', 'schemesHeard'];

export function emptyProfile() {
  const p = {}; PROFILE_FIELDS.forEach(k => { p[k] = null; }); return p;
}
/** Merge AI-extracted fields into a profile; null/undefined never overwrite known values. */
export function mergeProfile(base, upd) {
  const out = { ...base };
  if (!upd) return out;
  for (const k of PROFILE_FIELDS) {
    const v = upd[k];
    if (v === null || v === undefined || v === '') continue;
    if (k === 'existingLoans' && !Array.isArray(v)) continue;
    out[k] = v;
  }
  return out;
}

/** The amount the owner wants from the bank. For a new unit this follows the scheme's own-contribution rule. */
export function schemeCalc(p) {
  const special = p.gender === 'F' || ['SC', 'ST', 'OBC', 'Minority'].includes(p.socialCategory);
  if (!p.isNewVenture) {
    const loan = p.loanAmount || p.projectCost || 0;
    return { projectCost: loan, bankLoan: loan, own: 0, subsidy: 0, ownRate: 0, subRate: 0, special };
  }
  const project = p.projectCost || p.loanAmount || 0;
  const ownRate = special ? 0.05 : 0.10;
  const subRate = special ? (p.area === 'urban' ? 0.25 : 0.35) : (p.area === 'urban' ? 0.15 : 0.25);
  return { projectCost: project, bankLoan: project * (1 - ownRate), own: project * ownRate, subsidy: project * subRate, ownRate, subRate, special };
}

const isService = p => p.sector === 'service' || p.sector === 'trading';

/** Rule-by-rule eligibility. Each check cites a source id from SRC. ok: true / false / null (needs confirmation). */
export function evalSchemes(p, loan) {
  const sch = schemeCalc(p);
  const projectCost = p.isNewVenture ? loan / (1 - sch.ownRate) : loan;
  const out = [];
  const activity = p.activity || 'Business activity';

  // MUDRA
  {
    const c = []; let cat = null;
    if (loan <= 50000) cat = 'Shishu'; else if (loan <= 500000) cat = 'Kishore'; else if (loan <= 1000000) cat = 'Tarun';
    c.push({ t: p.sector === 'agri_allied' ? `${activity}: an activity allied to agriculture, which PMMY covers` : `Income-generating activity: ${activity}`, ok: true, src: 'M1' });
    c.push({ t: cat ? `Loan ${fmt(loan)} fits the ${cat} category` : loan > 2000000 ? `Loan ${fmt(loan)} is above the ₹20 lakh MUDRA limit` : `Loan ${fmt(loan)} needs Tarun Plus, which requires a repaid Tarun loan`, ok: !!cat, src: 'M2', simple: 'Above the MUDRA limit for first-time borrowers' });
    c.push({ t: 'Not a defaulter (declared by owner; bank verifies with the credit bureau)', ok: true, src: 'M3' });
    c.push({ t: 'No collateral required', ok: true, info: true, src: 'M4' });
    out.push({ id: 'mudra', name: 'MUDRA' + (cat ? ' ' + cat : ''), status: cat ? 'eligible' : 'not', checks: c, cat,
      simpleOk: `Up to ${cat === 'Shishu' ? '₹50,000' : cat === 'Kishore' ? '₹5 lakh' : '₹10 lakh'} · no property needed` });
  }
  // PMEGP
  {
    const c = [];
    c.push({ t: p.age ? `Age ${p.age}, above 18` : 'Adult applicant (declared)', ok: p.age ? p.age > 18 : true, src: 'P2', simple: 'Only for applicants above 18' });
    c.push({ t: p.isNewVenture ? 'New project (first unit)' : `Existing business${p.yearsInBusiness ? `, running ${p.yearsInBusiness} years` : ''}`, ok: !!p.isNewVenture, src: 'P1', simple: 'Only for new businesses' });
    const cap = isService(p) ? 2000000 : 5000000;
    c.push({ t: `Project cost ${fmt(projectCost)} within the ${fmt(cap)} limit`, ok: projectCost <= cap, src: 'P3', simple: 'Project is above the PMEGP limit' });
    const need = (!isService(p) && projectCost > 1000000) || (isService(p) && projectCost > 500000);
    const edu = p.educationClass;
    c.push({ t: need ? (edu != null ? `Class ${edu} passed; Class VIII needed for this project size` : 'Class VIII pass needed for this project size; not yet confirmed') : 'Education rule not triggered for this project size',
      ok: !need ? true : edu == null ? null : edu >= 8, src: 'P4', simple: 'Needs Class VIII pass for this project size' });
    if (p.sector === 'agri_allied' || p.sector === 'trading') c.push({ t: `${p.sector === 'trading' ? 'Trading' : 'Agri-allied'} activity: implementing agency to confirm it is permitted`, ok: null, src: 'P8' });
    const hardFail = c.some(x => x.ok === false);
    const unsure = c.some(x => x.ok === null);
    if (!hardFail) {
      c.push({ t: `Subsidy ${pctS(sch.subRate)} (${p.area || 'rural'}, ${sch.special ? 'special category' : 'general category'}): ${fmt(projectCost * sch.subRate)}; own contribution ${pctS(sch.ownRate)}`, ok: true, info: true, src: 'P5' });
      c.push({ t: 'EDP training must be completed before the subsidy is released', ok: true, info: true, src: 'P6' });
      c.push({ t: 'Subsidy is held as a 3-year term deposit', ok: true, info: true, src: 'P7' });
    }
    out.push({ id: 'pmegp', name: 'PMEGP', status: hardFail ? 'not' : unsure ? 'check' : 'eligible', checks: hardFail ? c.filter(x => x.ok === false) : c,
      simpleOk: `Subsidy ${fmt(projectCost * sch.subRate)} · you put in ${fmt(projectCost * sch.ownRate)}`, simpleCheck: 'Possible, one detail to confirm' });
  }
  // Stand-Up India
  {
    const c = [];
    const eligPerson = p.gender === 'F' || ['SC', 'ST'].includes(p.socialCategory);
    const knownPerson = p.gender != null || p.socialCategory != null;
    c.push({ t: p.gender === 'F' ? 'Woman entrepreneur' : ['SC', 'ST'].includes(p.socialCategory) ? `${p.socialCategory} entrepreneur` : knownPerson ? 'Not a woman or SC/ST entrepreneur' : 'Founder category not given',
      ok: eligPerson ? true : knownPerson ? false : null, src: 'S1', simple: 'Only for women and SC/ST founders' });
    c.push({ t: p.isNewVenture ? 'Greenfield (first venture)' : 'Existing business, not greenfield', ok: !!p.isNewVenture, src: 'S2', simple: 'Only for first-time businesses' });
    const inRange = loan >= 1000000 && loan <= 10000000;
    c.push({ t: `Loan ${fmt(loan)} ${inRange ? 'is within' : 'is outside'} ₹10 lakh to ₹1 crore`, ok: inRange, src: 'S3', simple: 'Only for loans of ₹10 lakh to ₹1 crore' });
    c.push({ t: 'Not in default (declared; bank verifies)', ok: true, src: 'S4' });
    const hardFail = c.some(x => x.ok === false);
    out.push({ id: 'standup', name: 'Stand-Up India', status: hardFail ? 'not' : c.some(x => x.ok === null) ? 'check' : 'eligible', checks: hardFail ? c.filter(x => x.ok === false) : c,
      simpleOk: 'Loan ₹10 lakh to ₹1 crore for women and SC/ST founders', simpleCheck: 'Possible, one detail to confirm' });
  }
  // CGTMSE
  {
    const c = [];
    if (p.sector === 'agri_allied') c.push({ t: 'Activity is agri-allied. Bank to confirm whether CGTMSE or another guarantee fund applies', ok: null, src: 'C1' });
    else c.push({ t: `${p.isNewVenture ? 'New' : 'Existing'} micro enterprise in ${p.sector === 'manufacturing' ? 'manufacturing' : 'services or trade'}`, ok: true, src: 'C1' });
    c.push({ t: 'The bank applies for the guarantee; the owner does not apply separately', ok: true, info: true, src: 'C2' });
    out.push({ id: 'cgtmse', name: 'CGTMSE guarantee', status: p.sector === 'agri_allied' ? 'check' : 'eligible', checks: c,
      simpleOk: 'Bank arranges a guarantee, so no property is needed', simpleCheck: 'The bank will confirm this' });
  }
  return out;
}

/* ---------- bank data ---------- */
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// Seasonal pattern by calendar month (Jan..Dec), picked from the activity description.
function seasonality(activity = '') {
  const a = activity.toLowerCase();
  if (/tailor|stitch|garment|boutique|blouse|uniform/.test(a)) return [1.05, 1.1, .7, .8, 1.0, 1.4, .65, .6, .9, 1.5, 1.3, .9];
  if (/dairy|milk|cow|buffalo|cattle/.test(a)) return [1.05, 1.03, .92, .9, .93, 1.0, 1.0, .98, 1.02, 1.05, 1.03, 1.05];
  if (/weld|fabricat|grill|gate|steel|iron/.test(a)) return [1.15, 1.15, 1.1, 1.1, 1.0, .8, .75, .75, .9, 1.05, 1.1, 1.05];
  if (/food|snack|pickle|papad|millet|bakery|sweet|chakkuli|masala/.test(a)) return [1.0, .95, .9, .9, .9, .95, 1.0, 1.1, 1.1, 1.3, 1.3, 1.0];
  if (/kirana|shop|store|retail/.test(a)) return [1.0, .95, .95, .95, 1.0, 1.0, .95, 1.0, 1.05, 1.15, 1.1, 1.0];
  return [1.0, 1.0, .95, .95, 1.0, 1.0, .95, .95, 1.0, 1.1, 1.1, 1.0];
}
export const SHARE_BY_MODE = { mostly_upi: 0.85, mixed: 0.6, mostly_cash: 0.35 };

/** Account Aggregator sandbox: a realistic 12-month statement built from what the owner said. Clearly labelled as sandbox data in the UI. */
export function sandboxStatement(p, ref = new Date()) {
  const months = last12Months(ref);
  const income = p.monthlyIncome || 20000;
  const share = SHARE_BY_MODE[p.paymentMode] || 0.8;
  const season = seasonality(p.activity || '');
  const sm = mean(months.map(m => season[m.m]));
  const r = rng(hashStr((p.activity || '') + income));
  const hist = p.bankAccountMonths != null ? p.bankAccountMonths : p.isNewVenture ? 24 : Math.min(36, Math.max(6, (p.yearsInBusiness || 2) * 12));
  const loans = p.existingLoans || [];
  const loanOut = loans.reduce((s, l) => s + (l.emi || (l.amount && l.monthlyRatePct ? l.amount * l.monthlyRatePct / 100 : 0)), 0);
  const rows = months.map((m, i) => {
    if (12 - i > hist) return { ...m, in: null, out: null };
    const f = season[m.m] / sm * (1 + (r() - 0.5) * 0.08);
    const vin = Math.round(income * share * f / 100) * 100;
    const out = Math.round((vin * 0.62 + income * share * 0.12 + loanOut * share) / 100) * 100;
    return { ...m, in: vin, out };
  });
  return { source: 'sandbox', months: rows, history: hist, digitalShare: share, bounces: 0, note: 'Account Aggregator sandbox data, generated from what the owner told Saathi.' };
}

/** Read a bank statement CSV (date, description, debit, credit columns). Returns the same shape as sandboxStatement. */
export function parseStatementCSV(text, declaredIncome, ref = new Date()) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const split = l => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(s => s.trim()); };
  let hi = lines.findIndex(l => /date/i.test(l) && /(credit|deposit|cr\b|debit|withdraw)/i.test(l));
  if (hi < 0) throw new Error('Could not find a header row with Date and Credit/Debit columns.');
  const head = split(lines[hi]).map(h => h.toLowerCase());
  const di = head.findIndex(h => h.includes('date'));
  const ci = head.findIndex(h => /credit|deposit|^cr$/.test(h));
  const wi = head.findIndex(h => /debit|withdraw|^dr$/.test(h));
  const ni = head.findIndex(h => /desc|narration|particular|remark/.test(h));
  if (di < 0 || ci < 0) throw new Error('The CSV needs a Date column and a Credit (or Deposit) column.');
  const num = s => { const v = parseFloat(String(s || '').replace(/[₹,\s]/g, '')); return isNaN(v) ? 0 : v; };
  const parseDate = s => {
    s = (s || '').trim(); let m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, '0')}`;
    if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/))) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}`; }
    const d = new Date(s); if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return null;
  };
  const agg = {}; let bounces = 0;
  for (const l of lines.slice(hi + 1)) {
    const c = split(l); const k = parseDate(c[di]); if (!k) continue;
    agg[k] = agg[k] || { in: 0, out: 0 };
    agg[k].in += num(c[ci]); if (wi >= 0) agg[k].out += num(c[wi]);
    if (ni >= 0 && /return|bounce|insufficient|dishonou?r/i.test(c[ni] || '')) bounces++;
  }
  const months = last12Months(ref);
  let keys = Object.keys(agg).sort();
  // If the statement is older than the last 12 months, align to its own latest month.
  if (keys.length && !months.some(m => agg[m.key])) {
    const [y, mo] = keys[keys.length - 1].split('-').map(Number);
    return parseStatementCSV(text, declaredIncome, new Date(y, mo, 1));
  }
  const rows = months.map(m => (agg[m.key] ? { ...m, in: Math.round(agg[m.key].in), out: Math.round(agg[m.key].out) } : { ...m, in: null, out: null }));
  const have = rows.filter(r => r.in != null);
  if (have.length < 2) throw new Error('Found fewer than 2 months of transactions.');
  const avgIn = mean(have.map(r => r.in));
  return { source: 'csv', months: rows, history: Object.keys(agg).length, digitalShare: declaredIncome ? Math.min(1, avgIn / declaredIncome) : 1, bounces,
    note: `Read from an uploaded bank statement (${Object.keys(agg).length} months).` };
}

/* ---------- scorecard ---------- */
export const ptsHistory = h => (h < 6 ? 0 : h < 12 ? 10 : h < 24 ? 18 : 22);
export const ptsReg = (s, n) => (n < 6 ? 4 : s >= 0.9 ? 18 : s >= 0.75 ? 13 : s >= 0.6 ? 7 : 2);
export const ptsDscr = d => (d >= 2 ? 22 : d >= 1.5 ? 17 : d >= 1.25 ? 10 : d >= 1 ? 4 : 0);
export const ptsBounce = b => (b === 0 ? 10 : b === 1 ? 6 : b <= 3 ? 2 : 0);
export const ptsDigital = s => (s >= 0.75 ? 10 : s >= 0.5 ? 6 : s >= 0.25 ? 3 : 0);
export const ptsInformal = r => (r <= 0.05 ? 8 : r <= 0.10 ? 4 : 0);
export const probOf = score => 1 / (1 + Math.exp(-(score - 50) / 12));
export function bandOf(score) { return score >= 70 ? { id: 'ready', label: 'Ready', cls: 'good' } : score >= 50 ? { id: 'cond', label: 'Ready with conditions', cls: 'warn' } : { id: 'not', label: 'Not ready yet', cls: 'bad' }; }
export const FLABEL = { history: 'Bank history', regularity: 'Income regularity', dscr: 'Instalment cover (DSCR)', bounce: 'Bounced payments', digital: 'Income traceable in bank', informal: 'Informal debt burden' };

export function informalMonthly(p) {
  return (p.existingLoans || []).filter(l => l.source === 'moneylender' || l.source === 'other').reduce((s, l) => s + (l.amount && l.monthlyRatePct ? l.amount * l.monthlyRatePct / 100 : (l.emi || 0)), 0);
}
export function defaultTenure(p) { return p.isNewVenture ? 84 : 36; }

/** Full analysis of a file. o: {amount, tenure, incomeAdj, history} overrides for what-if. */
export function analyze(p, cash, o = {}) {
  const adj = 1 + (o.incomeAdj || 0);
  const rows = cash.months;
  const inflow = rows.map(r => (r.in == null ? null : r.in * adj));
  const outflow = rows.map(r => r.out);
  const idx = inflow.map((v, i) => (v == null ? -1 : i)).filter(i => i >= 0);
  const n = idx.length;
  const avgIn = mean(idx.map(i => inflow[i])), avgOut = mean(idx.map(i => outflow[i]));
  const surplus = inflow.map((v, i) => (v == null ? null : v - outflow[i]));
  const avgSur = avgIn - avgOut;
  const extraAssumed = p.expectedExtraIncome == null;
  const extra = extraAssumed ? (p.isNewVenture ? (p.monthlyIncome || 0) : (p.monthlyIncome || 0) * 0.15) : p.expectedExtraIncome;
  const extraC = extra * 0.5;
  const caps = surplus.map(v => (v == null ? null : v + extraC));
  const leanI = idx.reduce((m, i) => (caps[i] < caps[m] ? i : m), idx[0]);
  const leanCap = caps[leanI], avgCap = avgSur + extraC;
  const history = o.history != null ? o.history : cash.history;
  const tenure = o.tenure || defaultTenure(p);
  const sch = schemeCalc(p);
  const request = sch.bankLoan;
  const amount = o.amount != null ? o.amount : (p.acceptedAmount != null ? p.acceptedAmount : request);
  const emi = amount > 0 ? emiOf(amount, RATE, tenure) : 0;
  const dscr = emi > 0 ? avgCap / emi : 0;
  const capLimit = Math.min(leanCap, avgCap / 1.5);
  const maxP = Math.floor(maxPrincipal(capLimit, RATE, tenure) / 10000) * 10000;
  const enough = n >= 6 && history >= 6;
  let afford;
  if (!enough) afford = { status: 'insufficient' };
  else if (maxP >= amount) afford = { status: 'ok' };
  else afford = { status: 'reduce', recommended: Math.max(0, maxP) };
  const leanPass = enough && leanCap >= emi;
  const thr = 0.6 * avgIn; const k = idx.filter(i => inflow[i] >= thr).length; const share = k / (n || 1);
  const digital = cash.digitalShare;
  const informalRatio = avgIn ? informalMonthly(p) / avgIn : 0;
  const F = [
    { id: 'history', max: 22, pts: ptsHistory(history), v: history },
    { id: 'regularity', max: 18, pts: ptsReg(share, n), v: { k, n } },
    { id: 'dscr', max: 22, pts: ptsDscr(dscr), v: dscr },
    { id: 'bounce', max: 10, pts: ptsBounce(cash.bounces || 0), v: cash.bounces || 0 },
    { id: 'digital', max: 10, pts: ptsDigital(digital), v: digital },
    { id: 'informal', max: 8, pts: ptsInformal(informalRatio), v: informalRatio }
  ];
  F.forEach(f => { f.ratio = f.pts / f.max; });
  const raw = F.reduce((s, f) => s + f.pts, 0);
  const score = Math.round(raw / 90 * 100);
  const prob = probOf(score);
  const band = bandOf(score);
  const pos = F.filter(f => f.ratio >= 0.75).sort((a, b) => b.ratio - a.ratio || b.max - a.max);
  const neg = F.filter(f => f.ratio < 0.75).sort((a, b) => a.ratio - b.ratio || b.max - a.max);
  const elig = evalSchemes(p, amount);
  const rec = elig.find(s => s.id === 'pmegp' && s.status === 'eligible') || elig.find(s => s.id === 'mudra' && s.status === 'eligible') || elig.find(s => s.id === 'standup' && s.status === 'eligible') || elig.find(s => s.id === 'pmegp' && s.status === 'check');
  let seasonal = null;
  if (enough && avgCap > 0) {
    const w = idx.map(i => Math.min(1.6, Math.max(0.5, caps[i] / avgCap))); const sw = mean(w);
    seasonal = rows.map((m, i) => { const j = idx.indexOf(i); return j < 0 ? null : emi * w[j] / sw; });
  }
  return { rows, inflow, outflow, surplus, caps, idx, n, avgIn, avgOut, avgSur, extra, extraAssumed, extraC, leanI, leanCap, avgCap, history, tenure, request, amount, emi, dscr, maxP, afford, leanPass, share, k, digital, informalRatio, F, raw, score, prob, band, reasons: { pos, neg }, elig, rec, sch, seasonal };
}

/** Plain-English reason text for one scorecard factor. */
export function reasonText(f, positive) {
  const v = f.v;
  switch (f.id) {
    case 'history': return positive ? `${v} months of bank history` : `Only ${v} months of bank history`;
    case 'regularity': return positive ? `Income came in steadily in ${v.k} of ${v.n} months` : v.n < 6 ? 'Too few months to judge how steady income is' : `Income was low in ${v.n - v.k} of ${v.n} months`;
    case 'dscr': return positive ? `Monthly surplus covers the instalment ${v.toFixed(1)} times` : `Instalment is tight: surplus covers it only ${v.toFixed(1)} times`;
    case 'bounce': return positive ? 'No bounced payments in 12 months' : `${v} bounced payment${v > 1 ? 's' : ''} in 12 months`;
    case 'digital': return positive ? `${pctS(v)} of income is traceable in the bank` : `Only ${pctS(v)} of income is traceable in the bank; the rest is cash`;
    case 'informal': return positive ? (v > 0 ? 'Costly informal debt is small' : 'No costly informal debt') : `Moneylender interest takes ${pctS(v)} of monthly income`;
    default: return '';
  }
}
export const TIPS = {
  history: 'Keep all business payments coming into your bank account.',
  regularity: 'Try to spread orders through the year.',
  dscr: 'A smaller loan or a longer tenure makes the instalment safer.',
  bounce: 'Keep a small balance before payment dates so nothing bounces.',
  digital: 'Ask more customers to pay by UPI. It shows your real income.',
  informal: 'Reducing the moneylender loan frees money every month.'
};

/* ---------- documents ---------- */
function lev(a, b) {
  const m = a.length, n = b.length; const d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
const normName = s => String(s || '').toUpperCase().replace(/[^A-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
/** 'match' | 'variation' | 'different' | 'unknown' */
export function compareNames(a, b) {
  const x = normName(a), y = normName(b);
  if (!x || !y) return 'unknown';
  if (x === y) return 'match';
  const tx = x.split(' '), ty = y.split(' ');
  const [lx, ly] = [tx.sort((p, q) => q.length - p.length)[0], ty.sort((p, q) => q.length - p.length)[0]];
  const dist = lev(lx, ly) / Math.max(lx.length, ly.length);
  let pre = 0; while (pre < lx.length && lx[pre] === ly[pre]) pre++;
  if (dist <= 0.2) return 'variation';
  if (pre >= 4 || dist <= 0.45) return 'variation';
  return 'different';
}

/* ---------- synthetic population for the model-trust audit ---------- */
function corr(x, y) { const mx = mean(x), my = mean(y); let a = 0, b = 0, c = 0; for (let i = 0; i < x.length; i++) { const dx = x[i] - mx, dy = y[i] - my; a += dx * dy; b += dx * dx; c += dy * dy; } return a / Math.sqrt(b * c || 1); }
let SYN = null;
export function synth() {
  if (SYN) return SYN;
  const r = rng(2026); const nrm = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const regions = ['Kolar', 'Tumakuru', 'Mysuru', 'Ballari']; const rows = [];
  for (let i = 0; i < 4000; i++) {
    const g = r() < 0.5 ? 'Women' : 'Men'; const reg = regions[Math.floor(r() * 4)];
    const history = 3 + Math.floor(r() * 46); const n = Math.min(history, 12); const share = Math.min(1, 0.45 + r() * 0.6);
    const dscr = Math.exp(0.35 + 0.4 * nrm()); const u = r(); const b = u < 0.62 ? 0 : u < 0.84 ? 1 : u < 0.95 ? 2 : 4;
    const dig = Math.min(1, 0.15 + r() * 0.9); const inf = r() < 0.55 ? 0 : r() * 0.25;
    const raw = ptsHistory(history) + ptsReg(share, n) + ptsDscr(dscr) + ptsBounce(b) + ptsDigital(dig) + ptsInformal(inf);
    const score = Math.round(raw / 90 * 100); const p = probOf(score); const pt = Math.min(.99, Math.max(.01, p + 0.03 * nrm())); const y = r() < pt ? 1 : 0;
    rows.push({ g, reg, history, share, dscr, b, dig, inf, score, p, y });
  }
  const bins = []; for (let i = 0; i < 10; i++) { const s = rows.filter(x => x.p >= i / 10 && x.p < (i + 1) / 10); if (s.length >= 25) bins.push({ pred: mean(s.map(x => x.p)), obs: mean(s.map(x => x.y)), n: s.length }); }
  const brier = mean(rows.map(x => (x.p - x.y) ** 2));
  const grp = (key, vals) => vals.map(v => { const s = rows.filter(x => x[key] === v); const rep = s.filter(x => x.y === 1); return { v, n: s.length, ready: s.filter(x => x.score >= 70).length / s.length, tpr: rep.filter(x => x.score >= 70).length / rep.length }; });
  const gender = grp('g', ['Women', 'Men']); const region = grp('reg', regions);
  const gap = a => ({ ready: (Math.max(...a.map(x => x.ready)) - Math.min(...a.map(x => x.ready))) * 100, tpr: (Math.max(...a.map(x => x.tpr)) - Math.min(...a.map(x => x.tpr))) * 100 });
  const gy = rows.map(x => (x.g === 'Women' ? 1 : 0));
  const proxies = [['Bank history', rows.map(x => x.history)], ['Income regularity', rows.map(x => x.share)], ['Instalment cover', rows.map(x => x.dscr)], ['Bounced payments', rows.map(x => x.b)], ['Income traceable', rows.map(x => x.dig)], ['Informal debt', rows.map(x => x.inf)]].map(([k, v]) => ({ k, r: Math.abs(corr(v, gy)) }));
  SYN = { n: rows.length, bins, brier, gender, region, gGap: gap(gender), rGap: gap(region), proxies, base: mean(rows.map(x => x.y)) };
  return SYN;
}
