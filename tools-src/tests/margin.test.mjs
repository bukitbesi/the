// Profit margin, markup, break-even price and price for a target margin after percentage fees.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('../../assets/js/margin-core.js');

test('RM100 price, RM60 cost, 10% fees: RM30 profit, 30% margin, 50% markup', () => {
  const r = M.calculate({ price: 100, cost: 60, feePct: 10, target: 40, qty: 100 });
  assert.equal(r.fees, 10);
  assert.equal(r.profit, 30);
  assert.equal(r.margin, 30);
  assert.equal(r.markup, 50);
  assert.equal(r.breakEven, 66.67);
  assert.equal(r.targetPrice, 120);
  assert.equal(r.monthly, 3000);
});

test('Fixed fees, shipping and ads per order lower profit', () => {
  const r = M.calculate({ price: 50, cost: 20, feePct: 12, fixedFee: 1, shipping: 3, ads: 5 });
  assert.equal(r.fees, 7);
  assert.equal(r.profit, 15);
  assert.equal(r.breakEven, 32.95);
});

test('Margin and markup convert both ways; impossible targets return null', () => {
  assert.equal(Math.round(M.markupFromMargin(0.25) * 1000) / 10, 33.3);
  assert.equal(M.marginFromMarkup(1), 0.5);
  assert.equal(M.priceFor(60, 0.1, 0, 0.9), null);
});
