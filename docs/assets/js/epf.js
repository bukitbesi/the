(function (root) {
'use strict';
var RULES = {
verified: '2026-10-10',
taxYear: 2026,
minWage: 1000,
socsoCeiling: 6000,
pcb: [
[5000, 0.01, -400, -800],
[20000, 0.03, -250, -650],
[35000, 0.06, 600, 600],
[50000, 0.11, 1500, 1500],
[70000, 0.19, 3700, 3700],
[100000, 0.25, 9400, 9400],
[400000, 0.26, 84400, 84400],
[600000, 0.28, 136400, 136400],
[2000000, 0.30, 528400, 528400]
],
tax: [
[0, 5000, 0], [5000, 20000, 0.01], [20000, 35000, 0.03], [35000, 50000, 0.06],
[50000, 70000, 0.11], [70000, 100000, 0.19], [100000, 400000, 0.25],
[400000, 600000, 0.26], [600000, 2000000, 0.28], [2000000, Infinity, 0.30]
],
relief: { self: 9000, spouse: 4000, child: 2000, epfCap: 4000 }
};
var cents = function (n) { return Math.round(n * 100) / 100; };
function epfWage(w) {
if (w <= 10) return 0;
if (w <= 5000) return Math.ceil(w / 20) * 20;
if (w <= 20000) return Math.ceil(w / 100) * 100;
return w;
}
function epf(w, age60, permanentResident) {
var base = epfWage(w);
var er = age60 ? (permanentResident ? (w > 5000 ? 0.06 : 0.065) : 0.04) : (w > 5000 ? 0.12 : 0.13);
var ee = age60 ? (permanentResident ? 0.055 : 0) : 0.11;
var employee = w > 20000 ? cents(w * ee) : Math.ceil(cents(base * ee));
var employer = w > 20000 ? Math.ceil(cents(w * (ee + er)) - 1e-9) - employee : Math.ceil(cents(base * er));
return {
employee: employee,
employer: cents(employer),
employeeRate: ee, employerRate: er
};
}
function perkesoMid(w) {
var capped = Math.min(w, RULES.socsoCeiling);
return Math.max(Math.ceil(capped / 100) * 100, 500) - 50;
}
function round5(amount) {
var steps = Math.round(amount * 100 * 1000) / 1000 / 5;
var floor = Math.floor(steps);
if (Math.abs(steps - floor - 0.5) < 1e-9) steps = floor % 2 ? floor : floor + 1;
else steps = Math.round(steps);
return cents(steps * 5 / 100);
}
function perkeso(w, age60, lindung, eisExempt) {
var mid = perkesoMid(w);
return {
socsoEmployee: age60 ? 0 : round5(mid * 0.005),
socsoEmployer: round5(mid * (age60 ? 0.0125 : 0.0175)),
eisEmployee: age60 || eisExempt ? 0 : round5(mid * 0.002),
eisEmployer: age60 || eisExempt ? 0 : round5(mid * 0.002),
lindung: lindung ? round5(mid * 0.0075) : 0
};
}
function bracket(p) {
for (var i = RULES.pcb.length - 1; i >= 0; i--) if (p > RULES.pcb[i][0]) return RULES.pcb[i];
return null;
}
function pcb(o, epfEmployee) {
var n = 11;
var y1 = o.salary;
var k1 = Math.min(epfEmployee, RULES.relief.epfCap);
var k2 = Math.min(k1, Math.max(0, (RULES.relief.epfCap - k1) / n));
var reliefs = RULES.relief.self + (o.status === 'spouse' ? RULES.relief.spouse : 0) +
RULES.relief.child * o.children + o.otherRelief;
var p = (y1 - k1) + (y1 - k2) * n - reliefs;
var b = bracket(p);
var annual = b ? (p - b[0]) * b[1] + (o.status === 'spouse' ? b[3] : b[2]) : 0;
var mtd = Math.max(0, annual) / (n + 1);
mtd = Math.floor(mtd * 100 + 1e-7) / 100;
mtd = Math.ceil(mtd * 20 - 1e-7) / 20;
if (mtd < 10) mtd = 0;
return {
chargeable: Math.max(0, p),
monthly: cents(mtd),
net: (function () {
var afterZakat = Math.max(0, mtd - o.zakat);
return cents(Math.ceil(afterZakat * 20 - 1e-9) / 20);
})(),
rate: b ? b[1] : 0
};
}
function annualTax(chargeable, status) {
var t = 0;
RULES.tax.forEach(function (r) { if (chargeable > r[0]) t += (Math.min(chargeable, r[1]) - r[0]) * r[2]; });
if (chargeable <= 35000) t -= status === 'spouse' ? 800 : 400;
return cents(Math.max(0, t));
}
function normalise(input) {
var num = function (v, min, max) {
v = Number(v);
if (!isFinite(v)) v = 0;
return Math.min(max, Math.max(min, v));
};
return {
salary: cents(num(input.salary, 0, 1000000)),
age60: !!input.age60,
age57: !!input.age57 && !input.age60,
permanentResident: !!input.permanentResident,
eisExempt: !!input.age57 && !input.age60 && !!input.eisExempt,
status: input.status === 'spouse' ? 'spouse' : (input.status === 'married' ? 'married' : 'single'),
children: Math.round(num(input.children, 0, 20)),
otherRelief: cents(num(input.otherRelief, 0, 1000000)),
zakat: cents(num(input.zakat, 0, 1000000)),
lindung: input.lindung !== false
};
}
function calculate(input) {
var o = normalise(input);
var e = epf(o.salary, o.age60, o.permanentResident);
var s = perkeso(o.salary, o.age60, o.lindung, o.eisExempt);
var t = pcb(o, e.employee);
var deductions = cents(e.employee + s.socsoEmployee + s.eisEmployee + s.lindung + t.net + o.zakat);
var employerCost = cents(o.salary + e.employer + s.socsoEmployer + s.eisEmployer);
return {
input: o,
valid: o.salary >= RULES.minWage,
epf: e, perkeso: s, pcb: t,
zakat: o.zakat,
deductions: deductions,
net: cents(o.salary - deductions),
employerCost: employerCost,
annual: {
gross: cents(o.salary * 12),
net: cents((o.salary - deductions) * 12),
epfTotal: cents((e.employee + e.employer) * 12),
tax: cents(Math.max(0, annualTax(t.chargeable, o.status) - o.zakat * 12))
}
};
}
var api = { RULES: RULES, calculate: calculate, epf: epf, perkeso: perkeso, round5: round5, annualTax: annualTax };
if (typeof module === 'object' && module.exports) module.exports = api;
else root.TBBSalary = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
(function (root) {
'use strict';
var S = root.TBBSalary || (typeof require === 'function' ? require('./salary-core.js') : null);
var DIVIDENDS = [
[2016, 5.70, null], [2017, 6.90, 6.40], [2018, 6.15, 5.90], [2019, 5.45, 5.00], [2020, 5.20, 4.90],
[2021, 6.10, 5.65], [2022, 5.35, 4.75], [2023, 5.50, 5.40], [2024, 6.30, 6.30], [2025, 6.15, 6.15]
];
var avg = function (col) {
var v = DIVIDENDS.map(function (d) { return d[col]; }).filter(function (x) { return x != null; });
return Math.round(v.reduce(function (s, x) { return s + x; }, 0) / v.length * 100) / 100;
};
var FACTS = {
verified: '2026-10-12',
latestYear: 2025, latest: 6.15, average10: avg(1), averageShariah: avg(2),
split: { persaraan: 0.75, sejahtera: 0.15, fleksibel: 0.10 },
ria: { basic: 390000, adequate: 650000, enhanced: 1300000, basicByYear: { 2026: 290000, 2027: 340000, 2028: 390000 } }
};
var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
var num = function (v, d) { v = Number(v); return isFinite(v) && v >= 0 ? v : (d || 0); };
function monthly(wage, ownRate) {
if (!(wage > 0)) return { employee: 0, employer: 0 };
var e = S.epf(wage, false);
var employee = ownRate > 0.11 ? Math.ceil(wage * ownRate) : e.employee;
return { employee: employee, employer: e.employer };
}
function project(input) {
var age = Math.floor(num(input.age, 30));
var retire = Math.min(60, Math.max(age + 1, Math.floor(num(input.retireAge, 60))));
var rate = num(input.dividend, FACTS.average10) / 100;
var raise = num(input.raise, 3) / 100;
var ownRate = num(input.ownRate, 11) / 100;
var topUp = num(input.topUp);
var inflation = num(input.inflation) / 100;
var wage = num(input.salary);
var acc = {
persaraan: num(input.persaraan),
sejahtera: num(input.sejahtera),
fleksibel: num(input.fleksibel)
};
var startBalance = acc.persaraan + acc.sejahtera + acc.fleksibel;
var years = [], totals = { employee: 0, employer: 0, topUp: 0, dividend: 0 };
for (var a = age; a < retire; a++) {
var c = monthly(wage, ownRate);
var perMonth = c.employee + c.employer + topUp;
var dividend = 0, contributed = 0;
var opening = acc.persaraan + acc.sejahtera + acc.fleksibel;
dividend += opening * rate;
for (var m = 1; m <= 12; m++) {
contributed += perMonth;
dividend += perMonth * rate * (12 - m) / 12;
}
['persaraan', 'sejahtera', 'fleksibel'].forEach(function (k) {
var own = acc[k] * rate;
var share = FACTS.split[k];
acc[k] += own + (contributed + (dividend - opening * rate)) * share;
});
totals.employee += c.employee * 12; totals.employer += c.employer * 12; totals.topUp += topUp * 12; totals.dividend += dividend;
years.push({ age: a + 1, salary: cents(wage), employee: cents(c.employee * 12), employer: cents(c.employer * 12),
topUp: cents(topUp * 12), dividend: cents(dividend), balance: cents(acc.persaraan + acc.sejahtera + acc.fleksibel) });
wage = wage * (1 + raise);
}
var final = cents(acc.persaraan + acc.sejahtera + acc.fleksibel);
var real = cents(final / Math.pow(1 + inflation, retire - age));
var tier = real >= FACTS.ria.enhanced ? 'enhanced' : real >= FACTS.ria.adequate ? 'adequate' : real >= FACTS.ria.basic ? 'basic' : 'below';
return {
age: age, retireAge: retire, rate: rate, years: years, start: cents(startBalance), final: final, real: real, inflation: inflation,
accounts: { persaraan: cents(acc.persaraan), sejahtera: cents(acc.sejahtera), fleksibel: cents(acc.fleksibel) },
totals: { employee: cents(totals.employee), employer: cents(totals.employer), topUp: cents(totals.topUp), dividend: cents(totals.dividend) },
firstYearDividend: years.length ? years[0].dividend : 0,
monthlyFor20Years: cents(final / 240), realMonthlyFor20Years: cents(real / 240),
tier: tier, gapToBasic: cents(Math.max(0, FACTS.ria.basic - real))
};
}
function dividendOn(balance, ratePct) { return cents(num(balance) * num(ratePct) / 100); }
var api = { FACTS: FACTS, DIVIDENDS: DIVIDENDS, monthly: monthly, project: project, dividendOn: dividendOn };
if (typeof module === 'object' && module.exports) module.exports = api;
else root.TBBEpf = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
(function () {
'use strict';
var E = window.TBBEpf;
var form = document.getElementById('epfForm');
if (!E || !form) return;
var ms = document.documentElement.lang === 'ms';
var fmt = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 });
var fmt2 = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR' });
var $ = function (id) { return document.getElementById(id); };
var f = function (n) { return form.elements[n]; };
var TIER = ms ? {
below: function (r) { return 'Di bawah Simpanan Asas RM390,000. Kurang ' + fmt.format(r.gapToBasic) + '.'; },
basic: function () { return 'Mencapai tahap Asas (RM390,000).'; },
adequate: function () { return 'Mencapai tahap Mencukupi (RM650,000).'; },
enhanced: function () { return 'Mencapai tahap Dipertingkat (RM1.3 juta).'; },
live: function (r) { return 'Anggaran simpanan pada umur ' + r.retireAge + ': ' + fmt.format(r.final) + '.'; }
} : {
below: function (r) { return 'Below the RM390,000 Basic Savings level by ' + fmt.format(r.gapToBasic) + '.'; },
basic: function () { return 'Reaches the Basic level (RM390,000).'; },
adequate: function () { return 'Reaches the Adequate level (RM650,000).'; },
enhanced: function () { return 'Reaches the Enhanced level (RM1.3 million).'; },
live: function (r) { return 'Projected savings at ' + r.retireAge + ': ' + fmt.format(r.final) + '.'; }
};
function read() {
var o = {};
['age', 'retireAge', 'salary', 'raise', 'persaraan', 'sejahtera', 'fleksibel', 'ownRate', 'topUp', 'inflation'].forEach(function (k) { o[k] = f(k).value; });
o.dividend = f('divPreset').value === 'custom' ? f('dividend').value : f('divPreset').value;
return o;
}
function render(writeHash) {
$('divCustom').hidden = f('divPreset').value !== 'custom';
var input = read();
var r = E.project(input);
$('eFinal').textContent = fmt.format(r.final);
$('eAge').textContent = r.retireAge;
$('eMonthly').textContent = fmt.format(r.monthlyFor20Years);
$('eReal').textContent = fmt.format(r.real);
$('eRealMonthly').textContent = fmt.format(r.realMonthlyFor20Years);
$('ePersaraan').textContent = fmt.format(r.accounts.persaraan);
$('eSejahtera').textContent = fmt.format(r.accounts.sejahtera);
$('eFleksibel').textContent = fmt.format(r.accounts.fleksibel);
$('eStart').textContent = fmt.format(r.start);
$('eEmployee').textContent = fmt.format(r.totals.employee);
$('eEmployer').textContent = fmt.format(r.totals.employer);
$('eTopUp').textContent = fmt.format(r.totals.topUp);
$('eDividend').textContent = fmt.format(r.totals.dividend);
$('eFirstDiv').textContent = fmt2.format(r.firstYearDividend);
$('rowTopUp').hidden = !r.totals.topUp;
$('eTier').textContent = TIER[r.tier](r);
$('eBar').style.width = Math.min(100, r.real / E.FACTS.ria.enhanced * 100).toFixed(1) + '%';
$('eLive').textContent = TIER.live(r);
var body = $('eYears');
body.textContent = '';
r.years.forEach(function (y) {
var tr = body.insertRow(), th = document.createElement('th');
th.scope = 'row'; th.textContent = y.age; tr.appendChild(th);
[y.salary, y.employee + y.employer + y.topUp, y.dividend, y.balance].forEach(function (v) {
tr.insertCell().textContent = fmt.format(v);
});
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
if (['persaraan', 'sejahtera', 'fleksibel', 'ownRate', 'topUp', 'inflation'].some(function (k) { return f(k).value !== f(k).defaultValue; })) $('epfMore').open = true;
return true;
}
var frame = 0;
var schedule = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
form.addEventListener('input', schedule);
form.addEventListener('change', schedule);
form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
$('epfPrint').addEventListener('click', function () { window.print(); });
var restored = Array.prototype.some.call(form.elements, function (el) {
if (!el.name) return false;
return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
});
if (fromHash() || restored) render(false);
})();
