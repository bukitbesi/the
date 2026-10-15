// Bursa trading costs: brokerage with minimum, clearing 0.03% capped, stamp duty 0.1% capped, SST on ETFs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const B = require('../../assets/js/bursa-core.js');

test('1,000 shares bought at RM2.00, sold at RM2.30, 0.08% brokerage with RM8 minimum', () => {
  const r = B.calculate({ qty: 1000, buy: 2, sell: 2.3, brokerPct: 0.08, brokerMin: 8 });
  assert.equal(r.buyFees.total, 10.6);
  assert.equal(r.sellFees.total, 10.99);
  assert.equal(r.profit, 278.41);
  assert.equal(r.breakEven, 2.022);
});

test('Caps of RM1,000 on clearing and stamp duty; 8% SST on brokerage and clearing for ETFs', () => {
  const f = B.fees(5000000, 0.001, 8, false);
  assert.equal(f.clearing, 1000);
  assert.equal(f.stamp, 1000);
  const e = B.fees(10000, 0.001, 8, true);
  assert.equal(e.sst, 1.04);
  assert.equal(B.fees(10000, 0.001, 8, false).sst, 0);
});
