// Calories: Mifflin-St Jeor BMR, activity factors, 7,700 kcal per kg, RNI macros, Malaysian BMI bands.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const K = require('../../assets/js/kalori-core.js');

test('Man 30, 70 kg, 170 cm: BMR 1,618; moderate 2,508; losing 0.5 kg a week 1,958 kcal', () => {
  const r = K.calculate({ sex: 'male', age: 30, weight: 70, height: 170, activity: 'moderate', goal: 'lose05' });
  assert.equal(r.bmr, 1618); assert.equal(r.tdee, 2508); assert.equal(r.change, -550); assert.equal(r.target, 1958);
  assert.equal(r.carb, 269); assert.equal(r.protein, 73); assert.equal(r.fat, 65);
  assert.equal(r.bmi, 24.2); assert.equal(r.band, 'over');
});

test('Woman 30, 60 kg, 158 cm: BMR 1,277, sedentary 1,532; losing 1 kg a week drops below BMR; healthy weight 46.2–57.2 kg', () => {
  const r = K.calculate({ sex: 'female', age: 30, weight: 60, height: 158, activity: 'sedentary' });
  assert.equal(r.bmr, 1277); assert.equal(r.tdee, 1532); assert.deepEqual(r.healthy, [46.2, 57.2]);
  assert.equal(K.calculate({ sex: 'female', age: 30, weight: 60, height: 158, activity: 'sedentary', goal: 'lose1' }).belowBmr, true);
  assert.equal(K.calculate({ sex: 'male', age: 0, weight: 70, height: 170 }), null);
  assert.equal(K.calculate({ sex: 'male', age: 30, weight: 60, height: 170 }).band, 'normal');
});
