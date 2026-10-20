// Background remover and passport photo maths: plain-background cut, matte refinement, brush, composite, print sheet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const B = require('../../assets/js/bgremove-core.js');

// 20×20 white picture with a red 8×8 square in the middle.
function square() {
  const w = 20, h = 20, px = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = 6; y < 14; y++) for (let x = 6; x < 14; x++) { const i = (y * w + x) * 4; px[i] = 200; px[i + 1] = 20; px[i + 2] = 20; }
  return { px, w, h };
}

test('flood fill clears the plain background and keeps the subject; bounds find it', () => {
  const { px, w, h } = square(), m = B.floodMask(px, w, h, 12);
  assert.equal(m[0], 0); assert.equal(m[10 * w + 10], 255);
  assert.deepEqual(B.bounds(m, w, h), { x: 6, y: 6, w: 8, h: 8 });
  assert.deepEqual(B.bounds(m, w, h, 2), { x: 4, y: 4, w: 12, h: 12 });
  assert.equal(B.bounds(new Uint8ClampedArray(4), 2, 2), null);
});

test('refine: cut thresholds, shift grows or shrinks, feather softens', () => {
  const { px, w, h } = square(), m = B.floodMask(px, w, h, 12);
  const grown = B.refine(m, w, h, { shift: 2 }), shrunk = B.refine(m, w, h, { shift: -2 });
  const area = a => a.reduce((s, v) => s + (v > 128 ? 1 : 0), 0);
  assert.ok(area(grown) > 64); assert.ok(area(shrunk) < 64);
  const soft = B.refine(m, w, h, { feather: 2 });
  assert.ok(soft[10 * w + 5] > 0 && soft[10 * w + 5] < 255);
  const ramp = B.refine(Uint8ClampedArray.from([50, 100, 130, 200]), 4, 1, { cut: 50 });
  assert.deepEqual(Array.from(ramp), [0, 0, 128, 255]);
});

test('brush erases and restores a soft circle', () => {
  const m = new Uint8ClampedArray(100).fill(255);
  B.brush(m, 10, 10, 5, 5, 2, 'erase');
  assert.equal(m[55], 0); assert.equal(m[0], 255);
  B.brush(m, 10, 10, 5, 5, 2, 'restore');
  assert.equal(m[55], 255);
});

test('composite: transparent keeps alpha, colour fills, blur keeps subject pixels', () => {
  const { px, w, h } = square(), m = B.floodMask(px, w, h, 12);
  const t = B.composite(px, m, w, h, { type: 'transparent' });
  assert.equal(t[3], 0); assert.equal(t[(10 * w + 10) * 4 + 3], 255);
  const c = B.composite(px, m, w, h, { type: 'color', color: '#0055aa' });
  assert.deepEqual(Array.from(c.slice(0, 4)), [0, 85, 170, 255]);
  assert.deepEqual(Array.from(c.slice((10 * w + 10) * 4, (10 * w + 10) * 4 + 3)), [200, 20, 20]);
  assert.equal(B.composite(px, m, w, h, { type: 'blur', blur: 2 })[(10 * w + 10) * 4], 200);
});

test('passport: 35 × 50 mm is 413 × 591 px at 300 dpi; 8 fit on 4R edge to edge, 32 on A4 with a 5 mm margin', () => {
  assert.deepEqual(B.printPixels(35, 50), { w: 413, h: 591 });
  const r4 = B.sheet(35, 50, 101.6, 152.4);
  assert.equal(r4.count, 8); assert.equal(r4.paperW, 152.4);
  assert.equal(B.sheet(35, 50, 101.6, 152.4, 2, 3).count, 4);
  assert.equal(B.sheet(35, 50, 210, 297, 0, 5).count, 32);
  assert.equal(B.sheet(51, 51, 101.6, 152.4).count, 2);
});

test('passport presets: print sizes match 300 dpi pixels; JPEG quality search lands inside the KB window', () => {
  for (const [k, p] of Object.entries(B.PASSPORT)) {
    if (!p.mm || k === 'myonline') continue;
    const px = B.printPixels(p.mm[0], p.mm[1], 300);
    assert.deepEqual([px.w, px.h], p.px, k);
  }
  assert.deepEqual(B.printPixels(35, 50, 600), { w: 827, h: 1181 });
  // A fake encoder whose size grows with quality: 50 KB at q 0.3 up to 400 KB at q 0.98.
  const enc = q => (50 + (q - 0.3) / 0.68 * 350) * 1024;
  const r = B.targetQuality(enc, 100, 300);
  assert.ok(r.ok && r.kb >= 100 && r.kb <= 300, JSON.stringify(r));
  const tiny = B.targetQuality(q => 20 * 1024, 100, 300);
  assert.equal(tiny.ok, false);
});

test('headBox finds crown, chin and centre on a head-and-shoulders matte; placeHead fits it to the frame', () => {
  // 100×120 matte: head circle r 20 at (50, 30), neck 14 wide from y 50 to 62, shoulders 90 wide from y 62 down.
  const w = 100, h = 120, m = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const head = (x - 50) ** 2 + (y - 30) ** 2 <= 400, neck = y >= 48 && y < 62 && Math.abs(x - 50) <= 7, body = y >= 62 && Math.abs(x - 50) <= 45;
    if (head || neck || body) m[y * w + x] = 255;
  }
  const hb = B.headBox(m, w, h);
  assert.equal(hb.top, 10); assert.equal(hb.cx, 50);
  assert.ok(hb.chin >= 44 && hb.chin <= 52, 'chin ' + hb.chin);
  const p = B.placeHead(hb, 413, 591, 0.15, 0.55);
  assert.ok(Math.abs(hb.top * p.scale + p.y - 591 * 0.15) < 1e-6);
  assert.ok(Math.abs((hb.chin - hb.top) * p.scale - 591 * 0.55) < 1e-6);
  assert.ok(Math.abs(hb.cx * p.scale + p.x - 413 / 2) < 1e-6);
});
