/* Word Counter core shared by the page, the build and the tests: counts, reading and speaking time, Flesch
   readability, keyword density for 1-3 word phrases with English and Malay stop words, a focus-keyword check,
   platform character limits and text extraction from .docx. Word rules match the Online Notepad. */
(function (root) {
  'use strict';

  // Reading: 238 wpm silent non-fiction (Brysbaert 2019). Speaking: about 150 wpm, the conversational rate the
  // National Center for Voice and Speech gives for US English.
  var FACTS = { verified: '2026-10-17', readWpm: 238, speakWpm: 150 };

  // Character limits confirmed by more than one source; TikTok is left out because sources disagree.
  var LIMITS = [
    { key: 'sms', label: 'SMS (one message)', max: 160, note: '70 if the text has emoji or non-Latin letters' },
    { key: 'x', label: 'X post (free account)', max: 280 },
    { key: 'ytTitle', label: 'YouTube title', max: 100 },
    { key: 'insta', label: 'Instagram caption', max: 2200 },
    { key: 'linkedin', label: 'LinkedIn post', max: 3000 },
    { key: 'ytDesc', label: 'YouTube description', max: 5000 }
  ];

  var WORD = /[\p{L}\p{N}]+(?:['’\-.][\p{L}\p{N}]+)*/gu;
  var STOP = {
    en: 'a about above after again against all am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves also get got one two new like may us',
    ms: 'ada adalah agar akan aku anda antara apa apabila atas atau bagi bagaimana bahawa bahwa banyak baru begitu belum boleh buat bukan dalam dan dari daripada dengan di dia ia ialah ini itu jadi jika juga kali kami kamu kan kalau ke kepada kerana karena kita lagi lain lebih maka mana masih mereka mungkin namun oleh pada para pula saja sahaja sama sangat satu saya se sebagai sebelum sedang sejak selepas semua sendiri seperti serta setelah sini situ supaya tetapi tidak telah tentang untuk yang ya hanya sudah akan lalu nak tak'
  };
  var STOPS = { en: set(STOP.en), ms: set(STOP.ms) };
  function set(s) { var o = {}; s.split(' ').forEach(function (w) { o[w] = 1; }); return o; }

  function words(text) { return String(text || '').match(WORD) || []; }
  function sentences(text) {
    var t = String(text || ''), m = t.match(/[^.!?。\n]*[\p{L}\p{N}][^.!?。\n]*(?:[.!?。]+(?=\s|$)|\n|$)/gu) || [];
    return m.map(function (s) { return s.trim(); }).filter(function (s) { return WORD.test(s) && !(WORD.lastIndex = 0); });
  }
  // English syllable estimate: vowel groups, minus a silent final e, at least one per word.
  function syllables(w) {
    w = w.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return 0;
    if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
    var g = w.match(/[aeiouy]+/g);
    return Math.max(1, g ? g.length : 1);
  }
  function readingLabel(fre) {
    return fre >= 90 ? 'Very easy' : fre >= 80 ? 'Easy' : fre >= 70 ? 'Fairly easy' : fre >= 60 ? 'Plain English' : fre >= 50 ? 'Fairly difficult' : fre >= 30 ? 'Difficult' : 'Very difficult';
  }
  function minutes(n) { return !n ? '0 min' : n < 1 ? Math.max(1, Math.round(n * 60)) + ' sec' : n < 10 ? (Math.round(n * 10) / 10) + ' min' : Math.round(n) + ' min'; }

  function analyze(text) {
    text = String(text || '');
    var w = words(text), s = sentences(text), chars = Array.from(text).length;
    var syl = 0, letters = 0, longest = '';
    w.forEach(function (x) { syl += syllables(x); letters += Array.from(x).length; });
    s.forEach(function (x) { if (words(x).length > words(longest).length) longest = x; });
    var lower = {}, unique = 0;
    w.forEach(function (x) { var k = x.toLowerCase(); if (!lower[k]) { lower[k] = 1; unique++; } });
    var wps = s.length ? w.length / s.length : 0, spw = w.length ? syl / w.length : 0;
    var fre = w.length ? Math.round((206.835 - 1.015 * wps - 84.6 * spw) * 10) / 10 : 0;
    var fkgl = w.length ? Math.round((0.39 * wps + 11.8 * spw - 15.59) * 10) / 10 : 0;
    return {
      words: w.length, chars: chars, noSpaces: Array.from(text.replace(/\s/g, '')).length, sentences: s.length,
      paragraphs: text.split(/\n\s*\n/).filter(function (p) { return /\S/.test(p); }).length, lines: text ? text.split(/\r\n|\r|\n/).length : 0,
      unique: unique, avgWord: w.length ? Math.round(letters / w.length * 10) / 10 : 0, avgSentence: Math.round(wps * 10) / 10,
      longest: words(longest).length, syllables: syl, fre: fre, fkgl: Math.max(0, fkgl), level: w.length ? readingLabel(fre) : '',
      reading: minutes(w.length / FACTS.readWpm), speaking: minutes(w.length / FACTS.speakWpm),
      unicode: /[^\x00-\x7f£¥èéùìòÇØøÅåÄÖÑÜßäöñüà€\n\r ]/.test(text)
    };
  }

  // Most frequent 1, 2 or 3 word phrases. Phrases that start or end with a stop word are skipped when stop is on.
  function density(text, n, opts) {
    opts = opts || {};
    var w = words(text).map(function (x) { return x.toLowerCase(); }), total = w.length, counts = {}, stop = {};
    (opts.stop === false ? [] : opts.langs || ['en', 'ms']).forEach(function (l) { Object.keys(STOPS[l]).forEach(function (k) { stop[k] = 1; }); });
    for (var i = 0; i + n <= w.length; i++) {
      var g = w.slice(i, i + n);
      if (stop[g[0]] || stop[g[n - 1]] || (n === 1 && /^\d+$/.test(g[0]))) continue;
      var k = g.join(' ');
      counts[k] = (counts[k] || 0) + 1;
    }
    return Object.keys(counts).filter(function (k) { return n === 1 || counts[k] > 1; }).map(function (k) {
      return { term: k, count: counts[k], pct: total ? Math.round(counts[k] * n / total * 1000) / 10 : 0 };
    }).sort(function (a, b) { return b.count - a.count || a.term.localeCompare(b.term); }).slice(0, opts.limit || 20);
  }

  // Focus keyword: whole-word, case-insensitive matches, density, and whether it appears early.
  function keyword(text, phrase) {
    var k = words(phrase).map(function (x) { return x.toLowerCase(); }), w = words(text).map(function (x) { return x.toLowerCase(); });
    if (!k.length) return null;
    var hits = [];
    for (var i = 0; i + k.length <= w.length; i++) if (k.every(function (x, j) { return w[i + j] === x; })) hits.push(i);
    var first = (String(text).split(/\n\s*\n/).filter(function (p) { return /\S/.test(p); })[0] || '');
    return {
      count: hits.length, pct: w.length ? Math.round(hits.length * k.length / w.length * 1000) / 10 : 0,
      firstWord: hits.length ? hits[0] + 1 : 0, inFirstParagraph: !!keywordIn(first, k), inFirst100: hits.length > 0 && hits[0] < 100
    };
  }
  function keywordIn(t, k) { var w = words(t).map(function (x) { return x.toLowerCase(); }); for (var i = 0; i + k.length <= w.length; i++) if (k.every(function (x, j) { return w[i + j] === x; })) return true; return false; }

  function limits(text, a) {
    a = a || analyze(text);
    return LIMITS.map(function (l) {
      var max = l.key === 'sms' && a.unicode ? 70 : l.max;
      return { key: l.key, label: l.label, max: max, used: a.chars, left: max - a.chars, ok: a.chars <= max, note: l.note || '' };
    });
  }

  // Plain text of a .docx (paragraphs from word/document.xml). unzip: zip-core.js unzip; inflate: bytes -> bytes.
  function docxText(entries) {
    var doc = entries.filter(function (e) { return e.name === 'word/document.xml'; })[0];
    if (!doc || !doc.bytes) throw new Error('notDocx');
    var xml = new TextDecoder().decode(doc.bytes);
    return xml.split(/<\/w:p>/).map(function (p) {
      return p.replace(/<w:tab\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n').replace(/<(?!w:t[ >])[^>]+>/g, '').replace(/<w:t[^>]*>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
    }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }


  // ---------------------------------------------------------------- HTML views shared by the build and the page
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var f = function (n) { return n.toLocaleString('en-US'); };
  function statsHtml(a) {
    var cells = [['Words', f(a.words)], ['Characters', f(a.chars)], ['Without spaces', f(a.noSpaces)], ['Sentences', f(a.sentences)], ['Paragraphs', f(a.paragraphs)],
      ['Unique words', f(a.unique)], ['Reading time', a.reading], ['Speaking time', a.speaking], ['Avg word length', a.avgWord + ' letters'], ['Avg sentence', a.avgSentence + ' words'], ['Longest sentence', a.longest + ' words'], ['Lines', f(a.lines)]];
    return cells.map(function (c, i) { return '<div class="wc-stat' + (i < 2 ? ' big' : '') + '"><b>' + c[1] + '</b><span>' + c[0] + '</span></div>'; }).join('');
  }
  function readHtml(a) {
    if (!a.words) return '<p class="help">Type or paste text to see its readability.</p>';
    var pct = Math.max(0, Math.min(100, a.fre));
    return '<div class="meter wc-meter" role="img" aria-label="Flesch reading ease ' + a.fre + ' out of 100"><i style="width:' + pct + '%"></i></div>' +
      '<p><strong>' + a.fre + '</strong> Flesch reading ease: <strong>' + esc(a.level) + '</strong> · US grade level <strong>' + a.fkgl + '</strong></p>';
  }
  function densityRows(list) {
    return list.length ? list.map(function (d) { return '<tr><th scope="row">' + esc(d.term) + '</th><td>' + d.count + '</td><td>' + d.pct + '%</td></tr>'; }).join('') : '<tr><td colspan="3">No repeated phrases yet.</td></tr>';
  }
  function keywordHtml(k, phrase) {
    if (!k) return '<p class="help">Type a keyword to check how often it appears.</p>';
    var tips = [];
    if (!k.count) tips.push('It does not appear yet.');
    else {
      tips.push(k.inFirst100 ? 'It appears in the first 100 words.' : 'It first appears at word ' + k.firstWord + '; try to use it earlier.');
      if (k.pct > 3) tips.push('Over 3% can read as keyword stuffing; use synonyms.');
    }
    return '<p><strong>' + esc(phrase) + '</strong>: ' + k.count + (k.count === 1 ? ' time' : ' times') + ' · ' + k.pct + '% of words</p><p class="help">' + tips.join(' ') + '</p>';
  }
  function limitRows(rows) {
    return rows.map(function (l) {
      return '<tr><th scope="row">' + esc(l.label) + (l.note ? '<small>' + esc(l.note) + '</small>' : '') + '</th><td>' + f(l.max) + '</td><td class="' + (l.ok ? 'rb-yes' : 'rb-no') + '">' + (l.ok ? f(l.left) + ' left' : f(-l.left) + ' over') + '</td></tr>';
    }).join('');
  }

  var api = { views: { statsHtml: statsHtml, readHtml: readHtml, densityRows: densityRows, keywordHtml: keywordHtml, limitRows: limitRows, esc: esc }, FACTS: FACTS, LIMITS: LIMITS, STOP: STOP, words: words, sentences: sentences, syllables: syllables, readingLabel: readingLabel, analyze: analyze, density: density, keyword: keyword, limits: limits, docxText: docxText, minutes: minutes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBWords = api;
})(typeof self !== 'undefined' ? self : this);
