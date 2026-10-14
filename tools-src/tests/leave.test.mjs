// Leave under the Employment Act: tiers, pro rata with half-day rounding, payout at ORP.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const L = require('../../assets/js/leave-core.js');

test('Leaving on 30 June 2026 after 4 years: 12 x 6/12 = 6 days, 3 unused paid at RM3,900 / 26', () => {
  const r = L.calculate({ start: '2022-03-01', end: '2026-06-30', leaving: 'yes', taken: 3, wage: 3900 });
  assert.equal(r.full, 12);
  assert.equal(r.earned, 6);
  assert.equal(r.payout, 450);
  assert.equal(r.sick, 18);
});

test('Joined 1 April 2026: 8 x 9/12 = 6 days this year; tiers 8/12/16 and 14/18/22', () => {
  assert.equal(L.calculate({ start: '2026-04-01', end: '2026-10-14' }).earned, 6);
  assert.equal(L.annual(1, 7), 5);
  assert.equal(L.annual(6, 5), 7);
  assert.equal(L.calculate({ start: '2020-01-01', end: '2026-10-14' }).full, 16);
  assert.equal(L.calculate({ start: '2020-01-01', end: '2026-10-14' }).sick, 22);
  assert.equal(L.round(4.67), 5);
  assert.equal(L.round(4.33), 4);
});
