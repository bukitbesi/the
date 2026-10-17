/* Online Notepad core shared by the page, the build and the tests: text statistics, a safe Markdown subset (parsed
   to blocks once, then rendered to HTML or to Word via docx-core.js), find and replace, line and case transforms,
   note and snapshot bookkeeping, and the base64url wrapper used for share links. No storage or DOM here. */
(function (root) {
  'use strict';

  // Reading speed: 238 words a minute for silent reading of non-fiction (Brysbaert 2019 meta-analysis).
  var FACTS = { verified: '2026-10-17', wpm: 238, maxSnapshots: 20, snapshotGapMs: 2 * 60 * 1000, maxNotes: 200 };

  // ---------------------------------------------------------------- statistics
  var WORD = /[\p{L}\p{N}]+(?:['’\-.][\p{L}\p{N}]+)*/gu;
  function stats(text) {
    text = String(text || '');
    var words = (text.match(WORD) || []).length;
    var chars = Array.from(text).length;
    var noSpaces = Array.from(text.replace(/\s/g, '')).length;
    var lines = text ? text.split(/\r\n|\r|\n/).length : 0;
    var paragraphs = text.split(/\n\s*\n/).filter(function (p) { return /\S/.test(p); }).length;
    var sentences = words ? Math.max(1, (text.match(/[^.!?。\n]*[\p{L}\p{N}][^.!?。\n]*[.!?。]+(?=\s|$)/gu) || []).length) : 0;
    var minutes = words / FACTS.wpm;
    return { words: words, chars: chars, noSpaces: noSpaces, lines: lines, paragraphs: paragraphs, sentences: sentences, minutes: minutes,
      reading: !words ? '0 min' : minutes < 1 ? 'under 1 min' : Math.round(minutes) + ' min' };
  }

  // ---------------------------------------------------------------- Markdown subset
  function inline(s) {
    var out = [], i = 0, buf = '', st = { b: false, i: false, del: false };
    var flush = function () { if (buf) { out.push({ text: buf, b: st.b, i: st.i, del: st.del }); buf = ''; } };
    while (i < s.length) {
      var c = s[i], rest = s.slice(i);
      if (c === '\\' && /[\\`*_~\[\]()#>!-]/.test(s[i + 1] || '')) { buf += s[i + 1]; i += 2; continue; }
      if (c === '`') {
        var e = s.indexOf('`', i + 1);
        if (e > i) { flush(); out.push({ text: s.slice(i + 1, e), code: true }); i = e + 1; continue; }
      }
      var link = /^\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/.exec(rest);
      if (link) { flush(); out.push({ text: link[1], href: safeUrl(link[2]), b: st.b, i: st.i }); i += link[0].length; continue; }
      var auto = /^https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]/.exec(rest);
      if (auto && (!i || /[\s(]/.test(s[i - 1]))) { flush(); out.push({ text: auto[0], href: auto[0] }); i += auto[0].length; continue; }
      if ((rest.slice(0, 2) === '**' || rest.slice(0, 2) === '__') && (st.b || s.indexOf(rest.slice(0, 2), i + 2) > i + 2)) { flush(); st.b = !st.b; i += 2; continue; }
      if (rest.slice(0, 2) === '~~' && (st.del || s.indexOf('~~', i + 2) > i + 2)) { flush(); st.del = !st.del; i += 2; continue; }
      if ((c === '*' || (c === '_' && !/\w/.test(s[i - 1] || ''))) && s[i + 1] !== ' ' && (st.i || s.indexOf(c, i + 1) > i + 1)) { flush(); st.i = !st.i; i += 1; continue; }
      buf += c;
      i++;
    }
    flush();
    return out;
  }
  function safeUrl(u) { return /^(https?:|mailto:|#|\/(?!\/))/i.test(u) ? u : ''; }

  function parse(text) {
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n'), blocks = [], i = 0;
    var para = [];
    var endPara = function () { if (para.length) { blocks.push({ t: 'p', inl: inline(para.join('\n')) }); para = []; } };
    while (i < lines.length) {
      var l = lines[i], m;
      if (/^\s*```/.test(l)) {
        endPara();
        var code = [];
        i++;
        while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
        blocks.push({ t: 'code', text: code.join('\n') });
        i++;
        continue;
      }
      if (!l.trim()) { endPara(); i++; continue; }
      if ((m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l))) { endPara(); blocks.push({ t: 'h', level: m[1].length, inl: inline(m[2]) }); i++; continue; }
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)) { endPara(); blocks.push({ t: 'hr' }); i++; continue; }
      if (/^\s*>/.test(l)) {
        endPara();
        var q = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, ''));
        blocks.push({ t: 'quote', inl: inline(q.join('\n')) });
        continue;
      }
      if ((m = /^\s*([-*+]|\d+[.)])\s+/.exec(l))) {
        endPara();
        var ordered = /\d/.test(m[1]), items = [];
        while (i < lines.length && (m = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(lines[i])) && /\d/.test(m[1]) === ordered) {
          var body = m[2], task = /^\[([ xX])\]\s+(.*)$/.exec(body);
          items.push(task ? { inl: inline(task[2]), checked: task[1] !== ' ' } : { inl: inline(body) });
          i++;
        }
        blocks.push({ t: ordered ? 'ol' : 'ul', items: items });
        continue;
      }
      para.push(l);
      i++;
    }
    endPara();
    return blocks;
  }

  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  function inlineHtml(runs) {
    return runs.map(function (r) {
      var t = esc(r.text).replace(/\n/g, '<br>');
      if (r.code) return '<code>' + t + '</code>';
      if (r.del) t = '<del>' + t + '</del>';
      if (r.i) t = '<em>' + t + '</em>';
      if (r.b) t = '<strong>' + t + '</strong>';
      if (r.href) t = '<a href="' + esc(r.href) + '" rel="noopener nofollow ugc" target="_blank">' + t + '</a>';
      return t;
    }).join('');
  }
  // shift moves headings down (shift 2: # becomes h3) so a preview inside a page keeps the page's one h1.
  function html(blocks, o) {
    if (typeof blocks === 'string') blocks = parse(blocks);
    var shift = (o && o.shift) || 0;
    return blocks.map(function (b) {
      if (b.t === 'h') {
        var lv = Math.min(6, b.level + shift);
        return '<h' + lv + (shift ? ' class="md-h' + b.level + '"' : '') + '>' + inlineHtml(b.inl) + '</h' + lv + '>';
      }
      if (b.t === 'p') return '<p>' + inlineHtml(b.inl) + '</p>';
      if (b.t === 'quote') return '<blockquote><p>' + inlineHtml(b.inl) + '</p></blockquote>';
      if (b.t === 'code') return '<pre><code>' + esc(b.text) + '</code></pre>';
      if (b.t === 'hr') return '<hr>';
      var tag = b.t;
      return '<' + tag + '>' + b.items.map(function (it) {
        return '<li>' + (it.checked !== undefined ? '<span class="md-task" role="img" aria-label="' + (it.checked ? 'Done' : 'To do') + '">' + (it.checked ? '☑' : '☐') + '</span> ' : '') + inlineHtml(it.inl) + '</li>';
      }).join('') + '</' + tag + '>';
    }).join('\n');
  }
  function plain(blocks) {
    if (typeof blocks === 'string') blocks = parse(blocks);
    var t = function (runs) { return runs.map(function (r) { return r.text; }).join(''); };
    return blocks.map(function (b) {
      if (b.t === 'code') return b.text;
      if (b.t === 'hr') return '';
      if (b.items) return b.items.map(function (it, n) { return (b.t === 'ol' ? (n + 1) + '. ' : '• ') + t(it.inl); }).join('\n');
      return t(b.inl);
    }).join('\n\n');
  }

  // ---------------------------------------------------------------- find and replace
  function matcher(q, o) {
    o = o || {};
    if (!q) return null;
    var src = o.regex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var flags = 'gu' + (o.caseSensitive ? '' : 'i');
    // Lookbehind needs Safari 16.4+; older engines fall back to ASCII word boundaries.
    if (o.word) { try { return new RegExp('(?<![\\p{L}\\p{N}_])(?:' + src + ')(?![\\p{L}\\p{N}_])', flags); } catch (e) { src = '\\b(?:' + src + ')\\b'; } }
    return new RegExp(src, flags);
  }
  function findAll(text, q, o) {
    var re = matcher(q, o), out = [], m;
    if (!re) return out;
    while ((m = re.exec(text)) && out.length < 10000) {
      if (!m[0].length) { re.lastIndex++; continue; }
      out.push({ start: m.index, end: m.index + m[0].length });
    }
    return out;
  }
  function replaceAll(text, q, rep, o) {
    var re = matcher(q, o);
    if (!re) return { text: text, count: 0 };
    var n = findAll(text, q, o).length;
    // Plain text replacements are literal: "$&" stays "$&". Regex mode supports $1 references.
    var out = o && o.regex ? text.replace(re, rep) : text.replace(re, function () { return rep; });
    return { text: out, count: n };
  }

  // ---------------------------------------------------------------- transforms
  var lineOp = function (f) { return function (t) { return f(t.split('\n')).join('\n'); }; };
  var TRANSFORMS = {
    upper: { label: 'UPPERCASE', fn: function (t) { return t.toUpperCase(); } },
    lower: { label: 'lowercase', fn: function (t) { return t.toLowerCase(); } },
    title: { label: 'Title Case', fn: function (t) { return t.toLowerCase().replace(/(^|[\s(\["'“‘-])(\p{L})/gu, function (m, a, c) { return a + c.toUpperCase(); }); } },
    sentence: { label: 'Sentence case', fn: function (t) { return t.toLowerCase().replace(/(^\s*|[.!?]\s+|\n\s*)(\p{L})/gu, function (m, a, c) { return a + c.toUpperCase(); }); } },
    spaces: { label: 'Remove extra spaces', fn: function (t) { return t.replace(/[ \t]+/g, ' ').replace(/ +\n/g, '\n').replace(/\n +/g, '\n').trim(); } },
    blank: { label: 'Remove blank lines', fn: lineOp(function (l) { return l.filter(function (x) { return x.trim(); }); }) },
    sort: { label: 'Sort lines A–Z', fn: lineOp(function (l) { return l.slice().sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }); }); }) },
    unique: { label: 'Remove duplicate lines', fn: lineOp(function (l) { var seen = {}; return l.filter(function (x) { if (seen[x]) return false; seen[x] = 1; return true; }); }) },
    number: { label: 'Number lines', fn: lineOp(function (l) { return l.map(function (x, n) { return (n + 1) + '. ' + x; }); }) }
  };

  // ---------------------------------------------------------------- notes and snapshots
  function title(note) {
    var t = (note.title || '').trim();
    if (t) return t;
    var first = String(note.text || '').split('\n').map(function (l) { return l.replace(/^#+\s*|[*_`>]/g, '').trim(); }).filter(Boolean)[0] || 'Untitled note';
    return first.length > 60 ? first.slice(0, 57) + '…' : first;
  }
  function newNote(text, now) {
    now = now || Date.now();
    return { id: now.toString(36) + Math.random().toString(36).slice(2, 7), title: '', text: text || '', created: now, updated: now, snaps: [] };
  }
  // Keeps a copy of the text when it changed and the last copy is older than the gap (or when forced).
  function snapshot(note, now, force) {
    var last = note.snaps[note.snaps.length - 1];
    if (last && last.text === note.text) return false;
    if (!force && last && now - last.t < FACTS.snapshotGapMs) return false;
    if (!note.text.trim()) return false;
    note.snaps.push({ t: now, text: note.text });
    if (note.snaps.length > FACTS.maxSnapshots) note.snaps.splice(0, note.snaps.length - FACTS.maxSnapshots);
    return true;
  }
  function search(notes, q) {
    q = String(q || '').trim().toLowerCase();
    if (!q) return notes.slice();
    return notes.filter(function (n) { return title(n).toLowerCase().indexOf(q) >= 0 || n.text.toLowerCase().indexOf(q) >= 0; });
  }
  // Accepts a backup file ({ notes: [...] }) and returns valid notes with fresh ids if they clash.
  function importBackup(json, existing) {
    var data = typeof json === 'string' ? JSON.parse(json) : json, ids = {};
    (existing || []).forEach(function (n) { ids[n.id] = 1; });
    if (!data || !Array.isArray(data.notes)) throw new Error('notBackup');
    return data.notes.filter(function (n) { return n && typeof n.text === 'string'; }).map(function (n) {
      var note = newNote(n.text, +n.updated || Date.now());
      note.title = typeof n.title === 'string' ? n.title : '';
      note.created = +n.created || note.created;
      note.snaps = Array.isArray(n.snaps) ? n.snaps.filter(function (s) { return s && typeof s.text === 'string'; }).slice(-FACTS.maxSnapshots) : [];
      if (n.id && !ids[n.id]) note.id = String(n.id);
      ids[note.id] = 1;
      return note;
    });
  }

  // ---------------------------------------------------------------- share links (bytes are deflated by the page)
  function toBase64Url(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromBase64Url(str) {
    var s = atob(String(str).replace(/-/g, '+').replace(/_/g, '/')), out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  var safeName = function (s) { return String(s || 'note').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'note'; };

  // One status line for the page and the build: "1 sentence", "2 sentences".
  function summary(s) {
    var f = function (n, one, many) { return n.toLocaleString('en-US') + ' ' + (n === 1 ? one : many); };
    return f(s.words, 'word', 'words') + ' · ' + f(s.chars, 'character', 'characters') + ' (' + s.noSpaces.toLocaleString('en-US') + ' without spaces) · ' +
      f(s.lines, 'line', 'lines') + ' · ' + f(s.paragraphs, 'paragraph', 'paragraphs') + ' · ' + f(s.sentences, 'sentence', 'sentences') + ' · ' + s.reading + ' read';
  }

  var api = {
    FACTS: FACTS, stats: stats, summary: summary, parse: parse, inline: inline, html: html, plain: plain, findAll: findAll, replaceAll: replaceAll,
    TRANSFORMS: TRANSFORMS, title: title, newNote: newNote, snapshot: snapshot, search: search, importBackup: importBackup,
    toBase64Url: toBase64Url, fromBase64Url: fromBase64Url, safeName: safeName, esc: esc
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBNotes = api;
})(typeof self !== 'undefined' ? self : this);
