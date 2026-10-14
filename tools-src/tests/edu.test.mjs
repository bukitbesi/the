// Education cost planner: inflated yearly costs, total, and monthly saving needed after existing savings.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('../../assets/js/edu-core.js');

test('Age 5, a 4-year degree at 18 costing RM25,000 a year today, 5% inflation, 4.10% return, RM5,000 saved', () => {
  const r = E.calculate({ age: 5, start: 18, study: 4, cost: 25000, inflation: 5, ret: 4.1, saved: 5000 });
  assert.equal(r.years, 13);
  assert.equal(r.list[0].cost, 47141.23);
  assert.equal(r.total, 203184.58);
  assert.equal(r.monthly, 889.77);
});

test('With no inflation or return the saving is the plain cost spread over the months', () => {
  const r = E.calculate({ age: 8, start: 18, study: 3, cost: 12000, inflation: 0, ret: 0, saved: 0 });
  assert.equal(r.total, 36000);
  assert.equal(r.monthly, 300);
  assert.equal(E.calculate({ age: 18, start: 18, study: 3, cost: 12000 }).monthly, null);
});
