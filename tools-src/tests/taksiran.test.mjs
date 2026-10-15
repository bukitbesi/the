// Assessment tax: annual value × council rate, two halves, Selangor 25% cap (MBPJ), custom rate up to 35%.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../../assets/js/taksiran-core.js');

test('MBPJ example: annual value RM9,900 × 4% landed = RM396 a year, RM198 a half', () => {
  const r = T.calculate({ council: 'mbpj', type: 'landed', mode: 'annual', annual: 9900 });
  assert.equal(r.tax, 396); assert.equal(r.half, 198); assert.equal(r.rate, 4);
});

test('Rent RM1,500 a month: DBKL 4% RM720; MBPP landed 5.6% RM1,008; MBPP commercial 9% RM1,620', () => {
  assert.equal(T.calculate({ council: 'dbkl', type: 'residential', rent: 1500 }).tax, 720);
  assert.equal(T.calculate({ council: 'mbpp', type: 'landed', rent: 1500 }).tax, 1008);
  assert.equal(T.calculate({ council: 'mbpp', type: 'commercial', rent: 1500 }).tax, 1620);
  assert.equal(T.compare(1500).length, 12);
});

test('Selangor cap: MBPJ new RM720 against an old RM400 is capped at RM500; custom rate capped at 35%', () => {
  const r = T.calculate({ council: 'mbpj', type: 'landed', rent: 1500, oldTax: 400 });
  assert.equal(r.tax, 720); assert.equal(r.capped, 500); assert.equal(r.pay, 500); assert.equal(r.increase, 100);
  assert.equal(T.calculate({ council: 'dbkl', rent: 1500, oldTax: 400 }).capped, null);
  assert.equal(T.calculate({ council: 'custom', rate: 50, rent: 1000 }).rate, 35);
  assert.equal(T.calculate({ council: 'custom', rate: 6.5, rent: 1000 }).tax, 780);
});
