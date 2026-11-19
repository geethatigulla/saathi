// POST /api/transcribe  {audio: base64, mime, lang} -> {text}
import { guard, sendError, sendJson, transcribe, body, MOCK, errorMessage } from '../lib/ai.js';

const MAX_BYTES = 3 * 1024 * 1024; // about 60–90 seconds of compressed voice

export default async function handler(req, res) {
  const g = guard(req); if (g) return sendError(res, g === 'Use POST.' ? 405 : 429, g);
  const b = body(req);
  if (typeof b.audio !== 'string' || !b.audio) return sendError(res, 400, 'No audio received.');
  const buf = Buffer.from(b.audio, 'base64');
  if (buf.length > MAX_BYTES) return sendError(res, 413, 'The voice note is too long. Please keep it under a minute.');
  if (buf.length < 800) return sendError(res, 400, 'The voice note was empty. Hold the mic a little longer.');
  const lang = ['kn', 'hi', 'en'].includes(b.lang) ? b.lang : undefined;
  try {
    if (MOCK) return sendJson(res, { text: lang === 'en' ? '(mock transcript) I do tailoring.' : '(ಮಾದರಿ) ನಾನು ಟೈಲರಿಂಗ್ ಮಾಡ್ತೀನಿ.' });
    const mime = String(b.mime || 'audio/webm').split(';')[0];
    const text = await transcribe(buf, mime, lang);
    return sendJson(res, { text: text.trim() });
  } catch (e) {
    console.error(e);
    return sendError(res, e.status === 429 ? 429 : 502, errorMessage(e, 'Could not understand the voice note. Please try again or type your answer.'));
  }
}
