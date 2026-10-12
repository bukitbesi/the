/* Parcel tracking UI (EN + BM). Detects the courier with TBBTracking.detect(), links to the courier's own
   tracking page and copies the number first, so it can be pasted where a site ignores the link. Recent numbers
   stay in this browser only (localStorage); the current number is kept in the URL hash for sharing. */
(function () {
  'use strict';
  var K = window.TBBTracking;
  var form = document.getElementById('trackForm');
  if (!K || !form) return;
  var ms = document.documentElement.lang === 'ms';
  var $ = function (id) { return document.getElementById(id); };
  var input = $('trackNo'), out = $('trackMatches'), msg = $('trackMsg'), live = $('trackLive');
  var STORE = 'tbb-parcels', MAX = 10;
  // Courier pages preset the tracker; detection still runs so a wrong-courier number is flagged.
  var preset = K.byId[form.getAttribute('data-courier')] || null;
  var current = '', yqState = '';
  var T = ms ? {
    invalid: 'Masukkan nombor tracking 8–30 huruf atau digit.',
    found: function (n, c) { return 'Nombor ' + n + ' sepadan dengan format ' + c + '.'; },
    unknown: function (n) { return 'Format ' + n + ' tidak dikenali. Pilih kurier anda di bawah atau guna 17TRACK.'; },
    level: { 3: 'Padanan tepat', 2: 'Kemungkinan besar', 1: 'Mungkin', 0: 'Kurier dipilih' },
    preset: function (n, c) { return 'Semak ' + n + ' di laman rasmi ' + c + '.'; },
    other: function (n, a, b) { return n + ' kelihatan seperti nombor ' + a + ', bukan ' + b + '. Semak di ' + a + ' dahulu.'; },
    statusFail: 'Paparan status tidak dapat dimuatkan. Guna pautan kurier di atas.',
    track: function (c) { return 'Semak di ' + c; },
    any: 'Semak di 17TRACK (semua kurier)',
    copied: 'Nombor disalin. Tampal jika laman kurier memintanya.',
    remove: function (n) { return 'Buang ' + n; },
    again: function (n) { return 'Semak semula ' + n; }
  } : {
    invalid: 'Enter a tracking number of 8–30 letters or digits.',
    found: function (n, c) { return n + ' matches the ' + c + ' format.'; },
    unknown: function (n) { return 'The format of ' + n + ' is not recognised. Choose your courier below or use 17TRACK.'; },
    level: { 3: 'Exact match', 2: 'Likely', 1: 'Possible', 0: 'Selected courier' },
    preset: function (n, c) { return 'Track ' + n + ' on ' + c + "'s official page."; },
    other: function (n, a, b) { return n + ' matches the ' + a + ' format, not ' + b + '. Try ' + a + ' first.'; },
    statusFail: 'The status viewer could not load. Use the courier link above.',
    track: function (c) { return 'Track on ' + c; },
    any: 'Track on 17TRACK (all couriers)',
    copied: 'Number copied. Paste it if the courier page asks.',
    remove: function (n) { return 'Remove ' + n; },
    again: function (n) { return 'Track ' + n + ' again'; }
  };

  function load() { try { var v = JSON.parse(localStorage.getItem(STORE) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function save(list) { try { localStorage.setItem(STORE, JSON.stringify(list.slice(0, MAX))); } catch (e) { /* private mode */ } }

  function link(cls, href, text, n) {
    var a = document.createElement('a');
    a.className = cls; a.href = href; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = text; a.setAttribute('data-copy', n);
    return a;
  }

  function show(raw, remember) {
    var n = K.normalize(raw);
    out.textContent = '';
    if (!K.isValid(n)) {
      msg.textContent = T.invalid; msg.className = 'error'; live.textContent = T.invalid;
      input.setAttribute('aria-invalid', 'true');
      $('statusWrap').hidden = true; current = '';
      return;
    }
    input.removeAttribute('aria-invalid');
    input.value = n;
    var matches = K.detect(n), note = '';
    if (preset) {
      var at = -1;
      matches.forEach(function (m, i) { if (m.id === preset.id) at = i; });
      if (at > 0) matches.unshift(matches.splice(at, 1)[0]);
      else if (at < 0 && matches.length && matches[0].score === 3) { note = T.other(n, matches[0].courier.short, preset.short); matches.push({ id: preset.id, courier: preset, score: 0 }); }
      else if (at < 0) { note = T.preset(n, preset.short); matches.unshift({ id: preset.id, courier: preset, score: 0 }); }
    }
    matches.forEach(function (m) {
      var li = document.createElement('li'), head = document.createElement('p'), tag = document.createElement('span');
      li.className = 'match s' + m.score;
      tag.className = 'lvl'; tag.textContent = T.level[m.score];
      head.appendChild(document.createTextNode(m.courier.name + ' '));
      head.appendChild(tag);
      li.appendChild(head);
      li.appendChild(link('btn sm', K.trackUrl(m.courier, n), T.track(m.courier.short), n));
      out.appendChild(li);
    });
    var any = document.createElement('li');
    any.className = 'match any';
    any.appendChild(link('btn ghost sm', K.trackUrl('any', n), T.any, n));
    out.appendChild(any);
    msg.className = 'note';
    msg.textContent = note || (matches.length ? T.found(n, matches[0].courier.short) : T.unknown(n));
    current = n;
    $('statusWrap').hidden = false;
    if (yqState === 'shown') { $('yqStatus').textContent = ''; yqState = 'ready'; }
    live.textContent = msg.textContent;
    // Courier directory links now open each courier's page for this number.
    document.querySelectorAll('#courierGrid a[data-id]').forEach(function (a) {
      a.href = K.trackUrl(a.getAttribute('data-id'), n);
      a.setAttribute('data-copy', n);
    });
    history.replaceState(null, '', '#n=' + encodeURIComponent(n));
    if (remember) {
      var list = load().filter(function (x) { return x.n !== n; });
      list.unshift({ n: n, c: matches.length ? matches[0].id : '', t: Date.now() });
      save(list);
      renderSaved();
    }
  }

  function renderSaved() {
    var list = load(), ul = $('savedList');
    $('savedBox').hidden = !list.length;
    ul.textContent = '';
    list.forEach(function (x) {
      var li = document.createElement('li'), again = document.createElement('button'), del = document.createElement('button');
      var c = K.byId[x.c];
      again.type = 'button'; again.className = 'saved-n'; again.setAttribute('data-n', x.n);
      again.setAttribute('aria-label', T.again(x.n));
      again.textContent = x.n;
      if (c) { var s = document.createElement('small'); s.textContent = c.short; again.appendChild(s); }
      del.type = 'button'; del.className = 'row-del'; del.setAttribute('data-del', x.n);
      del.setAttribute('aria-label', T.remove(x.n)); del.textContent = '×';
      li.appendChild(again); li.appendChild(del);
      ul.appendChild(li);
    });
  }

  // On one-column layouts the result box sits below the form, so bring it into view.
  var narrow = window.matchMedia ? matchMedia('(max-width: 899px)') : { matches: false };
  // 17TRACK's public widget (17track.net/en/widget) loads only when asked, so the page itself has no third-party code.
  function showStatus() {
    var box = $('yqStatus');
    function fail() { yqState = ''; box.textContent = T.statusFail; }
    function run() {
      try {
        window.YQV5.trackSingle({ YQ_ContainerId: 'yqStatus', YQ_Height: 560, YQ_Fc: '0', YQ_Lang: 'en', YQ_Num: current });
        yqState = 'shown';
      } catch (e) { fail(); }
    }
    if (!current) return;
    if (window.YQV5) { run(); return; }
    if (yqState === 'loading') return;
    yqState = 'loading';
    var s = document.createElement('script');
    s.src = 'https://www.17track.net/externalcall.js'; s.async = true;
    s.onload = function () { if (window.YQV5) run(); else fail(); };
    s.onerror = fail;
    document.head.appendChild(s);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault(); show(input.value, true);
    if (narrow.matches) $('track-result-h').scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  $('trackPaste').hidden = !(navigator.clipboard && navigator.clipboard.readText);
  $('trackPaste').addEventListener('click', function () {
    navigator.clipboard.readText().then(function (t) { input.value = t; show(t, true); }, function () { input.focus(); });
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-copy],[data-n],[data-del],#savedClear,#statusBtn');
    if (!t) return;
    if (t.hasAttribute('data-copy')) {
      if (navigator.clipboard) navigator.clipboard.writeText(t.getAttribute('data-copy')).then(function () { live.textContent = T.copied; $('trackCopied').hidden = false; }, function () {});
    } else if (t.id === 'statusBtn') {
      showStatus();
    } else if (t.hasAttribute('data-n')) {
      input.value = t.getAttribute('data-n'); show(input.value, false); input.scrollIntoView({ block: 'center' });
    } else if (t.hasAttribute('data-del')) {
      save(load().filter(function (x) { return x.n !== t.getAttribute('data-del'); })); renderSaved();
    } else {
      save([]); renderSaved();
    }
  });

  renderSaved();
  function fromHash() {
    var h = /[#&]n=([^&]+)/.exec(location.hash);
    if (h && K.normalize(decodeURIComponent(h[1])) !== input.value) { input.value = decodeURIComponent(h[1]); show(input.value, false); }
  }
  addEventListener('hashchange', fromHash);
  fromHash();
})();
