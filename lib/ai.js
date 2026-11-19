// Server-only AI layer. Works with OpenAI or Google Gemini, chosen by environment variables.
// Keys live only on the server and never reach the browser.
//   AI_PROVIDER = openai | gemini   (default: gemini when GEMINI_API_KEY is set and OPENAI_API_KEY is not, else openai)
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
export const MOCK = process.env.MOCK_AI === '1';
const chosen = (process.env.AI_PROVIDER || (GEMINI_KEY && !OPENAI_KEY ? 'gemini' : 'openai')).toLowerCase();
export const PROVIDER = chosen === 'gemini' ? 'gemini' : 'openai';
const KEY = PROVIDER === 'gemini' ? GEMINI_KEY : OPENAI_KEY;

export const MODELS = {
  // Gemini: the main model handles conversation, photos and reports; the fast one handles short replies.
  gMain: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  gFast: process.env.GEMINI_FAST_MODEL || 'gemini-2.5-flash-lite',
  chat: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
  vision: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
  stt: process.env.OPENAI_STT_MODEL || 'gpt-4o-mini-transcribe',
  tts: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
  voice: process.env.OPENAI_TTS_VOICE || 'coral'
};
/** Server text-to-speech is only used with OpenAI. With Gemini, the browser's own voices speak. */
export const HAS_KEY = !!KEY;
export const SERVER_TTS = PROVIDER === 'openai' && process.env.SERVER_TTS !== '0';

/* ---------- limits ----------
   In-memory counters per server instance: a soft guard against bursts. */
const PER_IP_HOUR = Number(process.env.RATE_PER_IP_HOUR || 150);
const DAILY_CAP = Number(process.env.DAILY_CALL_CAP || 3000);
const hits = new Map();
let day = { key: '', count: 0 };

export function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  return (Array.isArray(xf) ? xf[0] : (xf || '')).split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}
/** Returns an error string when the request should be refused, else null. */
export function guard(req) {
  if (req.method !== 'POST') return 'Use POST.';
  const allowed = process.env.ALLOWED_ORIGIN;
  const origin = req.headers.origin;
  if (allowed && origin && !allowed.split(',').map(s => s.trim()).includes(origin)) return 'This origin is not allowed.';
  if (!MOCK && !KEY) return PROVIDER === 'gemini' ? 'The server has no GEMINI_API_KEY set. Add it in your hosting settings (or .env for local runs).' : 'The server has no OPENAI_API_KEY set. Add it in your hosting settings (or .env for local runs).';
  const today = new Date().toISOString().slice(0, 10);
  if (day.key !== today) day = { key: today, count: 0 };
  if (day.count >= DAILY_CAP) return 'Daily demo limit reached. Please try again tomorrow.';
  const ip = clientIp(req); const now = Date.now();
  const h = hits.get(ip) || { n: 0, reset: now + 3600_000 };
  if (now > h.reset) { h.n = 0; h.reset = now + 3600_000; }
  if (h.n >= PER_IP_HOUR) return 'Too many requests from this device. Please wait a few minutes.';
  h.n++; hits.set(ip, h); day.count++;
  if (hits.size > 5000) hits.clear();
  return null;
}

export function sendError(res, status, message) {
  res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: message }));
}
export function sendJson(res, data) {
  res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(data));
}
/** Friendly message for an AI error, shared by all endpoints. */
export function errorMessage(e, fallback) {
  if (e.quota) return 'The AI account is out of credit. The site owner needs to check the AI account.';
  if (e.daily) return 'Today\'s AI limit for this demo is used up. Please try again later, or open the scripted demo at /demo.';
  if (e.status === 429) return 'Many people are using Saathi right now. Wait a few seconds and tap Try again.';
  if (e.badKey) return 'The AI key on the server is not valid. The site owner needs to check it.';
  if (e.userMessage) return e.userMessage;
  return fallback;
}
export function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}
export const LANG_NAME = { kn: 'Kannada', hi: 'Hindi', en: 'English' };

/* ---------- retries ----------
   A short rate limit (per minute) is retried after the wait the provider asks for, within the 30 s function limit.
   A daily limit or an out-of-credit error is returned at once. */
async function withRetry(doFetch, classify) {
  const started = Date.now();
  for (let attempt = 0; ; attempt++) {
    const r = await doFetch();
    if (r.ok) return r;
    let j = {}; try { j = await r.json(); } catch { /* ignore */ }
    const info = classify(r, j);
    if (r.status === 429 && !info.quota && !info.daily && attempt < 3) {
      // Per-minute limits refill gradually: wait at least 4 s, longer on each retry.
      const waitMs = Math.min(12000, Math.max(info.retryMs || 0, 4000 * (attempt + 1)) + 400);
      if (Date.now() - started + waitMs < 26000) { await new Promise(res => setTimeout(res, waitMs)); continue; }
    }
    const e = new Error(info.message || `AI error ${r.status}`); Object.assign(e, { status: r.status, quota: info.quota, daily: info.daily, badKey: info.badKey }); throw e;
  }
}

/* ---------- OpenAI ---------- */
function openaiFetch(path, init) {
  return withRetry(
    () => fetch('https://api.openai.com/v1' + path, { ...init, headers: { Authorization: `Bearer ${OPENAI_KEY}`, ...(init.headers || {}) } }),
    (r, j) => {
      const detail = j.error?.message || ''; const code = j.error?.code || '';
      const m = detail.match(/try again in ([\d.]+)\s*(ms|s)\b/i);
      return { message: `OpenAI ${r.status}: ${detail}`, quota: code === 'insufficient_quota', daily: /requests per day|\(RPD\)|tokens per day/i.test(detail), badKey: r.status === 401,
        retryMs: m ? Number(m[1]) * (m[2].toLowerCase() === 'ms' ? 1 : 1000) : Number(r.headers.get('retry-after')) * 1000 || 0 };
    });
}

/* ---------- Gemini ---------- */
const GBASE = 'https://generativelanguage.googleapis.com/v1beta';
function geminiFetch(model, payload) {
  return withRetry(
    () => fetch(`${GBASE}/models/${encodeURIComponent(model)}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY }, body: JSON.stringify(payload) }),
    (r, j) => {
      const detail = j.error?.message || ''; const raw = JSON.stringify(j.error?.details || []);
      const retry = (raw.match(/"retryDelay":"([\d.]+)s"/) || [])[1];
      return { message: `Gemini ${r.status}: ${detail}`, daily: /PerDay/i.test(raw + detail), quota: /billing|credit/i.test(detail) && r.status !== 429,
        badKey: r.status === 400 && /API key/i.test(detail) || r.status === 403, retryMs: retry ? Number(retry) * 1000 : 0 };
    });
}
// Convert a strict JSON schema (OpenAI style) into Gemini's schema format.
function gSchema(s) {
  const out = {}; let t = s.type; let nullable = false;
  if (Array.isArray(t)) { nullable = t.includes('null'); t = t.find(x => x !== 'null'); }
  out.type = String(t).toUpperCase(); if (nullable) out.nullable = true;
  if (s.enum) out.enum = s.enum.filter(v => v !== null);
  if (s.properties) { out.properties = {}; for (const k of Object.keys(s.properties)) out.properties[k] = gSchema(s.properties[k]); out.required = s.required || []; out.propertyOrdering = Object.keys(s.properties); }
  if (s.items) out.items = gSchema(s.items);
  return out;
}
// Chat-style messages -> Gemini contents (consecutive turns with the same role are merged).
function gContents(messages) {
  const out = [];
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const parts = typeof m.content === 'string' ? [{ text: m.content }] : m.content.map(p => {
      if (p.type === 'text') return { text: p.text };
      const url = p.image_url?.url || ''; const mm = url.match(/^data:([^;]+);base64,(.*)$/);
      return mm ? { inlineData: { mimeType: mm[1], data: mm[2] } } : { text: '' };
    });
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].parts.push(...parts); else out.push({ role, parts });
  }
  if (out[0]?.role !== 'user') out.unshift({ role: 'user', parts: [{ text: '(start)' }] });
  return out;
}
function gText(j) {
  const c = j.candidates?.[0];
  if (!c) { const e = new Error('Gemini returned no answer' + (j.promptFeedback?.blockReason ? ` (${j.promptFeedback.blockReason})` : '')); e.status = 502; throw e; }
  return (c.content?.parts || []).map(p => p.text || '').join('');
}
function thinkingOff(model, cfg) { if (/2\.5-flash(?!-lite)/.test(model)) cfg.thinkingConfig = { thinkingBudget: 0 }; return cfg; }

/* ---------- public API ---------- */
/** Model answer that must be JSON matching `schema`. `fast` picks the lighter model for short replies (Gemini). */
export async function chatJSON({ system, messages, schemaName, schema, maxTokens = 700, temperature = 0.4, fast = false, vision = false }) {
  if (PROVIDER === 'gemini') {
    const model = fast ? MODELS.gFast : MODELS.gMain;
    const payload = { systemInstruction: { parts: [{ text: system }] }, contents: gContents(messages),
      generationConfig: thinkingOff(model, { temperature, maxOutputTokens: Math.max(maxTokens, 512), responseMimeType: 'application/json', responseSchema: gSchema(schema) }) };
    const r = await geminiFetch(model, payload);
    const txt = gText(await r.json());
    try { return JSON.parse(txt); } catch { const e = new Error('Gemini returned invalid JSON'); e.status = 502; throw e; }
  }
  const model = vision ? MODELS.vision : MODELS.chat;
  const r = await openaiFetch('/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
    model, temperature, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages],
    response_format: { type: 'json_schema', json_schema: { name: schemaName, strict: true, schema } } }) });
  const j = await r.json();
  return JSON.parse(j.choices?.[0]?.message?.content || '{}');
}

/** Server-side speech to text (used when the browser cannot recognise speech itself). */
export async function transcribe(buffer, mime, language) {
  if (PROVIDER === 'gemini') {
    const lang = LANG_NAME[language] || 'the spoken language';
    const r = await geminiFetch(MODELS.gFast, { contents: [{ role: 'user', parts: [{ inlineData: { mimeType: mime, data: buffer.toString('base64') } }, { text: `Transcribe this voice note exactly as spoken, in ${lang} script. Reply with only the transcript, nothing else.` }] }], generationConfig: { temperature: 0, maxOutputTokens: 600 } });
    return gText(await r.json()).trim();
  }
  const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : mime.includes('wav') ? 'wav' : mime.includes('mpeg') ? 'mp3' : 'webm';
  const fd = new FormData();
  fd.append('file', new Blob([buffer], { type: mime }), `voice.${ext}`); fd.append('model', MODELS.stt); if (language) fd.append('language', language);
  const r = await openaiFetch('/audio/transcriptions', { method: 'POST', body: fd });
  return ((await r.json()).text || '').trim();
}

/** Server text-to-speech (OpenAI only). */
export async function speech(text, instructions) {
  const b = { model: MODELS.tts, voice: MODELS.voice, input: text, response_format: 'mp3' };
  if (instructions && !/^tts-1/.test(MODELS.tts)) b.instructions = instructions;
  const r = await openaiFetch('/audio/speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
  return Buffer.from(await r.arrayBuffer());
}
