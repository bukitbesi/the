// Overtime: ORP ÷ 26, hourly rate, normal/rest day/public holiday rates, coverage and the 104-hour limit.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const O = require('../../assets/js/ot-core.js');

const line = (r, key) => r.lines.find(l => l.key === key);

test('Monthly-rated: ORP = wages ÷ 26, hourly = ORP ÷ normal hours', () => {
  const r = O.calculate({ wage: 2600, hoursPerDay: 8, normalOt: 10 });
  assert.equal(r.orp, 100);
  assert.equal(r.hrp, 12.5);
  assert.equal(line(r, 'normal').rate, 18.75);
  assert.equal(line(r, 'normal').amount, 187.5);
});

test('Rest day and public holiday pay for monthly-rated employees', () => {
  const r = O.calculate({ wage: 2600, hoursPerDay: 8, restHalf: 1, restFull: 1, restOt: 2, holidayDays: 1, holidayOt: 2 });
  assert.equal(line(r, 'restHalf').amount, 50);
  assert.equal(line(r, 'restFull').amount, 100);
  assert.equal(line(r, 'restOt').amount, 50);
  assert.equal(line(r, 'holiday').amount, 200);
  assert.equal(line(r, 'holidayOt').amount, 75);
  assert.equal(r.total, 475);
});

test('Daily-rated employees get one or two days for rest-day work', () => {
  const r = O.calculate({ wage: 80, basis: 'daily', hoursPerDay: 8, restHalf: 1, restFull: 1 });
  assert.equal(r.orp, 80);
  assert.equal(line(r, 'restHalf').amount, 80);
  assert.equal(line(r, 'restFull').amount, 160);
});

test('Minimum wage overtime rate', () => {
  const r = O.calculate({ wage: 1700, hoursPerDay: 8, normalOt: 1 });
  assert.equal(r.orp, 65.38);
  assert.equal(r.hrp, 8.17);
  assert.equal(line(r, 'normal').rate, 12.26);
  assert.equal(O.calculate({ wage: 1500 }).belowMinimum, true);
});

test('Coverage: up to RM4,000, or any wage for First Schedule work; 104-hour limit', () => {
  assert.equal(O.calculate({ wage: 4000 }).covered, true);
  assert.equal(O.calculate({ wage: 4500 }).covered, false);
  assert.equal(O.calculate({ wage: 4500, specified: 'yes' }).covered, true);
  assert.equal(O.calculate({ wage: 3000, normalOt: 100, restOt: 5 }).overCap, true);
  assert.equal(O.calculate({ wage: 3000, normalOt: 104 }).overCap, false);
});
