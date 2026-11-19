// POST /api/session — saves and restores an owner's conversation, carries bank actions to the owner, stores document photos.
// No login: each browser gets a random session id. Everything expires after 7 days.
//   {action:'load', sid}                       -> {state, feed} or {}
//   {action:'save', sid, state, feed}          -> {ok}
//   {action:'event', sid, event:{type}}        -> {ok}        (bank -> owner: doc | visit | sanction)
//   {action:'events', sid}                     -> {events:[...]}   (owner collects pending bank actions)
//   {action:'photo-put', sid, doc, image}      -> {ok}        (base64 JPEG)
//   {action:'photo-get', sid, doc}             -> {image} or {}
//   {action:'delete', sid}                     -> {ok}        (owner's "delete my data")
import * as store from '../lib/store.js';
import { sendError, sendJson, body } from '../lib/ai.js';

const TTL = 7 * 24 * 3600;
const SID = /^[a-z0-9-]{16,64}$/i;
const DOC = /^[a-z_]{2,20}$/;
const kS = sid => `saathi:s:${sid}`, kE = sid => `saathi:ev:${sid}`, kP = (sid, d) => `saathi:p:${sid}:${d}`;

// Lighter per-device limit than the AI endpoints: saves and event checks are frequent but cheap.
const hits = new Map();
function limited(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'x').split(',')[0].trim();
  const now = Date.now(); const h = hits.get(ip) || { n: 0, reset: now + 3600_000 };
  if (now > h.reset) { h.n = 0; h.reset = now + 3600_000; }
  h.n++; hits.set(ip, h); if (hits.size > 5000) hits.clear();
  return h.n > Number(process.env.SESSION_PER_IP_HOUR || 4000);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Use POST.');
  const allowed = process.env.ALLOWED_ORIGIN; const origin = req.headers.origin;
  if (allowed && origin && !allowed.split(',').map(s => s.trim()).includes(origin)) return sendError(res, 403, 'This origin is not allowed.');
  if (limited(req)) return sendError(res, 429, 'Too many requests from this device. Please wait a few minutes.');
  const b = body(req);
  if (!SID.test(String(b.sid || ''))) return sendError(res, 400, 'Missing or invalid session id.');
  const sid = b.sid;
  try {
    switch (b.action) {
      case 'load': {
        const raw = await store.get(kS(sid));
        return sendJson(res, raw ? JSON.parse(raw) : {});
      }
      case 'save': {
        const doc = JSON.stringify({ state: b.state || {}, feed: String(b.feed || ''), savedAt: new Date().toISOString() });
        if (doc.length > 900_000) return sendError(res, 413, 'Conversation too large to save.');
        await store.set(kS(sid), doc, TTL);
        return sendJson(res, { ok: true });
      }
      case 'event': {
        const type = String(b.event?.type || '');
        if (!['doc', 'visit', 'sanction'].includes(type)) return sendError(res, 400, 'Unknown event.');
        await store.push(kE(sid), JSON.stringify({ type, at: new Date().toISOString() }), TTL);
        return sendJson(res, { ok: true });
      }
      case 'events': {
        const items = await store.drain(kE(sid));
        return sendJson(res, { events: items.map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean) });
      }
      case 'photo-put': {
        if (!DOC.test(String(b.doc || ''))) return sendError(res, 400, 'Invalid document name.');
        const img = String(b.image || '');
        if (img.length < 1000 || img.length > 700_000) return sendError(res, 413, 'Photo is empty or too large.');
        await store.set(kP(sid, b.doc), img, TTL);
        return sendJson(res, { ok: true });
      }
      case 'photo-get': {
        if (!DOC.test(String(b.doc || ''))) return sendError(res, 400, 'Invalid document name.');
        const img = await store.get(kP(sid, b.doc));
        return sendJson(res, img ? { image: img } : {});
      }
      case 'delete': {
        const photos = await store.keys(`saathi:p:${sid}:`);
        await store.del(kS(sid), kE(sid), ...photos);
        return sendJson(res, { ok: true });
      }
      default:
        return sendError(res, 400, 'Unknown action.');
    }
  } catch (e) {
    console.error(e);
    return sendError(res, 502, 'Saving is unavailable right now. The conversation still works; it just won’t be saved.');
  }
}
