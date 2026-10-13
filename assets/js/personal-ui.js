/* Personal loan calculator UI (EN + BM). Inputs map to TBBPersonalLoan.calculate(); state is kept in the URL hash. */
(function () {
  'use strict';
  var P = window.TBBPersonalLoan, C = window.TBBCarLoan;
  var form = document.getElementById('plForm');
  if (!P || !C || !form) return;
  var ms = document.documentElement.lang === 'ms', loc = ms ? 'ms-MY' : 'en-MY';
  var fmt = new Intl.NumberFormat(loc, { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 });
  var fmt2 = new Intl.NumberFormat(loc, { style: 'currency', currency: 'MYR' });
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  var T = ms ? {
    rate: { flat: 'Kadar rata (flat) setahun', eir: 'Kadar faedah efektif (EIR) setahun' },
    other: { flat: function (r) { return 'Bersamaan EIR ' + r.eir.toFixed(2) + '%'; }, eir: function (r) { return 'Bersamaan kadar rata ' + r.flat.toFixed(2) + '%'; } },
    live: function (r) { return 'Ansuran bulanan ' + fmt2.format(r.monthly) + '.'; }
  } : {
    rate: { flat: 'Flat rate a year', eir: 'Effective interest rate (EIR) a year' },
    other: { flat: function (r) { return 'Equal to ' + r.eir.toFixed(2) + '% EIR'; }, eir: function (r) { return 'Equal to a ' + r.flat.toFixed(2) + '% flat rate'; } },
    live: function (r) { return 'Monthly instalment ' + fmt2.format(r.monthly) + '.'; }
  };

  function render(writeHash) {
    var r = P.calculate({ amount: f('amount').value, years: f('years').value, method: f('method').value, rate: f('rate').value, stamp: f('stamp').value });
    $('plRateLabel').textContent = T.rate[r.method];
    $('pPay').textContent = fmt2.format(r.monthly);
    $('pAmt').textContent = fmt.format(r.amount);
    $('pTerm').textContent = r.years;
    $('pOther').textContent = T.other[r.method](r);
    $('pInterest').textContent = fmt.format(r.interest);
    $('pEir').textContent = r.eir.toFixed(2) + '%';
    $('pFlat').textContent = r.flat.toFixed(2) + '%';
    $('pStamp').textContent = fmt2.format(r.stamp);
    $('pReceived').textContent = fmt2.format(r.received);
    $('pCost').textContent = fmt.format(r.cost);
    $('pLive').textContent = T.live(r);
    var body = $('pYears');
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
    return true;
  }

  // Switching method converts the rate, so the same loan keeps the same instalment.
  f('method').addEventListener('change', function () {
    var years = Number(f('years').value) || 5, rate = Number(f('rate').value) || 0;
    f('rate').value = this.value === 'flat' ? C.eirToFlat(rate, years) : C.flatToEir(rate, years);
  });

  var frame = 0;
  var schedule = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
  form.addEventListener('input', schedule);
  form.addEventListener('change', schedule);
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  $('plPrint').addEventListener('click', function () { window.print(); });
  var restored = Array.prototype.some.call(form.elements, function (el) {
    if (!el.name) return false;
    return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
  });
  if (fromHash() || restored) render(false);
})();
