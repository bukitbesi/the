/* Working days calculator UI (BM + EN). Inputs map to TBBWorkdays.count(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBWorkdays;
  var form = document.getElementById('wdForm');
  if (!X || !form) return;
  var ms = document.documentElement.lang === 'ms';
  var fmt2 = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR' });
  var fmt0 = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 });
  var money = function (n) { return fmt2.format(n); };
  var rm0 = function (n) { return fmt0.format(n); };
  var nf = function (n, d) { return new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { maximumFractionDigits: d === undefined ? 2 : d }).format(n); };
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  function hashState(form, defaults) {
    var parts = [];
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || (el.type === 'radio' && !el.checked)) return;
      var def = el.tagName === 'SELECT' ? (el.querySelector('option[selected]') || el.options[0] || {}).value : el.defaultValue;
      if (defaults && el.name in defaults) def = defaults[el.name];
      if (el.value !== def) parts.push(el.name + '=' + encodeURIComponent(el.value));
    });
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
  }
  function fromHash(form, before) {
    if (location.hash.length < 2) return false;
    var kv = {};
    location.hash.slice(1).split('&').forEach(function (p) { var i = p.indexOf('='); if (i > 0) kv[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1)); });
    if (before) before(kv);
    Object.keys(kv).forEach(function (k) { var el = form.elements[k]; if (el && el.name) el.value = kv[k]; });
    return true;
  }
  function changed(form) {
    return Array.prototype.some.call(form.elements, function (el) {
      if (!el.name) return false;
      return el.tagName === 'SELECT' ? el.selectedIndex >= 0 && !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
    });
  }
  function rows(body, list) {
    body.textContent = '';
    list.forEach(function (x) {
      var tr = body.insertRow(), th = document.createElement('th');
      if (x[2]) tr.className = x[2];
      th.scope = 'row'; th.textContent = x[0]; tr.appendChild(th);
      tr.insertCell().textContent = x[1];
    });
  }
  function wire(form, render, printId) {
    var frame = 0;
    var schedule = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
    form.addEventListener('input', schedule);
    form.addEventListener('change', schedule);
    form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
    document.getElementById(printId).addEventListener('click', function () { window.print(); });
  }
  var lang = ms ? 'ms' : 'en', loc = ms ? 'ms-MY' : 'en-GB';
  var dl = function (iso) { return new Date(iso + 'T00:00:00Z').toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };
  var ds = function (iso) { return new Date(iso + 'T00:00:00Z').toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); };
  var mn = function (m) { return new Date(Date.UTC(2026, m, 1)).toLocaleDateString(loc, { month: 'long', timeZone: 'UTC' }); };
  var T = ms ? {
    days: 'Jumlah hari', weekend: 'Hujung minggu', hol: 'Cuti umum (hari bekerja)', holWe: 'Cuti umum pada hujung minggu', work: 'Hari bekerja', leave: 'Cuti tahunan diambil', after: 'Hari bekerja selepas cuti',
    start: 'Tarikh mula', plus: 'Tambah hari bekerja', end: 'Tarikh akhir', skipped: 'Hujung minggu dan cuti dilangkau', onWe: 'hujung minggu', none: 'Tiada cuti umum dalam tempoh ini.',
    out: 'Di luar data 2026–2027: cuti umum tidak dikira.',
    holH: function (s, y) { return 'Cuti umum ' + s + ' ' + y; }, monH: function (s, y) { return 'Hari bekerja sebulan, ' + s + ' ' + y; },
    sub: function (r) { return 'daripada ' + nf(r.days, 0) + ' hari: ' + nf(r.weekend, 0) + ' hujung minggu, ' + nf(r.holidays, 0) + ' cuti umum'; },
    live: function (r) { return r.workdays + ' hari bekerja.'; }
  } : {
    days: 'Calendar days', weekend: 'Weekend days', hol: 'Public holidays on workdays', holWe: 'Public holidays on a weekend', work: 'Working days', leave: 'Annual leave taken', after: 'Working days after leave',
    start: 'Start date', plus: 'Working days added', end: 'End date', skipped: 'Weekend and holiday days skipped', onWe: 'weekend', none: 'No public holidays in this period.',
    out: 'Outside the 2026–2027 data: public holidays not counted.',
    holH: function (s, y) { return 'Public holidays in ' + s + ' ' + y; }, monH: function (s, y) { return 'Working days a month, ' + s + ' ' + y; },
    sub: function (r) { return 'of ' + nf(r.days, 0) + ' days: ' + nf(r.weekend, 0) + ' weekend, ' + nf(r.holidays, 0) + ' public holidays'; },
    live: function (r) { return r.workdays + ' working days.'; }
  };

  function render(writeHash) {
    var state = f('state').value, r = X.count({ state: state, from: f('from').value, to: f('to').value, leave: f('leave').value });
    if (!r) return;
    var sn = X.name(state, lang);
    $('wDays').textContent = nf(r.afterLeave, 0);
    $('wSub').textContent = T.sub(r);
    var list = [[T.days, nf(r.days, 0)], [T.weekend, '− ' + nf(r.weekend, 0)], [T.hol, '− ' + nf(r.holidays, 0)]];
    if (r.holidaysOnWeekend) list.push([T.holWe, nf(r.holidaysOnWeekend, 0)]);
    list.push([T.work, nf(r.workdays, 0), 'total']);
    if (r.leave) list.push([T.leave, '− ' + nf(r.leave, 0)], [T.after, nf(r.afterLeave, 0), 'total']);
    rows($('wLines'), list);
    var d = X.addWorkdays(state, f('start').value, f('add').value);
    if (d) rows($('wDeadline'), [[T.start, dl(f('start').value)], [T.plus, nf(Number(f('add').value) || 0, 0)], [T.skipped, nf(d.skipped, 0)], [T.end, dl(d.date), 'total']]);
    $('wOut').hidden = r.covered && (!d || d.covered);
    var y = Number(r.from.slice(0, 4));
    if (y < 2026 || y > 2027) y = 2027;
    $('wHolH').textContent = T.holH(sn, y);
    var hb = $('wHol'), hl = X.holidays(state, y), we = X.weekendDays(state);
    hb.textContent = '';
    hl.forEach(function (h) {
      var tr = hb.insertRow(), th = document.createElement('th'), w = we.indexOf(new Date(h.date + 'T00:00:00Z').getUTCDay()) >= 0;
      th.scope = 'row'; th.textContent = ds(h.date); tr.appendChild(th);
      tr.insertCell().textContent = (ms ? h.ms : h.en) + (w ? ' (' + T.onWe + ')' : '');
    });
    $('wMonH').textContent = T.monH(sn, y);
    var mb = $('wMonths');
    mb.textContent = '';
    X.months(state, y).forEach(function (m, i) {
      var tr = mb.insertRow(), th = document.createElement('th');
      th.scope = 'row'; th.textContent = mn(i); tr.appendChild(th);
      tr.insertCell().textContent = m.days; tr.insertCell().textContent = m.weekend; tr.insertCell().textContent = m.holidays; tr.insertCell().textContent = m.workdays;
    });
    $('wLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'wdPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
