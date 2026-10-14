// Retirement age: date at 60, time left, EPF milestones, civil service pension and gratuity.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../../assets/js/retire-core.js');

test('Born 15 May 1990: retires at 60 on 15 May 2050, 23 years 7 months 1 day from 14 October 2026', () => {
  const r = R.calculate({ dob: '1990-05-15', today: '2026-10-14' });
  assert.equal(r.date, '2050-05-15');
  assert.deepEqual([r.left.years, r.left.months, r.left.days], [23, 7, 1]);
  assert.deepEqual(r.milestones.map(m => m.date), ['2040-05-15', '2045-05-15', '2050-05-15', '2065-05-15']);
  assert.equal(r.ageNow.years, 36);
});

test('Pension 1/600 per month of service, capped at 360 months (60%); gratuity 7.5% x months', () => {
  const r = R.calculate({ dob: '1975-03-01', sector: 'gov', start: '2000-07-01', salary: 5000, today: '2026-10-14' });
  assert.equal(r.service.totalMonths, 416);
  assert.equal(r.pension, 3000);
  assert.equal(r.gratuity, 156000);
  const s = R.calculate({ dob: '1980-01-10', sector: 'gov', start: '2010-01-10', salary: 4000, today: '2026-10-14' });
  assert.equal(s.service.totalMonths, 360);
  assert.equal(s.pension, 2400);
  assert.equal(s.gratuity, 108000);
});

test('Optional retirement at 50 with 25 years; under 10 years no pension; 29 February birthdays', () => {
  const r = R.calculate({ dob: '1980-01-10', sector: 'gov', age: 50, start: '2005-01-10', salary: 4000, today: '2026-10-14' });
  assert.equal(r.date, '2030-01-10');
  assert.equal(r.service.totalMonths, 300);
  assert.equal(r.pension, 2000);
  assert.equal(r.gratuity, 90000);
  assert.equal(R.calculate({ dob: '1980-01-10', sector: 'gov', start: '2032-01-10', salary: 4000 }).eligible, false);
  assert.equal(R.calculate({ dob: '1988-02-29' }).date, '2048-02-29');
  assert.equal(R.calculate({ dob: '1987-02-28', age: 61 }).date, '2048-02-28');
  assert.equal(R.birthday([1992, 2, 29], 59), '2051-02-28');
  assert.equal(R.calculate({ dob: '1990-05-15', sector: 'gov', age: 65 }).age, 60);
});
