/* Spin the wheel / lucky draw UI (BM + EN). Draws the wheel on a canvas, spins to the winner chosen by
   TBBWheel.pickIndex (crypto randomness) with an ease-out, and keeps the entry list in the URL hash so a wheel can be
   shared. Lucky-draw mode picks several winners at once without repeats. */
(function () {
  'use strict';
  var W = window.TBBWheel;
  var form = document.getElementById('wheelForm');
  if (!W || !form) return;
  var ms = document.documentElement.lang === 'ms', $ = function (id) { return document.getElementById(id); };
  var canvas = $('wCanvas'), ctx = canvas.getContext('2d'), list = form.elements.entries;
  var T = ms ? { winner: 'Pemenang', winners: 'Pemenang cabutan', spin: 'Putar', spinning: 'Sedang berputar…', drawing: 'Mencabut…', none: 'Masukkan sekurang-kurangnya 2 nama.', copied: 'Disalin ✓', entries: function (n, t) { return n + ' entri' + (t !== n ? ' · ' + t + ' peluang' : ''); } }
    : { winner: 'Winner', winners: 'Lucky draw winners', spin: 'Spin', spinning: 'Spinning…', drawing: 'Drawing…', none: 'Enter at least 2 entries.', copied: 'Copied ✓', entries: function (n, t) { return n + (n === 1 ? ' entry' : ' entries') + (t !== n ? ' · ' + t + ' chances' : ''); } };
  var entries = [], rotation = 0, spinning = false, past = [], audio = null, lastTick = -1;

  function size() {
    var box = canvas.parentElement.getBoundingClientRect(), d = Math.round(box.width), r = window.devicePixelRatio || 1;
    canvas.width = Math.round(d * r); canvas.height = Math.round(d * r);
    ctx.setTransform(r, 0, 0, r, 0, 0);
    return d;
  }
  var D = 0;
  function draw() {
    if (!D) D = size();
    var c = D / 2, R = c - 4, list2 = W.slices(entries);
    ctx.clearRect(0, 0, D, D);
    ctx.save(); ctx.translate(c, c); ctx.rotate(rotation * Math.PI / 180);
    list2.forEach(function (s, i) {
      var a0 = (s.start - 90) * Math.PI / 180, a1 = (s.end - 90) * Math.PI / 180;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0, a1); ctx.closePath();
      ctx.fillStyle = s.color; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.stroke();
      // Labels along the slice's middle, shortened to fit.
      var span = s.end - s.start; if (span < 3) return;
      ctx.save(); ctx.rotate((s.mid - 90) * Math.PI / 180);
      var fs = Math.max(10, Math.min(22, D / 22, span * D / 900));
      ctx.font = '700 ' + fs + 'px system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      var label = entries[i].name, max = R * 0.72;
      while (ctx.measureText(label).width > max && label.length > 2) label = label.slice(0, -2) + '…';
      ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 3; ctx.fillText(label, R - 14, 0);
      ctx.restore();
    });
    ctx.restore();
    ctx.beginPath(); ctx.arc(c, c, D * 0.07, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#222'; ctx.stroke();
    $('wSvg').hidden = true; canvas.hidden = false;
  }

  function read() {
    entries = W.parse(list.value);
    $('wCount').textContent = T.entries(entries.length, W.total(entries));
    draw(); saveHash();
  }
  function saveHash() {
    var text = W.serialize(entries), def = list.defaultValue.trim();
    var parts = [];
    if (text !== def) parts.push('e=' + encodeURIComponent(text).slice(0, 3000));
    ['mode', 'count', 'speed'].forEach(function (n) { var el = form.elements[n]; if (el && el.value !== (el.querySelector && el.querySelector('option[selected]') ? el.querySelector('option[selected]').value : el.defaultValue)) parts.push(n + '=' + encodeURIComponent(el.value)); });
    if (form.elements.remove.checked) parts.push('remove=1');
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
  }
  function loadHash() {
    if (location.hash.length < 2) return;
    location.hash.slice(1).split('&').forEach(function (p) {
      var i = p.indexOf('='), k = p.slice(0, i), v = decodeURIComponent(p.slice(i + 1));
      if (k === 'e') list.value = v; else if (k === 'remove') form.elements.remove.checked = v === '1'; else if (form.elements[k]) form.elements[k].value = v;
    });
  }

  function tick() {
    if (!form.elements.sound.checked) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = 900; g.gain.setValueAtTime(0.08, audio.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.04);
      o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.05);
    } catch (e) { /* audio is optional */ }
  }

  function announce(names) {
    var box = $('wResult'), many = names.length > 1;
    $('wResultTitle').textContent = many ? T.winners : T.winner;
    var ol = $('wWinners'); ol.textContent = '';
    names.forEach(function (n) { var li = document.createElement('li'); li.textContent = n; ol.appendChild(li); });
    box.hidden = false; box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
    $('wLive').textContent = (many ? T.winners : T.winner) + ': ' + names.join(', ');
    past.unshift(names.join(', ')); past = past.slice(0, 20);
    var h = $('wHistory'); h.textContent = '';
    past.forEach(function (x) { var li = document.createElement('li'); li.textContent = x; h.appendChild(li); });
    $('wHistBox').hidden = false;
    if (form.elements.remove.checked) {
      var keep = W.parse(list.value).filter(function (e) { return names.indexOf(e.name) < 0; });
      list.value = W.serialize(keep); read();
    }
  }

  function spin() {
    if (spinning) return;
    if (entries.length < 2) { $('wLive').textContent = T.none; $('wCountMsg').textContent = T.none; return; }
    $('wCountMsg').textContent = '';
    var mode = form.elements.mode.value;
    if (mode === 'draw') {
      var names = W.draw(entries, form.elements.count.value);
      var idx = entries.map(function (e) { return e.name; }).indexOf(names[0]);
      return animate(idx, function () { announce(names); });
    }
    var i = W.pickIndex(entries);
    animate(i, function () { announce([entries[i].name]); });
  }
  function animate(index, done) {
    spinning = true; $('wSpin').disabled = true; $('wSpin').textContent = form.elements.mode.value === 'draw' ? T.drawing : T.spinning; $('wResult').hidden = true;
    var buf = new Uint32Array(1); (window.crypto || {}).getRandomValues ? window.crypto.getRandomValues(buf) : (buf[0] = Date.now());
    var from = rotation, to = W.landing(entries, index, rotation, 5, buf[0] / 4294967296), dur = Number(form.elements.speed.value) || 5000, t0 = performance.now();
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) dur = 600;
    function frame(now) {
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      rotation = from + (to - from) * e; draw();
      var cur = W.at(entries, rotation); if (cur !== lastTick) { lastTick = cur; tick(); }
      if (p < 1) requestAnimationFrame(frame);
      else { rotation = to % 360; spinning = false; $('wSpin').disabled = false; $('wSpin').textContent = T.spin; done(); }
    }
    requestAnimationFrame(frame);
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); spin(); });
  canvas.addEventListener('click', spin);
  list.addEventListener('input', read);
  form.addEventListener('change', function (e) { if (e.target.name === 'mode') $('wCountF').hidden = e.target.value !== 'draw'; if (e.target !== list) saveHash(); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-preset]'), function (b) {
    b.addEventListener('click', function () { list.value = (W.PRESETS[b.getAttribute('data-preset')] || {})[ms ? 'ms' : 'en'].join('\n'); read(); });
  });
  $('wShuffle').addEventListener('click', function () { list.value = W.serialize(W.shuffle(W.parse(list.value))); read(); });
  $('wSort').addEventListener('click', function () { list.value = W.serialize(W.parse(list.value).sort(function (a, b) { return a.name.localeCompare(b.name); })); read(); });
  $('wShare').addEventListener('click', function () {
    var url = location.href, b = $('wShare'), label = b.textContent;
    var ok = function () { b.textContent = T.copied; setTimeout(function () { b.textContent = label; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(ok, ok); else ok();
  });
  $('wFull').addEventListener('click', function () { var el = $('wStage'); if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen(); });
  document.addEventListener('fullscreenchange', function () { D = 0; draw(); });
  window.addEventListener('resize', function () { D = 0; draw(); });

  loadHash();
  $('wCountF').hidden = form.elements.mode.value !== 'draw';
  read();
})();
