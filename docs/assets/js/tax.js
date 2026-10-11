(function (root) {
'use strict';
var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
var BANDS_2026 = [
[0, 5000, 0], [5000, 20000, 0.01], [20000, 35000, 0.03], [35000, 50000, 0.06], [50000, 70000, 0.11],
[70000, 100000, 0.19], [100000, 400000, 0.25], [400000, 600000, 0.26], [600000, 2000000, 0.28], [2000000, Infinity, 0.30]
];
var BANDS_2027 = [
[0, 5000, 0], [5000, 20000, 0.01], [20000, 35000, 0.03], [35000, 50000, 0.06], [50000, 70000, 0.11],
[70000, 100000, 0.18], [100000, 150000, 0.24], [150000, 400000, 0.25], [400000, 600000, 0.26], [600000, 1000000, 0.28], [1000000, Infinity, 0.30]
];
var RELIEFS = [
{ id: 'disabled', limit: 7000, flag: true },
{ id: 'spouse', limit: 4000, flag: true },
{ id: 'spouseDisabled', limit: 6000, flag: true },
{ id: 'childUnder18', per: 2000 },
{ id: 'child18School', per: 2000 },
{ id: 'child18Higher', per: 8000 },
{ id: 'childDisabled', per: 8000 },
{ id: 'parentsMedical', limit: 8000 },
{ id: 'medical', limit: 10000 },
{ id: 'equipment', limit: 6000 },
{ id: 'education', limit: 7000 },
{ id: 'lifestyle', limit: 2500 },
{ id: 'sports', limit: 1000 },
{ id: 'breastfeeding', limit: 1000 },
{ id: 'childcare', limit: 3000 },
{ id: 'sspn', limit: 8000 },
{ id: 'epf', limit: 4000 },
{ id: 'lifeInsurance', limit: 3000 },
{ id: 'prs', limit: 3000 },
{ id: 'eduMedInsurance', limit: 4000 },
{ id: 'socso', limit: 350 },
{ id: 'evCharging', limit: 2500 },
{ id: 'housingLoan', limit: 7000 }
];
var YEARS = {
2026: { ya: 2026, self: 9000, bands: BANDS_2026, proposal: false },
2027: { ya: 2027, self: 12000, bands: BANDS_2027, proposal: true }
};
var REBATE_LIMIT = 35000, REBATE = 400;
function bandTax(chargeable, bands) {
var t = 0, top = 0;
bands.forEach(function (b) {
if (chargeable > b[0]) { t += (Math.min(chargeable, b[1]) - b[0]) * b[2]; top = b[2]; }
});
return { tax: cents(t), marginal: top };
}
var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };
function reliefBreakdown(input, year) {
var items = [{ id: 'self', amount: year.self }];
RELIEFS.forEach(function (r) {
var v = input[r.id];
var amount;
if (r.flag) amount = v ? r.limit : 0;
else if (r.per) amount = Math.floor(num(v)) * r.per;
else {
var lim = r.id === 'housingLoan' && input.housingTier === 'upper' ? 5000 : r.limit;
amount = Math.min(num(v), lim);
}
if (r.id === 'spouseDisabled' && !input.spouse) amount = 0;
if (amount) items.push({ id: r.id, amount: cents(amount) });
});
return items;
}
function calculate(input, ya) {
var year = YEARS[ya || 2026];
var employment = num(input.employment), other = num(input.other);
var total = cents(employment + other);
var donations = cents(Math.min(num(input.donations), total * 0.1));
var reliefs = reliefBreakdown(input, year);
var reliefTotal = cents(reliefs.reduce(function (s, r) { return s + r.amount; }, 0));
var chargeable = cents(Math.max(0, total - donations - reliefTotal));
var t = bandTax(chargeable, year.bands);
var rebate = chargeable <= REBATE_LIMIT ? REBATE + (input.spouse ? REBATE : 0) : 0;
var afterRebate = Math.max(0, t.tax - rebate);
var zakat = cents(Math.min(num(input.zakat), afterRebate));
var payable = cents(afterRebate - zakat);
var pcb = cents(num(input.pcb));
return {
ya: year.ya, proposal: year.proposal,
income: total, donations: donations, reliefs: reliefs, reliefTotal: reliefTotal,
chargeable: chargeable, grossTax: t.tax, rebate: cents(Math.min(rebate, t.tax)), zakat: zakat,
payable: payable, monthly: cents(payable / 12), pcb: pcb, balance: cents(payable - pcb),
effectiveRate: total ? cents(payable / total * 100) : 0, marginalRate: Math.round(t.marginal * 100)
};
}
var api = { YEARS: YEARS, RELIEFS: RELIEFS, BANDS_2026: BANDS_2026, BANDS_2027: BANDS_2027, bandTax: bandTax, calculate: calculate };
if (typeof module === 'object' && module.exports) module.exports = api;
else root.TBBTax = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
(function () {
'use strict';
var T = window.TBBTax;
var form = document.getElementById('taxForm');
if (!T || !form) return;
var ms = document.documentElement.lang === 'ms';
var fmt = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR' });
var $ = function (id) { return document.getElementById(id); };
var TEXT = ms ? {
refund: 'Anggaran bayaran balik', owe: 'Baki cukai perlu dibayar', even: 'PCB anda sama dengan cukai',
save: function (x) { return 'Jimat ' + fmt.format(x) + ' di bawah cadangan Bajet 2027 (TT2027).'; },
more: function (x) { return 'Tambah ' + fmt.format(x) + ' di bawah cadangan Bajet 2027 (TT2027).'; },
same: 'Tiada perubahan di bawah cadangan Bajet 2027.',
live: function (r) { return 'Cukai perlu dibayar ' + fmt.format(r.payable) + ' setahun.'; }
} : {
refund: 'Estimated refund', owe: 'Balance to pay', even: 'Your PCB matches your tax',
save: function (x) { return 'You would pay ' + fmt.format(x) + ' less under the Budget 2027 proposal (YA2027).'; },
more: function (x) { return 'You would pay ' + fmt.format(x) + ' more under the Budget 2027 proposal (YA2027).'; },
same: 'No change under the Budget 2027 proposal.',
live: function (r) { return 'Tax payable ' + fmt.format(r.payable) + ' a year.'; }
};
var names = {};
Array.prototype.forEach.call(form.querySelectorAll('[data-name]'), function (el) { names[el.name] = el.getAttribute('data-name'); });
names.self = $('reliefRows').getAttribute('data-self');
function read() {
var input = {};
Array.prototype.forEach.call(form.elements, function (el) {
if (!el.name) return;
input[el.name] = el.type === 'checkbox' ? el.checked : el.value;
});
return input;
}
function money(id, v) { $(id).textContent = fmt.format(v); }
function render(writeHash) {
var input = read();
var r = T.calculate(input, 2026);
var p = T.calculate(input, 2027);
money('tPayable', r.payable); money('tMonthly', r.monthly); money('tIncome', r.income);
money('tReliefs', r.reliefTotal); money('tDonations', r.donations); money('tChargeable', r.chargeable);
money('tGross', r.grossTax); money('tRebate', r.rebate); money('tZakat', r.zakat);
$('tRates').textContent = r.effectiveRate + '% · ' + r.marginalRate + '%';
$('rowDonations').hidden = !r.donations; $('rowZakat').hidden = !r.zakat; $('rowRebate').hidden = !r.rebate;
var bal = $('tBalanceRow');
bal.hidden = !r.pcb;
if (r.pcb) {
$('tBalanceLabel').textContent = r.balance < 0 ? TEXT.refund : r.balance > 0 ? TEXT.owe : TEXT.even;
money('tBalance', Math.abs(r.balance));
}
var diff = Math.round((r.payable - p.payable) * 100) / 100;
$('tCompare').textContent = diff > 0 ? TEXT.save(diff) : diff < 0 ? TEXT.more(-diff) : TEXT.same;
money('tProposal', p.payable);
var body = $('reliefRows');
body.textContent = '';
r.reliefs.forEach(function (x) {
var tr = body.insertRow(), th = document.createElement('th');
th.scope = 'row'; th.textContent = names[x.id] || x.id;
tr.appendChild(th);
tr.insertCell().textContent = fmt.format(x.amount);
});
$('tLive').textContent = TEXT.live(r);
if (writeHash) {
var parts = [];
Array.prototype.forEach.call(form.elements, function (el) {
if (!el.name) return;
var v = el.type === 'checkbox' ? (el.checked ? '1' : '') : el.value;
var d = el.type === 'checkbox' ? (el.defaultChecked ? '1' : '') : el.tagName === 'SELECT' ? el.querySelector('option[selected]') && el.querySelector('option[selected]').value : el.defaultValue;
if (v !== (d || '')) parts.push(el.name + '=' + encodeURIComponent(v));
});
history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
}
}
function fromHash() {
if (location.hash.length < 2) return false;
location.hash.slice(1).split('&').forEach(function (kv) {
var i = kv.indexOf('='), k = kv.slice(0, i), v = decodeURIComponent(kv.slice(i + 1));
var el = form.elements[k];
if (!el || !el.name) return;
if (el.type === 'checkbox') el.checked = v === '1'; else el.value = v;
var group = el.closest('details');
if (group) group.open = true;
});
return true;
}
var frame = 0;
var schedule = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
form.addEventListener('input', schedule);
form.addEventListener('change', schedule);
form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
$('taxPrint').addEventListener('click', function () { window.print(); });
var restored = Array.prototype.some.call(form.elements, function (el) {
if (!el.name) return false;
return el.type === 'checkbox' ? el.checked !== el.defaultChecked
: el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
});
if (fromHash() || restored) render(false);
})();
