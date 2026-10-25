// Image to text helpers: scaling, Otsu threshold, enhance, text clean-up and download sizes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const O = require('../../assets/js/ocr-core.js');

test('scaleFor enlarges small pictures and shrinks huge ones', () => {
  assert.equal(O.scaleFor(800, 400), 2); assert.equal(O.scaleFor(300, 200), 3);
  assert.equal(O.scaleFor(1200, 900), 1); assert.equal(O.scaleFor(5000, 3000), 0.5);
});

test('Otsu threshold splits dark text from a light page; enhance flips light-on-dark', () => {
  const px = n => { const a = new Uint8ClampedArray(n * 4); return a; };
  const page = px(100); for (let i = 0; i < 100; i++) { const v = i < 20 ? 30 : 220; page.set([v, v, v, 255], i * 4); }
  const t = O.otsu(O.gray(page)); assert.ok(t >= 30 && t < 220, String(t));
  const e = O.enhance(page); assert.equal(e.inverted, false); assert.equal(e.data[0], 0); assert.equal(e.data[99 * 4], 255);
  const neg = px(100); for (let i = 0; i < 100; i++) { const v = i < 20 ? 230 : 20; neg.set([v, v, v, 255], i * 4); }
  const n = O.enhance(neg); assert.equal(n.inverted, true); assert.equal(n.data[0], 0); assert.equal(n.data[99 * 4], 255);
});

test('clean joins hyphenated words and paragraph lines; stats count words', () => {
  assert.equal(O.clean('Menaip ter-\nbaik  hari ini.\n\n\n\nBaris baru'), 'Menaip terbaik hari ini.\n\nBaris baru');
  assert.equal(O.clean('one\ntwo\n\nthree', { join: true }), 'one two\n\nthree');
  assert.equal(O.clean('KL-\nSentral'), 'KL-\nSentral');
  assert.deepEqual(O.stats('Satu dua tiga\nempat'), { chars: 19, words: 4, lines: 2 });
});

test('languages and download size: English + Malay is about 8 MB the first time', () => {
  assert.deepEqual(O.langs(['msa', 'eng']), ['eng', 'msa']); assert.deepEqual(O.langs([]), ['eng']); assert.deepEqual(O.langs(['xx']), ['eng']);
  assert.equal(O.downloadMb(['eng', 'msa']), 8);
});
