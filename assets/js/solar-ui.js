/* Solar ATAP calculator UI (BM + EN). Inputs map to TBBSolar.calculate(), bills priced by TBBTnb; state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBSolar;
  var form = document.getElementById('solarForm');
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
  var now = new Date(), today = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
  var kwh = function (n) { return nf(n, 0) + ' kWh'; };
  var T = ms ? {
    sub: function (r) { return r.payback ? 'Pulang modal kira-kira ' + nf(r.payback, 1) + ' tahun' : 'Tiada penjimatan pada input ini'; },
    gen: 'Tenaga dijana sebulan', self: 'Digunakan sendiri', exp: 'Dieksport ke grid', imp: 'Diimport dari TNB', cred: 'Eksport dikreditkan (27.03 sen)', lost: 'Eksport hangus (melebihi import)',
    without: 'Bil tanpa solar', withS: 'Bil dengan solar', year: 'Jimat setahun', cost: 'Kos sistem', rebate: 'Rebat SuRIA Home', net: 'Kos bersih', pay: 'Tempoh pulang modal', payV: function (n) { return n ? nf(n, 1) + ' tahun' : '–'; },
    ten: 'Jimat dalam 10 tahun ATAP', cap: function (r) { return 'Melebihi ' + r.cap + ' kW: perlu semakan TNB (RM1,000)'; }, capL: 'Had kapasiti',
    live: function (r) { return 'Jimat ' + money(r.saving) + ' sebulan.'; }
  } : {
    sub: function (r) { return r.payback ? 'Payback about ' + nf(r.payback, 1) + ' years' : 'No saving with these inputs'; },
    gen: 'Energy generated a month', self: 'Used yourself', exp: 'Exported to the grid', imp: 'Imported from TNB', cred: 'Exports credited (27.03 sen)', lost: 'Exports forfeited (above imports)',
    without: 'Bill without solar', withS: 'Bill with solar', year: 'Saving a year', cost: 'System cost', rebate: 'SuRIA Home rebate', net: 'Net cost', pay: 'Payback period', payV: function (n) { return n ? nf(n, 1) + ' years' : '–'; },
    ten: 'Saving over the 10-year ATAP term', cap: function (r) { return 'Above ' + r.cap + ' kW: TNB connection check needed (RM1,000)'; }, capL: 'Capacity cap',
    live: function (r) { return 'Saves ' + money(r.saving) + ' a month.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ usage: f('usage').value, kwp: f('kwp').value, kwac: f('kwac').value, phase: f('phase').value, yield: f('yield').value, selfuse: f('selfuse').value,
      costKwp: f('costKwp').value, suria: f('suria').value, afa: f('afa').value, protection: window.TBBTnb.protectionOn(today) });
    $('oSave').textContent = money(r.saving);
    $('oSub').textContent = T.sub(r);
    var e = [[T.gen, kwh(r.gen)], [T.self, kwh(r.self)], [T.exp, kwh(r.exported)], [T.imp, kwh(r.imports)], [T.cred, kwh(r.credited)]];
    if (r.forfeited) e.push([T.lost, kwh(r.forfeited)]);
    rows($('oEnergy'), e);
    var m = [[T.without, money(r.without)], [T.withS, money(r.with)], [T.year, money(r.yearly), 'total'], [T.cost, money(r.cost)]];
    if (r.rebate) m.push([T.rebate, '− ' + money(r.rebate)]);
    m.push([T.net, money(r.net)], [T.pay, T.payV(r.payback), 'total'], [T.ten, money(r.tenureSaving)]);
    if (r.overCap) m.push([T.capL, T.cap(r)]);
    rows($('oMoney'), m);
    $('oLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'solarPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
