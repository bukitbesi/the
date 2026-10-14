// Refinance: like-for-like saving on the same balance, costs and break-even.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../../assets/js/refi-core.js');

test('RM300,000 from 4.5% to 3.9% over 25 years', () => {
  const r = R.calculate({ balance: 300000, rate: 4.5, yearsLeft: 25, newRate: 3.9, newYears: 25, valuation: 800, other: 1000 });
  assert.equal(r.oldInstalment, 1667.5);
  assert.equal(r.sameInstalment, 1566.99);
  assert.equal(r.monthlySaving, 100.51);
  assert.equal(r.stamp, 1500);
  assert.equal(r.legal, 3750);
  assert.equal(r.sst, 300);
  assert.equal(r.costs, 7350);
  assert.equal(r.interestSaved, 30150.24);
  assert.equal(r.netSaving, 22800.24);
  assert.equal(r.breakEven, 74);
});

test('Lock-in penalty, cash-out and financed costs', () => {
  const r = R.calculate({ balance: 300000, rate: 4.5, yearsLeft: 25, newRate: 3.9, newYears: 25, lockPct: 2, cashOut: 50000, finance: 'loan' });
  assert.equal(r.penalty, 6000);
  assert.equal(r.stamp, 1750);
  assert.equal(r.newLoan, 350000 + r.costs);
  assert(r.newInstalment > r.oldInstalment, 'cash-out raises the instalment');
  assert.equal(R.calculate({ balance: 300000, rate: 4, yearsLeft: 25, newRate: 4.5, newYears: 25 }).breakEven, null);
});
