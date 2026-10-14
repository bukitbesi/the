// Rent vs buy: up-front costs from the home loan core, wealth after the horizon.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const B = require('../../assets/js/rentbuy-core.js');
const base = { price: 500000, downPct: 10, rate: 4.2, years: 35, firstHome: 'none', growth: 3, rent: 1800, rentRise: 3, invest: 5, upkeep: 1, sellCost: 3, horizon: 10 };

test('Up-front costs and the instalment come from the home loan core', () => {
  const r = B.calculate(base);
  assert.equal(r.loan, 450000);
  assert.equal(r.instalment, 2046.83);
  assert.equal(r.upfront, 74075);
  assert.equal(r.rows.length, 10);
});

test('Ten years at 3% growth: buying ahead; break-even year 5', () => {
  const r = B.calculate(base);
  assert.equal(r.better, 'buy');
  assert.equal(r.buyer, 272013.88);
  assert.equal(r.renter, 193066.12);
  assert.equal(r.breakEven, 5);
});

test('Flat prices and a high investment return favour renting', () => {
  const r = B.calculate({ ...base, growth: 0, invest: 8, horizon: 5 });
  assert.equal(r.better, 'rent');
  assert(B.calculate({ ...base, firstHome: 'current' }).upfront < 74075, 'first-home exemption lowers the up-front cost');
});
