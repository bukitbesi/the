// Unit trust: sales charge on purchase, yearly fees on value, i-Invest comparison and net return.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const U = require('../../assets/js/unittrust-core.js');

test('RM10,000 plus RM300 a month for 10 years at 7%, 3% sales charge, 1.6% fees', () => {
  const r = U.calculate({ lump: 10000, monthly: 300, years: 10, gross: 7, charge: 3, fee: 1.6 });
  assert.equal(r.paid, 46000);
  assert.equal(r.value, 62126.01);
  assert.equal(r.charges, 1339.81);
  assert.equal(r.iInvest, 63671.43);
  assert.equal(r.noCost, 71277.18);
  assert.equal(Math.round(r.net * 100) / 100, 4.83);
});

test('A 5% sales charge buys RM10,000 / 1.05 of units; no fees and no charge give the gross return', () => {
  const g = U.grow(10500, 0, 1, 0, 0.05, 0);
  assert.equal(g.value, 10000);
  assert.equal(g.charges, 500);
  const z = U.calculate({ lump: 10000, years: 5, gross: 6 });
  assert.equal(Math.round(z.net * 1000) / 1000, 6);
});
