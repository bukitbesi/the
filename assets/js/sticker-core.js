/* WhatsApp Sticker Maker core shared by the page, the build and the tests: WhatsApp's published sticker rules,
   background removal for plain backgrounds (flood fill from the edges), the sticker outline (distance transform of
   the alpha mask), trimming and fitting into the 512 px square, pack validation and the contents.json used by
   WhatsApp's official sample sticker apps. Canvas drawing and WebP encoding happen in the page. */
(function (root) {
  'use strict';

  // From WhatsApp's sticker README (github.com/WhatsApp/stickers, Android and iOS).
  var SPEC = {
    verified: '2026-10-17', size: 512, maxBytes: 100 * 1024, minPack: 3, maxPack: 30,
    tray: 96, trayMaxBytes: 50 * 1024, maxEmoji: 3, maxAlt: 125, typicalBytes: 15 * 1024
  };

  // ---------------------------------------------------------------- background removal
  // Clears the background: pixels connected to the image border whose colour is within tol (0–100) of the
  // border's median colour. Works for plain or studio backgrounds; busy photos need the eraser.
  // Returns a new alpha mask (Uint8Array, one byte per pixel). rgba: Uint8ClampedArray.
  function borderColour(rgba, w, h) {
    var rs = [], gs = [], bs = [], add = function (i) { if (rgba[i * 4 + 3] > 0) { rs.push(rgba[i * 4]); gs.push(rgba[i * 4 + 1]); bs.push(rgba[i * 4 + 2]); } };
    for (var x = 0; x < w; x++) { add(x); add((h - 1) * w + x); }
    for (var y = 1; y < h - 1; y++) { add(y * w); add(y * w + w - 1); }
    var med = function (a) { a.sort(function (p, q) { return p - q; }); return a.length ? a[a.length >> 1] : 0; };
    return [med(rs), med(gs), med(bs)];
  }
  function floodRemove(rgba, w, h, tol, mask) {
    var out = mask ? new Uint8Array(mask) : alphaOf(rgba, w, h), seen = new Uint8Array(w * h), stack = new Int32Array(w * h), sp = 0;
    var bg = borderColour(rgba, w, h), lim = Math.pow(tol * 4.42, 2), x, y;
    function near(i) {
      var p = i * 4;
      if (rgba[p + 3] === 0) return true;
      var dr = rgba[p] - bg[0], dg = rgba[p + 1] - bg[1], db = rgba[p + 2] - bg[2];
      return dr * dr + dg * dg + db * db <= lim;
    }
    function push(i) { if (!seen[i]) { seen[i] = 1; if (near(i)) stack[sp++] = i; } }
    for (x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (sp) {
      var i = stack[--sp];
      out[i] = 0;
      x = i % w; y = (i - x) / w;
      if (x > 0) push(i - 1);
      if (x < w - 1) push(i + 1);
      if (y > 0) push(i - w);
      if (y < h - 1) push(i + w);
    }
    return { mask: feather(out, w, h), bg: bg };
  }
  function alphaOf(rgba, w, h) { var a = new Uint8Array(w * h); for (var i = 0; i < a.length; i++) a[i] = rgba[i * 4 + 3]; return a; }
  // Softens the cut edge by one pixel so the outline does not look jagged.
  function feather(m, w, h) {
    var o = new Uint8Array(m);
    for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) {
      var i = y * w + x;
      if (m[i] && (!m[i - 1] || !m[i + 1] || !m[i - w] || !m[i + w])) o[i] = Math.min(m[i], 160);
    }
    return o;
  }

  // ---------------------------------------------------------------- outline
  // Chamfer (3-4) distance transform from opaque pixels (alpha >= 128). Distances are in 1/3 pixel units.
  function distance(alpha, w, h) {
    var INF = 1e9, d = new Float32Array(w * h), x, y, i;
    for (i = 0; i < d.length; i++) d[i] = alpha[i] >= 128 ? 0 : INF;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = y * w + x;
      if (!d[i]) continue;
      var v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 3);
      if (y > 0) {
        v = Math.min(v, d[i - w] + 3);
        if (x > 0) v = Math.min(v, d[i - w - 1] + 4);
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + 4);
      }
      d[i] = v;
    }
    for (y = h - 1; y >= 0; y--) for (x = w - 1; x >= 0; x--) {
      i = y * w + x;
      if (!d[i]) continue;
      var u = d[i];
      if (x < w - 1) u = Math.min(u, d[i + 1] + 3);
      if (y < h - 1) {
        u = Math.min(u, d[i + w] + 3);
        if (x < w - 1) u = Math.min(u, d[i + w + 1] + 4);
        if (x > 0) u = Math.min(u, d[i + w - 1] + 4);
      }
      d[i] = u;
    }
    return d;
  }
  // Alpha of an outline of the given width in pixels around the shape, antialiased over the last pixel.
  function outline(alpha, w, h, width) {
    var out = new Uint8Array(w * h);
    if (width <= 0) return out;
    var d = distance(alpha, w, h), lim = width * 3;
    for (var i = 0; i < out.length; i++) {
      var v = d[i];
      out[i] = v <= lim ? 255 : v < lim + 3 ? Math.round(255 * (lim + 3 - v) / 3) : 0;
    }
    return out;
  }

  // ---------------------------------------------------------------- framing
  function bounds(alpha, w, h, min) {
    min = min || 16;
    var x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (alpha[y * w + x] >= min) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  // Scale and offset that fit a content box into the square, leaving room for the outline (pad, px per side).
  function fit(box, size, pad) {
    size = size || SPEC.size;
    var room = size - 2 * (pad || 0), k = Math.min(room / box.w, room / box.h);
    return { scale: k, x: (size - box.w * k) / 2 - box.x * k, y: (size - box.h * k) / 2 - box.y * k };
  }

  // ---------------------------------------------------------------- pack
  function emojis(s) {
    var seg = typeof Intl !== 'undefined' && Intl.Segmenter ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(String(s || '')), function (x) { return x.segment; }) : Array.from(String(s || ''));
    return seg.filter(function (g) { return /\p{Extended_Pictographic}/u.test(g); }).slice(0, SPEC.maxEmoji);
  }
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'my_stickers'; }
  function fileName(i) { return ('0' + (i + 1)).slice(-2) + '.webp'; }
  // stickers: [{ bytes, emojis, alt, webp }]; tray: { bytes }.
  function check(pack) {
    var p = [], n = pack.stickers.length;
    if (n < SPEC.minPack) p.push({ level: 'error', text: 'A pack needs at least ' + SPEC.minPack + ' stickers; add ' + (SPEC.minPack - n) + ' more.' });
    if (n > SPEC.maxPack) p.push({ level: 'error', text: 'A pack can hold at most ' + SPEC.maxPack + ' stickers; remove ' + (n - SPEC.maxPack) + '.' });
    pack.stickers.forEach(function (s, i) {
      if (s.bytes > SPEC.maxBytes) p.push({ level: 'error', text: 'Sticker ' + (i + 1) + ' is ' + Math.ceil(s.bytes / 1024) + ' KB; the limit is 100 KB.' });
      if (s.webp === false) p.push({ level: 'warn', text: 'Sticker ' + (i + 1) + ' was saved as PNG because this browser cannot write WebP; Android needs WebP.' });
      if (!s.emojis || !s.emojis.length) p.push({ level: 'info', text: 'Sticker ' + (i + 1) + ' has no emoji tag; WhatsApp uses them for sticker search.' });
    });
    if (pack.tray && pack.tray.bytes > SPEC.trayMaxBytes) p.push({ level: 'error', text: 'The tray icon is over 50 KB.' });
    if (!String(pack.name || '').trim()) p.push({ level: 'warn', text: 'Give the pack a name.' });
    return p;
  }
  // Same shape as contents.json in WhatsApp's Android sample app, so the folder drops into its assets.
  function contents(pack) {
    return {
      android_play_store_link: '', ios_app_store_link: '',
      sticker_packs: [{
        identifier: slug(pack.name), name: String(pack.name || 'My stickers').slice(0, 128), publisher: String(pack.publisher || 'Me').slice(0, 128),
        tray_image_file: 'tray.png', image_data_version: '1', avoid_cache: false, animated_sticker_pack: false,
        publisher_email: '', publisher_website: '', privacy_policy_website: '', license_agreement_website: '',
        stickers: pack.stickers.map(function (s, i) {
          return { image_file: fileName(i), emojis: s.emojis && s.emojis.length ? s.emojis : ['😀'], accessibility_text: String(s.alt || '').slice(0, SPEC.maxAlt) };
        })
      }]
    };
  }

  var api = { SPEC: SPEC, floodRemove: floodRemove, borderColour: borderColour, feather: feather, distance: distance, outline: outline, bounds: bounds, fit: fit, emojis: emojis, slug: slug, fileName: fileName, check: check, contents: contents };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBSticker = api;
})(typeof self !== 'undefined' ? self : this);
