// Land units: exact definitions, acre-rood-pole titles, lot size and price per area.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const L = require('../../assets/js/land-core.js');
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('Traditional units', () => {
  const r = L.all(L.convert(1, 'relung'));
  assert.equal(r.sqft, 30976);
  near(r.acre, 0.711111, 1e-6);
  near(r.sqm, 2877.76456704);
  near(r.jemba, 484);
  near(L.all(L.convert(1, 'orlong')).acre, 1.322314, 1e-6);
  near(L.all(L.convert(1, 'acre')).relung, 1.40625);
});

test('Metric and imperial', () => {
  near(L.all(L.convert(1, 'acre')).sqm, 4046.8564224);
  near(L.all(L.convert(1, 'hectare')).acre, 2.4710538, 1e-6);
  near(L.all(L.convert(1000, 'sqft')).sqm, 92.90304);
});

test('Acres, roods and poles', () => {
  assert.equal(L.fromArp(2, 1, 20), 2.375 * 43560);
  assert.deepEqual(L.toArp(L.fromArp(2, 1, 20)), { a: 2, r: 1, p: 20 });
  assert.deepEqual(L.toArp(43560), { a: 1, r: 0, p: 0 });
});

test('Lot size and price per area', () => {
  assert.equal(L.rect(20, 70, 'ft'), 1400);
  near(L.rect(10, 10, 'm'), 100 / 0.09290304);
  const p = L.price(300000, 30976);
  near(p.relung, 300000);
  near(p.sqft, 300000 / 30976);
  assert.equal(L.price(0, 1000), null);
});
