// Mas kahwin: state minimums, gold and dinar value, wedding cost planner.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('../../assets/js/maskahwin-core.js');

test('State rates: Selangor and WP RM300, Melaka and Pahang RM100, Negeri Sembilan RM200 / RM100', () => {
  assert.equal(M.rate('selangor', 'dara').amount, 300);
  assert.equal(M.rate('selangor', 'janda').amount, 300);
  assert.equal(M.rate('selangor', 'janda').before, 40);
  assert.equal(M.rate('wp', 'dara').amount, 300);
  assert.equal(M.rate('melaka', 'dara').amount, 100);
  assert.equal(M.rate('pahang', 'dara').before, 22.5);
  assert.equal(M.rate('ns', 'dara').amount, 200);
  assert.equal(M.rate('ns', 'janda').amount, 100);
  assert.equal(M.rate('terengganu', 'dara').amount, null);
  assert.equal(M.rate('johor', 'dara').status, 'unconfirmed');
  assert.equal(M.rate('selangor').feeTotal, 270);
  assert.equal(M.rate('wp').feeTotal, 278);
});

test('Gold: 2 g of 916 at RM500/g pure = RM916; 1 dinar = 4.25 g × 0.917 × RM500 = RM1,948.63', () => {
  assert.equal(M.value('gold916', 2, 500), 916);
  assert.equal(M.value('dinar', 1, 500), 1948.63);
  assert.equal(M.value('cash', 300, 500), 300);
  const g = M.inGold(300, 500);
  assert.ok(Math.abs(g.g999 - 0.6006) < 0.0001);
  assert.ok(Math.abs(g.dinar - 0.15395) < 0.0001);
});

test('Checks against the minimum, and the planner totals', () => {
  assert.equal(M.calculate({ state: 'selangor', qty: 250 }).check, 'below');
  assert.equal(M.calculate({ state: 'selangor', qty: 250 }).short, 50);
  assert.equal(M.calculate({ state: 'selangor', qty: 300 }).check, 'ok');
  assert.equal(M.calculate({ state: 'perlis', qty: 1 }).check, 'free');
  assert.equal(M.calculate({ state: 'kedah', qty: 300 }).check, 'unknown');
  assert.equal(M.calculate({ state: 'selangor', kind: 'dinar', qty: 1, gram: 500 }).check, 'ok');
  const r = M.calculate({ state: 'selangor', qty: 300, hantaran: 10000, gifts: 3000, guests: 500, perHead: 15, other: 8000, months: 12 });
  assert.equal(r.total, 300 + 10000 + 3000 + 7500 + 8000 + 270);
  assert.equal(r.monthly, 2422.5);
  assert.equal(M.calculate({ state: 'selangor', qty: 300, fees: '100' }).total, 400);
  assert.equal(M.calculate({ state: 'kedah', qty: 300 }).total, 300);
});

test('Fees: official where published, flagged missing elsewhere', () => {
  assert.equal(M.calculate({ state: 'wp', qty: 300 }).feesAuto, true);
  assert.equal(M.calculate({ state: 'johor', qty: 300 }).feesMissing, true);
  assert.equal(M.calculate({ state: 'johor', qty: 300, fees: 200 }).feesMissing, false);
});
