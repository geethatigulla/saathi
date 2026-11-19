// POST /api/speak  {text, lang} -> {audio: base64 mp3}
import { guard, sendError, sendJson, speech, body, MOCK, SERVER_TTS, errorMessage } from '../lib/ai.js';

const HOW = {
  kn: 'Speak in natural Kannada as spoken in Karnataka villages. Warm, calm and a little slow, like a kind helper explaining to an elder.',
  hi: 'Speak in natural, simple Hindi. Warm, calm and a little slow, like a kind helper.',
  en: 'Speak in clear Indian English. Warm, calm and a little slow.'
};

export default async function handler(req, res) {
  const g = guard(req); if (g) return sendError(res, g === 'Use POST.' ? 405 : 429, g);
  const b = body(req);
  const text = String(b.text || '').trim().slice(0, 700);
  if (!text) return sendError(res, 400, 'No text to speak.');
  const lang = ['kn', 'hi', 'en'].includes(b.lang) ? b.lang : 'kn';
  try {
    if (MOCK || !SERVER_TTS) return sendJson(res, { audio: null, browser: true });
    const buf = await speech(text, HOW[lang]);
    return sendJson(res, { audio: buf.toString('base64') });
  } catch (e) {
    console.error(e);
    return sendError(res, e.status === 429 ? 429 : 502, errorMessage(e, 'Voice is unavailable right now.'));
  }
}
