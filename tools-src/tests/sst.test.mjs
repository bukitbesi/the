// SST: add and remove service and sales tax, restaurant service charge outside the tax base.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../../assets/js/sst-core.js');

test('RM100 + 8% = RM108; RM108 including 8% = RM100 + RM8', () => {
  assert.equal(S.calculate({ amount: 100, rate: 8 }).total, 108);
  const r = S.calculate({ amount: 108, rate: 8, mode: 'remove' });
  assert.equal(r.base, 100);
  assert.equal(r.tax, 8);
  assert.equal(S.calculate({ amount: 250, rate: 10 }).tax, 25);
});

test('Restaurant: RM100 food, 10% service charge, 6% service tax on the food = RM116', () => {
  const r = S.calculate({ amount: 100, rate: 6, charge: 10 });
  assert.equal(r.serviceCharge, 10);
  assert.equal(r.tax, 6);
  assert.equal(r.total, 116);
  assert.equal(S.calculate({ amount: 116, rate: 6, charge: 10, mode: 'remove' }).base, 100);
});
