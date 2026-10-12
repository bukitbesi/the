// Home loan: instalment formula, amortisation, stamp duty, SRO 2023 legal fees, first-home exemption, DSR.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const L = require('../../assets/js/loan-core.js');

test('Instalment matches published mortgage tables', () => {
  assert.equal(L.instalment(100000, 4, 30), 477.42);
  assert.equal(L.instalment(120000, 0, 10), 1000);
  assert.equal(L.instalment(0, 4, 30), 0);
});

test('Amortisation repays the loan exactly', () => {
  const a = L.amortise(300000, 4.2, 30, 0);
  assert.equal(a.months, 360);
  assert.equal(a.rows.length, 30);
  assert.equal(a.rows.at(-1).balance, 0);
  const principal = a.rows.reduce((s, r) => s + r.principal, 0);
  assert.ok(Math.abs(principal - 300000) < 0.05);
  // Total paid is within rounding of instalment × months.
  assert.ok(Math.abs(300000 + a.interest - a.instalment * 360) < 5);
});

test('Extra monthly payment shortens the loan and saves interest', () => {
  const r = L.calculate({ price: 500000, downPct: 10, rate: 4.2, years: 35, extra: 300 });
  assert.ok(r.monthsSaved > 60);
  assert.ok(r.interestSaved > 50000);
  assert.equal(r.interestSaved, Math.round((r.interest - r.extraInterest) * 100) / 100);
});

test('Stamp duty on the transfer and the loan agreement', () => {
  assert.equal(L.stampDutyTransfer(100000), 1000);
  assert.equal(L.stampDutyTransfer(500000), 9000);
  assert.equal(L.stampDutyTransfer(1000000), 24000);
  assert.equal(L.stampDutyTransfer(1200000), 32000);
  assert.equal(L.stampDutyLoan(450000), 2250);
});

test('SRO 2023 legal fee scale with RM500 minimum', () => {
  assert.equal(L.legalFee(500000), 6250);
  assert.equal(L.legalFee(720000), 8450);
  assert.equal(L.legalFee(30000), 500);
  assert.equal(L.legalFee(0), 0);
});

test('First-home stamp duty exemption', () => {
  // Current rule: the reported maximum saving is RM11,250 on a RM500,000 home with a 90% loan.
  const now = L.exemption('current', 500000, 450000);
  assert.equal(now.mot + now.loan, 11250);
  assert.deepEqual(L.exemption('current', 600000, 540000), { mot: 0, loan: 0 });
  // Budget 2027 proposal, RM600,000: RM9,000 + half of RM3,000 on the transfer; loan duty relieved 550/600.
  assert.deepEqual(L.exemption('budget2027', 600000, 540000), { mot: 10500, loan: 2475 });
  assert.deepEqual(L.exemption('budget2027', 800000, 720000), { mot: 0, loan: 0 });
  assert.deepEqual(L.exemption('none', 300000, 270000), { mot: 0, loan: 0 });
});

test('Upfront costs add up', () => {
  const r = L.calculate({ price: 500000, downPct: 10, rate: 4.2, years: 35, firstHome: 'none' });
  const c = r.costs;
  assert.equal(r.loan, 450000);
  assert.equal(c.downPayment, 50000);
  assert.equal(c.stampTransfer, 9000);
  assert.equal(c.stampLoan, 2250);
  assert.equal(c.legalSpa, 6250);
  assert.equal(c.legalLoan, 5625);
  assert.equal(c.sst, 950);
  assert.equal(c.total, 74075);
  const first = L.calculate({ price: 500000, downPct: 10, rate: 4.2, years: 35, firstHome: 'current' });
  assert.equal(first.costs.total, 74075 - 11250);
});

test('Debt service ratio and maximum loan', () => {
  const r = L.calculate({ price: 500000, downPct: 10, rate: 4.2, years: 35, income: 8000, commitments: 500, dsrLimit: 70 });
  assert.equal(r.dsr, Math.round((r.instalment + 500) / 8000 * 1000) / 10);
  // The maximum loan's instalment uses up exactly the room under the DSR limit.
  assert.ok(Math.abs(L.instalment(r.maxLoan, 4.2, 35) - (8000 * 0.7 - 500)) < 0.01);
  assert.equal(L.calculate({ price: 500000 }).dsr, null);
});

test('Tenure is capped at 35 years and checked against age 70', () => {
  const r = L.calculate({ price: 400000, years: 40, age: 40 });
  assert.equal(r.years, 35);
  assert.equal(r.endAge, 75);
  assert.equal(r.pastMaxAge, true);
});
