// ROAS, ROI, break-even ROAS and the 8% service tax on ad spend.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../../assets/js/roas-core.js');

test('RM1,000 spend, RM4,000 sales, 40% margin: ROAS 4, profit RM600, ROI 60%, break-even ROAS 2.5', () => {
  const r = R.calculate({ spend: 1000, revenue: 4000, margin: 40, orders: 50 });
  assert.equal(r.roas, 4);
  assert.equal(r.profit, 600);
  assert.equal(r.roi, 60);
  assert.equal(r.breakEven, 2.5);
  assert.equal(r.cpa, 20);
  assert.equal(r.aov, 80);
  assert.equal(r.maxCpa, 32);
  assert.equal(r.acos, 25);
});

test('With 8% service tax the spend is RM1,080: ROAS 3.70, profit RM520', () => {
  const r = R.calculate({ spend: 1000, revenue: 4000, margin: 40, tax: 'yes' });
  assert.equal(r.spend, 1080);
  assert.equal(Math.round(r.roas * 100) / 100, 3.7);
  assert.equal(r.profit, 520);
  assert.equal(r.breakEvenRevenue, 2700);
});

test('Break-even ROAS is 1 / margin', () => {
  assert.equal(R.breakEven(20), 5);
  assert.equal(R.breakEven(50), 2);
  assert.equal(R.breakEven(0), null);
});
