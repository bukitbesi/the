/* Tenancy stamp duty calculator UI (BM + EN). Inputs map to TBBTenancy.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBTenancy;
  var form = document.getElementById('tenancyForm');
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
    annual: 'Sewa setahun', units: 'Unit RM250 (dibundar naik)', rate: 'Kadar setiap RM250', duty: 'Duti setem perjanjian', copies: function (n) { return 'Salinan (' + n + ' × RM10)'; }, total: 'Jumlah duti setem', old: 'Di bawah peraturan lama (dulu)',
    gross: 'Pulangan kasar', net: 'Pendapatan sewa bersih setahun', ny: 'Pulangan bersih',
    sub: function (r) { return r.units + ' × RM' + r.rate + (r.copies ? ' + ' + r.copies + ' salinan' : '') + ' · tempoh ' + r.months + ' bulan'; },
    live: function (r) { return 'Duti setem ' + money(r.total) + '.'; }
  } : {
    annual: 'Yearly rent', units: 'Units of RM250 (rounded up)', rate: 'Rate per RM250', duty: 'Agreement stamp duty', copies: function (n) { return 'Copies (' + n + ' × RM10)'; }, total: 'Total stamp duty', old: 'Under the old rule (before)',
    gross: 'Gross rental yield', net: 'Net rental income a year', ny: 'Net rental yield',
    sub: function (r) { return r.units + ' × RM' + r.rate + (r.copies ? ' + ' + r.copies + (r.copies > 1 ? ' copies' : ' copy') : '') + ' · ' + r.months + '-month term'; },
    live: function (r) { return 'Stamp duty ' + money(r.total) + '.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ rent: f('rent').value, months: f('months').value, copies: f('copies').value, price: f('price').value, costs: f('costs').value, vacancy: f('vacancy').value });
    $('tDuty').textContent = money(r.total);
    $('tSub').textContent = T.sub(r);
    var list = [[T.annual, money(r.annual)], [T.units, r.units], [T.rate, 'RM' + r.rate], [T.duty, money(r.duty)]];
    if (r.copies) list.push([T.copies(r.copies), money(r.copyDuty)]);
    list.push([T.total, money(r.total), 'total'], [T.old, money(r.old)]);
    if (r.price) list.push([T.gross, nf(r.grossYield, 2) + '%'], [T.net, money(r.netIncome)], [T.ny, nf(r.netYield, 2) + '%', 'total']);
    rows($('tLines'), list);
    $('tLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'tenancyPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
