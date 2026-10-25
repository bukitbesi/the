/* QR code generator core: builds the text a QR code carries (link, Wi-Fi, WhatsApp, vCard, email, SMS, phone,
   location, plain text) in the formats phone cameras understand, and draws the module matrix as SVG with colours,
   dot or rounded styles and an optional centre logo. The matrix itself comes from qrcode-generator (MIT, vendored).
   Payment QR codes (DuitNow) are deliberately not offered: they must be issued through a bank or PayNet. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-25', quiet: 4, ec: { L: 7, M: 15, Q: 25, H: 30 }, vendor: '/assets/vendor/qrcode-generator-1.4.4.js' };
  var TYPES = ['url', 'text', 'wifi', 'whatsapp', 'vcard', 'email', 'sms', 'phone', 'geo'];

  // Wi-Fi and MECARD-style fields escape \ ; , : and " with a backslash.
  function escField(s) { return String(s == null ? '' : s).replace(/([\\;,:"])/g, '\\$1'); }
  // vCard 3.0 text values escape \ ; , and newlines.
  function escV(s) { return String(s == null ? '' : s).replace(/([\\;,])/g, '\\$1').replace(/\r?\n/g, '\\n'); }
  // Phone numbers to international digits; Malaysian numbers (012-345 6789, 03-1234 5678) get 60 in front.
  function phone(raw, cc) {
    var s = String(raw || '').trim(), d = s.replace(/\D/g, '');
    cc = cc || '60';
    if (!d) return '';
    if (/^\+/.test(s)) return d;
    if (/^00/.test(d)) return d.slice(2);
    if (d.indexOf(cc) === 0 && d.length >= 10) return d;
    return cc + d.replace(/^0+/, '');
  }
  function url(u) { u = String(u || '').trim(); if (!u) return ''; return /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : 'https://' + u; }

  // The text inside the QR code for each type. Returns '' when the required field is empty.
  function payload(type, v) {
    v = v || {};
    switch (type) {
      case 'url': return url(v.url);
      case 'text': return String(v.text || '');
      case 'wifi': {
        if (!v.ssid) return '';
        var t = v.security === 'nopass' ? 'nopass' : v.security === 'WEP' ? 'WEP' : 'WPA';
        return 'WIFI:T:' + t + ';S:' + escField(v.ssid) + ';' + (t !== 'nopass' ? 'P:' + escField(v.password) + ';' : '') + (v.hidden ? 'H:true;' : '') + ';';
      }
      case 'whatsapp': { var n = phone(v.phone); if (!n) return ''; return 'https://wa.me/' + n + (v.message ? '?text=' + encodeURIComponent(v.message) : ''); }
      case 'phone': { var p = phone(v.phone); return p ? 'tel:+' + p : ''; }
      case 'sms': { var s = phone(v.phone); return s ? 'SMSTO:+' + s + ':' + String(v.message || '') : ''; }
      case 'email': {
        if (!v.email) return '';
        var q = [];
        if (v.subject) q.push('subject=' + encodeURIComponent(v.subject));
        if (v.body) q.push('body=' + encodeURIComponent(v.body));
        return 'mailto:' + String(v.email).trim() + (q.length ? '?' + q.join('&') : '');
      }
      case 'geo': {
        var lat = Number(v.lat), lng = Number(v.lng);
        if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || v.lat === '' || v.lng === '') return '';
        return 'geo:' + lat + ',' + lng;
      }
      case 'vcard': {
        if (!v.first && !v.last && !v.org) return '';
        var lines = ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + escV(v.last) + ';' + escV(v.first) + ';;;', 'FN:' + escV([v.first, v.last].filter(Boolean).join(' ') || v.org)];
        if (v.org) lines.push('ORG:' + escV(v.org));
        if (v.title) lines.push('TITLE:' + escV(v.title));
        if (v.phone) lines.push('TEL;TYPE=CELL:+' + phone(v.phone));
        if (v.email) lines.push('EMAIL:' + escV(v.email));
        if (v.web) lines.push('URL:' + escV(url(v.web)));
        if (v.address) lines.push('ADR:;;' + escV(v.address) + ';;;;');
        lines.push('END:VCARD');
        return lines.join('\r\n');
      }
    }
    return '';
  }

  // Module matrix (true = dark) from qrcode-generator; version chosen automatically. Throws 'overflow' when too long.
  function matrix(qrcode, text, ec) {
    var q;
    try { q = qrcode(0, ec || 'M'); q.addData(unescape(encodeURIComponent(text)), 'Byte'); q.make(); }
    catch (e) { throw new Error('overflow'); }
    var n = q.getModuleCount(), rows = [];
    for (var r = 0; r < n; r++) { var row = []; for (var c = 0; c < n; c++) row.push(q.isDark(r, c)); rows.push(row); }
    return rows;
  }
  function version(m) { return (m.length - 17) / 4; }
  // Alignment pattern centres per version (ISO/IEC 18004 Annex E), versions 1 to 40.
  var ALIGN = [[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62],
    [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98],
    [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126],
    [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150],
    [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]];
  // The three 7×7 finder squares (top-left, top-right, bottom-left).
  function inFinder(r, c, n) { return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7); }
  // Function patterns (finders, timing lines, alignment squares) stay square in every style so scanners lock on.
  function structural(r, c, n) {
    if (inFinder(r, c, n) || r === 6 || c === 6) return true;
    var pos = ALIGN[(n - 17) / 4] || [];
    for (var i = 0; i < pos.length; i++) for (var j = 0; j < pos.length; j++) {
      var a = pos[i], b = pos[j];
      if ((a === 6 && b === 6) || (a === 6 && b === pos[pos.length - 1]) || (a === pos[pos.length - 1] && b === 6)) continue;
      if (Math.abs(r - a) <= 2 && Math.abs(c - b) <= 2) return true;
    }
    return false;
  }

  // SVG drawing. o: { fg, bg ('' = transparent), style: 'square'|'dots'|'rounded', margin (modules), logo: { href, size } }.
  // Function patterns are always drawn solid so phones lock on quickly whatever the style.
  function svg(m, o) {
    o = o || {};
    var n = m.length, q = o.margin === undefined ? FACTS.quiet : o.margin, size = n + 2 * q, fg = o.fg || '#000000', d = '', dots = '', st = o.style || 'square';
    var hole = null;
    if (o.logo && o.logo.href) { var ls = Math.round(n * (o.logo.size || 0.22)); ls += (n - ls) % 2; hole = { a: (n - ls) / 2 - 1, b: (n + ls) / 2 }; }
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if (!m[r][c] || (hole && r > hole.a && r < hole.b && c > hole.a && c < hole.b && !inFinder(r, c, n))) continue;
      if (st === 'square' || structural(r, c, n)) {
        var run = 1;
        while (c + run < n && m[r][c + run] && (st === 'square' || structural(r, c + run, n)) && !(hole && r > hole.a && r < hole.b && c + run > hole.a && c + run < hole.b)) run++;
        d += 'M' + (c + q) + ' ' + (r + q) + 'h' + run + 'v1h-' + run + 'z'; c += run - 1;
      } else if (st === 'dots') dots += '<circle cx="' + (c + q + 0.5) + '" cy="' + (r + q + 0.5) + '" r="0.48"/>';
      else dots += '<rect x="' + (c + q + 0.06) + '" y="' + (r + q + 0.06) + '" width="0.88" height="0.88" rx="0.3"/>';
    }
    var logo = '';
    if (hole) {
      var x = hole.a + 1 + q, w = hole.b - hole.a - 1;
      logo = '<rect x="' + x + '" y="' + x + '" width="' + w + '" height="' + w + '" rx="' + (w / 6).toFixed(2) + '" fill="' + (o.bg || '#ffffff') + '"/>' +
        '<image href="' + o.logo.href + '" x="' + (x + 0.5) + '" y="' + (x + 0.5) + '" width="' + (w - 1) + '" height="' + (w - 1) + '" preserveAspectRatio="xMidYMid meet"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" shape-rendering="' + (st === 'square' ? 'crispEdges' : 'geometricPrecision') + '" role="img" aria-label="' + (o.label || 'QR code').replace(/[<>&"]/g, '') + '">' +
      (o.bg ? '<rect width="100%" height="100%" fill="' + o.bg + '"/>' : '') + '<g fill="' + fg + '"><path d="' + d + '"/>' + dots + '</g>' + logo + '</svg>';
  }

  // WCAG relative luminance contrast between two #rrggbb colours (1 to 21).
  function lum(hex) { var n = parseInt(String(hex).replace('#', ''), 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  // Problems a scanner may have with the chosen colours.
  function colourIssues(fg, bg) {
    var out = [];
    if (!bg) return out;
    if (lum(fg) > lum(bg)) out.push('inverted');
    if (contrast(fg, bg) < 4) out.push('contrast');
    return out;
  }
  // Print size from scanning distance: the common rule of thumb is size ≈ distance ÷ 10, and at least 2 cm.
  function printCm(distanceCm) { return Math.max(2, Math.round(Number(distanceCm) / 10 * 10) / 10); }

  var api = { FACTS: FACTS, TYPES: TYPES, structural: structural, escField: escField, phone: phone, url: url, payload: payload, matrix: matrix, version: version, svg: svg, contrast: contrast, colourIssues: colourIssues, printCm: printCm };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBQr = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
