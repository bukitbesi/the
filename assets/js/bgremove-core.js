/* Background remover and passport photo core, all on RGBA pixels in the browser. The AI matte (0-255 per pixel)
   comes from an open model run by Transformers.js in the page (MODNet for people, BiRefNet-lite for any object, both
   permissively licensed); a plain-background cut (flood fill from the edges) needs no download. This file refines the
   matte (threshold, grow/shrink, feather), applies eraser/restore brush strokes, composites onto transparent, a
   colour, a blurred copy of the photo, and works out passport-photo crops and print sheets. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-20', maxSide: 2048 };
  var MODELS = {
    person: { id: 'Xenova/modnet', mb: 7, dtype: 'q8', licence: 'Apache-2.0' },
    object: { id: 'onnx-community/BiRefNet_lite-ONNX', mb: 115, dtype: 'fp16', licence: 'MIT' }
  };
  var clamp = function (v) { return v < 0 ? 0 : v > 255 ? 255 : v; };

  function fit(w, h, max) {
    var s = Math.min(1, (max || FACTS.maxSide) / Math.max(w, h));
    return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
  }

  // Plain backgrounds: clear pixels connected to the border whose colour is within tol (0-100) of the border median.
  function floodMask(rgba, w, h, tol) {
    var border = [];
    for (var x = 0; x < w; x += Math.max(1, w >> 6)) { border.push(x); border.push((h - 1) * w + x); }
    for (var y = 0; y < h; y += Math.max(1, h >> 6)) { border.push(y * w); border.push(y * w + w - 1); }
    var ch = [0, 1, 2].map(function (c) { var v = border.map(function (p) { return rgba[p * 4 + c]; }).sort(function (a, b) { return a - b; }); return v[v.length >> 1]; });
    var lim = Math.pow((tol === undefined ? 12 : tol) * 4.42, 2), mask = new Uint8ClampedArray(w * h).fill(255), seen = new Uint8Array(w * h), stack = [];
    var near = function (p) { var i = p * 4, dr = rgba[i] - ch[0], dg = rgba[i + 1] - ch[1], db = rgba[i + 2] - ch[2]; return dr * dr + dg * dg + db * db <= lim; };
    for (x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
    for (y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
    while (stack.length) {
      var p = stack.pop();
      if (seen[p] || !near(p)) continue;
      seen[p] = 1; mask[p] = 0;
      var px = p % w;
      if (px > 0) stack.push(p - 1); if (px < w - 1) stack.push(p + 1); if (p >= w) stack.push(p - w); if (p < w * (h - 1)) stack.push(p + w);
    }
    return mask;
  }

  function boxBlur1(src, w, h, r) {
    if (r < 1) return src;
    var tmp = new Float32Array(src.length), out = new Uint8ClampedArray(src.length), d = 2 * r + 1, x, y, s;
    for (y = 0; y < h; y++) { s = 0; for (x = -r; x <= r; x++) s += src[y * w + Math.min(w - 1, Math.max(0, x))]; for (x = 0; x < w; x++) { tmp[y * w + x] = s / d; s += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)]; } }
    for (x = 0; x < w; x++) { s = 0; for (y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]; for (y = 0; y < h; y++) { out[y * w + x] = s / d; s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; } }
    return out;
  }

  // Matte refinement. cut (0-100): how strict the edge is; shift (-10..10 px): grow (+) or shrink (-) the subject;
  // feather (0-10 px): soften the edge. Returns a new matte.
  function refine(mask, w, h, o) {
    o = o || {};
    var cut = Math.max(0, Math.min(100, o.cut === undefined ? 50 : Number(o.cut))), shift = Math.round(Number(o.shift) || 0), feather = Math.max(0, Math.round(Number(o.feather) || 0));
    var out = new Uint8ClampedArray(mask.length), lo = cut * 2.0, hi = Math.min(255, lo + 60);
    for (var i = 0; i < mask.length; i++) out[i] = mask[i] <= lo ? 0 : mask[i] >= hi ? 255 : (mask[i] - lo) * 255 / (hi - lo);
    if (shift) {
      // Grow or shrink by blurring then re-thresholding: a cheap morphological dilate/erode.
      var b = boxBlur1(out, w, h, Math.abs(shift)), t = shift > 0 ? 40 : 215;
      for (i = 0; i < out.length; i++) out[i] = b[i] > t ? 255 : (b[i] * 255 / t) * (shift > 0 ? 1 : 0);
    }
    return feather ? boxBlur1(out, w, h, feather) : out;
  }

  // Brush stroke on the matte: mode 'erase' lowers to 0, 'restore' raises to 255, with a soft edge.
  function brush(mask, w, h, cx, cy, r, mode) {
    var x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w - 1, Math.ceil(cx + r)), y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(h - 1, Math.ceil(cy + r));
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / r;
      if (d > 1) continue;
      var k = d < 0.7 ? 1 : (1 - d) / 0.3, i = y * w + x;
      mask[i] = mode === 'erase' ? mask[i] * (1 - k) : mask[i] + (255 - mask[i]) * k;
    }
    return mask;
  }

  // Tight box around the subject (matte > 128), with optional padding in pixels; null if empty.
  function bounds(mask, w, h, pad) {
    var x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (mask[y * w + x] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    pad = pad || 0;
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  function hex(c) { var m = /^#?([0-9a-f]{6})$/i.exec(c || ''); var n = m ? parseInt(m[1], 16) : 0xffffff; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }

  // Composite the photo over a background. bg: { type: 'transparent' | 'color' | 'blur', color, blur }.
  function composite(rgba, mask, w, h, bg) {
    bg = bg || { type: 'transparent' };
    var out = new Uint8ClampedArray(rgba.length), back = null, col = hex(bg.color);
    if (bg.type === 'blur') {
      back = new Uint8ClampedArray(rgba.length);
      for (var c = 0; c < 3; c++) {
        var ch = new Uint8ClampedArray(w * h);
        for (var p = 0; p < ch.length; p++) ch[p] = rgba[p * 4 + c];
        var bl = boxBlur1(boxBlur1(ch, w, h, bg.blur || 12), w, h, bg.blur || 12);
        for (p = 0; p < ch.length; p++) back[p * 4 + c] = bl[p];
      }
    }
    for (var i = 0, q = 0; q < mask.length; q++, i += 4) {
      var a = mask[q] / 255;
      if (bg.type === 'transparent') { out[i] = rgba[i]; out[i + 1] = rgba[i + 1]; out[i + 2] = rgba[i + 2]; out[i + 3] = clamp(a * rgba[i + 3]); continue; }
      var br = back ? back[i] : col[0], bgc = back ? back[i + 1] : col[1], bb = back ? back[i + 2] : col[2];
      out[i] = rgba[i] * a + br * (1 - a); out[i + 1] = rgba[i + 1] * a + bgc * (1 - a); out[i + 2] = rgba[i + 2] * a + bb * (1 - a); out[i + 3] = 255;
    }
    return out;
  }

  // ---- passport photos
  var MM_PER_IN = 25.4;
  // Pixel size for a print at dpi (300 dpi is standard for photo prints).
  function printPixels(wmm, hmm, dpi) { dpi = dpi || 300; return { w: Math.round(wmm / MM_PER_IN * dpi), h: Math.round(hmm / MM_PER_IN * dpi) }; }
  // Finds the head in a person matte: crown (top of the matte), chin and the head's centre line. Walks down the
  // rows: the widest part near the top is the head, the narrowest part below it is the neck, and the rows widen again
  // at the shoulders. The chin is taken at the neck's narrowest row: a beard or collar hides the real jawline in a
  // silhouette, and this row stays within about 10% of the chin. When no neck shows (a tudung or long hair flows into
  // the shoulders) the head is taken as 1.4 × its width, the usual crown-to-chin ratio including hair.
  function headBox(mask, w, h) {
    var b = bounds(mask, w, h);
    if (!b) return null;
    var rows = [], y, x;
    for (y = b.y; y < b.y + b.h; y++) {
      var l = -1, r = -1;
      for (x = b.x; x < b.x + b.w; x++) if (mask[y * w + x] > 128) { if (l < 0) l = x; r = x; }
      rows.push(l < 0 ? [0, 0] : [l, r]);
    }
    var wd = function (i) { return rows[i][1] - rows[i][0]; };
    var hmax = 0, hy = 0, phase = 0, nmin = Infinity, ny = -1, found = false;
    for (var i = 0; i < rows.length; i++) {
      var v = wd(i);
      if (phase === 0) { if (v >= hmax) { hmax = v; hy = i; } else if (v < 0.9 * hmax && i > 4) { phase = 1; nmin = v; ny = i; } }
      else { if (v < nmin) { nmin = v; ny = i; } if (v > 1.25 * hmax) { found = true; break; } }
    }
    var chin = found ? ny : -1;
    if (chin < 0.9 * hmax || chin > 1.8 * hmax) chin = Math.min(rows.length - 1, Math.round(1.4 * hmax));
    return { top: b.y, chin: b.y + chin, cx: (rows[hy][0] + rows[hy][1]) / 2, width: hmax };
  }
  // Scale and offset that put that head in a photo frame: crown at topFrac of the frame height and crown-to-chin
  // filling headFrac of it, centred left to right.
  function placeHead(head, frameW, frameH, topFrac, headFrac) {
    var s = frameH * headFrac / Math.max(1, head.chin - head.top);
    return { scale: s, x: frameW / 2 - head.cx * s, y: frameH * topFrac - head.top * s };
  }
  // How many photos of wmm × hmm fit on a paper (mm), with gap mm between them and margin mm at the edges,
  // trying both paper orientations. Photo labs print edge to edge and the photos are cut along thin lines, so the
  // defaults are no gap and no margin; home printers need a margin (about 5 mm on A4).
  function sheet(wmm, hmm, paperW, paperH, gap, margin) {
    gap = gap || 0; margin = margin || 0;
    var grid = function (pw, ph) { var c = Math.floor((pw - 2 * margin + gap) / (wmm + gap)), r = Math.floor((ph - 2 * margin + gap) / (hmm + gap)); return { cols: Math.max(0, c), rows: Math.max(0, r), count: Math.max(0, c) * Math.max(0, r), paperW: pw, paperH: ph }; };
    var a = grid(paperW, paperH), b = grid(paperH, paperW);
    return b.count > a.count ? b : a;
  }

  // Photo specs. mm: print size (w × h); px: file size we export; kb: [min, max] file size when the authority sets one;
  // head: [min, max] crown-to-chin as a share of the photo height when published; bg: required background.
  // Only figures stated by the issuing authority are filled in; the rest are left null and the guides are hidden.
  var PASSPORT = {
    my: { mm: [35, 50], px: [413, 591], kb: null, head: [25 / 50, 30 / 50], bg: '#ffffff', src: 'JIM' },
    myonline: { mm: [35, 50], px: [827, 1181], kb: [100, 300], head: null, bg: '#ffffff', src: 'JIM MyOnline Passport' },
    us: { mm: [50.8, 50.8], px: [600, 600], kb: null, head: [25 / 50.8, 35 / 50.8], bg: '#ffffff', src: 'travel.state.gov' },
    cn: { mm: [33, 48], px: [390, 567], kb: null, head: null, bg: '#ffffff', src: 'China visa centre' },
    jp: { mm: [35, 45], px: [413, 531], kb: null, head: null, bg: '#ffffff', src: 'Embassy of Japan' },
    schengen: { mm: [35, 45], px: [413, 531], kb: null, head: null, bg: '#ffffff', src: 'Schengen visa' },
    uk: { mm: null, px: [900, 1125], kb: null, head: null, bg: '#ffffff', src: 'GOV.UK' },
    sa: { mm: null, px: [200, 200], kb: [5, 100], head: null, bg: '#ffffff', src: 'Saudi eVisa' },
    in: { mm: null, px: [600, 600], kb: [10, 300], head: null, bg: '#ffffff', src: 'Indian e-Visa' }
  };
  // Picks a JPEG quality so the file lands inside [min, max] KB. encode(q) returns the byte size at quality q
  // (synchronous in tests, from canvas.toBlob in the page via a wrapper). Returns { q, kb, ok }.
  function targetQuality(encode, min, max) {
    var lo = 0.3, hi = 0.98, best = null, kb;
    for (var i = 0; i < 8; i++) {
      var q = (lo + hi) / 2;
      kb = encode(q) / 1024;
      if (kb > max) hi = q; else { best = { q: q, kb: kb }; if (kb < min) lo = q; else break; }
    }
    if (!best) { kb = encode(lo) / 1024; best = { q: lo, kb: kb }; }
    best.ok = best.kb >= min && best.kb <= max;
    return best;
  }

  var api = { FACTS: FACTS, MODELS: MODELS, PASSPORT: PASSPORT, targetQuality: targetQuality, fit: fit, floodMask: floodMask, refine: refine, brush: brush, bounds: bounds, composite: composite, blur: boxBlur1, hex: hex, printPixels: printPixels, headBox: headBox, placeHead: placeHead, sheet: sheet };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBBgRemove = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
