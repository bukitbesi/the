/* Unit trust calculator UI (BM + EN). Inputs map to TBBUnitTrust.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBUnitTrust;
  var form = document.getElementById('utForm');
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
    paid: 'Jumlah dilabur', charges: 'Caj jualan', fees: 'Yuran tahunan', value: 'Nilai akhir', profit: 'Untung', net: 'Pulangan bersih setahun',
    iinv: 'Melalui KWSP i-Invest (caj 0.5%)', none: 'Tanpa caj dan yuran', cost: 'Kos caj dan yuran',
    sub: function (r) { return money(r.paid) + ' dilabur · pulangan bersih ' + nf(r.net, 2) + '% setahun'; },
    yr: function (y) { return 'Tahun ' + y; },
    live: function (r) { return 'Nilai ' + money(r.value) + ' selepas ' + r.years + ' tahun.'; }
  } : {
    paid: 'Total invested', charges: 'Sales charges', fees: 'Yearly fees', value: 'Final value', profit: 'Profit', net: 'Net return a year',
    iinv: 'Through EPF i-Invest (0.5% charge)', none: 'With no charges or fees', cost: 'Cost of charges and fees',
    sub: function (r) { return money(r.paid) + ' invested · net return ' + nf(r.net, 2) + '% a year'; },
    yr: function (y) { return 'Year ' + y; },
    live: function (r) { return 'Value ' + money(r.value) + ' after ' + r.years + ' years.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ lump: f('lump').value, monthly: f('monthly').value, years: f('years').value, gross: f('gross').value, charge: f('charge').value, fee: f('fee').value });
    $('uValue').textContent = money(r.value);
    $('uSub').textContent = T.sub(r);
    rows($('uLines'), [[T.paid, money(r.paid)], [T.charges, '− ' + money(r.charges)], [T.fees, '− ' + money(r.fees)], [T.value, money(r.value), 'total'], [T.profit, money(r.profit)],
      [T.net, nf(r.net, 2) + '%'], [T.iinv, money(r.iInvest)], [T.none, money(r.noCost)], [T.cost, money(r.costOfFees), 'total']]);
    var body = $('uRows');
    body.textContent = '';
    r.rows.forEach(function (x) {
      var tr = body.insertRow(), th = document.createElement('th');
      th.scope = 'row'; th.textContent = T.yr(x.year); tr.appendChild(th);
      tr.insertCell().textContent = money(x.paid); tr.insertCell().textContent = money(x.value); tr.insertCell().textContent = money(x.value - x.paid);
    });
    $('uLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'utPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
