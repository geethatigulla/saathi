// Small key-value store for saved conversations, bank events and document photos.
// Deployed: Upstash Redis over its REST API (UPSTASH_REDIS_REST_URL/TOKEN, or Vercel's KV_REST_API_URL/TOKEN).
// Local runs: a JSON file in .data/ (git-ignored). Deployed without Redis: memory only (lost on restart).
import fs from 'node:fs';
import path from 'node:path';

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
export const STORE_KIND = URL_ && TOKEN ? 'redis' : process.env.VERCEL ? 'memory' : 'file';

/* ---------- Redis (Upstash REST) ---------- */
async function redis(cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('Storage error: ' + (j.error || r.status));
  return j.result;
}

/* ---------- file / memory fallback ---------- */
const FILE = path.join(process.cwd(), '.data', 'store.json');
let mem = null;
function loadMem() {
  if (mem) return mem;
  mem = {};
  if (STORE_KIND === 'file') { try { mem = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { mem = {}; } }
  return mem;
}
function persist() {
  if (STORE_KIND !== 'file') return;
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(mem));
}
function live(k) {
  const m = loadMem(); const e = m[k];
  if (!e) return null;
  if (e.exp && e.exp < Date.now()) { delete m[k]; return null; }
  return e;
}

/* ---------- public API (values are strings) ---------- */
export async function get(key) {
  if (STORE_KIND === 'redis') return redis(['GET', key]);
  const e = live(key); return e ? e.v : null;
}
export async function set(key, value, ttlSec) {
  if (STORE_KIND === 'redis') return redis(['SET', key, value, 'EX', String(ttlSec)]);
  loadMem()[key] = { v: value, exp: Date.now() + ttlSec * 1000 }; persist();
}
export async function del(...keys) {
  if (!keys.length) return;
  if (STORE_KIND === 'redis') return redis(['DEL', ...keys]);
  const m = loadMem(); keys.forEach(k => delete m[k]); persist();
}
/** Append to a list and refresh its expiry. */
export async function push(key, value, ttlSec) {
  if (STORE_KIND === 'redis') { await redis(['RPUSH', key, value]); return redis(['EXPIRE', key, String(ttlSec)]); }
  const m = loadMem(); const e = live(key) || { v: [], exp: 0 };
  e.v = [...(Array.isArray(e.v) ? e.v : []), value]; e.exp = Date.now() + ttlSec * 1000; m[key] = e; persist();
}
/** Read the whole list and empty it. */
export async function drain(key) {
  if (STORE_KIND === 'redis') {
    const items = (await redis(['LRANGE', key, '0', '-1'])) || [];
    if (items.length) await redis(['LTRIM', key, String(items.length), '-1']);
    return items;
  }
  const e = live(key); if (!e || !Array.isArray(e.v)) return [];
  const items = e.v; e.v = []; persist(); return items;
}
/** Keys matching a prefix (used to delete one person's photos). */
export async function keys(prefix) {
  if (STORE_KIND === 'redis') return (await redis(['KEYS', prefix + '*'])) || [];
  return Object.keys(loadMem()).filter(k => k.startsWith(prefix) && live(k));
}
