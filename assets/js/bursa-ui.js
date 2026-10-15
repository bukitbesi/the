/* Bursa share fee calculator UI (BM + EN). Inputs map to TBBBursa.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBBursa;
  var form = document.getElementById('bursaForm');
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
    bv: 'Nilai belian', bb: 'Brokeraj belian', bc: 'Fi penjelasan belian', bs: 'Duti setem belian', bt: 'SST belian (8%)', cost: 'Kos belian', sv: 'Nilai jualan', sb: 'Brokeraj jualan', sc: 'Fi penjelasan jualan', ss: 'Duti setem jualan', st: 'SST jualan (8%)',
    proc: 'Hasil jualan bersih', div: 'Dividen', profit: 'Untung bersih', ret: 'Pulangan', be: 'Harga pulang modal', fees: 'Jumlah caj',
    sub: function (r) { return 'Pulangan ' + nf(r.ret, 2) + '% · caj ' + money(r.feesTotal); },
    live: function (r) { return (r.profit >= 0 ? 'Untung ' : 'Rugi ') + money(Math.abs(r.profit)) + '.'; }
  } : {
    bv: 'Buy value', bb: 'Buy brokerage', bc: 'Buy clearing fee', bs: 'Buy stamp duty', bt: 'Buy SST (8%)', cost: 'Total buy cost', sv: 'Sell value', sb: 'Sell brokerage', sc: 'Sell clearing fee', ss: 'Sell stamp duty', st: 'Sell SST (8%)',
    proc: 'Net sale proceeds', div: 'Dividends', profit: 'Net profit', ret: 'Return', be: 'Break-even price', fees: 'Total charges',
    sub: function (r) { return 'Return ' + nf(r.ret, 2) + '% · charges ' + money(r.feesTotal); },
    live: function (r) { return (r.profit >= 0 ? 'Profit ' : 'Loss ') + money(Math.abs(r.profit)) + '.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ qty: f('qty').value, buy: f('buy').value, sell: f('sell').value, brokerPct: f('brokerPct').value, brokerMin: f('brokerMin').value, asset: f('asset').value, dividend: f('dividend').value });
    $('bProfit').textContent = money(r.profit);
    $('bSub').textContent = T.sub(r);
    var list = [[T.bv, money(r.buyValue)], [T.bb, '+ ' + money(r.buyFees.brokerage)], [T.bc, '+ ' + money(r.buyFees.clearing)], [T.bs, '+ ' + money(r.buyFees.stamp)]];
    if (r.buyFees.sst) list.push([T.bt, '+ ' + money(r.buyFees.sst)]);
    list.push([T.cost, money(r.cost), 'total'], [T.sv, money(r.sellValue)], [T.sb, '− ' + money(r.sellFees.brokerage)], [T.sc, '− ' + money(r.sellFees.clearing)], [T.ss, '− ' + money(r.sellFees.stamp)]);
    if (r.sellFees.sst) list.push([T.st, '− ' + money(r.sellFees.sst)]);
    list.push([T.proc, money(r.proceeds), 'total']);
    if (r.dividends) list.push([T.div, '+ ' + money(r.dividends)]);
    list.push([T.profit, money(r.profit), 'total'], [T.ret, nf(r.ret, 2) + '%'], [T.fees, money(r.feesTotal)], [T.be, r.breakEven === null ? '—' : 'RM' + r.breakEven.toFixed(3)]);
    rows($('bLines'), list);
    $('bLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'bursaPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
