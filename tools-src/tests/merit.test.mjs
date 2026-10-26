// UPU merit: the worked examples in UPU's 2026/2027 circulars (SPM STEM A, STEM C, KSI; STPM CGPA 3.50).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('../../assets/js/merit-core.js');

test('STEM A example: 38.89 + 28.33 + 9.44 → academic 86.24, merit 93.24', () => {
  const r = M.spm({ pkg: 'A', universal: ['A+', 'A', 'A+', 'A+'], package: ['A', 'A+', 'A', 'A-'], others: ['A+'], koko: 7 });
  assert.equal(r.universal, 38.89); assert.equal(r.pack, 28.33); assert.equal(r.best, 9.44); assert.equal(r.academic, 86.24); assert.equal(r.merit, 93.24);
});

test('STEM C example: one package subject ÷ 18 → 28.89 + 23.33 + 9.44 → 69.37, merit 78.87', () => {
  const r = M.spm({ pkg: 'C', universal: ['A', 'B', 'B+', 'A-'], package: ['A-'], others: ['A', 'A+'], koko: 9.5 });
  assert.equal(r.universal, 28.89); assert.equal(r.pack, 23.33); assert.equal(r.best, 9.44); assert.equal(r.academic, 69.37); assert.equal(r.merit, 78.87);
});

test('Arts and humanities (KSI) example: 32.22 + 26.67 + 5.56 → 72.51, merit 82.01', () => {
  const r = M.spm({ pkg: 'KSI', universal: ['A', 'B', 'A-', 'A+'], package: ['A-', 'A+'], others: ['B', 'B'], koko: 9.5 });
  assert.equal(r.universal, 32.22); assert.equal(r.pack, 26.67); assert.equal(r.best, 5.56); assert.equal(r.academic, 72.51); assert.equal(r.merit, 82.01);
});

test('Straight A+ gives 90 + 10 = 100; co-curriculum is capped at 10; missing subjects score 0', () => {
  assert.equal(M.spm({ pkg: 'A', universal: ['A+', 'A+', 'A+', 'A+'], package: ['A+', 'A+', 'A+', 'A+'], koko: 12 }).merit, 100);
  const s = M.spm({ pkg: 'B', universal: ['A', 'A', 'A', 'A'], package: ['A'] }); assert.equal(s.short, true); assert.equal(s.pack, 13.33);
});

test('STPM / matriculation: CGPA 3.50 → 78.75, with 9.00 co-curriculum 87.75; STAM Jayyid Jiddan = 3.00', () => {
  const c = M.cgpa(3.5, 9); assert.equal(c.academic, 78.75); assert.equal(c.merit, 87.75);
  assert.equal(M.stam('Jayyid Jiddan', 8).academic, 67.5); assert.equal(M.cgpa(4, 10).merit, 100);
});
