// Car loan: flat rate and reducing balance (EIR), conversion, Rule of 78 rebate and early settlement.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../../assets/js/carloan-core.js');

test('Flat-rate instalment: interest on the original loan for the whole term', () => {
  // RM90,000 at 2.5% flat for 9 years: (90,000 + 20,250) ÷ 108.
  assert.equal(C.flatInstalment(90000, 2.5, 9), 1020.83);
  const r = C.calculate({ price: 100000, downPct: 10, years: 9, method: 'flat', rate: 2.5 });
  assert.equal(r.interest, 20250);
  assert.equal(r.totalPaid, 110250);
});

test('Reducing-balance instalment matches the annuity formula', () => {
  assert.equal(C.eirInstalment(100000, 4, 30), 477.42);
  assert.equal(C.eirInstalment(60000, 0, 5), 1000);
});

test('Flat rate and EIR convert both ways', () => {
  const eir = C.flatToEir(2.5, 9);
  assert.ok(eir > 4.6 && eir < 4.7);
  // The EIR found gives the same instalment as the flat rate, to the cent.
  assert.ok(Math.abs(C.eirInstalment(90000, eir, 9) - C.flatInstalment(90000, 2.5, 9)) < 0.5);
  assert.ok(Math.abs(C.eirToFlat(eir, 9) - 2.5) < 0.01);
  // Shorter terms convert to a slightly higher EIR.
  assert.ok(C.flatToEir(2.5, 5) > C.flatToEir(2.5, 9));
});

test('Rule of 78 rebate', () => {
  // RM20,250 charges, 108 months, 60 left: 20,250 × 60 × 61 ÷ (108 × 109).
  assert.equal(Math.round(C.rule78Rebate(20250, 108, 60) * 100) / 100, 6295.87);
  assert.equal(C.rule78Rebate(20250, 108, 0), 0);
  assert.equal(C.rule78Rebate(20250, 108, 108), 20250);
});

test('Early settlement: Rule of 78 costs more than reducing balance', () => {
  const f = C.calculate({ price: 100000, downPct: 10, years: 9, method: 'flat', rate: 2.5, settleAfter: 48 });
  assert.equal(f.settlement.monthsLeft, 60);
  assert.equal(f.settlement.amount, Math.round((f.monthly * 60 - C.rule78Rebate(20250, 108, 60)) * 100) / 100);
  assert.ok(f.settlement.extraVsReducing > 0);
  const e = C.calculate({ price: 100000, downPct: 10, years: 9, method: 'eir', rate: 4.5, settleAfter: 48 });
  assert.equal(e.settlement.amount, Math.round(C.balanceAfter(90000, 4.5, 9, 48) * 100) / 100);
  assert.equal(e.settlement.extraVsReducing, 0);
});

test('Schedule repays the loan and tenure is capped at 9 years', () => {
  const r = C.calculate({ price: 80000, downPct: 10, years: 12, method: 'eir', rate: 4.5 });
  assert.equal(r.years, 9);
  assert.equal(r.schedule.length, 9);
  assert.equal(r.schedule.at(-1).balance, 0);
  const principal = r.schedule.reduce((s, y) => s + y.principal, 0);
  assert.ok(Math.abs(principal - r.loan) < 0.05);
});

test('Road tax: flat bands to 1,600 cc, then base plus a rate per cc', () => {
  assert.equal(C.roadTax(998, 'saloon'), 20);
  assert.equal(C.roadTax(1497, 'saloon'), 90);
  assert.equal(C.roadTax(1798, 'saloon'), 279.2);
  assert.equal(C.roadTax(1998, 'saloon'), 379);
  assert.equal(C.roadTax(2487, 'saloon'), 867);
  assert.equal(C.roadTax(1798, 'nonSaloon'), 359.4);
  assert.equal(C.roadTax(2994, 'nonSaloon'), 1630.4);
  assert.equal(C.roadTax(1496, 'nonSaloon'), 120);
  assert.equal(C.roadTax(1196, 'nonSaloon'), 85);
  assert.equal(C.roadTax(0, 'saloon'), 0);
  // Each band starts where the one below ends.
  for (const body of ['saloon', 'nonSaloon']) for (const [upper] of C.ROAD_TAX[body].slice(4, -1)) {
    assert.ok(C.roadTax(upper + 1, body) - C.roadTax(upper, body) < 5, `${body} ${upper}`);
  }
});

test('Insurance estimate: former tariff, NCD, 8% SST and RM10 stamp duty', () => {
  const none = C.insurance(100000, 1497, 0);
  assert.equal(none.gross, 2879.5);
  assert.equal(none.total, 3119.86);
  const max = C.insurance(100000, 1497, 55);
  assert.equal(max.total, 1409.43);
  assert.equal(C.insurance(0, 1497, 0).total, 0);
});

test('Running costs add to the monthly cost only when an engine size is given', () => {
  const r = C.calculate({ price: 100000, downPct: 10, years: 9, method: 'eir', rate: 4.5, cc: 1497, body: 'saloon', ncd: 0 });
  assert.equal(r.running.roadTax, 90);
  assert.equal(r.running.monthly, Math.round((r.monthly + (90 + 3119.86) / 12) * 100) / 100);
  assert.equal(C.calculate({ price: 100000, downPct: 10, years: 9, rate: 4.5 }).running, undefined);
});

test('Sabah and Sarawak saloons; non-saloons there are not modelled', () => {
  assert.equal(C.roadTax(1497, 'saloon', 'east'), 72);
  assert.equal(C.roadTax(1999, 'saloon', 'east'), 273.75);
  assert.equal(C.roadTax(3000, 'saloon', 'east'), 1024);
  assert.equal(C.roadTax(1497, 'nonSaloon', 'east'), null);
});

test('EV road tax by motor power (published examples)', () => {
  assert.equal(C.evRoadTax(50), 20);
  assert.equal(C.evRoadTax(100), 70);
  assert.equal(C.evRoadTax(150), 160);
  assert.equal(C.evRoadTax(160), 180);
  assert.equal(C.evRoadTax(208), 280);
  assert.equal(C.evRoadTax(225), 335);
  assert.equal(C.evRoadTax(378), null);
  const r = C.calculate({ price: 150000, downPct: 10, years: 9, rate: 4.5, fuel: 'ev', kw: 150, ncd: 0 });
  assert.equal(r.running.roadTax, 160);
  const unknown = C.calculate({ price: 150000, downPct: 10, years: 9, rate: 4.5, fuel: 'ev', kw: 400, ncd: 0 });
  assert.equal(unknown.running.roadTax, null);
  assert.equal(unknown.running.yearly, unknown.running.insurance.total);
});
