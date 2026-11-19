// Saathi live app: owner's chat (voice or text, real AI) beside the bank officer's dashboard.
import * as E from './engine.js';
const { fmt, fmtK, pctS } = E;

/* ---------- small helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nowStr = () => new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ICONS = {
  mic: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v3"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="2"/>',
  send: '<path d="M4 12l16-8-6 16-2.5-6.5L4 12z"/>',
  speaker: '<path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  mute: '<path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M16 9l5 6M21 9l-5 6"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
  q: '<path d="M9.5 9.5a2.5 2.5 0 0 1 4.9.6c0 1.6-2.4 2-2.4 3.4M12 17h.01"/>',
  alert: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-4.5"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  play: '<path d="M8 5v14l11-7z"/>', restart: '<path d="M4 12a8 8 0 1 0 2.3-5.6L4 8.7"/><path d="M4 4v4.7h4.7"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  bank: '<path d="M3 10h18L12 4 3 10zM5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  cc: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 13h4M13 13h4M7 16h7"/>',
  pin: '<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  badge: '<path d="M12 2l2.4 2.2 3.2-.4.9 3.1 2.9 1.5-1 3.1 1 3.1-2.9 1.5-.9 3.1-3.2-.4L12 22l-2.4-2.2-3.2.4-.9-3.1-2.9-1.5 1-3.1-1-3.1 2.9-1.5.9-3.1 3.2.4z"/><path d="M8.8 12l2.2 2.2 4.2-4.2"/>'
};
const ic = (n, cls = '') => `<svg class="ic ${n === 'play' ? 'fill' : ''} ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;

/* ---------- copy in three languages ---------- */
const T = {
  greet: { kn: 'ನಮಸ್ಕಾರ! ನಾನು ಸಾಥಿ. ಸಾಲ ಮತ್ತು ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ಕಾಗದಪತ್ರ ಕೆಲಸಕ್ಕೆ ನಿಮ್ಮ ಸಹಾಯಕ. ಯಾವ ಭಾಷೆಯಲ್ಲಿ ಮಾತಾಡೋಣ?', en: 'Namaskara! I am Saathi, your helper for loan and government scheme paperwork. Which language shall we talk in?', hi: 'नमस्ते! मैं साथी हूँ, लोन और सरकारी योजनाओं के कागज़ी काम में आपका सहायक। किस भाषा में बात करें?' },
  trust: { kn: 'ಮೊದಲು ಒಂದು ಮಾತು: ಸಾಥಿ ಎಂದಿಗೂ ನಿಮ್ಮಿಂದ ಹಣ, UPI PIN ಅಥವಾ ಬ್ಯಾಂಕ್ OTP ಕೇಳುವುದಿಲ್ಲ. ಯಾರಾದರೂ ಕೇಳಿದರೆ, ಅದು ಮೋಸ. ನೀವು ಹಾಕುವ ಕೋಡ್ ಒಂದೇ: ನಿಮ್ಮ ಒಪ್ಪಿಗೆ ದೃಢಪಡಿಸಲು ಸಾಥಿ ಕಳಿಸುವ ಕೋಡ್.', en: 'First, one promise: Saathi will never ask you for money, your UPI PIN or your bank OTP. If anyone asks, it is a fraud. The only code you enter is the one Saathi sends to confirm your own choices.', hi: 'पहले एक वादा: साथी आपसे कभी पैसे, UPI PIN या बैंक OTP नहीं माँगेगा। अगर कोई माँगे, तो वह धोखा है। आप सिर्फ़ वही कोड डालेंगे जो साथी आपकी अपनी मंज़ूरी पक्की करने के लिए भेजे।' },
  howto: { kn: 'ಮೈಕ್ ಒತ್ತಿ ಮಾತಾಡಿ, ಅಥವಾ ಟೈಪ್ ಮಾಡಿ. ಬೇಗ ನೋಡಲು, ಕೆಳಗಿನ ಮಾದರಿ ಮಾಲೀಕರಲ್ಲಿ ಒಬ್ಬರನ್ನು ಆರಿಸಬಹುದು.', en: 'Tap the mic and speak, or type. To try it quickly, you can pick one of the sample owners below.', hi: 'माइक दबाकर बोलिए, या टाइप कीजिए। जल्दी देखने के लिए नीचे किसी नमूना मालिक को चुन सकते हैं।' },
  summary: { kn: 'ನಾನು ಅರ್ಥ ಮಾಡಿಕೊಂಡಿದ್ದು ಇದು. ಸರಿ ಇದೆಯಾ?', en: 'Here is what I understood. Is it right?', hi: 'मैंने यह समझा। क्या यह सही है?' },
  fixAsk: { kn: 'ಏನು ತಪ್ಪಿದೆ ಹೇಳಿ.', en: 'Tell me what is wrong.', hi: 'बताइए क्या गलत है।' },
  consent: { kn: 'ನಿಮ್ಮ ಸಾಲದ ಫೈಲ್ ಮಾಡಲು, ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಯ 12 ತಿಂಗಳ ವ್ಯವಹಾರ ನೋಡಲು ನಿಮ್ಮ ಒಪ್ಪಿಗೆ ಬೇಕು. ಇದು ಈ ಫೈಲ್‌ಗೆ ಮಾತ್ರ. ನೀವು ಆರಿಸುವ ಬ್ಯಾಂಕ್ ಮಾತ್ರ ನೋಡುತ್ತೆ. ಯಾವಾಗ ಬೇಕಾದರೂ "ನನ್ನ ಮಾಹಿತಿ ಅಳಿಸಿ" ಅಂತ ಹೇಳಬಹುದು.', en: 'To prepare your loan file, I need your permission to see 12 months of your bank transactions. Only for this file. Only the bank you choose will see it. You can say "delete my data" at any time.', hi: 'आपकी लोन फ़ाइल बनाने के लिए मुझे आपके बैंक खाते के 12 महीने के लेन-देन देखने की इजाज़त चाहिए। सिर्फ़ इसी फ़ाइल के लिए। सिर्फ़ आपका चुना हुआ बैंक इसे देखेगा। आप कभी भी "मेरा डेटा मिटाओ" कह सकते हैं।' },
  code: { kn: 'ನಿಮ್ಮ ಫೋನ್‌ಗೆ ಬಂದ ಕೋಡ್ ದೃಢಪಡಿಸಿ.', en: 'Confirm the code sent to your phone.', hi: 'अपने फ़ोन पर आया कोड पक्का करें।' },
  csvAsk: { kn: 'ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಸ್ಟೇಟ್‌ಮೆಂಟ್ CSV ಫೈಲ್ ಆರಿಸಿ. ಅದನ್ನು ನಿಮ್ಮ ಫೋನ್‌ನಲ್ಲೇ ಓದಲಾಗುತ್ತೆ, ಎಲ್ಲೂ ಕಳಿಸುವುದಿಲ್ಲ.', en: 'Choose your bank statement CSV file. It is read on your device and not uploaded.', hi: 'अपनी बैंक स्टेटमेंट की CSV फ़ाइल चुनें। इसे आपके फ़ोन में ही पढ़ा जाता है, कहीं भेजा नहीं जाता।' },
  notNow: { kn: 'ಸರಿ. ಬ್ಯಾಂಕ್ ದಾಖಲೆ ಇಲ್ಲದೆ ಫೈಲ್ ಮಾಡಲು ಆಗಲ್ಲ. ಸಿದ್ಧವಾದಾಗ ಹೇಳಿ.', en: 'Okay. Without bank records I cannot prepare the file. Tell me when you are ready.', hi: 'ठीक है। बैंक रिकॉर्ड के बिना फ़ाइल नहीं बन सकती। जब तैयार हों, बताइए।' },
  goodChoice: { kn: 'ಒಳ್ಳೆ ನಿರ್ಧಾರ. ಸಮಯಕ್ಕೆ ಕಂತು ಕಟ್ಟಿದರೆ, ಒಂದು ವರ್ಷದ ನಂತರ ಹೆಚ್ಚು ಸಾಲ ಕೇಳಬಹುದು.', en: 'Good decision. If you repay on time, you can ask for more after a year.', hi: 'अच्छा फ़ैसला। समय पर किस्त भरेंगे तो एक साल बाद ज़्यादा लोन माँग सकते हैं।' },
  keepRisk: { kn: 'ಸರಿ, ಇದು ನಿಮ್ಮ ನಿರ್ಧಾರ. ಬ್ಯಾಂಕ್ ಸರಿಯಾದ ಕಂತು ಯೋಜನೆ ಮಾಡಲು ಈ ವಿಷಯವನ್ನು ಫೈಲ್‌ನಲ್ಲಿ ಬರೆಯುತ್ತೇನೆ.', en: 'Okay, it is your decision. I will note this in your file so the bank can plan a suitable repayment schedule.', hi: 'ठीक है, यह आपका फ़ैसला है। मैं फ़ाइल में यह लिख दूँगा ताकि बैंक सही किस्त योजना बना सके।' },
  noHistory: { kn: 'ಸರಿ. ಈಗ ಕಂತು ಸುರಕ್ಷಿತವೇ ಎಂದು ಹೇಳಲು ಆಗಲ್ಲ; ಬ್ಯಾಂಕ್ ಇದನ್ನು ಪರಿಶೀಲಿಸುತ್ತೆ.', en: 'Okay. I cannot yet say whether the instalment is safe; the bank will check this.', hi: 'ठीक है। अभी नहीं कह सकते कि किस्त सुरक्षित है या नहीं; बैंक इसकी जाँच करेगा।' },
  docsIntro: { kn: 'ಈಗ ದಾಖಲೆಗಳು. 20 ಪೇಪರ್ ಬೇಡ: ನೀವು ಕಳಿಸಬೇಕಾದ್ದು ಕೇವಲ 4 ಫೋಟೋ, ಉಳಿದದ್ದು ನಾನೇ ಮಾಡುತ್ತೇನೆ. ಈ ಡೆಮೊದಲ್ಲಿ ದಯವಿಟ್ಟು ಮಾದರಿ ದಾಖಲೆ ಬಳಸಿ.', en: 'Now documents. Not 20 papers: you only send 4 photos, and I prepare the rest. In this demo, please use the sample documents.', hi: 'अब दस्तावेज़। 20 कागज़ नहीं: आपको सिर्फ़ 4 फ़ोटो भेजनी हैं, बाकी मैं बनाऊँगा। इस डेमो में कृपया नमूना दस्तावेज़ इस्तेमाल करें।' },
  docsDone: { kn: 'ನಿಮ್ಮ ದಾಖಲೆಗಳು ಸಿದ್ಧ. ನಾನು ಮಾಡಿದ ದಾಖಲೆಗಳು ಇಲ್ಲಿವೆ.', en: 'Your documents are ready. Here are the documents I prepared.', hi: 'आपके दस्तावेज़ तैयार हैं। ये रहे मेरे बनाए दस्तावेज़।' },
  ivOffer: { kn: 'ಬ್ಯಾಂಕ್ ಮ್ಯಾನೇಜರ್ ಏನು ಕೇಳ್ತಾರೆ ಅಂತ ಅಭ್ಯಾಸ ಮಾಡೋಣವಾ? ನಾನು ಮ್ಯಾನೇಜರ್ ಆಗಿ ಮಾತಾಡ್ತೀನಿ.', en: 'Shall we practise what the bank manager will ask? I will play the manager.', hi: 'क्या हम अभ्यास करें कि बैंक मैनेजर क्या पूछेंगे? मैं मैनेजर बनकर बात करूँगा।' },
  ivDone: { kn: 'ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ! ನೀವು ಬ್ಯಾಂಕ್ ಭೇಟಿಗೆ ತಯಾರು.', en: 'Very good! You are ready for the bank visit.', hi: 'बहुत बढ़िया! आप बैंक जाने के लिए तैयार हैं।' },
  editAsk: { kn: 'ಏನು ಬದಲಾಯಿಸಬೇಕು ಹೇಳಿ, ಉದಾಹರಣೆಗೆ "ಎರಡು ಲಕ್ಷ ಮಾಡಿ".', en: 'Tell me what to change, for example "make it 2 lakh".', hi: 'बताइए क्या बदलना है, जैसे "2 लाख कर दो"।' },
  unclear: { kn: 'ಕ್ಷಮಿಸಿ, ಅರ್ಥ ಆಗಲಿಲ್ಲ. ಕಳಿಸಬೇಕಾದರೆ "ಹೌದು" ಎನ್ನಿ.', en: 'Sorry, I did not catch that. Say "yes" to send it.', hi: 'माफ़ कीजिए, समझ नहीं आया। भेजना हो तो "हाँ" कहिए।' },
  notSent: { kn: 'ಸರಿ, ಕಳಿಸಿಲ್ಲ. ಸಿದ್ಧವಾದಾಗ ಹೇಳಿ.', en: 'Okay, I have not sent it. Tell me when you are ready.', hi: 'ठीक है, नहीं भेजा। जब तैयार हों, बताइए।' },
  sent: { kn: 'ಕಳಿಸಲಾಗಿದೆ! ಬ್ಯಾಂಕ್ ನೋಡಿದ ತಕ್ಷಣ ನಿಮಗೆ ಹೇಳುತ್ತೇನೆ.', en: 'Sent! I will tell you as soon as the bank opens it.', hi: 'भेज दिया! बैंक जैसे ही देखेगा, मैं आपको बताऊँगा।' },
  opened: { kn: 'ಬ್ಯಾಂಕ್ ನಿಮ್ಮ ಫೈಲ್ ತೆರೆಯಿತು. ಅವರ ಪ್ರಶ್ನೆಗಳಿಗೆ ನಾನೇ ಉತ್ತರಿಸುತ್ತೇನೆ, ನಿಮ್ಮ ಸಹಾಯ ಬೇಕಾದಾಗ ಮಾತ್ರ ಕೇಳುತ್ತೇನೆ.', en: 'The bank opened your file. I will answer their questions myself and only ask you when I need your help.', hi: 'बैंक ने आपकी फ़ाइल खोली। उनके सवालों के जवाब मैं खुद दूँगा, ज़रूरत होने पर ही आपसे पूछूँगा।' },
  bankDoc: { kn: 'ಬ್ಯಾಂಕ್ ನಿಮ್ಮ ಕೆಲಸದ ಸ್ಥಳದ ಫೋಟೋ ಕೇಳಿದೆ, ನಾಮಫಲಕ ಕಾಣುವಂತೆ.', en: 'The bank asked for a photo of your workplace with the signboard visible.', hi: 'बैंक ने आपकी दुकान/काम की जगह की फ़ोटो माँगी है, बोर्ड दिखना चाहिए।' },
  bankDocSent: { kn: 'ಕಳಿಸಿದೆ. ಸಮಯ ಸೇರಿಸಲಾಗಿದೆ, ಆದ್ದರಿಂದ ಬ್ಯಾಂಕ್‌ಗೆ ಬೇರೆ ಭೇಟಿ ಬೇಕಾಗದಿರಬಹುದು.', en: 'Sent, with the time attached, so the bank may not need a separate field visit.', hi: 'भेज दिया, समय के साथ, ताकि बैंक को अलग से आने की ज़रूरत न पड़े।' },
  visit: { kn: 'ಬ್ಯಾಂಕ್ ಭೇಟಿ ಬುಕ್ ಆಗಿದೆ. ಮೂಲ ಆಧಾರ್ ತನ್ನಿ. ಒಂದೇ ಭೇಟಿ ಸಾಕು.', en: 'Branch visit booked. Bring your original Aadhaar. One visit is enough.', hi: 'बैंक विज़िट बुक हो गई। असली आधार साथ लाइए। एक ही बार जाना काफ़ी है।' },
  sanction: { kn: 'ಅಭಿನಂದನೆಗಳು! ನಿಮ್ಮ ಸಾಲ ಮಂಜೂರಾಗಿದೆ (ಡೆಮೊ). ಪ್ರತಿ ಕಂತಿನ 3 ದಿನ ಮೊದಲು ನಾನು ನೆನಪಿಸುತ್ತೇನೆ.', en: 'Congratulations! Your loan is sanctioned (demo). I will remind you 3 days before every instalment.', hi: 'बधाई हो! आपका लोन मंज़ूर हो गया (डेमो)। हर किस्त से 3 दिन पहले मैं याद दिलाऊँगा।' },
  del1: { kn: 'ಸಾಥಿಯಲ್ಲಿರುವ ನಿಮ್ಮ ಮಾಹಿತಿ ಅಳಿಸಬೇಕೇ? ಈಗಾಗಲೇ ಬ್ಯಾಂಕ್‌ಗೆ ಹೋದ ಅರ್ಜಿ ಬ್ಯಾಂಕ್‌ನ ನಿಯಮದಂತೆ ಅಲ್ಲೇ ಇರುತ್ತೆ.', en: 'Do you want me to delete your data from Saathi? An application already with the bank stays there under the bank\'s rules.', hi: 'क्या साथी से आपका डेटा मिटा दूँ? बैंक को भेजी गई अर्ज़ी बैंक के नियमों के अनुसार वहीं रहेगी।' },
  del2: { kn: 'ಆಯ್ತು. ನಿಮ್ಮ ಮಾತುಕತೆ ಮತ್ತು ದಾಖಲೆಗಳ ಫೋಟೋಗಳನ್ನು ಸಾಥಿಯಿಂದ ಅಳಿಸಲಾಗಿದೆ.', en: 'Done. Your conversation and document photos have been deleted from Saathi.', hi: 'हो गया। आपकी बातचीत और दस्तावेज़ों की फ़ोटो Saathi से मिटा दी गईं।' },
  del3: { kn: 'ಸರಿ, ಏನೂ ಅಳಿಸಿಲ್ಲ.', en: 'Okay, nothing was deleted.', hi: 'ठीक है, कुछ नहीं मिटाया।' },
  track: { kn: 'ನಿಮ್ಮ ಫೈಲ್ ಎಲ್ಲಿದೆ ಎಂದು ಇಲ್ಲಿದೆ.', en: 'Here is where your file is.', hi: 'आपकी फ़ाइल कहाँ है, यह रहा।' }
};
const DOCNAME = {
  aadhaar: { kn: 'ಆಧಾರ್ ಕಾರ್ಡ್', en: 'Aadhaar card', hi: 'आधार कार्ड' },
  pan: { kn: 'ಪ್ಯಾನ್ ಕಾರ್ಡ್', en: 'PAN card', hi: 'पैन कार्ड' },
  passbook: { kn: 'ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್ ಮೊದಲ ಪುಟ', en: 'bank passbook (first page)', hi: 'बैंक पासबुक का पहला पन्ना' },
  quotation: { kn: 'ಮಷೀನ್ ಅಥವಾ ಸಾಮಾನಿನ ಕೊಟೇಶನ್', en: 'quotation for the machines or materials', hi: 'मशीन या सामान का कोटेशन' }
};
const C = {
  agree: { kn: 'ಹೌದು, ಒಪ್ಪುತ್ತೇನೆ', en: 'Yes, I agree', hi: 'हाँ, मंज़ूर है' },
  csv: { kn: 'ಸ್ಟೇಟ್‌ಮೆಂಟ್ CSV ಹಾಕಿ', en: 'Upload statement (CSV)', hi: 'स्टेटमेंट CSV डालें' },
  notNow: { kn: 'ಈಗ ಬೇಡ', en: 'Not now', hi: 'अभी नहीं' },
  confirm: { kn: 'ಕೋಡ್ ದೃಢಪಡಿಸಿ', en: 'Confirm code', hi: 'कोड पक्का करें' },
  correct: { kn: 'ಸರಿ ಇದೆ', en: 'Yes, correct', hi: 'हाँ, सही है' },
  fix: { kn: 'ಬದಲಾಯಿಸಬೇಕು', en: 'Change something', hi: 'कुछ बदलना है' },
  why: { kn: 'ಯಾಕೆ?', en: 'Why?', hi: 'क्यों?' },
  next: { kn: 'ಮುಂದೆ', en: 'Continue', hi: 'आगे' },
  photo: { kn: 'ಫೋಟೋ ತೆಗೆಯಿರಿ', en: 'Take photo', hi: 'फ़ोटो लें' },
  sample: { kn: 'ಮಾದರಿ ದಾಖಲೆ ಬಳಸಿ', en: 'Use sample document', hi: 'नमूना दस्तावेज़' },
  skip: { kn: 'ಬಿಡಿ', en: 'Skip', hi: 'छोड़ें' },
  note: { kn: 'ಬ್ಯಾಂಕ್‌ಗೆ ಟಿಪ್ಪಣಿ ಸೇರಿಸಿ', en: 'Add a note for the bank', hi: 'बैंक के लिए नोट जोड़ें' },
  practise: { kn: 'ಹೌದು, ಅಭ್ಯಾಸ ಮಾಡೋಣ', en: "Yes, let's practise", hi: 'हाँ, अभ्यास करें' },
  send: { kn: 'ಹೌದು, ಕಳಿಸಿ', en: 'Yes, send it', hi: 'हाँ, भेज दो' },
  change: { kn: 'ಏನಾದರೂ ಬದಲಾಯಿಸಿ', en: 'Change something', hi: 'कुछ बदलें' },
  retry: { kn: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ', en: 'Try again', hi: 'फिर कोशिश करें' },
  proof: { kn: 'ಆದಾಯದ ಪುರಾವೆ ಫೋಟೋ', en: 'Add income proof (photo)', hi: 'आय का सबूत (फ़ोटो)' },
  proofSample: { kn: 'ಮಾದರಿ ಡೈರಿ ಸ್ಟೇಟ್‌ಮೆಂಟ್', en: 'Use sample dairy statement', hi: 'नमूना डेयरी स्टेटमेंट' },
  later: { kn: 'ನಂತರ', en: 'Later', hi: 'बाद में' },
  agreeQ: { kn: 'ನಾನು ಏನು ಒಪ್ಪಿದೆ?', en: 'What did I agree to?', hi: 'मैंने किस बात की मंज़ूरी दी?' },
  where: { kn: 'ನನ್ನ ಫೈಲ್ ಎಲ್ಲಿದೆ?', en: 'Where is my file?', hi: 'मेरी फ़ाइल कहाँ है?' },
  del: { kn: 'ನನ್ನ ಮಾಹಿತಿ ಅಳಿಸಿ', en: 'Delete my data', hi: 'मेरा डेटा मिटाओ' },
  yesDel: { kn: 'ಹೌದು, ಅಳಿಸಿ', en: 'Yes, delete', hi: 'हाँ, मिटाओ' },
  noKeep: { kn: 'ಬೇಡ', en: 'No, keep it', hi: 'नहीं' }
};
const SAMPLES = [
  { id: 'tailor', label: 'Lakshmamma · tailor',
    kn: 'ನನ್ನ ಹೆಸರು ಲಕ್ಷ್ಮಮ್ಮ ಬಿ, ಕೋಲಾರದ ವೇಮಗಲ್. ನಾಲ್ಕು ವರ್ಷದಿಂದ ಟೈಲರಿಂಗ್ ಮಾಡ್ತೀನಿ, ಬ್ಲೌಸ್ ಮತ್ತು ಶಾಲೆ ಯೂನಿಫಾರ್ಮ್. ತಿಂಗಳಿಗೆ ಮೂವತ್ತೈದರಿಂದ ನಲವತ್ತು ಸಾವಿರ, ಹೆಚ್ಚಾಗಿ UPI ಅಲ್ಲಿ. ಎರಡು ಇಂಡಸ್ಟ್ರಿಯಲ್ ಮಷೀನ್ ಮತ್ತು ಒಂದು ಎಂಬ್ರಾಯ್ಡರಿ ಮಷೀನ್‌ಗೆ ಮೂರು ಲಕ್ಷ ಬೇಕು; ಆಮೇಲೆ ತಿಂಗಳಿಗೆ ಸುಮಾರು ಹನ್ನೆರಡು ಸಾವಿರ ಹೆಚ್ಚು ಬರಬಹುದು. ಬಡ್ಡಿ ವ್ಯಾಪಾರಿ ಹತ್ತಿರ ನಲವತ್ತು ಸಾವಿರ ಸಾಲ ಇದೆ, ತಿಂಗಳಿಗೆ ನೂರಕ್ಕೆ ಮೂರು ರೂಪಾಯಿ.',
    en: 'My name is Lakshmamma B, from Vemgal in Kolar. I have done tailoring for four years, blouses and school uniforms. I earn 35 to 40 thousand a month, mostly by UPI. I need 3 lakh for two industrial machines and one embroidery machine; after that I could earn about 12 thousand more a month. I owe a moneylender 40 thousand at 3 rupees per hundred per month.' },
  { id: 'welder', label: 'Manjunath · new welding unit',
    kn: 'ನಾನು ಮಂಜುನಾಥ್ ಆರ್, ಮಾಲೂರು. ಐದು ವರ್ಷ ವೆಲ್ಡಿಂಗ್ ಕೆಲಸ ಮಾಡಿದೀನಿ; ಈಗ ನನ್ನದೇ ಗ್ರಿಲ್ ಮತ್ತು ಗೇಟ್ ಯೂನಿಟ್ ಶುರು ಮಾಡಬೇಕು, ಒಟ್ಟು ಒಂಬತ್ತೂವರೆ ಲಕ್ಷ ಖರ್ಚು. ಈಗ ಜಾಬ್ ವರ್ಕ್‌ನಿಂದ ತಿಂಗಳಿಗೆ ಇಪ್ಪತ್ತೈದು ಸಾವಿರ, ಎಲ್ಲಾ UPI. ಯೂನಿಟ್ ಶುರುವಾದ ಮೇಲೆ ತಿಂಗಳಿಗೆ ನಲವತ್ತು ಸಾವಿರ ಹೆಚ್ಚು ಬರಬಹುದು. ಯಾವ ಸಾಲ ಇಲ್ಲ. ವಯಸ್ಸು ಇಪ್ಪತ್ತೊಂಬತ್ತು, ಹತ್ತನೇ ತರಗತಿ ಪಾಸ್.',
    en: 'I am Manjunath R from Malur. I have done welding work for five years; now I want to start my own grill and gate unit, total cost 9.5 lakh. I earn 25 thousand a month from job work, all UPI. Once the unit starts I could earn 40 thousand more a month. No loans. I am 29 and passed 10th standard.' },
  { id: 'shg', label: 'Gowramma · SHG snack unit',
    kn: 'ನಾನು ಗೌರಮ್ಮ ಎಸ್, ಮುಳಬಾಗಿಲು. ಸ್ವಸಹಾಯ ಸಂಘದ ಸದಸ್ಯೆ. ಹೊಸ ಸಿರಿಧಾನ್ಯ ತಿಂಡಿ ಯೂನಿಟ್ ಶುರು ಮಾಡಬೇಕು, ಒಟ್ಟು ಹನ್ನೆರಡು ಲಕ್ಷ. ಈಗ ತಿಂಗಳಿಗೆ ಹದಿನೆಂಟು ಸಾವಿರ, UPI ಅಲ್ಲಿ. ಯೂನಿಟ್‌ನಿಂದ ತಿಂಗಳಿಗೆ ಐವತ್ತು ಸಾವಿರ ಹೆಚ್ಚು ಬರಬಹುದು. ಸಂಘದ ಸಾಲ ಮಾತ್ರ, ತಿಂಗಳಿಗೆ ಒಂದೂವರೆ ಸಾವಿರ ಕಂತು. ವಯಸ್ಸು ಮೂವತ್ತನಾಲ್ಕು, ಹತ್ತನೇ ತರಗತಿ, OBC.',
    en: 'I am Gowramma S from Mulbagal, a self-help group member. I want to start a new millet snack unit, total cost 12 lakh. I earn 18 thousand a month now, by UPI. The unit could add 50 thousand a month. Only an SHG loan, 1,500 a month instalment. I am 34, passed 10th, OBC.' },
  { id: 'dairy', label: 'Shivanna · dairy, mostly cash',
    kn: 'ನಾನು ಶಿವಣ್ಣ ಕೆ, ಬಂಗಾರಪೇಟೆ. ಏಳು ವರ್ಷದಿಂದ ಮೂರು ಹಸು, ಹಾಲು ಊರಿನ ಡೈರಿಗೆ. ತಿಂಗಳಿಗೆ ಇಪ್ಪತ್ತು ಸಾವಿರ. ಬ್ಯಾಂಕ್ ಖಾತೆ ಐದು ತಿಂಗಳ ಹಿಂದೆ ತೆಗೆದೆ, ಮೊದಲು ಎಲ್ಲಾ ನಗದು. ಇನ್ನೂ ಎರಡು ಹಸುಗೆ ಒಂದೂವರೆ ಲಕ್ಷ ಬೇಕು; ತಿಂಗಳಿಗೆ ಏಳು ಸಾವಿರ ಹೆಚ್ಚು ಬರಬಹುದು. ಬಡ್ಡಿ ವ್ಯಾಪಾರಿ ಹತ್ತಿರ ಅರವತ್ತು ಸಾವಿರ, ನೂರಕ್ಕೆ ಐದು ರೂಪಾಯಿ.',
    en: 'I am Shivanna K from Bangarpet. For seven years I have kept three cows and supply milk to the village dairy. About 20 thousand a month. I opened my bank account five months ago; before that it was all cash. I need 1.5 lakh for two more cows and could earn 7 thousand more a month. I owe a moneylender 60 thousand at 5 rupees per hundred.' }
];

/* ---------- fixed-wording messages (no AI call; exact numbers guaranteed) ---------- */
const TM = {
  readback: (scheme, amt, n, emi, bank) => ({
    kn: `ಕಳಿಸುವ ಮೊದಲು ಓದಿ ಹೇಳುತ್ತೇನೆ: ${scheme} ಸಾಲ ${amt}, ${n} ತಿಂಗಳು, ಕಂತು ಸುಮಾರು ${emi}, ${bank} ಗೆ. ಕಳಿಸಲು "ಹೌದು" ಎನ್ನಿ. ನಿಮ್ಮ ಒಪ್ಪಿಗೆ ಇಲ್ಲದೆ ಏನೂ ಹೋಗುವುದಿಲ್ಲ.`,
    hi: `भेजने से पहले पढ़कर सुनाता हूँ: ${scheme} लोन ${amt}, ${n} महीने, किस्त लगभग ${emi}, ${bank} को। भेजने के लिए "हाँ" कहिए। आपकी मंज़ूरी के बिना कुछ नहीं जाएगा।`,
    en: `Before sending, let me read it back: ${scheme} loan of ${amt}, for ${n} months, instalment about ${emi}, to ${bank}. Say "yes" to send it. Nothing goes without your yes.` }),
  affordOk: (amt, emi) => ({
    kn: `ನೀವು ಕೇಳಿದ ${amt} ನಿಮ್ಮ ಆದಾಯಕ್ಕೆ ಸರಿ ಹೊಂದುತ್ತೆ. ಕಂತು ಸುಮಾರು ${emi}, ನಿಮ್ಮ ಕಡಿಮೆ ಸಂಪಾದನೆಯ ತಿಂಗಳಲ್ಲೂ ಕಟ್ಟಬಹುದು.`,
    hi: `आपका ${amt} का लोन आपकी आमदनी में ठीक बैठता है। किस्त लगभग ${emi} है, जो सबसे कम कमाई वाले महीने में भी भरी जा सकती है।`,
    en: `The ${amt} loan fits your income. The instalment is about ${emi}, payable even in your slowest month.` }),
  unreadable: reason => ({
    kn: 'ಫೋಟೋ ಸರಿಯಾಗಿ ಓದಲು ಆಗಲಿಲ್ಲ. ಕಿಟಕಿ ಹತ್ತಿರ ಬೆಳಕಿನಲ್ಲಿ, ಕಾರ್ಡ್ ಪೂರ್ತಿ ಕಾಣುವಂತೆ ಮತ್ತೆ ತೆಗೆಯಿರಿ.',
    hi: 'फ़ोटो ठीक से पढ़ी नहीं गई। खिड़की के पास रोशनी में, पूरा कार्ड दिखे ऐसे फिर से लीजिए।',
    en: `I could not read the photo${reason ? ` (${reason})` : ''}. Please take it again near a window, with the whole card in the frame.` }),
  wrongDoc: dn => ({
    kn: `ಈ ಫೋಟೋ ${dn.kn} ತರಹ ಕಾಣುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ${dn.kn} ಫೋಟೋ ಕಳಿಸಿ.`,
    hi: `यह फ़ोटो ${dn.hi} जैसी नहीं लग रही। कृपया ${dn.hi} की फ़ोटो भेजें।`,
    en: `This photo does not look like your ${dn.en}. Please send a photo of your ${dn.en}.` }),
  docfix: (nameA, dn, nameB, different) => ({
    kn: `ಒಂದು ಸಮಸ್ಯೆ ಕಂಡಿತು: ಆಧಾರ್‌ನಲ್ಲಿ "${nameA}" ಇದೆ, ${dn.kn} ನಲ್ಲಿ "${nameB}" ಇದೆ. ಬ್ಯಾಂಕ್ ಇದನ್ನು ಕೇಳುತ್ತೆ. ಪರಿಹಾರ: ಬ್ಯಾಂಕ್ ಭೇಟಿಯಲ್ಲಿ ಆಧಾರ್ ತೋರಿಸಿ, ಹೆಸರು ಸರಿಪಡಿಸಲು ಹೇಳಿ (KYC ಅಪ್‌ಡೇಟ್). ನಾನು ಬ್ಯಾಂಕ್‌ಗೆ ಮುಂಚೆಯೇ ಟಿಪ್ಪಣಿ ಬರೆಯುತ್ತೇನೆ.${different ? ' ಇವು ಬೇರೆ ಬೇರೆ ವ್ಯಕ್ತಿಗಳ ದಾಖಲೆ ಇರಬಹುದು; ನಿಮ್ಮದೇ ದಾಖಲೆ ಕಳಿಸಿದ್ದೀರಾ ನೋಡಿ.' : ''}`,
    hi: `एक दिक्कत मिली: आधार पर "${nameA}" है और ${dn.hi} पर "${nameB}"। बैंक इसके बारे में पूछेगा। हल: बैंक जाते समय आधार दिखाकर नाम ठीक करवाइए (KYC अपडेट)। मैं बैंक के लिए पहले से नोट लिख दूँगा।${different ? ' ये अलग-अलग लोगों के दस्तावेज़ हो सकते हैं; देखिए कि आपने अपना ही दस्तावेज़ भेजा है।' : ''}`,
    en: `I found one problem: your Aadhaar says "${nameA}" but your ${dn.en} says "${nameB}". The bank will ask about this. The fix: at your branch visit, show your Aadhaar and ask them to update the name (a KYC update). I will add a note for the bank in advance.${different ? ' These may be different people, so please check you sent your own document.' : ''}` }),
  plan: m => ({
    kn: `ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಯಲ್ಲಿ ಕೇವಲ ${m} ತಿಂಗಳ ವ್ಯವಹಾರ ಇದೆ. ಬ್ಯಾಂಕ್‌ಗಳು ಸಾಮಾನ್ಯವಾಗಿ 6 ರಿಂದ 12 ತಿಂಗಳ ದಾಖಲೆ ನೋಡುತ್ತವೆ. ಆದರೆ ಸುಲಭ ದಾರಿ ಇದೆ: ಡೈರಿ ಸಂಘದ ಸ್ಟೇಟ್‌ಮೆಂಟ್, ಸಂಘದ ಲೆಡ್ಜರ್ ಅಥವಾ ಬಿಲ್‌ಗಳಂತಹ ಬೇರೆ ಆದಾಯದ ಪುರಾವೆ ತನ್ನಿ.`,
    hi: `आपके बैंक खाते में सिर्फ़ ${m} महीने के लेन-देन हैं। बैंक आमतौर पर 6 से 12 महीने का रिकॉर्ड देखते हैं। लेकिन आसान रास्ता है: डेयरी सोसाइटी का स्टेटमेंट, SHG लेजर या बिल जैसे आय के दूसरे सबूत लाइए।`,
    en: `Your bank account shows only ${m} months of transactions. Banks usually look for 6 to 12 months. But there is an easy way: bring other proof of income, such as a dairy society statement, SHG ledger or supplier bills.` }),
  proofShort: n => ({
    kn: `ಈ ಪುರಾವೆಯಲ್ಲಿ ${n ? `ಕೇವಲ ${n} ತಿಂಗಳು` : 'ತಿಂಗಳುಗಳ ಮಾಹಿತಿ'} ಇದೆ; ಕನಿಷ್ಠ 6 ತಿಂಗಳು ಬೇಕು.`,
    hi: `इस सबूत में ${n ? `सिर्फ़ ${n} महीने` : 'महीनों की जानकारी नहीं'} है; कम से कम 6 महीने चाहिए।`,
    en: `This proof covers ${n ? `only ${n} months` : 'an unclear number of months'}; at least 6 months are needed.` }),
  proofOk: (months, before, after) => ({
    kn: `ಪುರಾವೆ ಸಿಕ್ಕಿತು: ${months} ತಿಂಗಳು. ನಿಮ್ಮ ತಯಾರಿ ಅಂಕ ${before} ರಿಂದ ${after}ಕ್ಕೆ ಏರಿತು.`,
    hi: `सबूत मिल गया: ${months} महीने। आपकी तैयारी का स्कोर ${before} से बढ़कर ${after} हो गया।`,
    en: `Proof received: ${months} months. Your readiness rose from ${before} to ${after}.` }),
  subsidy: (own, sub, loan) => ({
    kn: `PMEGP ಅಡಿ ನೀವು ಹಾಕಬೇಕಾದ್ದು ${own} ಮಾತ್ರ. ಸರ್ಕಾರ ${sub} ಸಬ್ಸಿಡಿ ಕೊಡುತ್ತೆ, ಬ್ಯಾಂಕ್ ಸಾಲ ${loan}. ಸಬ್ಸಿಡಿಗೆ ಮೊದಲು EDP ತರಬೇತಿ ಮುಗಿಸಬೇಕು, ನಾನು ನೆನಪಿಸುತ್ತೇನೆ.`,
    hi: `PMEGP में आपको सिर्फ़ ${own} लगाने हैं। सरकार ${sub} की सब्सिडी देती है, बैंक लोन ${loan}। सब्सिडी से पहले EDP ट्रेनिंग पूरी करनी होगी, मैं याद दिलाऊँगा।`,
    en: `Under PMEGP you put in only ${own}. The government adds a ${sub} subsidy, and the bank loan is ${loan}. You must finish EDP training before the subsidy is released. I will remind you.` })
};
// Recognise a plain yes / no / change without an AI call; only unclear replies go to the AI.
function quickIntent(t) {
  const s = ' ' + String(t || '').toLowerCase().replace(/[.!,?।]/g, ' ') + ' ';
  if (/ (no|nahi|nahin|beda|bēḍa|illa|ಬೇಡ|ಇಲ್ಲ|नहीं|मत) /.test(s)) return 'no';
  if (/(change|badal|ಬದಲ|बदल)/.test(s)) return 'change';
  if (/ (yes|haan|han|ha|ok|okay|sari|houdu|haudu|kalisi|send|ಹೌದು|ಸರಿ|ಕಳಿಸಿ|ಓಕೆ|हाँ|हां|ठीक|भेज|भेजो|भेज दो) /.test(s) || /(ಹೌದು|ಕಳಿಸಿ|हाँ|भेज)/.test(s)) return 'yes';
  return null;
}

/* ---------- state ---------- */
const S = {
  lang: 'kn', subs: true, voice: true, profile: E.emptyProfile(), turns: [], cash: null, consentAt: null, approvedAt: null, openedAt: null,
  keptRisk: false, docs: {}, docNote: false, practiced: false, bankDocs: null, visit: null, sanctioned: null, audit: [], tab: 'cluster',
  peek: false, whatIf: null, wiOpen: false, view: 'phone', report: null, proofAdded: false
};
const audit = text => { S.audit.push({ t: nowStr(), text }); };
const tr = obj => obj[S.lang] || obj.en;
const msgOf = obj => ({ local: tr(obj), en: obj.en });

/* ---------- API ---------- */
async function api(path, payload) {
  let r;
  try { r = await fetch('/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); }
  catch { throw new Error('No internet connection. Check your network and try again.'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Server error (${r.status}).`);
  return j;
}
/** Calls the API; on failure shows the error with a Try again button and retries when tapped. */
async function apiRetry(path, payload, label) {
  for (let fails = 0; ; ) {
    const th = thinking(label);
    try { const out = await api(path, payload); th.remove(); return out; }
    catch (e) {
      th.remove(); fails++;
      addEl('msg err', esc(e.message));
      // After two failures, offer the scripted demo so a judge is never stuck.
      const chips = [{ id: 'retry', label: tr(C.retry) }];
      if (fails >= 2) chips.push({ id: 'demo', label: 'Open the scripted demo' });
      const r = await ask({ chips, free: false });
      if (r.id === 'demo') { location.href = '/demo'; await new Promise(() => { }); }
    }
  }
}
const toMsg = o => ({ local: o.reply_local || o.reply_en || '', en: o.reply_en || o.reply_local || '' });
async function sayKind(kind, facts, opts = {}) {
  const o = await apiRetry('agent', { task: 'say', kind, facts, lang: S.lang }, 'Saathi is thinking');
  return bot(toMsg(o), opts);
}

/* ---------- saved session (no login) ---------- */
// Each browser gets a random id. The conversation, bank actions and photos are saved under it for 7 days.
const LS_KEY = 'saathi_sid';
function newSid() { return crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''); }
function lsGet() { try { return localStorage.getItem(LS_KEY); } catch { return null; } }
function lsSet(v) { SIDV = v || newSid(); try { if (v) localStorage.setItem(LS_KEY, v); else localStorage.removeItem(LS_KEY); } catch { /* storage blocked */ } }
let SIDV = lsGet() || newSid();
function forget() { started = false; clearTimeout(saveTimer); }
function sess(action, extra = {}) {
  return fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, sid: SIDV, ...extra }) })
    .then(r => (r.ok ? r.json() : {})).catch(() => ({}));
}
let started = false, saveTimer = null;
const TRANSIENT = ['tab', 'peek', 'whatIf', 'wiOpen', 'view'];
function save() {
  if (!started) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!started) return;
    try { localStorage.setItem(LS_KEY, SIDV); } catch { /* storage blocked */ }
    const state = {}; for (const k of Object.keys(S)) if (!TRANSIENT.includes(k)) state[k] = S[k];
    const copy = feed.cloneNode(true); copy.querySelectorAll('.thinking').forEach(n => n.remove());
    sess('save', { state, feed: copy.innerHTML });
  }, 800);
}
async function uploadPhoto(doc, blob) {
  if (!blob) return;
  try { const image = await blobToB64(blob); const r = await sess('photo-put', { doc, image }); if (r.ok) { S.photos = { ...(S.photos || {}), [doc]: true }; save(); renderDash(); } } catch { /* storing the photo is optional */ }
}
async function pollEvents() {
  if (!started || S.stage !== 'post') return;
  const r = await sess('events');
  for (const ev of r.events || []) externalEvent(ev.type);
}
function restoreFeed() {
  feed.querySelectorAll('.thinking').forEach(n => n.remove());
  feed.querySelectorAll('.msg.bot').forEach(el => { if (el.dataset.l) el._m = { local: el.dataset.l, en: el.dataset.e || el.dataset.l }; });
  feed.querySelectorAll('.vn button').forEach(b => { b.outerHTML = ic('mic'); });
  feed.querySelectorAll('img[src^="blob:"]').forEach(im => im.remove());
  scrollFeed();
}

/* ---------- chat rendering ---------- */
const feed = $('#feed'), chipsEl = $('#chips'), micBtn = $('#micBtn'), tbox = $('#tbox'), sendBtn = $('#sendBtn'), micHint = $('#micHint');
function scrollFeed() { requestAnimationFrame(() => { feed.scrollTop = feed.scrollHeight; }); }
function addEl(cls, html) { const el = document.createElement('div'); el.className = cls; el.innerHTML = html; feed.appendChild(el); scrollFeed(); return el; }
function langCls(l) { return l === 'kn' ? 'kn' : l === 'hi' ? 'hi' : ''; }
function textBlock(m) {
  const pri = `<div class="pri ${langCls(S.lang)}">${esc(m.local)}</div>`;
  return pri + (S.subs && S.lang !== 'en' && m.en && m.en !== m.local ? `<div class="sub">${esc(m.en)}</div>` : '');
}
function rerenderTexts() { $$('.msg').forEach(el => { if (el._m) { const tb = el.querySelector('.tb'); if (tb) tb.innerHTML = textBlock(el._m); } }); }
function bot(m, o = {}) {
  const el = document.createElement('div'); el.className = 'msg bot'; el._m = m;
  el.innerHTML = (o.role ? `<span class="role">${esc(o.role)}</span>` : '') + `<div class="tb">${textBlock(m)}</div>${tsBot()}<button class="say" type="button" aria-label="Read this message aloud">${ic('speaker')}</button>`;
  el.dataset.l = m.local; el.dataset.e = m.en;
  feed.appendChild(el);
  if (o.card) addCard(o.card, o.cardId);
  scrollFeed();
  queueSpeak(m);
  return el;
}
function addCard(html, id) { const c = document.createElement('div'); c.className = 'ccard'; if (id) c.id = id; c.innerHTML = html; feed.appendChild(c); scrollFeed(); return c; }
function addUserText(text) { const el = document.createElement('div'); el.className = 'msg user'; el.innerHTML = `<div class="pri ${/[ಀ-೿]/.test(text) ? 'kn' : /[ऀ-ॿ]/.test(text) ? 'hi' : ''}">${esc(text)}</div>${tsUser()}`; feed.appendChild(el); scrollFeed(); }
function waveHtml(seed) { let s = ''; for (let i = 0; i < 24; i++) s += `<i style="height:${4 + Math.round(Math.abs(Math.sin(i * 1.7 + seed) + Math.sin(i * .6)) * 7)}px"></i>`; return s; }
function addUserVoice(text, url, secs) {
  const el = document.createElement('div'); el.className = 'msg user';
  el.innerHTML = `<div class="vn">${url ? `<button class="say" type="button" style="position:static" aria-label="Play your voice note">${ic('play')}</button>` : ic('mic')}<span class="wave">${waveHtml(text.length)}</span><span class="dur">0:${String(Math.max(1, Math.min(59, Math.round(secs)))).padStart(2, '0')}</span></div><div class="pri ${/[ಀ-೿]/.test(text) ? 'kn' : /[ऀ-ॿ]/.test(text) ? 'hi' : ''}">${esc(text)}</div>${tsUser()}`;
  if (url) el.querySelector('button').addEventListener('click', () => { const a = new Audio(url); a.play().catch(() => { }); });
  feed.appendChild(el); scrollFeed();
}
function addUserPhoto(url, cap, blob) {
  const el = document.createElement('div'); el.className = 'msg user'; el.style.padding = '5px';
  el.innerHTML = `<div class="photo">${url ? `<img src="${url}" alt="">` : '<div class="ph"><em>Photo</em></div>'}<div class="cap">${ic('camera')}${esc(cap)}</div></div>`;
  feed.appendChild(el); scrollFeed();
  // Keep a small copy in the chat so it survives a refresh.
  if (blob) thumbUrl(blob).then(d => { const im = el.querySelector('img'); if (im && d) { im.src = d; save(); } });
}
async function thumbUrl(blob) {
  try { const bmp = await createImageBitmap(blob); const k = Math.min(1, 300 / Math.max(bmp.width, bmp.height)); const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height); return cv.toDataURL('image/jpeg', 0.6); } catch { return null; }
}
function thinking(label = 'Saathi is thinking') {
  const el = addEl('thinking', `<i></i><i></i><i></i><span>${esc(label)}…</span>`);
  setTimeout(() => { if (el.isConnected) el.querySelector('span').textContent = `${label}… still working, a few more seconds`; }, 7000);
  return el;
}
const hhmm = () => new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const tsBot = () => `<span class="ts">${hhmm()}</span>`;
const tsUser = () => `<span class="ts">${hhmm()} <b class="tick">✓✓</b></span>`;

/* ---------- voice out (OpenAI TTS through /api/speak) ---------- */
const ttsCache = new Map(); const speakQ = []; let speaking = false; let curAudio = null;
async function ttsUrl(text) {
  if (ttsCache.has(text)) return ttsCache.get(text);
  const j = await api('speak', { text, lang: S.lang });
  if (!j.audio) return null;
  const bin = Uint8Array.from(atob(j.audio), c => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bin], { type: 'audio/mpeg' }));
  ttsCache.set(text, url); return url;
}
function playUrl(url) { return new Promise(res => { stopAudio(false); curAudio = new Audio(url); curAudio.onended = res; curAudio.onerror = res; curAudio.play().catch(res); }); }
function stopAudio(clear = true) { if (clear) speakQ.length = 0; if (curAudio) { curAudio.pause(); curAudio = null; } if (clear) { try { speechSynthesis.cancel(); } catch { /* no speech support */ } } }
// Server voice only when the server offers it (OpenAI); otherwise the browser's own voices speak, at no cost.
let CFG = { serverTts: false, provider: '' };
fetch('/api/config').then(r => r.json()).then(c => { CFG = c; }).catch(() => { });
function pickVoice(lang) {
  try {
    const vs = speechSynthesis.getVoices();
    const pref = lang === 'kn' ? ['kn'] : lang === 'hi' ? ['hi'] : ['en-in', 'en-gb', 'en'];
    for (const p of pref) { const v = vs.find(x => x.lang && x.lang.toLowerCase().replace('_', '-').startsWith(p)); if (v) return v; }
  } catch { /* no speech support */ }
  return null;
}
try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); } catch { /* ignore */ }
let noVoiceNoted = false;
function browserSpeak(m) {
  return new Promise(res => {
    try {
      if (!('speechSynthesis' in window)) return res();
      let lang = S.lang, text = m.local, v = pickVoice(lang);
      if (!v && lang !== 'en') {
        text = m.en; v = pickVoice('en');
        if (!noVoiceNoted) { noVoiceNoted = true; addEl('msg note', `This device has no ${lang === 'kn' ? 'Kannada' : 'Hindi'} voice installed, so Saathi reads the English line aloud. Most Android phones have one.`); }
      }
      const u = new SpeechSynthesisUtterance(String(text).replace(/₹/g, ''));
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = { kn: 'kn-IN', hi: 'hi-IN', en: 'en-IN' }[lang];
      u.rate = 0.95;
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      u.onend = fin; u.onerror = fin; setTimeout(fin, Math.min(25000, 1500 + text.length * 85));
      speechSynthesis.speak(u);
    } catch { res(); }
  });
}
async function sayOne(m) { if (CFG.serverTts) { const u = await ttsUrl(m.local); if (u) await playUrl(u); } else await browserSpeak(m); }
function queueSpeak(m) { if (!S.voice || !m.local) return; speakQ.push(m); if (!speaking) drainSpeak(); }
async function drainSpeak() { speaking = true; while (speakQ.length) { const m = speakQ.shift(); try { if (S.voice) await sayOne(m); } catch { /* voice is optional */ } } speaking = false; }
async function speakNow(m) { stopAudio(); try { await sayOne(m); } catch (e) { micHint.textContent = e.message; } }

/* ---------- input: chips, text, voice ---------- */
const IN = { res: null, events: false };
let recState = null;
function setBar(free, hint) {
  tbox.disabled = !free; sendBtn.disabled = !free; micBtn.disabled = !free || !canRecord();
  micHint.innerHTML = hint || (free ? (canRecord() ? '<b>Tap the mic</b> to speak, or type your answer.' : 'Type your answer. (Voice needs a browser with microphone support.)') : 'Choose an option above.');
}
function ask({ chips = [], free = true, hint, events = false } = {}) {
  return new Promise(res => {
    chipsEl.innerHTML = '';
    IN.res = v => { IN.res = null; IN.events = false; chipsEl.innerHTML = ''; setBar(false, 'Saathi is working…'); res(v); };
    IN.events = events;
    chips.forEach(ch => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (ch.ghost ? ' ghost' : '') + (/[ಀ-೿]/.test(ch.label) ? ' kn' : '');
      b.innerHTML = (ch.icon ? ic(ch.icon) : '') + esc(ch.label);
      b.addEventListener('click', () => IN.res && IN.res({ id: ch.id, text: ch.label, via: 'chip' }));
      chipsEl.appendChild(b);
    });
    setBar(free, hint);
  });
}
function sendText() {
  const v = tbox.value.trim(); if (!v || !IN.res) return;
  tbox.value = ''; autosize(); addUserText(v); IN.res({ id: null, text: v, via: 'text' });
}
sendBtn.addEventListener('click', sendText);
tbox.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } });
function autosize() { tbox.style.height = 'auto'; tbox.style.height = Math.min(96, tbox.scrollHeight) + 'px'; }
tbox.addEventListener('input', autosize);
// Voice in: the browser's own speech recognition when available (free, no AI call); otherwise record and send to the server.
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let srBroken = false, srState = null;
const canRecord = () => !!((SR && !srBroken) || (navigator.mediaDevices && window.MediaRecorder));
function startRecognition() {
  const rec = new SR();
  rec.lang = { kn: 'kn-IN', hi: 'hi-IN', en: 'en-IN' }[S.lang];
  rec.interimResults = true; rec.maxAlternatives = 1;
  rec.continuous = !/Android|iPhone|iPad/i.test(navigator.userAgent);
  const st = { rec, final: '', start: Date.now(), err: null }; srState = st;
  rec.onresult = e => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) st.final += t + ' '; else interim += t; }
    tbox.value = (st.final + interim).trim(); autosize();
  };
  rec.onerror = e => { st.err = e.error; };
  rec.onend = () => {
    srState = null; clearTimeout(st.timer);
    micBtn.classList.remove('rec'); micBtn.innerHTML = ic('mic'); $('#recbar').hidden = true;
    const text = (st.final || tbox.value).trim(); tbox.value = ''; autosize();
    if (st.err === 'not-allowed' || st.err === 'service-not-allowed') { addEl('msg err', 'Microphone permission was blocked. You can type your answer instead.'); setBar(true); return; }
    if (st.err === 'network' || st.err === 'language-not-supported') { srBroken = true; }
    if (!text) { addEl('msg err', srBroken ? 'This browser could not recognise speech. Tap the mic again to record a voice note instead, or type.' : 'I did not hear any words. Tap the mic and speak, or type your answer.'); setBar(true); return; }
    addUserVoice(text, null, (Date.now() - st.start) / 1000);
    IN.res && IN.res({ id: null, text, via: 'voice' });
  };
  st.timer = setTimeout(() => { try { rec.stop(); } catch { /* already stopped */ } }, 45000);
  try { rec.start(); } catch { srState = null; srBroken = true; return; }
  micBtn.classList.add('rec'); micBtn.innerHTML = ic('stop'); $('#recbar').hidden = false; tbox.disabled = true;
  const tick = () => { if (srState !== st) return; $('#recText').textContent = `Listening… ${Math.round((Date.now() - st.start) / 1000)}s · tap again when you finish`; setTimeout(tick, 500); }; tick();
}
micBtn.addEventListener('click', async () => {
  if (srState) { try { srState.rec.stop(); } catch { /* ignore */ } return; }
  if (recState) return stopRecording();
  if (!IN.res) return;
  stopAudio();
  if (SR && !srBroken) return startRecognition();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported?.(t)) || '';
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    recState = { rec, stream, chunks, start: Date.now(), timer: setTimeout(stopRecording, 45000) };
    rec.start();
    micBtn.classList.add('rec'); micBtn.innerHTML = ic('stop'); $('#recbar').hidden = false; tbox.disabled = true;
    const tick = () => { if (!recState) return; $('#recText').textContent = `Listening… ${Math.round((Date.now() - recState.start) / 1000)}s · tap again to stop`; setTimeout(tick, 500); }; tick();
  } catch (e) {
    addEl('msg err', 'Microphone permission was blocked. You can type your answer instead.');
  }
});
async function stopRecording() {
  const st = recState; if (!st) return; recState = null; clearTimeout(st.timer);
  micBtn.classList.remove('rec'); micBtn.innerHTML = ic('mic'); $('#recbar').hidden = true;
  const done = new Promise(r => { st.rec.onstop = r; }); st.rec.stop(); await done; st.stream.getTracks().forEach(t => t.stop());
  const blob = new Blob(st.chunks, { type: st.rec.mimeType || 'audio/webm' });
  const secs = (Date.now() - st.start) / 1000;
  if (blob.size < 1500) { addEl('msg err', 'That was too short. Hold on a little longer while you speak.'); setBar(true); return; }
  setBar(false, 'Understanding your voice note…');
  const th = thinking('Listening to your voice note');
  try {
    const b64 = await blobToB64(blob);
    const { text } = await api('transcribe', { audio: b64, mime: blob.type, lang: S.lang });
    th.remove();
    if (!text) { addEl('msg err', 'I could not hear any words. Please try again or type.'); setBar(true); return; }
    addUserVoice(text, URL.createObjectURL(blob), secs);
    IN.res && IN.res({ id: null, text, via: 'voice' });
  } catch (e) { th.remove(); addEl('msg err', esc(e.message)); setBar(true); }
}
function blobToB64(blob) { return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(blob); }); }

/* ---------- photos ---------- */
function pickFile(input) {
  return new Promise(res => {
    input.value = '';
    let done = false;
    const finish = v => { if (done) return; done = true; input.removeEventListener('change', onChange); input.removeEventListener('cancel', onCancel); window.removeEventListener('focus', onFocus); res(v); };
    const onChange = () => finish(input.files && input.files[0] || null);
    const onCancel = () => finish(null);
    // Older browsers have no 'cancel' event: when the window regains focus with no file chosen, treat it as cancelled.
    const onFocus = () => setTimeout(() => { if (!input.files || !input.files.length) finish(null); }, 900);
    input.addEventListener('change', onChange); input.addEventListener('cancel', onCancel);
    setTimeout(() => window.addEventListener('focus', onFocus), 300);
    input.click();
  });
}
async function toJpeg(src, max = 1100) {
  const bmp = await createImageBitmap(src);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.86));
  return { blob, url: URL.createObjectURL(blob) };
}
function variantName(n) {
  const parts = String(n || 'LAKSHMAMMA B').toUpperCase().split(' ');
  const f = parts[0]; parts[0] = f.length > 6 ? f.slice(0, Math.max(5, f.length - 3)) + 'I' : f + 'A';
  return parts.join(' ');
}
/** Draws a clearly marked SAMPLE document so judges can test the vision step without real IDs. */
async function sampleDoc(kind) {
  const W = 960, H = 600; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const name = (S.profile.name || 'Lakshmamma B').toUpperCase();
  g.fillStyle = '#f7f5ef'; g.fillRect(0, 0, W, H);
  g.fillStyle = kind === 'pan' ? '#1f4e8c' : kind === 'passbook' ? '#0e5e57' : kind === 'aadhaar' ? '#9a3412' : kind === 'income_proof' ? '#4d7c0f' : '#334155';
  g.fillRect(0, 0, W, 96);
  g.fillStyle = '#fff'; g.font = 'bold 38px Arial';
  const titles = { aadhaar: 'AADHAAR (SAMPLE)', pan: 'PERMANENT ACCOUNT NUMBER CARD (SAMPLE)', passbook: 'DEMO BANK · SAVINGS PASSBOOK (SAMPLE)', quotation: 'QUOTATION (SAMPLE)', income_proof: 'VILLAGE DAIRY SOCIETY · MILK STATEMENT (SAMPLE)' };
  g.fillText(titles[kind] || 'DOCUMENT (SAMPLE)', 36, 62);
  g.fillStyle = '#111'; g.font = '32px Arial';
  const line = (t, y, b) => { g.font = (b ? 'bold ' : '') + '32px Arial'; g.fillText(t, 48, y); };
  if (kind === 'aadhaar') { line('Name: ' + name, 190, true); line('Year of birth: 1988', 250); line('Gender: ' + (S.profile.gender === 'M' ? 'Male' : 'Female'), 310); line('Number: XXXX XXXX 4821', 370, true); }
  if (kind === 'pan') { line('Name: ' + name, 190, true); line("Father's name: B NARAYANAPPA", 250); line('Date of birth: 01/06/1988', 310); line('PAN: XXXXX4821X', 370, true); }
  if (kind === 'passbook') { line('Account holder: ' + variantName(name), 190, true); line('Branch: ' + (S.profile.place || 'Kolar') + ' (Demo Bank)', 250); line('Account no: XXXXXXXX7731', 310, true); line('IFSC: DEMO0001234', 370); }
  if (kind === 'quotation') {
    const amt = S.profile.acceptedAmount || E.schemeCalc(S.profile).projectCost || 300000;
    line('From: GANESH MACHINERY, KOLAR', 170, true); line('To: ' + name, 225); line('Items: ' + String(S.profile.loanPurpose || 'Machines').slice(0, 46), 285);
    line('Total (incl. GST): Rs ' + Math.round(amt).toLocaleString('en-IN'), 345, true); line('Valid for 30 days', 405);
  }
  if (kind === 'income_proof') {
    line('Member: ' + name, 160, true); line('Period: 12 months, Nov 2025 to Oct 2026', 215);
    line('Litres supplied: 6,840', 270); line('Total paid: Rs 2,46,500', 325, true); line('Average per month: Rs 20,540', 380);
  }
  g.save(); g.translate(W / 2, H / 2 + 60); g.rotate(-0.28); g.font = 'bold 110px Arial'; g.fillStyle = 'rgba(200,0,0,0.13)'; g.textAlign = 'center'; g.fillText('SAMPLE', 0, 0); g.restore();
  g.fillStyle = '#666'; g.font = '22px Arial'; g.fillText('Specimen for testing only. Not a real document.', 48, H - 36);
  const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.9));
  return { blob, url: URL.createObjectURL(blob) };
}

/* ---------- conversation flow ---------- */
const STAGES = ['lang', 'intake', 'consent', 'results', 'afford', 'docs', 'interview', 'approve', 'post'];
const STEP = {
  lang: async () => {
    addEl('daychip', 'Today');
    bot({ local: T.greet.kn, en: T.greet.en });
    const l = await ask({ chips: [{ id: 'kn', label: 'ಕನ್ನಡ' }, { id: 'hi', label: 'हिन्दी' }, { id: 'en', label: 'English' }], free: false });
    addUserText(l.text); setLang(l.id);
    bot(msgOf(T.trust));
  },
  intake: () => intake(),
  consent: () => consent(),
  results: async () => { const a = await results(); if (a.afford.status === 'insufficient' && !S.proofDecided) await incomeProof(a); S.proofDecided = true; },
  afford: () => afford(E.analyze(S.profile, S.cash)),
  docs: () => documents(),
  interview: () => interview(),
  approve: () => approve(),
  post: () => postLoop()
};
async function run(from = 'lang') {
  for (let i = Math.max(0, STAGES.indexOf(from)); i < STAGES.length; i++) { S.stage = STAGES[i]; save(); await STEP[S.stage](); }
}

async function intake() {
  const handle = res => {
    S.profile = E.mergeProfile(S.profile, res.profile);
    const m = toMsg(res); bot(m); S.turns.push({ role: 'assistant', content: m.local });
    S.intakeDone = !!(res.done && S.profile.monthlyIncome && (S.profile.loanAmount || S.profile.projectCost));
    renderDash();
  };
  if (!S.turns.length) { bot(msgOf(T.howto)); handle(await apiRetry('agent', { task: 'intake', lang: S.lang, turns: [], profile: S.profile }, 'Saathi is thinking')); }
  for (let n = 0; n < 18 && !S.intakeDone; n++) {
    // After a refresh the last saved turn may be the owner's answer; then Saathi simply replies to it.
    if (S.turns[S.turns.length - 1].role === 'assistant') {
      const chips = S.turns.filter(t => t.role === 'user').length === 0 ? SAMPLES.map(s => ({ id: 'sample:' + s.id, label: s.label, ghost: true })) : [];
      const inp = await ask({ chips });
      let text = inp.text;
      if (inp.id && inp.id.startsWith('sample:')) { const s = SAMPLES.find(x => 'sample:' + x.id === inp.id); text = S.lang === 'kn' ? s.kn : s.en; addUserText(text); }
      S.turns.push({ role: 'user', content: text }); save();
    }
    handle(await apiRetry('agent', { task: 'intake', lang: S.lang, turns: S.turns, profile: S.profile }, 'Saathi is thinking'));
  }
  // Show what was understood and let the owner correct it.
  for (;;) {
    bot(msgOf(T.summary), { card: understoodCard() });
    const r = await ask({ chips: [{ id: 'ok', label: tr(C.correct) }, { id: 'fix', label: tr(C.fix) }] });
    if (r.id === 'ok') { addUserText(r.text); break; }
    let text = r.text;
    if (r.id === 'fix') { addUserText(r.text); bot(msgOf(T.fixAsk)); const f = await ask({}); text = f.text; }
    S.turns.push({ role: 'user', content: 'Correction: ' + text });
    const res2 = await apiRetry('agent', { task: 'intake', lang: S.lang, turns: S.turns, profile: S.profile }, 'Updating');
    S.profile = E.mergeProfile(S.profile, res2.profile); S.turns.push({ role: 'assistant', content: res2.reply_local || '' });
  }
  audit('Owner confirmed the details Saathi understood from the conversation');
}

function understoodCard() {
  const p = S.profile; const sch = E.schemeCalc(p);
  const loans = (p.existingLoans || []).length ? p.existingLoans.map(l => `${l.source}${l.amount ? ' ' + fmt(l.amount) : ''}${l.monthlyRatePct ? ` at ${l.monthlyRatePct}%/month` : ''}${l.emi ? `, EMI ${fmt(l.emi)}` : ''}`).join('; ') : (p.existingLoans ? 'None' : 'Not asked');
  const rows = [
    ['Name', p.name], ['Business', p.activity], ['Type', p.isNewVenture ? 'New unit' : p.isNewVenture === false ? `Running ${p.yearsInBusiness ?? '?'} years` : null],
    ['Income', p.monthlyIncome ? fmt(p.monthlyIncome) + ' a month' : null], ['Paid by', { mostly_upi: 'Mostly UPI', mixed: 'UPI and cash', mostly_cash: 'Mostly cash' }[p.paymentMode]],
    [p.isNewVenture ? 'Project cost' : 'Loan needed', fmt(sch.projectCost)], ['For', p.loanPurpose], ['Extra income expected', p.expectedExtraIncome ? fmt(p.expectedExtraIncome) + ' a month' : null],
    ['Current loans', loans], ['Place', p.place ? `${p.place}${p.area ? ` (${p.area})` : ''}` : p.area]
  ].filter(r => r[1] != null && r[1] !== '');
  return `<div class="ctitle">${ic('user')} What Saathi understood</div><dl class="kv understood">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
}

async function consent() {
  for (;;) {
    bot(msgOf(T.consent), { card: `<div class="ctitle">${ic('shield')} Your consent</div><dl class="kv"><dt>What</dt><dd>Bank transactions, last 12 months</dd><dt>Why</dt><dd>Only to prepare this loan file</dd><dt>Who sees it</dt><dd>You, and the bank branch you choose</dd><dt>How long</dt><dd>90 days, then deleted</dd><dt>How</dt><dd>Account Aggregator (RBI-regulated). Sandbox in this demo.</dd></dl><div class="fine">Say "delete my data" any time to withdraw.</div>` });
    const r = await ask({ chips: [{ id: 'yes', label: tr(C.agree) }, { id: 'csv', label: tr(C.csv) }, { id: 'no', label: tr(C.notNow) }], free: false });
    addUserText(r.text);
    if (r.id === 'no') { bot(msgOf(T.notNow)); continue; }
    if (r.id === 'csv') {
      bot(msgOf(T.csvAsk), { card: `<div class="fine" style="margin:0">Columns needed: Date, Credit (or Deposit), Debit (or Withdrawal), optional Narration. <a href="/sample-statement.csv" download>Download a sample CSV</a></div>` });
      const pick = await ask({ chips: [{ id: 'pick', label: tr(C.csv), icon: 'file' }, { id: 'back', label: tr(C.agree) + ' (sandbox)' }], free: false });
      if (pick.id === 'back') { await codeStep(); S.cash = E.sandboxStatement(S.profile); break; }
      const f = await pickFile($('#csvInput'));
      if (!f) continue;
      try { S.cash = E.parseStatementCSV(await f.text(), S.profile.monthlyIncome); addUserText(`📄 ${f.name}`); break; }
      catch (e) { addEl('msg err', esc(e.message) + ' You can try another file or use the sandbox.'); continue; }
    }
    await codeStep();
    S.cash = E.sandboxStatement(S.profile);
    break;
  }
  const c = addCard(`<div class="ctitle">${ic('bank')} Getting bank data <span class="tag">${S.cash.source === 'csv' ? 'your file' : 'sandbox'}</span></div><div class="bar"><i></i></div>`);
  await sleep(1200);
  const a = E.analyze(S.profile, S.cash);
  c.innerHTML = `<div class="ctitle">${ic('bank')} Bank data received</div><dl class="kv"><dt>Months</dt><dd>${a.n} with transactions</dd><dt>Average in</dt><dd>${fmt(a.avgIn)} a month</dd><dt>Source</dt><dd>${esc(S.cash.note)}</dd></dl>`;
  S.consentAt = nowStr(); audit(`Consent given: 12 months of bank data, this loan file only, 90 days (${S.cash.source === 'csv' ? 'statement uploaded' : 'code confirmed'})`);
  const tmpl = { kn: `ನಿಮ್ಮ ${a.n} ತಿಂಗಳ ವ್ಯವಹಾರ ಸಿಕ್ಕಿತು. ತಿಂಗಳಿಗೆ ಸರಾಸರಿ ${fmt(a.avgIn)} ಬರುತ್ತೆ.`, en: `I have ${a.n} months of your transactions. On average ${fmt(a.avgIn)} comes in each month.`, hi: `आपके ${a.n} महीने के लेन-देन मिल गए। हर महीने औसतन ${fmt(a.avgIn)} आता है।` };
  bot(msgOf(tmpl)); renderDash();
}
async function codeStep() {
  bot(msgOf(T.code), { card: `<div class="otp"><div class="otp-boxes"><span>4</span><span>8</span><span>2</span><span>1</span></div><div class="otp-note">Demo code: no SMS is sent in this demo</div></div>` });
  await ask({ chips: [{ id: 'ok', label: tr(C.confirm) }], free: false });
  const box = feed.querySelectorAll('.otp'); const last = box[box.length - 1]; last.classList.add('done'); last.querySelector('.otp-note').innerHTML = ic('check') + ' Code confirmed';
}

function schemeFacts(a) {
  return a.elig.map(s => { const fail = s.checks.find(c => c.ok === false); const chk = s.checks.find(c => c.ok === null); return { scheme: s.name, status: s.status, reason: s.status === 'eligible' ? s.simpleOk : s.status === 'check' ? (chk ? chk.t : s.simpleCheck) : (fail ? fail.simple || fail.t : 'Not eligible') }; });
}
async function results() {
  const a = E.analyze(S.profile, S.cash);
  await sayKind('result', { schemes: schemeFacts(a), recommended: a.rec ? a.rec.name : null, collateral: 'No property needed for MUDRA loans and CGTMSE-covered loans' }, { card: schemesCard(a) });
  if (S.profile.isNewVenture && a.elig.find(s => s.id === 'pmegp' && s.status !== 'not')) {
    bot(msgOf(TM.subsidy(fmt(a.sch.own), fmt(a.sch.subsidy), fmt(a.sch.bankLoan))), { card: subsidyCard(a) });
  }
  const mr = (S.profile.existingLoans || []).find(l => l.source === 'moneylender' && l.monthlyRatePct)?.monthlyRatePct || 3;
  const ml = a.amount * mr / 100 * 12, bk = E.firstYearInterest(a.amount, E.RATE, a.tenure);
  bot(msgOf({ kn: `ಹೋಲಿಕೆ: ಬಡ್ಡಿ ವ್ಯಾಪಾರಿಯಿಂದ ${fmt(a.amount)} ತೆಗೆದುಕೊಂಡರೆ ವರ್ಷಕ್ಕೆ ಸುಮಾರು ${fmt(ml)} ಬಡ್ಡಿ. ಈ ಸಾಲದಲ್ಲಿ ಮೊದಲ ವರ್ಷ ಸುಮಾರು ${fmt(bk)}.`, en: `Compare: borrowing ${fmt(a.amount)} from a moneylender at ${mr}% a month costs about ${fmt(ml)} in interest a year. This loan costs about ${fmt(bk)} in the first year.`, hi: `तुलना: साहूकार से ${fmt(a.amount)} लेने पर साल का ब्याज लगभग ${fmt(ml)}। इस लोन में पहले साल लगभग ${fmt(bk)}।` }),
    { card: `<div class="ctitle">${ic('alert')} Interest in one year on ${fmt(a.amount)}</div><div class="mini-bars"><div class="mb"><span>Moneylender</span><span class="tr"><i style="width:100%;background:var(--bad)"></i></span><b class="num">${fmt(ml)}</b></div><div class="mb"><span>Bank loan</span><span class="tr"><i style="width:${Math.max(4, bk / ml * 100).toFixed(0)}%;background:var(--good)"></i></span><b class="num">${fmt(bk)}</b></div></div><div class="fine">Bank rate is an indicative 11% a year; the actual rate depends on the bank.</div>` });
  const w = await ask({ chips: [{ id: 'why', label: tr(C.why) }, { id: 'next', label: tr(C.next) }], free: false });
  addUserText(w.text);
  if (w.id === 'why') {
    await sayKind('reasons', { readiness: `${a.score}/100 (${a.band.label})`, strengths: a.reasons.pos.slice(0, 2).map(f => E.reasonText(f, true)), improve: a.reasons.neg[0] ? E.reasonText(a.reasons.neg[0], false) : null, tip: a.reasons.neg[0] ? E.TIPS[a.reasons.neg[0].id] : null });
  }
  return a;
}
async function incomeProof(a) {
  bot(msgOf(TM.plan(a.history)), { card: `<div class="ctitle">${ic('clock')} Your 90-day plan</div><ol class="steps"><li><b>This week</b><span>Bring other proof of income: a dairy society statement, SHG ledger or supplier bills.</span></li><li><b>Every week</b><span>Keep payments coming into your bank account.</span></li><li><b>In 90 days</b><span>Saathi checks your file again automatically.</span></li></ol>` });
  for (;;) {
    const r = await ask({ chips: [{ id: 'photo', label: tr(C.proof), icon: 'camera' }, { id: 'sample', label: tr(C.proofSample) }, { id: 'later', label: tr(C.later) }], free: false });
    if (r.id === 'later') { addUserText(r.text); return a; }
    const img = r.id === 'sample' ? await sampleDoc('income_proof') : await pickPhoto();
    if (!img) continue;
    addUserPhoto(img.url, r.id === 'sample' ? 'Sample statement' : 'Income proof', img.blob); uploadPhoto('income_proof', img.blob);
    const d = await readDoc(img.blob, 'income_proof');
    if (!d.readable) { bot(msgOf(TM.unreadable(d.issue))); continue; }
    const months = Math.max(0, Math.min(36, Math.round(d.months || 0)));
    if (months < 6) { bot(msgOf(TM.proofShort(months))); continue; }
    const before = a.score;
    S.profile.bankAccountMonths = months; const prevSource = S.cash.source;
    S.cash = E.sandboxStatement({ ...S.profile, paymentMode: 'mostly_upi' }); S.cash.source = prevSource === 'csv' ? 'csv+proof' : 'sandbox+proof';
    S.cash.note = `Bank data plus ${months} months of other income proof (${d.docType === 'income_proof' ? 'income statement' : d.docType}).`;
    S.proofAdded = true; audit(`Other income proof added: ${months} months${d.total ? `, total ${fmt(d.total)}` : ''}`);
    const a2 = E.analyze(S.profile, S.cash);
    bot(msgOf(TM.proofOk(months, before, a2.score)));
    renderDash(); return a2;
  }
}
async function afford(a) {
  const req = a.amount;
  if (a.afford.status === 'reduce') {
    const rec = a.afford.recommended, emiRec = E.emiOf(rec, E.RATE, a.tenure), month = a.rows[a.leanI].full;
    await sayKind('afford_reduce', { askedAmount: fmt(req), askedInstalment: fmt(a.emi), saferAmount: fmt(rec), saferInstalment: fmt(emiRec), slowestMonth: month, months: a.tenure }, { card: affordCard(a, rec) });
    const r = await ask({ chips: [{ id: 'rec', label: `OK, ${fmt(rec)}` }, { id: 'keep', label: `${fmt(req)}` }], free: false });
    addUserText(r.text);
    if (r.id === 'rec') { S.profile.acceptedAmount = rec; audit(`Owner chose the safer amount ${fmt(rec)} (asked for ${fmt(req)})`); bot(msgOf(T.goodChoice)); }
    else { S.profile.acceptedAmount = req; S.keptRisk = true; audit(`Owner kept ${fmt(req)} after the affordability warning`); bot(msgOf(T.keepRisk)); }
  } else if (a.afford.status === 'ok') {
    S.profile.acceptedAmount = req;
    bot(msgOf(TM.affordOk(fmt(req), fmt(a.emi))), { card: affordCard(a, null) });
  } else { S.profile.acceptedAmount = req; bot(msgOf(T.noHistory)); }
  renderDash();
}
async function pickPhoto() { const f = await pickFile($('#photoInput')); if (!f) return null; try { return await toJpeg(f); } catch { addEl('msg err', 'That file could not be opened as a photo.'); return null; } }
async function readDoc(blob, expected) { return apiRetry('read-doc', { image: await blobToB64(blob), expected }, 'Reading the document'); }

const DOC_LIST = ['aadhaar', 'pan', 'passbook', 'quotation'];
function docsCardHtml() {
  const row = id => { const d = S.docs[id]; const st = !d ? 'wait' : d.skipped ? 'chk' : d.flag ? 'flag' : 'ok';
    return `<div class="docrow">${stIcon(st)} <span>${esc(DOCNAME[id].en.replace(/^./, c => c.toUpperCase()))}${d && d.name ? ` · ${esc(d.name)}` : ''}${d && d.skipped ? ' · skipped' : ''}${d && d.flag ? ' · name differs' : ''}</span></div>`; };
  return `<div class="ctitle">${ic('file')} Your document list</div><div class="subhead">You send 4 photos</div><div class="doclist">${DOC_LIST.map(row).join('')}</div><div class="subhead">Saathi prepares</div><div class="doclist">${['Project report', 'Cash-flow statement (12 months)', 'Application form, pre-filled', 'Income summary'].map(t => `<div class="docrow">${stIcon(S.docNote || Object.keys(S.docs).length === 4 ? true : 'wait')} <span>${t}</span></div>`).join('')}</div>`;
}
async function documents() {
  if (!Object.keys(S.docs).length) bot(msgOf(T.docsIntro), { card: docsCardHtml(), cardId: 'docsCard' });
  const upd = () => { const el = document.getElementById('docsCard'); if (el) el.innerHTML = docsCardHtml(); renderDash(); };
  for (const id of DOC_LIST) {
    if (S.docs[id]) continue;
    const dn = DOCNAME[id];
    bot(msgOf({ kn: `${dn.kn} ಫೋಟೋ ಕಳಿಸಿ.`, en: `Send a photo of your ${dn.en}.`, hi: `अपने ${dn.hi} की फ़ोटो भेजें।` }));
    for (let tries = 0; ; tries++) {
      const r = await ask({ chips: [{ id: 'sample', label: tr(C.sample) }, { id: 'photo', label: tr(C.photo), icon: 'camera' }, { id: 'skip', label: tr(C.skip) }], free: false });
      if (r.id === 'skip') { addUserText(r.text); S.docs[id] = { skipped: true }; break; }
      const img = r.id === 'sample' ? await sampleDoc(id) : await pickPhoto();
      if (!img) continue;
      addUserPhoto(img.url, r.id === 'sample' ? 'Sample ' + dn.en : dn.en, img.blob);
      const d = await readDoc(img.blob, id);
      if (!d.readable) { bot(msgOf(TM.unreadable(d.issue))); continue; }
      if (d.docType !== id && d.docType !== 'other' && tries < 2) { bot(msgOf(TM.wrongDoc(dn))); continue; }
      S.docs[id] = { ...d, at: nowStr() }; uploadPhoto(id, img.blob); break;
    }
    upd();
  }
  // Cross-check names across documents.
  const base = S.docs.aadhaar?.name || S.docs.pan?.name;
  const issues = [];
  for (const id of ['pan', 'passbook']) {
    const d = S.docs[id]; if (!d || !d.name || !base || d === S.docs.aadhaar) continue;
    const c = E.compareNames(base, d.name);
    if (c === 'variation' || c === 'different') { d.flag = c; issues.push({ id, c }); }
  }
  upd();
  if (issues.length && !S.docNote) {
    const i = issues[0];
    bot(msgOf(TM.docfix(base, DOCNAME[i.id], S.docs[i.id].name, i.c === 'different')));
    const r = await ask({ chips: [{ id: 'note', label: tr(C.note) }], free: false }); addUserText(r.text);
    S.docNote = true; audit(`Name difference (Aadhaar "${base}" vs ${DOCNAME[i.id].en} "${S.docs[i.id].name}") explained; note added for the bank`);
  }
  S.docNote = true; upd();
  bot(msgOf(T.docsDone), { card: `<div class="ctitle">${ic('file')} Prepared by Saathi</div><div class="doclist"><div class="docrow">${stIcon(true)} <span style="flex:1">Project report</span><button class="linkbtn" type="button" data-doc="report">Preview</button></div><div class="docrow">${stIcon(true)} <span style="flex:1">Cash-flow statement</span><button class="linkbtn" type="button" data-doc="cash">Preview</button></div><div class="docrow">${stIcon(true)} <span>Application form, pre-filled</span></div><div class="docrow">${stIcon(true)} <span>Income summary</span></div></div>` });
}
function factsForCoach() {
  const a = E.analyze(S.profile, S.cash);
  return { business: S.profile.activity, monthlyIncome: fmt(a.avgIn), loan: fmt(a.amount), purpose: S.profile.loanPurpose, instalment: fmt(a.emi), slowestMonth: a.rows[a.leanI]?.full, existingLoans: (S.profile.existingLoans || []).map(l => `${l.source} ${l.amount ? fmt(l.amount) : ''}`), expectedExtraIncome: a.extra ? fmt(a.extra) : null };
}
async function interview() {
  if (S.practiced) return;
  bot(msgOf(T.ivOffer));
  const r = await ask({ chips: [{ id: 'yes', label: tr(C.practise) }, { id: 'skip', label: tr(C.skip) }], free: false });
  addUserText(r.text); if (r.id === 'skip') return;
  const facts = factsForCoach();
  // The coach's feedback and the manager's next question come back in one AI call.
  let qm = toMsg(await apiRetry('agent', { task: 'iv_ask', index: 0, facts, lang: S.lang }, 'The manager is thinking'));
  for (let i = 0; i < 3; i++) {
    bot(qm, { role: 'Practice · Bank manager' });
    const ans = await ask({ hint: '<b>Answer as you would in the bank</b>: tap the mic or type.' });
    const fb = await apiRetry('agent', { task: 'iv_feedback', facts, question: qm.en, answer: ans.text, nextIndex: i < 2 ? i + 1 : null, lang: S.lang }, 'Saathi is listening');
    bot(toMsg(fb), { role: `Saathi coach · ${fb.rating || 'okay'}` });
    if (i < 2) qm = fb.next_local ? { local: fb.next_local, en: fb.next_en || fb.next_local } : toMsg(await apiRetry('agent', { task: 'iv_ask', index: i + 1, facts, lang: S.lang }, 'The manager is thinking'));
  }
  S.practiced = true; audit('Completed practice interview (3 questions)'); bot(msgOf(T.ivDone));
}
function bankBranch() { return `Demo Bank, ${(S.profile.place || 'local').split(',')[0].trim()} branch`; }
async function approve() {
  if (S.approvedAt) return;
  for (;;) {
    const a = E.analyze(S.profile, S.cash);
    const scheme = a.rec ? a.rec.name : 'MUDRA';
    bot(msgOf(TM.readback(scheme, fmt(a.amount), a.tenure, fmt(a.emi), bankBranch())), { card: summaryCard(a) });
    const r = await ask({ chips: [{ id: 'yes', label: tr(C.send) }, { id: 'change', label: tr(C.change) }], hint: '<b>Say "yes"</b> with the mic, type it, or tap a button.' });
    let intent = r.id;
    if (r.via === 'chip') addUserText(r.text);
    else { intent = quickIntent(r.text) || (await apiRetry('agent', { task: 'confirm', text: r.text }, 'Checking')).intent; }
    if (intent === 'yes') break;
    if (intent === 'no') { bot(msgOf(T.notSent)); await ask({ chips: [{ id: 'yes', label: tr(C.send) }], free: false }); continue; }
    if (intent === 'unclear') { bot(msgOf(T.unclear)); continue; }
    bot(msgOf(T.editAsk));
    const ch = await ask({});
    S.turns.push({ role: 'user', content: 'Change to the application: ' + ch.text });
    const res = await apiRetry('agent', { task: 'intake', lang: S.lang, turns: S.turns, profile: S.profile }, 'Updating');
    const prevLoan = E.schemeCalc(S.profile).bankLoan;
    S.profile = E.mergeProfile(S.profile, res.profile);
    if (E.schemeCalc(S.profile).bankLoan !== prevLoan) S.profile.acceptedAmount = E.schemeCalc(S.profile).bankLoan;
    S.turns.push({ role: 'assistant', content: res.reply_local || '' });
  }
  await codeStep();
  S.approvedAt = nowStr(); audit('Owner heard the full application read back and approved it (yes + code)');
  renderDash(); flashBank();
  bot(msgOf(T.sent));
  await sleep(1600); S.openedAt = nowStr(); audit('Bank opened the file'); renderDash(); bot(msgOf(T.opened));
}
async function postLoop() {
  for (;;) {
    const r = await ask({ chips: [{ id: 'agree', label: tr(C.agreeQ) }, { id: 'track', label: tr(C.where) }, { id: 'del', label: tr(C.del) }], events: true, hint: 'Ask Saathi something, or act on the bank dashboard.' });
    if (r.via === 'chip') addUserText(r.text);
    if (r.id === 'agree') {
      bot(msgOf({ kn: `ನೀವು ಒಪ್ಪಿದ್ದು: 12 ತಿಂಗಳ ಬ್ಯಾಂಕ್ ವ್ಯವಹಾರ ನೋಡಲು, ಈ ಸಾಲದ ಫೈಲ್‌ಗಾಗಿ ಮಾತ್ರ. ${bankBranch()} ಮಾತ್ರ ನೋಡುತ್ತೆ. 90 ದಿನಗಳ ನಂತರ ಅಳಿಸಲಾಗುತ್ತೆ. ಒಪ್ಪಿದ ಸಮಯ: ${S.consentAt}.`, en: `You agreed to: Saathi seeing 12 months of bank transactions, only for this loan file. Only ${bankBranch()} sees it. It is deleted after 90 days. You agreed on ${S.consentAt}.`, hi: `आपने मंज़ूरी दी: 12 महीने के बैंक लेन-देन देखने की, सिर्फ़ इस लोन फ़ाइल के लिए। सिर्फ़ ${bankBranch()} देखेगा। 90 दिन बाद मिटा दिया जाएगा। मंज़ूरी का समय: ${S.consentAt}।` }));
    } else if (r.id === 'track') {
      const items = [['Sent to bank', S.approvedAt], ['Bank opened the file', S.openedAt], ['Bank asked for a photo', S.bankDocs?.t], ['Branch visit booked', S.visit], ['Loan sanctioned', S.sanctioned]];
      bot(msgOf(T.track), { card: `<div class="ctitle">${ic('clock')} Your file</div><div class="doclist">${items.map(([l, v]) => `<div class="docrow">${stIcon(v ? true : 'wait')} <span style="flex:1">${l}</span><small class="num" style="color:var(--muted)">${v || ''}</small></div>`).join('')}</div>` });
    } else if (r.id === 'del') {
      bot(msgOf(T.del1)); const d = await ask({ chips: [{ id: 'y', label: tr(C.yesDel) }, { id: 'n', label: tr(C.noKeep) }], free: false }); addUserText(d.text);
      if (d.id === 'y') { forget(); await sess('delete'); lsSet(null); bot(msgOf(T.del2)); } else bot(msgOf(T.del3));
    } else if (r.id === 'ev:doc') {
      bot(msgOf(T.bankDoc));
      for (;;) {
        const p = await ask({ chips: [{ id: 'photo', label: tr(C.photo), icon: 'camera' }, { id: 'sample', label: tr(C.sample) }], free: false });
        const img = p.id === 'sample' ? await sampleDoc('shop') : await pickPhoto(); if (!img) continue;
        addUserPhoto(img.url, 'Workplace photo · time attached', img.blob); uploadPhoto('workplace', img.blob); break;
      }
      S.bankDocs = { t: nowStr() }; audit('Owner sent the workplace photo the bank asked for (time attached)'); renderDash(); bot(msgOf(T.bankDocSent));
    } else if (r.id === 'ev:visit') { S.visit = 'Next Thursday, 10:30 am'; audit('Branch visit booked'); renderDash(); bot(msgOf(T.visit)); }
    else if (r.id === 'ev:sanction') { S.sanctioned = nowStr(); audit('Bank marked the loan as sanctioned (demo)'); renderDash(); bot(msgOf(T.sanction)); }
    else if (r.text) { await sayKind('status', { ownerAsked: r.text, fileStatus: S.sanctioned ? 'sanctioned' : S.openedAt ? 'with the bank' : 'sent', note: 'Answer briefly; if it is not about the loan file, say what Saathi can help with.' }); }
  }
}
function externalEvent(ev) { if (IN.res && IN.events) IN.res({ id: 'ev:' + ev, text: '', via: 'event' }); else pendingEvents.push(ev); }
const pendingEvents = [];

/* ---------- chat cards ---------- */
const stIcon = s => (s === true || s === 'ok' ? `<span class="st ok">${ic('check')}</span>` : s === false || s === 'no' ? `<span class="st no">${ic('x')}</span>` : s === 'wait' ? `<span class="st wait">${ic('clock')}</span>` : `<span class="st chk">${ic(s === 'flag' ? 'alert' : 'q')}</span>`);
function schemesCard(a) {
  const rows = a.elig.map(s => {
    const fail = s.checks.find(c => c.ok === false); const chk = s.checks.find(c => c.ok === null);
    const line = s.status === 'eligible' ? s.simpleOk : s.status === 'check' ? s.simpleCheck : (fail && fail.simple) || 'Not eligible';
    const src = (fail || chk || s.checks[0]).src;
    return `<div class="srow">${stIcon(s.status === 'eligible' ? true : s.status === 'not' ? false : 'chk')}<div><b>${s.name}</b><span>${esc(line)}</span></div><button class="linkbtn" type="button" data-src="${src}">Rule ${ic('file')}</button></div>`;
  }).join('');
  return `<div class="ctitle">${ic('badge')} Schemes checked for you</div>${rows}<div class="fine">Decided by fixed rules. Every answer links to the government rule it comes from.</div>`;
}
function subsidyCard(a) {
  const s = a.sch;
  return `<div class="ctitle">${ic('badge')} PMEGP for your new unit</div><dl class="kv"><dt>Project cost</dt><dd class="num">${fmt(s.projectCost)}</dd><dt>You put in (${pctS(s.ownRate)})</dt><dd class="num">${fmt(s.own)}</dd><dt>Bank loan</dt><dd class="num">${fmt(s.bankLoan)}</dd><dt>Govt subsidy (${pctS(s.subRate)})</dt><dd class="num" style="color:var(--good)">${fmt(s.subsidy)}</dd></dl><div class="subhead">Before the subsidy is released</div><div class="doclist"><div class="docrow">${stIcon('wait')} EDP training <button class="linkbtn" type="button" data-src="P6">Rule</button></div><div class="docrow">${stIcon('wait')} Subsidy held as a 3-year deposit <button class="linkbtn" type="button" data-src="P7">Rule</button></div></div>`;
}
function affordChartSvg(a, lines) {
  const W = 340, H = 150, Lp = 34, R = 6, T0 = 10, B = 22, iw = W - Lp - R, ih = H - T0 - B;
  const vals = a.idx.map(i => a.caps[i]).concat(lines.map(l => l.v)); const max = Math.max(1, ...vals) * 1.12; const y = v => T0 + ih - Math.max(0, v) / max * ih; const bw = iw / 12;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Money left each month compared with the instalment">`;
  [0, 0.5, 1].forEach(f => { const v = max * f; s += `<line class="c-grid" x1="${Lp}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="c-lab" x="${Lp - 4}" y="${y(v) + 4}" text-anchor="end">${v ? fmtK(v) : '0'}</text>`; });
  a.rows.forEach((m, i) => { const x = Lp + i * bw; const c = a.caps[i]; if (c != null) { if (i === a.leanI) s += `<rect class="c-lean" x="${x}" y="${T0}" width="${bw}" height="${ih}"/>`; s += `<rect class="c-cap" x="${x + bw * .18}" y="${y(c)}" width="${bw * .64}" height="${T0 + ih - y(c)}" rx="2"/>`; } s += `<text class="c-lab" x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${m.s[0]}</text>`; });
  lines.forEach(l => { s += `<line class="${l.cls}" x1="${Lp}" x2="${W - R}" y1="${y(l.v)}" y2="${y(l.v)}"/>`; });
  return s + '</svg>';
}
function affordCard(a, rec) {
  const lines = [{ v: a.emi, cls: rec ? 'c-emi-bad' : 'c-emi-good' }]; if (rec) lines.push({ v: E.emiOf(rec, E.RATE, a.tenure), cls: 'c-emi-good' });
  return `<div class="ctitle">${ic('shield')} Can you pay every month?</div>${affordChartSvg(a, lines)}<div class="legend"><span><i style="background:var(--primary)"></i>Money left each month</span>${rec ? `<span><i style="background:var(--bad)"></i>EMI on ${fmt(a.amount)}</span><span><i style="background:var(--good)"></i>EMI on ${fmt(rec)}</span>` : `<span><i style="background:var(--good)"></i>EMI on ${fmt(a.amount)}</span>`}</div><div class="fine">Counts only half of the extra income you expect (${fmt(a.extra)} a month${a.extraAssumed ? ', assumed' : ''}), to stay safe. Highlighted: ${a.rows[a.leanI].full}, your slowest month.</div>`;
}
function summaryCard(a) {
  const docs = DOC_LIST.filter(id => S.docs[id] && !S.docs[id].skipped).length;
  return `<div class="ctitle">${ic('file')} Your application</div><dl class="kv"><dt>Loan</dt><dd class="num">${fmt(a.amount)}</dd><dt>Scheme</dt><dd>${a.rec ? a.rec.name : 'MUDRA'}</dd><dt>Months</dt><dd>${a.tenure}</dd><dt>Instalment</dt><dd class="num">about ${fmt(a.emi)}</dd><dt>Bank</dt><dd>${esc(bankBranch())}</dd><dt>Documents</dt><dd>${docs} photos + 4 made by Saathi${S.docNote && Object.values(S.docs).some(d => d.flag) ? ', 1 note for the bank' : ''}</dd></dl><div class="fine">Nothing is sent without your "yes" and the code.</div>`;
}

/* ---------- bank dashboard ---------- */
const dbody = $('#dbody');
function flashBank() { if (matchMedia('(max-width:1000px)').matches && S.view === 'phone') $('#vt-dash').classList.add('dot'); }
function ownerName() { return S.profile.name || 'New owner'; }
function liveStatus() {
  if (S.sanctioned) return { label: 'Sanctioned', cls: 'good', shared: true };
  if (S.approvedAt) return { label: 'Submitted', cls: 'info', shared: true };
  if (S.cash) return { label: 'Being prepared', cls: 'muted' };
  if (S.turns.length) return { label: 'Talking to Saathi', cls: 'muted' };
  return { label: 'Not started', cls: 'muted' };
}
const SAMPLE_ROWS = [['Sarojamma K', 'Flour mill', 'Vemgal, Kolar', 180000, 'MUDRA Kishore', 74, 'Needs 1 document', 'warn'], ['Imran Pasha', 'Two-wheeler repair', 'Malur, Kolar', 220000, 'MUDRA Kishore', 79, 'Submitted', 'info'], ['Manjunath R', 'New fabrication unit', 'Malur, Kolar', 855000, 'PMEGP', 89, 'Submitted', 'info'], ['Gowramma S', 'New snack unit (SHG)', 'Mulbagal, Kolar', 1140000, 'PMEGP', 90, 'Submitted', 'info']];
function clusterView() {
  const st = liveStatus(); const a = S.cash ? E.analyze(S.profile, S.cash) : null;
  const live = `<tr class="live"><td><b>${esc(ownerName())}</b><br><small style="color:var(--muted)">${esc(S.profile.activity || 'Talking to Saathi now')}</small></td><td>${esc(S.profile.place || '—')}</td><td class="num">${a ? fmt(a.amount) : '—'}</td><td>${st.shared && a?.rec ? a.rec.name : '—'}</td><td>${st.shared && a ? `<span class="pill ${a.band.cls}">${a.score}</span>` : '<small style="color:var(--muted)">Hidden until approval</small>'}</td><td><span class="pill ${st.cls}">${st.label}</span></td><td><button class="btn" type="button" data-act="openfile">View file</button></td></tr>`;
  const rows = SAMPLE_ROWS.map(r => `<tr><td><b>${r[0]}</b><br><small style="color:var(--muted)">${r[1]}</small></td><td>${r[2]}</td><td class="num">${fmt(r[3])}</td><td>${r[4]}</td><td><span class="pill good">${r[5]}</span></td><td><span class="pill ${r[7]}">${r[6]}</span></td><td><small style="color:var(--muted)">Sample row</small></td></tr>`).join('');
  const ready = SAMPLE_ROWS.filter(r => r[6] === 'Submitted').length + (st.shared ? 1 : 0);
  return `<div class="kpis"><div class="kpi"><span>Saathi files this month</span><b>23</b></div><div class="kpi"><span>Complete at first submission</span><b>91%</b></div><div class="kpi"><span>Median days to loan-ready</span><b>2.4</b></div><div class="kpi"><span>Women applicants</span><b>61%</b></div></div>
  <div class="banner info">${ic('alert')}<span>The four figures above and the grey rows are sample data. The highlighted row is the live conversation on the phone.</span></div>
  <section class="sec"><h3>Kolar district cluster</h3><p class="lead">Files prepared by Saathi for this branch. Scores stay hidden until the owner approves sharing.</p>
  <div class="tablewrap"><table><thead><tr><th>Owner</th><th>Place</th><th>Loan</th><th>Scheme</th><th>Readiness</th><th>Status</th><th></th></tr></thead><tbody>${live}${rows}</tbody></table></div>
  <div class="actions" style="margin-top:12px"><button class="btn primary" type="button" data-act="plan">${ic('pin')} Plan one field visit for the ready files</button></div>
  ${S.visitPlan ? `<div class="banner info" style="margin-top:10px">${ic('check')}<span>One trip covers ${ready} submitted files in this cluster instead of ${ready} separate visits, saving ${ready - 1} trips.</span></div>` : ''}</section>`;
}
function lockBox(title, text, peek) { return `<div class="lock">${ic('lock')}<h3>${esc(title)}</h3><p>${esc(text)}</p>${peek ? '<button class="btn" type="button" data-act="peek">See what the bank will receive (demo preview)</button>' : ''}</div>`; }
function fileView() {
  if (!S.cash) return lockBox('No data yet', 'The owner has not given consent to share bank data. Saathi cannot see anything until they do.', false);
  if (!S.approvedAt && !S.peek) return lockBox(`Waiting for ${ownerName()}'s approval`, 'Banks see nothing until the owner hears the full application read back and says yes.', true);
  const a0 = E.analyze(S.profile, S.cash); const w = S.whatIf; const ok = !!S.approvedAt;
  const sl = (id, label, min, max, step, val, f) => `<label for="${id}">${label} <b id="${id}-v">${f(val)}</b><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
  return `${!ok ? `<div class="banner warn">${ic('lock')}<span><b>Demo preview.</b> In the real product the bank cannot open this until the owner approves. <button class="linkbtn" type="button" data-act="unpeek">Close preview</button></span></div>` : ''}
  <div class="fhead"><div><h3>${esc(ownerName())}</h3><p>${esc(S.profile.activity || '')}${S.profile.place ? ' · ' + esc(S.profile.place) : ''}</p></div>
  <div class="actions"><button class="btn" type="button" data-act="reqdoc" ${ok && !S.asked?.doc ? '' : 'disabled'}>${ic('camera')} Ask for workplace photo</button><button class="btn" type="button" data-act="visit" ${ok && !S.asked?.visit ? '' : 'disabled'}>${ic('clock')} Book branch visit</button><button class="btn primary" type="button" data-act="sanction" ${ok && !S.asked?.sanction ? '' : 'disabled'}>${ic('check')} Mark sanctioned (demo)</button></div></div>
  <details class="sec" id="wiBox" ${S.wiOpen ? 'open' : ''}><summary style="cursor:pointer;font-weight:600">Try your own numbers (what-if)</summary><p class="lead" style="margin-top:6px">Every number below is recalculated by the same rules engine and scorecard.</p>
  <div class="whatif">${sl('wi-amount', 'Loan amount', 50000, 2000000, 10000, w?.amount ?? a0.amount, fmt)}${sl('wi-income', 'Income change', -30, 30, 5, w ? Math.round(w.incomeAdj * 100) : 0, v => (v > 0 ? '+' : '') + v + '%')}${sl('wi-history', 'Months of bank history', 0, 36, 1, w?.history ?? a0.history, v => v + ' months')}${sl('wi-tenure', 'Repayment months', 12, 84, 6, w?.tenure ?? a0.tenure, v => v + ' months')}</div>
  <div class="actions" style="margin-top:10px"><button class="btn" type="button" data-act="resetwi">${ic('restart')} Reset to the file</button></div></details>
  <div id="fileRes">${fileResults()}</div>`;
}
function cashChart(a) {
  const W = 680, H = 240, Lp = 48, R = 10, T0 = 14, B = 34, iw = W - Lp - R, ih = H - T0 - B;
  const vals = []; a.inflow.forEach((v, i) => { if (v != null) vals.push(v, a.outflow[i]); });
  const step = 10000; const max = Math.max(step, Math.ceil(Math.max(...vals) * 1.08 / step) * step); const y = v => T0 + ih - v / max * ih; const bw = iw / 12;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly money in and out"><defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)" class="c-hatch"><line x1="0" y1="0" x2="0" y2="6"/></pattern></defs>`;
  for (let i = 0; i <= 4; i++) { const v = max * i / 4; s += `<line class="c-grid" x1="${Lp}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="c-lab" x="${Lp - 6}" y="${y(v) + 4}" text-anchor="end">${v === 0 ? '0' : fmtK(v)}</text>`; }
  const pts = [];
  a.rows.forEach((m, i) => {
    const x = Lp + i * bw; const vin = a.inflow[i];
    if (vin == null) s += `<rect x="${x + bw * .12}" y="${T0}" width="${bw * .76}" height="${ih}" fill="url(#hatch)"/>`;
    else {
      if (i === a.leanI) s += `<rect class="c-lean" x="${x + 2}" y="${T0}" width="${bw - 4}" height="${ih}" rx="4"/>`;
      s += `<rect class="c-in" x="${x + bw * .14}" y="${y(vin)}" width="${bw * .36}" height="${T0 + ih - y(vin)}" rx="2"/><rect class="c-out" x="${x + bw * .52}" y="${y(a.outflow[i])}" width="${bw * .32}" height="${T0 + ih - y(a.outflow[i])}" rx="2"/>`;
      pts.push([x + bw / 2, y(Math.max(0, a.surplus[i]))]);
    }
    s += `<text class="c-lab" x="${x + bw / 2}" y="${H - 16}" text-anchor="middle">${m.s}</text>`; if (i === 0 || m.s === 'Jan') s += `<text class="c-lab" x="${x + bw / 2}" y="${H - 3}" text-anchor="middle">${m.y}</text>`;
  });
  if (pts.length > 1) s += `<polyline class="c-sur" points="${pts.map(p => p.join(',')).join(' ')}"/>`;
  pts.forEach(p => { s += `<circle class="c-dot" cx="${p[0]}" cy="${p[1]}" r="3.5"/>`; });
  return s + '</svg>';
}
function gauge(score, band) {
  const r = 70, cx = 90, cy = 86, ang = Math.PI * (1 - Math.max(0.5, score) / 100); const x = cx + r * Math.cos(ang), y = cy - r * Math.sin(ang);
  return `<svg class="gauge" viewBox="0 0 180 104" role="img" aria-label="Readiness ${score} out of 100"><path class="g-track" d="M20 86 A70 70 0 0 1 160 86"/><path class="g-val ${band.cls}" d="M20 86 A70 70 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}"/><text class="g-num" x="90" y="80" text-anchor="middle">${score}</text><text class="g-sub" x="90" y="100" text-anchor="middle">readiness out of 100</text></svg>`;
}
function fileResults() {
  const p = S.profile; const a = E.analyze(p, S.cash, S.whatIf || {});
  const reasons = `<ul class="reasons">${a.reasons.pos.slice(0, 3).map(f => `<li>${stIcon(true)}<span>${E.reasonText(f, true)}</span></li>`).join('')}${a.reasons.neg.slice(0, 3).map(f => `<li>${stIcon(f.ratio < 0.4 ? false : 'chk')}<span>${E.reasonText(f, false)}</span></li>`).join('')}</ul>`;
  const affordTxt = a.afford.status === 'insufficient' ? '<span class="pill warn">Not enough history to judge</span>' : a.afford.status === 'ok' ? '<span class="pill good">Affordable</span>' : `<span class="pill bad">Safe up to ${fmt(a.afford.recommended)}</span>`;
  const elig = a.elig.map(s => { const pc = s.status === 'eligible' ? 'good' : s.status === 'check' ? 'warn' : 'bad'; const lab = s.status === 'eligible' ? 'Eligible' : s.status === 'check' ? 'To confirm' : 'Not eligible';
    return `<details class="scheme" ${s === a.rec ? 'open' : ''}><summary>${stIcon(s.status === 'eligible' ? true : s.status === 'check' ? 'chk' : false)}<b>${s.name}</b><span class="pill ${pc}">${lab}</span></summary><div class="chk">${s.checks.map(c => `<div class="crow">${stIcon(c.ok === true ? true : c.ok === false ? false : 'chk')}<span>${esc(c.t)}</span><button class="linkbtn" type="button" data-src="${c.src}">Source ${ic('file')}</button></div>`).join('')}</div></details>`; }).join('');
  const docRows = DOC_LIST.map(id => { const d = S.docs[id]; if (!d) return `<div class="docrow">${stIcon('wait')} <span>${DOCNAME[id].en} · not yet</span></div>`; if (d.skipped) return `<div class="docrow">${stIcon('chk')} <span>${DOCNAME[id].en} · skipped by owner</span></div>`;
    const bits = [d.name && `name ${esc(d.name)}`, d.idLast4 && `ends ${esc(d.idLast4)}`, d.vendor && esc(d.vendor), d.amount && fmt(d.amount), d.isSample && 'sample document'].filter(Boolean).join(' · ');
    return `<div class="docrow">${stIcon(d.flag ? 'flag' : true)} <span>${DOCNAME[id].en.replace(/^./, c => c.toUpperCase())} · ${bits}${d.flag ? (d.flag === 'different' ? '. Looks like a different person: verify.' : '. Spelling differs from Aadhaar; owner informed, KYC update at branch visit.') : ''}</span>${S.photos?.[id] ? `<button class="linkbtn" type="button" data-photo="${id}">View photo</button>` : ''}</div>`; }).join('');
  const docs = `<div class="doclist">${docRows}<div class="docrow">${stIcon(true)} <span style="flex:1">Project report · made by Saathi</span><button class="linkbtn" type="button" data-doc="report">Preview</button></div><div class="docrow">${stIcon(true)} <span style="flex:1">Cash-flow statement · made by Saathi</span><button class="linkbtn" type="button" data-doc="cash">Preview</button></div>${S.bankDocs ? `<div class="docrow">${stIcon(true)} <span style="flex:1">Workplace photo · time attached · ${S.bankDocs.t}</span>${S.photos?.workplace ? '<button class="linkbtn" type="button" data-photo="workplace">View photo</button>' : ''}</div>` : ''}${S.photos?.income_proof ? `<div class="docrow">${stIcon(true)} <span style="flex:1">Other proof of income</span><button class="linkbtn" type="button" data-photo="income_proof">View photo</button></div>` : ''}</div>`;
  const au = S.audit.map(x => `<li><time>${x.t}</time><span>${esc(x.text)}</span></li>`).join('');
  const seasonal = a.seasonal ? `<div class="tablewrap"><table><thead><tr><th>Month</th>${a.rows.map(m => `<th>${m.s}</th>`).join('')}</tr></thead><tbody><tr><td>Standard</td>${a.rows.map(() => `<td class="num">${fmtK(a.emi)}</td>`).join('')}</tr><tr><td>Seasonal</td>${a.seasonal.map(v => `<td class="num">${v == null ? '—' : fmtK(v)}</td>`).join('')}</tr></tbody></table></div>` : '<p class="lead">Needs at least 6 months of data.</p>';
  const loans = (p.existingLoans || []).map(l => `${l.source}${l.amount ? ' ' + fmt(l.amount) : ''}${l.monthlyRatePct ? ` at ${l.monthlyRatePct}%/month` : ''}`).join('; ') || 'None declared';
  const field = [['Schemes heard of', p.schemesHeard], ['Last loan attempt', p.pastAttempt], ['Current loans', loans], ['Income records', S.cash.note], ['Paid mostly by', { mostly_upi: 'UPI', mixed: 'UPI and cash', mostly_cash: 'Cash' }[p.paymentMode]]].filter(r => r[1]);
  return `${S.whatIf ? `<div class="banner warn">${ic('alert')}<span><b>What-if mode.</b> These numbers are a simulation and are not saved to the file.</span></div>` : ''}
  <div class="facts sec"><div class="fact"><span>${p.isNewVenture ? 'Bank loan needed' : 'Asked for'}</span><b class="num">${fmt(a.request)}</b></div><div class="fact"><span>Evaluated amount</span><b class="num">${fmt(a.amount)}</b></div><div class="fact"><span>Best scheme</span><b>${a.rec ? a.rec.name : 'None yet'}</b></div><div class="fact"><span>EMI</span><b class="num">${fmt(a.emi)} × ${a.tenure}</b></div><div class="fact"><span>Owner approval</span><b>${S.approvedAt ? 'Yes + code' : 'Not yet'}</b></div></div>
  ${S.keptRisk ? `<div class="banner warn">${ic('alert')}<span>The owner kept the original amount after Saathi's affordability warning. Consider the seasonal schedule below.</span></div>` : ''}
  <div class="grid2">
   <section class="sec"><h3>Readiness</h3><p class="lead">A scorecard the officer can read line by line. It supports the decision; it does not make it.</p>
    <div class="gaugewrap">${gauge(a.score, a.band)}<div><span class="pill ${a.band.cls}">${a.band.label}</span><p style="margin:8px 0 0;font-size:13px">Estimated chance of on-time repayment: <b>${pctS(a.prob)}</b></p><p class="lead" style="margin:2px 0 0">Calibrated on synthetic data. See Model trust.</p></div></div>${reasons}</section>
   <section class="sec"><h3>Affordability</h3><p class="lead">Can the owner pay in the slowest month, not just on average?</p>
    <div class="facts"><div class="fact"><span>DSCR</span><b>${a.dscr.toFixed(2)}×</b></div><div class="fact"><span>Slowest month</span><b>${a.rows[a.leanI]?.full || '—'}</b></div><div class="fact"><span>Result</span><b>${affordTxt}</b></div></div>
    ${affordChartSvg(a, [{ v: a.emi, cls: a.leanPass ? 'c-emi-good' : 'c-emi-bad' }])}
    <div class="legend"><span><i style="background:var(--primary)"></i>Surplus + half of expected extra income${a.extraAssumed ? ' (assumed)' : ''}</span><span><i style="background:${a.leanPass ? 'var(--good)' : 'var(--bad)'}"></i>EMI</span></div></section>
  </div>
  <section class="sec"><h3>Cash flow</h3><p class="lead">${esc(S.cash.note)} Average in ${fmt(a.avgIn)}, out ${fmt(a.avgOut)}, surplus ${fmt(a.avgSur)} a month.</p>${cashChart(a)}<div class="legend"><span><i style="background:var(--primary)"></i>Money in</span><span><i style="background:var(--muted);opacity:.4"></i>Money out</span><span><i style="background:var(--accent)"></i>Surplus</span><span><i style="background:var(--accent-soft)"></i>Slowest month</span></div></section>
  <section class="sec"><h3>Eligibility, with sources</h3><p class="lead">Decided by fixed rules, not by the AI. Click any Source to see the clause it comes from.</p><div class="elig">${elig}</div></section>
  <div class="grid2"><section class="sec"><h3>Documents</h3>${docs}</section>
   <section class="sec"><h3>Consent and audit trail</h3><dl class="kv" style="margin-bottom:10px"><dt>Purpose</dt><dd>Prepare this loan file</dd><dt>Data</dt><dd>Bank transactions, 12 months</dd><dt>Shared with</dt><dd>${esc(bankBranch())}</dd><dt>Valid for</dt><dd>90 days</dd><dt>Via</dt><dd>${S.cash.source.startsWith('csv') ? 'Statement uploaded by owner' : 'Account Aggregator (sandbox)'}</dd></dl><ul class="audit">${au}</ul></section></div>
  <div class="grid2"><section class="sec"><h3>Seasonal EMI suggestion</h3><p class="lead">Same yearly total, shaped to the owner's income. For discussion with the bank.</p>${seasonal}</section>
   <section class="sec"><h3>Field insights from the conversation</h3><p class="lead">The brief's field questions, answered in the owner's own words.</p><dl class="kv">${field.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></section></div>`;
}
function bindWhatIf() {
  const box = document.getElementById('wiBox'); if (box) box.addEventListener('toggle', () => { S.wiOpen = box.open; });
  ['wi-amount', 'wi-income', 'wi-history', 'wi-tenure'].forEach(id => { const el = document.getElementById(id); if (!el) return; el.addEventListener('input', () => {
    const v = k => Number(document.getElementById(k).value);
    S.whatIf = { amount: v('wi-amount'), incomeAdj: v('wi-income') / 100, history: v('wi-history'), tenure: v('wi-tenure') };
    $('#wi-amount-v').textContent = fmt(v('wi-amount')); $('#wi-income-v').textContent = (v('wi-income') > 0 ? '+' : '') + v('wi-income') + '%';
    $('#wi-history-v').textContent = v('wi-history') + ' months'; $('#wi-tenure-v').textContent = v('wi-tenure') + ' months';
    $('#fileRes').innerHTML = fileResults(); }); });
}
function calChart(Sy) {
  const W = 320, H = 260, Lp = 42, R = 10, T0 = 10, B = 38, iw = W - Lp - R, ih = H - T0 - B; const x = v => Lp + v * iw, y = v => T0 + ih - v * ih;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Calibration: predicted versus observed repayment">`;
  [0, .25, .5, .75, 1].forEach(v => { s += `<line class="c-grid" x1="${Lp}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="c-lab" x="${Lp - 6}" y="${y(v) + 4}" text-anchor="end">${v * 100}%</text><text class="c-lab" x="${x(v)}" y="${H - 22}" text-anchor="middle">${v * 100}%</text>`; });
  s += `<line class="c-diag" x1="${x(0)}" y1="${y(0)}" x2="${x(1)}" y2="${y(1)}"/><polyline class="c-cal" points="${Sy.bins.map(b => x(b.pred) + ',' + y(b.obs)).join(' ')}"/>`;
  Sy.bins.forEach(b => { s += `<circle class="c-calpt" cx="${x(b.pred)}" cy="${y(b.obs)}" r="${3 + Math.min(5, b.n / 250)}"/>`; });
  return s + `<text class="c-lab" x="${Lp + iw / 2}" y="${H - 4}" text-anchor="middle">Predicted chance of on-time repayment</text></svg>`;
}
function trustView() {
  const Sy = E.synth(); const thr = 5;
  const gp = g => (g < thr ? `<span class="pill good">${g.toFixed(1)} pts · within ${thr}</span>` : `<span class="pill bad">${g.toFixed(1)} pts · over ${thr}</span>`);
  const row = x => `<tr><td>${x.v}</td><td class="num">${x.n.toLocaleString('en-IN')}</td><td class="num">${pctS(x.ready)}</td><td class="num">${pctS(x.tpr)}</td></tr>`;
  return `<div class="banner info">${ic('alert')}<span>Computed live in your browser from <b>${Sy.n.toLocaleString('en-IN')} synthetic applicants</b>. A lender pilot would recalibrate the model on real repayment data.</span></div>
  <div class="grid2"><section class="sec"><h3>Inputs the model uses</h3><ol class="listplain">${Object.values(E.FLABEL).map(v => `<li>${v}</li>`).join('')}</ol></section>
   <section class="sec"><h3>Never used</h3><p class="lead">Kept out of the model entirely. Gender and region are used only to audit outcomes.</p><ol class="listplain"><li>Gender</li><li>Caste or social category</li><li>Religion</li><li>Region and PIN code</li><li>Name</li><li>Marital status</li></ol></section></div>
  <div class="grid2"><section class="sec"><h3>Calibration</h3><p class="lead">If the model says 80%, about 80% should repay.</p>${calChart(Sy)}<div class="facts"><div class="fact"><span>Brier score (lower is better)</span><b>${Sy.brier.toFixed(3)}</b></div><div class="fact"><span>Repaid on time (synthetic)</span><b>${pctS(Sy.base)}</b></div></div></section>
   <section class="sec"><h3>Fairness audit</h3><p class="lead">"Rated ready" means a score of 70 or more. The second rate looks only at people who did repay.</p>
    <div class="tablewrap"><table><thead><tr><th>Group</th><th>Applicants</th><th>Rated ready</th><th>Ready, among repayers</th></tr></thead><tbody>${Sy.gender.map(row).join('')}</tbody></table></div>
    <p style="margin:8px 0 14px;font-size:13px">Gender gap: ${gp(Sy.gGap.ready)} · among repayers ${gp(Sy.gGap.tpr)}</p>
    <div class="tablewrap"><table><thead><tr><th>Region</th><th>Applicants</th><th>Rated ready</th><th>Ready, among repayers</th></tr></thead><tbody>${Sy.region.map(row).join('')}</tbody></table></div>
    <p style="margin:8px 0 0;font-size:13px">Region gap: ${gp(Sy.rGap.ready)} · among repayers ${gp(Sy.rGap.tpr)}</p></section></div>
  <section class="sec"><h3>Hidden stand-in check</h3><p class="lead">How strongly each input tracks gender. Near zero means it is not secretly standing in for gender. Full bar = 0.10.</p><div class="hbars">${Sy.proxies.map(x => `<div class="hb"><span>${x.k}</span><span class="tr"><i style="width:${Math.min(100, x.r * 1000)}%;background:${x.r < 0.1 ? 'var(--good)' : 'var(--bad)'}"></i></span><b class="num">${x.r.toFixed(3)}</b></div>`).join('')}</div></section>`;
}
const MDEF = { hb: 6, ha: 2, rate: 400, sb: 2.4, sa: 1.1, vb: 3, va: 0.25, vc: 500, files: 40, fee: 1000 };
function moneyView() {
  const f = (id, label, v, step) => `<label for="m-${id}">${label}<input type="number" id="m-${id}" value="${v}" step="${step || 1}" min="0"></label>`;
  return `<section class="sec"><h3>What an incomplete file costs the bank</h3><p class="lead">The brief asks: "Every incomplete file costs a lender time. Find out how much." Replace these placeholders with figures from branch-manager interviews.</p>
  <div class="money">${f('hb', 'Staff hours per file, today', MDEF.hb, .5)}${f('ha', 'Staff hours per file, with Saathi', MDEF.ha, .5)}${f('rate', 'Staff cost per hour (₹)', MDEF.rate, 50)}${f('sb', 'Submissions per file, today', MDEF.sb, .1)}${f('sa', 'Submissions per file, with Saathi', MDEF.sa, .1)}${f('vb', 'Field visits per file, today', MDEF.vb, .5)}${f('va', 'Field visits per file, with clustering', MDEF.va, .05)}${f('vc', 'Cost per field visit (₹)', MDEF.vc, 50)}${f('files', 'Files per month at this branch', MDEF.files, 1)}${f('fee', 'Fee the bank pays Saathi per complete file (₹)', MDEF.fee, 100)}</div></section><div id="moneyOut">${moneyOut()}</div>`;
}
function moneyOut() {
  const g = id => { const el = document.getElementById('m-' + id); return el ? Number(el.value) || 0 : MDEF[id]; };
  const before = g('hb') * g('rate') * g('sb') + g('vb') * g('vc'); const after = g('ha') * g('rate') * g('sa') + g('va') * g('vc'); const save = before - after; const net = save - g('fee');
  return `<div class="kpis"><div class="kpi"><span>Cost per file today</span><b>${fmt(before)}</b></div><div class="kpi"><span>Cost per file with Saathi</span><b>${fmt(after)}</b></div><div class="kpi"><span>Saved per file</span><b style="color:var(--good)">${fmt(save)}</b></div><div class="kpi"><span>Saved per month</span><b>${fmt(save * g('files'))}</b></div><div class="kpi"><span>Net saving after Saathi's fee</span><b style="color:${net >= 0 ? 'var(--good)' : 'var(--bad)'}">${fmt(net)}</b></div></div>
  <section class="sec" style="margin-top:16px"><h3>How it adds up</h3><p class="lead" style="margin:0">Cost per file = staff hours × staff cost × submissions + field visits × cost per visit. Saathi earns from the lender, so the owner pays nothing and no middleman takes a cut.</p></section>`;
}
function renderDash() {
  $$('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === S.tab)));
  $('#dheadPill').textContent = S.tab === 'file' ? `Viewing: ${ownerName()}` : 'Saathi files';
  if (S.tab === 'cluster') dbody.innerHTML = clusterView();
  else if (S.tab === 'file') { dbody.innerHTML = fileView(); bindWhatIf(); }
  else if (S.tab === 'trust') dbody.innerHTML = trustView();
  else { dbody.innerHTML = moneyView(); $('.money input').forEach(el => el.addEventListener('input', () => { $('#moneyOut').innerHTML = moneyOut(); })); }
  save();
}

/* ---------- modal ---------- */
const modal = $('#modal'), mbox = $('#mbox');
function openModal(html) { mbox.innerHTML = '<button class="mclose" type="button" data-act="close">Close</button>' + html; modal.hidden = false; mbox.querySelector('.mclose').focus(); }
modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-act="close"]')) modal.hidden = true; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.hidden = true; });
async function openPhoto(doc) {
  const title = doc === 'workplace' ? 'Workplace photo' : doc === 'income_proof' ? 'Other proof of income' : (DOCNAME[doc]?.en || doc).replace(/^./, c => c.toUpperCase());
  openModal(`<h3 id="mTitle">${esc(title)}</h3><div class="meta">Loading the photo…</div>`);
  const r = await sess('photo-get', { doc });
  if (!r.image) { openModal(`<h3 id="mTitle">${esc(title)}</h3><p>This photo is no longer stored. Photos are deleted automatically after 7 days, or when the owner asks.</p>`); return; }
  openModal(`<h3 id="mTitle">${esc(title)}</h3><div class="meta">Sent by the owner · stored for 7 days, then deleted automatically</div><img src="data:image/jpeg;base64,${r.image}" alt="${esc(title)} sent by the owner" style="width:100%;border-radius:10px;border:1px solid var(--line)">`);
}
function openSource(id) {
  const s = E.SRC[id]; if (!s) return; const d = E.DOCSRC[s.doc];
  openModal(`<h3 id="mTitle">${d.title}</h3><div class="meta">Section: ${s.sec} · Rule ${id}</div><blockquote>${s.text}</blockquote><p class="fine" style="margin-top:12px">Paraphrased from the official guideline for this demo. Verify against the current version before real use.</p><p><a href="${d.url}" target="_blank" rel="noopener">Open the official scheme website ${ic('ext')}</a></p>`);
}
async function openDoc(kind) {
  if (!S.cash) return;
  const a = E.analyze(S.profile, S.cash);
  if (kind === 'cash') {
    openModal(`<h3 id="mTitle">Cash-flow statement</h3><div class="meta">${esc(ownerName())} · prepared by Saathi · ${esc(S.cash.note)}</div><table><thead><tr><th>Month</th><th>In</th><th>Out</th><th>Surplus</th></tr></thead><tbody>${a.rows.map((m, i) => a.inflow[i] == null ? `<tr><td>${m.s} ${m.y}</td><td colspan="3" style="color:var(--muted)">No bank data</td></tr>` : `<tr><td>${m.s} ${m.y}</td><td class="num">${fmt(a.inflow[i])}</td><td class="num">${fmt(a.outflow[i])}</td><td class="num">${fmt(a.surplus[i])}</td></tr>`).join('')}</tbody></table>`);
    return;
  }
  const p = S.profile;
  const facts = { owner: p.name, business: p.activity, newUnit: !!p.isNewVenture, yearsRunning: p.yearsInBusiness, place: p.place, purpose: p.loanPurpose, scheme: a.rec?.name, loan: fmt(a.amount), projectCost: p.isNewVenture ? fmt(a.sch.projectCost) : null, askedFor: fmt(a.request), recommendedLoan: fmt(a.amount), averageMonthlyIncome: fmt(a.avgIn), averageSurplus: fmt(a.avgSur), expectedExtraIncome: fmt(a.extra), instalment: fmt(a.emi), months: a.tenure, slowestMonth: a.rows[a.leanI]?.full, dscr: a.dscr.toFixed(2), existingLoans: p.existingLoans, readiness: a.score, paymentMode: p.paymentMode };
  openModal(`<h3 id="mTitle">Project report</h3><div class="meta">Writing the report from the conversation and bank data…</div>`);
  try { if (!S.report) S.report = await api('agent', { task: 'report', facts }); }
  catch (e) { openModal(`<h3 id="mTitle">Project report</h3><p>${esc(e.message)}</p>`); return; }
  const r = S.report;
  openModal(`<div class="report"><h3 id="mTitle">Project report</h3><div class="meta">${esc(ownerName())} · generated by Saathi · numbers from the rules engine, text by AI</div>
  <h4>Summary</h4><p>${esc(r.summary)}</p><h4>Operations</h4><p>${esc(r.operations)}</p><h4>Market</h4><p>${esc(r.market)}</p>
  <h4>Means of finance</h4><dl class="kv"><dt>Scheme</dt><dd>${a.rec?.name || 'To confirm'}</dd><dt>Loan</dt><dd class="num">${fmt(a.amount)}</dd>${p.isNewVenture ? `<dt>Own contribution</dt><dd class="num">${fmt(a.sch.own)}</dd><dt>Subsidy (PMEGP)</dt><dd class="num">${fmt(a.sch.subsidy)}</dd>` : ''}<dt>Repayment</dt><dd>${a.tenure} months, about ${fmt(a.emi)} a month (indicative 11%)</dd></dl>
  <h4>Repayment capacity</h4><dl class="kv"><dt>Average income</dt><dd class="num">${fmt(a.avgIn)} a month</dd><dt>Average surplus</dt><dd class="num">${fmt(a.avgSur)} a month</dd><dt>DSCR</dt><dd>${a.dscr.toFixed(2)}×</dd><dt>Slowest month</dt><dd>${a.rows[a.leanI]?.full || '—'}</dd></dl>
  <h4>Risks</h4><p>${esc(r.risks)}</p><h4>How the risks are handled</h4><p>${esc(r.mitigation)}</p></div>`);
}

/* ---------- wiring ---------- */
document.addEventListener('click', e => {
  const sb = e.target.closest('.msg.bot .say'); if (sb) { const el = sb.closest('.msg'); return speakNow(el._m || { local: el.dataset.l || '', en: el.dataset.e || '' }); }
  const ph = e.target.closest('[data-photo]'); if (ph) return openPhoto(ph.dataset.photo);
  const s = e.target.closest('[data-src]'); if (s) return openSource(s.dataset.src);
  const d = e.target.closest('[data-doc]'); if (d) return openDoc(d.dataset.doc);
  const t = e.target.closest('.tab'); if (t) { S.tab = t.dataset.tab; return renderDash(); }
  const a = e.target.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act;
  if (act === 'openfile') { S.tab = 'file'; renderDash(); }
  else if (act === 'peek') { S.peek = true; renderDash(); }
  else if (act === 'unpeek') { S.peek = false; renderDash(); }
  else if (act === 'plan') { S.visitPlan = true; renderDash(); }
  else if (act === 'resetwi') { S.whatIf = null; renderDash(); }
  else if (['reqdoc', 'visit', 'sanction'].includes(act)) { const type = act === 'reqdoc' ? 'doc' : act; S.asked = { ...(S.asked || {}), [type]: true }; a.disabled = true; save(); sess('event', { event: { type } }).then(pollEvents); if (matchMedia('(max-width:1000px)').matches) $('#vt-phone').classList.add('dot'); }
});
// Bank events that arrive while Saathi is busy are delivered as soon as the owner's chat is free.
setInterval(() => { if (pendingEvents.length && IN.res && IN.events) IN.res({ id: 'ev:' + pendingEvents.shift(), text: '', via: 'event' }); }, 700);

function setLang(l) { S.lang = l; document.documentElement.lang = l === 'kn' ? 'kn' : l === 'hi' ? 'hi' : 'en'; rerenderTexts(); }
function paintSub() { const b = $('#subBtn'); b.setAttribute('aria-pressed', String(S.subs)); b.innerHTML = ic('cc') + (S.subs ? 'EN' : 'EN'); b.title = S.subs ? 'English subtitles on' : 'English subtitles off'; }
$('#subBtn').addEventListener('click', () => { S.subs = !S.subs; paintSub(); rerenderTexts(); });
function paintVoice() { const b = $('#voiceBtn'); b.setAttribute('aria-pressed', String(S.voice)); b.innerHTML = ic(S.voice ? 'speaker' : 'mute') + 'Voice'; b.title = S.voice ? 'Voice is on' : 'Voice is off'; }
$('#voiceBtn').addEventListener('click', () => { S.voice = !S.voice; paintVoice(); if (!S.voice) stopAudio(); });
$('#restartBtn').addEventListener('click', async () => { forget(); await sess('delete'); lsSet(newSid()); location.reload(); });
function setView(v) { S.view = v; $('#stage').dataset.view = v; $('#vt-phone').setAttribute('aria-selected', String(v === 'phone')); $('#vt-dash').setAttribute('aria-selected', String(v === 'dash')); $('#vt-' + v).classList.remove('dot'); }
$('#vt-phone').addEventListener('click', () => setView('phone'));
$('#vt-dash').addEventListener('click', () => setView('dash'));
$('#verified').innerHTML = `<svg class="ic" viewBox="0 0 24 24" style="width:15px;height:15px" aria-label="Verified business account">${ICONS.badge}</svg>`;
$('#bankIc').innerHTML = ic('bank'); micBtn.innerHTML = ic('mic'); sendBtn.innerHTML = ic('send');
paintSub(); paintVoice(); renderDash();
// Welcome screen: the first tap also unlocks voice playback (browsers block sound until the user taps).
const STAGE_LABEL = { intake: 'telling Saathi about the business', consent: 'bank data consent', results: 'scheme results', afford: 'choosing the loan amount', docs: 'documents', interview: 'practice interview', approve: 'final approval', post: 'application sent to the bank' };
function unlockVoice() { try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch { /* no speech support */ } }
async function checkReady() {
  let cfg = CFG;
  try { cfg = await fetch('/api/config').then(r => r.json()); CFG = cfg; } catch { /* use what we have */ }
  if (cfg.ready === false) { $('#introNote').textContent = 'The live AI is not set up on this server yet. Please open the scripted demo instead.'; $('#introNote').classList.add('warn'); return false; }
  return true;
}
const onCrash = e => { console.error(e); addEl('msg err', 'Something went wrong. Tap Start over to try again.'); };
let savedSession = null;
$('#startBtn').addEventListener('click', async () => {
  unlockVoice(); if (!(await checkReady())) return;
  if (savedSession) { await sess('delete'); lsSet(newSid()); savedSession = null; } // a new conversation replaces the saved one
  $('#intro').hidden = true; started = true;
  run().catch(onCrash);
});
$('#resumeBtn').addEventListener('click', async () => {
  unlockVoice(); if (!(await checkReady()) || !savedSession) return;
  Object.assign(S, savedSession.state); feed.innerHTML = savedSession.feed || '';
  restoreFeed(); setLang(S.lang || 'kn'); paintSub(); paintVoice();
  $('#intro').hidden = true; started = true; renderDash();
  addEl('msg note', 'Welcome back. Continuing where you left off.');
  pollEvents();
  run(S.stage || 'lang').catch(onCrash);
});
// On load: offer to continue a saved conversation.
(async () => {
  try { CFG = await fetch('/api/config').then(r => r.json()); if (CFG.store === 'memory') $('#introNote').textContent = 'Use the sample documents. Note: progress is not saved on this server.'; } catch { /* offline */ }
  if (!lsGet()) return;
  const saved = await sess('load');
  if (!saved.state || !saved.state.stage || saved.state.stage === 'lang') return;
  savedSession = saved;
  const who = saved.state.profile?.name ? saved.state.profile.name + ' · ' : '';
  $('#resumeText').textContent = `${who}${who ? 'you' : 'You'} stopped at: ${STAGE_LABEL[saved.state.stage] || 'the conversation'}.`;
  $('#resumeBox').hidden = false; $('#startBtn').classList.add('ghost'); $('#startBtn').textContent = 'Start a new conversation';
})();
// Save as the chat grows, and collect bank actions every few seconds once the file is with the bank.
new MutationObserver(() => save()).observe(feed, { childList: true, subtree: true, characterData: true });
setInterval(pollEvents, 5000);
