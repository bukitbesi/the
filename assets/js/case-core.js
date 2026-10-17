/* Case Converter core: text cases (sentence, AP-style title case, upper, lower…) that keep acronyms such as SEO or
   KWSP, and developer cases (camelCase, snake_case, kebab-case, slugs…) that split words at spaces, punctuation and
   camelCase humps. Developer cases convert each line separately, so a list of names converts in one go.
   UMD: module.exports in Node, window.TBBCase in the browser. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-17' };
  // AP Stylebook: articles, and conjunctions and prepositions of three letters or fewer, stay lowercase in titles.
  var SMALL = ['a', 'an', 'the', 'and', 'but', 'for', 'nor', 'or', 'so', 'yet', 'as', 'at', 'by', 'in', 'of', 'off', 'on', 'per', 'to', 'up', 'via'];
  var WORD = /[\p{L}\p{N}][\p{L}\p{N}\p{M}'’]*/gu;
  var isAcronym = function (w) { return w.length > 1 && /\p{Lu}/u.test(w) && w === w.toUpperCase() && !/^[\p{N}]+$/u.test(w); };
  var cap = function (w) { return w.charAt(0).toUpperCase() + w.slice(1); };
  var allCaps = function (t) { return /\p{L}/u.test(t) && t === t.toUpperCase(); };

  // Keep acronyms only when the text is not shouting in capitals throughout.
  function keepCaps(text, o) { return (!o || o.keepAcronyms !== false) && !allCaps(text); }

  function sentence(text, o) {
    var keep = keepCaps(text, o), start = true;
    return String(text).replace(/[\p{L}\p{N}][\p{L}\p{N}\p{M}'’]*|[.!?]+(?=\s|$)|\n/gu, function (m) {
      if (/^[.!?\n]/.test(m)) { start = true; return m; }
      var out = keep && isAcronym(m) ? m : m.toLowerCase();
      if (out === 'i' || /^i['’]/.test(out)) out = 'I' + out.slice(1);
      if (start) { out = cap(out); start = false; }
      return out;
    });
  }

  function title(text, o) {
    var keep = keepCaps(text, o);
    return String(text).split('\n').map(function (line) {
      var list = [], m;
      WORD.lastIndex = 0;
      while ((m = WORD.exec(line))) list.push({ i: m.index, w: m[0] });
      var out = line, shift = 0;
      list.forEach(function (x, k) {
        var before = line.slice(k ? list[k - 1].i + list[k - 1].w.length : 0, x.i);
        var lower = x.w.toLowerCase(), first = k === 0 || /[:—–?!.]\s*$/.test(before), last = k === list.length - 1;
        var r = keep && isAcronym(x.w) ? x.w : !first && !last && SMALL.indexOf(lower) >= 0 ? lower : cap(lower);
        out = out.slice(0, x.i + shift) + r + out.slice(x.i + shift + x.w.length);
        shift += r.length - x.w.length;
      });
      return out;
    }).join('\n');
  }

  function eachWord(text, o) {
    var keep = keepCaps(text, o);
    return String(text).replace(WORD, function (w) { return keep && isAcronym(w) ? w : cap(w.toLowerCase()); });
  }

  function alternating(text) {
    var n = 0;
    return String(text).replace(/\p{L}/gu, function (c) { return n++ % 2 ? c.toUpperCase() : c.toLowerCase(); });
  }
  function inverse(text) {
    return String(text).replace(/\p{L}/gu, function (c) { var u = c.toUpperCase(); return c === u ? c.toLowerCase() : u; });
  }

  // Words for developer cases: split at anything that is not a letter or digit and at camelCase humps (XMLHttp → XML Http).
  function split(line) {
    return String(line).replace(/['’]/g, '').replace(/(\p{Ll}|\p{N})(\p{Lu})/gu, '$1 $2').replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2')
      .split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  }
  function dev(fn) {
    return function (text) { return String(text).split('\n').map(function (l) { var w = split(l); return w.length ? fn(w) : ''; }).join('\n'); };
  }
  var low = function (w) { return w.map(function (x) { return x.toLowerCase(); }); };
  var camel = dev(function (w) { w = low(w); return w[0] + w.slice(1).map(cap).join(''); });
  var pascal = dev(function (w) { return low(w).map(cap).join(''); });
  var join = function (sep, upper) { return dev(function (w) { var s = low(w).join(sep); return upper ? s.toUpperCase() : s; }); };
  var train = dev(function (w) { return low(w).map(cap).join('-'); });
  function slug(text) {
    return String(text).split('\n').map(function (l) {
      return l.normalize('NFKD').replace(/\p{M}/gu, '').replace(/&/g, ' and ').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }).join('\n');
  }

  var CASES = [
    { key: 'sentence', group: 'text', label: 'Sentence case', fn: sentence },
    { key: 'title', group: 'text', label: 'Title Case', fn: title },
    { key: 'upper', group: 'text', label: 'UPPERCASE', fn: function (t) { return String(t).toUpperCase(); } },
    { key: 'lower', group: 'text', label: 'lowercase', fn: function (t) { return String(t).toLowerCase(); } },
    { key: 'each', group: 'text', label: 'Capitalize Each Word', fn: eachWord },
    { key: 'alt', group: 'text', label: 'aLtErNaTiNg cAsE', fn: alternating },
    { key: 'inverse', group: 'text', label: 'iNVERSE cASE', fn: inverse },
    { key: 'camel', group: 'dev', label: 'camelCase', fn: camel },
    { key: 'pascal', group: 'dev', label: 'PascalCase', fn: pascal },
    { key: 'snake', group: 'dev', label: 'snake_case', fn: join('_') },
    { key: 'constant', group: 'dev', label: 'CONSTANT_CASE', fn: join('_', true) },
    { key: 'kebab', group: 'dev', label: 'kebab-case', fn: join('-') },
    { key: 'train', group: 'dev', label: 'Train-Case', fn: train },
    { key: 'dot', group: 'dev', label: 'dot.case', fn: join('.') },
    { key: 'path', group: 'dev', label: 'path/case', fn: join('/') },
    { key: 'slug', group: 'dev', label: 'URL slug', fn: slug }
  ];
  var BY = {};
  CASES.forEach(function (c) { BY[c.key] = c; });

  function convert(text, key, o) { return BY[key] ? BY[key].fn(text, o) : String(text); }

  function clean(text) {
    return String(text).split('\n').map(function (l) { return l.replace(/[ \t ]+/g, ' ').trim(); }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function counts(text) {
    text = String(text);
    var w = text.match(WORD);
    return { chars: Array.from(text).length, words: w ? w.length : 0, lines: text ? text.split('\n').length : 0 };
  }

  // ---------------------------------------------------------------- HTML views shared by the build and the page
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  function devRows(text) {
    return CASES.filter(function (c) { return c.group === 'dev'; }).map(function (c) {
      var v = c.fn(text), shown = v.length > 300 ? v.slice(0, 300) + '…' : v;
      return '<tr><th scope="row">' + esc(c.label) + '</th><td><code>' + (esc(shown).replace(/\n/g, '<br>') || '&nbsp;') + '</code></td><td><button type="button" class="btn ghost sm" data-copy="' + c.key + '">Copy</button></td></tr>';
    }).join('');
  }
  function countsText(c) {
    return c.chars.toLocaleString('en-US') + (c.chars === 1 ? ' character, ' : ' characters, ') + c.words.toLocaleString('en-US') + (c.words === 1 ? ' word, ' : ' words, ') + c.lines + (c.lines === 1 ? ' line' : ' lines');
  }

  var api = {
    FACTS: FACTS, SMALL: SMALL, CASES: CASES, convert: convert, split: split, clean: clean, counts: counts,
    sentence: sentence, title: title, slug: slug, isAcronym: isAcronym,
    views: { devRows: devRows, countsText: countsText, esc: esc }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBCase = api;
})(typeof self !== 'undefined' ? self : this);
