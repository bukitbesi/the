// Termination: notice by service, indemnity in lieu, termination benefits by the 1980 Regulations.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../../assets/js/termination-core.js');

test('7.5 years on RM3,500: 8 weeks notice, 20 days x 7.5 years = 150 days = RM20,192.31', () => {
  const r = T.calculate({ start: '2019-01-01', end: '2026-06-30', wage: 3500, reason: 'retrench' });
  assert.equal(r.notice, 8);
  assert.equal(r.inLieu, 6461.54);
  assert.equal(r.benefitDays, 150);
  assert.equal(r.benefit, 20192.31);
});

test('Tiers 10/15/20 days and 4/6/8 weeks; resignation, short service and RM4,000 threshold', () => {
  const t = T.calculate({ start: '2023-01-01', end: '2025-12-31', wage: 2600 });
  assert.equal(t.notice, 6);
  assert.equal(t.benefit, 4500);
  assert.equal(T.calculate({ start: '2025-03-01', end: '2026-10-14', wage: 3000 }).benefit, 1826.92);
  assert.equal(T.calculate({ start: '2026-01-01', end: '2026-10-14', wage: 3000 }).eligible, false);
  assert.equal(T.calculate({ start: '2019-01-01', end: '2026-06-30', wage: 3500, reason: 'resign' }).benefit, 0);
  assert.equal(T.calculate({ start: '2019-01-01', end: '2026-06-30', wage: 6000 }).eligible, false);
  assert.equal(T.calculate({ start: '2019-01-01', end: '2026-06-30', wage: 6000, manual: 'yes' }).eligible, true);
  assert.equal(T.calculate({ start: '2019-01-01', end: '2026-06-30', wage: 3500, contract: 12 }).notice, 12);
});
