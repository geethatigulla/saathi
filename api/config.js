// GET /api/config  -> which AI provider is active, whether it is ready, and whether the server speaks. No key is exposed.
import { PROVIDER, SERVER_TTS, MOCK, HAS_KEY } from '../lib/ai.js';
import { STORE_KIND } from '../lib/store.js';

export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ provider: MOCK ? 'mock' : PROVIDER, ready: MOCK || HAS_KEY, serverTts: SERVER_TTS && !MOCK, store: STORE_KIND }));
}
