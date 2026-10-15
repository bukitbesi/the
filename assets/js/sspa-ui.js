/* SSPA salary calculator UI (BM + EN). Inputs map to TBBSspa.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBSspa;
  var form = document.getElementById('sspaForm');
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
  var T = ms ? {
    base: function (r) { return r.mode === 'pension' ? 'Pencen bulanan asal' : 'Gaji pokok 30 November 2024'; }, p1: function (r) { return 'Fasa 1, 1 Dis 2024 (' + (r.floorUsed ? 'minimum RM240' : nf(X.FACTS.rates[r.group][0] * 100, 0) + '%') + ')'; },
    s1: 'Selepas fasa 1', kgt: 'KGT 2025', dec: 'Pada 31 Disember 2025', p2: function (r) { return 'Fasa 2, 1 Jan 2026 (' + nf(X.FACTS.rates[r.group][1] * 100, 0) + '%)'; },
    s2: function (r) { return r.mode === 'pension' ? 'Pencen baharu' : 'Gaji pokok baharu'; }, rise: 'Kenaikan SSPA sebulan', year: 'Kenaikan setahun',
    sub: function (r) { return '+' + money(r.rise) + ' sebulan (' + nf(r.risePct, 2) + '%)'; }, live: function (r) { return 'Gaji baharu ' + money(r.s2) + '.'; }
  } : {
    base: function (r) { return r.mode === 'pension' ? 'Original monthly pension' : 'Basic salary on 30 November 2024'; }, p1: function (r) { return 'Phase 1, 1 Dec 2024 (' + (r.floorUsed ? 'RM240 minimum' : nf(X.FACTS.rates[r.group][0] * 100, 0) + '%') + ')'; },
    s1: 'After phase 1', kgt: '2025 annual increment', dec: 'On 31 December 2025', p2: function (r) { return 'Phase 2, 1 Jan 2026 (' + nf(X.FACTS.rates[r.group][1] * 100, 0) + '%)'; },
    s2: function (r) { return r.mode === 'pension' ? 'New pension' : 'New basic salary'; }, rise: 'SSPA rise a month', year: 'Rise a year',
    sub: function (r) { return '+' + money(r.rise) + ' a month (' + nf(r.risePct, 2) + '%)'; }, live: function (r) { return 'New salary ' + money(r.s2) + '.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ basic: f('basic').value, group: f('group').value, kgt: f('kgt').value, mode: f('mode').value });
    $('fKgt').hidden = r.mode === 'pension';
    $('pNew').textContent = money(r.s2);
    $('pSub').textContent = T.sub(r);
    var list = [[T.base(r), money(r.base)], [T.p1(r), '+ ' + money(r.p1)], [T.s1, money(r.s1)]];
    if (r.kgt) list.push([T.kgt, '+ ' + money(r.kgt)], [T.dec, money(r.dec2025)]);
    list.push([T.p2(r), '+ ' + money(r.p2)], [T.s2(r), money(r.s2), 'total'], [T.rise, money(r.rise)], [T.year, money(r.yearly)]);
    rows($('pLines'), list);
    $('pLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'sspaPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
