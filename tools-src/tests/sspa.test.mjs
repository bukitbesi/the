// SSPA: 8% (at least RM240) then 7% compounding for Pelaksana and P&P; 4% then 3% for Pengurusan Tertinggi; pensions.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../../assets/js/sspa-core.js');

test('RM2,000 basic: +RM240 (floor) = RM2,240, then +RM156.80 = RM2,396.80', () => {
  const r = P.calculate({ basic: 2000, group: 'pelaksana' });
  assert.equal(r.p1, 240); assert.equal(r.s1, 2240); assert.equal(r.p2, 156.8); assert.equal(r.s2, 2396.8); assert.equal(r.floorUsed, true);
  assert.equal(P.calculate({ basic: 3000 }).p1, 240);
});

test('RM4,000 P&P: RM4,320 then RM4,622.40 (15.56%); RM10,000 Pengurusan Tertinggi: RM10,400 then RM10,712', () => {
  const r = P.calculate({ basic: 4000, group: 'pp' });
  assert.equal(r.s1, 4320); assert.equal(r.s2, 4622.4); assert.equal(Math.round(r.risePct * 100) / 100, 15.56);
  const k = P.calculate({ basic: 10000, group: 'kpt' });
  assert.equal(k.s1, 10400); assert.equal(k.s2, 10712);
});

test('Phase 2 on the 31 December 2025 salary includes the 2025 increment; pensions get 8% then 7% with no floor', () => {
  const r = P.calculate({ basic: 2000, kgt: 100 });
  assert.equal(r.dec2025, 2340); assert.equal(r.p2, 163.8); assert.equal(r.s2, 2503.8);
  const p = P.calculate({ basic: 2000, mode: 'pension' });
  assert.equal(p.p1, 160); assert.equal(p.s2, 2311.2);
});
