/* Retirement age calculator UI (BM + EN). Inputs map to TBBRetire.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBRetire;
  var form = document.getElementById('retForm');
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
  var loc = ms ? 'ms-MY' : 'en-GB';
  var dl = function (iso) { return new Date(iso + 'T00:00:00Z').toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };
  var pl = function (n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); };
  var ymd = function (x) { return ms ? x.years + ' tahun ' + x.months + ' bulan ' + x.days + ' hari' : pl(x.years, 'year') + ' ' + pl(x.months, 'month') + ' ' + pl(x.days, 'day'); };
  var T = ms ? {
    now: 'Umur sekarang', age: 'Umur bersara', date: 'Tarikh bersara', left: 'Masa lagi', past: 'Sudah lepas',
    m: { 50: 'KWSP umur 50 (keluar Akaun Sejahtera)', 55: 'KWSP umur 55 (Akaun 55, keluar penuh)', 60: 'KWSP umur 60 (Akaun Emas)', 75: 'Umur 75 (caruman KWSP wajib tamat)' },
    svc: 'Tempoh perkhidmatan', pension: function (r) { return 'Pencen sebulan (' + nf(r.pensionPct, 1) + '%)'; }, grat: 'Ganjaran (sekali bayar)', noPen: 'Tidak layak pencen (kurang 10 tahun)',
    early: 'Bawah 60: majikan swasta tidak boleh memaksa anda bersara lebih awal.',
    sub: function (r) { return r.past ? 'Sudah bersara pada umur ' + r.age : ymd(r.left) + ' lagi · umur ' + r.age; },
    live: function (r) { return 'Bersara pada ' + dl(r.date) + '.'; }
  } : {
    now: 'Age now', age: 'Retirement age', date: 'Retirement date', left: 'Time left', past: 'Already passed',
    m: { 50: 'EPF age 50 (Akaun Sejahtera withdrawal)', 55: 'EPF age 55 (Akaun 55, full withdrawal)', 60: 'EPF age 60 (Akaun Emas)', 75: 'Age 75 (mandatory EPF contributions end)' },
    svc: 'Length of service', pension: function (r) { return 'Monthly pension (' + nf(r.pensionPct, 1) + '%)'; }, grat: 'Gratuity (lump sum)', noPen: 'No pension (under 10 years)',
    early: 'Under 60: a private employer cannot make you retire early.',
    sub: function (r) { return r.past ? 'Already retired at ' + r.age : ymd(r.left) + ' to go · age ' + r.age; },
    live: function (r) { return 'Retire on ' + dl(r.date) + '.'; }
  };
  var today = new Date(), tIso = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())).toISOString().slice(0, 10);

  function render(writeHash) {
    var gov = f('sector').value === 'gov';
    $('rtGov').hidden = !gov;
    var r = X.calculate({ dob: f('dob').value, sector: f('sector').value, age: f('age').value, start: f('start').value, salary: f('salary').value, today: tIso });
    if (!r) return;
    $('rtDate').textContent = dl(r.date);
    $('rtSub').textContent = T.sub(r);
    var list = [];
    if (r.ageNow) list.push([T.now, ymd(r.ageNow)]);
    list.push([T.age, r.age], [T.date, dl(r.date), 'total'], [T.left, r.past ? T.past : ymd(r.left)]);
    r.milestones.forEach(function (m) { list.push([T.m[m.age], dl(m.date) + (m.past ? ' ✓' : '')]); });
    if (r.service) {
      list.push([T.svc, ymd(r.service)]);
      if (r.eligible) list.push([T.pension(r), money(r.pension), 'total'], [T.grat, money(r.gratuity), 'total']);
      else list.push([T.noPen, '—']);
    }
    rows($('rtLines'), list);
    $('rtEarly').hidden = gov || !r.early;
    $('rtLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'rtPrint');
  fromHash(form);
  render(false);
})();
