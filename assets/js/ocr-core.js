/* Image to text (OCR) helpers. Recognition itself is Tesseract (Apache-2.0) run by tesseract.js 7.0.0 in the browser,
   loaded from jsDelivr only when a picture is chosen; language data (English, Malay, Chinese, Tamil) downloads once
   and is cached. This file prepares the picture (size, greyscale, Otsu threshold, rotation) and tidies the text. */
(function (root) {
  'use strict';
  var V = '7.0.0';
  var FACTS = {
    verified: '2026-10-25', version: V,
    lib: 'https://cdn.jsdelivr.net/npm/tesseract.js@' + V + '/dist/tesseract.min.js',
    worker: 'https://cdn.jsdelivr.net/npm/tesseract.js@' + V + '/dist/worker.min.js',
    core: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@' + V,
    // Download sizes of the compressed language models (best_int), in MB.
    langs: { eng: 2.95, msa: 1.18, chi_sim: 1.72, tam: 1.45 },
    coreMb: 3.9, maxSide: 2500
  };

  // Scale factor: small pictures are enlarged (Tesseract reads text about 20–40 px tall best), big ones reduced.
  function scaleFor(w, h) {
    var m = Math.max(w, h);
    if (m > FACTS.maxSide) return FACTS.maxSide / m;
    if (m < 1000) return Math.min(3, 1600 / m);
    return 1;
  }
  function gray(rgba) {
    var g = new Uint8ClampedArray(rgba.length / 4);
    for (var i = 0, p = 0; p < g.length; p++, i += 4) g[p] = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
    return g;
  }
  // Otsu's method: the threshold that best separates dark text from a light page.
  function otsu(g) {
    var hist = new Array(256).fill(0), i, total = g.length, sum = 0, sumB = 0, wB = 0, best = 0, t = 127;
    for (i = 0; i < total; i++) hist[g[i]]++;
    for (i = 0; i < 256; i++) sum += i * hist[i];
    for (i = 0; i < 256; i++) {
      wB += hist[i]; if (!wB) continue;
      var wF = total - wB; if (!wF) break;
      sumB += i * hist[i];
      var mB = sumB / wB, mF = (sum - sumB) / wF, between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; t = i; }
    }
    return t;
  }
  // Enhance: greyscale, then black-and-white at the Otsu threshold. Light text on a dark background is flipped.
  function enhance(rgba) {
    var g = gray(rgba), t = otsu(g), dark = 0, out = new Uint8ClampedArray(rgba.length);
    for (var p = 0; p < g.length; p++) if (g[p] <= t) dark++;
    var flip = dark > g.length / 2;
    for (var q = 0, i = 0; q < g.length; q++, i += 4) { var v = (g[q] <= t) !== flip ? 0 : 255; out[i] = out[i + 1] = out[i + 2] = v; out[i + 3] = 255; }
    return { data: out, threshold: t, inverted: flip };
  }

  // Tidy recognised text: join words split by a line-end hyphen, optionally join lines inside paragraphs,
  // collapse runs of spaces and blank lines.
  function clean(text, o) {
    o = o || {};
    var s = String(text || '').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n');
    s = s.replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2');
    if (o.join) s = s.replace(/([^\n])\n(?!\n)/g, '$1 ');
    return s.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }
  function stats(text) {
    var t = String(text || '').trim();
    return { chars: t.length, words: t ? t.split(/\s+/).length : 0, lines: t ? t.split('\n').length : 0 };
  }
  // Languages: Tesseract codes joined with "+", English always first when chosen.
  function langs(list) {
    var ok = (list || []).filter(function (l) { return FACTS.langs[l]; });
    return (ok.length ? ok : ['eng']).sort(function (a, b) { return a === 'eng' ? -1 : b === 'eng' ? 1 : 0; });
  }
  function downloadMb(list) { return Math.round((FACTS.coreMb + langs(list).reduce(function (s, l) { return s + FACTS.langs[l]; }, 0)) * 10) / 10; }

  var api = { FACTS: FACTS, scaleFor: scaleFor, gray: gray, otsu: otsu, enhance: enhance, clean: clean, stats: stats, langs: langs, downloadMb: downloadMb };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBOcr = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
