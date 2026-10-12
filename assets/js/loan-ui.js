/* Home loan calculator UI (EN + BM). Inputs map to TBBLoan.calculate(); state is kept in the URL hash. */
(function () {
  'use strict';
  var L = window.TBBLoan;
  var form = document.getElementById('loanForm');
  if (!L || !form) return;
  var ms = document.documentElement.lang === 'ms';
  var loc = ms ? 'ms-MY' : 'en-MY';
  var fmt = new Intl.NumberFormat(loc, { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 });
  var fmt2 = new Intl.NumberFormat(loc, { style: 'currency', currency: 'MYR' });
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  var span = function (m) { var y = Math.floor(m / 12), r = m % 12; return ms ? y + ' tahun ' + r + ' bulan' : y + ' years ' + r + ' months'; };
  var T = ms ? {
    saved: function (r) { return 'Bayaran tambahan ' + fmt.format(r.extra) + ' sebulan menjimatkan ' + fmt.format(r.interestSaved) + ' faedah dan selesai ' + span(r.monthsSaved) + ' lebih awal.'; },
    dsr: function (r) { return 'DSR anda ' + r.dsr + '%. Pada had ' + r.dsrLimit + '%, pinjaman maksimum kira-kira ' + fmt.format(r.maxLoan) + ' (rumah sekitar ' + fmt.format(r.maxPrice) + ').'; },
    dsrHigh: ' Melebihi had biasa bank.',
    age: function (r) { return 'Pinjaman tamat pada umur ' + r.endAge + '. Kebanyakan bank menghadkan sehingga umur 70; pilih tempoh lebih pendek.'; },
    live: function (r) { return 'Ansuran bulanan ' + fmt2.format(r.instalment) + '.'; }
  } : {
    saved: function (r) { return 'Paying ' + fmt.format(r.extra) + ' extra a month saves ' + fmt.format(r.interestSaved) + ' in interest and clears the loan ' + span(r.monthsSaved) + ' early.'; },
    dsr: function (r) { return 'Your DSR is ' + r.dsr + '%. At a ' + r.dsrLimit + '% limit you could borrow about ' + fmt.format(r.maxLoan) + ' (a home of about ' + fmt.format(r.maxPrice) + ').'; },
    dsrHigh: ' That is above most banks\' limit.',
    age: function (r) { return 'The loan ends at age ' + r.endAge + '. Most banks cap tenure at age 70; choose a shorter term.'; },
    live: function (r) { return 'Monthly instalment ' + fmt2.format(r.instalment) + '.'; }
  };

  function read() {
    var o = {};
    ['price', 'downPct', 'rate', 'years', 'extra', 'firstHome', 'income', 'commitments', 'dsrLimit', 'age'].forEach(function (k) { o[k] = f(k).value; });
    return o;
  }

  function render(writeHash) {
    var r = L.calculate(read()), c = r.costs;
    $('lPay').textContent = fmt2.format(r.instalment);
    $('lLoan').textContent = fmt.format(r.loan);
    $('lTerm').textContent = r.years;
    $('lInterest').textContent = fmt.format(r.interest);
    $('lTotal').textContent = fmt.format(r.totalPaid);
    $('lUp25').textContent = fmt2.format(r.rateUp25);
    $('lUp50').textContent = fmt2.format(r.rateUp50);
    $('lSaved').hidden = !(r.extra > 0 && r.monthsSaved > 0);
    $('lSaved').textContent = r.extra > 0 ? T.saved(r) : '';
    $('cDown').textContent = fmt.format(c.downPayment);
    $('cMot').textContent = fmt.format(c.stampTransfer);
    $('cLoanDuty').textContent = fmt.format(c.stampLoan);
    $('cLegalSpa').textContent = fmt.format(c.legalSpa);
    $('cLegalLoan').textContent = fmt.format(c.legalLoan);
    $('cSst').textContent = fmt.format(c.sst);
    $('cTotal').textContent = fmt.format(c.total);
    $('rowExempt').hidden = !c.exempted;
    $('cExempt').textContent = fmt.format(c.exempted);
    var dsr = $('lDsr');
    dsr.hidden = r.dsr == null;
    dsr.textContent = r.dsr == null ? '' : T.dsr(r) + (r.dsr > r.dsrLimit ? T.dsrHigh : '');
    $('lAge').hidden = !r.pastMaxAge;
    $('lAge').textContent = r.pastMaxAge ? T.age(r) : '';
    $('lLive').textContent = T.live(r);
    var body = $('lYears');
    body.textContent = '';
    r.schedule.forEach(function (y) {
      var tr = body.insertRow(), th = document.createElement('th');
      th.scope = 'row'; th.textContent = y.year; tr.appendChild(th);
      [y.principal, y.interest, y.balance].forEach(function (v) { tr.insertCell().textContent = fmt.format(v); });
    });
    if (writeHash) {
      var parts = [];
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name) return;
        var d = el.tagName === 'SELECT' ? (el.querySelector('option[selected]') || el.options[0]).value : el.defaultValue;
        if (el.value !== d) parts.push(el.name + '=' + encodeURIComponent(el.value));
      });
      history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
    }
  }

  function fromHash() {
    if (location.hash.length < 2) return false;
    location.hash.slice(1).split('&').forEach(function (kv) {
      var i = kv.indexOf('='), el = form.elements[kv.slice(0, i)];
      if (el && el.name) el.value = decodeURIComponent(kv.slice(i + 1));
    });
    if (['extra', 'firstHome', 'income', 'commitments', 'dsrLimit', 'age'].some(function (k) {
      var el = f(k);
      return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
    })) $('loanMore').open = true;
    return true;
  }

  var frame = 0;
  var schedule = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
  form.addEventListener('input', schedule);
  form.addEventListener('change', schedule);
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  $('loanPrint').addEventListener('click', function () { window.print(); });
  var restored = Array.prototype.some.call(form.elements, function (el) {
    if (!el.name) return false;
    return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
  });
  if (fromHash() || restored) render(false);
})();
