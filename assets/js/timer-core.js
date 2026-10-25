/* Online timer, stopwatch and Pomodoro (pemasa, jam randik). Time is always worked out from timestamps, never by
   counting ticks, so a timer stays exact when the tab is in the background or the phone sleeps. Pomodoro follows
   Francesco Cirillo's method: 25-minute focus blocks, short breaks (5 to 10 minutes) and a long break of 20 to 30 minutes
   after every 4 blocks; defaults 25/5/20. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-25', pomodoro: { focus: 25, short: 5, long: 20, every: 4 }, maxMs: 100 * 3600000 };
  var PRESETS = [1, 2, 3, 5, 10, 15, 20, 25, 30, 45, 60];

  // "90" (seconds), "1:30", "01:02:03", "5m", "1h30m", "2 min", "45s", "1,5 jam" → milliseconds; NaN if unreadable.
  function parse(s) {
    s = String(s || '').trim().toLowerCase().replace(',', '.');
    if (!s) return NaN;
    if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s) * 1000);
    var m = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
    if (m) return m[3] !== undefined ? ((+m[1] * 60 + +m[2]) * 60 + +m[3]) * 1000 : (+m[1] * 60 + +m[2]) * 1000;
    var total = 0, found = false, re = /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|jam|m|min|mins|minute|minutes|minit|s|sec|secs|second|seconds|saat)(?![a-z])/g, x;
    while ((x = re.exec(s))) { found = true; var u = x[2], n = Number(x[1]); total += /^(h|hr|hrs|hour|hours|jam)$/.test(u) ? n * 3600 : /^(s|sec|secs|second|seconds|saat)$/.test(u) ? n : n * 60; }
    return found && s.replace(re, '').trim() === '' ? Math.round(total * 1000) : NaN;
  }

  // Display: H:MM:SS (hours only when needed); hundredths for the stopwatch.
  function format(ms, hundredths) {
    ms = Math.max(0, Math.floor(ms));
    var cs = Math.floor(ms / 10) % 100, s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60;
    var two = function (v) { return (v < 10 ? '0' : '') + v; };
    return (h ? h + ':' + two(m) : two(m)) + ':' + two(ss) + (hundredths ? '.' + two(cs) : '');
  }
  // A countdown shows whole seconds rounded up, so "00:01" stays on screen until the very end.
  function remaining(endAt, now) { return Math.max(0, endAt - now); }
  function countdownText(ms) { return format(Math.ceil(ms / 1000) * 1000); }

  // Laps: given lap timestamps (elapsed ms at each press) → [{ n, split, total, best, worst }].
  function laps(marks) {
    var out = [], prev = 0;
    marks.forEach(function (t, i) { out.push({ n: i + 1, split: t - prev, total: t }); prev = t; });
    if (out.length > 1) {
      var splits = out.map(function (l) { return l.split; }), mn = Math.min.apply(null, splits), mx = Math.max.apply(null, splits);
      out.forEach(function (l) { l.best = l.split === mn; l.worst = l.split === mx; });
    }
    return out;
  }
  function lapsCsv(list) { return 'Lap,Split,Total\n' + list.map(function (l) { return [l.n, format(l.split, true), format(l.total, true)].join(','); }).join('\n'); }

  // Pomodoro plan for n focus blocks: [{ kind: 'focus'|'short'|'long', min }].
  function pomodoro(n, o) {
    o = o || FACTS.pomodoro; n = Math.max(1, Math.min(16, Number(n) || 4));
    var plan = [];
    for (var i = 1; i <= n; i++) {
      plan.push({ kind: 'focus', min: o.focus });
      if (i < n) plan.push(i % o.every === 0 ? { kind: 'long', min: o.long } : { kind: 'short', min: o.short });
    }
    return plan;
  }
  function planMinutes(plan) { return plan.reduce(function (s, p) { return s + p.min; }, 0); }

  var api = { FACTS: FACTS, PRESETS: PRESETS, parse: parse, format: format, remaining: remaining, countdownText: countdownText, laps: laps, lapsCsv: lapsCsv, pomodoro: pomodoro, planMinutes: planMinutes };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBTimer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
