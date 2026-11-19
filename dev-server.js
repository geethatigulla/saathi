// Local runner: serves public/ and the api/ functions the same way Vercel does.
// Usage: node dev-server.js   (reads .env; set MOCK_AI=1 to test without an OpenAI key)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

if (process.argv.includes('--mock')) process.env.MOCK_AI = '1';
const root = path.dirname(fileURLToPath(import.meta.url));
// Minimal .env loader (no dependencies).
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const PORT = Number(process.env.PORT || 3000);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.csv': 'text/csv; charset=utf-8', '.ico': 'image/x-icon' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^a-z0-9-]/gi, '');
    const file = path.join(root, 'api', name + '.js');
    if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('{"error":"Not found"}'); }
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', c => { raw += c; if (raw.length > 6e6) req.destroy(); });
    req.on('end', async () => {
      try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
      try { const mod = await import(pathToFileURL(file).href); await mod.default(req, res); }
      catch (e) { console.error(e); res.statusCode = 500; res.end('{"error":"Server error"}'); }
    });
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  if (p === '/demo') p = '/demo.html';
  const file = path.join(root, 'public', path.normalize(p).replace(/^(\.\.[\/\\])+/, ''));
  if (!file.startsWith(path.join(root, 'public')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end('Not found'); }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Saathi running at http://localhost:${PORT}  (mock AI: ${process.env.MOCK_AI === '1' ? 'on' : 'off'})`));
