// BMI: Malaysian CPG and WHO categories, healthy range, waist and waist-to-height ratio, imperial units.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const B = require('../../assets/js/bmi-core.js');

test('165 cm, 65 kg: overweight in Malaysia, normal for WHO', () => {
  const r = B.calculate({ cm: 165, kg: 65 });
  assert.equal(r.bmi, 23.9);
  assert.equal(r.category, 'over');
  assert.equal(r.who, 'normal');
  assert.deepEqual(r.healthy, { low: 50.4, high: 62.3 });
  assert.equal(r.direction, 'lose');
  assert.equal(r.change, 2.7);
});

test('CPG boundaries', () => {
  const at = (bmi) => B.calculate({ cm: 100, kg: bmi }).category;
  assert.equal(at(18.4), 'under');
  assert.equal(at(18.5), 'normal');
  assert.equal(at(22.9), 'normal');
  assert.equal(at(23), 'over');
  assert.equal(at(27.5), 'obese1');
  assert.equal(at(35), 'obese2');
  assert.equal(at(40), 'obese3');
});

test('Healthy range table and imperial units', () => {
  assert.deepEqual(B.range(160), { low: 47.4, high: 58.6, over: 70.4 });
  assert.equal(B.calculate({ unit: 'imperial', ft: 5, inch: 7, lb: 150 }).bmi, 23.5);
  assert.equal(B.calculate({ cm: 165, kg: 48 }).direction, 'gain');
});

test('Waist limits by sex and waist-to-height ratio', () => {
  const m = B.calculate({ cm: 165, kg: 65, waist: 85, sex: 'male' }).waist;
  assert.equal(m.atRisk, false);
  assert.equal(m.ratio, 0.52);
  assert.equal(m.ratioBand, 'increased');
  assert.equal(B.calculate({ cm: 160, kg: 55, waist: 82, sex: 'female' }).waist.atRisk, true);
  assert.equal(B.calculate({ cm: 170, kg: 60, waist: 80 }).waist.ratioBand, 'healthy');
  assert.equal(B.calculate({ cm: 170, kg: 60 }).waist, undefined);
});
