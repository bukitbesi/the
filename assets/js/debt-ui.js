/* Debt consolidation calculator UI (BM + EN). Inputs map to TBBDebt.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBDebt;
  var form = document.getElementById('debtForm');
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
  var T = ms ? {
    now: 'Bayar seperti sekarang', loan: 'Pinjaman penyatuan', monthly: 'Bayaran bulanan', interest: 'Faedah', months: 'Tempoh', stamp: 'Duti setem 0.5%', eir: 'Kadar efektif (EIR)',
    never: 'Tidak akan selesai', mo: function (n) { return n === Infinity ? T.never : n + ' bulan'; },
    save: 'Penjimatan', lose: 'Kos tambahan', loanHead: 'Ansuran pinjaman yang menyelesaikan hutang',
    sub: function (r) { return r.never ? 'Hutang semasa tidak akan selesai dengan bayaran ini' : r.saving >= 0 ? 'Bayaran bulanan ' + money(r.monthly) + ' selama ' + r.years + ' tahun' : 'Menyatukan hutang lebih mahal daripada bayaran semasa anda'; },
    live: function (r) { return r.saving === Infinity ? 'Hutang semasa tidak akan selesai dengan bayaran ini.' : (r.saving >= 0 ? 'Jimat ' : 'Kos tambahan ') + money(Math.abs(r.saving)) + '.'; }
  } : {
    now: 'Keep paying as now', loan: 'Consolidation loan', monthly: 'Monthly payment', interest: 'Interest', months: 'Time to clear', stamp: 'Stamp duty 0.5%', eir: 'Effective rate (EIR)',
    never: 'Never cleared', mo: function (n) { return n === Infinity ? T.never : n + ' months'; },
    save: 'You save', lose: 'Extra cost', loanHead: 'Loan instalment that clears the debt',
    sub: function (r) { return r.never ? 'Your current debts never clear at these payments' : r.saving >= 0 ? 'Monthly payment ' + money(r.monthly) + ' for ' + r.years + ' years' : 'Consolidating costs more than your current payments'; },
    live: function (r) { return r.saving === Infinity ? 'Your current debts never clear at these payments.' : (r.saving >= 0 ? 'You save ' : 'Extra cost ') + money(Math.abs(r.saving)) + '.'; }
  };
  function cmp(body, r) {
    body.textContent = '';
    [[T.monthly, money(r.nowMonthly), money(r.monthly)], [T.interest, r.never ? '∞' : money(r.nowInterest), money(r.loanInterest)],
      [T.stamp, '–', money(r.stamp)], [T.months, T.mo(r.nowMonths), T.mo(r.months)], [T.eir, '', nf(r.eir) + '%']].forEach(function (x) {
      var tr = body.insertRow(), th = document.createElement('th');
      th.scope = 'row'; th.textContent = x[0]; tr.appendChild(th);
      tr.insertCell().textContent = x[1]; tr.insertCell().textContent = x[2];
    });
  }

  function render(writeHash) {
    var debts = [1, 2, 3].map(function (i) { return { balance: f('b' + i).value, rate: f('r' + i).value, payment: f('p' + i).value }; });
    var r = X.calculate({ debts: debts, rate: f('rate').value, years: f('years').value, method: f('method').value });
    $('dHead').textContent = r.never ? T.loanHead : r.saving >= 0 ? T.save : T.lose;
    $('dSaving').textContent = r.never ? money(r.monthly) : money(Math.abs(r.saving));
    $('dSub').textContent = T.sub(r);
    cmp($('dLines'), r);
    $('dNever').hidden = !r.never;
    $('dLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'debtPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
