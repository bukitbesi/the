/* Water bill calculator UI (BM + EN). Inputs map to TBBWater.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBWater;
  var form = document.getElementById('waterForm');
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
  var lang = ms ? 'ms' : 'en';
  var T = ms ? {
    band: ['0–20 m³', '20–35 m³', 'Melebihi 35 m³'], usage: 'Caj penggunaan', min: 'Caj minimum', total: 'Bil sebulan', per: 'Purata setiap m³', litres: 'Liter sehari',
    sub: function (r, n) { return nf(r.m3) + ' m³ di ' + n + ' · ' + r.operator; },
    line: function (l) { return nf(l.m3) + ' m³ × ' + money(l.rate); },
    live: function (r) { return 'Bil air ' + money(r.total) + ' sebulan.'; }
  } : {
    band: ['0–20 m³', '20–35 m³', 'Above 35 m³'], usage: 'Usage charge', min: 'Minimum charge', total: 'Bill a month', per: 'Average per m³', litres: 'Litres a day',
    sub: function (r, n) { return nf(r.m3) + ' m³ in ' + n + ' · ' + r.operator; },
    line: function (l) { return nf(l.m3) + ' m³ × ' + money(l.rate); },
    live: function (r) { return 'Water bill ' + money(r.total) + ' a month.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ state: f('state').value, m3: f('m3').value }), n = X.name(r.state, lang);
    $('wBill').textContent = money(r.total);
    $('wSub').textContent = T.sub(r, n);
    var list = [];
    r.lines.forEach(function (l, i) { if (l.m3 || i === 0) list.push([T.band[i] + ': ' + T.line(l), money(l.amount)]); });
    list.push([T.usage, money(r.usage)]);
    if (r.minApplied) list.push([T.min, money(r.minimum)]);
    list.push([T.total, money(r.total), 'total'], [T.per, money(r.perM3)], [T.litres, nf(r.daily, 0)]);
    rows($('wLines'), list);
    $('wLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'waterPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
