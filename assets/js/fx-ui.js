/* Currency converter UI (BM + EN). BNM rates are rendered into data-rates at build time (daily rebuild); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBFx;
  var form = document.getElementById('fxForm');
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
  var snap = null;
  try { snap = JSON.parse(form.getAttribute('data-rates') || 'null'); } catch (e) { snap = null; }
  var names = JSON.parse(form.getAttribute('data-names') || '{}');
  var dec = function (n) { var a = Math.abs(n); return a >= 100 ? 2 : a >= 1 ? 4 : 6; };
  var T = ms ? {
    rate: function (r) { return '1 ' + r.from + ' = ' + nf(r.rate, dec(r.rate)) + ' ' + r.to; }, inv: function (r) { return '1 ' + r.to + ' = ' + nf(r.inverse, dec(r.inverse)) + ' ' + r.from; },
    mid: 'Kadar tengah BNM', inverse: 'Songsang', offer: 'Kadar pengurup wang', gap: 'Beza dengan kadar BNM', costL: 'Kos tambahan anggaran',
    none: 'Kadar tidak tersedia', live: function (r) { return nf(r.amount, 2) + ' ' + r.from + ' = ' + nf(r.result, 2) + ' ' + r.to; }
  } : {
    rate: function (r) { return '1 ' + r.from + ' = ' + nf(r.rate, dec(r.rate)) + ' ' + r.to; }, inv: function (r) { return '1 ' + r.to + ' = ' + nf(r.inverse, dec(r.inverse)) + ' ' + r.from; },
    mid: 'BNM middle rate', inverse: 'Inverse', offer: "Money changer's rate", gap: 'Gap from the BNM rate', costL: 'Estimated extra cost',
    none: 'Rate not available', live: function (r) { return nf(r.amount, 2) + ' ' + r.from + ' = ' + nf(r.result, 2) + ' ' + r.to; }
  };
  $('fxSwap').addEventListener('click', function () { var a = f('from').value; f('from').value = f('to').value; f('to').value = a; render(true); });

  function render(writeHash) {
    var r = X.convert(snap, f('amount').value, f('from').value, f('to').value);
    if (!r) { $('xResult').textContent = '–'; $('xSub').textContent = T.none; rows($('xLines'), []); return; }
    $('xResult').textContent = nf(r.result, 2) + ' ' + r.to;
    $('xSub').textContent = (names[r.to] || r.to);
    var list = [[T.mid, T.rate(r)], [T.inverse, T.inv(r)]];
    var foreign = r.from !== 'MYR' ? r.from : r.to !== 'MYR' ? r.to : null, offered = Number(f('offer').value);
    if (foreign && offered > 0) {
      var s = X.spread(snap, foreign, offered), mid = X.perUnit(snap, foreign);
      list.push([T.offer, 'RM ' + nf(offered, 4)], [T.gap, (s >= 0 ? '+' : '') + nf(s, 2) + '%', 'total']);
      var units = r.from === foreign ? r.amount : r.result;
      list.push([T.costL, money(Math.abs(offered - mid) * units)]);
    }
    rows($('xLines'), list);
    $('xLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'fxPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
