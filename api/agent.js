// POST /api/agent  — Saathi's conversational agent.
// Tasks: intake (one question at a time + fact extraction), say (explain engine results in the owner's language),
// iv_ask / iv_feedback (practice interview), confirm (did the owner say yes?), report (project report text).
// The AI only talks and extracts. Eligibility, scores and amounts come from public/engine.js.
import { guard, sendError, sendJson, chatJSON, body, MOCK, LANG_NAME, errorMessage } from '../lib/ai.js';

const n = t => ({ type: [t, 'null'] });
const PROFILE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    name: n('string'), activity: n('string'),
    sector: { type: ['string', 'null'], enum: ['manufacturing', 'service', 'trading', 'agri_allied', null] },
    isNewVenture: n('boolean'), yearsInBusiness: n('number'), monthlyIncome: n('number'),
    paymentMode: { type: ['string', 'null'], enum: ['mostly_upi', 'mixed', 'mostly_cash', null] },
    bankAccountMonths: n('number'), loanPurpose: n('string'), loanAmount: n('number'), projectCost: n('number'), expectedExtraIncome: n('number'),
    existingLoans: {
      type: ['array', 'null'],
      items: { type: 'object', additionalProperties: false, properties: { source: { type: 'string', enum: ['moneylender', 'bank', 'shg', 'other'] }, amount: n('number'), monthlyRatePct: n('number'), emi: n('number') }, required: ['source', 'amount', 'monthlyRatePct', 'emi'] }
    },
    gender: { type: ['string', 'null'], enum: ['F', 'M', 'other', null] },
    socialCategory: { type: ['string', 'null'], enum: ['General', 'SC', 'ST', 'OBC', 'Minority', null] },
    age: n('number'), educationClass: n('number'),
    area: { type: ['string', 'null'], enum: ['rural', 'urban', null] },
    place: n('string'), pastAttempt: n('string'), schemesHeard: n('string')
  }
};
PROFILE_SCHEMA.required = Object.keys(PROFILE_SCHEMA.properties);

const REPLY = { reply_local: { type: 'string' }, reply_en: { type: 'string' } };
const SAY_SCHEMA = { type: 'object', additionalProperties: false, properties: REPLY, required: ['reply_local', 'reply_en'] };

const BASE = lang => `You are Saathi, a warm helper that prepares bank loan files for micro-business owners in rural Karnataka, India. Many users have low literacy and use cheap phones. Speak ${LANG_NAME[lang] || 'Kannada'} in simple, everyday spoken words, the way a helpful neighbour talks, never formal or bureaucratic. Use rupee amounts written as digits with the ₹ sign (for example ₹2,40,000). Never ask for Aadhaar, PAN or bank account numbers, OTPs, PINs or money. Never promise that a loan will be approved: the bank decides. reply_local is your message in ${LANG_NAME[lang] || 'Kannada'}; reply_en is its faithful English translation${lang === 'en' ? ' (identical to reply_local)' : ''}.`;

const INTAKE_RULES = `
Your job in this step: learn enough to prepare a loan file, asking exactly ONE short question per turn (at most 2 short sentences).
Collect, roughly in this order:
0. name: their name, if they are happy to share it (ask in the first question together with item 1).
1. activity (their business in their words) and sector: manufacturing, service, trading or agri_allied (dairy, poultry, goats, fisheries count as agri_allied).
2. isNewVenture (starting a new unit, or already running) and yearsInBusiness.
3. monthlyIncome (approximate rupees per month) and paymentMode (mostly UPI, mixed, mostly cash). If they mention when they opened their bank account, set bankAccountMonths.
4. loanPurpose, and loanAmount (running business) or projectCost (total cost of a new unit).
5. expectedExtraIncome: how much more per month they expect to earn after using the loan.
6. existingLoans: any current loans. "3 rupees per hundred per month" means monthlyRatePct 3. Use source moneylender, bank, shg or other. If they have none, set existingLoans to an empty array.
7. area (rural or urban) and place (village or town).
8. Only for a new unit: age and educationClass (highest class passed, as a number).
9. gender and socialCategory: ask once, gently, saying it is only to check special schemes for women and SC/ST founders, and that they may skip. If they skip, leave null.
10. pastAttempt (have they tried a bank loan before and where it stopped) and schemesHeard (which schemes they know and from whom). Ask these together as one light question.
Rules:
- Never ask about something the profile already knows or the person already said (for example, if they said "four years", do not ask whether the business is new). Ask only for what is still missing.
- Sector: making or processing goods counts as manufacturing (tailoring and garment stitching, welding and fabrication, food processing, carpentry, pottery). Repairs, salons, transport, tuition and similar are service. Buying and selling goods is trading.
- Write the profile's text fields (name, activity, loanPurpose, place, pastAttempt, schemesHeard) in English, whatever language the person speaks. Write the name in capital English letters as it would appear on an ID card (for example "LAKSHMAMMA B").
- Convert spoken amounts to plain rupee numbers ("moodu lakh" = 300000; "35 to 40 thousand" = 37500).
- Fill fields only from what the person said or clearly implied; never invent. Keep all known values unless the person corrects one.
- If an answer is unclear, ask again more simply with an example. If they ask something off-topic, answer in one line and return to the questions.
- Set done=true only when items 1 to 7 are known (and 8 for a new unit) and you have asked 9 and 10 at least once. When done, thank them in one short sentence and say you will next ask permission to look at their bank records. Do not ask another question in that final reply.`;

const SAY_KINDS = {
  result: 'Tell the owner which schemes they qualify for, which need a detail confirmed, and which do not apply, with the simple reason for each one that does not apply. Mention that no property is needed if the facts say so. At most 3 sentences.',
  reasons: 'Explain why their file is strong (the strengths given) and the one thing to improve, with the tip. At most 3 sentences.',
  afford_reduce: 'Gently warn that the instalment on the amount they asked for is hard in their slowest month (name the month). Recommend the safer amount and give both instalments. Make clear the choice is theirs. At most 3 sentences.',
  afford_ok: 'Tell them the loan fits their income and the instalment can be paid even in their slowest month. At most 2 sentences.',
  plan: 'Their file is not ready yet because their bank history is too short for a bank to judge. Say this kindly. Suggest bringing other proof of income, such as a dairy society statement, SHG ledger or supplier bills, and say Saathi will check again. At most 3 sentences.',
  subsidy: 'Explain the PMEGP numbers simply: what they put in, the government subsidy, and the bank loan, and that EDP training must be finished before the subsidy is released. At most 3 sentences.',
  docfix: 'The name on two documents is spelled differently. Say plainly that the bank will ask about it, and the fix: at the branch visit, show the Aadhaar and ask for a KYC name update on the account. Saathi will add a note for the bank. At most 3 sentences.',
  doc_unreadable: 'The photo could not be read, for the reason given. Ask them to take it again, with one practical tip (light, flat surface, whole card in frame). 1 or 2 sentences.',
  doc_wrong: 'The photo does not look like the document asked for. Say which document is needed, kindly. 1 sentence.',
  income_proof: 'They added another proof of income. Tell them the result: the months it covers and their new readiness. At most 2 sentences.',
  readback: 'Read back the application using exactly the numbers given: scheme, loan amount, months, monthly instalment and bank branch. Then ask them to say yes to send it, and say nothing is sent without their yes. At most 3 sentences.',
  status: 'Give a short, friendly update about their file using the event given. At most 2 sentences.'
};

const IV_TOPICS = [
  'why they need this loan and how it will grow the business',
  'how they will pay the instalment in their slow months',
  'whether they have any other loans or debts'
];

// Tell the model exactly which facts are known and which are still missing, so it never re-asks.
function missingNote(p) {
  p = p || {};
  const has = k => p[k] !== null && p[k] !== undefined && p[k] !== '';
  const need = ['name', 'activity', 'sector', 'isNewVenture', 'monthlyIncome', 'paymentMode', 'loanPurpose', 'expectedExtraIncome', 'existingLoans', 'place'];
  if (p.isNewVenture === false) need.push('yearsInBusiness');
  need.push(p.isNewVenture ? 'projectCost' : 'loanAmount');
  if (p.isNewVenture) need.push('age', 'educationClass');
  const missing = need.filter(k => !has(k) && !(k === 'loanAmount' && has('projectCost')) && !(k === 'projectCost' && has('loanAmount')));
  const known = Object.keys(p).filter(has);
  return `Already known (do NOT ask again): ${known.join(', ') || 'nothing yet'}.\nStill missing: ${missing.join(', ') || 'none of the required facts'}. Also ask once about gender/socialCategory and pastAttempt/schemesHeard if not yet known.\nIf the person has not answered the same question after two tries, leave it null and move on.`;
}

function trimTurns(turns) {
  const t = (Array.isArray(turns) ? turns : []).filter(x => x && (x.role === 'user' || x.role === 'assistant') && typeof x.content === 'string')
    .map(x => ({ role: x.role, content: x.content.slice(0, 800) }));
  return t.slice(-24);
}
const factsStr = f => JSON.stringify(f || {}).slice(0, 4000);

export default async function handler(req, res) {
  const g = guard(req); if (g) return sendError(res, g === 'Use POST.' ? 405 : 429, g);
  const b = body(req);
  const lang = ['kn', 'hi', 'en'].includes(b.lang) ? b.lang : 'kn';
  try {
    if (MOCK) return sendJson(res, mock(b, lang));
    switch (b.task) {
      case 'intake': {
        const turns = trimTurns(b.turns);
        const schema = { type: 'object', additionalProperties: false, properties: { ...REPLY, profile: PROFILE_SCHEMA, done: { type: 'boolean' } }, required: ['reply_local', 'reply_en', 'profile', 'done'] };
        const system = BASE(lang) + INTAKE_RULES + `\nKnown profile so far (JSON): ${factsStr(b.profile)}\n${missingNote(b.profile)}`;
        const messages = turns.length ? turns : [{ role: 'user', content: '(The owner has just agreed to talk. Ask your first question.)' }];
        if (messages[0].role !== 'user') messages.unshift({ role: 'user', content: '(Conversation start.)' });
        const out = await chatJSON({ system, messages, schemaName: 'intake_turn', schema, maxTokens: 900 });
        return sendJson(res, out);
      }
      case 'say': {
        const kind = SAY_KINDS[b.kind] ? b.kind : 'status';
        const system = BASE(lang) + `\nTask: ${SAY_KINDS[kind]}\nUse ONLY the facts below. Do not add numbers, schemes or promises that are not in the facts.\nFacts (JSON): ${factsStr(b.facts)}`;
        const out = await chatJSON({ system, messages: [{ role: 'user', content: 'Write the message now.' }], schemaName: 'say', schema: SAY_SCHEMA, maxTokens: 500, fast: true });
        return sendJson(res, out);
      }
      case 'iv_ask': {
        const i = Math.max(0, Math.min(2, Number(b.index) || 0));
        const system = BASE(lang) + `\nYou are now role-playing a friendly but careful bank branch manager in a practice interview, to help the owner prepare. Ask ONE short question about: ${IV_TOPICS[i]}. One sentence.\nOwner facts (JSON): ${factsStr(b.facts)}`;
        const out = await chatJSON({ system, messages: [{ role: 'user', content: 'Ask the question.' }], schemaName: 'iv_q', schema: SAY_SCHEMA, maxTokens: 200, fast: true });
        return sendJson(res, out);
      }
      case 'iv_feedback': {
        const next = b.nextIndex != null ? Math.max(0, Math.min(2, Number(b.nextIndex))) : null;
        const schema = { type: 'object', additionalProperties: false, properties: { ...REPLY, rating: { type: 'string', enum: ['good', 'okay', 'weak'] }, next_local: { type: ['string', 'null'] }, next_en: { type: ['string', 'null'] } }, required: ['reply_local', 'reply_en', 'rating', 'next_local', 'next_en'] };
        const system = BASE(lang) + `\nYou are Saathi coaching the owner after a practice bank interview question. Give one thing that was good and one concrete way to make the answer stronger, using real numbers from the facts where they help (for example their slowest month or monthly income). If they hid or denied a loan that the facts show, kindly tell them honesty matters and to mention it. At most 3 sentences.\nOwner facts (JSON): ${factsStr(b.facts)}\nManager's question: ${String(b.question || '').slice(0, 300)}` + (next != null ? `\nThen, as the bank manager again, write the NEXT practice question (one sentence) about: ${IV_TOPICS[next]}. Put it in next_local (in ${LANG_NAME[lang]}) and next_en (English).` : '\nSet next_local and next_en to null.');
        const out = await chatJSON({ system, messages: [{ role: 'user', content: `Owner's answer: ${String(b.answer || '').slice(0, 600)}` }], schemaName: 'iv_fb', schema, maxTokens: 400 });
        return sendJson(res, out);
      }
      case 'confirm': {
        const schema = { type: 'object', additionalProperties: false, properties: { intent: { type: 'string', enum: ['yes', 'no', 'change', 'unclear'] } }, required: ['intent'] };
        const system = 'Classify the owner\'s reply to "Shall I send your loan application to the bank?". yes = clear agreement to send (in any language, e.g. haudu, haan, sari, ok, kalisi). no = refuses. change = wants to change something. unclear = anything else.';
        const out = await chatJSON({ system, messages: [{ role: 'user', content: String(b.text || '').slice(0, 300) }], schemaName: 'confirm', schema, maxTokens: 20, temperature: 0, fast: true });
        return sendJson(res, out);
      }
      case 'report': {
        const s = { type: 'string' };
        const schema = { type: 'object', additionalProperties: false, properties: { summary: s, operations: s, market: s, risks: s, mitigation: s }, required: ['summary', 'operations', 'market', 'risks', 'mitigation'] };
        const system = 'You write short, factual project reports for Indian bank loan files in plain English. Each field is 1 to 3 sentences. Use ONLY the facts given; do not invent customers, numbers or certifications. Where a fact is missing, say what the bank should confirm.\nFacts (JSON): ' + factsStr(b.facts);
        const out = await chatJSON({ system, messages: [{ role: 'user', content: 'Write the report fields.' }], schemaName: 'report', schema, maxTokens: 700, temperature: 0.3 });
        return sendJson(res, out);
      }
      default:
        return sendError(res, 400, 'Unknown task.');
    }
  } catch (e) {
    console.error(e);
    return sendError(res, e.status === 429 ? 429 : 502, errorMessage(e, 'The AI service had a problem. Please try again.'));
  }
}

/* ---------- mock mode (MOCK_AI=1): canned replies for testing without a key ---------- */
const MQ = [
  ['ನಿಮ್ಮ ವ್ಯಾಪಾರದ ಬಗ್ಗೆ ಹೇಳಿ. ಏನು ಮಾಡ್ತೀರಿ, ಎಷ್ಟು ವರ್ಷದಿಂದ?', 'Tell me about your work. What do you do, and for how long?', { activity: 'Tailoring, blouses and school uniforms', sector: 'manufacturing', isNewVenture: false, yearsInBusiness: 4 }],
  ['ತಿಂಗಳಿಗೆ ಸುಮಾರು ಎಷ್ಟು ಸಂಪಾದನೆ? ಹೆಚ್ಚಾಗಿ UPI ಅಲ್ಲಿ ಬರುತ್ತಾ?', 'Roughly how much do you earn a month? Do most customers pay by UPI?', { monthlyIncome: 37500, paymentMode: 'mostly_upi' }],
  ['ಸಾಲ ಯಾಕೆ ಬೇಕು? ಎಷ್ಟು ಬೇಕು?', 'What do you need the loan for, and how much?', { loanPurpose: '2 industrial sewing machines and an embroidery machine', loanAmount: 300000 }],
  ['ಮಷೀನ್ ಬಂದ ಮೇಲೆ ತಿಂಗಳಿಗೆ ಎಷ್ಟು ಹೆಚ್ಚು ಸಂಪಾದನೆ ಆಗಬಹುದು?', 'With the machines, how much more could you earn each month?', { expectedExtraIncome: 12000 }],
  ['ಈಗ ಯಾವುದಾದರೂ ಸಾಲ ಇದೆಯಾ?', 'Do you have any loans right now?', { existingLoans: [{ source: 'moneylender', amount: 40000, monthlyRatePct: 3, emi: null }] }],
  ['ನಿಮ್ಮ ಊರು ಯಾವುದು?', 'Which village or town are you in?', { area: 'rural', place: 'Vemgal, Kolar' }],
  ['ಮಹಿಳೆಯರು ಮತ್ತು SC/ST ಗಾಗಿ ವಿಶೇಷ ಯೋಜನೆ ನೋಡಲು ಮಾತ್ರ ಕೇಳುತ್ತೇನೆ: ನೀವು ಹೇಳಬಹುದಾ? ಬೇಡವಾದರೆ ಬಿಡಿ.', 'Only to check special schemes for women and SC/ST founders: would you like to tell me? You may skip.', { gender: 'F', socialCategory: 'General' }],
  ['ಮೊದಲು ಬ್ಯಾಂಕ್ ಸಾಲಕ್ಕೆ ಪ್ರಯತ್ನಿಸಿದ್ರಾ? ಯಾವ ಯೋಜನೆ ಗೊತ್ತು?', 'Have you tried a bank loan before? Which schemes have you heard of?', { pastAttempt: 'Two years ago; too many papers; agent asked ₹15,000', schemesHeard: 'MUDRA, from a neighbour' }]
];
function mock(b, lang) {
  const pick = (kn, en) => ({ reply_local: lang === 'en' ? en : kn, reply_en: en });
  if (b.task === 'intake') {
    const users = (b.turns || []).filter(t => t.role === 'user').length;
    const profile = {}; PROFILE_SCHEMA.required.forEach(k => { profile[k] = null; });
    for (let i = 0; i < Math.min(users, MQ.length); i++) Object.assign(profile, MQ[i][2]);
    // The dairy sample owner exercises the "not ready yet" path (short bank history).
    if ((b.turns || []).some(t => t.role === 'user' && /Shivanna|ಶಿವಣ್ಣ/.test(t.content))) Object.assign(profile, { name: 'Shivanna K', activity: 'Dairy, 3 cows', sector: 'agri_allied', yearsInBusiness: 7, monthlyIncome: 20000, paymentMode: 'mostly_cash', bankAccountMonths: users ? 5 : null, loanPurpose: '2 more cows', loanAmount: 150000, expectedExtraIncome: 7000, existingLoans: [{ source: 'moneylender', amount: 60000, monthlyRatePct: 5, emi: null }], gender: 'M', place: 'Bangarpet, Kolar' });
    if (users >= MQ.length) return { ...pick('ಧನ್ಯವಾದ! ಈಗ ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ದಾಖಲೆ ನೋಡಲು ಒಪ್ಪಿಗೆ ಕೇಳುತ್ತೇನೆ.', 'Thank you! Next I will ask permission to look at your bank records.'), profile, done: true };
    return { ...pick(MQ[users][0], MQ[users][1]), profile, done: false };
  }
  if (b.task === 'say') return pick(`[ಮಾದರಿ] ${b.kind}`, `[Mock] ${b.kind}: ${JSON.stringify(b.facts || {}).slice(0, 160)}`);
  if (b.task === 'iv_ask') return pick(['ಈ ಸಾಲ ಯಾಕೆ ಬೇಕು?', 'ಕಡಿಮೆ ಸಂಪಾದನೆಯ ತಿಂಗಳಲ್ಲಿ ಕಂತು ಹೇಗೆ ಕಟ್ಟುತ್ತೀರಿ?', 'ಬೇರೆ ಸಾಲ ಇದೆಯಾ?'][b.index || 0], ['Why do you need this loan?', 'How will you pay in slow months?', 'Do you have other loans?'][b.index || 0]);
  if (b.task === 'iv_feedback') { const nq = b.nextIndex != null ? [['ಈ ಸಾಲ ಯಾಕೆ ಬೇಕು?', 'Why do you need this loan?'], ['ಕಡಿಮೆ ಸಂಪಾದನೆಯ ತಿಂಗಳಲ್ಲಿ ಕಂತು ಹೇಗೆ ಕಟ್ಟುತ್ತೀರಿ?', 'How will you pay in slow months?'], ['ಬೇರೆ ಸಾಲ ಇದೆಯಾ?', 'Do you have other loans?']][b.nextIndex] : null; return { ...pick('ಚೆನ್ನಾಗಿದೆ. ಒಂದು ಸಂಖ್ಯೆ ಸೇರಿಸಿ.', 'Good. Add a number to make it stronger.'), rating: 'okay', next_local: nq ? (lang === 'en' ? nq[1] : nq[0]) : null, next_en: nq ? nq[1] : null }; }
  if (b.task === 'confirm') return { intent: /no|beda|nahi/i.test(b.text || '') ? 'no' : 'yes' };
  if (b.task === 'report') return { summary: 'Mock summary.', operations: 'Mock operations.', market: 'Mock market.', risks: 'Mock risks.', mitigation: 'Mock mitigation.' };
  return pick('ಸರಿ', 'Okay');
}
