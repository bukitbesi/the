/* AI image and video prompt builder, shared by the AI Prompt Generator and Image to Prompt pages.
   One set of choices (subject, style, lighting, camera…) is written out in each platform's own format:
   Midjourney takes parameters (--ar, --no, --stylize); Stable Diffusion takes comma keywords, a separate negative
   prompt and reads about 75 CLIP tokens; Flux, ChatGPT/DALL·E, Veo, Sora and Runway read plain sentences and have no
   negative-prompt syntax (Runway warns negative wording can do the opposite); Kling has its own negative prompt box;
   Veo and Sora generate sound, so audio and dialogue lines are added for them. Verified 13 October 2026. */
(function (root) {
  'use strict';

  var FACTS = { verified: '2026-10-13', sdTokens: 75, mjStylizeMax: 1000, variations: 3 };

  // Prompt terms stay in English on both pages: image and video models follow English prompts best.
  var GROUPS = {
    style: ['photorealistic', 'cinematic film still', 'digital painting', 'anime', 'watercolor painting', 'oil painting',
      '3D render', 'stylized 3D animation', 'pixel art', 'isometric illustration', 'flat vector illustration', 'comic book art',
      'cyberpunk', 'fantasy concept art', 'Malaysian batik art', 'minimalist'],
    lighting: ['golden hour', 'soft natural light', 'dramatic rim light', 'neon glow', 'studio softbox lighting',
      'overcast diffused light', 'moonlight', 'volumetric light rays', 'candlelight', 'backlit silhouette'],
    shot: ['close-up portrait', 'extreme close-up', 'medium shot', 'wide shot', 'aerial drone view', 'low angle shot',
      'high angle shot', "bird's-eye view", 'macro shot', 'over-the-shoulder shot'],
    lens: ['24mm wide-angle lens', '35mm lens', '50mm lens', '85mm portrait lens', '100mm macro lens',
      'shallow depth of field', 'tilt-shift effect', 'fisheye lens'],
    mood: ['serene', 'dramatic', 'mysterious', 'joyful', 'nostalgic', 'epic', 'cozy', 'melancholic', 'whimsical', 'futuristic'],
    color: ['vibrant colors', 'pastel palette', 'muted earth tones', 'monochrome', 'teal and orange', 'black and white',
      'warm tones', 'cool blue tones'],
    quality: ['highly detailed', 'sharp focus', 'intricate textures', 'film grain', 'award-winning photography', 'clean composition'],
    motion: ['slow dolly in', 'slow dolly out', 'tracking shot following the subject', 'orbit around the subject', 'slow pan left',
      'tilt up', 'crane shot rising', 'handheld camera', 'drone flyover', 'the camera remains still'],
    pace: ['slow motion', 'real-time', 'time-lapse']
  };
  var IMAGE_GROUPS = ['style', 'lighting', 'shot', 'lens', 'mood', 'color', 'quality'];
  var VIDEO_GROUPS = ['style', 'motion', 'shot', 'lighting', 'mood', 'color', 'pace'];
  var ASPECTS = ['1:1', '4:5', '2:3', '3:4', '9:16', '5:4', '3:2', '4:3', '16:9', '21:9'];

  // neg: 'param' (inline flag), 'field' (separate box), 'none' (no negative prompt syntax).
  var PLATFORMS = {
    image: {
      midjourney: { name: 'Midjourney', form: 'keywords', neg: 'param', ar: 'param' },
      sd: { name: 'Stable Diffusion', form: 'keywords', neg: 'field', ar: 'setting' },
      dalle: { name: 'ChatGPT / DALL·E', form: 'sentences', neg: 'none', ar: 'words' },
      flux: { name: 'Flux', form: 'sentences', neg: 'none', ar: 'setting' },
      any: { name: 'Gemini, Leonardo, Canva…', form: 'sentences', neg: 'none', ar: 'words' }
    },
    video: {
      veo: { name: 'Google Veo', form: 'video', neg: 'none', ar: 'setting', audio: true },
      sora: { name: 'Sora', form: 'video', neg: 'none', ar: 'setting', audio: true },
      kling: { name: 'Kling', form: 'video', neg: 'field', ar: 'setting' },
      runway: { name: 'Runway', form: 'runway', neg: 'none', ar: 'setting' },
      any: { name: 'Hailuo, Pika, Luma…', form: 'video', neg: 'none', ar: 'setting' }
    }
  };

  var LABELS = {
    en: {
      variants: { main: 'Your prompt', cinematic: 'Cinematic twist', artistic: 'Artistic twist' },
      noNeg: function (p) { return p + ' has no negative prompt. Describe what you want instead of what to avoid.'; },
      negField: function (p) { return 'Paste the negative prompt into ' + p + "'s negative prompt box."; },
      arSetting: function (ar) { return 'Choose ' + ar + ' in the app\'s size or aspect ratio setting.'; },
      sdLong: function (n) { return 'About ' + n + ' tokens: Stable Diffusion reads roughly the first 75, so put key words first.'; },
      empty: 'Add a subject to build a prompt.'
    },
    ms: {
      variants: { main: 'Prompt anda', cinematic: 'Versi sinematik', artistic: 'Versi artistik' },
      noNeg: function (p) { return p + ' tiada prompt negatif. Terangkan apa yang anda mahu, bukan apa yang perlu dielakkan.'; },
      negField: function (p) { return 'Tampal prompt negatif ke kotak negative prompt dalam ' + p + '.'; },
      arSetting: function (ar) { return 'Pilih ' + ar + ' dalam tetapan saiz atau nisbah aspek aplikasi.'; },
      sdLong: function (n) { return 'Kira-kira ' + n + ' token: Stable Diffusion membaca lebih kurang 75 yang pertama, jadi letak kata kunci di depan.'; },
      empty: 'Masukkan subjek untuk membina prompt.'
    }
  };

  var TEXT_KEYS = ['subject', 'action', 'setting', 'details', 'negative', 'sound', 'dialogue'];
  var ALL_KEYS = ['mode', 'platform', 'aspect'].concat(TEXT_KEYS, Object.keys(GROUPS));

  var clean = function (s, max) {
    return String(s == null ? '' : s).replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/[.,;:\s]+$/, '').slice(0, max || 300);
  };
  var cap = function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
  var article = function (w) { return /^(?:[aeio]|u(?!ni|s[eu])|hour|honest|3D|8)/i.test(w) ? 'an' : 'a'; };

  function normalize(input) {
    var s = {}, i = input || {};
    s.mode = i.mode === 'video' ? 'video' : 'image';
    var list = PLATFORMS[s.mode];
    s.platform = list[i.platform] ? i.platform : Object.keys(list)[0];
    s.aspect = ASPECTS.indexOf(i.aspect) >= 0 ? i.aspect : s.mode === 'video' ? '16:9' : '1:1';
    TEXT_KEYS.forEach(function (k) { s[k] = clean(i[k], k === 'details' || k === 'negative' ? 400 : 200); });
    Object.keys(GROUPS).forEach(function (k) { s[k] = clean(i[k], 80); });
    return s;
  }

  // The three variations: the choices as given, then a cinematic and an artistic take that only fill or swap style slots.
  var ARTSY = /painting|illustration|anime|art|pixel|comic|batik|3D/i;
  function variant(s, kind) {
    var v = {};
    for (var k in s) v[k] = s[k];
    if (kind === 'main') { if (!v.style && v.mode === 'image') v.style = 'photorealistic'; return v; }
    if (kind === 'cinematic') {
      v.style = 'cinematic film still';
      v.lighting = v.lighting || (v.mode === 'video' ? 'volumetric light rays' : 'golden hour');
      v.lens = v.lens || '35mm lens';
      v.color = v.color || 'teal and orange';
      v.quality = 'film grain';
      if (v.mode === 'video') { v.style = 'cinematic'; v.motion = v.motion || 'slow dolly in'; }
      return v;
    }
    v.style = ARTSY.test(s.style) ? (s.style === 'watercolor painting' ? 'oil painting' : 'watercolor painting') : 'digital painting';
    v.lighting = v.lighting || 'soft natural light';
    v.mood = v.mood || 'whimsical';
    v.color = v.color || 'pastel palette';
    v.quality = 'intricate textures';
    if (v.mode === 'video') v.style = ARTSY.test(s.style) ? 'hand-drawn 2D animation' : 'stylized 3D animation';
    return v;
  }

  var join = function (parts, sep) { return parts.filter(Boolean).join(sep); };
  var scene = function (v) { return join([v.subject, v.action, v.setting ? (/^(in|on|at|under|inside|beside|near|by|over|through|across)\b/i.test(v.setting) ? '' : 'in ') + v.setting : ''], ' '); };

  function keywords(v) {
    return join([v.subject, v.action, v.setting, v.details, v.style, v.shot, v.lens, v.lighting, v.mood ? v.mood + ' mood' : '', v.color, v.quality], ', ');
  }
  // Adjective styles need a noun after them in a sentence: "a photorealistic photo of…".
  var styleNoun = function (st) { return st === 'photorealistic' ? 'photorealistic photo' : /^(cyberpunk|minimalist)$/.test(st) ? st + ' artwork' : st; };
  function sentences(v, words) {
    v = Object.assign({}, v, { style: styleNoun(v.style) });
    var lead = v.style ? cap(article(v.style)) + ' ' + v.style + ' of ' + article(v.subject) + ' ' + scene(v) : cap(scene(v));
    if (v.style && /^(a|an|the|two|three|\d)\b|s$/i.test(v.subject)) lead = cap(article(v.style)) + ' ' + v.style + ' of ' + scene(v);
    var look = join([v.shot ? 'shot as ' + article(v.shot) + ' ' + v.shot : '', v.lens ? 'with ' + article(v.lens) + ' ' + v.lens : ''], ' ');
    var feel = join([v.lighting, v.mood ? v.mood + ' mood' : '', v.color], ', ');
    return join([lead + '.', v.details ? cap(v.details) + '.' : '', look ? cap(look) + '.' : '', feel ? cap(feel) + '.' : '',
      v.quality ? cap(v.quality) + '.' : '', words ? cap(words) + '.' : ''], ' ');
  }
  function video(v, p) {
    var lead = (v.shot ? cap(article(v.shot)) + ' ' + v.shot + ' of ' : '') + (v.shot ? scene(v) : cap(scene(v)));
    var runway = p.form === 'runway';
    var out = [];
    if (runway && v.motion) out.push(cap(v.motion) + ': ' + (v.shot ? lead : scene(v)) + '.');
    else out.push(lead + '.');
    if (v.details) out.push(cap(v.details) + '.');
    if (!runway && v.motion) out.push('Camera: ' + v.motion + '.');
    var look = join([v.style ? v.style + (/(style|animation|art|painting|still)$/.test(v.style) ? '' : ' style') : '', v.lighting, v.mood ? v.mood + ' mood' : '', v.color, v.pace], ', ');
    if (look) out.push(cap(look) + '.');
    if (p.audio) {
      if (v.dialogue) out.push('The character says: "' + v.dialogue.replace(/"/g, "'") + '"');
      if (v.sound) out.push('Audio: ' + v.sound + '.');
    }
    return out.join(' ');
  }

  // Rough CLIP token count: words, number runs and punctuation; long words usually split in two.
  function tokens(text) {
    return (String(text).match(/[a-z]+|\d+|[^\sa-z\d]/gi) || []).reduce(function (n, t) { return n + (t.length > 8 ? 2 : 1); }, 0);
  }
  var wordCount = function (t) { return (String(t).match(/\S+/g) || []).length; };

  function build(input, kind, lang) {
    var s = normalize(input), L = LABELS[lang === 'ms' ? 'ms' : 'en'], p = PLATFORMS[s.mode][s.platform];
    if (!s.subject) return { ok: false, kind: kind || 'main', label: L.variants[kind || 'main'], platform: p.name, prompt: '', negative: '', notes: [L.empty], words: 0, tokens: 0 };
    var v = variant(s, kind || 'main'), notes = [], prompt, negative = '';
    var ratioWords = s.aspect === '1:1' ? 'square format' : (orientation(s.aspect) + ' ' + s.aspect + ' format');
    if (p.form === 'keywords') prompt = keywords(v);
    else if (p.form === 'sentences') prompt = sentences(v, p.ar === 'words' ? ratioWords : '');
    else prompt = video(v, p);
    if (s.platform === 'midjourney') {
      prompt += ' --ar ' + s.aspect;
      if (kind === 'artistic') prompt += ' --stylize 400';
      if (kind === 'cinematic') prompt += ' --stylize 150';
      if (s.negative) prompt += ' --no ' + s.negative;
    } else if (p.neg === 'field') negative = s.negative;
    else if (s.negative) notes.push(L.noNeg(p.name));
    if (negative) notes.push(L.negField(p.name));
    if (p.ar === 'setting') notes.push(L.arSetting(s.aspect));
    var t = tokens(prompt);
    if (s.platform === 'sd' && t > FACTS.sdTokens) notes.push(L.sdLong(t));
    return { ok: true, kind: kind || 'main', label: L.variants[kind || 'main'], platform: p.name, prompt: prompt, negative: negative, notes: notes, words: wordCount(prompt), tokens: t };
  }
  function buildAll(input, lang) {
    return ['main', 'cinematic', 'artistic'].map(function (k) { return build(input, k, lang); });
  }

  function orientation(ar) {
    var a = ar.split(':');
    return +a[0] > +a[1] ? 'landscape' : +a[0] < +a[1] ? 'portrait' : 'square';
  }
  function aspectOf(w, h) {
    if (!(w > 0 && h > 0)) return '1:1';
    var r = Math.log(w / h), best = '1:1', d = Infinity;
    ASPECTS.forEach(function (a) { var x = a.split(':'), e = Math.abs(Math.log(x[0] / x[1]) - r); if (e < d) { d = e; best = a; } });
    return best;
  }

  // "Surprise me": a seeded generator so a shared link rebuilds the same idea.
  var SUBJECTS = {
    image: ['a cat wearing a tiny songkok', 'an old fisherman mending nets', 'a floating island with waterfalls', 'a robot barista making teh tarik',
      'a tiger cub in a misty rainforest', 'a lighthouse on a stormy cliff', 'a girl in a red baju kurung holding a lantern',
      'a vintage Vespa scooter', 'an astronaut tending a rooftop garden', 'a wooden kampung house on stilts', 'a hornbill on a mossy branch',
      'a steaming bowl of laksa', 'a samurai fox warrior', 'a glass terrarium with a tiny city inside'],
    video: ['a hot air balloon drifting over paddy fields', 'a barista pouring latte art', 'a paper boat sailing down a rain-soaked street',
      'a dancer spinning in a flowing silk dress', 'fireflies lighting up a mangrove river at night', 'a chef tossing noodles in a flaming wok',
      'a kite flying over a beach at sunset', 'an origami crane coming to life', 'a train crossing a bridge through misty hills', 'waves crashing on a rocky shore']
  };
  var SETTINGS = ['in a neon-lit Kuala Lumpur street at night', 'on a quiet beach at sunrise', 'in an ancient rainforest', 'inside a cozy wooden cafe',
    'on a misty mountain top', 'in a futuristic city', 'in a traditional night market', 'in a field of sunflowers', 'in a snowy village', 'underwater among coral reefs'];
  function rng(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function surprise(seed, mode) {
    var r = rng(seed), pick = function (l) { return l[Math.floor(r() * l.length)]; };
    mode = mode === 'video' ? 'video' : 'image';
    var s = { mode: mode, subject: pick(SUBJECTS[mode]), setting: pick(SETTINGS) };
    (mode === 'video' ? VIDEO_GROUPS : IMAGE_GROUPS).forEach(function (g) { s[g] = r() < 0.8 ? pick(GROUPS[g]) : ''; });
    if (/^(in|on|at|inside|under)\b/.test(s.setting) && /\b(in|on|over|down)\b/.test(s.subject)) s.setting = '';
    return s;
  }

  // ---- Image to prompt: colour and tone read from the pixels, plus the vision model's description.
  var NAMED = [['black', 20, 20, 20], ['charcoal', 60, 60, 64], ['grey', 128, 128, 128], ['light grey', 200, 200, 200], ['white', 245, 245, 245],
    ['red', 200, 30, 35], ['crimson', 140, 20, 40], ['orange', 240, 130, 30], ['gold', 212, 170, 50], ['yellow', 245, 220, 60],
    ['olive', 120, 120, 40], ['green', 50, 150, 60], ['forest green', 30, 80, 40], ['teal', 20, 128, 128], ['cyan', 60, 200, 220],
    ['sky blue', 120, 180, 230], ['blue', 40, 80, 200], ['navy', 20, 30, 80], ['purple', 120, 50, 160], ['magenta', 200, 40, 160],
    ['pink', 240, 160, 190], ['brown', 110, 70, 40], ['tan', 200, 160, 110], ['beige', 230, 215, 185]];
  function colorName(r, g, b) {
    var best = '', d = Infinity;
    NAMED.forEach(function (c) { var e = (c[1] - r) * (c[1] - r) * 0.3 + (c[2] - g) * (c[2] - g) * 0.59 + (c[3] - b) * (c[3] - b) * 0.11; if (e < d) { d = e; best = c[0]; } });
    return best;
  }
  var hex = function (r, g, b) { return '#' + [r, g, b].map(function (x) { return ('0' + Math.round(x).toString(16)).slice(-2); }).join(''); };

  // pixels: RGBA bytes (canvas getImageData().data). Buckets at 3 bits a channel, then the biggest distinct buckets.
  function analyse(pixels, w, h) {
    var bins = {}, n = 0, lum = 0, sat = 0, warm = 0, cool = 0;
    for (var i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 128) continue;
      var r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], key = (r >> 5) << 6 | (g >> 5) << 3 | (b >> 5);
      var bin = bins[key] || (bins[key] = { n: 0, r: 0, g: 0, b: 0 });
      bin.n++; bin.r += r; bin.g += g; bin.b += b; n++;
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      lum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      var s = mx ? (mx - mn) / mx : 0;
      sat += s;
      if (s > 0.2) { if (r > b + 20) warm++; else if (b > r + 20) cool++; }
    }
    if (!n) return { palette: [], brightness: 0, saturation: 0, aspect: aspectOf(w, h), hints: {} };
    var list = Object.keys(bins).map(function (k) { var x = bins[k]; return { r: x.r / x.n, g: x.g / x.n, b: x.b / x.n, n: x.n }; })
      .sort(function (a, c) { return c.n - a.n; });
    var palette = [];
    list.forEach(function (c) {
      if (palette.length >= 5 || (palette.length && c.n / n < 0.03)) return;
      var near = palette.some(function (p) { return Math.abs(p.r - c.r) + Math.abs(p.g - c.g) + Math.abs(p.b - c.b) < 60; });
      if (!near) palette.push(c);
    });
    palette = palette.map(function (c) { return { hex: hex(c.r, c.g, c.b), name: colorName(c.r, c.g, c.b), share: Math.round(c.n / n * 100) }; });
    var brightness = lum / n, saturation = sat / n, hints = {};
    if (saturation < 0.08) hints.color = 'black and white';
    else if (saturation < 0.18) hints.color = 'muted earth tones';
    else if (saturation > 0.45) hints.color = 'vibrant colors';
    else if (warm > cool * 2) hints.color = 'warm tones';
    else if (cool > warm * 2) hints.color = 'cool blue tones';
    if (brightness < 0.25) hints.lighting = 'moonlight';
    else if (brightness > 0.75) hints.lighting = 'soft natural light';
    var names = [];
    palette.forEach(function (p) { if (names.indexOf(p.name) < 0 && names.length < 3) names.push(p.name); });
    hints.details = 'color palette of ' + names.join(', ').replace(/, ([^,]*)$/, ' and $1');
    return { palette: palette, brightness: Math.round(brightness * 100) / 100, saturation: Math.round(saturation * 100) / 100, aspect: aspectOf(w, h), hints: hints };
  }

  // The worker asks the model for JSON; accept JSON, JSON inside a code fence, or plain prose.
  var VISION_KEYS = ['subject', 'action', 'setting', 'details', 'style', 'lighting', 'shot', 'mood', 'color'];
  function parseVision(text) {
    var out = {}, raw = String(text || ''), m = raw.match(/\{[\s\S]*\}/), obj = null;
    if (m) { try { obj = JSON.parse(m[0]); } catch (e) { obj = null; } }
    if (obj && typeof obj === 'object') {
      if (obj.colors && !obj.color) obj.color = obj.colors;
      if (obj.camera && !obj.shot) obj.shot = obj.camera;
      VISION_KEYS.forEach(function (k) {
        var x = obj[k];
        if (Array.isArray(x)) x = x.join(', ');
        x = clean(x, k === 'details' ? 300 : 160);
        if (x && !/^(none|n\/a|unknown|null)$/i.test(x)) out[k] = x.charAt(0).toLowerCase() + x.slice(1);
      });
    }
    if (!out.subject) {
      var prose = clean(raw.replace(/```[a-z]*|```/g, '').replace(/^\s*(this image shows|the image shows|the image depicts|this is)\s*/i, ''), 200);
      if (prose && !m) out.subject = prose.charAt(0).toLowerCase() + prose.slice(1);
    }
    return out;
  }
  // Model output first; the pixel hints only fill empty slots (they never overwrite what the model saw).
  function merge(vision, local, mode) {
    var s = { mode: mode === 'video' ? 'video' : 'image' };
    VISION_KEYS.forEach(function (k) { if (vision && vision[k]) s[k] = vision[k]; });
    if (local) {
      if (local.aspect) s.aspect = local.aspect;
      ['color', 'lighting'].forEach(function (k) { if (!s[k] && local.hints && local.hints[k]) s[k] = local.hints[k]; });
      if (!s.details && local.hints && local.hints.details) s.details = local.hints.details;
    }
    return s;
  }

  // URL hash: short keys, only non-empty values, so links stay readable and shareable.
  var SHORT = { mode: 'm', platform: 'p', aspect: 'ar', subject: 's', action: 'a', setting: 'w', details: 'd', negative: 'n', sound: 'au', dialogue: 'dl',
    style: 'st', lighting: 'l', shot: 'sh', lens: 'le', mood: 'mo', color: 'c', quality: 'q', motion: 'cm', pace: 'pa' };
  function toHash(state) {
    return ALL_KEYS.filter(function (k) { return state[k]; }).map(function (k) { return SHORT[k] + '=' + encodeURIComponent(state[k]); }).join('&');
  }
  function fromHash(hash) {
    var long = {}, s = {};
    Object.keys(SHORT).forEach(function (k) { long[SHORT[k]] = k; });
    String(hash || '').replace(/^#/, '').split('&').forEach(function (kv) {
      var i = kv.indexOf('=');
      if (i < 1) return;
      var k = long[kv.slice(0, i)] || (SHORT[kv.slice(0, i)] ? kv.slice(0, i) : '');
      if (k) { try { s[k] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); } catch (e) { /* skip malformed */ } }
    });
    return s;
  }

  var api = {
    FACTS: FACTS, GROUPS: GROUPS, IMAGE_GROUPS: IMAGE_GROUPS, VIDEO_GROUPS: VIDEO_GROUPS, ASPECTS: ASPECTS, PLATFORMS: PLATFORMS, LABELS: LABELS,
    normalize: normalize, build: build, buildAll: buildAll, tokens: tokens, aspectOf: aspectOf, surprise: surprise,
    colorName: colorName, analyse: analyse, parseVision: parseVision, merge: merge, toHash: toHash, fromHash: fromHash
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBPrompt = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
