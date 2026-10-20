/* Parse HTML / Encoder-Decoder core: HTML entities (to show code in Blogger posts or put snippets inside a Blogger XML
   template), URL encoding, Base64 (UTF-8 safe), JavaScript/JSON string escapes and \u Unicode escapes, each with its
   reverse. UMD: module.exports in Node, window.TBBEscape in the browser. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-19' };
  var NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', reg: '®', trade: '™', hellip: '…', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', middot: '·', bull: '•', deg: '°', times: '×', divide: '÷', euro: '€', pound: '£', yen: '¥', cent: '¢', sect: '§', para: '¶', plusmn: '±', frac12: '½', frac14: '¼', frac34: '¾', larr: '←', rarr: '→', uarr: '↑', darr: '↓', hearts: '♥', check: '✓' };

  function htmlEncode(s, o) {
    o = o || {};
    var t = String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (o.quotes !== false) t = t.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    if (o.nonAscii) t = t.replace(/[^\x00-\x7F]/gu, function (c) { return '&#' + c.codePointAt(0) + ';'; });
    return t;
  }
  function htmlDecode(s) {
    return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, function (m, e) {
      if (e[0] === '#') {
        var n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return n > 0 && n <= 0x10FFFF ? String.fromCodePoint(n) : m;
      }
      return Object.prototype.hasOwnProperty.call(NAMED, e) ? NAMED[e] : m;
    });
  }

  function urlEncode(s, o) { return o && o.whole ? encodeURI(String(s)) : encodeURIComponent(String(s)); }
  function urlDecode(s, o) {
    var t = String(s);
    if (o && o.plus) t = t.replace(/\+/g, ' ');
    try { return decodeURIComponent(t); } catch (e) { throw new Error('Not valid URL encoding: a % must be followed by two hex digits.'); }
  }

  var B64 = typeof Buffer !== 'undefined';
  function b64Encode(s, o) {
    var bytes = new TextEncoder().encode(String(s)), out;
    if (B64) out = Buffer.from(bytes).toString('base64');
    else { var bin = ''; for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); out = btoa(bin); }
    return o && o.urlSafe ? out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : out;
  }
  function b64Decode(s) {
    var t = String(s).replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(t)) throw new Error('Not valid Base64: only A-Z, a-z, 0-9, +, / (or - and _) and = padding are allowed.');
    while (t.length % 4) t += '=';
    var bytes;
    if (B64) bytes = new Uint8Array(Buffer.from(t, 'base64'));
    else { var bin = atob(t); bytes = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); }
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }

  // JavaScript / JSON string body (without the surrounding quotes); Unicode above ASCII optionally as \uXXXX.
  function jsEncode(s, o) {
    var t = JSON.stringify(String(s)).slice(1, -1);
    if (o && o.single) t = t.replace(/\\"/g, '"').replace(/'/g, "\\'");
    return t.replace(/<\/(script)/gi, '<\\/$1');
  }
  function jsDecode(s) {
    var t = String(s).trim(), q = t[0];
    if ((q === '"' || q === "'" || q === '`') && t[t.length - 1] === q && t.length > 1) t = t.slice(1, -1);
    var out = '', i = 0, map = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', 0: '\0', '\\': '\\', '"': '"', "'": "'", '`': '`', '/': '/' };
    while (i < t.length) {
      var c = t[i];
      if (c !== '\\') { out += c; i++; continue; }
      var e = t[i + 1];
      if (e === 'u' && t[i + 2] === '{') { var end = t.indexOf('}', i); out += String.fromCodePoint(parseInt(t.slice(i + 3, end), 16)); i = end + 1; continue; }
      if (e === 'u' && /^[0-9a-f]{4}$/i.test(t.substr(i + 2, 4))) { out += String.fromCharCode(parseInt(t.substr(i + 2, 4), 16)); i += 6; continue; }
      if (e === 'x' && /^[0-9a-f]{2}$/i.test(t.substr(i + 2, 2))) { out += String.fromCharCode(parseInt(t.substr(i + 2, 2), 16)); i += 4; continue; }
      if (e === '\n') { i += 2; continue; }
      if (e !== undefined && Object.prototype.hasOwnProperty.call(map, e)) { out += map[e]; i += 2; continue; }
      throw new Error('Unknown escape \\' + (e || '') + ' at position ' + (i + 1) + '.');
    }
    return out;
  }
  function uniEncode(s) {
    return Array.from(String(s)).map(function (c) {
      var n = c.codePointAt(0);
      if (n < 128) return c;
      return n > 0xFFFF ? c.split('').map(function (u) { return '\\u' + ('000' + u.charCodeAt(0).toString(16)).slice(-4); }).join('') : '\\u' + ('000' + n.toString(16)).slice(-4);
    }).join('');
  }
  function uniDecode(s) {
    return String(s).replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})|&#x([0-9a-f]+);|U\+([0-9a-f]{4,6})/gi, function (m, a, b, c, d) { return String.fromCodePoint(parseInt(a || b || c || d, 16)); });
  }

  // A code block for a Blogger or WordPress post: escaped code inside <pre><code>.
  function codeBlock(s, lang) { return '<pre><code' + (lang ? ' class="language-' + lang.replace(/[^\w-]/g, '') + '"' : '') + '>' + htmlEncode(String(s).replace(/\r\n?/g, '\n'), { quotes: false }) + '</code></pre>'; }

  var MODES = {
    html: { label: 'HTML entities', enc: htmlEncode, dec: htmlDecode },
    url: { label: 'URL', enc: urlEncode, dec: urlDecode },
    base64: { label: 'Base64', enc: b64Encode, dec: b64Decode },
    js: { label: 'JavaScript / JSON string', enc: jsEncode, dec: jsDecode },
    unicode: { label: 'Unicode \\u escapes', enc: uniEncode, dec: uniDecode }
  };
  // Returns { ok, text } or { ok: false, error }.
  function run(mode, dir, text, opts) {
    var M = MODES[mode];
    if (!M) return { ok: false, error: 'Unknown mode.' };
    try { return { ok: true, text: dir === 'decode' ? M.dec(text, opts || {}) : M.enc(text, opts || {}) }; }
    catch (e) { return { ok: false, error: e.message }; }
  }

  var api = { FACTS: FACTS, MODES: MODES, run: run, htmlEncode: htmlEncode, htmlDecode: htmlDecode, urlEncode: urlEncode, urlDecode: urlDecode, b64Encode: b64Encode, b64Decode: b64Decode, jsEncode: jsEncode, jsDecode: jsDecode, uniEncode: uniEncode, uniDecode: uniDecode, codeBlock: codeBlock };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBEscape = api;
})(typeof self !== 'undefined' ? self : this);
