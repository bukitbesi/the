/* Retirement savings calculator UI (BM + EN). Inputs map to TBBNestEgg.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBNestEgg;
  var form = document.getElementById('nestForm');
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
    years: 'Tahun sebelum bersara', first: 'Perbelanjaan sebulan semasa bersara', need: 'Simpanan diperlukan semasa bersara', proj: 'Simpanan dijangka semasa bersara', gap: 'Kekurangan', extra: 'Simpanan tambahan sebulan', lasts: 'Wang bertahan hingga', today: 'Diperlukan (nilai hari ini)',
    beyond: function (a) { return 'Melepasi umur ' + a; }, age: function (a) { return 'Umur ' + nf(a, 1); }, none: 'Tiada masa untuk menyimpan',
    sub: function (r) { return r.gap ? 'Dijangka ' + money(r.projected) + ': kurang ' + money(r.gap) : 'Dijangka ' + money(r.projected) + ': mencukupi'; },
    live: function (r) { return 'Perlu ' + money(r.need) + ' semasa bersara.'; }
  } : {
    years: 'Years until retirement', first: 'Monthly expenses at retirement', need: 'Savings needed at retirement', proj: 'Projected savings at retirement', gap: 'Shortfall', extra: 'Extra saving a month', lasts: 'Money lasts until', today: 'Needed (in today\'s money)',
    beyond: function (a) { return 'Beyond age ' + a; }, age: function (a) { return 'Age ' + nf(a, 1); }, none: 'No time left to save',
    sub: function (r) { return r.gap ? 'Projected ' + money(r.projected) + ': short by ' + money(r.gap) : 'Projected ' + money(r.projected) + ': enough'; },
    live: function (r) { return 'You need ' + money(r.need) + ' at retirement.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ age: f('age').value, retire: f('retire').value, until: f('until').value, expense: f('expense').value, inflation: f('inflation').value, pre: f('pre').value, post: f('post').value, saved: f('saved').value, monthly: f('monthly').value });
    $('nNeed').textContent = money(r.need);
    $('nSub').textContent = T.sub(r);
    rows($('nLines'), [[T.years, r.years], [T.first, money(r.first)], [T.need, money(r.need), 'total'], [T.today, money(r.needToday)], [T.proj, money(r.projected)], [T.gap, money(r.gap)],
      [T.extra, r.extra === null ? T.none : money(r.extra), 'total'], [T.lasts, r.enough ? T.beyond(r.until) : T.age(r.runsOutAge)]]);
    $('nLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'nestPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
