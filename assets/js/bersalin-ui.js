/* Due date and maternity leave UI (BM + EN). Inputs map to TBBBersalin.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBBersalin;
  var form = document.getElementById('bersalinForm');
  if (!X || !form) return;
  var ms = document.documentElement.lang === 'ms';
  var fmt2 = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR' });
  var money = function (n) { return fmt2.format(n); };
  var nf = function (n, d) { return new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { maximumFractionDigits: d === undefined ? 2 : d }).format(n); };
  var day = function (iso) { return new Date(iso + 'T00:00:00Z').toLocaleDateString(ms ? 'ms-MY' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };
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
  var now = new Date(), today = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
  var fd = function (iso) { var d = new Date(iso + 'T00:00:00Z'), o = { timeZone: 'UTC' }, l = ms ? 'ms-MY' : 'en-GB'; return d.toLocaleDateString(l, { weekday: 'short', timeZone: 'UTC' }) + ', ' + d.toLocaleDateString(l, { day: 'numeric', month: 'long', year: 'numeric', timeZone: o.timeZone }); };
  var T = ms ? {
    sub: function (r) { return r.ga ? 'Kini ' + r.ga.weeks + ' minggu ' + r.ga.days + ' hari · trimester ' + r.trimester : 'Masukkan hari pertama haid terakhir dalam 44 minggu lepas'; },
    d: { t2: 'Mula trimester kedua (14 minggu)', t3: 'Mula trimester ketiga (28 minggu)', early: 'Cukup bulan awal (37 minggu)', full: 'Cukup bulan penuh (39 minggu)', edd: 'Jangkaan bersalin (40 minggu)', late: 'Lewat (41 minggu)', post: 'Lepas tempoh (42 minggu)' },
    conc: 'Anggaran persenyawaan', start: 'Cuti bersalin bermula', end: function (n) { return 'Hari terakhir cuti (' + n + ' hari)'; }, back: 'Kembali bekerja', earliest: 'Paling awal boleh mula (30 hari sebelum)',
    pat: 'Cuti paterniti suami (7 hari)', allow: 'Elaun bersalin (98 hari × kadar sehari)', live: function (r) { return 'Jangkaan bersalin ' + fd(r.edd) + '.'; }
  } : {
    sub: function (r) { return r.ga ? 'Now ' + r.ga.weeks + (r.ga.weeks === 1 ? ' week ' : ' weeks ') + r.ga.days + (r.ga.days === 1 ? ' day' : ' days') + ' · trimester ' + r.trimester : 'Enter the first day of a last period within the past 44 weeks'; },
    d: { t2: 'Second trimester starts (14 weeks)', t3: 'Third trimester starts (28 weeks)', early: 'Early term (37 weeks)', full: 'Full term (39 weeks)', edd: 'Due date (40 weeks)', late: 'Late term (41 weeks)', post: 'Post-term (42 weeks)' },
    conc: 'Estimated conception', start: 'Maternity leave starts', end: function (n) { return 'Last day of leave (' + n + ' days)'; }, back: 'Back to work', earliest: 'Earliest start (30 days before)',
    pat: "Husband's paternity leave (7 days)", allow: 'Maternity allowance (98 days × daily rate)', live: function (r) { return 'Due date ' + fd(r.edd) + '.'; }
  };

  function render(writeHash) {
    var sector = f('sector').value;
    $('fCivil').hidden = sector !== 'civil'; $('fRate').hidden = sector === 'civil';
    var r = X.calculate({ lmp: f('lmp').value, cycle: f('cycle').value, today: today, sector: sector, before: f('before').value, civilDays: f('civilDays').value, rate: f('rate').value });
    if (!r) { $('bEdd').textContent = '–'; return; }
    $('bEdd').textContent = fd(r.edd);
    $('bSub').textContent = T.sub(r);
    rows($('bDates'), [[T.conc, fd(r.conception)]].concat(r.dates.map(function (x) { return [T.d[x.key], fd(x.date), x.key === 'edd' ? 'total' : '']; })));
    var lv = [[T.start, fd(r.leave.start)], [T.end(r.leave.days), fd(r.leave.end)], [T.back, fd(r.leave.back), 'total']];
    if (r.leave.sector === 'private') lv.push([T.earliest, fd(r.leave.earliest)]);
    lv.push([T.pat, fd(r.paternity.start) + ' – ' + fd(r.paternity.end)]);
    if (r.allowance) lv.push([T.allow, money(r.allowance)]);
    rows($('bLeave'), lv);
    $('bLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'bersalinPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
