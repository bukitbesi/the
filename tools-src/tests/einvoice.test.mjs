// e-Invoice start-date checker: each case mirrors a worked example in LHDN's e-Invoice FAQ (updated 4 September 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('../../assets/js/einvoice-core.js');
const d = o => { const r = E.check(o); return [r.status, r.date, r.relaxEnd, r.rule]; };

test('phases by YA2022 turnover, with interim relaxation ends', () => {
  assert.deepEqual(d({ started: 'by2022', rev2022: 150e6 }), ['mandatory', '2024-08-01', '2025-01-31', 'phase1']);
  assert.deepEqual(d({ started: 'by2022', rev2022: 30e6 }), ['mandatory', '2025-01-01', '2025-06-30', 'phase2']);
  assert.deepEqual(d({ started: 'by2022', rev2022: 6e6 }), ['mandatory', '2025-07-01', '2025-12-31', 'phase3']);
  assert.deepEqual(d({ started: 'by2022', rev2022: '5,000,000' }), ['mandatory', '2026-01-01', '2027-12-31', 'phase4']);
  assert.deepEqual(d({ started: 'by2022', rev2022: 3e6 }), ['mandatory', '2026-01-01', '2027-12-31', 'phase4']);
});

test('below RM3 million: exempt (Ali, RM2.9m) unless a group link (RC Cycling) or later growth (Mountain Jump)', () => {
  assert.deepEqual(d({ started: 'by2022', rev2022: 2.9e6 }), ['exempt', null, null, 'exempt']);
  assert.deepEqual(d({ started: 'by2022', rev2022: 400000, group: true }), ['mandatory', '2026-07-01', '2027-12-31', 'group']);
  assert.deepEqual(d({ started: 'by2022', rev2022: 400000, reached: 'YA2023-2025' }), ['mandatory', '2026-07-01', '2027-12-31', 'grew']);
  assert.deepEqual(d({ started: 'by2022', rev2022: 400000, reached: 2026 }), ['mandatory', '2028-01-01', null, 'reach']); // Winner Fertilizer
});

test('businesses started in YA2023–YA2025 (Layang Warna, Paper Bottle, Pak Salleh)', () => {
  assert.deepEqual(d({ started: '2023', reached: 'YA2023-2025' }), ['mandatory', '2026-07-01', '2027-12-31', 'grew']);
  assert.deepEqual(d({ started: '2023', group: true }), ['mandatory', '2026-07-01', '2027-12-31', 'group']);
  assert.deepEqual(d({ started: '2025', reached: 2027 }), ['mandatory', '2029-01-01', null, 'reach']);
  assert.deepEqual(d({ started: '2025' }), ['exempt', null, null, 'exempt']);
});

test('businesses started from YA2026 (Coco Lock) and the penalty range', () => {
  assert.deepEqual(d({ started: '2026+', group: true, commenced: '2026-09-01' }), ['mandatory', '2026-09-01', null, 'groupNew']);
  assert.deepEqual(d({ started: '2026+', group: true, commenced: '2026-03-01' }), ['mandatory', '2026-07-01', '2027-12-31', 'groupNew']);
  assert.deepEqual(d({ started: '2026+', reached: 2026 }), ['mandatory', '2028-01-01', null, 'reach']);
  assert.deepEqual(d({ started: '2026+' }), ['exempt', null, null, 'exempt']);
  assert.deepEqual(E.penalty(1), { min: 200, max: 20000 }); assert.deepEqual(E.penalty(3), { min: 600, max: 60000 });
});
