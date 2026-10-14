/* Profit margin calculator UI (BM + EN). Inputs map to TBBMargin.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBMargin;
  var form = document.getElementById('marginForm');
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
    price: 'Harga jual', cost: 'Kos barang', fees: 'Fi platform dan bayaran', ship: 'Penghantaran ditanggung', ads: 'Kos iklan seunit', profit: 'Untung seunit',
    margin: 'Margin untung', markup: 'Markup', be: 'Harga pulang modal', target: function (p) { return 'Harga untuk margin ' + nf(p, 1) + '%'; }, none: 'Tidak boleh dicapai',
    monthly: function (q) { return 'Untung untuk ' + nf(q, 0) + ' unit'; },
    sub: function (r) { return 'Margin ' + nf(r.margin, 1) + '% · markup ' + nf(r.markup, 1) + '%'; },
    live: function (r) { return 'Untung ' + money(r.profit) + ' seunit, margin ' + nf(r.margin, 1) + '%.'; }
  } : {
    price: 'Selling price', cost: 'Product cost', fees: 'Platform and payment fees', ship: 'Shipping you pay', ads: 'Ad cost per unit', profit: 'Profit per unit',
    margin: 'Profit margin', markup: 'Markup', be: 'Break-even price', target: function (p) { return 'Price for a ' + nf(p, 1) + '% margin'; }, none: 'Not reachable',
    monthly: function (q) { return 'Profit on ' + nf(q, 0) + ' units'; },
    sub: function (r) { return 'Margin ' + nf(r.margin, 1) + '% · markup ' + nf(r.markup, 1) + '%'; },
    live: function (r) { return 'Profit ' + money(r.profit) + ' a unit, margin ' + nf(r.margin, 1) + '%.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ price: f('price').value, cost: f('cost').value, feePct: f('feePct').value, fixedFee: f('fixedFee').value, shipping: f('shipping').value, ads: f('ads').value, target: f('target').value, qty: f('qty').value });
    $('mProfit').textContent = money(r.profit);
    $('mSub').textContent = T.sub(r);
    var list = [[T.price, money(r.price)], [T.cost, '− ' + money(r.cost)], [T.fees, '− ' + money(r.fees)]];
    if (r.shipping) list.push([T.ship, '− ' + money(r.shipping)]);
    if (r.ads) list.push([T.ads, '− ' + money(r.ads)]);
    list.push([T.profit, money(r.profit), 'total'], [T.margin, nf(r.margin, 1) + '%'], [T.markup, nf(r.markup, 1) + '%'],
      [T.be, r.breakEven === null ? T.none : money(r.breakEven)], [T.target(r.targetPct), r.targetPrice === null ? T.none : money(r.targetPrice)]);
    if (r.qty) list.push([T.monthly(r.qty), money(r.monthly), 'total']);
    rows($('mLines'), list);
    $('mLoss').hidden = r.profit >= 0;
    $('mLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'marginPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
