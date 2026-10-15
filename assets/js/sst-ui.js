/* SST calculator UI (BM + EN). Inputs map to TBBSst.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBSst;
  var form = document.getElementById('sstForm');
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
    base: 'Harga sebelum cukai', charge: function (r) { return 'Caj perkhidmatan (' + nf(r.charge, 1) + '%)'; }, tax: function (r) { return 'SST (' + nf(r.rate, 1) + '%)'; }, total: 'Jumlah termasuk cukai', share: 'Bahagian cukai dalam jumlah',
    mainAdd: 'Jumlah termasuk SST', mainRemove: 'Harga sebelum SST',
    sub: function (r) { return 'SST ' + money(r.tax) + ' pada ' + nf(r.rate, 1) + '%'; },
    live: function (r) { return 'SST ' + money(r.tax) + ', jumlah ' + money(r.total) + '.'; }
  } : {
    base: 'Price before tax', charge: function (r) { return 'Service charge (' + nf(r.charge, 1) + '%)'; }, tax: function (r) { return 'SST (' + nf(r.rate, 1) + '%)'; }, total: 'Total including tax', share: 'Tax share of the total',
    mainAdd: 'Total including SST', mainRemove: 'Price before SST',
    sub: function (r) { return 'SST ' + money(r.tax) + ' at ' + nf(r.rate, 1) + '%'; },
    live: function (r) { return 'SST ' + money(r.tax) + ', total ' + money(r.total) + '.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ mode: f('mode').value, amount: f('amount').value, rate: f('rate').value, charge: f('charge').value });
    $('sMainLabel').textContent = r.mode === 'remove' ? T.mainRemove : T.mainAdd;
    $('sMain').textContent = money(r.mode === 'remove' ? r.base : r.total);
    $('sSub').textContent = T.sub(r);
    var list = [[T.base, money(r.base)]];
    if (r.charge) list.push([T.charge(r), money(r.serviceCharge)]);
    list.push([T.tax(r), money(r.tax)], [T.total, money(r.total), 'total'], [T.share, nf(r.taxShare, 2) + '%']);
    rows($('sLines'), list);
    $('sLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'sstPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
