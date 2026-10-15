// Age: exact years-months-days, next birthday, Hijri age on Malaysia's takwim, legal milestones.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const H = require('../../assets/js/hijri-core.js');
const U = require('../../assets/js/umur-core.js');

test('Born 1 May 1990, on 15 October 2026: 36 years 5 months 14 days, 13,316 days, next birthday in 198 days', () => {
  const r = U.calculate({ dob: '1990-05-01', today: '2026-10-15', hijri: H });
  assert.deepEqual([r.years, r.months, r.days], [36, 5, 14]);
  assert.equal(r.totalDays, 13316);
  assert.equal(r.next, '2027-05-01'); assert.equal(r.nextDays, 198); assert.equal(r.nextAge, 37);
  assert.equal(r.weekday, 2);
  assert.equal(r.hijri.y, 37);
  assert.equal(r.hijri.next, '2027-03-14');
});

test('Milestones: MyKad at 12, car licence at 17, voting at 18, retirement at 60; 29 February moves to 1 March', () => {
  const r = U.calculate({ dob: '1990-05-01', today: '2026-10-15', hijri: H });
  const by = k => r.milestones.find(x => x.key === k);
  assert.equal(by('mykad').date, '2002-05-01'); assert.equal(by('adult').reached, true);
  assert.equal(by('senior').date, '2050-05-01'); assert.equal(by('senior').reached, false);
  assert.equal(U.anniversary([2000, 2, 29], 17), '2017-03-01');
  assert.equal(U.anniversary([2000, 2, 29], 12), '2012-02-29');
  assert.equal(U.calculate({ dob: '2026-10-15', today: '2026-10-15' }).nextDays, 0);
  assert.equal(U.calculate({ dob: '2027-01-01', today: '2026-10-15' }), null);
  assert.deepEqual(U.diff([2026, 1, 31], [2026, 3, 1]), { y: 0, m: 1, d: 1 });
});
