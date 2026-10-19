/* WhatsApp Link Generator core: turns a phone number in any common local or international form into a wa.me
   click-to-chat link (WhatsApp Help Center rules: full international number, digits only, message URL-encoded after
   ?text=), previews WhatsApp message formatting, builds website button code and draws the link as a QR code (SVG)
   from qrcode-generator. UMD: module.exports in Node, window.TBBWa in the browser. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-19', maxDigits: 15 };
  var VENDOR = '/assets/vendor/qrcode-generator-1.4.4.js';
  // ITU country calling codes for the countries Malaysian users message most; anything else can be typed with +.
  var COUNTRIES = [
    ['MY', 'Malaysia', '60'], ['SG', 'Singapore', '65'], ['ID', 'Indonesia', '62'], ['BN', 'Brunei', '673'], ['TH', 'Thailand', '66'],
    ['PH', 'Philippines', '63'], ['VN', 'Vietnam', '84'], ['IN', 'India', '91'], ['PK', 'Pakistan', '92'], ['BD', 'Bangladesh', '880'],
    ['CN', 'China', '86'], ['HK', 'Hong Kong', '852'], ['TW', 'Taiwan', '886'], ['JP', 'Japan', '81'], ['KR', 'South Korea', '82'],
    ['AU', 'Australia', '61'], ['NZ', 'New Zealand', '64'], ['US', 'United States and Canada', '1'], ['GB', 'United Kingdom', '44'],
    ['IE', 'Ireland', '353'], ['DE', 'Germany', '49'], ['FR', 'France', '33'], ['NL', 'Netherlands', '31'], ['SA', 'Saudi Arabia', '966'],
    ['AE', 'United Arab Emirates', '971'], ['QA', 'Qatar', '974'], ['KW', 'Kuwait', '965'], ['OM', 'Oman', '968'], ['EG', 'Egypt', '20'],
    ['TR', 'Turkey', '90'], ['NG', 'Nigeria', '234'], ['ZA', 'South Africa', '27']
  ];
  var TEMPLATES = [
    ['Enquiry', "Hi, I'm interested in your product. Is it still available?"],
    ['Order', 'Hi, I would like to order:\n- Item:\n- Quantity:\n- Delivery address:'],
    ['Booking', 'Hi, I would like to book an appointment on (date) at (time). My name is (name).'],
    ['Pertanyaan', 'Hai, saya berminat dengan produk anda. Masih ada stok?'],
    ['Tempahan', 'Hai, saya nak buat tempahan:\n- Barang:\n- Kuantiti:\n- Alamat penghantaran:']
  ];

  // Accepts "+60 12-345 6789", "012-345 6789", "0060123456789" or "60123456789"; returns digits only, international.
  function normalize(raw, cc) {
    var s = String(raw == null ? '' : raw).trim(), warn = [];
    cc = String(cc || '60');
    if (!s) return { ok: false, error: 'empty' };
    if (/[a-z]/i.test(s.replace(/^tel:/i, ''))) return { ok: false, error: 'letters' };
    var plus = /^\s*(tel:)?\+/.test(s), d = s.replace(/\D/g, ''), intl;
    if (plus) intl = d;
    else if (/^00/.test(d)) intl = d.slice(2);
    else if (d.indexOf(cc) === 0 && d.length - cc.length >= 7) intl = d;
    else intl = cc + d.replace(/^0+/, '');
    // "+60 012…" keeps the local trunk 0 after the country code; WhatsApp needs it dropped.
    var code = countryOf(intl);
    if (code && intl.charAt(code.length) === '0') { intl = code + intl.slice(code.length).replace(/^0+/, ''); warn.push('trunk'); }
    if (intl.length > FACTS.maxDigits) return { ok: false, error: 'long', digits: intl };
    if (intl.length < 8) return { ok: false, error: 'short', digits: intl };
    if (/^60/.test(intl) && !/^601/.test(intl)) warn.push('myLandline');
    else if (/^601/.test(intl) && (intl.length < 11 || intl.length > 12)) warn.push('myLength');
    return { ok: true, digits: intl, e164: '+' + intl, warn: warn };
  }

  function countryOf(digits) {
    var best = '';
    COUNTRIES.forEach(function (c) { if (digits.indexOf(c[2]) === 0 && c[2].length > best.length) best = c[2]; });
    return best;
  }

  // WhatsApp's URL-encoding: encodeURIComponent, plus apostrophes and brackets that some apps break links on.
  function encode(text) {
    return encodeURIComponent(String(text)).replace(/[!'()*]/g, function (c) { return '%' + c.charCodeAt(0).toString(16).toUpperCase(); });
  }
  function link(digits, text) {
    var t = String(text || '');
    return 'https://wa.me/' + (digits || '') + (t ? '?text=' + encode(t) : '');
  }
  function parseLink(url) {
    var m = /^(?:https?:\/\/)?(?:wa\.me\/|(?:api|web)\.whatsapp\.com\/send\/?\?phone=)(\d*)(?:[?&]text=([^&#]*))?/i.exec(String(url).trim());
    if (!m) return null;
    var text = '';
    try { text = m[2] ? decodeURIComponent(m[2].replace(/\+/g, ' ')) : ''; } catch (e) { text = m[2]; }
    return { digits: m[1], text: text };
  }

  // ---------------------------------------------------------------- preview and code
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  // WhatsApp formatting (Help Center): *bold*, _italic_, ~strike~, ```monospace```, `code`, "> " quotes and lists.
  function formatHtml(text) {
    var code = [];
    var s = esc(text).replace(/```([\s\S]+?)```/g, function (m, c) { code.push('<code class="wa-mono">' + c + '</code>'); return '\u0000' + (code.length - 1) + '\u0000'; })
      .replace(/`([^`\n]+)`/g, function (m, c) { code.push('<code>' + c + '</code>'); return '\u0000' + (code.length - 1) + '\u0000'; });
    var inline = function (x) {
      return x.replace(/(^|[\s(])\*(\S(?:[^*\n]*\S)?)\*(?=$|[\s.,!?:;)])/g, '$1<strong>$2</strong>')
        .replace(/(^|[\s(])_(\S(?:[^_\n]*\S)?)_(?=$|[\s.,!?:;)])/g, '$1<em>$2</em>')
        .replace(/(^|[\s(])~(\S(?:[^~\n]*\S)?)~(?=$|[\s.,!?:;)])/g, '$1<s>$2</s>');
    };
    s = s.split('\n').map(function (l) {
      if (/^&gt; /.test(l)) return '<span class="wa-quote">' + inline(l.slice(5)) + '</span>';
      if (/^[*-] /.test(l)) return '<span class="wa-li">• ' + inline(l.slice(2)) + '</span>';
      return inline(l);
    }).join('<br>');
    return s.replace(/\u0000(\d+)\u0000/g, function (m, i) { return code[+i]; });
  }

  function snippet(url, label, kind) {
    var l = esc(label || 'Chat on WhatsApp'), u = esc(url);
    if (kind === 'floating') {
      return '<a href="' + u + '" class="wa-float" rel="noopener" aria-label="' + l + '">' + l + '</a>\n<style>\n' +
        '.wa-float{position:fixed;right:16px;bottom:16px;z-index:999;padding:12px 18px;border-radius:999px;background:#25d366;color:#05301b;font:700 15px/1 system-ui,sans-serif;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.25)}\n' +
        '.wa-float:hover{background:#1ebe5b}\n</style>';
    }
    return '<a href="' + u + '" rel="noopener" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#25d366;color:#05301b;font:700 15px/1 system-ui,sans-serif;text-decoration:none">' + l + '</a>';
  }

  // QR code as a compact SVG path; `qrcode` is the qrcode-generator function (window.qrcode in the browser).
  function qrMatrix(qrcode, text) {
    var q = qrcode(0, 'M');
    q.addData(text, 'Byte');
    q.make();
    var n = q.getModuleCount(), rows = [];
    for (var r = 0; r < n; r++) { var row = []; for (var c = 0; c < n; c++) row.push(q.isDark(r, c)); rows.push(row); }
    return rows;
  }
  function qrSvg(m, title) {
    var n = m.length, q = 4, d = '';
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (!m[r][c]) continue;
        var run = 1;
        while (c + run < n && m[r][c + run]) run++;
        d += 'M' + (c + q) + ' ' + (r + q) + 'h' + run + 'v1h-' + run + 'z';
        c += run - 1;
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (n + 2 * q) + ' ' + (n + 2 * q) + '" shape-rendering="crispEdges" role="img" aria-label="' + esc(title || 'QR code') + '"><rect width="100%" height="100%" fill="#fff"/><path fill="#000" d="' + d + '"/></svg>';
  }

  var api = {
    FACTS: FACTS, VENDOR: VENDOR, COUNTRIES: COUNTRIES, countryOf: countryOf, TEMPLATES: TEMPLATES, normalize: normalize, encode: encode, link: link, parseLink: parseLink,
    formatHtml: formatHtml, snippet: snippet, qrMatrix: qrMatrix, qrSvg: qrSvg, esc: esc
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBWa = api;
})(typeof self !== 'undefined' ? self : this);
