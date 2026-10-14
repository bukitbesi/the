/* Freelance rate calculator UI (BM + EN). Inputs map to TBBFreelance.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBFreelance;
  var form = document.getElementById('flForm');
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
    target: 'Pendapatan bersih setahun', exp: 'Kos perniagaan', epf: 'KWSP (i-Saraan / sukarela)', socso: 'PERKESO (SKSPS)', tax: 'Cukai pendapatan',
    revenue: 'Jualan diperlukan setahun', monthly: 'Invois sebulan', hours: 'Jam boleh caj setahun', hourly: 'Kadar sejam', daily: 'Kadar sehari (8 jam)',
    sub: function (r) { return money(r.daily) + ' sehari · ' + money(r.monthly) + ' sebulan'; },
    live: function (r) { return 'Caj sekurang-kurangnya ' + money(r.hourly) + ' sejam.'; }
  } : {
    target: 'Take-home a year', exp: 'Business expenses', epf: 'EPF (i-Saraan / voluntary)', socso: 'SOCSO (SKSPS)', tax: 'Income tax',
    revenue: 'Revenue needed a year', monthly: 'Billing a month', hours: 'Billable hours a year', hourly: 'Hourly rate', daily: 'Day rate (8 hours)',
    sub: function (r) { return money(r.daily) + ' a day · ' + money(r.monthly) + ' a month'; },
    live: function (r) { return 'Charge at least ' + money(r.hourly) + ' an hour.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ target: f('target').value, expenses: f('expenses').value, epf: f('epf').value, socso: f('socso').value, relief: f('relief').value, hours: f('hours').value, weeksOff: f('weeksOff').value });
    $('fHourly').textContent = money(r.hourly);
    $('fSub').textContent = T.sub(r);
    var list = [[T.target, money(r.target)], [T.exp, '+ ' + money(r.expenses)], [T.epf, '+ ' + money(r.epf)]];
    if (r.socso) list.push([T.socso, '+ ' + money(r.socso)]);
    list.push([T.tax, '+ ' + money(r.tax)], [T.revenue, money(r.revenue), 'total'], [T.monthly, money(r.monthly)], [T.hours, nf(r.billable, 0)],
      [T.hourly, money(r.hourly), 'total'], [T.daily, money(r.daily)]);
    rows($('fLines'), list);
    $('fLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'flPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
