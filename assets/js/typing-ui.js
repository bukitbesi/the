/* Typing test UI (BM + EN). The visitor types into a real textarea (works with phone keyboards); the passage above is
   highlighted letter by letter. The clock starts on the first key and the result uses TBBTyping.score. Settings live in
   the URL hash; personal bests stay in this browser only. */
(function () {
  'use strict';
  var T = window.TBBTyping;
  var form = document.getElementById('tyForm');
  if (!T || !form) return;
  var ms = document.documentElement.lang === 'ms', $ = function (id) { return document.getElementById(id); }, f = function (n) { return form.elements[n]; };
  var nf = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { maximumFractionDigits: 0 });
  var L = ms ? {
    bands: { beginner: 'Permulaan', learning: 'Sedang belajar', average: 'Purata', fast: 'Pantas', 'very fast': 'Sangat pantas', expert: 'Pakar' },
    sub: function (r) { return 'Ketepatan ' + Math.round(r.accuracy * 100) + '% · kasar ' + nf.format(r.gross) + ' WPM · ' + nf.format(r.cpm) + ' aksara seminit'; },
    rows: ['WPM bersih', 'WPM kasar', 'Ketepatan', 'Aksara betul seminit', 'Ralat tidak dibetulkan', 'Masa'],
    best: function (b) { return 'Rekod peribadi anda (peranti ini): ' + b + ' WPM'; }, newBest: 'Rekod peribadi baharu!', live: function (r, b) { return 'Keputusan: ' + nf.format(r.net) + ' perkataan seminit, ketepatan ' + Math.round(r.accuracy * 100) + '%, ' + b; },
    weak: 'Kekunci paling kerap tersilap: ', none: 'Tiada kesilapan. Hebat!', space: 'jarak', s: ' saat', ready: 'Mula menaip untuk memulakan jam.', pasted: 'Teks ditampal dikesan: keputusan ini tidak disimpan sebagai rekod.'
  } : {
    bands: { beginner: 'Beginner', learning: 'Learning', average: 'Average', fast: 'Fast', 'very fast': 'Very fast', expert: 'Expert' },
    sub: function (r) { return 'Accuracy ' + Math.round(r.accuracy * 100) + '% · raw ' + nf.format(r.gross) + ' WPM · ' + nf.format(r.cpm) + ' characters a minute'; },
    rows: ['Net WPM', 'Gross WPM', 'Accuracy', 'Correct characters per minute', 'Uncorrected errors', 'Time'],
    best: function (b) { return 'Your personal best (this device): ' + b + ' WPM'; }, newBest: 'New personal best!', live: function (r, b) { return 'Result: ' + nf.format(r.net) + ' words per minute, ' + Math.round(r.accuracy * 100) + '% accuracy, ' + b; },
    weak: 'Keys you missed most: ', none: 'No mistakes. Brilliant!', space: 'space', s: ' s', ready: 'Start typing to start the clock.', pasted: 'Pasted text detected: this result is not saved as a best.'
  };
  var box = $('tyText'), input = $('tyInput');
  var target = '', seed = 1, spans = [], rest = null, pasted = false, prev = '', t0 = 0, timer = 0, done = false, keys = 0, wrong = 0, misses = {}, series = [];

  var radio = function (n) { var r = form.querySelector('input[name=' + n + ']:checked'); return r ? r.value : ''; };
  var secs = function () { return Number(radio('secs')) || 60; };
  function newSeed() { var a = new Uint32Array(1); (window.crypto || {}).getRandomValues ? window.crypto.getRandomValues(a) : (a[0] = Date.now()); return a[0] || 1; }

  function setup(keepSeed) {
    clearInterval(timer); timer = 0; t0 = 0; done = false; keys = 0; wrong = 0; misses = {}; series = []; prev = '';
    if (!keepSeed) seed = newSeed();
    target = T.generate({ lang: f('lang').value, mode: f('mode').value, secs: secs(), seed: seed });
    box.textContent = ''; spans = []; pasted = false;
    rest = document.createTextNode(target); box.appendChild(rest);
    ensure(0); box.scrollTop = 0;
    if (spans[0]) spans[0].className = 'cur';
    input.value = ''; input.disabled = false; input.lang = f('lang').value === 'ms' ? 'ms' : 'en';
    $('tyClock').textContent = secs(); $('tyLiveWpm').textContent = '0'; $('tyLiveAcc').textContent = '100%';
    $('tyStatus').textContent = L.ready;
  }

  // Letters become spans in chunks just ahead of the caret; the rest stays one text node (keeps the page light).
  function ensure(upto) {
    if (spans.length >= target.length || upto + 120 < spans.length) return;
    var end = Math.min(target.length, upto + 300), frag = document.createDocumentFragment();
    for (var i = spans.length; i < end; i++) { var sp = document.createElement('span'); sp.textContent = target[i]; frag.appendChild(sp); spans.push(sp); }
    rest.textContent = target.slice(end);
    box.insertBefore(frag, rest);
  }

  function paint(from, to) {
    var v = input.value;
    ensure(v.length);
    for (var i = Math.max(0, from); i <= Math.min(to, spans.length - 1); i++) {
      spans[i].className = i < v.length ? (v[i] === target[i] ? 'ok' : (target[i] === ' ' ? 'bad sp' : 'bad')) : (i === v.length ? 'cur' : '');
    }
    var cur = spans[Math.min(v.length, spans.length - 1)];
    // Keep the current line in view inside the passage box.
    if (cur && (cur.offsetTop - box.scrollTop > box.clientHeight - 40 || cur.offsetTop < box.scrollTop)) box.scrollTop = cur.offsetTop - 8;
  }

  function elapsed() { return t0 ? Math.min(secs() * 1000, performance.now() - t0) : 0; }
  function tick() {
    var e = elapsed(), left = Math.max(0, Math.ceil((secs() * 1000 - e) / 1000));
    $('tyClock').textContent = left;
    var r = T.score({ target: target, typed: input.value, ms: Math.max(e, 1000), keystrokes: keys, mistakes: wrong });
    $('tyLiveWpm').textContent = nf.format(r.net); $('tyLiveAcc').textContent = Math.round(r.accuracy * 100) + '%';
    var sec = Math.floor(e / 1000);
    if (sec > series.length - 1 && sec >= 1) series.push(Math.round(r.net));
    if (e >= secs() * 1000) finish();
  }

  input.addEventListener('input', function () {
    if (done) return;
    var v = input.value;
    if (!t0 && v.length) { t0 = performance.now(); timer = setInterval(tick, 200); $('tyStatus').textContent = ''; }
    if (v.length > target.length) { v = input.value = v.slice(0, target.length); }
    // Count the new characters (phone keyboards can insert several at once).
    if (v.length > prev.length && v.slice(0, prev.length) === prev) {
      for (var i = prev.length; i < v.length; i++) { keys++; if (v[i] !== target[i]) { wrong++; misses[target[i]] = (misses[target[i]] || 0) + 1; } }
    } else if (v.length >= prev.length) { keys += Math.max(1, v.length - prev.length); }
    paint(Math.min(v.length, prev.length) - 1, Math.max(v.length, prev.length) + 1);
    prev = v;
    if (v.length >= target.length) finish();
  });
  // Pasting is allowed (blocking it hurts accessibility) but the result is marked and not kept as a best.
  input.addEventListener('paste', function () { pasted = true; });

  function store(k, v) { try { if (v === undefined) return window.localStorage.getItem(k); window.localStorage.setItem(k, v); } catch (e) { return null; } }
  function finish() {
    if (done) return;
    done = true; clearInterval(timer); input.disabled = true;
    var e = elapsed() || 1000, r = T.score({ target: target, typed: input.value, ms: e, keystrokes: keys, mistakes: wrong }), b = T.band(r.net);
    $('tyNet').textContent = nf.format(r.net);
    $('tySub').textContent = L.sub(r);
    $('tyBand').textContent = L.bands[b];
    var vals = [nf.format(r.net), nf.format(r.gross), Math.round(r.accuracy * 100) + '%', nf.format(r.cpm), String(r.errors), (Math.round(r.seconds * 10) / 10) + L.s];
    Array.prototype.forEach.call($('tyRows').rows, function (row, i) { row.cells[row.cells.length - 1].textContent = vals[i]; });
    var weak = T.weakKeys(misses, 6);
    $('tyWeak').textContent = weak.length ? L.weak + weak.map(function (w) { return (w[0] === ' ' ? L.space : w[0]) + ' (' + w[1] + ')'; }).join(', ') : L.none;
    chart();
    var key = 'tbb-typing-' + [f('lang').value, f('mode').value, secs()].join('-'), best = Number(store(key)) || 0, net = Math.round(r.net);
    if (pasted) $('tyBest').textContent = L.pasted;
    else if (net > best && r.accuracy >= 0.9) { store(key, String(net)); $('tyBest').textContent = L.newBest + ' ' + L.best(net); }
    else $('tyBest').textContent = best ? L.best(best) : '';
    $('tyLive').textContent = L.live(r, L.bands[b]);
    $('tyClock').textContent = '0';
    $('tyResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // WPM per second as a small inline SVG line.
  function chart() {
    var svg = $('tyChart'), pts = series.length ? series : [0], max = Math.max.apply(null, pts.concat([10])), w = 300, h = 80;
    var d = pts.map(function (v, i) { return (i ? 'L' : 'M') + (pts.length > 1 ? i / (pts.length - 1) * w : 0).toFixed(1) + ' ' + (h - v / max * (h - 6) - 3).toFixed(1); }).join('');
    svg.querySelector('path').setAttribute('d', d);
    svg.querySelector('text').textContent = 'max ' + max;
  }

  function hash() {
    var parts = [];
    ['lang', 'mode'].forEach(function (n) { var el = f(n), def = (el.querySelector('option[selected]') || el.options[0]).value; if (el.value !== def) parts.push(n + '=' + el.value); });
    if (secs() !== 60) parts.push('secs=' + secs());
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
  }
  if (location.hash.length > 1) location.hash.slice(1).split('&').forEach(function (p) {
    var kv = p.split('='), el;
    if (kv[0] === 'secs') { el = form.querySelector('input[name=secs][value="' + kv[1] + '"]'); if (el) el.checked = true; }
    else if ((el = f(kv[0])) && el.querySelector('option[value="' + kv[1] + '"]')) el.value = kv[1];
  });

  form.addEventListener('change', function () { hash(); setup(false); input.focus({ preventScroll: true }); });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  $('tyRestart').addEventListener('click', function () { setup(false); input.focus(); });
  $('tyRetry').addEventListener('click', function () { setup(true); input.focus(); });
  $('tyPrint').addEventListener('click', function () { window.print(); });
  box.addEventListener('click', function () { input.focus(); });
  // Esc restarts with a new text, like most typing tests.
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setup(false); input.focus(); } });

  // Keep the build-time passage when the settings are the defaults, so the page does not shift on load.
  var def = !location.hash;
  if (def) { seed = 1; setup(true); } else setup(false);
})();
