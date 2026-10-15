// Traffic summons tiered compound (JPJ and PDRM from 1 January 2026): 50% to day 15, RM200 on RM300 to day 30, full to day 60.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../../assets/js/saman-core.js');

test('RM300 compound: RM150 within 15 days, RM200 on days 16 to 30, RM300 on days 31 to 60', () => {
  const r = S.calculate({ amount: 300, notice: '2026-10-01', pay: '2026-10-15' });
  assert.equal(r.day, 15); assert.equal(r.tier, 'early'); assert.equal(r.payable, 150); assert.equal(r.save, 150); assert.equal(r.daysLeft, 0);
  assert.deepEqual(r.tiers.map(t => [t.pay, t.last]), [[150, '2026-10-15'], [200, '2026-10-30'], [300, '2026-11-29']]);
  assert.equal(S.calculate({ amount: 300, notice: '2026-10-01', pay: '2026-10-16' }).payable, 200);
  assert.equal(S.calculate({ amount: 300, notice: '2026-10-01', pay: '2026-11-29' }).payable, 300);
});

test('From day 61 there is no compound offer; court date and flags', () => {
  const r = S.calculate({ amount: 300, notice: '2026-10-01', pay: '2026-11-30' });
  assert.equal(r.day, 61); assert.equal(r.tier, 'court'); assert.equal(r.payable, null); assert.equal(r.courtFrom, '2026-11-30');
  assert.equal(S.calculate({ amount: 300, notice: '2025-12-20', pay: '2026-01-02' }).before2026, true);
  assert.equal(S.calculate({ amount: 500, notice: '2026-10-01', pay: '2026-10-01' }).overMax, true);
});

test('Lower compounds scale the same way; pay date before notice counts as day 1; defaults to today', () => {
  assert.equal(S.calculate({ amount: 150, notice: '2026-10-01', pay: '2026-10-20' }).payable, 100);
  assert.equal(S.calculate({ amount: 100, notice: '2026-10-01', pay: '2026-10-02' }).payable, 50);
  assert.equal(S.calculate({ amount: 300, notice: '2026-10-05', pay: '2026-10-01' }).day, 1);
  const t = S.calculate({ today: '2026-10-15' });
  assert.equal(t.amount, 300); assert.equal(t.day, 1); assert.equal(t.tiers[0].last, '2026-10-29');
});
