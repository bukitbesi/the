/* SSPN calculator UI (BM + EN). Inputs map to TBBSspn.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBSspn;
  var form = document.getElementById('sspnForm');
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
    dep: 'Jumlah simpanan', div: 'Jumlah dividen', bal: 'Baki akhir', year: 'Simpanan tahun ini', relief: 'Pelepasan cukai (had RM8,000)', saved: 'Cukai dijimat setahun', unused: 'Baki had pelepasan belum guna',
    sub: function (r) { return money(r.deposits) + ' simpanan + ' + money(r.dividends) + ' dividen'; },
    yr: function (y) { return 'Tahun ' + y; },
    live: function (r) { return 'Baki ' + money(r.balance) + ' selepas ' + r.years + ' tahun.'; }
  } : {
    dep: 'Total deposits', div: 'Total dividends', bal: 'Final balance', year: 'Deposits this year', relief: 'Tax relief (RM8,000 cap)', saved: 'Tax saved a year', unused: 'Relief cap left unused',
    sub: function (r) { return money(r.deposits) + ' deposits + ' + money(r.dividends) + ' dividends'; },
    yr: function (y) { return 'Year ' + y; },
    live: function (r) { return 'Balance ' + money(r.balance) + ' after ' + r.years + ' years.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ balance: f('balance').value, monthly: f('monthly').value, lump: f('lump').value, years: f('years').value, rate: f('rate').value, income: f('income').value });
    $('sBalance').textContent = money(r.balance);
    $('sSub').textContent = T.sub(r);
    var list = [[T.dep, money(r.deposits)], [T.div, money(r.dividends)], [T.bal, money(r.balance), 'total'], [T.year, money(r.yearDeposit)], [T.relief, money(r.relief)], [T.saved, money(r.taxSaved), 'total']];
    if (r.unused) list.push([T.unused, money(r.unused)]);
    rows($('sLines'), list);
    var body = $('sRows');
    body.textContent = '';
    r.rows.forEach(function (x) {
      var tr = body.insertRow(), th = document.createElement('th');
      th.scope = 'row'; th.textContent = T.yr(x.year); tr.appendChild(th);
      tr.insertCell().textContent = money(x.deposits); tr.insertCell().textContent = money(x.dividends); tr.insertCell().textContent = money(x.balance);
    });
    $('sLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'sspnPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
