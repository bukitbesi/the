/* Annual leave calculator UI (BM + EN). Inputs map to TBBLeave.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBLeave;
  var form = document.getElementById('leaveForm');
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
  var T = ms ? {
    svc: 'Tempoh perkhidmatan', full: 'Cuti tahunan penuh', counted: 'Bulan dikira tahun ini', earned: 'Cuti tahunan layak', taken: 'Sudah diambil', bal: 'Baki', pay: 'Bayaran cuti tidak diambil', orp: 'Kadar gaji harian (gaji ÷ 26)',
    sick: 'Cuti sakit setahun', hosp: 'Cuti hospital setahun', mat: 'Cuti bersalin', pat: 'Cuti paterniti', patNo: 'Belum layak (kurang 12 bulan)',
    ym: function (m) { return Math.floor(m / 12) + ' tahun ' + (m % 12) + ' bulan'; }, d: function (n) { return n + ' hari'; },
    sub: function (r) { return 'daripada ' + r.full + ' hari setahun (' + ['bawah 2 tahun', '2 hingga 5 tahun', '5 tahun atau lebih'][r.tier] + ' berkhidmat)'; },
    live: function (r) { return r.earned + ' hari cuti tahunan.'; }
  } : {
    svc: 'Length of service', full: 'Full annual leave', counted: 'Months counted this year', earned: 'Annual leave earned', taken: 'Already taken', bal: 'Balance', pay: 'Pay for unused leave', orp: 'Daily rate (wage ÷ 26)',
    sick: 'Sick leave a year', hosp: 'Hospitalisation leave a year', mat: 'Maternity leave', pat: 'Paternity leave', patNo: 'Not yet eligible (under 12 months)',
    ym: function (m) { return Math.floor(m / 12) + ' years ' + (m % 12) + ' months'; }, d: function (n) { return n + ' days'; },
    sub: function (r) { return 'of ' + r.full + ' days a year (' + ['under 2 years', '2 to 5 years', '5 years or more'][r.tier] + ' of service)'; },
    live: function (r) { return r.earned + ' days of annual leave.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ start: f('start').value, end: f('end').value, leaving: f('leaving').value, taken: f('taken').value, wage: f('wage').value });
    if (!r) return;
    $('lDays').textContent = T.d(r.earned);
    $('lSub').textContent = T.sub(r);
    var list = [[T.svc, T.ym(r.months)], [T.full, T.d(r.full)], [T.counted, r.counted], [T.earned, T.d(r.earned), 'total'], [T.taken, T.d(r.taken)], [T.bal, T.d(r.balance), 'total']];
    if (r.leaving) list.push([T.orp, money(r.orp)], [T.pay, money(r.payout), 'total']);
    rows($('lLines'), list);
    rows($('lOther'), [[T.sick, T.d(r.sick)], [T.hosp, T.d(r.hospital)], [T.mat, T.d(r.maternity)], [T.pat, r.paternity ? T.d(r.paternity) : T.patNo]]);
    $('lLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'leavePrint');
  if (fromHash(form) || changed(form)) render(false);
})();
