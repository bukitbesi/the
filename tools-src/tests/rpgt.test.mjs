// RPGT: holding year from dates, Schedule 5 rates, exemptions and retention.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../../assets/js/rpgt-core.js');

test('Holding year: within 3 years, then the 4th, 5th, 6th year', () => {
  assert.equal(R.holdingYear('2023-03-01', '2026-03-01'), 3);
  assert.equal(R.holdingYear('2023-03-01', '2026-03-02'), 4);
  assert.equal(R.holdingYear('2020-01-01', '2025-01-01'), 5);
  assert.equal(R.holdingYear('2020-01-01', '2025-01-02'), 6);
  assert.equal(R.holdingYear('2026-01-01', '2025-01-01'), 0);
});

test('Rates by owner and year', () => {
  assert.deepEqual([1, 3, 4, 5, 6, 10].map(y => R.rateFor('citizen', y)), [30, 30, 20, 15, 0, 0]);
  assert.deepEqual([1, 4, 5, 6].map(y => R.rateFor('foreigner', y)), [30, 30, 30, 10]);
  assert.deepEqual([1, 4, 5, 6].map(y => R.rateFor('company', y)), [30, 20, 15, 10]);
});

test('Worked example: 4th year, RM73,000 gain, RM10,000 exemption', () => {
  const r = R.calculate({ owner: 'citizen', acquired: '2023-03-01', disposed: '2026-06-01', purchase: 500000, acqCosts: 15000, sale: 600000, saleCosts: 12000 });
  assert.equal(r.gain, 73000);
  assert.equal(r.exemption, 10000);
  assert.equal(r.tax, 12600);
  assert.equal(r.retention, 18000);
  assert.equal(r.refund, 5400);
});

test('Exemption is 10% when larger; none for companies; residence exemption', () => {
  const big = R.calculate({ owner: 'citizen', acquired: '2024-01-01', disposed: '2025-01-01', purchase: 400000, sale: 600000 });
  assert.equal(big.exemption, 20000);
  assert.equal(big.tax, 54000);
  const co = R.calculate({ owner: 'company', acquired: '2024-01-01', disposed: '2025-01-01', purchase: 400000, sale: 600000 });
  assert.equal(co.exemption, 0);
  assert.equal(co.tax, 60000);
  const home = R.calculate({ owner: 'citizen', acquired: '2024-01-01', disposed: '2025-01-01', purchase: 400000, sale: 600000, residence: 'yes' });
  assert.equal(home.tax, 0);
  assert.equal(R.calculate({ owner: 'foreigner', sale: 100000 }).retention, 7000);
});

test('A loss pays no tax', () => {
  const r = R.calculate({ owner: 'citizen', acquired: '2024-01-01', disposed: '2025-01-01', purchase: 500000, sale: 450000 });
  assert.equal(r.tax, 0);
  assert.equal(r.exemption, 0);
});

test('Retention: 5% for a company selling within 3 years, 3% after', () => {
  const early = R.calculate({ owner: 'company', acquired: '2024-01-01', disposed: '2026-01-01', purchase: 400000, sale: 500000 });
  assert.equal(early.retentionPct, 5);
  assert.equal(early.retention, 25000);
  const later = R.calculate({ owner: 'company', acquired: '2020-01-01', disposed: '2026-01-01', purchase: 400000, sale: 500000 });
  assert.equal(later.retentionPct, 3);
  assert.equal(R.calculate({ owner: 'citizen', acquired: '2025-01-01', disposed: '2026-01-01', sale: 100000 }).retentionPct, 3);
});
