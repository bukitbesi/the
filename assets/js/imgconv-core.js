/* Image Converter core shared by the page, the build and the tests: output formats, input sniffing, resize
   maths, BMP and ICO encoders (browsers cannot write either), the quality search behind "target file size", and
   output names. Pixel decoding and JPEG/PNG/WebP/AVIF encoding use the browser's own codecs in the page. */
(function (root) {
  'use strict';

  // WebP sizes are from Google's WebP compression study (lossy vs JPEG at equal SSIM; lossless vs PNG).
  var FACTS = { verified: '2026-10-17', webpVsJpeg: '25–34%', webpVsPng: '26%', maxPixels: 60e6, maxBytes: 80 * 1024 * 1024 };

  var FORMATS = {
    jpeg: { label: 'JPG', ext: 'jpg', mime: 'image/jpeg', lossy: true, alpha: false, anim: false, use: 'Photos; smallest for camera pictures where WebP is not accepted', support: 'Everywhere' },
    png: { label: 'PNG', ext: 'png', mime: 'image/png', lossy: false, alpha: true, anim: false, use: 'Screenshots, logos and text; exact pixels', support: 'Everywhere' },
    webp: { label: 'WebP', ext: 'webp', mime: 'image/webp', lossy: true, alpha: true, anim: true, use: 'Websites: smaller than JPG and PNG with transparency', support: 'All current browsers; some older apps cannot open it' },
    avif: { label: 'AVIF', ext: 'avif', mime: 'image/avif', lossy: true, alpha: true, anim: true, use: 'Websites: often smaller than WebP, slower to encode', support: 'Current browsers; encoding only where the browser supports it' },
    ico: { label: 'ICO', ext: 'ico', mime: 'image/x-icon', lossy: false, alpha: true, anim: false, use: 'favicon.ico and Windows icons (16 to 256 px in one file)', support: 'Browsers and Windows' },
    bmp: { label: 'BMP', ext: 'bmp', mime: 'image/bmp', lossy: false, alpha: false, anim: false, use: 'Old software that needs uncompressed bitmaps', support: 'Everywhere; very large files' }
  };
  var ICO_SIZES = [16, 32, 48, 64, 128, 256];

  function sniff(b) {
    if (!b || b.length < 12) return '';
    var s = function (i, t) { for (var k = 0; k < t.length; k++) if (b[i + k] !== t.charCodeAt(k)) return false; return true; };
    if (b[0] === 0xff && b[1] === 0xd8) return 'jpeg';
    if (b[0] === 0x89 && s(1, 'PNG')) return 'png';
    if (s(0, 'RIFF') && s(8, 'WEBP')) return 'webp';
    if (s(0, 'GIF8')) return 'gif';
    if (s(0, 'BM')) return 'bmp';
    if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return 'ico';
    if (s(0, 'II*\0') || s(0, 'MM\0*')) return 'tiff';
    if (s(4, 'ftyp')) { var brand = String.fromCharCode(b[8], b[9], b[10], b[11]); return /^avi[fs]$/.test(brand) ? 'avif' : /^(heic|heix|hevc|mif1|msf1)$/.test(brand) ? 'heic' : ''; }
    var head = new TextDecoder().decode(b.subarray(0, Math.min(b.length, 512)));
    if (/<svg[\s>]/i.test(head) || /^\s*<\?xml[\s\S]*<svg/i.test(head)) return 'svg';
    return '';
  }

  // opts: { mode: 'none'|'fit'|'percent'|'width', w, h, percent, enlarge }. Returns whole pixels, never 0.
  function fit(w, h, o) {
    o = o || {};
    var tw = w, th = h, r;
    if (o.mode === 'percent' && o.percent > 0) { tw = w * o.percent / 100; th = h * o.percent / 100; }
    else if (o.mode === 'width' && o.w > 0) { tw = o.w; th = h * o.w / w; }
    else if (o.mode === 'fit' && (o.w > 0 || o.h > 0)) {
      r = Math.min(o.w > 0 ? o.w / w : Infinity, o.h > 0 ? o.h / h : Infinity);
      tw = w * r; th = h * r;
    }
    if (!o.enlarge && tw > w) { tw = w; th = h; }
    return { w: Math.max(1, Math.round(tw)), h: Math.max(1, Math.round(th)) };
  }
  // Keeps the pixel count under the browser canvas limit while preserving the aspect ratio.
  function capPixels(s, max) {
    max = max || FACTS.maxPixels;
    if (s.w * s.h <= max) return s;
    var k = Math.sqrt(max / (s.w * s.h));
    return { w: Math.max(1, Math.floor(s.w * k)), h: Math.max(1, Math.floor(s.h * k)) };
  }

  // 24-bit BMP from RGBA pixels (alpha already composited by the caller). Rows are bottom-up, padded to 4 bytes.
  function encodeBmp(rgba, w, h) {
    var row = (w * 3 + 3) & ~3, size = 54 + row * h, out = new Uint8Array(size), dv = new DataView(out.buffer);
    out[0] = 0x42; out[1] = 0x4d;
    dv.setUint32(2, size, true); dv.setUint32(10, 54, true); dv.setUint32(14, 40, true);
    dv.setInt32(18, w, true); dv.setInt32(22, h, true); dv.setUint16(26, 1, true); dv.setUint16(28, 24, true);
    dv.setUint32(34, row * h, true); dv.setInt32(38, 2835, true); dv.setInt32(42, 2835, true);
    for (var y = 0; y < h; y++) {
      var o = 54 + (h - 1 - y) * row;
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        out[o++] = rgba[i + 2]; out[o++] = rgba[i + 1]; out[o++] = rgba[i];
      }
    }
    return out;
  }
  // ICO containing PNG images (supported since Windows Vista and by every browser). images: [{ size, bytes }].
  function encodeIco(images) {
    images = images.slice().sort(function (a, b) { return a.size - b.size; });
    var head = 6 + images.length * 16, total = head;
    images.forEach(function (im) { total += im.bytes.length; });
    var out = new Uint8Array(total), dv = new DataView(out.buffer), off = head;
    dv.setUint16(2, 1, true); dv.setUint16(4, images.length, true);
    images.forEach(function (im, i) {
      var e = 6 + i * 16;
      out[e] = im.size >= 256 ? 0 : im.size; out[e + 1] = im.size >= 256 ? 0 : im.size;
      dv.setUint16(e + 4, 1, true); dv.setUint16(e + 6, 32, true);
      dv.setUint32(e + 8, im.bytes.length, true); dv.setUint32(e + 12, off, true);
      out.set(im.bytes, off);
      off += im.bytes.length;
    });
    return out;
  }
  function readIco(b) {
    var dv = new DataView(b.buffer, b.byteOffset, b.byteLength), n = dv.getUint16(4, true), out = [];
    for (var i = 0; i < n; i++) {
      var e = 6 + i * 16;
      out.push({ size: b[e] || 256, bytes: dv.getUint32(e + 8, true), offset: dv.getUint32(e + 12, true) });
    }
    return out;
  }
  function icoSizes(w, h, chosen) {
    var max = Math.max(w, h);
    var list = (chosen && chosen.length ? chosen : ICO_SIZES).filter(function (s) { return s <= 256 && s <= Math.max(max, 16); });
    return list.length ? list : [16];
  }

  // Highest quality whose encoded size fits the target (bytes). encode(q) resolves to a size; q runs 0.05–1.
  // Returns { q, size, fits }. Seven halvings give 1% steps, the resolution browsers' encoders actually use.
  function searchQuality(encode, target, lo, hi) {
    lo = lo === undefined ? 0.05 : lo;
    hi = hi === undefined ? 1 : hi;
    var best = null, steps = 0;
    function attempt(q) { return Promise.resolve(encode(q)).then(function (size) { steps++; return { q: Math.round(q * 100) / 100, size: size }; }); }
    return attempt(hi).then(function (top) {
      if (top.size <= target) return { q: top.q, size: top.size, fits: true, steps: steps };
      return attempt(lo).then(function (bottom) {
        if (bottom.size > target) return { q: bottom.q, size: bottom.size, fits: false, steps: steps };
        best = bottom;
        var a = lo, z = hi;
        function loop() {
          if (z - a <= 0.011 || steps >= 9) return { q: best.q, size: best.size, fits: true, steps: steps };
          var mid = (a + z) / 2;
          return attempt(mid).then(function (r) { if (r.size <= target) { best = r; a = mid; } else z = mid; return loop(); });
        }
        return loop();
      });
    });
  }

  function outName(name, fmt, size, opts) {
    var base = String(name || 'image').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '-') || 'image';
    if (opts && opts.suffix && size) base += '-' + size.w + 'x' + size.h;
    return base + '.' + FORMATS[fmt].ext;
  }
  function size(n) { return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB'; }
  function change(before, after) {
    if (!before) return '';
    var p = Math.round((after / before - 1) * 1000) / 10;
    return p === 0 ? 'same size' : p < 0 ? Math.abs(p) + '% smaller' : p + '% larger';
  }

  var api = {
    FACTS: FACTS, FORMATS: FORMATS, ICO_SIZES: ICO_SIZES, sniff: sniff, fit: fit, capPixels: capPixels, encodeBmp: encodeBmp,
    encodeIco: encodeIco, readIco: readIco, icoSizes: icoSizes, searchQuality: searchQuality, outName: outName, size: size, change: change
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBImg = api;
})(typeof self !== 'undefined' ? self : this);
