// Personal loan: flat rate, EIR conversion, stamp duty and the reducing-balance schedule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../../assets/js/personal-core.js');
const C = require('../../assets/js/carloan-core.js');

test('Flat rate: RM30,000 at 6% over 5 years', () => {
  const r = P.calculate({ amount: 30000, years: 5, method: 'flat', rate: 6 });
  assert.equal(r.interest, 9000);
  assert.equal(r.monthly, 650);
  assert.ok(r.eir > 10.8 && r.eir < 10.9);
  assert.equal(r.stamp, 150);
  assert.equal(r.received, 29850);
  assert.equal(r.cost, 9150);
});

test('The EIR found gives the same instalment', () => {
  const r = P.calculate({ amount: 30000, years: 5, method: 'flat', rate: 6 });
  assert.ok(Math.abs(C.eirInstalment(30000, r.eir, 5) - r.monthly) < 0.5);
  const e = P.calculate({ amount: 30000, years: 5, method: 'eir', rate: r.eir });
  assert.ok(Math.abs(e.flat - 6) < 0.02);
});

test('Stamp duty paid separately leaves the full amount; tenure capped at 10 years', () => {
  assert.equal(P.calculate({ amount: 20000, years: 3, rate: 5, stamp: 'separate' }).received, 20000);
  const r = P.calculate({ amount: 20000, years: 15, rate: 5 });
  assert.equal(r.years, 10);
  assert.equal(r.schedule.length, 10);
  assert.equal(r.schedule.at(-1).balance, 0);
});
