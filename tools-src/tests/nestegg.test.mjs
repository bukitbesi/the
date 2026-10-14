// Retirement savings: amount needed at retirement, projected savings, shortfall and drawdown.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const N = require('../../assets/js/nestegg-core.js');

test('Age 35, RM3,000 a month today, retire 60 to 85, 2.5% inflation, 5% before and 4% after', () => {
  const r = N.calculate({ age: 35, retire: 60, until: 85, expense: 3000, inflation: 2.5, pre: 5, post: 4, saved: 80000, monthly: 1000 });
  assert.equal(r.first, 5561.83);
  assert.equal(r.need, 1399967.3);
  assert.equal(r.projected, 859029.27);
  assert.equal(r.extra, 919.77);
  assert.equal(Math.floor(r.runsOutAge), 74);
});

test('No inflation and no return: need = expense x months; enough savings last', () => {
  const r = N.calculate({ age: 50, retire: 60, until: 70, expense: 2000, inflation: 0, pre: 0, post: 0, saved: 240000, monthly: 0 });
  assert.equal(r.need, 240000);
  assert.equal(r.gap, 0);
  assert.equal(r.enough, true);
  assert.equal(N.FACTS.basic, 390000);
});
