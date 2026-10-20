/* Find and Replace / Text Cleaner core. Several find-and-replace rules applied in order (plain text or regular
   expressions, case and whole-word options, $1 groups, \n and \t in replacements), match highlighting, and one-click
   clean-ups: spaces, line breaks, empty and duplicate lines, sorting, numbers, punctuation, emoji, HTML tags, accents,
   URLs, emails and any characters you list. UMD: module.exports in Node, window.TBBText in the browser. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-19' };
  var escRe = function (s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  var unescapeWs = function (s) { return String(s).replace(/\\(n|t|\\)/g, function (m, c) { return c === 'n' ? '\n' : c === 't' ? '\t' : '\\'; }); };

  // Builds the RegExp for a rule, or returns { error } for an invalid pattern.
  function pattern(rule) {
    var find = rule.regex ? String(rule.find) : escRe(rule.escapes ? unescapeWs(rule.find) : rule.find);
    if (!find) return null;
    if (rule.wholeWord) find = '(?<![\\p{L}\\p{N}_])(?:' + find + ')(?![\\p{L}\\p{N}_])';
    try { return new RegExp(find, 'gu' + (rule.caseSensitive ? '' : 'i') + (rule.regex && rule.multiline ? 'm' : '')); }
    catch (e) { return { error: String(e.message).replace(/^Invalid regular expression: (\/.*\/[a-z]*: )?/, '') }; }
  }

  // Applies rules in order; returns { text, counts: [n per rule], errors: [message or null per rule] }.
  function replaceAll(text, rules) {
    var out = String(text), counts = [], errors = [];
    (rules || []).forEach(function (r) {
      var re = pattern(r);
      if (!re) { counts.push(0); errors.push(null); return; }
      if (re.error) { counts.push(0); errors.push(re.error); return; }
      var n = 0, rep = r.escapes !== false ? unescapeWs(r.replace || '') : String(r.replace || '');
      out = out.replace(re, function () {
        n++;
        if (!r.regex) return rep;
        var args = arguments, groups = typeof args[args.length - 1] === 'object' ? args[args.length - 1] : null;
        return rep.replace(/\$(\$|&|\d{1,2}|<([^>]+)>)/g, function (m, k, name) {
          if (k === '$') return '$';
          if (k === '&') return args[0];
          if (name != null) return groups && groups[name] != null ? groups[name] : '';
          var i = +k;
          return i > 0 && i < args.length - 2 && typeof args[i] === 'string' ? args[i] : (i > 0 && args[i] === undefined ? '' : m);
        });
      });
      counts.push(n);
      errors.push(null);
    });
    return { text: out, counts: counts, errors: errors };
  }

  // HTML with <mark> around each match of one rule (for the preview), escaped and capped for speed.
  function highlight(text, rule, max) {
    var re = pattern(rule), s = String(text), out = '', last = 0, n = 0, m;
    max = max || 2000;
    if (!re || re.error) return { html: esc(s), count: 0 };
    while ((m = re.exec(s)) && n < max) {
      if (m[0] === '') { re.lastIndex++; continue; }
      out += esc(s.slice(last, m.index)) + '<mark>' + esc(m[0]) + '</mark>';
      last = m.index + m[0].length;
      n++;
    }
    return { html: out + esc(s.slice(last)), count: n };
  }

  var EMOJI = /(?:\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}])(?:[\u{1F3FB}-\u{1F3FF}️⃣]|‍(?:\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]))*|[️‍]/gu;
  var lines = function (t) { return t.split('\n'); };
  // Clean-ups, in the order they run when several are ticked.
  var OPS = [
    ['html', 'Remove HTML tags', function (t) { return t.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"); }],
    ['urls', 'Remove URLs', function (t) { return t.replace(/\b(?:https?:\/\/|www\.)[^\s<>"']+/gi, ''); }],
    ['emails', 'Remove email addresses', function (t) { return t.replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, ''); }],
    ['emoji', 'Remove emoji', function (t) { return t.replace(EMOJI, ''); }],
    ['accents', 'Remove accents (é → e)', function (t) { return t.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC'); }],
    ['nonascii', 'Remove non-ASCII characters', function (t) { return t.replace(/[^\x00-\x7F]/g, ''); }],
    ['numbers', 'Remove numbers', function (t) { return t.replace(/\p{N}/gu, ''); }],
    ['punctuation', 'Remove punctuation', function (t) { return t.replace(/[\p{P}\p{S}]/gu, ''); }],
    ['special', 'Remove special characters (keep letters, numbers, spaces and . , ! ? \' -)', function (t) { return t.replace(/[^\p{L}\p{N}\p{M}\s.,!?'’-]/gu, ''); }],
    ['linebreaks', 'Remove line breaks (keep paragraphs)', function (t) { return t.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n+/).map(function (p) { return p.replace(/\s*\n\s*/g, ' '); }).join('\n\n'); }],
    ['alllines', 'Join everything into one line', function (t) { return t.replace(/\s*[\r\n]+\s*/g, ' '); }],
    ['spaces', 'Remove extra spaces', function (t) { return t.replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n'); }],
    ['trim', 'Trim each line', function (t) { return lines(t).map(function (l) { return l.trim(); }).join('\n'); }],
    ['empty', 'Remove empty lines', function (t) { return lines(t).filter(function (l) { return l.trim(); }).join('\n'); }],
    ['dupes', 'Remove duplicate lines', function (t) { var seen = Object.create(null); return lines(t).filter(function (l) { var k = l.trim(); if (k && seen[k]) return false; seen[k] = 1; return true; }).join('\n'); }],
    ['sort', 'Sort lines A to Z', function (t) { return lines(t).sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }); }).join('\n'); }],
    ['reverse', 'Reverse line order', function (t) { return lines(t).reverse().join('\n'); }]
  ];
  var BY = {};
  OPS.forEach(function (o) { BY[o[0]] = o; });

  function clean(text, keys, chars) {
    var t = String(text).replace(/\r\n?/g, '\n');
    if (chars) t = t.replace(new RegExp('[' + Array.from(chars).map(escRe).join('').replace(/-/g, '\\-') + ']', 'gu'), '');
    OPS.forEach(function (o) { if (keys.indexOf(o[0]) >= 0) t = o[2](t); });
    return t;
  }

  function stats(a, b) {
    var ca = Array.from(a).length, cb = Array.from(b).length;
    return { before: ca, after: cb, removed: ca - cb, lines: b ? b.split('\n').length : 0 };
  }

  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  function ruleRow(r, i) {
    r = r || {};
    var opt = function (k, label, title) { return '<label class="fr-opt" title="' + title + '"><input type="checkbox" data-k="' + k + '"' + (r[k] ? ' checked' : '') + '><span>' + label + '</span></label>'; };
    return '<div class="fr-rule" data-i="' + i + '"><div class="field"><label for="frFind' + i + '">Find</label><input class="input" id="frFind' + i + '" data-k="find" value="' + esc(r.find || '') + '" autocomplete="off" spellcheck="false"></div>' +
      '<div class="field"><label for="frRep' + i + '">Replace with</label><input class="input" id="frRep' + i + '" data-k="replace" value="' + esc(r.replace || '') + '" autocomplete="off" spellcheck="false"></div>' +
      '<div class="fr-opts">' + opt('caseSensitive', 'Aa', 'Match case') + opt('wholeWord', 'Word', 'Whole words only') + opt('regex', '.*', 'Regular expression') +
      '<span class="fr-count" aria-live="polite"></span><button type="button" class="hbtn fr-del" data-del aria-label="Remove rule ' + (i + 1) + '">×</button></div><p class="error fr-err" hidden></p></div>';
  }
  var api = { views: { ruleRow: ruleRow }, FACTS: FACTS, OPS: OPS, pattern: pattern, replaceAll: replaceAll, highlight: highlight, clean: clean, stats: stats, esc: esc, unescapeWs: unescapeWs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBText = api;
})(typeof self !== 'undefined' ? self : this);
