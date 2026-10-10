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
(function () {
'use strict';
var S = window.TBBSalary;
var form = document.getElementById('salaryForm');
if (!S || !form) return;
var lang = document.documentElement.lang === 'ms' ? 'ms' : 'en';
var fmt = new Intl.NumberFormat(lang === 'ms' ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR' });
var $ = function (id) { return document.getElementById(id); };
var f = function (name) { return form.elements[name]; };
var TEXT = {
en: {
min: 'Enter a monthly salary of at least RM1,000.',
live: function (r) { return 'Take-home pay ' + fmt.format(r.net) + ' a month.'; },
zero: 'No PCB is deducted: your estimated chargeable income is below the level where monthly tax reaches RM10.',
tax: function (r) { return 'Estimated chargeable income ' + fmt.format(r.pcb.chargeable) + ' a year; top tax rate ' + Math.round(r.pcb.rate * 100) + '%.'; },
copied: 'Link copied', copy: 'Copy link to this result'
},
ms: {
min: 'Masukkan gaji bulanan sekurang-kurangnya RM1,000.',
live: function (r) { return 'Gaji bersih ' + fmt.format(r.net) + ' sebulan.'; },
zero: 'Tiada PCB dipotong: anggaran pendapatan bercukai anda di bawah paras PCB bulanan RM10.',
tax: function (r) { return 'Anggaran pendapatan bercukai ' + fmt.format(r.pcb.chargeable) + ' setahun; kadar cukai tertinggi ' + Math.round(r.pcb.rate * 100) + '%.'; },
copied: 'Pautan disalin', copy: 'Salin pautan keputusan ini'
}
}[lang];
function read() {
return {
salary: f('salary').value,
age60: f('age').value === '60',
age57: f('age').value === '57',
permanentResident: f('residency').value === 'pr',
eisExempt: f('eisExempt').checked,
status: f('status').value,
children: f('children').value,
otherRelief: f('otherRelief').value,
zakat: f('zakat').value,
lindung: f('lindung').checked
};
}
function set(id, value) { $(id).textContent = fmt.format(value); }
function render(writeHash) {
var input = read();
f('eisExempt').disabled = !input.age57;
if (!input.age57) f('eisExempt').checked = false;
input.eisExempt = f('eisExempt').checked;
var r = S.calculate(input);
var err = $('salaryError');
f('salary').setAttribute('aria-invalid', r.valid ? 'false' : 'true');
err.hidden = r.valid;
err.textContent = r.valid ? '' : TEXT.min;
if (!r.valid) {
Array.prototype.forEach.call($('results').querySelectorAll('output,td'), function (el) { el.textContent = '–'; });
$('rNote').textContent = '';
return;
}
set('rNet', r.net); set('rNetYear', r.annual.net); set('rGross', r.input.salary);
set('rEpf', r.epf.employee); set('rSocso', r.perkeso.socsoEmployee); set('rEis', r.perkeso.eisEmployee);
set('rLindung', r.perkeso.lindung); set('rPcb', r.pcb.net); set('rZakat', r.zakat); set('rDed', r.deductions);
set('rEpfEr', r.epf.employer); set('rSocsoEr', r.perkeso.socsoEmployer); set('rEisEr', r.perkeso.eisEmployer);
set('rCost', r.employerCost); set('rTaxYear', r.annual.tax); set('rEpfYear', r.annual.epfTotal);
$('rEpfRate').textContent = Math.round(r.epf.employeeRate * 100) + '% · ' + Math.round(r.epf.employerRate * 100) + '%';
$('rowLindung').hidden = !r.input.lindung;
$('rowZakat').hidden = !r.zakat;
$('rNote').textContent = r.pcb.monthly ? TEXT.tax(r) : TEXT.zero;
$('rLive').textContent = TEXT.live(r);
if (writeHash) {
var h = 'salary=' + r.input.salary + '&age=' + (r.input.age60 ? 60 : (r.input.age57 ? 57 : 0)) +
'&residency=' + (r.input.permanentResident ? 'pr' : 'citizen') + '&eisExempt=' + (r.input.eisExempt ? 1 : 0) + '&status=' + r.input.status +
'&children=' + r.input.children + '&relief=' + r.input.otherRelief + '&zakat=' + r.input.zakat + '&lindung=' + (r.input.lindung ? 1 : 0);
history.replaceState(null, '', '#' + h);
}
}
function fromHash() {
if (location.hash.indexOf('salary=') < 0) return;
var q = {};
location.hash.slice(1).split('&').forEach(function (p) { var kv = p.split('='); q[kv[0]] = decodeURIComponent(kv[1] || ''); });
if (q.salary) f('salary').value = q.salary;
f('age').value = q.age === '60' ? '60' : (q.age === '57' ? '57' : '0');
f('residency').value = q.residency === 'pr' ? 'pr' : 'citizen';
f('eisExempt').checked = q.eisExempt === '1';
if (/^(single|married|spouse)$/.test(q.status)) f('status').value = q.status;
if (q.children) f('children').value = q.children;
if (q.relief) f('otherRelief').value = q.relief;
if (q.zakat) f('zakat').value = q.zakat;
f('lindung').checked = q.lindung !== '0';
if (Number(q.relief) || Number(q.zakat) || q.lindung === '0' || q.eisExempt === '1') $('moreOpts').open = true;
}
var frame = 0;
form.addEventListener('input', function () {
cancelAnimationFrame(frame);
frame = requestAnimationFrame(function () { render(true); });
});
form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
$('copyLink').addEventListener('click', function () {
var btn = this;
render(true);
var done = function () { btn.textContent = TEXT.copied; setTimeout(function () { btn.textContent = TEXT.copy; }, 2000); };
if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, function () {});
});
$('printBtn').addEventListener('click', function () { window.print(); });
fromHash();
var changed = Array.prototype.some.call(form.elements, function (el) {
return el.type === 'checkbox' || el.type === 'radio' ? el.checked !== el.defaultChecked
: el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected
: 'defaultValue' in el && el.value !== el.defaultValue;
});
if (changed) render(false);
})();
