// EV vs petrol: home charging as the change in the TNB bill (RP4), public charging at a user rate, BUDI95 petrol.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../../assets/js/tnb-core.js');
const E = require('../../assets/js/ev-core.js');
const base = { km: 1500, evUse: 14.2, homeShare: 80, houseKwh: 400, publicRate: 1.4, protection: 800, petrolUse: 4.9, budi: 'yes', marketPrice: 4.62 };

test('1,500 km a month: 213 kWh; 170.4 kWh at home adds RM93.71 to a 400 kWh bill (about 55 sen/kWh), RM59.64 public', () => {
  const r = E.calculate(base, T);
  assert.equal(Math.round(r.evKwh), 213); assert.equal(r.before, 111.48); assert.equal(r.after, 205.19);
  assert.equal(r.home, 93.71); assert.equal(r.pub, 59.64); assert.equal(r.ev, 153.35); assert.equal(Math.round(r.homeSen), 55);
});

test('Saga at 4.9 L/100 km: 73.5 litres = RM146.27 on BUDI95, RM339.57 unsubsidised; EV saves RM186.22 a month without BUDI95', () => {
  const r = E.calculate(base, T);
  assert.equal(r.petrol, 146.27); assert.equal(r.save, -7.08);
  const n = E.calculate({ ...base, budi: 'no', evExtra: 20000 }, T);
  assert.equal(n.petrol, 339.57); assert.equal(n.save, 186.22); assert.equal(n.yearly, 2234.64); assert.equal(Math.round(n.payback * 10) / 10, 8.9);
});

test('BUDI95 quota: litres above 300 a month at the market price; all-public charging; no payback when not saving', () => {
  const r = E.calculate({ ...base, km: 7000, homeShare: 0 }, T);
  assert.equal(r.subsidised, 300); assert.equal(r.home, 0);
  assert.equal(r.petrol, Math.round((300 * 1.99 + (343 - 300) * 4.62) * 100) / 100);
  assert.equal(E.calculate({ ...base, evExtra: 10000 }, T).payback, null);
});
