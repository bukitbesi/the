/* Age calculator UI (BM + EN). Inputs map to TBBUmur.calculate() with TBBHijri for the Hijri age; state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBUmur;
  var form = document.getElementById('umurForm');
  if (!X || !form) return;
  var H = window.TBBHijri;
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
  var fd = function (iso) { return new Date(iso + 'T00:00:00Z').toLocaleDateString(ms ? 'ms-MY' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };
  var DAYS = ms ? ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var T = ms ? {
    yrs: function (n) { return n + ' tahun'; }, sub: function (r) { return r.months + ' bulan ' + r.days + ' hari · lahir hari ' + DAYS[r.weekday]; },
    days: 'Jumlah hari', weeks: 'Jumlah minggu', months: 'Jumlah bulan', next: 'Hari jadi seterusnya', nextV: function (r) { return r.nextDays === 0 ? 'Hari ini! Selamat hari jadi' : fd(r.next) + ' (' + nf(r.nextDays, 0) + ' hari lagi, umur ' + r.nextAge + ')'; },
    hijri: 'Umur ikut Hijrah', hijriV: function (h) { return h.y + ' tahun ' + h.m + ' bulan'; }, hbirth: 'Tarikh lahir Hijrah', hnext: 'Hari jadi Hijrah seterusnya', none: 'Di luar julat takwim (1979 hingga 2077)',
    reached: 'Sudah', soon: function (iso) { return fd(iso); }, bad: 'Masukkan tarikh lahir yang sah',
    m: { mykad: 'MyKad pertama', moto: 'Lesen L motosikal (B2)', car: 'Lesen L kereta (D)', adult: 'Mengundi, umur dewasa, produk rokok', alcohol: 'Beli minuman keras', epf50: 'KWSP: keluar Akaun Sejahtera (sekali, 50 hingga 54)', epf55: 'KWSP: Akaun 55', senior: 'Umur bersara minimum dan warga emas' },
    live: function (r) { return 'Umur ' + r.years + ' tahun ' + r.months + ' bulan ' + r.days + ' hari.'; }
  } : {
    yrs: function (n) { return n + (n === 1 ? ' year' : ' years'); }, sub: function (r) { return r.months + ' months ' + r.days + ' days · born on a ' + DAYS[r.weekday]; },
    days: 'Total days', weeks: 'Total weeks', months: 'Total months', next: 'Next birthday', nextV: function (r) { return r.nextDays === 0 ? 'Today! Happy birthday' : fd(r.next) + ' (in ' + nf(r.nextDays, 0) + ' days, turning ' + r.nextAge + ')'; },
    hijri: 'Age in Hijri years', hijriV: function (h) { return h.y + ' years ' + h.m + ' months'; }, hbirth: 'Hijri date of birth', hnext: 'Next Hijri birthday', none: 'Outside the takwim range (1979 to 2077)',
    reached: 'Reached', soon: function (iso) { return fd(iso); }, bad: 'Enter a valid date of birth',
    m: { mykad: 'First MyKad', moto: 'Motorcycle learner licence (B2)', car: 'Car learner licence (D)', adult: 'Vote, age of majority, tobacco products', alcohol: 'Buy alcohol', epf50: 'EPF: Akaun Sejahtera withdrawal (once, 50 to 54)', epf55: 'EPF: Akaun 55', senior: 'Minimum retirement age and senior citizen' },
    live: function (r) { return 'Age ' + r.years + ' years ' + r.months + ' months ' + r.days + ' days.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ dob: f('dob').value, today: f('on').value || today });
    if (!r) { $('uAge').textContent = '–'; $('uSub').textContent = T.bad; rows($('uLines'), []); rows($('uMiles'), []); return; }
    $('uAge').textContent = T.yrs(r.years);
    $('uSub').textContent = T.sub(r);
    var list = [[T.days, nf(r.totalDays, 0)], [T.weeks, nf(r.weeks, 0)], [T.months, nf(r.totalMonths, 0)], [T.next, T.nextV(r), 'total']];
    if (r.hijri) list.push([T.hijri, T.hijriV(r.hijri)], [T.hbirth, H.formatHijri(r.hijri.birth, ms ? 'ms' : 'en')], [T.hnext, r.hijri.next ? fd(r.hijri.next) : '–']);
    else list.push([T.hijri, T.none]);
    rows($('uLines'), list);
    rows($('uMiles'), r.milestones.map(function (x) { return [T.m[x.key] + ' (' + x.age + ')', x.reached ? T.reached + ' · ' + fd(x.date) : fd(x.date)]; }));
    $('uLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'umurPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
