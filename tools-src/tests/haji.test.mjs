// Hajj cost and Tabung Haji: Muassasah rates, RM15,000 offer threshold, hibah on the average monthly minimum balance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const H = require('../../assets/js/haji-core.js');

test('B40 pays RM15,000 (subsidy RM18,300), M40 RM23,500 (RM9,800), T20 RM33,300', () => {
  const b = H.calculate({ cat: 'B40' }), m = H.calculate({ cat: 'M40' }), t = H.calculate({ cat: 'T20' });
  assert.equal(b.pay, 15000); assert.equal(b.subsidy, 18300); assert.equal(b.gov, 1000); assert.equal(b.share, 45);
  assert.equal(m.pay, 23500); assert.equal(m.subsidy, 9800); assert.equal(m.share, 71);
  assert.equal(t.subsidy, 0);
  assert.equal(H.calculate({ cat: 'M40', people: 2 }).total, 47000);
});

test('Hibah: RM1,200 kept a year at 3.50% earns RM42; RM500 a month from zero reaches RM15,000 in 30 months', () => {
  assert.equal(H.grow(1200, 0, 3.5, 12).hibah, 42);
  const x = H.monthsTo(0, 500, 3.5, 15000);
  assert.equal(x.months, 30);
  assert.equal(x.hibah, 405.87);
  assert.equal(H.monthsTo(0, 0, 3.5, 15000), null);
  assert.equal(H.monthsTo(16000, 0, 3.5, 15000).months, 0);
});

test('31 December 2028 deadline: 26 months from October 2026; RM3,000 needs RM440 a month', () => {
  assert.equal(H.monthsLeft('2026-10-15'), 26);
  assert.equal(H.monthlyFor(3000, 15000, 26, 3.5), 440);
  const r = H.calculate({ cat: 'M40', balance: 3000, monthly: 300 });
  assert.equal(r.toOffer.months, 38);
  assert.equal(r.meetsDeadline, false);
  assert.equal(r.needDeadline, 440);
});
