/* Refinance calculator UI (BM + EN). Inputs map to TBBRefi.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBRefi;
  var form = document.getElementById('refiForm');
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
    old: 'Ansuran sekarang', fresh: 'Ansuran baharu', same: 'Ansuran baharu (baki sama)', saved: 'Faedah dijimatkan', costs: 'Kos refinance', net: 'Penjimatan bersih', be: 'Pulang modal',
    stamp: 'Duti setem 0.5%', legal: 'Yuran guaman (SRO 2023)', sst: 'SST 8% atas yuran guaman', penalty: 'Penalti tempoh kunci', valuation: 'Yuran penilaian', other: 'Kos lain', total: 'Jumlah kos',
    months: function (n) { return n === null ? 'Tiada (ansuran tidak turun)' : n + ' bulan'; },
    sub: function (r) { return 'Jimat ' + money(r.monthlySaving) + ' sebulan · pulang modal ' + (r.breakEven === null ? '–' : r.breakEven + ' bulan'); },
    head: function (r) { return r.netSaving >= 0 ? 'Penjimatan bersih' : 'Kerugian bersih'; },
    live: function (r) { return 'Penjimatan bersih ' + money(r.netSaving) + '.'; }
  } : {
    old: 'Current instalment', fresh: 'New instalment', same: 'New instalment (same balance)', saved: 'Interest saved', costs: 'Refinancing costs', net: 'Net saving', be: 'Break-even',
    stamp: 'Stamp duty 0.5%', legal: 'Legal fees (SRO 2023)', sst: '8% SST on legal fees', penalty: 'Lock-in penalty', valuation: 'Valuation fee', other: 'Other costs', total: 'Total costs',
    months: function (n) { return n === null ? 'Never (instalment does not fall)' : n + ' months'; },
    sub: function (r) { return 'Save ' + money(r.monthlySaving) + ' a month · break-even ' + (r.breakEven === null ? '–' : r.breakEven + ' months'); },
    head: function (r) { return r.netSaving >= 0 ? 'Net saving' : 'Net loss'; },
    live: function (r) { return 'Net saving ' + money(r.netSaving) + '.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ balance: f('balance').value, rate: f('rate').value, yearsLeft: f('yearsLeft').value, newRate: f('newRate').value, newYears: f('newYears').value,
      cashOut: f('cashOut').value, lockPct: f('lockPct').value, valuation: f('valuation').value, other: f('other').value, finance: f('finance').value });
    $('rHead').textContent = T.head(r);
    $('rNet').textContent = money(Math.abs(r.netSaving));
    $('rSub').textContent = T.sub(r);
    var list = [[T.old, money(r.oldInstalment)], [T.same, money(r.sameInstalment)]];
    if (r.cashOut || r.financed) list.push([T.fresh, money(r.newInstalment)]);
    list.push([T.saved, money(r.interestSaved)], [T.costs, '− ' + money(r.costs)], [T.net, money(r.netSaving), 'total'], [T.be, T.months(r.breakEven)]);
    rows($('rLines'), list);
    rows($('rCosts'), [[T.stamp, money(r.stamp)], [T.legal, money(r.legal)], [T.sst, money(r.sst)], [T.penalty, money(r.penalty)], [T.valuation, money(r.valuation)], [T.other, money(r.other)], [T.total, money(r.costs), 'total']]);
    $('rLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'refiPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
