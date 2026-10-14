// Working days by state: weekends, federal and state holidays, replacement days, deadlines.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const W = require('../../assets/js/workdays-core.js');

test('Selangor 2027 has 248 working days; 2026 has 244', () => {
  assert.equal(W.count({ state: 'selangor', from: '2027-01-01', to: '2027-12-31' }).workdays, 248);
  assert.equal(W.count({ state: 'selangor', from: '2026-01-01', to: '2026-12-31' }).workdays, 244);
  assert.deepEqual(W.months('selangor', 2027).map(m => m.workdays), [19, 18, 21, 22, 19, 21, 22, 20, 21, 20, 22, 23]);
});

test('Kedah, Kelantan and Terengganu rest on Friday and Saturday; Johor on Saturday and Sunday', () => {
  assert.deepEqual(W.weekendDays('kelantan'), [5, 6]);
  assert.deepEqual(W.weekendDays('johor'), [6, 0]);
  const r = W.count({ state: 'terengganu', from: '2027-01-01', to: '2027-12-31' });
  assert.equal(r.workdays, 239);
  assert.equal(W.count({ state: 'kelantan', from: '2027-01-01', to: '2027-12-31' }).workdays, 241);
});

test('2026 Hari Raya: 20 March extra holiday everywhere, 19 March in Kelantan, 24 March in Johor', () => {
  const sel = W.holidays('selangor', 2026).map(h => h.date);
  assert.ok(sel.includes('2026-03-20') && sel.includes('2026-03-23') && !sel.includes('2026-03-19'));
  assert.ok(W.holidays('kelantan', 2026).some(h => h.date === '2026-03-19'));
  assert.ok(W.holidays('johor', 2026).some(h => h.date === '2026-03-24'));
  assert.ok(!W.holidays('sarawak', 2026).some(h => h.date === '2026-11-08'));
});

test('November 2026 in Selangor: 20 working days, Deepavali replaced on Monday 9 November', () => {
  const r = W.count({ state: 'selangor', from: '2026-11-01', to: '2026-11-30', leave: 2 });
  assert.equal(r.workdays, 20);
  assert.equal(r.holidays, 1);
  assert.equal(r.holidaysOnWeekend, 1);
  assert.equal(r.afterLeave, 18);
});

test('14 working days from 14 October 2026 in Selangor ends on 3 November', () => {
  assert.equal(W.addWorkdays('selangor', '2026-10-14', 14).date, '2026-11-03');
  assert.equal(W.addWorkdays('selangor', '2026-10-14', 0).date, '2026-10-14');
});
