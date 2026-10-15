// Driving licence fees: LDL, PDL, CDL renewal per year, physical card and IDP.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const L = require('../../assets/js/lesen-core.js');

test('Car (D): LDL RM30 for 3 months + PDL RM60 = RM90 to JPJ; CDL RM30 a year, 5 years RM150', () => {
  const r = L.calculate({ cls: 'D', period: 3, years: 5 });
  assert.equal(r.ldl, 30); assert.equal(r.pdl, 60); assert.equal(r.jpj, 90); assert.equal(r.renewal, 150);
  assert.equal(L.calculate({ cls: 'D', period: 6 }).ldl, 60);
  assert.equal(L.calculate({ cls: 'D', period: 3, ldlCount: 2 }).ldl, 60);
});

test('Motorcycle (B2): LDL RM2, PDL RM2, CDL RM20 a year; card RM20 unless free; IDP RM150; 10-year cap', () => {
  const r = L.calculate({ cls: 'B2', years: 10, card: 'yes' });
  assert.equal(r.jpj, 4); assert.equal(r.renewal, 200); assert.equal(r.card, 20);
  assert.equal(L.calculate({ cls: 'B2', card: 'yes', freeCard: 'yes' }).card, 0);
  assert.equal(L.calculate({ cls: 'D', idp: 'yes' }).idp, 150);
  assert.equal(L.calculate({ cls: 'D', years: 15 }).years, 10);
  assert.equal(L.calculate({ cls: 'D', school: 1800, card: 'yes' }).newTotal, 1910);
});
