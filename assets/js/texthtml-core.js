/* Text to HTML Converter core. Plain text becomes paragraphs, line breaks, lists and links with every special
   character escaped; Markdown goes through the Online Notepad's renderer (notepad-core.js); HTML can be turned back into
   plain text. UMD: module.exports in Node, window.TBBTextHtml in the browser. */
(function (root) {
  'use strict';
  var N = typeof module !== 'undefined' && module.exports ? require('./notepad-core.js') : root.TBBNotes;
  var FACTS = { verified: '2026-10-19' };
  var DEFAULTS = { breaks: true, links: true, lists: true, newTab: false, nofollow: false, indent: true };

  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var URL_RE = /\b((?:https?:\/\/|www\.)[^\s<>"']*[^\s<>"'.,;:!?)\]}])|([\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,})/gi;

  // Escapes a line and, when asked, turns URLs and email addresses into links.
  function inline(s, o) {
    if (!o.links) return esc(s);
    var out = '', last = 0, m;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(s))) {
      out += esc(s.slice(last, m.index));
      if (m[1]) {
        var href = /^www\./i.test(m[1]) ? 'https://' + m[1] : m[1], rel = [o.nofollow ? 'nofollow' : '', o.newTab ? 'noopener' : ''].filter(Boolean).join(' ');
        out += '<a href="' + esc(href) + '"' + (rel ? ' rel="' + rel + '"' : '') + (o.newTab ? ' target="_blank"' : '') + '>' + esc(m[1]) + '</a>';
      } else out += '<a href="mailto:' + esc(m[2]) + '">' + esc(m[2]) + '</a>';
      last = m.index + m[0].length;
    }
    return out + esc(s.slice(last));
  }

  var BULLET = /^\s*[-*•–]\s+/, NUMBER = /^\s*\d+[.)]\s+/;
  // Paragraphs are separated by blank lines; a block whose every line starts with "- ", "* ", "• " or "1. " is a list.
  function fromText(text, opts) {
    var o = Object.assign({}, DEFAULTS, opts), pad = o.indent ? '  ' : '', nl = '\n';
    var blocks = String(text || '').replace(/\r\n?/g, '\n').split(/\n[ \t]*\n+/).map(function (b) { return b.replace(/^\n+|\s+$/g, ''); }).filter(Boolean);
    return blocks.map(function (b) {
      var lines = b.split('\n');
      if (o.lists && lines.every(function (l) { return BULLET.test(l); })) return '<ul>' + nl + lines.map(function (l) { return pad + '<li>' + inline(l.replace(BULLET, ''), o) + '</li>'; }).join(nl) + nl + '</ul>';
      if (o.lists && lines.every(function (l) { return NUMBER.test(l); })) {
        var start = parseInt(lines[0], 10);
        return '<ol' + (start !== 1 ? ' start="' + start + '"' : '') + '>' + nl + lines.map(function (l) { return pad + '<li>' + inline(l.replace(NUMBER, ''), o) + '</li>'; }).join(nl) + nl + '</ol>';
      }
      return '<p>' + lines.map(function (l) { return inline(l.trim(), o); }).join(o.breaks ? '<br>' + nl + pad : ' ') + '</p>';
    }).join(nl);
  }

  function fromMarkdown(md) { return N ? N.html(md) : ''; }

  // HTML back to readable text: block tags become line breaks, list items get bullets, entities are decoded.
  var ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', reg: '®', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
  function toText(html) {
    return String(html || '').replace(/<(script|style|head)\b[\s\S]*?<\/\1\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<li\b[^>]*>/gi, '\n• ').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h[1-6]|ul|ol|table|tr|blockquote|section|article|header|footer)>/gi, '\n\n')
      .replace(/<(td|th)\b[^>]*>/gi, '\t').replace(/<a\b[^>]*href="(https?:[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, function (m, u, t) { return t.replace(/<[^>]+>/g, '').trim() === u ? u : t + ' (' + u + ')'; })
      .replace(/<[^>]+>/g, '')
      .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function (m, e) {
        if (e[0] === '#') { var n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n ? String.fromCodePoint(n) : m; }
        return ENT[e.toLowerCase()] || m;
      })
      .replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+(?=\S)/g, function (m) { return m.indexOf('\t') >= 0 ? m : '\n'; }).replace(/\n{3,}/g, '\n\n').trim();
  }

  function convert(text, mode, opts) {
    return mode === 'markdown' ? fromMarkdown(text) : mode === 'html2text' ? toText(text) : fromText(text, opts);
  }

  // A complete web page around the converted HTML, for "Download .html".
  function page(body, title) {
    return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>' + esc(title || 'Document') + '</title>\n' +
      '<style>body{max-width:720px;margin:40px auto;padding:0 20px;font:17px/1.7 system-ui,sans-serif;color:#1a1a1a}a{color:#1a56db}</style>\n</head>\n<body>\n' + body + '\n</body>\n</html>\n';
  }

  var api = { FACTS: FACTS, DEFAULTS: DEFAULTS, fromText: fromText, fromMarkdown: fromMarkdown, toText: toText, convert: convert, page: page, esc: esc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBTextHtml = api;
})(typeof self !== 'undefined' ? self : this);
