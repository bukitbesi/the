/* Photo Editor core shared by the page, the build and the tests: pixel adjustments on RGBA arrays (tone curve,
   colour, blur, sharpen, vignette, grain), filter presets, the layer document (bounds, hit testing, crop, rotate,
   flip, resize, order) and undo history. Drawing to a canvas happens in the page. */
(function (root) {
  'use strict';

  var FACTS = { verified: '2026-10-17', maxSide: 8192, historyLimit: 60 };

  // ---------------------------------------------------------------- adjustments
  // Every slider runs from -100 to 100 (0 = unchanged) except blur, sharpen, vignette and grain (0 to 100).
  var ADJUST = [
    { key: 'exposure', label: 'Exposure', min: -100, max: 100, desc: 'Brightens or darkens like a camera stop: +50 doubles the light' },
    { key: 'brightness', label: 'Brightness', min: -100, max: 100, desc: 'Lifts or lowers every tone by the same amount' },
    { key: 'contrast', label: 'Contrast', min: -100, max: 100, desc: 'Pushes tones away from or towards mid grey' },
    { key: 'highlights', label: 'Highlights', min: -100, max: 100, desc: 'Recovers or boosts the brightest third (skies, windows)' },
    { key: 'shadows', label: 'Shadows', min: -100, max: 100, desc: 'Opens up or deepens the darkest third (faces in shade)' },
    { key: 'saturation', label: 'Saturation', min: -100, max: 100, desc: 'Makes every colour stronger or weaker; -100 is black and white' },
    { key: 'vibrance', label: 'Vibrance', min: -100, max: 100, desc: 'Boosts muted colours more than strong ones, kinder to skin' },
    { key: 'temperature', label: 'Warmth', min: -100, max: 100, desc: 'Warmer (orange) or cooler (blue) light' },
    { key: 'tint', label: 'Tint', min: -100, max: 100, desc: 'Shifts towards magenta or green' },
    { key: 'hue', label: 'Hue', min: -180, max: 180, desc: 'Rotates all colours around the colour wheel' },
    { key: 'sharpen', label: 'Sharpen', min: 0, max: 100, desc: 'Crisper edges (unsharp mask)' },
    { key: 'blur', label: 'Blur', min: 0, max: 100, desc: 'Softens the whole photo' },
    { key: 'vignette', label: 'Vignette', min: 0, max: 100, desc: 'Darkens the corners to draw the eye to the centre' },
    { key: 'grain', label: 'Grain', min: 0, max: 100, desc: 'Adds film-like noise' }
  ];
  var NONE = {};
  ADJUST.forEach(function (a) { NONE[a.key] = 0; });
  NONE.grayscale = 0; NONE.sepia = 0; NONE.invert = 0;

  var FILTERS = {
    none: { label: 'Original' },
    vivid: { label: 'Vivid', contrast: 15, saturation: 30, vibrance: 20 },
    warm: { label: 'Warm', temperature: 35, saturation: 8, brightness: 4 },
    cool: { label: 'Cool', temperature: -35, tint: -5, contrast: 6 },
    golden: { label: 'Golden hour', temperature: 45, exposure: 8, highlights: -20, saturation: 12, vignette: 25 },
    matte: { label: 'Matte', contrast: -25, shadows: 30, saturation: -15, brightness: 5 },
    fade: { label: 'Fade', contrast: -35, saturation: -30, brightness: 10 },
    drama: { label: 'Drama', contrast: 40, highlights: -35, shadows: 25, vibrance: 15, vignette: 35, sharpen: 25 },
    teal: { label: 'Teal and orange', temperature: 20, tint: -12, contrast: 18, saturation: 15, hue: -6 },
    mono: { label: 'Black and white', grayscale: 100, contrast: 15 },
    noir: { label: 'Noir', grayscale: 100, contrast: 55, shadows: -20, vignette: 45, grain: 20 },
    sepia: { label: 'Sepia', sepia: 100, contrast: 5, vignette: 20 },
    vintage: { label: 'Vintage', sepia: 45, contrast: -15, saturation: -20, vignette: 40, grain: 25, temperature: 15 },
    invert: { label: 'Invert', invert: 100 }
  };
  // A filter sets a starting point; the sliders add on top of it.
  function combine(filter, adjust) {
    var f = FILTERS[filter] || FILTERS.none, out = {};
    Object.keys(NONE).forEach(function (k) { out[k] = (f[k] || 0) + ((adjust && adjust[k]) || 0); });
    return out;
  }
  function isIdentity(a) { return Object.keys(NONE).every(function (k) { return !a[k]; }); }

  var clamp = function (v) { return v < 0 ? 0 : v > 255 ? 255 : v; };
  // Tone curve as a lookup table: exposure (stops), brightness (offset), contrast (around mid grey),
  // highlights and shadows (lift or pull the bright and dark thirds).
  function toneLut(a) {
    var lut = new Uint8ClampedArray(256), ex = Math.pow(2, (a.exposure || 0) / 50), br = (a.brightness || 0) * 1.28;
    var c = (a.contrast || 0) * 2.55, cf = (259 * (c + 255)) / (255 * (259 - c)), hi = (a.highlights || 0) / 100, sh = (a.shadows || 0) / 100;
    for (var i = 0; i < 256; i++) {
      var v = i * ex + br;
      v = cf * (v - 128) + 128;
      var t = Math.max(0, Math.min(1, v / 255));
      v += hi * 80 * Math.max(0, (t - 0.5) * 2) * t;
      v += sh * 80 * Math.max(0, (0.5 - t) * 2) * (1 - t);
      lut[i] = clamp(Math.round(v));
    }
    return lut;
  }
  function hueMatrix(deg) {
    var r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    return [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
      0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283,
      0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072];
  }

  // Box blur (three passes approximate a Gaussian). Works in place on RGBA, alpha included.
  function boxBlur(d, w, h, r) {
    if (r < 1) return;
    var tmp = new Float32Array(d.length), x, y, k, i, acc = [0, 0, 0, 0], span = r * 2 + 1;
    for (var pass = 0; pass < 3; pass++) {
      for (y = 0; y < h; y++) {
        acc[0] = acc[1] = acc[2] = acc[3] = 0;
        for (k = -r; k <= r; k++) { i = (y * w + Math.min(w - 1, Math.max(0, k))) * 4; acc[0] += d[i]; acc[1] += d[i + 1]; acc[2] += d[i + 2]; acc[3] += d[i + 3]; }
        for (x = 0; x < w; x++) {
          var o = (y * w + x) * 4;
          tmp[o] = acc[0] / span; tmp[o + 1] = acc[1] / span; tmp[o + 2] = acc[2] / span; tmp[o + 3] = acc[3] / span;
          var a = (y * w + Math.min(w - 1, x + r + 1)) * 4, b = (y * w + Math.max(0, x - r)) * 4;
          acc[0] += d[a] - d[b]; acc[1] += d[a + 1] - d[b + 1]; acc[2] += d[a + 2] - d[b + 2]; acc[3] += d[a + 3] - d[b + 3];
        }
      }
      for (x = 0; x < w; x++) {
        acc[0] = acc[1] = acc[2] = acc[3] = 0;
        for (k = -r; k <= r; k++) { i = (Math.min(h - 1, Math.max(0, k)) * w + x) * 4; acc[0] += tmp[i]; acc[1] += tmp[i + 1]; acc[2] += tmp[i + 2]; acc[3] += tmp[i + 3]; }
        for (y = 0; y < h; y++) {
          var p = (y * w + x) * 4;
          d[p] = acc[0] / span; d[p + 1] = acc[1] / span; d[p + 2] = acc[2] / span; d[p + 3] = acc[3] / span;
          var c2 = (Math.min(h - 1, y + r + 1) * w + x) * 4, e = (Math.max(0, y - r) * w + x) * 4;
          acc[0] += tmp[c2] - tmp[e]; acc[1] += tmp[c2 + 1] - tmp[e + 1]; acc[2] += tmp[c2 + 2] - tmp[e + 2]; acc[3] += tmp[c2 + 3] - tmp[e + 3];
        }
      }
    }
  }
  // Unsharp mask: original + amount * (original - blurred).
  function sharpen(d, w, h, amount) {
    if (amount <= 0) return;
    var b = new Uint8ClampedArray(d);
    boxBlur(b, w, h, 1);
    var k = amount / 50;
    for (var i = 0; i < d.length; i += 4) {
      d[i] = clamp(d[i] + k * (d[i] - b[i])); d[i + 1] = clamp(d[i + 1] + k * (d[i + 1] - b[i + 1])); d[i + 2] = clamp(d[i + 2] + k * (d[i + 2] - b[i + 2]));
    }
  }

  // img: { data: Uint8ClampedArray RGBA, width, height }. scale: preview size / full size, so blur looks the same.
  function apply(img, a, scale) {
    var d = img.data, w = img.width, h = img.height, n = d.length;
    if (isIdentity(a)) return img;
    scale = scale || 1;
    var lut = toneLut(a), sat = 1 + (a.saturation || 0) / 100, vib = (a.vibrance || 0) / 100;
    var temp = (a.temperature || 0) * 0.3, tint = (a.tint || 0) * 0.3, m = a.hue ? hueMatrix(a.hue) : null;
    var gray = (a.grayscale || 0) / 100, sep = (a.sepia || 0) / 100, inv = (a.invert || 0) / 100;
    for (var i = 0; i < n; i += 4) {
      var r = lut[d[i]], g = lut[d[i + 1]], b = lut[d[i + 2]];
      if (temp || tint) { r += temp; b -= temp; g -= tint; }
      if (m) { var r2 = m[0] * r + m[1] * g + m[2] * b, g2 = m[3] * r + m[4] * g + m[5] * b, b2 = m[6] * r + m[7] * g + m[8] * b; r = r2; g = g2; b = b2; }
      if (sat !== 1 || vib) {
        var l = 0.2126 * r + 0.7152 * g + 0.0722 * b, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        var s = sat + vib * (1 - (mx - mn) / 255);
        r = l + (r - l) * s; g = l + (g - l) * s; b = l + (b - l) * s;
      }
      if (gray) { var y = 0.2126 * r + 0.7152 * g + 0.0722 * b; r += (y - r) * gray; g += (y - g) * gray; b += (y - b) * gray; }
      if (sep) {
        var sr = 0.393 * r + 0.769 * g + 0.189 * b, sg = 0.349 * r + 0.686 * g + 0.168 * b, sb = 0.272 * r + 0.534 * g + 0.131 * b;
        r += (sr - r) * sep; g += (sg - g) * sep; b += (sb - b) * sep;
      }
      if (inv) { r += (255 - 2 * r) * inv; g += (255 - 2 * g) * inv; b += (255 - 2 * b) * inv; }
      d[i] = clamp(r); d[i + 1] = clamp(g); d[i + 2] = clamp(b);
    }
    if (a.blur > 0) boxBlur(d, w, h, Math.max(1, Math.round(a.blur / 100 * Math.max(w, h) / 80 * 1)));
    if (a.sharpen > 0) sharpen(d, w, h, a.sharpen);
    if (a.vignette > 0) {
      var cx = w / 2, cy = h / 2, maxd = Math.sqrt(cx * cx + cy * cy), str = a.vignette / 100;
      for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
        var dist = Math.sqrt((xx - cx) * (xx - cx) + (yy - cy) * (yy - cy)) / maxd, f = 1 - str * Math.pow(Math.max(0, dist - 0.35) / 0.65, 2);
        var o = (yy * w + xx) * 4;
        d[o] *= f; d[o + 1] *= f; d[o + 2] *= f;
      }
    }
    if (a.grain > 0) {
      var seed = 12345, amt = a.grain * 0.6;
      for (var j = 0; j < n; j += 4) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        var noise = ((seed / 0x7fffffff) - 0.5) * amt;
        d[j] = clamp(d[j] + noise); d[j + 1] = clamp(d[j + 1] + noise); d[j + 2] = clamp(d[j + 2] + noise);
      }
    }
    return img;
  }

  // ---------------------------------------------------------------- document and layers
  var uid = 0;
  function id(prefix) { uid++; return (prefix || 'l') + uid + Math.random().toString(36).slice(2, 6); }
  function newDoc(w, h, bg) { return { w: Math.round(w), h: Math.round(h), bg: bg === undefined ? '#ffffff' : bg, layers: [], selected: null }; }
  var BASE = { x: 0, y: 0, w: 100, h: 100, rotation: 0, opacity: 100, flipX: false, flipY: false, hidden: false, blend: 'source-over' };
  function layer(type, props) {
    var l = { id: id(type.charAt(0)), type: type, name: '' };
    Object.keys(BASE).forEach(function (k) { l[k] = BASE[k]; });
    if (type === 'image') { l.src = null; l.filter = 'none'; l.adjust = {}; }
    if (type === 'text') { l.text = 'Your text'; l.font = 'system-ui'; l.size = 64; l.weight = 800; l.color = '#ffffff'; l.stroke = '#000000'; l.strokeWidth = 4; l.align = 'center'; l.shadow = true; l.box = ''; l.lineHeight = 1.15; l.italic = false; }
    if (type === 'shape') { l.kind = 'rect'; l.fill = '#6c5ce7'; l.stroke = '#000000'; l.strokeWidth = 0; l.radius = 0; }
    if (type === 'draw') { l.paths = []; }
    Object.keys(props || {}).forEach(function (k) { l[k] = props[k]; });
    return l;
  }
  function add(doc, l) { doc.layers.push(l); doc.selected = l.id; return l; }
  function find(doc, lid) { for (var i = 0; i < doc.layers.length; i++) if (doc.layers[i].id === lid) return doc.layers[i]; return null; }
  function remove(doc, lid) { doc.layers = doc.layers.filter(function (l) { return l.id !== lid; }); if (doc.selected === lid) doc.selected = doc.layers.length ? doc.layers[doc.layers.length - 1].id : null; }
  function move(doc, lid, delta) {
    var i = doc.layers.findIndex(function (l) { return l.id === lid; }), j = Math.max(0, Math.min(doc.layers.length - 1, i + delta));
    if (i < 0 || i === j) return false;
    var l = doc.layers.splice(i, 1)[0];
    doc.layers.splice(j, 0, l);
    return true;
  }
  // Fits an image layer inside the document, centred (contain), as when a photo is opened or added.
  function fitInto(doc, w, h, cover) {
    var k = cover ? Math.max(doc.w / w, doc.h / h) : Math.min(doc.w / w, doc.h / h, 1), nw = w * k, nh = h * k;
    return { x: (doc.w - nw) / 2, y: (doc.h - nh) / 2, w: nw, h: nh };
  }
  // Point in layer, honouring rotation around the layer centre.
  function hit(l, px, py, pad) {
    pad = pad || 0;
    if (l.hidden) return false;
    if (l.type === 'draw') return false;
    var cx = l.x + l.w / 2, cy = l.y + l.h / 2, r = -(l.rotation || 0) * Math.PI / 180;
    var dx = px - cx, dy = py - cy, rx = dx * Math.cos(r) - dy * Math.sin(r), ry = dx * Math.sin(r) + dy * Math.cos(r);
    return Math.abs(rx) <= l.w / 2 + pad && Math.abs(ry) <= l.h / 2 + pad;
  }
  function hitTest(doc, px, py, pad) {
    for (var i = doc.layers.length - 1; i >= 0; i--) if (hit(doc.layers[i], px, py, pad)) return doc.layers[i].id;
    return null;
  }
  // Document-wide operations move every layer so the picture stays together.
  function each(doc, f) { doc.layers.forEach(f); }
  function crop(doc, r) {
    var x = Math.round(r.x), y = Math.round(r.y), w = Math.max(1, Math.round(r.w)), h = Math.max(1, Math.round(r.h));
    each(doc, function (l) {
      l.x -= x; l.y -= y;
      if (l.type === 'draw') l.paths.forEach(function (p) { p.points = p.points.map(function (q) { return [q[0] - x, q[1] - y]; }); });
    });
    doc.w = w; doc.h = h;
  }
  function rotate90(doc, cw) {
    var W = doc.w, H = doc.h;
    var pt = function (px, py) { return cw ? [H - py, px] : [py, W - px]; };
    each(doc, function (l) {
      var c = pt(l.x + l.w / 2, l.y + l.h / 2);
      l.x = c[0] - l.w / 2; l.y = c[1] - l.h / 2;
      l.rotation = ((l.rotation || 0) + (cw ? 90 : -90) + 360) % 360;
      if (l.type === 'draw') { l.rotation = 0; l.paths.forEach(function (p) { p.points = p.points.map(function (q) { return pt(q[0], q[1]); }); }); }
    });
    doc.w = H; doc.h = W;
  }
  function flip(doc, axis) {
    each(doc, function (l) {
      if (axis === 'x') { l.x = doc.w - l.x - l.w; l.flipX = !l.flipX; l.rotation = (360 - (l.rotation || 0)) % 360; }
      else { l.y = doc.h - l.y - l.h; l.flipY = !l.flipY; l.rotation = (360 - (l.rotation || 0)) % 360; }
      if (l.type === 'draw') { l.flipX = l.flipY = false; l.paths.forEach(function (p) { p.points = p.points.map(function (q) { return axis === 'x' ? [doc.w - q[0], q[1]] : [q[0], doc.h - q[1]]; }); }); }
    });
  }
  function resize(doc, w, h) {
    var kx = w / doc.w, ky = h / doc.h;
    each(doc, function (l) {
      l.x *= kx; l.y *= ky; l.w *= kx; l.h *= ky;
      if (l.type === 'text') l.size *= Math.min(kx, ky);
      if (l.type === 'shape') l.strokeWidth *= Math.min(kx, ky);
      if (l.type === 'draw') l.paths.forEach(function (p) { p.size *= Math.min(kx, ky); p.points = p.points.map(function (q) { return [q[0] * kx, q[1] * ky]; }); });
    });
    doc.w = Math.round(w); doc.h = Math.round(h);
  }
  // Largest rectangle of the given ratio (w/h) centred in the document; ratio 0 means the whole document.
  function aspectRect(W, H, ratio) {
    if (!ratio) return { x: 0, y: 0, w: W, h: H };
    var w = W, h = W / ratio;
    if (h > H) { h = H; w = H * ratio; }
    return { x: (W - w) / 2, y: (H - h) / 2, w: w, h: h };
  }
  function clampRect(r, W, H, ratio) {
    var w = Math.max(8, Math.min(r.w, W)), h = Math.max(8, Math.min(r.h, H));
    if (ratio) { h = w / ratio; if (h > H) { h = H; w = h * ratio; } }
    return { x: Math.max(0, Math.min(W - w, r.x)), y: Math.max(0, Math.min(H - h, r.y)), w: w, h: h };
  }
  var CROPS = [['Free', 0], ['Original', -1], ['1:1', 1], ['4:5', 4 / 5], ['3:4', 3 / 4], ['9:16', 9 / 16], ['16:9', 16 / 9], ['3:2', 3 / 2], ['2:3', 2 / 3]];
  var CANVASES = [['Square post', 1080, 1080], ['Portrait post', 1080, 1350], ['Story or Reel', 1080, 1920], ['YouTube thumbnail', 1280, 720], ['Full HD', 1920, 1080], ['A4 at 150 dpi', 1240, 1754]];

  // ---------------------------------------------------------------- history (undo / redo of JSON snapshots)
  function History(limit) { this.past = []; this.future = []; this.limit = limit || FACTS.historyLimit; }
  History.prototype.push = function (state) {
    var s = JSON.stringify(state);
    if (this.past.length && this.past[this.past.length - 1] === s) return false;
    this.past.push(s);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
    return true;
  };
  History.prototype.undo = function (current) {
    if (!this.past.length) return null;
    var s = this.past.pop();
    this.future.push(JSON.stringify(current));
    return JSON.parse(s);
  };
  History.prototype.redo = function (current) {
    if (!this.future.length) return null;
    var s = this.future.pop();
    this.past.push(JSON.stringify(current));
    return JSON.parse(s);
  };

  // Text layout helpers shared with the page: split lines and size the box from measured widths.
  function textLines(t) { return String(t || '').split('\n'); }
  function fontCss(l) { return (l.italic ? 'italic ' : '') + l.weight + ' ' + Math.round(l.size) + 'px ' + (FONTS[l.font] || l.font); }
  var FONTS = { 'system-ui': 'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif', serif: 'Georgia,"Times New Roman",serif', mono: 'ui-monospace,Consolas,monospace', impact: 'Impact,"Arial Black",system-ui,sans-serif', rounded: '"Arial Rounded MT Bold","Trebuchet MS",system-ui,sans-serif', cursive: '"Brush Script MT","Segoe Script",cursive' };

  var api = {
    FACTS: FACTS, ADJUST: ADJUST, NONE: NONE, FILTERS: FILTERS, CROPS: CROPS, CANVASES: CANVASES, FONTS: FONTS,
    combine: combine, isIdentity: isIdentity, toneLut: toneLut, apply: apply, boxBlur: boxBlur,
    newDoc: newDoc, layer: layer, add: add, find: find, remove: remove, move: move, fitInto: fitInto, hit: hit, hitTest: hitTest,
    crop: crop, rotate90: rotate90, flip: flip, resize: resize, aspectRect: aspectRect, clampRect: clampRect, History: History,
    textLines: textLines, fontCss: fontCss
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBPhoto = api;
})(typeof self !== 'undefined' ? self : this);
