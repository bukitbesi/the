/* Employer cost calculator UI (BM + EN). Inputs map to TBBEmployer.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBEmployer;
  var form = document.getElementById('empForm');
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
    wages: 'Gaji dan elaun tetap', epf: function (r) { return 'KWSP majikan (' + nf(r.epfRate * 100) + '%)'; }, socso: 'PERKESO majikan', eis: 'SIP (EIS) majikan',
    hrd: function (r) { return 'Levi HRD Corp (' + nf(r.hrdRate * 100, 1) + '%)'; }, total: 'Kos sebulan', bonus: 'Bonus', bonusEpf: 'KWSP atas bonus', yearly: 'Kos setahun',
    eeEpf: 'KWSP pekerja', eeSocso: 'PERKESO pekerja', eeEis: 'SIP pekerja', net: 'Gaji sebelum PCB',
    sub: function (r) { return money(r.onTop) + ' (' + nf(r.onTopPct, 1) + '%) di atas gaji · ' + money(r.yearly) + ' setahun'; },
    live: function (r) { return 'Kos majikan ' + money(r.monthly) + ' sebulan.'; }
  } : {
    wages: 'Wages and fixed allowances', epf: function (r) { return 'Employer EPF (' + nf(r.epfRate * 100) + '%)'; }, socso: 'Employer SOCSO', eis: 'Employer EIS',
    hrd: function (r) { return 'HRD Corp levy (' + nf(r.hrdRate * 100, 1) + '%)'; }, total: 'Cost a month', bonus: 'Bonus', bonusEpf: 'EPF on the bonus', yearly: 'Cost a year',
    eeEpf: 'Employee EPF', eeSocso: 'Employee SOCSO', eeEis: 'Employee EIS', net: 'Pay before PCB',
    sub: function (r) { return money(r.onTop) + ' (' + nf(r.onTopPct, 1) + '%) on top of pay · ' + money(r.yearly) + ' a year'; },
    live: function (r) { return 'Employer cost ' + money(r.monthly) + ' a month.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ salary: f('salary').value, allowances: f('allowances').value, hrd: f('hrd').value, foreign: f('foreign').value, age60: f('age60').value, bonus: f('bonus').value });
    $('eTotal').textContent = money(r.monthly);
    $('eSub').textContent = T.sub(r);
    var list = [[T.wages, money(r.wages)], [T.epf(r), money(r.epf)], [T.socso, money(r.socso)], [T.eis, money(r.eis)]];
    if (r.hrd) list.push([T.hrd(r), money(r.hrd)]);
    list.push([T.total, money(r.monthly), 'total']);
    if (r.bonus) list.push([T.bonus, money(r.bonus)], [T.bonusEpf, money(r.bonusEpf)]);
    list.push([T.yearly, money(r.yearly), 'total']);
    rows($('eLines'), list);
    rows($('eEmployee'), [[T.eeEpf, '− ' + money(r.employeeEpf)], [T.eeSocso, '− ' + money(r.employeeSocso)], [T.eeEis, '− ' + money(r.employeeEis)], [T.net, money(r.takeHomeBeforeTax), 'total']]);
    $('eLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'empPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
