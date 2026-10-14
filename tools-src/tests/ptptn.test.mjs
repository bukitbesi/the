// PTPTN ujrah: 1% a year on the principal over the period, early settlement and the restructuring minimum.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../../assets/js/ptptn-core.js');

test('RM30,000 over 15 years: RM4,500 ujrah, RM191.67 a month', () => {
  const r = P.calculate({ amount: 30000, years: 15 });
  assert.equal(r.ujrah, 4500);
  assert.equal(r.total, 34500);
  assert.equal(r.monthly, 191.67);
  assert.equal(P.calculate({ amount: 30000, years: 20 }).monthly, 150);
});

test('Settling after 5 years pays the principal balance only', () => {
  const r = P.calculate({ amount: 30000, years: 15, paid: 60 });
  assert.equal(r.settle, 20000);
  assert.equal(r.saving, 3000);
  assert.equal(r.balance, 23000);
});

test('Restructuring minimum: 5% to 8% of gross income', () => {
  const r = P.calculate({ amount: 30000, years: 15, income: 3000 });
  assert.equal(r.minLow, 150);
  assert.equal(r.minHigh, 240);
});
