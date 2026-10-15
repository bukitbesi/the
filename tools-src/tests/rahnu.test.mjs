// Ar-Rahnu: tawarruq profit rate on the financing vs safekeeping fee per RM100 of gold value.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../../assets/js/rahnu-core.js');

test('RM6,000 of gold, 80%, 6 months: Muamalat RM45 a month (RM270), TEKUN RM30 (RM180), YaPEIM Care RM45, Bisnes RM60', () => {
  const by = id => R.quote(R.FACTS.providers.find(p => p.id === id), 6000, 6, 0);
  assert.equal(by('muamalat').financing, 4800); assert.equal(by('muamalat').monthly, 45); assert.equal(by('muamalat').charge, 270);
  assert.equal(by('tekun').monthly, 30); assert.equal(by('tekun').charge, 180);
  assert.equal(by('care').monthly, 45); assert.equal(by('bisnes').charge, 360);
  assert.equal(Math.round(by('tekun').apr * 100) / 100, 7.5);
  assert.equal(by('tekun').renew, false); assert.equal(R.quote(R.FACTS.providers.find(p => p.id === 'tekun'), 6000, 7, 0).renew, true);
});

test('Gold value = grams × purity × pure price; asking less lowers a bank charge but not a fee on the gold', () => {
  const r = R.calculate({ grams: 10, karat: '916', gram: 500, months: 6 });
  assert.equal(r.marhun, 4580);
  assert.equal(r.best.id, 'tekun');
  const m = R.quote(R.FACTS.providers[0], 6000, 6, 2000), t = R.quote(R.FACTS.providers[2], 6000, 6, 2000);
  assert.equal(m.financing, 2000); assert.equal(m.monthly, 18.75); assert.equal(t.monthly, 30);
  assert.equal(R.calculate({ grams: 10, karat: '916', gram: 500, months: 6, provider: 'muamalat' }).pawn, 439.68);
});
