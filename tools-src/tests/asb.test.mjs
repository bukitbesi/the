// ASB: dividend on the average monthly lowest balance, projection with the input limit, and financing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const A = require('../../assets/js/asb-core.js');

test('Latest rate and averages come from the history table', () => {
  assert.equal(A.FACTS.latest, 5.75);
  assert.equal(A.FACTS.latestYear, 2025);
  assert.equal(A.FACTS.latestDividend + A.FACTS.latestBonus, 5.75);
  assert.equal(A.FACTS.average5, 5.27);
  for (const [, d, b, t] of A.HISTORY) if (d != null) assert.equal(Math.round((d + b) * 100) / 100, t);
});

test('Dividend uses the average of twelve monthly lowest balances', () => {
  assert.deepEqual(A.dividend(Array(12).fill(10000), 5.75), { average: 10000, amount: 575 });
  // RM12,000 deposited in July counts for six months.
  const mins = [0, 0, 0, 0, 0, 0, 12000, 12000, 12000, 12000, 12000, 12000];
  assert.equal(A.dividend(mins, 5).amount, 300);
});

test('Deposit timing: after the 1st counts from the next month', () => {
  const late = A.project({ start: 10000, monthly: 200, rate: 5.75, years: 1 });
  assert.equal(late.firstAverage, 11100);
  assert.equal(late.firstDividend, 638.25);
  const early = A.project({ start: 10000, monthly: 200, rate: 5.75, years: 1, timing: 'early' });
  assert.equal(early.firstAverage, 11300);
  // Dividends are reinvested into the next year's balance.
  const two = A.project({ start: 10000, monthly: 0, rate: 5, years: 2 });
  assert.equal(two.final, 11025);
});

test('Deposits stop at the RM200,000 input limit; dividends can exceed it', () => {
  const r = A.project({ start: 199000, monthly: 500, rate: 5.75, years: 3 });
  assert.equal(r.rows[0].deposits, 1000);
  assert.equal(r.rows[1].deposits, 0);
  assert.ok(r.limitReached && r.final > 200000);
});

test('Financing: annuity instalment, interest and break-even rate', () => {
  const x = A.financing({ amount: 50000, rate: 4.25, years: 20, divRate: 5.75 });
  assert.equal(x.monthly, 309.62);
  assert.equal(x.dividends, 57500);
  assert.equal(x.net, Math.round((57500 - x.interest) * 100) / 100);
  assert.equal(x.breakEven, Math.round(x.interest / (50000 * 20) * 10000) / 100);
});
