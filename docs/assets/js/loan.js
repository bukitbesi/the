(function (root) {
'use strict';
var FACTS = {
verified: '2026-10-12',
opr: 2.75, oprSince: '2025-07-09',
defaultRate: 4.2, maxTenure: 35, maxAge: 70,
sst: 0.08,
transferBands: [[100000, 0.01], [500000, 0.02], [1000000, 0.03], [Infinity, 0.04]],
loanDuty: 0.005,
legalBands: [[500000, 0.0125], [7500000, 0.01]], legalMin: 500,
firstHome: {
current: { cap: 500000, until: '2027-12-31' },
budget2027: { full: 500000, cap: 750000, from: '2027-01-01', until: '2030-12-31' }
}
};
var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
var num = function (v, d) { v = Number(v); return isFinite(v) && v >= 0 ? v : (d || 0); };
function banded(amount, bands) {
var tax = 0, lower = 0;
for (var i = 0; i < bands.length && amount > lower; i++) {
tax += (Math.min(amount, bands[i][0]) - lower) * bands[i][1];
lower = bands[i][0];
}
return tax;
}
function instalment(loan, ratePct, years) {
var n = Math.round(num(years) * 12), r = num(ratePct) / 1200;
loan = num(loan);
if (!(loan > 0) || !(n > 0)) return 0;
if (!r) return cents(loan / n);
return cents(loan * r / (1 - Math.pow(1 + r, -n)));
}
function amortise(loan, ratePct, years, extra) {
var r = num(ratePct) / 1200, pay = instalment(loan, ratePct, years), add = num(extra);
var balance = num(loan), months = 0, interest = 0, rows = [], yi = 0, yp = 0, n = Math.round(num(years) * 12);
while (balance > 0.005 && months < 1200) {
var i = cents(balance * r);
var p = months + 1 >= n ? balance : Math.min(balance, pay + add - i);
if (p <= 0) break;
balance = cents(balance - p); months++; interest += i; yi += i; yp += p;
if (months % 12 === 0 || balance <= 0.005) {
rows.push({ year: Math.ceil(months / 12), interest: cents(yi), principal: cents(yp), balance: Math.max(0, balance) });
yi = 0; yp = 0;
}
}
return { instalment: pay, months: months, interest: cents(interest), rows: rows };
}
function stampDutyTransfer(price) { return Math.round(banded(num(price), FACTS.transferBands)); }
function stampDutyLoan(loan) { return Math.round(num(loan) * FACTS.loanDuty); }
function legalFee(amount) {
amount = num(amount);
return amount > 0 ? cents(Math.max(FACTS.legalMin, banded(amount, FACTS.legalBands))) : 0;
}
function exemption(rule, price, loan) {
var mot = stampDutyTransfer(price), la = stampDutyLoan(loan);
if (rule === 'current' && price <= FACTS.firstHome.current.cap) return { mot: mot, loan: la };
if (rule === 'budget2027' && price <= FACTS.firstHome.budget2027.cap) {
var full = FACTS.firstHome.budget2027.full;
if (price <= full) return { mot: mot, loan: la };
var motOff = stampDutyTransfer(full) + (mot - stampDutyTransfer(full)) / 2;
var share = (full + (price - full) / 2) / price;
return { mot: Math.round(motOff), loan: Math.round(la * share) };
}
return { mot: 0, loan: 0 };
}
function calculate(input) {
var price = num(input.price);
var downPct = Math.min(100, num(input.downPct, 10));
var loan = cents(price * (1 - downPct / 100));
var rate = num(input.rate, FACTS.defaultRate);
var years = Math.min(FACTS.maxTenure, Math.max(1, Math.round(num(input.years, FACTS.maxTenure))));
var base = amortise(loan, rate, years, 0);
var extra = num(input.extra);
var fast = extra > 0 ? amortise(loan, rate, years, extra) : base;
var off = exemption(input.firstHome, price, loan);
var mot = stampDutyTransfer(price), la = stampDutyLoan(loan);
var legalSpa = legalFee(price), legalLoan = legalFee(loan);
var sst = cents((legalSpa + legalLoan) * FACTS.sst);
var costs = {
downPayment: cents(price - loan),
stampTransfer: mot - off.mot, stampLoan: la - off.loan, exempted: off.mot + off.loan,
legalSpa: legalSpa, legalLoan: legalLoan, sst: sst
};
costs.total = cents(costs.downPayment + costs.stampTransfer + costs.stampLoan + legalSpa + legalLoan + sst);
var income = num(input.income), commitments = num(input.commitments);
var dsrLimit = num(input.dsrLimit, 70) / 100;
var dsr = income > 0 ? Math.round((base.instalment + commitments) / income * 1000) / 10 : null;
var room = Math.max(0, income * dsrLimit - commitments);
var r = rate / 1200, n = years * 12;
var maxLoan = income > 0 ? Math.floor(r ? room * (1 - Math.pow(1 + r, -n)) / r : room * n) : null;
var age = num(input.age);
return {
price: price, loan: loan, rate: rate, years: years,
instalment: base.instalment, interest: base.interest, totalPaid: cents(loan + base.interest),
schedule: base.rows,
extra: extra, extraMonths: fast.months, extraInterest: fast.interest,
interestSaved: cents(base.interest - fast.interest), monthsSaved: base.months - fast.months,
rateUp25: instalment(loan, rate + 0.25, years), rateUp50: instalment(loan, rate + 0.5, years),
costs: costs, dsr: dsr, dsrLimit: dsrLimit * 100, maxLoan: maxLoan,
maxPrice: maxLoan == null ? null : Math.floor(maxLoan / Math.max(0.01, 1 - downPct / 100)),
endAge: age > 0 ? age + years : null, pastMaxAge: age > 0 && age + years > FACTS.maxAge
};
}
var api = { FACTS: FACTS, instalment: instalment, amortise: amortise, stampDutyTransfer: stampDutyTransfer,
stampDutyLoan: stampDutyLoan, legalFee: legalFee, exemption: exemption, calculate: calculate };
if (typeof module === 'object' && module.exports) module.exports = api;
else root.TBBLoan = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
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
