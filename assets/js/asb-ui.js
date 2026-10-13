/* ASB dividend calculator UI (EN + BM). Inputs map to TBBAsb; state is kept in the URL hash. */
(function () {
  'use strict';
  var A = window.TBBAsb;
  var form = document.getElementById('asbForm');
  if (!A || !form) return;
  var ms = document.documentElement.lang === 'ms';
  var loc = ms ? 'ms-MY' : 'en-MY';
  var fmt = new Intl.NumberFormat(loc, { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 });
  var fmt2 = new Intl.NumberFormat(loc, { style: 'currency', currency: 'MYR' });
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  var T = ms ? {
    exact: 'Dikira daripada baki terendah bulanan yang anda masukkan.',
    limit: 'Simpanan bulanan berhenti apabila pelaburan anda mencecah had RM200,000.',
    net: function (x) { return x.net >= 0 ? 'Untung bersih ' + fmt.format(x.net) : 'Rugi bersih ' + fmt.format(-x.net); },
    live: function (d) { return 'Dividen setahun ' + fmt2.format(d) + '.'; }
  } : {
    exact: 'Worked out from the monthly lowest balances you entered.',
    limit: 'Monthly saving stops once your investment reaches the RM200,000 limit.',
    net: function (x) { return x.net >= 0 ? 'Net gain ' + fmt.format(x.net) : 'Net loss ' + fmt.format(-x.net); },
    live: function (d) { return 'Dividend for the year ' + fmt2.format(d) + '.'; }
  };

  function exactMins() {
    var mins = [], any = false;
    for (var i = 1; i <= 12; i++) {
      var v = f('m' + i).value;
      if (v !== '') any = true;
      mins.push(Number(v) || 0);
    }
    return any ? mins : null;
  }

  function render(writeHash) {
    var rate = Number(f('rate').value) || 0;
    var r = A.project({ start: f('start').value, monthly: f('monthly').value, timing: f('timing').value, rate: rate, years: f('years').value });
    var mins = exactMins(), d = mins ? A.dividend(mins, rate) : { amount: r.firstDividend, average: r.firstAverage };
    $('aPay').textContent = fmt2.format(d.amount);
    $('aAvg').textContent = fmt.format(d.average);
    $('aRate').textContent = rate.toFixed(2);
    $('aExact').hidden = !mins;
    $('aExact').textContent = mins ? T.exact : '';
    $('aLimit').hidden = !r.limitReached;
    $('aLimit').textContent = r.limitReached ? T.limit : '';
    $('aYearsN').textContent = r.years;
    $('aYearsN2').textContent = r.years;
    $('aDeposits').textContent = fmt.format(r.start + r.totalDeposits);
    $('aDivs').textContent = fmt.format(r.totalDividends);
    $('aFinal').textContent = fmt.format(r.final);
    var body = $('aYears');
    body.textContent = '';
    r.rows.forEach(function (y) {
      var tr = body.insertRow(), th = document.createElement('th');
      th.scope = 'row'; th.textContent = y.year; tr.appendChild(th);
      [y.deposits, y.dividend, y.balance].forEach(function (v) { tr.insertCell().textContent = fmt.format(v); });
    });
    var x = A.financing({ amount: f('finAmount').value, rate: f('finRate').value, years: f('finYears').value, divRate: rate });
    $('fPay').textContent = fmt2.format(x.monthly);
    $('fInterest').textContent = fmt.format(x.interest);
    $('fDiv').textContent = fmt.format(x.yearlyDividend);
    $('fDivs').textContent = fmt.format(x.dividends);
    $('fNet').textContent = T.net(x);
    $('fBreak').textContent = x.breakEven.toFixed(2) + '%';
    $('aLive').textContent = T.live(d.amount);
    if (writeHash) {
      var parts = [];
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name) return;
        var def = el.tagName === 'SELECT' ? (el.querySelector('option[selected]') || el.options[0]).value : el.defaultValue;
        if (el.value !== def) parts.push(el.name + '=' + encodeURIComponent(el.value));
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
    if (exactMins()) $('asbExactBox').open = true;
    if (['finAmount', 'finRate', 'finYears'].some(function (n) { return f(n).value !== f(n).defaultValue; })) $('asbFinBox').open = true;
    return true;
  }

  // A preset fills the rate box; typing a rate switches the preset to "custom".
  f('rateSel').addEventListener('change', function () { if (this.value !== 'custom') f('rate').value = this.value; });
  f('rate').addEventListener('input', function () {
    var match = Array.prototype.some.call(f('rateSel').options, function (o) { return o.value === f('rate').value; });
    f('rateSel').value = match ? f('rate').value : 'custom';
  });

  var frame = 0;
  var schedule = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
  form.addEventListener('input', schedule);
  form.addEventListener('change', schedule);
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  $('asbPrint').addEventListener('click', function () { window.print(); });
  var restored = Array.prototype.some.call(form.elements, function (el) {
    if (!el.name) return false;
    return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
  });
  if (fromHash() || restored) render(false);
})();
