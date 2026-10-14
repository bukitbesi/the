// Debt consolidation: card payoff at the minimum payment against one personal loan.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const D = require('../../assets/js/debt-core.js');

test('Card minimum payment: 5% or RM50, interest on the monthly balance', () => {
  const p = D.payoff(10000, 18, 0);
  assert.equal(p.first, 500);
  assert.equal(p.months, 89);
  assert.equal(p.interest, 4054.96);
  assert.equal(D.payoff(1000, 18, 0).first, 50);
  assert.equal(D.payoff(10000, 18, 100).never, true);
});

test('RM15,000 of cards at 18% into a 6% flat, 5-year loan', () => {
  const r = D.calculate({ debts: [{ balance: 10000, rate: 18 }, { balance: 5000, rate: 18 }], rate: 6, years: 5 });
  assert.equal(r.owed, 15000);
  assert.equal(r.nowInterest, 5967.05);
  assert.equal(r.monthly, 325);
  assert.equal(r.loanInterest, 4500);
  assert.equal(r.stamp, 75);
  assert.equal(r.saving, 1392.05);
  assert.equal(r.eir, 10.85);
});

test('A fixed payment higher than the minimum shortens the payoff', () => {
  const r = D.calculate({ debts: [{ balance: 10000, rate: 18, payment: 500 }], rate: 6, years: 3 });
  assert.equal(r.nowMonths, 24);
  assert.equal(r.nowInterest, 1978.27);
  assert.equal(r.saving, 128.27);
  // Stretching the same debt over 5 years costs more than paying the card off in 2.
  assert(D.calculate({ debts: [{ balance: 10000, rate: 18, payment: 500 }], rate: 6, years: 5 }).saving < 0);
});
