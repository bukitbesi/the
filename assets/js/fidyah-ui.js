/* Fidyah calculator UI (BM + EN). Inputs map to TBBFidyah.calculate(); rice types follow the chosen state; state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBFidyah;
  var form = document.getElementById('fidyahForm');
  if (!X || !form) return;
  var ms = document.documentElement.lang === 'ms', lang = ms ? 'ms' : 'en';
  var fmt2 = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR' });
  var money = function (n) { return fmt2.format(n); };
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
  var TYPES = ms ? { local: 'Beras tempatan', import: 'Beras import / wangi', premium: 'Basmathi / premium', other: 'Beras lain' }
    : { local: 'Local rice', import: 'Imported / fragrant rice', premium: 'Basmathi / premium', other: 'Other rice' };
  var T = ms ? {
    rate: 'Kadar sehari', days: 'Hari puasa', units: 'Fidyah sehari', count: 'Jumlah fidyah (cupak)', qada: 'Puasa perlu diganti', total: 'Jumlah fidyah',
    sub: function (r) { return r.count + ' cupak × ' + money(r.perDay) + (r.qada ? ' · masih perlu qada ' + r.qada + ' hari' : ' · tiada qada'); },
    live: function (r) { return 'Fidyah ' + money(r.total) + '.'; }
  } : {
    rate: 'Rate per day', days: 'Days of fasting', units: 'Fidyah per day', count: 'Total fidyah (cupak)', qada: 'Fasts still to make up', total: 'Total fidyah',
    sub: function (r) { return r.count + ' cupak × ' + money(r.perDay) + (r.qada ? ' · still make up ' + r.qada + ' days' : ' · no qada'); },
    live: function (r) { return 'Fidyah ' + money(r.total) + '.'; }
  };
  function types(keep) {
    var s = X.STATES[f('state').value], sel = f('type'), old = keep !== undefined ? keep : sel.value;
    sel.textContent = '';
    s.rates.forEach(function (rate, i) {
      var o = document.createElement('option');
      o.value = i; o.textContent = (s.types ? TYPES[s.types[i]] + ' – ' : '') + money(rate);
      sel.appendChild(o);
    });
    sel.value = Math.min(s.rates.length - 1, Number(old) || 0);
    sel.disabled = s.rates.length < 2;
  }

  function render(writeHash) {
    $('fYears').hidden = f('reason').value === 'unable';
    var r = X.calculate({ days: f('days').value, years: f('years').value, reason: f('reason').value, state: f('state').value, type: f('type').value });
    $('fTotal').textContent = money(r.total);
    $('fSub').textContent = T.sub(r);
    rows($('fLines'), [[T.rate, money(r.perDay)], [T.days, r.days], [T.units, r.units], [T.count, r.count], [T.qada, r.qada], [T.total, money(r.total), 'total']]);
    $('fLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'fidyahPrint');
  f('state').addEventListener('change', function () { types(0); });
  var restored = fromHash(form, function (kv) { if (kv.state) { f('state').value = kv.state; types(kv.type); delete kv.type; } });
  if (restored || changed(form)) render(false);
})();
