/* ROAS calculator UI (BM + EN). Inputs map to TBBRoas.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBRoas;
  var form = document.getElementById('roasForm');
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
  var x2 = function (n) { return new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + '×'; };
  var T = ms ? {
    spend: 'Belanja iklan', tax: 'Cukai perkhidmatan 8%', revenue: 'Jualan daripada iklan', gross: function (r) { return 'Untung kasar (' + nf(r.marginPct, 1) + '%)'; },
    profit: 'Untung selepas iklan', roi: 'ROI', be: 'ROAS pulang modal', beRev: 'Jualan pulang modal', acos: 'ACoS (iklan ÷ jualan)', cpa: 'Kos setiap pesanan (CPA)',
    aov: 'Nilai purata pesanan', maxCpa: 'CPA maksimum pulang modal', na: 'Tiada (margin 0%)',
    sub: function (r) { return 'ROI ' + nf(r.roi, 1) + '% · ' + (r.profit >= 0 ? 'untung ' : 'rugi ') + money(Math.abs(r.profit)); },
    live: function (r) { return 'ROAS ' + x2(r.roas) + ', ROI ' + nf(r.roi, 1) + '%.'; }
  } : {
    spend: 'Ad spend', tax: '8% service tax', revenue: 'Sales from ads', gross: function (r) { return 'Gross profit (' + nf(r.marginPct, 1) + '%)'; },
    profit: 'Profit after ads', roi: 'ROI', be: 'Break-even ROAS', beRev: 'Break-even sales', acos: 'ACoS (ad spend ÷ sales)', cpa: 'Cost per order (CPA)',
    aov: 'Average order value', maxCpa: 'Break-even CPA', na: 'None (0% margin)',
    sub: function (r) { return 'ROI ' + nf(r.roi, 1) + '% · ' + (r.profit >= 0 ? 'profit ' : 'loss ') + money(Math.abs(r.profit)); },
    live: function (r) { return 'ROAS ' + x2(r.roas) + ', ROI ' + nf(r.roi, 1) + '%.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ spend: f('spend').value, tax: f('tax').value, revenue: f('revenue').value, margin: f('margin').value, orders: f('orders').value });
    $('rRoas').textContent = x2(r.roas);
    $('rSub').textContent = T.sub(r);
    var list = [[T.spend, money(r.baseSpend)]];
    if (r.tax) list.push([T.tax, money(r.tax)]);
    list.push([T.revenue, money(r.revenue)], [T.gross(r), money(r.gross)], [T.profit, money(r.profit), 'total'], [T.roi, nf(r.roi, 1) + '%'],
      [T.be, r.breakEven === null ? T.na : x2(r.breakEven)], [T.beRev, r.breakEvenRevenue === null ? T.na : money(r.breakEvenRevenue)], [T.acos, nf(r.acos, 1) + '%']);
    if (r.orders) list.push([T.cpa, money(r.cpa)], [T.aov, money(r.aov)], [T.maxCpa, money(r.maxCpa)]);
    rows($('rLines'), list);
    $('rLoss').hidden = r.profit >= 0;
    $('rLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'roasPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
