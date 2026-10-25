// Civil service pension: JPA's worked examples (PPSM pension circular), minimum pension, gratuity, GCR, pension age,
// SSPA adjustments for pensioners, and agreement with the retirement-age calculator.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../../assets/js/pencen-core.js');
const R = require('../../assets/js/retire-core.js');

test('JPA examples: RM5,440.60 × 386 months and RM2,203.56 × 255 months', () => {
  const a = P.pension(5440.60, 386); assert.equal(a.pension, 3264.36); assert.equal(a.counted, 360); assert.equal(a.share, 0.6);
  assert.equal(P.gratuity(5440.60, 386), 157505.37);
  assert.equal(P.pension(2203.56, 255).pension, 936.51); assert.equal(P.gratuity(2203.56, 255), 42143.08);
  assert.equal(P.gratuity(1704.83, 222), 28385.42); assert.equal(P.pension(1704.83, 240).pension, 681.93);
});

test('Minimum RM1,000 applies from 300 months only; Budget 2027 figure kept separate', () => {
  const a = P.pension(1800, 300); assert.equal(a.pension, 1000); assert.equal(a.floor, true); assert.equal(P.pension(2000, 300).floor, false);
  assert.equal(P.pension(2000, 299).pension, 996.67);
  const r = P.retiree({ salary: 2000, months: 300 }); assert.equal(r.pension, 1000); assert.equal(r.pension2027, 1350);
  assert.equal(P.retiree({ salary: 2000, months: 299 }).pension2027, 996.67);
});

test('Default example: born 1966-06-15, appointed 1993-07-01, RM6,000 + RM800, 180 days GCR', () => {
  const r = P.retiree({ birth: '1966-06-15', appointed: '1993-07-01', salary: 6000, allowances: 800, gcrDays: 180 });
  assert.equal(r.retire, '2026-06-15'); assert.equal(r.months, 395); assert.equal(r.pension, 3600);
  assert.equal(r.gratuity, 177750); assert.equal(r.gcr, 40800); assert.equal(r.lump, 218550); assert.equal(r.pensionStarts, '2026-06-15');
});

test('Optional retirement: pension waits for 55 (from 12 April 1991) or 45/50 (earlier); under 10 years nothing', () => {
  const r = P.retiree({ birth: '1980-03-10', appointed: '2005-01-01', retire: '2026-01-01', salary: 5000, gcrDays: 200 });
  assert.equal(r.months, 252); assert.equal(r.pension, 2100); assert.equal(r.gratuity, 94500); assert.equal(r.gcrDays, 180); assert.equal(r.gcr, 30000);
  assert.equal(r.pensionAge, 55); assert.equal(r.pensionStarts, '2035-03-10');
  const old = P.retiree({ birth: '1975-01-01', appointed: '1990-01-01', retire: '2015-01-01', salary: 4000, gender: 'f' });
  assert.equal(old.pensionAge, 45); assert.equal(old.pensionStarts, '2020-01-01');
  const short = P.retiree({ birth: '1990-01-01', appointed: '2020-01-01', retire: '2026-01-01', salary: 4000, gcrDays: 30 });
  assert.equal(short.eligible, false); assert.equal(short.pension, 0); assert.equal(short.gratuity, 0); assert.equal(short.gcr, 4000);
});

test('SSPA: +8% over RM3,000 or +RM240, then +7%; JUSA 4% and 3%; PKKP added; later retirees fewer phases', () => {
  const a = P.adjusted({ salary: 5000, months: 360, retired: '2020-05-01' });
  assert.deepEqual(a.steps.map(s => s.after), [5400, 5778]); assert.equal(a.original, 3000); assert.equal(a.pension, 3466.8);
  const b = P.adjusted({ salary: 2500, months: 300, retired: '2020-05-01', pkkp: 150 });
  assert.deepEqual(b.steps.map(s => s.after), [2740, 2931.8]); assert.equal(b.pension, 1615.9);
  const c = P.adjusted({ salary: 20000, months: 360, retired: '2024-01-01', jusa: true });
  assert.deepEqual(c.steps.map(s => s.after), [20800, 21424]);
  assert.equal(P.adjusted({ salary: 5000, months: 360, retired: '2025-06-01' }).steps.length, 1);
  assert.equal(P.adjusted({ salary: 5000, months: 360, retired: '2026-02-01' }).steps.length, 0);
});

test('Agrees with the retirement-age calculator on pension and gratuity', () => {
  [[4200, '1996-03-01', '1968-08-20'], [2100, '2000-01-01', '1975-01-01'], [9000, '1990-01-01', '1966-01-01']].forEach(([salary, start, dob]) => {
    const r = R.calculate({ dob, sector: 'gov', age: 60, start, salary, today: '2026-10-25' });
    const p = P.retiree({ birth: dob, appointed: start, salary });
    assert.equal(p.months, r.service.totalMonths); assert.equal(p.pension, r.pension); assert.equal(p.gratuity, r.gratuity);
  });
});
