// Iddah: quru', three months, death (4 months 10 days), pregnancy and divorce before consummation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const I = require('../../assets/js/iddah-core.js');
const H = require('../../assets/js/hijri-core.js');

test('Husband\'s death: four Hijri months and ten days, with ihdad', () => {
  const r = I.calculate({ event: 'death', date: '2026-10-14', state: 'haid' });
  assert.equal(r.kind, 'wafat');
  assert.equal(r.end, '2027-02-20');
  assert.equal(H.formatHijri(r.endHijri, 'ms'), '13 Ramadan 1448H');
  assert.equal(r.days, 129);
  assert.equal(r.ihdad, true);
  // Applies even if the marriage was not consummated.
  assert.equal(I.calculate({ event: 'death', date: '2026-10-14', consummated: 'no' }).kind, 'wafat');
});

test('Divorce, not menstruating: three Hijri months', () => {
  const r = I.calculate({ event: 'divorce', date: '2026-10-14', state: 'nohaid' });
  assert.equal(r.kind, 'months');
  assert.equal(r.end, H.toGregorian(1448, 8, 3));
  assert.equal(r.end, '2027-01-12');
  assert.equal(r.ihdad, false);
});

test('Divorce, menstruating: ends when the third period after the talak begins', () => {
  const r = I.calculate({ event: 'divorce', date: '2026-10-14', state: 'haid', lastPeriod: '2026-10-01', cycle: 28 });
  assert.deepEqual(r.periods, ['2026-10-29', '2026-11-26', '2026-12-24']);
  assert.equal(r.end, '2026-12-24');
  assert.equal(r.days, 71);
  assert.equal(r.minDays, 32);
  assert.equal(r.rujuk, true);
  // Talak during menstruation: the current period does not count.
  const h = I.calculate({ event: 'divorce', date: '2026-10-03', state: 'haid', lastPeriod: '2026-10-01', cycle: 28 });
  assert.equal(h.end, '2026-12-24');
  assert.equal(h.minDays, 47);
  assert.equal(I.calculate({ event: 'divorce', date: '2026-10-14', state: 'haid' }).end, null);
  assert.equal(I.calculate({ event: 'divorce', date: '2026-10-14', state: 'haid', talak: 'bain', lastPeriod: '2026-10-01' }).rujuk, false);
});

test('Pregnancy ends the iddah at delivery; no iddah before consummation', () => {
  const p = I.calculate({ event: 'death', date: '2026-10-14', state: 'pregnant', due: '2026-12-01' });
  assert.equal(p.kind, 'pregnant');
  assert.equal(p.end, '2026-12-01');
  assert.equal(p.ihdad, true);
  const n = I.calculate({ event: 'divorce', date: '2026-10-14', consummated: 'no' });
  assert.equal(n.kind, 'none');
  assert.equal(n.days, 0);
  assert.equal(I.calculate({ event: 'death', date: 'x' }).error, 'date');
});
