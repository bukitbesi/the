// Tenancy stamp duty: RM1/3/5/7 per RM250 of yearly rent, minimum RM10, RM10 a copy; rental yield.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../../assets/js/tenancy-core.js');

test('Published examples: RM2,000 a month for 1 year RM96; RM1,800 RM87 plus a RM10 copy', () => {
  assert.equal(T.calculate({ rent: 2000, months: 12 }).duty, 96);
  assert.equal(T.calculate({ rent: 1800, months: 12, copies: 1 }).total, 97);
});

test('RM1,500 for 2 years: 72 x RM3 = RM216 (RM126 under the old rule); longer terms; minimum RM10', () => {
  const r = T.calculate({ rent: 1500, months: 24 });
  assert.equal(r.duty, 216);
  assert.equal(r.old, 126);
  assert.equal(T.calculate({ rent: 1500, months: 48 }).duty, 360);
  assert.equal(T.calculate({ rent: 1500, months: 72 }).duty, 504);
  assert.equal(T.calculate({ rent: 150, months: 12 }).duty, 10);
});

test('Rental yield: RM2,000 on RM400,000 is 6% gross; one month vacant and RM3,000 costs give 4.75% net', () => {
  const r = T.calculate({ rent: 2000, months: 12, price: 400000, vacancy: 1, costs: 3000 });
  assert.equal(r.grossYield, 6);
  assert.equal(r.netYield, 4.75);
});
