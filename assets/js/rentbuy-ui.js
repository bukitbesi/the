/* Rent vs buy calculator UI (BM + EN). Inputs map to TBBRentBuy.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBRentBuy;
  var form = document.getElementById('rbForm');
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
    head: { buy: 'Membeli lebih untung', rent: 'Menyewa lebih untung' }, buyer: 'Kekayaan pembeli', renter: 'Kekayaan penyewa', upfront: 'Kos permulaan membeli',
    inst: 'Ansuran bulanan', own: 'Kos memiliki bulan pertama', be: 'Membeli mula untung', never: 'Tidak dalam tempoh ini', yr: function (n) { return 'Tahun ' + n; },
    sub: function (r) { return 'Selepas ' + r.horizon + ' tahun: beli ' + rm0(r.buyer) + ', sewa ' + rm0(r.renter); },
    live: function (r) { return (r.better === 'buy' ? 'Membeli' : 'Menyewa') + ' lebih untung ' + rm0(Math.abs(r.difference)) + '.'; }
  } : {
    head: { buy: 'Buying comes out ahead', rent: 'Renting comes out ahead' }, buyer: "Buyer's wealth", renter: "Renter's wealth", upfront: 'Up-front cost of buying',
    inst: 'Monthly instalment', own: 'First-month cost of owning', be: 'Buying pulls ahead', never: 'Not within this period', yr: function (n) { return 'Year ' + n; },
    sub: function (r) { return 'After ' + r.horizon + ' years: buy ' + rm0(r.buyer) + ', rent ' + rm0(r.renter); },
    live: function (r) { return (r.better === 'buy' ? 'Buying' : 'Renting') + ' comes out ahead by ' + rm0(Math.abs(r.difference)) + '.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ price: f('price').value, downPct: f('downPct').value, rate: f('rate').value, years: f('years').value, firstHome: f('firstHome').value,
      upkeep: f('upkeep').value, growth: f('growth').value, sellCost: f('sellCost').value, rent: f('rent').value, rentRise: f('rentRise').value,
      invest: f('invest').value, horizon: f('horizon').value });
    $('bHead').textContent = T.head[r.better];
    $('bDiff').textContent = rm0(Math.abs(r.difference));
    $('bSub').textContent = T.sub(r);
    rows($('bLines'), [[T.buyer, rm0(r.buyer)], [T.renter, rm0(r.renter)], [T.upfront, rm0(r.upfront)], [T.inst, money(r.instalment)], [T.own, money(r.firstMonthOwn)],
      [T.be, r.breakEven ? T.yr(r.breakEven) : T.never, 'total']]);
    var body = $('bYears');
    body.textContent = '';
    r.rows.forEach(function (x) {
      var tr = body.insertRow(), th = document.createElement('th');
      th.scope = 'row'; th.textContent = x.year; tr.appendChild(th);
      tr.insertCell().textContent = rm0(x.buyer); tr.insertCell().textContent = rm0(x.renter);
    });
    $('bLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'rbPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
