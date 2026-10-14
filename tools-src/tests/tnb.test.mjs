// TNB domestic bill (RP4): base charges, EEI band × all kWh, protection level, KWTBB and SST.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../../assets/js/tnb-core.js');

test('Up to 300 kWh: 44.43 sen/kWh less the EEI band rate on every kWh', () => {
  const r = T.calculate({ kwh: 300, afa: 3, protection: 600 });
  assert.equal(Math.round((r.energy + r.capacity + r.network) * 100) / 100, 133.29);
  assert.equal(r.eei, 67.5);
  assert.equal(r.kwtbb, 0);
  assert.equal(r.afa, 0);
  assert.equal(r.total, 65.79);
  assert.equal(T.calculate({ kwh: 200 }).total, 38.86);
});

test('600 kWh: KWTBB 1.6% applies, AFA, retail and SST do not', () => {
  const r = T.calculate({ kwh: 600, afa: 3, protection: 600 });
  assert.equal(r.eeiRate, 9);
  assert.equal(r.kwtbb, 3.4);
  assert.equal(r.total, 215.98);
});

test('Above the protection level: AFA, RM10 retail and SST on the kWh above it', () => {
  const r = T.calculate({ kwh: 800, afa: 3, protection: 600 });
  assert.equal(r.afa, 24);
  assert.equal(r.retail, 10);
  assert.equal(r.sst, 7.15);
  assert.equal(r.total, 370.15);
  // September–December 2026: protected up to 800 kWh.
  const p = T.calculate({ kwh: 800, afa: 3, protection: 800 });
  assert.equal(p.protected, true);
  assert.equal(p.total, 328.62);
  assert.equal(T.protectionOn('2026-10-14'), 800);
  assert.equal(T.protectionOn('2027-01-01'), 600);
});

test('EEI bands and limits', () => {
  assert.deepEqual([1, 200, 201, 650, 900, 1000, 1001].map(T.eeiRate), [25, 25, 24.5, 7.5, 1, 0.5, 0]);
  assert.equal(T.calculate({ kwh: 5000 }).kwh, 1500);
  assert.equal(T.applianceKwh(1000, 8, 30), 240);
});
