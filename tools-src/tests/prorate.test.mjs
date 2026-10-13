// Prorated salary: section 18A calendar days, working days and the 26-day rate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../../assets/js/prorate-core.js');

test('Days in month, including leap February', () => {
  assert.equal(P.daysInMonth(2026, 2), 28);
  assert.equal(P.daysInMonth(2028, 2), 29);
  assert.equal(P.daysInMonth(2026, 10), 31);
});

test('New joiner: salary ÷ calendar days × days from the start date', () => {
  const r = P.calculate({ salary: 3000, case: 'join', date: '2026-10-16' });
  assert.equal(r.days, 16);
  assert.equal(r.calendarDays, 31);
  assert.equal(r.pay, 1548.39);
  assert.equal(r.label.en, '16–31 October 2026');
});

test('Leaver: paid up to and including the last day', () => {
  assert.equal(P.calculate({ salary: 4500, case: 'leave', date: '2026-09-10' }).pay, 1500);
});

test('Unpaid leave in a full month (JTKSM-style example)', () => {
  const r = P.calculate({ salary: 6200, case: 'full', month: '2026-08', unpaid: 2 });
  assert.equal(r.deduction, 400);
  assert.equal(r.pay, 5800);
  const orp = r.methods.find(m => m.key === 'fixed26');
  assert.equal(orp.days, 24);
  assert.equal(orp.pay, Math.round(6200 / 26 * 24 * 100) / 100);
});

test('Working days follow the chosen work week', () => {
  // October 2026 starts on a Thursday: 22 weekdays, 27 Monday–Saturday days, 21 Sunday–Thursday days.
  assert.equal(P.workingDays(2026, 10, 1, 31, 'mon-fri'), 22);
  assert.equal(P.workingDays(2026, 10, 1, 31, 'mon-sat'), 27);
  assert.equal(P.workingDays(2026, 10, 1, 31, 'sun-thu'), 21);
  assert.equal(P.workingDays(2026, 10, 1, 31, 'half-sat'), 24.5);
  const r = P.calculate({ salary: 3000, case: 'join', date: '2026-10-16', workdays: 'mon-fri' });
  assert.equal(r.methods.find(m => m.key === 'working').pay, 1500);
});

test('A full month pays the full salary by every method', () => {
  const r = P.calculate({ salary: 5000, case: 'full', month: '2026-02' });
  for (const m of r.methods) assert.equal(m.pay, 5000);
});
