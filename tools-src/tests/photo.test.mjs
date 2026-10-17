// Photo Editor core: tone curve and colour maths on known pixels, blur conserving brightness, filters, and the
// layer document (hit testing with rotation, crop/rotate/flip/resize keeping layers together, history).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../../assets/js/photo-core.js');
const px = (...rgba) => ({ data: new Uint8ClampedArray(rgba), width: rgba.length / 4, height: 1 });
const adj = o => Object.assign({}, P.NONE, o);

test('Neutral settings leave pixels untouched', () => {
  const img = px(10, 128, 250, 255, 0, 0, 0, 0);
  P.apply(img, P.NONE);
  assert.deepEqual([...img.data], [10, 128, 250, 255, 0, 0, 0, 0]);
  assert.deepEqual([...P.toneLut(P.NONE)].slice(0, 5), [0, 1, 2, 3, 4]);
  assert.equal(P.toneLut(P.NONE)[255], 255);
});

test('Tone: exposure doubles at +50, brightness shifts, contrast pivots on mid grey', () => {
  assert.equal(P.toneLut(adj({ exposure: 50 }))[60], 120, '+1 stop');
  assert.equal(P.toneLut(adj({ exposure: -50 }))[200], 100, '-1 stop');
  assert.equal(P.toneLut(adj({ brightness: 50 }))[100], 164);
  const c = P.toneLut(adj({ contrast: 50 }));
  assert.equal(c[128], 128);
  assert.ok(c[200] > 200 && c[60] < 60);
  const lo = P.toneLut(adj({ contrast: -100 }));
  assert.equal(lo[0], 128, 'no contrast: everything mid grey');
  assert.ok(P.toneLut(adj({ shadows: 100 }))[30] > 30 && P.toneLut(adj({ shadows: 100 }))[230] === 230);
  assert.ok(P.toneLut(adj({ highlights: -100 }))[230] < 230 && P.toneLut(adj({ highlights: -100 }))[30] === 30);
});

test('Colour: saturation, grayscale, sepia, invert, warmth, hue', () => {
  const g = P.apply(px(200, 100, 50, 255), adj({ saturation: -100 })).data;
  assert.ok(g[0] === g[1] && g[1] === g[2], 'fully desaturated is grey');
  assert.deepEqual([...P.apply(px(255, 0, 0, 255), adj({ grayscale: 100 })).data], [54, 54, 54, 255], 'Rec. 709 luma of red');
  assert.deepEqual([...P.apply(px(10, 20, 30, 255), adj({ invert: 100 })).data], [245, 235, 225, 255]);
  assert.deepEqual([...P.apply(px(100, 100, 100, 255), adj({ sepia: 100 })).data], [135, 120, 94, 255]);
  const w = P.apply(px(100, 100, 100, 255), adj({ temperature: 100 })).data;
  assert.deepEqual([w[0], w[1], w[2]], [130, 100, 70]);
  const h = P.apply(px(200, 50, 50, 255), adj({ hue: 120 })).data;
  assert.ok(h[1] > h[0] && h[1] > h[2], 'red rotated 120° becomes green');
  assert.deepEqual([...P.apply(px(100, 100, 100, 255), adj({ hue: 90, saturation: 50 })).data], [100, 100, 100, 255], 'grey stays grey');
});

test('Blur keeps a flat image flat and spreads a single bright pixel', () => {
  const w = 9, h = 9, flat = new Uint8ClampedArray(w * h * 4).fill(120);
  P.boxBlur(flat, w, h, 2);
  assert.ok(flat.every(v => v === 120));
  const dot = new Uint8ClampedArray(w * h * 4);
  for (let i = 3; i < dot.length; i += 4) dot[i] = 255;
  dot[(4 * w + 4) * 4] = 255;
  P.boxBlur(dot, w, h, 1);
  assert.ok(dot[(4 * w + 4) * 4] < 255 && dot[(4 * w + 5) * 4] > 0);
  let sum = 0;
  for (let i = 0; i < dot.length; i += 4) sum += dot[i];
  assert.ok(Math.abs(sum - 255) < 25, 'energy roughly conserved (8-bit rounding): ' + sum);
});

test('Vignette darkens corners, not the centre; grain is deterministic', () => {
  const w = 21, h = 21, img = { data: new Uint8ClampedArray(w * h * 4).fill(200), width: w, height: h };
  P.apply(img, adj({ vignette: 100 }));
  assert.equal(img.data[(10 * w + 10) * 4], 200);
  assert.ok(img.data[0] < 50);
  const a = P.apply({ data: new Uint8ClampedArray(64).fill(128), width: 4, height: 4 }, adj({ grain: 50 })).data;
  const b = P.apply({ data: new Uint8ClampedArray(64).fill(128), width: 4, height: 4 }, adj({ grain: 50 })).data;
  assert.deepEqual([...a], [...b]);
});

test('Filters combine with sliders', () => {
  assert.equal(P.combine('vivid', { saturation: 10 }).saturation, 40);
  assert.equal(P.combine('mono', {}).grayscale, 100);
  assert.equal(P.combine('nope', {}).contrast, 0);
  assert.ok(P.isIdentity(P.combine('none', {})));
  assert.ok(Object.keys(P.FILTERS).length >= 12);
  for (const f of Object.values(P.FILTERS)) for (const k of Object.keys(f)) assert.ok(k === 'label' || k in P.NONE, k);
});

test('Hit testing honours rotation and stacking order', () => {
  const doc = P.newDoc(400, 400);
  const a = P.add(doc, P.layer('shape', { x: 100, y: 180, w: 200, h: 40 }));
  assert.equal(P.hitTest(doc, 120, 200), a.id);
  a.rotation = 90;
  assert.equal(P.hitTest(doc, 120, 200), null, 'rotated bar no longer covers the left end');
  assert.equal(P.hitTest(doc, 200, 110), a.id);
  const b = P.add(doc, P.layer('text', { x: 150, y: 150, w: 100, h: 100 }));
  assert.equal(P.hitTest(doc, 200, 200), b.id, 'top layer wins');
  P.move(doc, b.id, -1);
  assert.equal(P.hitTest(doc, 200, 200), a.id);
  P.remove(doc, a.id);
  assert.equal(doc.selected, b.id);
});

test('Crop, rotate, flip and resize keep layers in place relative to the picture', () => {
  const doc = P.newDoc(400, 300);
  const l = P.add(doc, P.layer('shape', { x: 50, y: 40, w: 100, h: 60 }));
  const d = P.add(doc, P.layer('draw', { paths: [{ points: [[60, 50], [70, 55]], size: 10, color: '#000' }] }));
  P.crop(doc, { x: 40, y: 30, w: 200, h: 150 });
  assert.deepEqual([doc.w, doc.h, l.x, l.y], [200, 150, 10, 10]);
  assert.deepEqual(d.paths[0].points[0], [20, 20]);
  P.rotate90(doc, true);
  assert.deepEqual([doc.w, doc.h], [150, 200]);
  assert.deepEqual([l.x + l.w / 2, l.y + l.h / 2, l.rotation], [110, 60, 90], 'centre (60,40) -> (150-40, 60)');
  assert.deepEqual(d.paths[0].points[0], [130, 20]);
  P.flip(doc, 'x');
  assert.equal(l.x + l.w / 2, 40);
  assert.equal(l.flipX, true);
  assert.deepEqual(d.paths[0].points[0], [20, 20]);
  P.resize(doc, 75, 100);
  assert.deepEqual([doc.w, doc.h, l.w, l.h], [75, 100, 50, 30]);
  assert.equal(d.paths[0].size, 5);
});

test('Fit, aspect crops and clamping', () => {
  const doc = P.newDoc(1080, 1080);
  assert.deepEqual(P.fitInto(doc, 4000, 3000), { x: 0, y: 135, w: 1080, h: 810 });
  assert.deepEqual(P.fitInto(doc, 400, 300), { x: 340, y: 390, w: 400, h: 300 }, 'small images are not enlarged');
  assert.deepEqual(P.fitInto(doc, 4000, 3000, true), { x: -180, y: 0, w: 1440, h: 1080 });
  assert.deepEqual(P.aspectRect(800, 600, 1), { x: 100, y: 0, w: 600, h: 600 });
  assert.deepEqual(P.aspectRect(800, 600, 16 / 9), { x: 0, y: 75, w: 800, h: 450 });
  assert.deepEqual(P.clampRect({ x: 700, y: -5, w: 300, h: 100 }, 800, 600, 0), { x: 500, y: 0, w: 300, h: 100 });
  assert.deepEqual(P.clampRect({ x: 0, y: 0, w: 900, h: 10 }, 800, 600, 1), { x: 0, y: 0, w: 600, h: 600 });
});

test('History undoes and redoes snapshots, skipping duplicates', () => {
  const h = new P.History(3);
  let s = { v: 1 };
  h.push(s); s = { v: 2 };
  assert.equal(h.push({ v: 1 }), false, 'duplicate');
  h.push(s); s = { v: 3 };
  s = h.undo(s); assert.deepEqual(s, { v: 2 });
  s = h.undo(s); assert.deepEqual(s, { v: 1 });
  assert.equal(h.undo(s), null);
  s = h.redo(s); assert.deepEqual(s, { v: 2 });
  for (let i = 0; i < 10; i++) h.push({ i });
  assert.equal(h.past.length, 3);
  assert.equal(h.future.length, 0);
  assert.equal(P.fontCss({ italic: true, weight: 700, size: 40.4, font: 'serif' }), 'italic 700 40px Georgia,"Times New Roman",serif');
});
