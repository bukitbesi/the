/* EIS calculator UI (BM + EN). Inputs map to TBBEis.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBEis;
  var form = document.getElementById('eisForm');
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
    wage: 'Gaji andaian (siling RM6,000)', months: 'Tempoh elaun', total: 'Jumlah Elaun Mencari Pekerjaan', paid: 'Elaun diterima sebelum bekerja semula', unpaid: 'Baki elaun belum dibayar', era: function (r) { return 'Elaun Bekerja Semula Awal (' + (r.after ? '50' : '25') + '%)'; },
    rec: 'Jumlah diterima', mob: 'Elaun Bantuan Mobiliti', train: 'Yuran latihan maksimum', mo: function (n) { return 'Bulan ' + n; }, m: function (n) { return n + ' bulan'; },
    sub: function (r) { return r.months + ' bulan · bulan pertama ' + money(r.schedule[0].amount); },
    live: function (r) { return 'Jumlah elaun ' + money(r.total) + '.'; }
  } : {
    wage: 'Assumed wage (RM6,000 ceiling)', months: 'Allowance period', total: 'Total Job Search Allowance', paid: 'Allowance before re-employment', unpaid: 'Unpaid allowance left', era: function (r) { return 'Early Re-employment Allowance (' + (r.after ? '50' : '25') + '%)'; },
    rec: 'Total received', mob: 'Mobility Assistance Allowance', train: 'Maximum training fee', mo: function (n) { return 'Month ' + n; }, m: function (n) { return n + ' months'; },
    sub: function (r) { return r.months + ' months · first month ' + money(r.schedule[0].amount); },
    live: function (r) { return 'Total allowance ' + money(r.total) + '.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ wage: f('wage').value, months: f('months').value, newJob: f('newJob').value, lossAfter: f('lossAfter').value, far: f('far').value });
    $('eTotal').textContent = money(r.total);
    $('eSub').textContent = T.sub(r);
    var list = [[T.wage, money(r.wage)], [T.months, T.m(r.months)], [T.total, money(r.total), 'total']];
    if (r.newJob) list.push([T.paid, money(r.paid)], [T.unpaid, money(r.unpaid)], [T.era(r), money(r.era)], [T.rec, money(r.received), 'total']);
    if (r.mobility) list.push([T.mob, money(r.mobility)]);
    list.push([T.train, money(r.trainingCap)]);
    rows($('eLines'), list);
    rows($('eSchedule'), r.schedule.map(function (x) { return [T.mo(x.month) + ' (' + x.rate + '%)', money(x.amount)]; }));
    $('eLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'eisPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
