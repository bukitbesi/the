// Reference values from KWSP's Third Schedule example and published PERKESO schedule rows.
// Run: node --test tools-src/tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../../assets/js/salary-core.js');

test('EPF uses Third Schedule bands, not a flat percentage (KWSP RM3,250 example)', () => {
  assert.deepEqual([S.epf(3250).employee, S.epf(3250).employer], [359, 424]);
  assert.deepEqual([S.epf(3000).employee, S.epf(3000).employer], [330, 390]);
});

test('EPF employer rate drops to 12% above RM5,000 and uses RM100 bands', () => {
  assert.deepEqual([S.epf(5000).employee, S.epf(5000).employer], [550, 650]);
  assert.deepEqual([S.epf(5050).employee, S.epf(5050).employer], [561, 612]);
  assert.deepEqual([S.epf(25000).employee, S.epf(25000).employer], [2750, 3000]);
});

test('EPF at 60 and above: 0% employee, 4% employer', () => {
  assert.deepEqual([S.epf(3000, true).employee, S.epf(3000, true).employer], [0, 120]);
});

test('PERKESO first category matches published rows', () => {
  const a = S.perkeso(3000, false, true);
  assert.deepEqual([a.socsoEmployee, a.socsoEmployer, a.eisEmployee, a.eisEmployer], [14.75, 51.65, 5.9, 5.9]);
  const b = S.perkeso(3050, false, true);
  assert.deepEqual([b.socsoEmployee, b.socsoEmployer, b.lindung], [15.25, 53.35, 22.85]);
  const c = S.perkeso(9000, false, true);
  assert.deepEqual([c.socsoEmployee, c.socsoEmployer, c.eisEmployee, c.eisEmployer], [29.75, 104.15, 11.9, 11.9]);
});

test('PERKESO at 60 and above: employment injury only, no EIS', () => {
  const a = S.perkeso(3000, true, false);
  assert.deepEqual([a.socsoEmployee, a.socsoEmployer, a.eisEmployee, a.lindung], [0, 36.85, 0, 0]);
});

test('PCB is zero below the taxable threshold and matches the annual formula above it', () => {
  assert.equal(S.calculate({ salary: 3000 }).pcb.monthly, 0);
  assert.equal(S.calculate({ salary: 5000 }).pcb.monthly, 110);
  // Spouse not working (category 2) and two children lower the deduction.
  // P = 60,000 - 4,000 EPF - 9,000 self - 4,000 spouse - 4,000 children = 39,000 -> (4,000 x 6% + 600) / 12.
  assert.equal(S.calculate({ salary: 5000, status: 'spouse', children: 2 }).pcb.monthly, 70);
  // Under RM10 is not deducted.
  assert.equal(S.calculate({ salary: 3500 }).pcb.monthly, 0);
  assert.equal(S.calculate({ salary: 4000 }).pcb.monthly, 16.7);
});

test('PCB rounds up to the next 5 sen', () => {
  const r = S.calculate({ salary: 8000 });
  assert.equal(Math.round(r.pcb.monthly * 100) % 5, 0);
});

test('Net pay = gross minus every employee deduction', () => {
  const r = S.calculate({ salary: 5000 });
  assert.equal(r.net, 4268.2);
  assert.equal(r.employerCost, 5746.55);
});

test('PR aged 60 or above uses KWSP Third Schedule Part C', () => {
  const r = S.calculate({ salary: 3250, age60: true, permanentResident: true });
  assert.deepEqual([r.epf.employee, r.epf.employer], [180, 212]);
});

test('Above RM20,000 round the combined EPF shares only once', () => {
  const r = S.epf(20001, false, false);
  assert.equal(r.employee + r.employer, 4601);
  assert.equal(r.employee, 2200.11);
});

test('EIS first-time contributor aged 57-59 is exempt', () => {
  const r = S.calculate({ salary: 6000, age57: true, eisExempt: true });
  assert.equal(r.perkeso.eisEmployee, 0);
  assert.equal(r.perkeso.eisEmployer, 0);
  assert.equal(S.calculate({salary: 6000, age57: true}).perkeso.eisEmployee, 11.9);
  assert.equal(S.calculate({salary: 6000, eisExempt: true}).perkeso.eisEmployee, 11.9);
});

test('Projected annual tax includes the capped annual zakat rebate', () => {
  const r = S.calculate({ salary: 5000, zakat: 100 });
  assert.equal(r.annual.tax, 120);
  assert.equal(S.calculate({ salary: 5000, zakat: 200 }).annual.tax, 0);
});

test('Net PCB is rounded to 5 sen after zakat', () => {
  const r = S.calculate({ salary: 5000, zakat: 0.02 });
  assert.equal(r.pcb.net, 110);
});
