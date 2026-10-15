// STR and SARA 2026: household rates by income band and children, singles via SARA, senior citizens.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../../assets/js/str-core.js');

test('Household up to RM2,500: RM700, RM1,200, RM1,700, RM2,200; RM2,501–5,000: RM200, RM450, RM700, RM950', () => {
  assert.deepEqual([0, 2, 4, 6].map(c => S.calculate({ income: 2000, children: c }).str), [700, 1200, 1700, 2200]);
  assert.deepEqual([0, 1, 3, 5].map(c => S.calculate({ income: 4000, children: c }).str), [200, 450, 700, 950]);
  assert.equal(S.calculate({ income: 2500, children: 3 }).str, 1700);
  assert.equal(S.calculate({ income: 2501, children: 3 }).str, 700);
  assert.equal(S.calculate({ income: 5001 }).eligible, false);
});

test('SARA RM1,200 (eKasih RM2,400); RM300 less STR than 2025; RM2,000 with 3 children gets RM2,900', () => {
  const r = S.calculate({ income: 2000, children: 3 });
  assert.equal(r.sara, 1200); assert.equal(r.total, 2900); assert.equal(r.change, -300);
  assert.equal(S.calculate({ income: 1500, children: 5, ekasih: 'yes' }).total, 4600);
});

test('Singles 21–59 (OKU 19–59) up to RM2,500: RM0 cash, RM600 SARA; seniors 60+ RM600', () => {
  assert.equal(S.calculate({ cat: 'single', income: 2000, age: 30 }).sara, 600);
  assert.equal(S.calculate({ cat: 'single', income: 2000, age: 30 }).str, 0);
  assert.equal(S.calculate({ cat: 'single', income: 2000, age: 30 }).change, null);
  assert.equal(S.calculate({ cat: 'single', income: 2000, age: 20 }).reason, 'age');
  assert.equal(S.calculate({ cat: 'single', income: 2000, age: 20, oku: 'yes' }).eligible, true);
  assert.equal(S.calculate({ cat: 'single', income: 3000, age: 30 }).reason, 'income');
  assert.equal(S.calculate({ cat: 'single', income: 1000, age: 61 }).reason, 'senior');
  assert.equal(S.calculate({ cat: 'senior', income: 1000, age: 65 }).str, 600);
  assert.equal(S.calculate({ cat: 'senior', income: 3000, age: 65 }).eligible, 'unknown');
});
