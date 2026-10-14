/* Fixed deposit calculator UI (BM + EN). Inputs map to TBBFd.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBFd;
  var form = document.getElementById('fdForm');
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
    maturity: 'Jumlah semasa matang', monthly: 'Faedah sebulan (jika dibayar bulanan)', renewed: function (r) { return 'Selepas ' + r.renew + ' kali diperbaharui'; },
    earned: 'Jumlah faedah diperbaharui', eff: 'Pulangan efektif setahun', real: 'Pulangan selepas inflasi',
    sub: function (r) { return r.months + ' bulan pada ' + nf(r.rate) + '% setahun · matang ' + money(r.maturity); },
    live: function (r) { return 'Faedah ' + money(r.interest) + '.'; }
  } : {
    maturity: 'Amount at maturity', monthly: 'Interest a month (if paid monthly)', renewed: function (r) { return 'After ' + r.renew + ' renewals'; },
    earned: 'Interest earned with renewals', eff: 'Effective yearly return', real: 'Return after inflation',
    sub: function (r) { return r.months + ' months at ' + nf(r.rate) + '% a year · matures at ' + money(r.maturity); },
    live: function (r) { return 'Interest ' + money(r.interest) + '.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ amount: f('amount').value, rate: f('rate').value, months: f('months').value, renew: f('renew').value, inflation: f('inflation').value });
    $('dInterest').textContent = money(r.interest);
    $('dSub').textContent = T.sub(r);
    var list = [[T.maturity, money(r.maturity), 'total'], [T.monthly, money(r.monthly)]];
    if (r.renew > 1) list.push([T.renewed(r), money(r.total)], [T.earned, money(r.earned)], [T.eff, nf(r.effective) + '%']);
    list.push([T.real, nf(r.real) + '%']);
    rows($('dLines'), list);
    $('dPidm').hidden = !r.overPidm;
    $('dOver').textContent = money(r.overPidm);
    $('dLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'fdPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
