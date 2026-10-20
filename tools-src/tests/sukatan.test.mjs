// Cups to grams: amounts with fractions, cup sizes, ingredient detection, recipe lines and tin scaling.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../../assets/js/sukatan-core.js');
const r = n => Math.round(n);

test('fractions and units parse', () => {
  assert.equal(S.parseAmount('1 1/2'), 1.5); assert.equal(S.parseAmount('¾'), 0.75); assert.equal(S.parseAmount('1½'), 1.5);
  assert.equal(S.parseAmount('2,5'), 2.5); assert.ok(Number.isNaN(S.parseAmount('abc')));
  assert.equal(S.unitOf('sudu besar'), 'tbsp'); assert.equal(S.unitOf('sk'), 'tsp'); assert.equal(S.unitOf('Cawan'), 'cup');
});

test('1 cup of flour: 120 g in a US cup, 127 g in a 250 ml cup (125–132 g range)', () => {
  const us = S.convert({ ing: 'flour', amount: '1', unit: 'cup', cup: 236.5882365 });
  assert.equal(r(us.g), 120); assert.equal(r(us.high), 125);
  const m = S.convert({ ing: 'flour', amount: '1', unit: 'cup', cup: 250 });
  assert.equal(r(m.g), 127); assert.equal(r(m.high), 132);
  assert.equal(r(S.convert({ ing: 'sugar', amount: '1', unit: 'cup', cup: 250 }).g), 209);
  assert.equal(r(S.convert({ ing: 'butter', amount: '1', unit: 'tbsp' }).g), 14);
  assert.equal(r(S.convert({ ing: 'water', amount: '1', unit: 'cup', cup: 250 }).g), 250);
});

test('grams back to cups', () => {
  const c = S.convert({ ing: 'sugar', amount: '200', unit: 'g', cup: 250 });
  assert.equal(Math.round(c.cups * 100) / 100, 0.96);
});

test('recipe lines: longest ingredient name wins, scaling, grams pass through', () => {
  const lines = S.parseRecipe('2 1/2 cawan tepung naik sendiri\n½ cawan gula pasir\n3 sudu besar minyak\n200 g mentega\n2 biji telur', 250, 2);
  assert.equal(lines[0].key, 'srflour'); assert.equal(lines[0].scaled, 5); assert.equal(r(lines[0].g), 597);
  assert.equal(lines[1].key, 'sugar'); assert.equal(r(lines[1].g), 209);
  assert.equal(lines[2].unit, 'tbsp'); assert.equal(r(lines[2].g), 83);
  assert.equal(lines[3].g, 400);
  assert.equal(lines[4].key, 'egg'); assert.equal(lines[4].low, 240); assert.equal(Math.round(lines[4].g), 250);
  assert.equal(S.parseLine('sedikit garam', 250, 1).g, null);
});

test('tin scaling: 8 in round to 9 in round is ×1.27; 8 in square to 8 in round is ×0.79', () => {
  assert.equal(Math.round(S.tinFactor({ shape: 'round', a: 8 }, { shape: 'round', a: 9 }) * 100) / 100, 1.27);
  assert.equal(Math.round(S.tinFactor({ shape: 'square', a: 8 }, { shape: 'round', a: 8 }) * 100) / 100, 0.79);
  assert.equal(S.round(7.3), 7.5); assert.equal(S.round(126.6), 127);
});
