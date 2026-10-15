/* Assessment tax UI (BM + EN). Inputs map to TBBTaksiran.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBTaksiran;
  var form = document.getElementById('taksiranForm');
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
  var NAMES = JSON.parse(form.getAttribute('data-types'));
  var T = ms ? {
    annual: 'Nilai tahunan', rate: 'Kadar', year: 'Cukai setahun', capped: 'Selepas had kenaikan 25% (Selangor)', half: function (i) { return 'Bayaran penggal ' + (i + 1) + ' (hingga ' + X.FACTS.dueMs[i] + ')'; },
    month: 'Purata sebulan', inc: 'Kenaikan berbanding cukai lama', custom: 'Kadar majlis anda',
    sub: function (r) { return money(r.half) + ' setiap penggal · ' + nf(r.rate) + '% daripada nilai tahunan'; },
    live: function (r) { return 'Cukai setahun ' + money(r.pay) + '.'; }
  } : {
    annual: 'Annual value', rate: 'Rate', year: 'Tax a year', capped: 'After the 25% increase cap (Selangor)', half: function (i) { return 'Half ' + (i + 1) + ' (due ' + X.FACTS.due[i] + ')'; },
    month: 'Average a month', inc: 'Increase on the old tax', custom: "Your council's rate",
    sub: function (r) { return money(r.half) + ' each half · ' + nf(r.rate) + '% of annual value'; },
    live: function (r) { return 'Tax a year ' + money(r.pay) + '.'; }
  };
  var lastCouncil = null;
  function syncTypes() {
    var c = f('council').value, sel = f('type');
    $('tTypeF').hidden = c === 'custom'; $('tRateF').hidden = c !== 'custom'; $('tOldF').hidden = !(X.COUNCILS[c] && X.COUNCILS[c].cap);
    if (c === lastCouncil || !X.COUNCILS[c]) { lastCouncil = c; return; }
    var keep = sel.value; sel.textContent = '';
    Object.keys(X.COUNCILS[c].types).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = NAMES[k] + ' (' + nf(X.COUNCILS[c].types[k]) + '%)'; sel.appendChild(o); });
    if (X.COUNCILS[c].types[keep] !== undefined) sel.value = keep;
    lastCouncil = c;
  }

  function render(writeHash) {
    syncTypes();
    var annual = f('mode').value === 'annual';
    $('tRentF').hidden = annual; $('tAnnualF').hidden = !annual;
    var r = X.calculate({ council: f('council').value, type: f('type').value, rate: f('rate').value, mode: f('mode').value, rent: f('rent').value, annual: f('annual').value, oldTax: f('oldTax').value });
    $('tTax').textContent = money(r.pay);
    $('tSub').textContent = T.sub(r);
    var n = [[T.annual, money(r.annual)], [T.rate, nf(r.rate) + '%'], [T.year, money(r.tax), r.capped === null ? 'total' : '']];
    if (r.capped !== null) n.push([T.capped, money(r.capped), 'total']);
    n.push([T.half(0), money(r.half)], [T.half(1), money(r.half)], [T.month, money(r.monthly)]);
    if (r.increase !== null) n.push([T.inc, money(r.increase)]);
    rows($('tLines'), n);
    var rent = r.annual / 12;
    Array.prototype.forEach.call($('tCompare').rows, function (tr) { tr.cells[2].textContent = money(Math.round(rent * 12 * Number(tr.getAttribute('data-rate'))) / 100); });
    $('tCompareRent').textContent = money(rent);
    $('tLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'taksiranPrint');
  syncTypes();
  if (fromHash(form, function (kv) { if (kv.council) { f('council').value = kv.council; syncTypes(); } }) || changed(form)) render(false);
})();
