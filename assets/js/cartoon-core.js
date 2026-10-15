/* Photo to cartoon in the browser: no upload, no AI server. Pipeline on RGBA pixels:
   1. edge-preserving smoothing (Kuwahara filter on integral images, O(1) per pixel per quadrant),
   2. colour reduction (k-means palette on a pixel sample, or per-channel posterize),
   3. outlines (Sobel gradient on the smoothed luminance, thresholded and thickened),
   4. composite (palette colours with dark lines), or a pencil sketch (colour-dodge of the inverted blur).
   Styles are presets of those four controls. Deterministic: the same picture and settings give the same result. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-16', maxSide: 1200 };
  var STYLES = {
    classic: { smooth: 4, colors: 8, line: 0.5, thick: 1, mode: 'kmeans' },
    comic: { smooth: 3, colors: 6, line: 0.35, thick: 2, mode: 'kmeans', boost: 1.25 },
    anime: { smooth: 5, colors: 12, line: 0.6, thick: 1, mode: 'kmeans', boost: 1.1, bright: 1.06 },
    pop: { smooth: 3, colors: 4, line: 0.4, thick: 2, mode: 'posterize', boost: 1.5 },
    paint: { smooth: 6, colors: 16, line: 0, thick: 0, mode: 'kmeans', boost: 1.05 },
    sketch: { smooth: 0, colors: 0, line: 0, thick: 0, mode: 'sketch', blur: 8 }
  };
  var lum = function (r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; };
  var clamp = function (v) { return v < 0 ? 0 : v > 255 ? 255 : v; };

  // Largest size that keeps processing fast on phones.
  function fit(w, h, max) {
    max = max || FACTS.maxSide;
    var s = Math.min(1, max / Math.max(w, h));
    return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)), scale: s };
  }

  // Kuwahara: each pixel takes the mean colour of the least-varied of its four (r+1)×(r+1) quadrants.
  function kuwahara(src, w, h, r) {
    if (!r) return new Uint8ClampedArray(src);
    var W = w + 1, n = W * (h + 1);
    var sR = new Float64Array(n), sG = new Float64Array(n), sB = new Float64Array(n), sL = new Float64Array(n), sL2 = new Float64Array(n);
    for (var y = 0; y < h; y++) {
      var rr = 0, rg = 0, rb = 0, rl = 0, rl2 = 0;
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4, l = lum(src[i], src[i + 1], src[i + 2]);
        rr += src[i]; rg += src[i + 1]; rb += src[i + 2]; rl += l; rl2 += l * l;
        var k = (y + 1) * W + x + 1, u = y * W + x + 1;
        sR[k] = sR[u] + rr; sG[k] = sG[u] + rg; sB[k] = sB[u] + rb; sL[k] = sL[u] + rl; sL2[k] = sL2[u] + rl2;
      }
    }
    var box = function (S, x0, y0, x1, y1) { return S[(y1 + 1) * W + x1 + 1] - S[y0 * W + x1 + 1] - S[(y1 + 1) * W + x0] + S[y0 * W + x0]; };
    var out = new Uint8ClampedArray(src.length);
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        var best = Infinity, br = 0, bg = 0, bb = 0;
        for (var q = 0; q < 4; q++) {
          var x0 = q & 1 ? x : x - r, x1 = q & 1 ? x + r : x, y0 = q & 2 ? y : y - r, y1 = q & 2 ? y + r : y;
          if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0; if (x1 >= w) x1 = w - 1; if (y1 >= h) y1 = h - 1;
          var cnt = (x1 - x0 + 1) * (y1 - y0 + 1), m = box(sL, x0, y0, x1, y1) / cnt, v = box(sL2, x0, y0, x1, y1) / cnt - m * m;
          if (v < best) { best = v; br = box(sR, x0, y0, x1, y1) / cnt; bg = box(sG, x0, y0, x1, y1) / cnt; bb = box(sB, x0, y0, x1, y1) / cnt; }
        }
        var o = (y * w + x) * 4;
        out[o] = br; out[o + 1] = bg; out[o + 2] = bb; out[o + 3] = src[o + 3];
      }
    }
    return out;
  }

  // Saturation and brightness boost around each pixel's luminance.
  function vivid(px, sat, bright) {
    sat = sat || 1; bright = bright || 1;
    if (sat === 1 && bright === 1) return px;
    for (var i = 0; i < px.length; i += 4) {
      var l = lum(px[i], px[i + 1], px[i + 2]);
      px[i] = clamp((l + (px[i] - l) * sat) * bright); px[i + 1] = clamp((l + (px[i + 1] - l) * sat) * bright); px[i + 2] = clamp((l + (px[i + 2] - l) * sat) * bright);
    }
    return px;
  }

  // k-means palette from an evenly spaced sample, seeded by luminance quantiles so results never vary between runs.
  function palette(px, k, samples) {
    var total = px.length / 4, step = Math.max(1, Math.floor(total / (samples || 6000))), pts = [];
    for (var p = 0; p < total; p += step) pts.push([px[p * 4], px[p * 4 + 1], px[p * 4 + 2]]);
    k = Math.max(1, Math.min(k, pts.length));
    var sorted = pts.slice().sort(function (a, b) { return lum(a[0], a[1], a[2]) - lum(b[0], b[1], b[2]); });
    var cent = [];
    for (var c = 0; c < k; c++) cent.push(sorted[Math.min(sorted.length - 1, Math.floor((c + 0.5) * sorted.length / k))].slice());
    var label = new Int32Array(pts.length);
    for (var it = 0; it < 10; it++) {
      var sum = cent.map(function () { return [0, 0, 0, 0]; });
      for (var j = 0; j < pts.length; j++) {
        var bi = 0, bd = Infinity, t = pts[j];
        for (c = 0; c < k; c++) { var dr = t[0] - cent[c][0], dg = t[1] - cent[c][1], db = t[2] - cent[c][2], d = dr * dr + dg * dg + db * db; if (d < bd) { bd = d; bi = c; } }
        label[j] = bi; sum[bi][0] += t[0]; sum[bi][1] += t[1]; sum[bi][2] += t[2]; sum[bi][3]++;
      }
      for (c = 0; c < k; c++) if (sum[c][3]) cent[c] = [sum[c][0] / sum[c][3], sum[c][1] / sum[c][3], sum[c][2] / sum[c][3]];
    }
    return cent.map(function (x) { return [Math.round(x[0]), Math.round(x[1]), Math.round(x[2])]; });
  }

  function quantize(px, pal) {
    var cache = new Map();
    for (var i = 0; i < px.length; i += 4) {
      var key = (px[i] >> 2) << 12 | (px[i + 1] >> 2) << 6 | px[i + 2] >> 2, hit = cache.get(key);
      if (hit === undefined) {
        var bd = Infinity;
        for (var c = 0; c < pal.length; c++) { var dr = px[i] - pal[c][0], dg = px[i + 1] - pal[c][1], db = px[i + 2] - pal[c][2], d = dr * dr + dg * dg + db * db; if (d < bd) { bd = d; hit = c; } }
        cache.set(key, hit);
      }
      px[i] = pal[hit][0]; px[i + 1] = pal[hit][1]; px[i + 2] = pal[hit][2];
    }
    return px;
  }

  function posterize(px, levels) {
    var n = Math.max(2, Math.round(Math.cbrt(Math.max(8, levels * 2)))), step = 255 / (n - 1);
    for (var i = 0; i < px.length; i += 4) for (var c = 0; c < 3; c++) px[i + c] = Math.round(Math.round(px[i + c] / step) * step);
    return px;
  }

  // Sobel gradient magnitude of luminance, scaled to 0-1.
  function sobel(px, w, h) {
    var g = new Float32Array(w * h), out = new Float32Array(w * h), max = 0;
    for (var i = 0, p = 0; p < w * h; p++, i += 4) g[p] = lum(px[i], px[i + 1], px[i + 2]);
    for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) {
      var o = y * w + x;
      var gx = -g[o - w - 1] - 2 * g[o - 1] - g[o + w - 1] + g[o - w + 1] + 2 * g[o + 1] + g[o + w + 1];
      var gy = -g[o - w - 1] - 2 * g[o - w] - g[o - w + 1] + g[o + w - 1] + 2 * g[o + w] + g[o + w + 1];
      var m = Math.sqrt(gx * gx + gy * gy); out[o] = m; if (m > max) max = m;
    }
    if (max) for (p = 0; p < out.length; p++) out[p] /= max;
    return out;
  }

  // Edge mask: strength 0-1 sets the threshold (higher strength = more lines), thick dilates by that many pixels.
  function edges(px, w, h, strength, thick) {
    var mag = sobel(px, w, h), thr = 0.45 - 0.37 * strength, mask = new Uint8Array(w * h);
    for (var p = 0; p < mask.length; p++) mask[p] = mag[p] > thr ? 1 : 0;
    for (var t = 1; t < thick; t++) {
      var grown = mask.slice();
      for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) { var o = y * w + x; if (!mask[o] && (mask[o - 1] || mask[o + 1] || mask[o - w] || mask[o + w])) grown[o] = 1; }
      mask = grown;
    }
    return mask;
  }

  function boxBlur(g, w, h, r) {
    var tmp = new Float32Array(g.length), out = new Float32Array(g.length), d = 2 * r + 1;
    for (var y = 0; y < h; y++) { var s = 0; for (var x = -r; x <= r; x++) s += g[y * w + Math.min(w - 1, Math.max(0, x))]; for (x = 0; x < w; x++) { tmp[y * w + x] = s / d; s += g[y * w + Math.min(w - 1, x + r + 1)] - g[y * w + Math.max(0, x - r)]; } }
    for (x = 0; x < w; x++) { s = 0; for (y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]; for (y = 0; y < h; y++) { out[y * w + x] = s / d; s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; } }
    return out;
  }

  // Pencil sketch: grey ÷ (1 − blurred inverted grey), the classic colour-dodge blend.
  function sketch(px, w, h, blur) {
    var g = new Float32Array(w * h);
    for (var i = 0, p = 0; p < g.length; p++, i += 4) g[p] = 255 - lum(px[i], px[i + 1], px[i + 2]);
    var b = boxBlur(boxBlur(g, w, h, blur), w, h, blur), out = new Uint8ClampedArray(px.length);
    for (i = 0, p = 0; p < g.length; p++, i += 4) {
      var base = 255 - g[p], v = b[p] >= 255 ? 255 : Math.min(255, base * 255 / (255 - b[p]));
      out[i] = out[i + 1] = out[i + 2] = v; out[i + 3] = px[i + 3];
    }
    return out;
  }

  function settings(o) {
    o = o || {};
    var s = STYLES[o.style] ? o.style : 'classic', base = STYLES[s], num = function (v, d) { v = Number(v); return isFinite(v) ? v : d; };
    return { style: s, mode: base.mode, smooth: Math.max(0, Math.min(8, Math.round(num(o.smooth, base.smooth)))), colors: Math.max(2, Math.min(32, Math.round(num(o.colors, base.colors || 8)))),
      line: Math.max(0, Math.min(1, num(o.line, base.line))), thick: Math.max(0, Math.min(4, Math.round(num(o.thick, base.thick)))), boost: base.boost || 1, bright: base.bright || 1, blur: base.blur || 8 };
  }

  function cartoon(px, w, h, opts) {
    var s = settings(opts);
    if (s.mode === 'sketch') return { data: sketch(px, w, h, s.blur), palette: [], settings: s };
    var smooth = kuwahara(px, w, h, s.smooth);
    vivid(smooth, s.boost, s.bright);
    var pal = [];
    if (s.mode === 'posterize') posterize(smooth, s.colors);
    else { pal = palette(smooth, s.colors); quantize(smooth, pal); }
    if (s.line > 0 && s.thick > 0) {
      var mask = edges(smooth, w, h, s.line, s.thick);
      for (var p = 0, i = 0; p < mask.length; p++, i += 4) if (mask[p]) { smooth[i] = smooth[i + 1] = 28; smooth[i + 2] = 32; }
    }
    return { data: smooth, palette: pal, settings: s };
  }

  var api = { FACTS: FACTS, STYLES: STYLES, fit: fit, kuwahara: kuwahara, palette: palette, quantize: quantize, posterize: posterize, sobel: sobel, edges: edges, sketch: sketch, settings: settings, cartoon: cartoon };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBCartoon = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
