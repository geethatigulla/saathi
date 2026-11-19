// POST /api/read-doc  {image: base64 jpeg, expected} -> fields read from the photo.
// The image is processed and discarded; nothing is stored. Only the last 4 digits of any ID are returned.
import { guard, sendError, sendJson, chatJSON, body, MOCK, errorMessage } from '../lib/ai.js';

const n = t => ({ type: [t, 'null'] });
const SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    docType: { type: 'string', enum: ['aadhaar', 'pan', 'passbook', 'quotation', 'income_proof', 'shop_photo', 'other'] },
    readable: { type: 'boolean' },
    issue: n('string'),
    name: n('string'),
    dobOrYear: n('string'),
    idLast4: n('string'),
    vendor: n('string'),
    amount: n('number'),
    months: n('number'),
    total: n('number'),
    isSample: { type: 'boolean' },
    notes: n('string')
  }
};
SCHEMA.required = Object.keys(SCHEMA.properties);

const SYSTEM = `You read photos of Indian documents for a loan-preparation helper. Return only what is visible.
- docType: aadhaar, pan, passbook (bank passbook first page or statement header), quotation (a supplier quote or bill for machines/materials), income_proof (dairy society milk statement, SHG ledger, supplier receipts showing months of income), shop_photo (a workplace or signboard), or other.
- readable: false if blurred, too dark, glare covers key text, or cut off; put the reason in issue (short, plain English).
- name: the account holder or card holder name in capital letters exactly as printed. For a quotation, name is the customer name if printed.
- idLast4: ONLY the last 4 digits of any ID or account number. Never return a full ID or account number.
- vendor and amount: for a quotation, the seller and the total amount in rupees.
- months and total: for income_proof, how many months are covered and the total income shown, if visible.
- isSample: true if the document is marked SAMPLE, SPECIMEN or DEMO.
- notes: one short line of anything a bank officer should know (for example "handwritten", "no seal").`;

export default async function handler(req, res) {
  const g = guard(req); if (g) return sendError(res, g === 'Use POST.' ? 405 : 429, g);
  const b = body(req);
  if (typeof b.image !== 'string' || b.image.length < 1000) return sendError(res, 400, 'No photo received.');
  if (b.image.length > 4_000_000) return sendError(res, 413, 'The photo is too large.');
  try {
    if (MOCK) {
      const e = b.expected;
      const names = { aadhaar: 'LAKSHMAMMA B', pan: 'LAKSHMAMMA B', passbook: 'LAKSHMI B', quotation: null };
      return sendJson(res, { docType: e || 'other', readable: true, issue: null, name: names[e] || null, dobOrYear: e === 'aadhaar' ? '1988' : null, idLast4: e === 'quotation' ? null : '4821', vendor: e === 'quotation' ? 'Ganesh Sewing Machines' : null, amount: e === 'quotation' ? 300000 : null, months: e === 'income_proof' ? 12 : null, total: e === 'income_proof' ? 246500 : null, isSample: true, notes: 'Mock reading' });
    }
    const mime = /^data:/.test(b.image) ? '' : 'data:image/jpeg;base64,';
    const out = await chatJSON({
      system: SYSTEM,
      vision: true,
      messages: [{ role: 'user', content: [
        { type: 'text', text: `The owner was asked for: ${String(b.expected || 'a document').slice(0, 40)}. Read this photo.` },
        { type: 'image_url', image_url: { url: mime + b.image, detail: 'auto' } }
      ] }],
      schemaName: 'doc_read', schema: SCHEMA, maxTokens: 400, temperature: 0
    });
    if (out.idLast4) out.idLast4 = String(out.idLast4).replace(/\D/g, '').slice(-4) || null;
    return sendJson(res, out);
  } catch (e) {
    console.error(e);
    return sendError(res, e.status === 429 ? 429 : 502, errorMessage(e, 'Could not read the photo. Please try again.'));
  }
}
