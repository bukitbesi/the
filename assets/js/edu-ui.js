/* Education cost calculator UI (BM + EN). Inputs map to TBBEdu.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBEdu;
  var form = document.getElementById('eduForm');
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
    years: 'Tahun sebelum masuk universiti', today: 'Kos pada harga hari ini', total: 'Kos pada harga masa depan', need: 'Perlu ada pada hari pertama', grown: 'Simpanan sedia ada (bertambah)', gap: 'Kekurangan', monthly: 'Simpan sebulan', none: 'Tiada masa untuk menyimpan', done: 'Simpanan sudah mencukupi',
    sub: function (r) { return 'Jumlah ' + money(r.total) + ' untuk ' + r.study + ' tahun dari umur ' + r.startAge; },
    yr: function (x) { return 'Tahun ' + x.year + ' (umur ' + x.age + ')'; },
    live: function (r) { return r.monthly ? 'Simpan ' + money(r.monthly) + ' sebulan.' : ''; }
  } : {
    years: 'Years until university', today: 'Cost at today\'s prices', total: 'Cost at future prices', need: 'Needed on day one', grown: 'Existing savings (grown)', gap: 'Shortfall', monthly: 'Save a month', none: 'No time left to save', done: 'Savings already cover it',
    sub: function (r) { return 'Total ' + money(r.total) + ' for ' + r.study + ' years from age ' + r.startAge; },
    yr: function (x) { return 'Year ' + x.year + ' (age ' + x.age + ')'; },
    live: function (r) { return r.monthly ? 'Save ' + money(r.monthly) + ' a month.' : ''; }
  };

  function render(writeHash) {
    var r = X.calculate({ age: f('age').value, start: f('start').value, study: f('study').value, cost: f('cost').value, inflation: f('inflation').value, ret: f('ret').value, saved: f('saved').value });
    $('dMonthly').textContent = r.monthly === null ? '—' : money(r.monthly);
    $('dSub').textContent = T.sub(r);
    rows($('dLines'), [[T.years, r.years], [T.today, money(r.today)], [T.total, money(r.total)], [T.need, money(r.need)], [T.grown, '− ' + money(r.grown)], [T.gap, money(r.gap)],
      [T.monthly, r.monthly === null ? T.none : r.monthly === 0 ? T.done : money(r.monthly), 'total']]);
    var body = $('dYears');
    body.textContent = '';
    r.list.forEach(function (x) {
      var tr = body.insertRow(), th = document.createElement('th');
      th.scope = 'row'; th.textContent = T.yr(x); tr.appendChild(th);
      tr.insertCell().textContent = money(x.cost);
    });
    $('dLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'eduPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
