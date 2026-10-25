/* Online timer, stopwatch and Pomodoro UI (BM + EN). One display, three modes. Time comes from timestamps
   (TBBTimer), so it stays exact in background tabs; the alarm is a WebAudio beep with vibration, and the screen is
   kept awake while running where the browser allows it. Settings live in the URL hash (shareable "5-minute timer"). */
(function () {
  'use strict';
  var T = window.TBBTimer;
  var form = document.getElementById('tmForm');
  if (!T || !form) return;
  var ms = document.documentElement.lang === 'ms', $ = function (id) { return document.getElementById(id); }, f = function (n) { return form.elements[n]; };
  var L = ms ? { start: 'Mula', pause: 'Jeda', resume: 'Sambung', done: 'Masa tamat!', bad: 'Masukkan masa, contohnya 5:00, 90 atau 10 minit.', focus: 'Fokus', short: 'Rehat pendek', long: 'Rehat panjang', block: function (i, n) { return 'Blok ' + i + ' daripada ' + n; }, lap: 'Pusingan', copied: 'Disalin ✓', finished: 'Semua blok Pomodoro selesai. Syabas!', title: 'Pemasa' }
    : { start: 'Start', pause: 'Pause', resume: 'Resume', done: "Time's up!", bad: 'Enter a time such as 5:00, 90 or 10 min.', focus: 'Focus', short: 'Short break', long: 'Long break', block: function (i, n) { return 'Block ' + i + ' of ' + n; }, lap: 'Lap', copied: 'Copied ✓', finished: 'All Pomodoro blocks done. Well done!', title: 'Timer' };
  var title0 = document.title, audio = null, lock = null, raf = 0, alarmTo = 0, ringing = 0;
  var S = { running: false, endAt: 0, left: 0, swStart: 0, swAcc: 0, marks: [], plan: [], idx: 0 };
  var mode = function () { var r = form.querySelector('input[name=mode]:checked'); return r ? r.value : 'timer'; };

  // ---- sound, vibration, wake lock (all optional)
  function beep(freq, at, len) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + (at || 0);
      o.type = 'sine'; o.frequency.value = freq || 880;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + (len || 0.25));
      o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + (len || 0.25) + 0.05);
    } catch (e) { /* no audio */ }
  }
  function alarm(times) {
    stopAlarm();
    if (!f('sound').checked) return;
    var n = 0;
    (function ring() { for (var i = 0; i < 3; i++) beep(880, i * 0.3, 0.22); if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]); if (++n < (times || 6)) ringing = setTimeout(ring, 1500); })();
  }
  function stopAlarm() { clearTimeout(ringing); ringing = 0; }
  function wake(on) {
    try {
      if (on && navigator.wakeLock && !lock) navigator.wakeLock.request('screen').then(function (l) { lock = l; l.addEventListener('release', function () { lock = null; }); }, function () {});
      if (!on && lock) { lock.release(); lock = null; }
    } catch (e) { /* not supported */ }
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && S.running) wake(true); });

  // ---- display
  function show(text, sub) {
    $('tmDisplay').textContent = text;
    if (sub !== undefined) $('tmSub').textContent = sub;
    document.title = S.running ? text + ' · ' + (f('label').value || L.title) : title0;
  }
  function bar(p) { $('tmBar').style.transform = 'scaleX(' + Math.max(0, Math.min(1, p)) + ')'; }
  function swElapsed() { return S.swAcc + (S.running ? performance.now() - S.swStart : 0); }

  function frame() {
    raf = 0;
    var m = mode(), now = Date.now();
    if (m === 'stopwatch') { show(T.format(swElapsed(), true)); }
    else {
      var left = S.running ? T.remaining(S.endAt, now) : S.left, total = m === 'pomodoro' ? S.plan[S.idx].min * 60000 : S.total;
      show(T.countdownText(left)); bar(total ? left / total : 0);
      if (S.running && left <= 0) return ended();
    }
    if (S.running) raf = requestAnimationFrame(frame);
  }
  function loop() { if (!raf) raf = requestAnimationFrame(frame); }

  // ---- countdown (timer and Pomodoro share it)
  function startCountdown(msLeft) {
    S.running = true; S.endAt = Date.now() + msLeft;
    clearTimeout(alarmTo); alarmTo = setTimeout(frame, msLeft + 30); // fires even if animation frames are paused
    wake(true); loop(); buttons();
  }
  function ended() {
    S.running = false; S.left = 0; clearTimeout(alarmTo); show('00:00'); bar(0);
    if (mode() === 'pomodoro' && S.idx < S.plan.length - 1) {
      alarm(2); S.idx++; S.left = S.plan[S.idx].min * 60000; pomoSub(); renderPlan();
      $('tmLive').textContent = $('tmSub').textContent;
      return startCountdown(S.left);
    }
    alarm(6); wake(false);
    var msg = mode() === 'pomodoro' ? L.finished : (f('label').value ? f('label').value + ': ' : '') + L.done;
    $('tmSub').textContent = msg; $('tmLive').textContent = msg; document.title = '⏰ ' + msg;
    buttons();
  }
  function pomoSub() { var p = S.plan[S.idx], n = S.plan.filter(function (x) { return x.kind === 'focus'; }).length, i = S.plan.slice(0, S.idx + 1).filter(function (x) { return x.kind === 'focus'; }).length; $('tmSub').textContent = L[p.kind] + ' · ' + L.block(Math.max(1, i), n); }

  function reset() {
    S.running = false; clearTimeout(alarmTo); stopAlarm(); wake(false); cancelAnimationFrame(raf); raf = 0;
    var m = mode();
    if (m === 'timer') { var d = T.parse(f('dur').value); S.total = isFinite(d) && d > 0 ? Math.min(d, T.FACTS.maxMs) : 300000; S.left = S.total; $('tmDurMsg').textContent = isFinite(d) && d > 0 ? '' : L.bad; show(T.countdownText(S.left), f('label').value); bar(1); }
    else if (m === 'pomodoro') { S.plan = T.pomodoro(f('blocks').value, { focus: +f('focus').value || 25, short: +f('short').value || 5, long: +f('long').value || 20, every: 4 }); S.idx = 0; S.left = S.plan[0].min * 60000; show(T.countdownText(S.left)); pomoSub(); bar(1); renderPlan(); }
    else { S.swAcc = 0; S.marks = []; show(T.format(0, true), ''); renderLaps(); bar(0); }
    document.title = title0; buttons();
  }
  function toggle() {
    stopAlarm();
    var m = mode();
    if (m === 'stopwatch') {
      if (S.running) { S.swAcc = swElapsed(); S.running = false; wake(false); }
      else { S.swStart = performance.now(); S.running = true; wake(true); loop(); }
      return buttons();
    }
    if (S.running) { S.left = T.remaining(S.endAt, Date.now()); S.running = false; clearTimeout(alarmTo); wake(false); frame(); return buttons(); }
    if (S.left <= 0) reset();
    if (audio && audio.state === 'suspended') audio.resume();
    beep(660, 0, 0.05); // unlocks audio on iPhone from this tap
    startCountdown(S.left);
  }
  function buttons() {
    var m = mode(), started = m === 'stopwatch' ? S.swAcc > 0 : S.left < (m === 'timer' ? S.total : (S.plan[S.idx] || { min: 0 }).min * 60000);
    $('tmStart').textContent = S.running ? L.pause : started ? L.resume : L.start;
    $('tmStart').classList.toggle('ghost', S.running);
    $('tmLap').hidden = m !== 'stopwatch'; $('tmLap').disabled = !S.running;
    $('tmPlus').hidden = m !== 'timer';
  }

  // ---- laps
  function lap() { if (mode() !== 'stopwatch' || !S.running) return; S.marks.push(swElapsed()); renderLaps(); }
  function renderLaps() {
    var list = T.laps(S.marks), body = $('tmLaps');
    body.textContent = '';
    list.slice().reverse().forEach(function (l) {
      var tr = body.insertRow(), th = document.createElement('th'); th.scope = 'row'; th.textContent = L.lap + ' ' + l.n; tr.appendChild(th);
      tr.insertCell().textContent = T.format(l.split, true); tr.insertCell().textContent = T.format(l.total, true);
      if (l.best) tr.className = 'tm-best'; else if (l.worst) tr.className = 'tm-worst';
    });
    $('tmLapBox').hidden = !list.length;
  }
  function renderPlan() {
    var ol = $('tmPlan'); ol.textContent = '';
    S.plan.forEach(function (p, i) { var li = document.createElement('li'); li.textContent = L[p.kind] + ' · ' + p.min + ' min'; if (i === S.idx) li.className = 'on'; else if (i < S.idx) li.className = 'past'; ol.appendChild(li); });
    $('tmTotal').textContent = T.planMinutes(S.plan) + ' min';
  }

  // ---- mode panels and hash
  function panels() { var m = mode(); $('tmTimerF').hidden = m !== 'timer'; $('tmPomoF').hidden = m !== 'pomodoro'; $('tmPlanBox').hidden = m !== 'pomodoro'; $('tmLapBox').hidden = m !== 'stopwatch' || !S.marks.length; $('tmBarWrap').hidden = m === 'stopwatch'; }
  function hash() {
    var parts = [], m = mode(), def = form.querySelector('input[name=mode][checked]');
    if (!def || m !== def.value) parts.push('mode=' + m);
    if (m === 'timer') { if (f('dur').value !== f('dur').defaultValue) parts.push('t=' + encodeURIComponent(f('dur').value)); if (f('label').value) parts.push('label=' + encodeURIComponent(f('label').value)); }
    if (m === 'pomodoro') ['blocks', 'focus', 'short', 'long'].forEach(function (n) { if (f(n).value !== f(n).defaultValue) parts.push(n + '=' + f(n).value); });
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
  }
  if (location.hash.length > 1) location.hash.slice(1).split('&').forEach(function (p) {
    var i = p.indexOf('='), k = p.slice(0, i), v = decodeURIComponent(p.slice(i + 1));
    if (k === 'mode') { var r = form.querySelector('input[name=mode][value="' + v + '"]'); if (r) r.checked = true; }
    else if (k === 't') f('dur').value = v; else if (f(k)) f(k).value = v;
  });

  form.addEventListener('submit', function (e) { e.preventDefault(); });
  // Enter in the time box starts the timer (a form with several fields does not submit on Enter).
  f('dur').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); reset(); hash(); toggle(); } });
  form.addEventListener('change', function (e) {
    if (e.target.name === 'sound') return;
    if (e.target.name === 'mode' || !S.running) { reset(); panels(); }
    hash();
  });
  form.addEventListener('input', function (e) { if (e.target.name === 'label' && mode() === 'timer') $('tmSub').textContent = e.target.value; });
  Array.prototype.forEach.call(document.querySelectorAll('[data-min]'), function (b) {
    b.addEventListener('click', function () { var r = form.querySelector('input[name=mode][value=timer]'); r.checked = true; panels(); f('dur').value = b.getAttribute('data-min') + ':00'; reset(); hash(); toggle(); });
  });
  $('tmStart').addEventListener('click', toggle);
  $('tmReset').addEventListener('click', reset);
  $('tmLap').addEventListener('click', lap);
  $('tmPlus').addEventListener('click', function () { if (S.running) { S.endAt += 60000; S.total += 60000; clearTimeout(alarmTo); alarmTo = setTimeout(frame, S.endAt - Date.now() + 30); } else { S.left += 60000; S.total = Math.max(S.total, S.left); frame(); } });
  $('tmFull').addEventListener('click', function () { var el = $('tmStage'); if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen(); });
  $('tmCopy').addEventListener('click', function () { var b = $('tmCopy'), t = b.textContent, ok = function () { b.textContent = L.copied; setTimeout(function () { b.textContent = t; }, 1500); }; if (navigator.clipboard) navigator.clipboard.writeText(T.lapsCsv(T.laps(S.marks))).then(ok, ok); else ok(); });
  // Space start/pause, L lap, R reset, F full screen (not while typing in a field).
  document.addEventListener('keydown', function (e) {
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); toggle(); } else if (k === 'l') lap(); else if (k === 'r') reset(); else if (k === 'f') $('tmFull').click();
  });

  reset(); panels();
})();
