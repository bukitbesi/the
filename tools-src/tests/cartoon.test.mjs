// Photo to cartoon: smoothing keeps edges, k-means finds the colours, outlines land on the boundary, sketch is grey.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../../assets/js/cartoon-core.js');

// 40×20 picture: left half red, right half blue, with light noise.
function split(w = 40, h = 20) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, n = ((x * 7 + y * 13) % 9) - 4;
    if (x < w / 2) { px[i] = 220 + n; px[i + 1] = 40 + n; px[i + 2] = 40; } else { px[i] = 30; px[i + 1] = 60 + n; px[i + 2] = 210 + n; }
    px[i + 3] = 255;
  }
  return { px, w, h };
}

test('fit keeps the aspect ratio under 1,200 px; settings clamp and fall back to the style preset', () => {
  assert.deepEqual(C.fit(4000, 3000), { w: 1200, h: 900, scale: 0.3 });
  assert.equal(C.fit(800, 600).scale, 1);
  const s = C.settings({ style: 'nope', colors: 99, thick: 9 });
  assert.equal(s.style, 'classic'); assert.equal(s.colors, 32); assert.equal(s.thick, 4);
});

test('k-means on the split picture finds a red and a blue colour; quantize maps every pixel to them', () => {
  const { px } = split();
  const pal = C.palette(px, 2);
  const red = pal.find(c => c[0] > 150), blue = pal.find(c => c[2] > 150);
  assert.ok(red && blue);
  const q = C.quantize(new Uint8ClampedArray(px), pal), seen = new Set();
  for (let i = 0; i < q.length; i += 4) seen.add(q.slice(i, i + 3).join());
  assert.equal(seen.size, 2);
});

test('Kuwahara smoothing removes the noise but keeps the edge; outlines sit on the middle columns only', () => {
  const { px, w, h } = split(), sm = C.kuwahara(px, w, h, 3);
  const at = (x, y) => (y * w + x) * 4;
  assert.ok(sm[at(5, 10)] > 200 && sm[at(5, 10) + 2] < 80);
  assert.ok(sm[at(34, 10) + 2] > 190 && sm[at(34, 10)] < 60);
  const mask = C.edges(sm, w, h, 0.5, 1);
  for (let y = 2; y < h - 2; y++) for (let x = 1; x < w - 1; x++) if (mask[y * w + x]) assert.ok(x >= w / 2 - 2 && x <= w / 2 + 1, `edge at ${x},${y}`);
  assert.ok(mask[10 * w + w / 2] || mask[10 * w + w / 2 - 1]);
});

test('every style returns a full-size picture; sketch is grey; posterize uses few levels', () => {
  const { px, w, h } = split();
  for (const style of Object.keys(C.STYLES)) assert.equal(C.cartoon(px, w, h, { style }).data.length, px.length);
  const sk = C.cartoon(px, w, h, { style: 'sketch' }).data;
  for (let i = 0; i < sk.length; i += 4) assert.ok(sk[i] === sk[i + 1] && sk[i + 1] === sk[i + 2]);
  const po = C.posterize(new Uint8ClampedArray(px), 4), lv = new Set();
  for (let i = 0; i < po.length; i += 4) lv.add(po[i]);
  assert.ok(lv.size <= 3);
});
