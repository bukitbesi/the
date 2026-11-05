/* Line tools core: list to paragraph and back, duplicate line remover with line-break clean-ups, and the line sorter.
   Pure string functions shared by the three pages, the build (first result in the HTML) and the tests.
   UMD: module.exports in Node, window.TBBLines in the browser. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-11-05' };

  var norm = function (t) { return String(t == null ? '' : t).replace(/\r\n?/g, '\n'); };
  var lines = function (t) { return norm(t).split('\n'); };
  // Bullets, check boxes and list numbers at the start of a line: "- ", "• ", "1. ", "2) ", "(3) ", "a. ", "[x] ".
  var MARKER = /^\s*(?:[-*+•‣◦▪▫●○·–—>]+\s*|\[[ xX]?\]\s*|\(?\d{1,4}[.)]\s+|\(?[a-zA-Z][.)]\s+)+/;
  var stripMarker = function (s) { return s.replace(MARKER, ''); };
  var TERMINAL = /[.!?…:;]["'”’)\]]*$/;

  // ---- list to paragraph
  var SEPS = { comma: ', ', and: ', ', or: ', ', semicolon: '; ', space: ' ', pipe: ' | ', tab: '\t', sentence: ' ' };

  function joinItems(items, o) {
    var sep = o.sep || 'sentence', last = sep === 'and' ? 'and' : sep === 'or' ? 'or' : '';
    if (o.lang === 'ms' && last) last = last === 'and' ? 'dan' : 'atau';
    if (sep === 'sentence') return items.map(function (s) { return o.period !== false && !TERMINAL.test(s) ? s + '.' : s; }).join(' ');
    var glue = sep === 'custom' ? String(o.custom == null ? ', ' : o.custom).replace(/\\n/g, '\n').replace(/\\t/g, '\t') : SEPS[sep] || ', ';
    if (!last || items.length < 2) return items.join(glue);
    if (items.length === 2) return items[0] + ' ' + last + ' ' + items[1];
    return items.slice(0, -1).join(glue) + (o.oxford === false || o.lang === 'ms' ? ' ' : glue) + last + ' ' + items[items.length - 1];
  }

  // o: { sep, custom, oxford, strip, quote, groups, period, lang, end }
  function listToParagraph(text, o) {
    o = o || {};
    var groups = o.groups !== false ? norm(text).split(/\n[ \t]*\n+/) : [norm(text)], count = 0;
    var out = groups.map(function (g) {
      var items = lines(g).map(function (l) { l = l.trim(); return o.strip !== false ? stripMarker(l).trim() : l; }).filter(Boolean);
      if (o.quote) items = items.map(function (s) { return o.quote + s.replace(new RegExp(o.quote, 'g'), o.quote === '"' ? '""' : o.quote) + o.quote; });
      count += items.length;
      var p = joinItems(items, o);
      return p && o.end && !TERMINAL.test(p) ? p + o.end : p;
    }).filter(Boolean);
    return { text: out.join('\n\n'), items: count, paragraphs: out.length };
  }

  // ---- paragraph to list
  var ABBR = /(?:\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|No|Sdn|Bhd|Jln|Tg|Kg|Dato|Datuk|Tan Sri|vs|etc|e\.g|i\.e|approx|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)|\b[A-Z])\.$/;

  function sentences(t) {
    var parts = norm(t).replace(/\s*\n\s*/g, ' ').split(/(?<=[.!?…]["'”’)\]]*)\s+(?=\S)/), out = [];
    parts.forEach(function (p) {
      // Not a sentence end after a known abbreviation or before a lowercase word (a.m. on Monday).
      if (out.length && (ABBR.test(out[out.length - 1]) || /^\p{Ll}/u.test(p))) out[out.length - 1] += ' ' + p; else out.push(p);
    });
    return out;
  }

  function splitItems(text, o) {
    var t = norm(text).trim(), by = o.split || 'auto';
    if (!t) return [];
    if (by === 'auto') by = /\n/.test(t) && !/[,;]/.test(t) ? 'line' : /[,;]/.test(t) ? 'comma' : 'sentence';
    var parts;
    if (by === 'sentence') parts = sentences(t);
    else if (by === 'line') parts = t.split('\n');
    else if (by === 'space') parts = t.split(/\s+/);
    else if (by === 'semicolon') parts = t.split(/\s*;\s*/);
    else if (by === 'custom') parts = o.custom ? t.split(String(o.custom).replace(/\\n/g, '\n').replace(/\\t/g, '\t')) : [t];
    else parts = t.split(/\s*[,;]\s*|\s*\n\s*/); // comma: commas, semicolons and line breaks
    parts = parts.map(function (s) { return s.trim(); });
    if (by === 'comma' || by === 'semicolon') {
      // "apples, pears and plums" / "epal, pir dan plum": the last "and" or "or" starts a new item.
      var last = parts.length - 1, m = parts[last] && parts[last].match(/^(.+?)\s+(?:and|or|dan|atau)\s+(.+)$/i);
      parts = parts.map(function (s) { return s.replace(/^(?:and|or|dan|atau)\s+/i, ''); });
      if (m && last > 0 && !/\s(?:and|or|dan|atau)\s/i.test(m[2])) parts.splice(last, 1, m[1].trim(), m[2].trim());
    }
    if (o.strip !== false) parts = parts.map(function (s) { return stripMarker(s).trim(); });
    if (o.dropEnd) parts = parts.map(function (s) { return s.replace(/[.;,]+$/, ''); });
    parts = parts.filter(Boolean);
    if (o.dedupe) { var seen = Object.create(null); parts = parts.filter(function (s) { var k = s.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; }); }
    return parts;
  }

  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  function letter(i) { var s = ''; i++; while (i > 0) { var r = (i - 1) % 26; s = String.fromCharCode(97 + r) + s; i = Math.floor((i - 1) / 26); } return s; }

  // o: { split, custom, bullet, strip, dropEnd, dedupe }
  function paragraphToList(text, o) {
    o = o || {};
    var items = splitItems(text, o), b = o.bullet || 'dash', out;
    if (b === 'ul' || b === 'ol') out = '<' + b + '>\n' + items.map(function (s) { return '  <li>' + esc(s) + '</li>'; }).join('\n') + '\n</' + b + '>';
    else out = items.map(function (s, i) {
      var p = { dash: '- ', bullet: '• ', star: '* ', number: (i + 1) + '. ', paren: (i + 1) + ') ', letter: letter(i) + '. ', check: '- [ ] ', none: '' }[b];
      return (p == null ? '- ' : p) + s;
    }).join('\n');
    return { text: items.length ? out : '', items: items.length };
  }

  // ---- duplicate lines
  // o: { ignoreCase, trim, ignoreSpaces, keep: 'first'|'last', mode: 'dedupe'|'unique'|'dupes', removeEmpty }
  function dedupe(text, o) {
    o = o || {};
    var src = lines(text), key = function (l) {
      var k = o.trim !== false ? l.trim() : l;
      if (o.ignoreSpaces) k = k.replace(/\s+/g, ' ');
      return o.ignoreCase ? k.toLocaleLowerCase() : k;
    };
    var count = Object.create(null), first = Object.create(null), lastIx = Object.create(null), empty = 0;
    src.forEach(function (l, i) {
      if (!l.trim()) { empty++; return; }
      var k = key(l);
      count[k] = (count[k] || 0) + 1;
      if (!(k in first)) first[k] = i;
      lastIx[k] = i;
    });
    var mode = o.mode || 'dedupe', out = [];
    src.forEach(function (l, i) {
      if (!l.trim()) { if (!o.removeEmpty) out.push(o.trim !== false ? '' : l); return; }
      var k = key(l), line = o.trim !== false ? l.trim() : l;
      if (mode === 'unique') { if (count[k] === 1) out.push(line); return; }
      var at = o.keep === 'last' ? lastIx[k] : first[k];
      if (at !== i) return;
      if (mode === 'dupes' && count[k] < 2) return;
      out.push(line);
    });
    if (o.removeEmpty || mode !== 'dedupe') out = out.filter(function (l) { return l.trim(); });
    var dupes = Object.keys(count).filter(function (k) { return count[k] > 1; })
      .map(function (k) { return { line: src[first[k]].trim(), count: count[k] }; })
      .sort(function (a, b) { return b.count - a.count || 0; });
    var total = src.length - empty, removed = dupes.reduce(function (n, d) { return n + d.count - 1; }, 0);
    return { text: out.join('\n'), total: total, unique: Object.keys(count).length, removed: mode === 'unique' ? removed + dupes.length : mode === 'dupes' ? total - dupes.length : removed, empty: empty, dupes: dupes, lines: out.length };
  }

  // ---- line breaks
  var BREAKS = {
    join: function (t) { return norm(t).replace(/[ \t]*\n\s*/g, ' ').trim(); },
    paragraphs: function (t) { return norm(t).split(/\n[ \t]*\n+/).map(function (p) { return p.replace(/[ \t]*\n[ \t]*/g, ' ').trim(); }).filter(Boolean).join('\n\n'); },
    hyphens: function (t) { return BREAKS.paragraphs(norm(t).replace(/(\p{L})-\n[ \t]*(\p{Ll})/gu, '$1$2')); },
    collapse: function (t) { return norm(t).replace(/\n[ \t]*(?:\n[ \t]*)+\n/g, '\n\n').replace(/^\s*\n|\n\s*$/g, ''); },
    empty: function (t) { return lines(t).filter(function (l) { return l.trim(); }).join('\n'); },
    sentences: function (t) { return norm(t).split(/\n[ \t]*\n+/).map(function (p) { return sentences(p).join('\n'); }).filter(Boolean).join('\n\n'); },
    br: function (t) { return norm(t).split('\n').join('<br>\n'); },
    comma: function (t) { return lines(t).map(function (l) { return l.trim(); }).filter(Boolean).join(', '); }
  };
  function breaks(text, mode) { return (BREAKS[mode] || BREAKS.join)(text); }

  // ---- sort lines
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var ARTICLES = /^(?:the|a|an)\s+/i;
  function firstNumber(s) {
    var m = String(s).replace(/(\d),(?=\d{3}\b)/g, '$1').match(/[-−]?\d+(?:\.\d+)?|[-−]?\.\d+/);
    return m ? parseFloat(m[0].replace('−', '-')) : NaN;
  }
  function sortKey(l, o) {
    var k = l;
    if (o.by === 'last') { var w = l.trim().split(/\s+/); k = w[w.length - 1] || ''; }
    else if (o.by === 'col') {
      var d = o.delim === 'tab' ? '\t' : o.delim === 'space' ? /\s+/ : o.delim || ',';
      k = (l.split(d)[Math.max(0, (parseInt(o.col, 10) || 1) - 1)] || '').trim();
    }
    if (o.ignoreArticles) k = k.replace(ARTICLES, '');
    return k;
  }

  // o: { order: 'az'|'za'|'num'|'numDesc'|'len'|'lenDesc'|'random'|'reverse', by: 'line'|'last'|'col', col, delim,
  //      natural, caseSensitive, ignoreArticles, lang, dedupe, removeEmpty, trim, seed }
  function sort(text, o) {
    o = o || {};
    var src = lines(text);
    if (o.trim !== false) src = src.map(function (l) { return l.trim(); });
    if (o.removeEmpty !== false) src = src.filter(function (l) { return l.trim(); });
    if (o.dedupe) { var seen = Object.create(null); src = src.filter(function (l) { var k = o.caseSensitive ? l : l.toLocaleLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; }); }
    var order = o.order || 'az', items = src.map(function (l, i) { return { l: l, i: i, k: sortKey(l, o) }; });
    var coll = new Intl.Collator(o.lang === 'ms' ? 'ms' : 'en', { numeric: o.natural !== false, sensitivity: o.caseSensitive ? 'case' : 'base', caseFirst: o.caseSensitive ? 'upper' : 'false' });
    var tie = function (a, b) { return a.i - b.i; };
    if (order === 'reverse') items.reverse();
    else if (order === 'random') {
      var r = rng(o.seed == null ? Date.now() : o.seed);
      for (var i = items.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = items[i]; items[i] = items[j]; items[j] = t; }
    } else if (order === 'num' || order === 'numDesc') {
      var s = order === 'num' ? 1 : -1;
      items.forEach(function (x) { x.n = firstNumber(x.k); });
      items.sort(function (a, b) {
        var an = isNaN(a.n), bn = isNaN(b.n);
        if (an || bn) return an === bn ? coll.compare(a.k, b.k) || tie(a, b) : an ? 1 : -1;
        return s * (a.n - b.n) || coll.compare(a.k, b.k) || tie(a, b);
      });
    } else if (order === 'len' || order === 'lenDesc') {
      var d = order === 'len' ? 1 : -1;
      items.sort(function (a, b) { return d * (Array.from(a.k).length - Array.from(b.k).length) || coll.compare(a.k, b.k) || tie(a, b); });
    } else {
      var z = order === 'za' ? -1 : 1;
      items.sort(function (a, b) { return z * coll.compare(a.k, b.k) || tie(a, b); });
    }
    return { text: items.map(function (x) { return x.l; }).join('\n'), lines: items.length, removed: lines(text).length - items.length };
  }

  function stats(t) {
    t = norm(t);
    var ls = t ? t.split('\n') : [];
    return { lines: ls.length, nonEmpty: ls.filter(function (l) { return l.trim(); }).length, chars: Array.from(t).length, words: (t.match(/\S+/g) || []).length };
  }
  var fmt = function (n) { return Number(n).toLocaleString('en-US'); };
  var plural = function (n, one, many) { return fmt(n) + ' ' + (n === 1 ? one : many); };


  // One entry point for the three pages (UI and build): returns { text, summary }.
  var DEFAULTS = {
    list: { mode: 'l2p', sep: 'and', custom: ' / ', oxford: true, quote: '', groups: true, strip: true, end: false, split: 'auto', pcustom: '|', bullet: 'dash', dedupe: false, dropEnd: false },
    dedupe: { mode: 'dupes', kind: 'dedupe', keep: 'first', ignoreCase: false, trim: true, ignoreSpaces: false, removeEmpty: false, brk: 'paragraphs' },
    sort: { order: 'az', by: 'line', col: '1', delim: ',', natural: true, caseSensitive: false, ignoreArticles: false, lang: 'en', dedupe: false, removeEmpty: true }
  };
  function run(tool, text, opts) {
    var o = {}, d = DEFAULTS[tool] || {}, k, r;
    for (k in d) o[k] = d[k];
    for (k in opts || {}) if (opts[k] !== undefined) o[k] = opts[k];
    if (!norm(text).trim()) return { text: '', summary: 'Paste or type your text to start.' };
    if (tool === 'list') {
      if (o.mode === 'p2l') {
        r = paragraphToList(text, { split: o.split, custom: o.pcustom, bullet: o.bullet, dedupe: o.dedupe, dropEnd: o.dropEnd });
        return { text: r.text, summary: plural(r.items, 'item', 'items') + ' in the list.' };
      }
      r = listToParagraph(text, { sep: o.sep, custom: o.custom, oxford: o.oxford, quote: o.quote, groups: o.groups, strip: o.strip, end: o.end ? '.' : '' });
      return { text: r.text, summary: plural(r.items, 'item', 'items') + ' joined into ' + plural(r.paragraphs, 'paragraph', 'paragraphs') + '.' };
    }
    if (tool === 'dedupe') {
      if (o.mode === 'breaks') {
        var out = breaks(text, o.brk), a = stats(text), b = stats(out);
        return { text: out, summary: plural(a.lines, 'line', 'lines') + ' → ' + plural(b.lines, 'line', 'lines') + '.' };
      }
      r = dedupe(text, { kind: o.kind, mode: o.kind, keep: o.keep, ignoreCase: o.ignoreCase, trim: o.trim, ignoreSpaces: o.ignoreSpaces, removeEmpty: o.removeEmpty });
      var top = r.dupes.slice(0, 3).map(function (x) { return '"' + (x.line.length > 40 ? x.line.slice(0, 39) + '…' : x.line) + '" ×' + x.count; }).join(', ');
      return { text: r.text, summary: plural(r.total, 'line', 'lines') + ', ' + fmt(r.unique) + ' unique, ' + plural(r.removed, 'line', 'lines') + ' removed' + (r.empty ? ', ' + fmt(r.empty) + ' empty' : '') + '.' + (top ? ' Most repeated: ' + top + '.' : ' No duplicates found.') };
    }
    r = sort(text, o);
    return { text: r.text, summary: plural(r.lines, 'line', 'lines') + ' sorted' + (r.removed ? ', ' + plural(r.removed, 'line', 'lines') + ' removed (empty or duplicate)' : '') + '.' };
  }

  var api = { FACTS: FACTS, DEFAULTS: DEFAULTS, run: run, listToParagraph: listToParagraph, paragraphToList: paragraphToList, splitItems: splitItems, sentences: sentences,
    dedupe: dedupe, breaks: breaks, BREAKS: Object.keys(BREAKS), sort: sort, firstNumber: firstNumber, stripMarker: stripMarker, stats: stats, fmt: fmt, plural: plural, esc: esc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBLines = api;
})(this);
