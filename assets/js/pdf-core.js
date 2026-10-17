/* PDF Converter core shared by the page, the build and the tests: a small PDF writer for image pages (JPEG
   embedded as-is, so photos keep their exact quality), page sizes and image placement, page-range parsing for
   split and extract, the reading-order logic that turns PDF text runs into Word paragraphs and headings, and the
   vendor paths the page loads on demand. PDF parsing and merging use PDF.js and pdf-lib in the page. */
(function (root) {
  'use strict';

  var FACTS = { verified: '2026-10-17', maxBytes: 200 * 1024 * 1024 };
  var VENDOR = {
    pdfjs: '/assets/vendor/pdfjs-dist-6.4.299/pdf.min.mjs', worker: '/assets/vendor/pdfjs-dist-6.4.299/pdf.worker.min.mjs',
    wasm: '/assets/vendor/pdfjs-dist-6.4.299/wasm/', fonts: '/assets/vendor/pdfjs-dist-6.4.299/standard_fonts/',
    pdflib: '/assets/vendor/pdf-lib-1.17.1.js', mammoth: '/assets/vendor/mammoth-1.13.0.js'
  };
  // Page sizes in PDF points (1/72 inch). A4 is 210 x 297 mm.
  var PAGES = { a4: { label: 'A4', w: 595.28, h: 841.89 }, letter: { label: 'US Letter', w: 612, h: 792 }, legal: { label: 'US Legal', w: 612, h: 1008 }, a5: { label: 'A5', w: 419.53, h: 595.28 }, fit: { label: 'Same as image' } };
  var MM = 72 / 25.4;
  var MODES = [
    { key: 'img2pdf', label: 'JPG to PDF', result: 'One PDF, one image per page', text: 'No text (images)', note: 'JPEG photos are embedded unchanged; choose A4, Letter or image-sized pages' },
    { key: 'pdf2img', label: 'PDF to JPG', result: 'A JPG or PNG per page, or a ZIP', text: 'No (images)', note: '150 dpi suits screens, 300 dpi suits printing' },
    { key: 'merge', label: 'Merge PDF', result: 'One PDF from several', text: 'Yes', note: 'Pages, fonts and links are copied as they are' },
    { key: 'organize', label: 'Split and organise', result: 'One PDF or a ZIP of PDFs', text: 'Yes', note: 'Reorder, rotate, delete, extract or split pages' },
    { key: 'pdf2word', label: 'PDF to Word', result: '.docx or .txt', text: 'Yes, editable', note: 'Rebuilds paragraphs, headings and lists; scans need OCR' },
    { key: 'word2pdf', label: 'Word to PDF', result: 'PDF via the print dialog, or HTML', text: 'Yes', note: 'Keeps headings, lists, tables and images; layout simplified' },
    { key: 'compress', label: 'Compress PDF', result: 'A smaller PDF', text: 'No (pages become images)', note: 'Best for scans and photo-heavy PDFs' }
  ];

  // Where an image of w x h pixels goes on a page. opts: { size, orient: 'auto'|'portrait'|'landscape', margin (mm), mode: 'contain'|'cover' }.
  function layout(w, h, o) {
    o = o || {};
    var size = PAGES[o.size] || PAGES.a4, m = (o.margin || 0) * MM, pw, ph;
    if (o.size === 'fit') { pw = w * 0.75 + 2 * m; ph = h * 0.75 + 2 * m; }
    else {
      var land = o.orient === 'landscape' || (o.orient !== 'portrait' && w > h);
      pw = land ? size.h : size.w; ph = land ? size.w : size.h;
    }
    var bw = pw - 2 * m, bh = ph - 2 * m, k = o.mode === 'cover' ? Math.max(bw / w, bh / h) : Math.min(bw / w, bh / h);
    var dw = w * k, dh = h * k;
    var r = function (x) { return Math.round(x * 100) / 100 + 0; };
    return { pw: r(pw), ph: r(ph), x: r((pw - dw) / 2), y: r((ph - dh) / 2), w: r(dw), h: r(dh) };
  }

  // ---------------------------------------------------------------- JPEG facts needed to embed a file directly
  function jpegInfo(b) {
    if (b[0] !== 0xff || b[1] !== 0xd8) return null;
    var i = 2, orient = 1;
    while (i + 4 < b.length) {
      if (b[i] !== 0xff) return null;
      var m = b[i + 1], len = (b[i + 2] << 8) | b[i + 3];
      if (m === 0xe1 && b[i + 4] === 0x45 && b[i + 5] === 0x78) orient = exifOrientation(b, i + 10, len - 8) || 1;
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8], comps: b[i + 9], progressive: m === 0xc2, orient: orient };
      }
      i += 2 + len;
    }
    return null;
  }
  function exifOrientation(b, t, n) {
    var le = b[t] === 0x49, u16 = function (p) { return le ? b[p] | (b[p + 1] << 8) : (b[p] << 8) | b[p + 1]; };
    var u32 = function (p) { return le ? (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16)) + b[p + 3] * 16777216 : b[p] * 16777216 + ((b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]); };
    var ifd = t + u32(t + 4);
    if (ifd + 2 > t + n) return 0;
    for (var k = 0, c = u16(ifd); k < c; k++) { var e = ifd + 2 + k * 12; if (u16(e) === 0x0112) return u16(e + 8); }
    return 0;
  }
  // A JPEG can go into the PDF unchanged when it is RGB or grey and already upright.
  function embeddable(info) { return !!info && (info.comps === 3 || info.comps === 1) && info.orient === 1; }

  // ---------------------------------------------------------------- PDF writer for image pages
  var enc = function (s) { return new TextEncoder().encode(s); };
  function concat(parts) { var n = 0; parts.forEach(function (p) { n += p.length; }); var o = new Uint8Array(n), at = 0; parts.forEach(function (p) { o.set(p, at); at += p.length; }); return o; }
  var num = function (x) { return String(Math.round(x * 100) / 100); };
  // pages: [{ jpeg: Uint8Array, w, h (pixels), comps (1 or 3), place: layout() result }]. meta: { title, date }.
  function imagesToPdf(pages, meta) {
    meta = meta || {};
    var objs = [], add = function (body) { objs.push(body); return objs.length; };
    var catalog = add(null), tree = add(null), kids = [];
    pages.forEach(function (p) {
      var img = add([enc('<< /Type /XObject /Subtype /Image /Width ' + p.w + ' /Height ' + p.h + ' /ColorSpace /' + (p.comps === 1 ? 'DeviceGray' : 'DeviceRGB') +
        ' /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.jpeg.length + ' >>\nstream\n'), p.jpeg, enc('\nendstream')]);
      var L = p.place, draw = 'q ' + num(L.w) + ' 0 0 ' + num(L.h) + ' ' + num(L.x) + ' ' + num(L.y) + ' cm /Im0 Do Q';
      var content = add([enc('<< /Length ' + draw.length + ' >>\nstream\n' + draw + '\nendstream')]);
      kids.push(add([enc('<< /Type /Page /Parent ' + tree + ' 0 R /MediaBox [0 0 ' + num(L.pw) + ' ' + num(L.ph) + '] /Resources << /XObject << /Im0 ' + img + ' 0 R >> >> /Contents ' + content + ' 0 R >>')]));
    });
    objs[catalog - 1] = [enc('<< /Type /Catalog /Pages ' + tree + ' 0 R >>')];
    objs[tree - 1] = [enc('<< /Type /Pages /Kids [' + kids.map(function (k) { return k + ' 0 R'; }).join(' ') + '] /Count ' + kids.length + ' >>')];
    var d = meta.date || new Date(), pad = function (n) { return ('0' + n).slice(-2); };
    var stamp = 'D:' + d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
    var info = add([enc('<< /Producer (The Bukit Besi PDF Converter) /CreationDate (' + stamp + ')' + (meta.title ? ' /Title ' + pdfString(meta.title) : '') + ' >>')]);
    var parts = [enc('%PDF-1.4\n%âãÏÓ\n')], offs = [], at = parts[0].length;
    objs.forEach(function (o, i) {
      offs.push(at);
      var head = enc((i + 1) + ' 0 obj\n'), tail = enc('\nendobj\n');
      parts.push(head); at += head.length;
      o.forEach(function (x) { parts.push(x); at += x.length; });
      parts.push(tail); at += tail.length;
    });
    var xref = 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map(function (o) { return ('000000000' + o).slice(-10) + ' 00000 n \n'; }).join('');
    parts.push(enc(xref + 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + catalog + ' 0 R /Info ' + info + ' 0 R >>\nstartxref\n' + at + '\n%%EOF\n'));
    return concat(parts);
  }
  // Text strings in PDF metadata: plain ASCII in (), anything else as UTF-16BE hex with a byte order mark.
  function pdfString(s) {
    s = String(s);
    if (/^[\x20-\x7e]*$/.test(s)) return '(' + s.replace(/[\\()]/g, '\\$&') + ')';
    var h = 'FEFF';
    for (var i = 0; i < s.length; i++) h += ('000' + s.charCodeAt(i).toString(16).toUpperCase()).slice(-4);
    return '<' + h + '>';
  }

  // ---------------------------------------------------------------- page ranges
  // "1-3, 5, 8-" with total 10 -> [0, 1, 2, 4, 7, 8, 9]. Keeps the order written; drops pages that do not exist.
  function parseRanges(spec, total) {
    var out = [];
    String(spec || '').split(/[,;\s]+/).filter(Boolean).forEach(function (part) {
      var m = /^(\d*)\s*-\s*(\d*)$/.exec(part), a, b;
      if (m) { a = m[1] ? +m[1] : 1; b = m[2] ? +m[2] : Math.max(a, total); }
      else if (/^\d+$/.test(part)) a = b = +part;
      else throw new Error('range:' + part);
      var step = a <= b ? 1 : -1;
      for (var p = a; step > 0 ? p <= b : p >= b; p += step) if (p >= 1 && p <= total) out.push(p - 1);
    });
    return out;
  }
  // Split into groups: every page, every n pages, or by the written ranges ("1-3, 4-6").
  function splitGroups(mode, total, arg) {
    var g = [], i;
    if (mode === 'every') for (i = 0; i < total; i++) g.push([i]);
    else if (mode === 'chunks') { var n = Math.max(1, +arg || 1); for (i = 0; i < total; i += n) g.push(range(i, Math.min(total, i + n))); }
    else String(arg || '').split(/[;,]+/).filter(function (s) { return s.trim(); }).forEach(function (s) { var r = parseRanges(s, total); if (r.length) g.push(r); });
    return g;
  }
  function range(a, b) { var r = []; for (var i = a; i < b; i++) r.push(i); return r; }

  // ---------------------------------------------------------------- PDF text to paragraphs
  // items: PDF.js text items for one page ({ str, transform: [a, b, c, d, x, y], height }). Returns blocks for
  // docx-core.js: lines are rebuilt top to bottom, joined into paragraphs, and lines clearly larger than the
  // document's body text become headings (bodySize is the most common text height across the document).
  function lines(items) {
    var rows = [];
    items.forEach(function (it) {
      if (!it.str || !it.transform) return;
      var size = Math.abs(it.height || it.transform[3]) || 10, y = it.transform[5], x = it.transform[4];
      var row = null;
      for (var i = 0; i < rows.length; i++) if (Math.abs(rows[i].y - y) <= size * 0.4) { row = rows[i]; break; }
      if (!row) { row = { y: y, size: size, parts: [] }; rows.push(row); }
      row.size = Math.max(row.size, size);
      row.parts.push({ x: x, str: it.str, w: it.width || 0, size: size });
    });
    rows.sort(function (a, b) { return b.y - a.y; });
    return rows.map(function (r) {
      r.parts.sort(function (a, b) { return a.x - b.x; });
      var text = '', end = null;
      r.parts.forEach(function (p) {
        if (end !== null && p.x - end > p.size * 0.2 && !/\s$/.test(text) && !/^\s/.test(p.str)) text += ' ';
        text += p.str;
        end = p.x + (p.w || p.str.length * p.size * 0.5);
      });
      return { y: r.y, size: r.size, text: text.replace(/\s+/g, ' ').trim() };
    }).filter(function (l) { return l.text; });
  }
  function bodySize(pagesOfLines) {
    var count = {};
    pagesOfLines.forEach(function (ls) { ls.forEach(function (l) { var k = Math.round(l.size); count[k] = (count[k] || 0) + l.text.length; }); });
    var best = 10, n = -1;
    Object.keys(count).forEach(function (k) { if (count[k] > n) { n = count[k]; best = +k; } });
    return best;
  }
  function toBlocks(pagesOfLines, opts) {
    opts = opts || {};
    var body = bodySize(pagesOfLines), blocks = [];
    pagesOfLines.forEach(function (ls, pi) {
      if (pi && opts.pageBreaks) blocks.push({ t: 'pagebreak' });
      var para = null, prev = null;
      ls.forEach(function (l) {
        var heading = l.size >= body * 1.25 && l.text.length < 120;
        var bullet = /^([•▪●◦‣\-–*]|\d+[.)])\s+/.exec(l.text);
        var gap = prev ? prev.y - l.y : 0, newPara = !prev || gap > Math.max(prev.size, l.size) * 1.6 || heading || bullet || prev.heading;
        if (heading) { blocks.push({ t: 'h', level: l.size >= body * 1.8 ? 1 : l.size >= body * 1.45 ? 2 : 3, inl: [{ text: l.text }] }); para = null; }
        else if (bullet) { blocks.push({ t: 'ul', items: [{ inl: [{ text: l.text.slice(bullet[0].length) }] }] }); para = null; }
        else if (newPara || !para) { para = { t: 'p', inl: [{ text: l.text }] }; blocks.push(para); }
        else {
          var t = para.inl[0].text;
          para.inl[0].text = /-$/.test(t) && /^[a-z]/.test(l.text) ? t.slice(0, -1) + l.text : t + ' ' + l.text;
        }
        prev = { y: l.y, size: l.size, heading: heading };
      });
    });
    // Consecutive one-item lists become one list.
    var out = [];
    blocks.forEach(function (b) { var last = out[out.length - 1]; if (b.t === 'ul' && last && last.t === 'ul') last.items = last.items.concat(b.items); else out.push(b); });
    return out;
  }
  function blocksToText(blocks) {
    return blocks.map(function (b) {
      if (b.t === 'pagebreak') return '\f';
      if (b.items) return b.items.map(function (it) { return '• ' + it.inl.map(function (r) { return r.text; }).join(''); }).join('\n');
      return b.inl.map(function (r) { return r.text; }).join('');
    }).join('\n\n').replace(/\n\n\f\n\n/g, '\n\n');
  }

  function size(n) { return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB'; }
  function baseName(n) { return String(n || 'document').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '-') || 'document'; }

  var api = {
    FACTS: FACTS, VENDOR: VENDOR, PAGES: PAGES, MODES: MODES, layout: layout, jpegInfo: jpegInfo, embeddable: embeddable, imagesToPdf: imagesToPdf, pdfString: pdfString,
    parseRanges: parseRanges, splitGroups: splitGroups, lines: lines, bodySize: bodySize, toBlocks: toBlocks, blocksToText: blocksToText, size: size, baseName: baseName
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBPdf = api;
})(typeof self !== 'undefined' ? self : this);
