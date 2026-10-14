// Water bill: block tariff by state, minimum charge, PBAPP's official 35 m3 example.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const W = require('../../assets/js/water-core.js');

test('Penang 35 m3 from 1 July 2026 costs RM32.50 (PBAPP example)', () => {
  assert.equal(W.calculate({ state: 'penang', m3: 35 }).total, 32.5);
});

test('Selangor 30 m3: 20 x RM0.65 + 10 x RM1.62 = RM29.20; 50 m3 RM89.95', () => {
  const r = W.calculate({ state: 'selangor', m3: 30 });
  assert.deepEqual(r.lines.map(l => l.amount), [13, 16.2, 0]);
  assert.equal(r.total, 29.2);
  assert.equal(W.calculate({ state: 'kl', m3: 50 }).total, 89.95);
});

test('Minimum charge applies below 10 m3; Johor 30 m3 RM44.50', () => {
  const r = W.calculate({ state: 'johor', m3: 5 });
  assert.equal(r.total, 10.5);
  assert.equal(r.minApplied, true);
  assert.equal(W.calculate({ state: 'johor', m3: 30 }).total, 44.5);
  assert.equal(W.calculate({ state: 'kedah', m3: 0 }).total, 8.1);
});
