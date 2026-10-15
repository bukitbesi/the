// Solar ATAP: self-consumption avoids the full tariff, exports credited at the energy charge up to imports and MAQ.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../../assets/js/tnb-core.js');
const S = require('../../assets/js/solar-core.js');
const base = { tnb: T, usage: 600, kwp: 6, kwac: 5, yield: 1200, selfuse: 60, costKwp: 3000, afa: 3.67, protection: 800 };

test('6 kWp, 600 kWh, 60% self-use: 600 kWh made, 240 imported, 240 credited; bill RM215.98 → RM41.76', () => {
  const r = S.calculate(base);
  assert.equal(r.gen, 600); assert.equal(r.self, 360); assert.equal(r.imports, 240); assert.equal(r.credited, 240); assert.equal(r.maq, 750);
  assert.equal(r.without, 215.98); assert.equal(r.with, 41.76); assert.equal(r.saving, 174.22);
  assert.equal(r.lines.credit, 64.87); assert.equal(r.lines.eei, 0);
});

test('SuRIA RM600 per kWac up to RM3,000; payback 7.2 years on RM3,000/kWp; caps 5 kW single, 15 kW three phase', () => {
  const r = S.calculate({ ...base, suria: 'yes' });
  assert.equal(r.rebate, 3000); assert.equal(r.net, 15000); assert.equal(Math.round(r.payback * 10) / 10, 7.2);
  assert.equal(S.calculate({ ...base, kwac: 3, suria: 'yes' }).rebate, 1800);
  assert.equal(S.calculate({ ...base, kwac: 8 }).overCap, true);
  assert.equal(S.calculate({ ...base, kwac: 8, phase: 'three' }).overCap, false);
});

test('Exports above imports are forfeited; the EEI uses the lower of imported and net kWh', () => {
  const r = S.calculate({ ...base, usage: 300, selfuse: 30 });
  assert.equal(r.imports, 120); assert.equal(r.exported, 420); assert.equal(r.credited, 120); assert.equal(r.forfeited, 300);
  const big = S.calculate({ ...base, usage: 1200, kwp: 8, kwac: 8, selfuse: 50 });
  assert.equal(big.lines.eei, 32);
});
