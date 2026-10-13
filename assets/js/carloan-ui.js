/* Car loan calculator UI (EN + BM). Inputs map to TBBCarLoan.calculate(), including road tax and insurance; state is kept in the URL hash. */
(function () {
  'use strict';
  var C = window.TBBCarLoan;
  var form = document.getElementById('carForm');
  if (!C || !form) return;
  var ms = document.documentElement.lang === 'ms';
  var loc = ms ? 'ms-MY' : 'en-MY';
  var fmt = new Intl.NumberFormat(loc, { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 });
  var fmt2 = new Intl.NumberFormat(loc, { style: 'currency', currency: 'MYR' });
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  var T = ms ? {
    rate: { eir: 'Kadar faedah efektif (EIR) setahun', flat: 'Kadar rata (flat) setahun' },
    other: { eir: function (r) { return 'Bersamaan kadar rata ' + r.flat.toFixed(2) + '%'; }, flat: function (r) { return 'Bersamaan EIR ' + r.eir.toFixed(2) + '%'; } },
    settle: function (r, s) {
      return 'Selesai selepas ' + s.after + ' bulan: bayar ' + fmt2.format(s.amount) + ' (baki ansuran ' + fmt.format(s.remaining) + ', jimat ' + fmt.format(s.saved) + ').' +
        (s.extraVsReducing > 0 ? ' Rule of 78 mengenakan ' + fmt.format(s.extraVsReducing) + ' lebih daripada kaedah baki berkurangan.' : '');
    },
    live: function (r) { return 'Ansuran bulanan ' + fmt2.format(r.monthly) + '.' + (r.running ? ' Termasuk cukai jalan dan insurans: ' + fmt2.format(r.running.monthly) + ' sebulan.' : ''); }
  } : {
    rate: { eir: 'Effective interest rate (EIR) a year', flat: 'Flat rate a year' },
    other: { eir: function (r) { return 'Equal to a ' + r.flat.toFixed(2) + '% flat rate'; }, flat: function (r) { return 'Equal to ' + r.eir.toFixed(2) + '% EIR'; } },
    settle: function (r, s) {
      return 'Settling after ' + s.after + ' months: pay ' + fmt2.format(s.amount) + ' (instalments left ' + fmt.format(s.remaining) + ', you save ' + fmt.format(s.saved) + ').' +
        (s.extraVsReducing > 0 ? ' Rule of 78 costs ' + fmt.format(s.extraVsReducing) + ' more than the reducing-balance method.' : '');
    },
    live: function (r) { return 'Monthly instalment ' + fmt2.format(r.monthly) + '.' + (r.running ? ' With road tax and insurance: ' + fmt2.format(r.running.monthly) + ' a month.' : ''); }
  };

  function read() {
    var o = {};
    ['price', 'downPct', 'years', 'method', 'rate', 'settleAfter', 'cc', 'body', 'ncd'].forEach(function (k) { o[k] = f(k).value; });
    return o;
  }

  function render(writeHash) {
    var r = C.calculate(read());
    $('rateLabel').textContent = T.rate[r.method];
    $('kPay').textContent = fmt2.format(r.monthly);
    $('kLoan').textContent = fmt.format(r.loan);
    $('kTerm').textContent = r.years;
    $('kOther').textContent = T.other[r.method](r);
    $('kInterest').textContent = fmt.format(r.interest);
    $('kTotal').textContent = fmt.format(r.totalPaid);
    $('kDown').textContent = fmt.format(r.downPayment);
    $('kEir').textContent = r.eir.toFixed(2) + '%';
    $('kFlat').textContent = r.flat.toFixed(2) + '%';
    var run = r.running;
    $('kRun').hidden = !run;
    if (run) {
      $('kRoad').textContent = fmt2.format(run.roadTax);
      $('kIns').textContent = fmt2.format(run.insurance.total);
      $('kAll').textContent = fmt2.format(run.monthly);
    }
    $('kSettle').hidden = !r.settlement;
    $('kSettle').textContent = r.settlement ? T.settle(r, r.settlement) : '';
    $('kLive').textContent = T.live(r);
    var body = $('kYears');
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
    if (f('settleAfter').value !== f('settleAfter').defaultValue) $('carMore').open = true;
    return true;
  }

  // Switching method converts the rate, so the same loan keeps the same instalment.
  f('method').addEventListener('change', function () {
    var years = Number(f('years').value) || C.FACTS.maxYears, rate = Number(f('rate').value) || 0;
    f('rate').value = this.value === 'flat' ? C.eirToFlat(rate, years) : C.flatToEir(rate, years);
  });

  var frame = 0;
  var schedule = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
  form.addEventListener('input', schedule);
  form.addEventListener('change', schedule);
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  $('carPrint').addEventListener('click', function () { window.print(); });
  var restored = Array.prototype.some.call(form.elements, function (el) {
    if (!el.name) return false;
    return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
  });
  if (fromHash() || restored) render(false);
})();
