// Shoe size: last = foot + 2/3 in; UK = 3 × last(in) − 25; EU = 1.5 × last(cm); US men +1, women +2; kids scale.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../../assets/js/kasut-core.js');

test('Foot 26.2 cm = UK 8, EU 42, US men 9, US women 10, Mondopoint 262', () => {
  const r = S.fromFoot(26.2);
  assert.equal(r.uk, 8); assert.equal(r.eu, 42); assert.equal(r.usM, 9); assert.equal(r.usW, 10); assert.equal(r.mm, 262);
  assert.equal(S.fromFoot(24.5).uk, 6); assert.equal(S.fromFoot(22).uk, 3);
});

test('Children: 17.4 cm = UK 10 kids, EU 28; 20.5 cm moves to adult UK 1', () => {
  const k = S.fromFoot(17.4);
  assert.equal(k.kids, true); assert.equal(k.uk, 10); assert.equal(k.eu, 28);
  assert.equal(S.fromFoot(20.5).kids, false); assert.equal(S.fromFoot(20.5).uk, 1);
});

test('From a size back to the foot: EU 42 and US men 9 both give UK 8', () => {
  assert.equal(S.convert({ mode: 'size', system: 'eu', size: 42 }).uk, 8);
  assert.equal(S.convert({ mode: 'size', system: 'usM', size: 9 }).uk, 8);
  assert.equal(S.convert({ mode: 'size', system: 'mm', size: 262 }).eu, 42);
  assert.equal(S.convert({ mode: 'foot', foot: 0 }), null);
});
