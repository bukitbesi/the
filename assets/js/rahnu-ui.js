/* Ar-Rahnu calculator UI (BM + EN). Inputs map to TBBRahnu.calculate(); today's pure-gold price per gram is rendered into data-gram at build time; state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBRahnu;
  var form = document.getElementById('rahnuForm');
  if (!X || !form) return;
  var ms = document.documentElement.lang === 'ms';
  var fmt2 = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR' });
  var money = function (n) { return fmt2.format(n); };
  var nf = function (n, d) { return new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { maximumFractionDigits: d === undefined ? 2 : d }).format(n); };
  var day = function (iso) { return new Date(iso + 'T00:00:00Z').toLocaleDateString(ms ? 'ms-MY' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };
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
  var gram = Number(form.getAttribute('data-gram')) || 0;
  var T = ms ? {
    value: 'Nilai emas (marhun)', fin: function (q) { return q.financing < q.max ? 'Pembiayaan (maksimum ' + money(q.max) + ')' : 'Pembiayaan (' + q.mof + '% nilai emas)'; }, monthly: 'Caj sebulan', charge: function (n) { return 'Jumlah caj ' + n + ' bulan'; }, repay: 'Jumlah tebus',
    apr: 'Kadar setahun atas pembiayaan', renew: function (q) { return 'Lebih tempoh ' + q.tenure + ' bulan: perlu diperbaharui'; }, pawn: 'Had kedai pajak gadai (2% sebulan)',
    basis: function (q) { return q.kind === 'rate' ? (q.ceiling ? 'Hingga ' : '') + nf(q.rate) + '% setahun atas pembiayaan' : 'RM' + q.fee.toFixed(2) + ' setiap RM100 nilai emas sebulan'; }, best: 'Caj terendah',
    sub: function (r) { return r.pick.name + ' · ' + T.basis(r.pick); }, live: function (r) { return 'Pembiayaan ' + money(r.pick.financing) + ', caj ' + money(r.pick.charge) + '.'; }
  } : {
    value: 'Gold value (marhun)', fin: function (q) { return q.financing < q.max ? 'Financing (maximum ' + money(q.max) + ')' : 'Financing (' + q.mof + '% of gold value)'; }, monthly: 'Charge a month', charge: function (n) { return 'Total charge for ' + n + ' months'; }, repay: 'Total to redeem',
    apr: 'Yearly rate on the financing', renew: function (q) { return 'Over the ' + q.tenure + '-month tenure: needs renewal'; }, pawn: 'Pawnshop cap (2% a month)',
    basis: function (q) { return q.kind === 'rate' ? (q.ceiling ? 'Up to ' : '') + nf(q.rate) + '% a year on the financing' : 'RM' + q.fee.toFixed(2) + ' per RM100 of gold value a month'; }, best: 'Lowest charge',
    sub: function (r) { return r.pick.name + ' · ' + T.basis(r.pick); }, live: function (r) { return 'Financing ' + money(r.pick.financing) + ', charge ' + money(r.pick.charge) + '.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ grams: f('grams').value, karat: f('karat').value, gram: f('price').value || gram, months: f('months').value, want: f('want').value, provider: f('provider').value });
    var q = r.pick;
    $('rFin').textContent = money(q.financing);
    $('rSub').textContent = T.sub(r);
    var list = [[T.value, money(r.marhun)], [T.fin(q), money(q.financing)], [T.monthly, money(q.monthly)], [T.charge(r.months), money(q.charge)], [T.repay, money(q.repay), 'total'], [T.apr, nf(q.apr) + '%']];
    if (q.renew) list.push(['!', T.renew(q)]);
    list.push([T.pawn, money(r.pawn)], [T.best, r.best.name + ' · ' + money(r.best.charge)]);
    rows($('rLines'), list.map(function (x) { return x[0] === '!' ? [ms ? 'Tempoh' : 'Tenure', x[1]] : x; }));
    var body = $('rCompare'); body.textContent = '';
    r.list.forEach(function (x) {
      var tr = body.insertRow(), th = document.createElement('th');
      th.scope = 'row'; th.textContent = x.name; tr.appendChild(th);
      [T.basis(x), money(x.financing), money(x.monthly), money(x.charge), nf(x.apr) + '%'].forEach(function (v) { tr.insertCell().textContent = v; });
    });
    $('rLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'rahnuPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
