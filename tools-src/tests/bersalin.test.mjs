// Due date (LMP + 280 days, cycle adjusted), gestational age, 98-day maternity and 7-day paternity leave.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const B = require('../../assets/js/bersalin-core.js');

test('LMP 1 January 2026: due 8 October 2026; 30-day cycle 10 October, 25-day cycle 5 October', () => {
  const r = B.calculate({ lmp: '2026-01-01' });
  assert.equal(r.edd, '2026-10-08');
  assert.equal(r.dates.find(x => x.key === 't2').date, '2026-04-09');
  assert.equal(r.dates.find(x => x.key === 't3').date, '2026-07-16');
  assert.equal(r.dates.find(x => x.key === 'post').date, '2026-10-22');
  assert.equal(B.calculate({ lmp: '2026-01-01', cycle: 30 }).edd, '2026-10-10');
  assert.equal(B.calculate({ lmp: '2026-01-01', cycle: 25 }).edd, '2026-10-05');
});

test('LMP 1 April 2026 on 15 October 2026: 28 weeks 1 day, third trimester, due 6 January 2027', () => {
  const r = B.calculate({ lmp: '2026-04-01', today: '2026-10-15' });
  assert.equal(r.edd, '2027-01-06');
  assert.deepEqual([r.ga.weeks, r.ga.days], [28, 1]);
  assert.equal(r.trimester, 3); assert.equal(r.toGo, 83);
});

test('98 days from the due date ends on day 98; earliest start 30 days before; paternity 7 days; allowance', () => {
  const r = B.calculate({ lmp: '2026-01-01' });
  assert.equal(r.leave.start, '2026-10-08'); assert.equal(r.leave.end, '2027-01-13'); assert.equal(r.leave.back, '2027-01-14');
  const e = B.calculate({ lmp: '2026-01-01', before: 30 });
  assert.equal(e.leave.start, '2026-09-08'); assert.equal(e.leave.end, '2026-12-14');
  assert.equal(B.calculate({ lmp: '2026-01-01', before: 45 }).leave.start, '2026-09-08');
  assert.equal(r.paternity.end, '2026-10-14');
  assert.equal(B.calculate({ lmp: '2026-01-01', rate: 100 }).allowance, 9800);
  assert.equal(B.calculate({ lmp: '2026-01-01', sector: 'civil', rate: 100 }).allowance, null);
  assert.equal(B.calculate({ lmp: '2026-01-01', sector: 'civil' }).leave.days, 90);
});
