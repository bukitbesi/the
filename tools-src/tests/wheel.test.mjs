// Spin the wheel / lucky draw: parsing weights, unbiased picks, landing angle and draws without repeats.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const W = require('../../assets/js/wheel-core.js');

test('parse reads one entry per line with x3, *3 or (3) weights; blanks and # comments ignored', () => {
  const e = W.parse('Ali x3\n\n# comment\nBaba*2\nChong (4)\n  Devi  \nEna x0');
  assert.deepEqual(e, [{ name: 'Ali', weight: 3 }, { name: 'Baba', weight: 2 }, { name: 'Chong', weight: 4 }, { name: 'Devi', weight: 1 }, { name: 'Ena', weight: 1 }]);
  assert.deepEqual(W.chances(W.parse('A x3\nB')), [0.75, 0.25]);
  assert.equal(W.serialize(e).split('\n')[0], 'Ali x3');
});

test('randInt rejects the biased tail; weighted picks follow the weights', () => {
  let calls = 0; const seq = [4294967295, 7];
  assert.equal(W.randInt(10, () => seq[calls++]), 7); assert.equal(calls, 2);
  const e = W.parse('A x3\nB'), counts = [0, 0];
  for (let r = 0; r < 4; r++) counts[W.pickIndex(e, () => r)]++;
  assert.deepEqual(counts, [3, 1]);
});

test('landing angle puts the chosen slice under the top pointer, after full turns', () => {
  const e = W.parse('A\nB\nC\nD');
  for (let i = 0; i < 4; i++) {
    const rot = W.landing(e, i, 123, 5, 0.3);
    assert.equal(W.at(e, rot), i); assert.ok(rot >= 123 + 1800);
  }
  const w = W.parse('Big x9\nSmall');
  assert.equal(W.at(w, W.landing(w, 1, 0, 3, 0.9)), 1);
});

test('draw returns distinct winners and never more than the entries; crypto source works', () => {
  const e = W.parse('A\nB\nC');
  const wins = W.draw(e, 5);
  assert.equal(wins.length, 3); assert.equal(new Set(wins).size, 3);
  assert.equal(W.shuffle(e).length, 3);
  assert.ok(W.pickIndex(e) >= 0);
});
