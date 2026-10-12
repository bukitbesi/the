(function (root) {
'use strict';
var FACTS = {
verified: '2026-10-12',
newRulesFrom: '2026-06-01', transitionUntil: '2027-03-31',
defaultRate: 4.5, defaultFlat: 2.5, maxYears: 9
};
var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
var num = function (v, d) { v = Number(v); return isFinite(v) && v >= 0 ? v : (d || 0); };
function annuity(loan, monthlyRate, n) {
if (!(loan > 0) || !(n > 0)) return 0;
return monthlyRate ? loan * monthlyRate / (1 - Math.pow(1 + monthlyRate, -n)) : loan / n;
}
function flatInstalment(loan, flatPct, years) {
var n = Math.round(num(years) * 12);
return n ? cents((num(loan) + num(loan) * num(flatPct) / 100 * num(years)) / n) : 0;
}
function eirInstalment(loan, eirPct, years) { return cents(annuity(num(loan), num(eirPct) / 1200, Math.round(num(years) * 12))); }
function flatToEir(flatPct, years) {
var n = Math.round(num(years) * 12), loan = 100000;
var target = (loan + loan * num(flatPct) / 100 * num(years)) / n;
if (!(flatPct > 0) || !n) return 0;
var lo = 0, hi = 1;
for (var i = 0; i < 100; i++) {
var mid = (lo + hi) / 2;
if (annuity(loan, mid / 12, n) > target) hi = mid; else lo = mid;
}
return Math.round(lo * 10000) / 100;
}
function eirToFlat(eirPct, years) {
var n = Math.round(num(years) * 12), loan = 100000;
if (!n) return 0;
return Math.round((annuity(loan, num(eirPct) / 1200, n) * n - loan) / (loan * num(years)) * 10000) / 100;
}
function balanceAfter(loan, eirPct, years, m) {
var r = num(eirPct) / 1200, n = Math.round(num(years) * 12), pay = annuity(loan, r, n);
if (!r) return Math.max(0, loan - pay * m);
return Math.max(0, loan * Math.pow(1 + r, m) - pay * (Math.pow(1 + r, m) - 1) / r);
}
function rule78Rebate(totalInterest, n, k) {
return n > 0 && k > 0 ? totalInterest * k * (k + 1) / (n * (n + 1)) : 0;
}
function calculate(input) {
var price = num(input.price);
var downPct = Math.min(100, num(input.downPct, 10));
var loan = cents(price * (1 - downPct / 100));
var years = Math.min(FACTS.maxYears, Math.max(1, Math.round(num(input.years, FACTS.maxYears))));
var n = years * 12;
var method = input.method === 'flat' ? 'flat' : 'eir';
var rate = num(input.rate, method === 'flat' ? FACTS.defaultFlat : FACTS.defaultRate);
var monthly = method === 'flat' ? flatInstalment(loan, rate, years) : eirInstalment(loan, rate, years);
var eir = method === 'flat' ? flatToEir(rate, years) : rate;
var flat = method === 'flat' ? rate : eirToFlat(rate, years);
var interest = method === 'flat' ? cents(loan * rate / 100 * years) : cents(monthly * n - loan);
var out = {
price: price, loan: loan, downPayment: cents(price - loan), years: years, months: n, method: method, rate: rate,
monthly: monthly, interest: Math.max(0, interest), totalPaid: cents(loan + Math.max(0, interest)), eir: eir, flat: flat,
schedule: []
};
for (var y = 1; y <= years; y++) {
var before = balanceAfter(loan, eir, years, (y - 1) * 12), after = y === years ? 0 : balanceAfter(loan, eir, years, y * 12);
out.schedule.push({ year: y, principal: cents(before - after), interest: cents(monthly * 12 - (before - after)), balance: cents(after) });
}
var settleAfter = Math.round(num(input.settleAfter));
if (settleAfter > 0 && settleAfter < n) {
var k = n - settleAfter, remaining = cents(monthly * k);
var fair = cents(balanceAfter(loan, eir, years, settleAfter));
var settlement = method === 'flat' ? cents(remaining - rule78Rebate(out.interest, n, k)) : fair;
out.settlement = {
after: settleAfter, monthsLeft: k, remaining: remaining, amount: settlement,
saved: cents(remaining - settlement), extraVsReducing: method === 'flat' ? cents(settlement - fair) : 0
};
}
return out;
}
var api = { FACTS: FACTS, flatInstalment: flatInstalment, eirInstalment: eirInstalment, flatToEir: flatToEir,
eirToFlat: eirToFlat, balanceAfter: balanceAfter, rule78Rebate: rule78Rebate, calculate: calculate };
if (typeof module === 'object' && module.exports) module.exports = api;
else root.TBBCarLoan = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
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
live: function (r) { return 'Ansuran bulanan ' + fmt2.format(r.monthly) + '.'; }
} : {
rate: { eir: 'Effective interest rate (EIR) a year', flat: 'Flat rate a year' },
other: { eir: function (r) { return 'Equal to a ' + r.flat.toFixed(2) + '% flat rate'; }, flat: function (r) { return 'Equal to ' + r.eir.toFixed(2) + '% EIR'; } },
settle: function (r, s) {
return 'Settling after ' + s.after + ' months: pay ' + fmt2.format(s.amount) + ' (instalments left ' + fmt.format(s.remaining) + ', you save ' + fmt.format(s.saved) + ').' +
(s.extraVsReducing > 0 ? ' Rule of 78 costs ' + fmt.format(s.extraVsReducing) + ' more than the reducing-balance method.' : '');
},
live: function (r) { return 'Monthly instalment ' + fmt2.format(r.monthly) + '.'; }
};
function read() {
var o = {};
['price', 'downPct', 'years', 'method', 'rate', 'settleAfter'].forEach(function (k) { o[k] = f(k).value; });
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
