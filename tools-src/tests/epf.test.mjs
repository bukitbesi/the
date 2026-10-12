// EPF projection: dividend method, account split, statutory contributions and benchmarks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('../../assets/js/epf-core.js');

test('Published dividend history and averages', () => {
  assert.equal(E.FACTS.latest, 6.15);
  assert.deepEqual(E.DIVIDENDS.at(-1), [2025, 6.15, 6.15]);
  assert.equal(E.FACTS.average10, 5.88);
});

test('Opening balance earns a full year of dividend', () => {
  const r = E.project({ age: 40, retireAge: 41, persaraan: 100000, salary: 0, dividend: 6.15 });
  assert.equal(r.final, 106150);
  assert.equal(E.dividendOn(100000, 6.15), 6150);
});

test('Monthly contributions earn dividend for the months left in the year', () => {
  // RM3,000: RM330 + RM390 a month. Dividend = 720 × 6% × (11 + 10 + … + 0) / 12 = 237.60.
  const r = E.project({ age: 30, retireAge: 31, salary: 3000, dividend: 6 });
  assert.equal(r.years[0].employee, 3960);
  assert.equal(r.years[0].employer, 4680);
  assert.equal(r.firstYearDividend, 237.6);
  assert.equal(r.final, 8877.6);
});

test('New money is split 75 / 15 / 10 across the three accounts', () => {
  const r = E.project({ age: 30, retireAge: 31, salary: 3000, dividend: 6 });
  assert.equal(r.accounts.persaraan, 6658.2);
  assert.equal(r.accounts.sejahtera, 1331.64);
  assert.equal(r.accounts.fleksibel, 887.76);
});

test('Employer rate drops to 12% above RM5,000 and salary rises each year', () => {
  const r = E.project({ age: 30, retireAge: 32, salary: 5000, raise: 10, dividend: 0 });
  assert.equal(r.years[0].employer, 650 * 12);
  assert.equal(r.years[1].employer, Math.ceil(5500 * 0.12) * 12);
});

test('Higher own contribution rate and voluntary top-ups', () => {
  const r = E.project({ age: 30, retireAge: 31, salary: 3000, ownRate: 15, topUp: 100, dividend: 0 });
  assert.equal(r.years[0].employee, 450 * 12);
  assert.equal(r.final, (450 + 390 + 100) * 12);
});

test('Retirement benchmarks', () => {
  assert.equal(E.project({ age: 59, retireAge: 60, persaraan: 400000, dividend: 0 }).tier, 'basic');
  assert.equal(E.project({ age: 59, retireAge: 60, persaraan: 100000, dividend: 0 }).gapToBasic, 290000);
  assert.equal(E.project({ age: 59, retireAge: 60, persaraan: 240000, dividend: 0 }).monthlyFor20Years, 1000);
});

test('Benchmarks compare the inflation-adjusted value', () => {
  // RM500,000 in 10 years at 3% inflation is about RM372,047 today: below the RM390,000 Basic level.
  const r = E.project({ age: 50, retireAge: 60, persaraan: 500000, dividend: 0, inflation: 3 });
  assert.equal(r.final, 500000);
  assert.equal(r.real, 372046.96);
  assert.equal(r.tier, 'below');
});
