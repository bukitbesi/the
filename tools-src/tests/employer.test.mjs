// Employer cost: EPF, SOCSO, EIS from the salary core, HRD Corp levy, foreign workers, bonus.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('../../assets/js/employer-core.js');

test('RM3,000 Malaysian employee with the 1% HRD levy', () => {
  const r = E.calculate({ salary: 3000, hrd: 'full' });
  assert.equal(r.epf, 390);
  assert.equal(r.socso, 51.65);
  assert.equal(r.eis, 5.9);
  assert.equal(r.hrd, 30);
  assert.equal(r.monthly, 3477.55);
  assert.equal(r.yearly, 41730.6);
  assert.equal(E.calculate({ salary: 3000 }).monthly, 3447.55);
});

test('A one-month bonus attracts EPF at 12% once the month passes RM5,000', () => {
  const r = E.calculate({ salary: 3000, hrd: 'full', bonus: 1 });
  assert.equal(r.bonus, 3000);
  assert.equal(r.bonusEpf, 330);
  assert.equal(r.yearly, 45060.6);
});

test('Above RM5,000 EPF is 12%; foreign workers 2% EPF, no EIS or HRD levy', () => {
  assert.equal(E.calculate({ salary: 6000 }).epf, 720);
  const f = E.calculate({ salary: 3000, foreign: 'yes', hrd: 'full' });
  assert.equal(f.epf, 60);
  assert.equal(f.eis, 0);
  assert.equal(f.hrd, 0);
  assert.equal(f.monthly, 3111.65);
  assert.equal(E.calculate({ salary: 3000, age60: 'yes' }).epf, 120);
});
