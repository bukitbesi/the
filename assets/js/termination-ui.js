/* Termination benefits calculator UI (BM + EN). Inputs map to TBBTermination.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBTermination;
  var form = document.getElementById('termForm');
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
    svc: 'Tempoh perkhidmatan', notice: 'Tempoh notis', lieu: 'Gaji ganti notis', perYear: 'Hari gaji setahun', yrs: 'Tahun dikira (ke bulan terdekat)', days: 'Hari faedah', orp: 'Kadar gaji harian (gaji ÷ 26)', benefit: 'Faedah penamatan minimum',
    ym: function (m) { return Math.floor(m / 12) + ' tahun ' + (m % 12) + ' bulan'; }, w: function (n) { return n + ' minggu'; },
    why: { resign: 'Faedah penamatan tidak dibayar jika anda meletak jawatan; notis tetap terpakai.', short: 'Faedah penamatan memerlukan sekurang-kurangnya 12 bulan perkhidmatan berterusan.', over: 'Bagi pekerja bukan manual bergaji melebihi RM4,000, faedah ikut kontrak anda; Akta tidak menjamin minimum.' },
    sub: function (r) { return 'Notis ' + r.notice + ' minggu · ' + money(r.inLieu) + ' gaji ganti notis'; },
    live: function (r) { return 'Faedah penamatan ' + money(r.benefit) + '.'; }
  } : {
    svc: 'Length of service', notice: 'Notice period', lieu: 'Pay in lieu of notice', perYear: 'Days\' wages a year', yrs: 'Years counted (to the nearest month)', days: 'Benefit days', orp: 'Daily rate (wage ÷ 26)', benefit: 'Minimum termination benefit',
    ym: function (m) { return Math.floor(m / 12) + ' years ' + (m % 12) + ' months'; }, w: function (n) { return n + ' weeks'; },
    why: { resign: 'No termination benefit when you resign; the notice period still applies.', short: 'Termination benefits need at least 12 months of continuous service.', over: 'For non-manual employees earning above RM4,000, benefits follow your contract; the Act sets no minimum.' },
    sub: function (r) { return r.notice + ' weeks\' notice · ' + money(r.inLieu) + ' in lieu'; },
    live: function (r) { return 'Termination benefit ' + money(r.benefit) + '.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ start: f('start').value, end: f('end').value, wage: f('wage').value, reason: f('reason').value, manual: f('manual').value, contract: f('contract').value });
    if (!r) return;
    $('tBenefit').textContent = money(r.benefit);
    $('tSub').textContent = T.sub(r);
    rows($('tLines'), [[T.svc, T.ym(r.months)], [T.notice, T.w(r.notice)], [T.lieu, money(r.inLieu), 'total'], [T.perYear, r.daysPerYear], [T.yrs, nf(r.rounded / 12, 2)], [T.days, nf(r.benefitDays, 2)], [T.orp, money(r.orp)], [T.benefit, money(r.benefit), 'total']]);
    var why = r.resign ? T.why.resign : r.shortService ? T.why.short : !r.covered ? T.why.over : '';
    $('tWhy').textContent = why;
    $('tWhy').hidden = !why;
    $('tLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'termPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
