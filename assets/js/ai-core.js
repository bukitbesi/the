/* Shared core for the AI writing tools (paraphraser, grammar checker, summarizer, caption generator) and the AI image
   generator. Builds the task instructions sent to the site's Cloudflare Workers AI worker, cleans the model's reply,
   detects Malay or English, diffs two texts word by word and maps worker errors to friendly messages. The worker
   (tools-src/vision-worker/worker.js) adds its own guard rail and limits; nothing is stored. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-16', limits: { paraphrase: 2400, grammar: 2400, summarize: 12000, caption: 1200, enhance: 1200, image: 2000 }, wpm: 230 };
  var LANG = { ms: 'Malay (Bahasa Melayu, standard Dewan Bahasa dan Pustaka spelling)', en: 'English (British spelling, as used in Malaysia)', manglish: 'casual Malaysian English mixed with common Malay words (Manglish), friendly and natural', rojak: 'a natural mix of Malay and English (bahasa rojak), the way Malaysians chat online' };

  // Malay function words that rarely appear in English text.
  var MS_WORDS = ['yang', 'dan', 'di', 'ke', 'untuk', 'dengan', 'tidak', 'ini', 'itu', 'adalah', 'saya', 'kami', 'kita', 'mereka', 'akan', 'telah', 'sudah', 'dalam', 'pada', 'dari', 'daripada', 'juga', 'boleh', 'kerana', 'tetapi', 'atau', 'ada', 'lebih', 'oleh', 'bagi', 'sebagai', 'apabila', 'ialah', 'iaitu', 'kepada', 'secara', 'perlu', 'banyak', 'sangat', 'hari', 'orang', 'anak', 'ramai'];
  var EN_WORDS = ['the', 'and', 'is', 'are', 'to', 'of', 'in', 'that', 'it', 'for', 'with', 'was', 'this', 'on', 'be', 'have', 'you', 'not', 'from', 'they', 'will', 'can', 'an', 'which', 'their', 'has', 'were', 'been'];
  function detectLang(text) {
    var words = String(text || '').toLowerCase().match(/[a-z]+/g) || [], ms = 0, en = 0;
    words.forEach(function (w) { if (MS_WORDS.indexOf(w) >= 0) ms++; else if (EN_WORDS.indexOf(w) >= 0) en++; });
    return ms > en ? 'ms' : 'en';
  }

  function count(text) {
    var t = String(text || '').trim(), words = t ? t.split(/\s+/).length : 0;
    return { words: words, chars: t.length, sentences: t ? (t.match(/[.!?](\s|$)/g) || []).length || 1 : 0, minutes: words / FACTS.wpm };
  }

  var PARA_MODES = {
    standard: 'Rewrite it with different wording and sentence structure while keeping the same meaning and a similar length.',
    fluent: 'Rewrite it so it reads smoothly and naturally, fixing awkward phrasing, at a similar length.',
    formal: 'Rewrite it in a formal, professional tone suitable for official letters, reports or emails.',
    simple: 'Rewrite it in simple, clear language a 12-year-old could understand, with short sentences.',
    shorten: 'Rewrite it about 40% shorter, keeping every key point.',
    expand: 'Rewrite it about 50% longer by explaining the existing points more fully, without adding new facts.',
    academic: 'Rewrite it in an academic tone suitable for an assignment or thesis, precise and objective.',
    creative: 'Rewrite it in a lively, engaging and creative way, keeping the meaning.'
  };
  var SUM_LENGTH = { short: 'in 2 to 3 sentences', medium: 'in about 5 to 7 sentences', long: 'in about 10 to 12 sentences covering every main section' };
  var SUM_FORMAT = { bullets: 'as a bullet list, one point per line starting with "- "', paragraph: 'as one flowing paragraph', keypoints: 'as a bullet list of key points starting with "- ", then a final line starting with "Takeaway: " (or "Kesimpulan: " in Malay)' };
  var TONES = {
    casual: 'casual and friendly', funny: 'funny and witty', inspiring: 'inspiring and positive', sales: 'persuasive for selling a product or service, with a clear call to action',
    grateful: 'grateful and humble, suitable for Muslim audiences (for example Alhamdulillah) without preaching', romantic: 'warm and romantic', professional: 'professional and confident'
  };
  var OCCASIONS = {
    none: '', raya: 'Hari Raya Aidilfitri', haji: 'Hari Raya Aidiladha', merdeka: 'Hari Merdeka or Hari Malaysia', birthday: 'a birthday', wedding: 'a wedding or engagement',
    graduation: 'a graduation', travel: 'a holiday trip', food: 'a food post', ramadan: 'Ramadan', cny: 'Chinese New Year', deepavali: 'Deepavali', newyear: 'New Year'
  };
  var PLATFORMS = { instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', x: 'X (Twitter)', linkedin: 'LinkedIn', threads: 'Threads' };
  // Caption length and hashtag limits (Instagram 5 hashtags from 18 Dec 2025; TikTok 5 from July 2025; TikTok 2,200 is the
  // official API caption limit, many accounts get 4,000 in the app). more = characters shown before "more" (approximate).
  var LIMITS = { instagram: { max: 2200, tags: 5, more: 125 }, tiktok: { max: 2200, tags: 5 }, facebook: { max: 63206, tags: 10 }, x: { max: 280, tags: 2 },
    linkedin: { max: 3000, tags: 5, more: 210 }, threads: { max: 500, tags: 1 } };

  function langName(code, text) { return LANG[code === 'same' ? detectLang(text) : code] || LANG.en; }

  // Each builder returns the request body for the worker's POST /text.
  function paraphrase(o) {
    var text = String(o.text || '').trim(), mode = PARA_MODES[o.mode] ? o.mode : 'standard', lang = langName(o.lang || 'same', text);
    if (mode === 'grammar' || o.mode === 'grammar') {
      return { task: 'grammar', temperature: 0.1, user: text,
        system: 'You are a careful proofreader. Correct spelling, grammar, punctuation and word choice errors in the text, which is in ' + langName('same', text) + '. Change only what is wrong and keep the wording, tone, meaning and language. Return only the corrected text, with no notes, quotes or preface.' };
    }
    return { task: 'paraphrase', temperature: mode === 'creative' ? 0.8 : 0.5, user: text,
      system: 'You are an expert writer and paraphraser. ' + PARA_MODES[mode] + ' Write the result in ' + lang + '. Keep names, numbers, dates, citations and technical terms accurate. Return only the rewritten text, with no notes, quotes or preface.' };
  }
  function summarize(o) {
    var text = String(o.text || '').trim(), len = SUM_LENGTH[o.length] ? o.length : 'medium', fmt = SUM_FORMAT[o.format] ? o.format : 'bullets';
    return { task: 'summarize', temperature: 0.2, user: text,
      system: 'You summarize text accurately. Summarize the text ' + SUM_LENGTH[len] + ', ' + SUM_FORMAT[fmt] + ', in ' + langName(o.lang || 'same', text) + '. Use only information in the text, keep key names, numbers and dates, and do not add opinions. Return only the summary.' };
  }
  function caption(o) {
    var lim = LIMITS[o.platform] || LIMITS.instagram, topic = String(o.text || '').trim(), n = Math.max(1, Math.min(8, Math.round(Number(o.count) || 5))), tags = Math.round(Number(o.hashtags));
    tags = Math.max(0, Math.min(lim.tags, isFinite(tags) ? tags : lim.tags));
    var occ = OCCASIONS[o.occasion] || '', tone = TONES[o.tone] || TONES.casual, platform = PLATFORMS[o.platform] || 'Instagram';
    return { task: 'caption', temperature: 0.9, user: topic,
      system: 'You write social media captions for Malaysians. Write ' + n + ' different ' + platform + ' captions about the post described by the user' + (occ ? ', for ' + occ : '') + '. Tone: ' + tone + '. Language: ' + (LANG[o.lang] || LANG.ms) + '. ' +
        (o.emoji === 'no' ? 'Do not use emoji. ' : 'Use a few fitting emoji. ') + (o.platform === 'x' || o.platform === 'threads' ? 'Keep each caption under 250 characters. ' : 'Vary the length from one line to three short lines. ') +
        'Number them "1." to "' + n + '.", one caption per number, with no hashtags inside the captions. ' + (tags ? 'After the captions, write one line starting with "Hashtags:" followed by ' + tags + ' relevant hashtags, mixing popular Malaysian and specific ones.' : 'Do not write hashtags.') };
  }
  // Turns a short idea (Malay or English) into a detailed English prompt for an image model.
  function enhance(o) {
    return { task: 'enhance', temperature: 0.6, user: String(o.text || '').trim(),
      system: 'You write prompts for the FLUX image model. Turn the idea into one English prompt of 40 to 70 words describing the subject, setting, style, lighting, composition and colours. Translate Malay to English. Keep any Malaysian setting, food or culture accurate. No people who are real or famous, nothing sexual or violent. Return only the prompt.' };
  }

  // Style suffixes appended to the image prompt (FLUX understands English best).
  var IMAGE_STYLES = {
    none: '', photo: 'realistic photograph, natural light, sharp focus, 35mm lens, high detail', cinematic: 'cinematic film still, dramatic lighting, shallow depth of field, rich colour grading',
    anime: 'anime illustration, clean line art, vibrant cel shading, detailed background', toon3d: '3D animated movie style, soft lighting, expressive characters, smooth shading',
    watercolour: 'watercolour painting, soft washes, paper texture, gentle colours', oil: 'oil painting, visible brush strokes, rich texture, classical composition',
    batik: 'Malaysian batik art style, wax-resist dyed fabric look, bold floral motifs, flowing lines, rich colours', pixel: 'pixel art, 16-bit retro game style, crisp pixels, limited palette',
    lineart: 'black and white line art, clean ink outlines, colouring book style', poster: 'flat vector poster, bold shapes, minimal, strong contrast'
  };
  function imagePrompt(prompt, style) {
    var p = String(prompt || '').trim().replace(/[.\s]+$/, ''), suffix = IMAGE_STYLES[style] || '';
    return suffix ? p + ', ' + suffix : p;
  }
  // FLUX returns base64; the first characters tell JPEG, PNG and WebP apart.
  function mimeOf(b64) { return /^\/9j\//.test(b64) ? 'image/jpeg' : /^iVBOR/.test(b64) ? 'image/png' : /^UklGR/.test(b64) ? 'image/webp' : 'image/jpeg'; }

  // Strips the wrappers models sometimes add: code fences, quotes and "Here is…" prefaces.
  function clean(text) {
    var t = String(text || '').replace(/^```[a-z]*\s*|```\s*$/gi, '').trim();
    t = t.replace(/^(here(?:'s| is| are)[^\n:]{0,80}:|berikut(?: adalah| ialah)?[^\n:]{0,80}:|sure[,!][^\n]{0,80}\n)\s*/i, '').trim();
    if (/^["“].*["”]$/s.test(t) && t.indexOf('\n') < 0) t = t.slice(1, -1).trim();
    return t;
  }

  // Captions: numbered lines (1. 1) or 1 -) and a "Hashtags:" line, normalised to unique #tags.
  function parseCaptions(text) {
    var lines = clean(text).split(/\n+/), caps = [], tags = [], cur = null;
    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;
      var h = line.match(/^\**\s*(hashtags?|tanda pagar)\s*:?\**\s*:?\s*(.*)$/i);
      if (h) { tags = tags.concat(h[2].match(/#?[\p{L}\p{N}_]+/gu) || []); cur = null; return; }
      var m = line.match(/^\**\s*(\d+)\s*[.):\-]\s*\**\s*(.*)$/);
      if (m) { cur = { text: m[2].replace(/^["“]|["”]$/g, '').trim() }; caps.push(cur); }
      else if (cur) cur.text += '\n' + line;
      else if (/^#/.test(line)) tags = tags.concat(line.match(/#[\p{L}\p{N}_]+/gu) || []);
    });
    var seen = {}, out = [];
    tags.forEach(function (t) { var tag = '#' + t.replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, ''), k = tag.toLowerCase(); if (tag.length > 1 && !seen[k]) { seen[k] = 1; out.push(tag); } });
    return { captions: caps.filter(function (c) { return c.text; }).map(function (c) { return c.text.trim(); }), hashtags: out };
  }

  // Word-level diff (LCS) for "show changes": [{t:'same'|'add'|'del', w:'word '}].
  function diff(a, b) {
    var A = String(a || '').match(/\S+\s*/g) || [], B = String(b || '').match(/\S+\s*/g) || [];
    var norm = function (w) { return w.trim().toLowerCase(); };
    if (A.length * B.length > 4e6) return [{ t: 'del', w: A.join('') }, { t: 'add', w: B.join('') }];
    var n = A.length, m = B.length, L = [];
    for (var i = 0; i <= n; i++) L.push(new Uint16Array(m + 1));
    for (i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--) L[i][j] = norm(A[i]) === norm(B[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var out = [], push = function (t, w) { var last = out[out.length - 1]; if (last && last.t === t) last.w += w; else out.push({ t: t, w: w }); };
    i = 0; j = 0;
    while (i < n && j < m) {
      if (norm(A[i]) === norm(B[j])) { push('same', B[j]); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) push('del', A[i++]);
      else push('add', B[j++]);
    }
    while (i < n) push('del', A[i++]);
    while (j < m) push('add', B[j++]);
    return out;
  }
  // Share of the original words kept in the new text (0-1).
  function similarity(a, b) {
    var d = diff(a, b), same = 0, total = 0;
    d.forEach(function (x) { var k = x.w.trim() ? x.w.trim().split(/\s+/).length : 0; if (x.t !== 'add') total += k; if (x.t === 'same') same += k; });
    return total ? same / total : 0;
  }

  var ERRORS = {
    en: { quota: "Today's free AI allowance is used up. It resets at 8am Malaysia time; please try again then.", daily: "You've reached today's limit for this tool on this connection. Try again tomorrow.",
      rate: 'Too many requests in a minute. Wait a moment and try again.', blocked: 'That request is not allowed here. Please describe something family-friendly.',
      refused: 'The AI declined this text. Please check it is not hateful, sexual or dangerous.', too_long: 'The text is too long for this tool. Shorten it and try again.',
      busy: 'The AI service is busy. Please try again in a minute.', offline: 'You seem to be offline. Connect to the internet and try again.', empty: 'Please enter some text first.', unset: 'The AI service is not set up yet. Please try again later.' },
    ms: { quota: 'Kuota AI percuma hari ini telah habis. Ia ditetapkan semula jam 8 pagi waktu Malaysia; sila cuba lagi selepas itu.', daily: 'Anda telah mencapai had harian alat ini untuk sambungan ini. Cuba lagi esok.',
      rate: 'Terlalu banyak permintaan dalam seminit. Tunggu sebentar dan cuba lagi.', blocked: 'Permintaan itu tidak dibenarkan di sini. Sila huraikan sesuatu yang mesra keluarga.',
      refused: 'AI menolak teks ini. Pastikan ia tidak mengandungi kebencian, unsur seksual atau bahaya.', too_long: 'Teks terlalu panjang untuk alat ini. Pendekkan dan cuba lagi.',
      busy: 'Perkhidmatan AI sedang sibuk. Sila cuba lagi dalam seminit.', offline: 'Anda kelihatan di luar talian. Sambung ke internet dan cuba lagi.', empty: 'Sila masukkan teks dahulu.', unset: 'Perkhidmatan AI belum disediakan. Sila cuba lagi kemudian.' }
  };
  function errorText(code, lang) { var E = ERRORS[lang === 'ms' ? 'ms' : 'en']; return E[code] || E.busy; }

  // Browser helper: POST to the worker with a timeout; resolves the JSON or rejects with an error code.
  function request(api, path, body, timeoutMs) {
    if (!api) return Promise.reject(new Error('unset'));
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.reject(new Error('offline'));
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null, timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, timeoutMs || 45000);
    return fetch(api.replace(/\/+$/, '') + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'busy' }; }); })
      .then(function (j) { clearTimeout(timer); if (!j || !j.ok) throw new Error(j && j.error || 'busy'); return j; }, function (e) { clearTimeout(timer); throw new Error(e && /unset|offline/.test(e.message) ? e.message : 'busy'); });
  }

  var api = { FACTS: FACTS, LANG: LANG, PARA_MODES: PARA_MODES, SUM_LENGTH: SUM_LENGTH, SUM_FORMAT: SUM_FORMAT, TONES: TONES, OCCASIONS: OCCASIONS, PLATFORMS: PLATFORMS, LIMITS: LIMITS,
    IMAGE_STYLES: IMAGE_STYLES, imagePrompt: imagePrompt, mimeOf: mimeOf, detectLang: detectLang, count: count, paraphrase: paraphrase, summarize: summarize, caption: caption, enhance: enhance, clean: clean, parseCaptions: parseCaptions,
    diff: diff, similarity: similarity, errorText: errorText, request: request };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBAi = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
