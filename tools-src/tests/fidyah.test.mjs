// Fidyah: state rates, multiplying by Ramadans delayed, unable to fast, pregnant/nursing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const F = require('../../assets/js/fidyah-core.js');

test('State rates for 2026', () => {
  assert.equal(F.rate('selangor', 0), 2);
  assert.equal(F.rate('selangor', 1), 4.3);
  assert.equal(F.rate('wp'), 4);
  assert.equal(F.rate('johor', 2), 5);
  assert.equal(F.rate('kedah', 9), 4);
  assert.equal(Object.keys(F.STATES).length, 14);
});

test('Qada delayed: one fidyah per day for each Ramadan passed', () => {
  const r = F.calculate({ days: 5, years: 2, state: 'selangor', type: 1, reason: 'delay' });
  assert.equal(r.count, 10);
  assert.equal(r.total, 43);
  assert.equal(r.qada, 5);
  assert.equal(F.calculate({ days: 7, years: 1, state: 'wp' }).total, 28);
  assert.equal(F.calculate({ days: 7, years: 0, state: 'wp' }).total, 0);
});

test('Unable to fast, and pregnant or nursing for the child', () => {
  const u = F.calculate({ days: 30, years: 3, state: 'wp', reason: 'unable' });
  assert.equal(u.total, 120);
  assert.equal(u.qada, 0);
  const c = F.calculate({ days: 10, years: 1, state: 'wp', reason: 'child' });
  assert.equal(c.count, 20);
  assert.equal(c.total, 80);
  assert.equal(F.calculate({ days: 3, years: 1, rate: 6.5 }).total, 19.5);
});
