/* PTPTN repayment calculator UI (BM + EN). Inputs map to TBBPtptn.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBPtptn;
  var form = document.getElementById('ptptnForm');
  if (!X || !form) return;
  var ms = document.documentElement.lang === 'ms', lang = ms ? 'ms' : 'en';
  var fmt2 = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR' });
  var money = function (n) { return fmt2.format(n); };
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
    principal: 'Pinjaman (prinsipal)', ujrah: 'Ujrah 1% setahun', total: 'Jumlah dibayar', monthly: 'Ansuran bulanan', settle: 'Bayar penuh sekarang (baki prinsipal)',
    saving: 'Ujrah dijimatkan', minimum: 'Ansuran minimum penstrukturan (5–8% gaji)',
    sub: function (r) { return r.months + ' bulan · jumlah ' + money(r.total) + ' · ujrah ' + money(r.ujrah); },
    live: function (r) { return 'Ansuran ' + money(r.monthly) + ' sebulan selama ' + r.years + ' tahun.'; }
  } : {
    principal: 'Loan (principal)', ujrah: 'Ujrah 1% a year', total: 'Total repaid', monthly: 'Monthly instalment', settle: 'Settle in full now (principal balance)',
    saving: 'Ujrah saved', minimum: 'Restructuring minimum (5–8% of income)',
    sub: function (r) { return r.months + ' months · total ' + money(r.total) + ' · ujrah ' + money(r.ujrah); },
    live: function (r) { return 'Instalment ' + money(r.monthly) + ' a month for ' + r.years + ' years.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ amount: f('amount').value, years: f('years').value, paid: f('paid').value, income: f('income').value });
    $('pMonthly').textContent = money(r.monthly);
    $('pSub').textContent = T.sub(r);
    var list = [[T.principal, money(r.principal)], [T.ujrah, money(r.ujrah)], [T.total, money(r.total)], [T.monthly, money(r.monthly), 'total']];
    rows($('pLines'), list);
    var s = [[T.settle, money(r.settle), 'total'], [T.saving, money(r.saving)]];
    if (r.minHigh) s.push([T.minimum, money(r.minLow) + ' – ' + money(r.minHigh)]);
    rows($('pSettle'), s);
    $('pLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'ptptnPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
