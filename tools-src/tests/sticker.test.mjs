// WhatsApp Sticker Maker core: WhatsApp's published limits, plain-background removal, outline width, framing,
// emoji tags, pack checks and the contents.json of WhatsApp's sample app.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../../assets/js/sticker-core.js');

// A w x h image: white background with a red square from (a,a) to (b,b) inclusive.
function scene(w, h, a, b, bg = [255, 255, 255]) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, inside = x >= a && x <= b && y >= a && y <= b;
    d.set(inside ? [220, 30, 30, 255] : [...bg, 255], i);
  }
  return d;
}

test('Limits match WhatsApp\'s sticker README', () => {
  assert.deepEqual([T.SPEC.size, T.SPEC.maxBytes, T.SPEC.minPack, T.SPEC.maxPack, T.SPEC.tray, T.SPEC.trayMaxBytes, T.SPEC.maxEmoji], [512, 102400, 3, 30, 96, 51200, 3]);
});

test('Plain background is removed, the subject is kept', () => {
  const w = 20, h = 20, img = scene(w, h, 6, 13);
  const { mask, bg } = T.floodRemove(img, w, h, 10);
  assert.deepEqual(bg, [255, 255, 255]);
  assert.equal(mask[0], 0);
  assert.equal(mask[10 * w + 10], 255, 'centre of the subject');
  assert.equal(mask[6 * w + 6], 160, 'edge of the subject feathered');
  assert.equal(mask.filter(v => v > 0).length, 64, '8 x 8 subject left');
});

test('A slightly noisy background needs tolerance; a subject touching the edge survives', () => {
  const w = 12, h = 12, img = scene(w, h, 0, 5, [240, 240, 240]);
  for (let i = 0; i < img.length; i += 16) img[i] -= 12;
  assert.ok(T.floodRemove(img, w, h, 1).mask.filter(v => v === 0).length < 108, 'low tolerance leaves noise');
  const m = T.floodRemove(img, w, h, 15).mask;
  assert.equal(m.filter(v => v === 0).length, 144 - 36, 'background gone, corner subject kept');
});

test('Outline grows the shape by the requested width', () => {
  const w = 40, h = 40, a = new Uint8Array(w * h);
  for (let y = 15; y < 25; y++) for (let x = 15; x < 25; x++) a[y * w + x] = 255;
  const o = T.outline(a, w, h, 5);
  assert.equal(o[20 * w + 10], 255, '5 px left of the square edge');
  assert.equal(o[20 * w + 9], 0, '6 px away is outside');
  assert.equal(o[20 * w + 20], 255, 'inside the shape');
  assert.ok(o[11 * w + 11] < 255 && o[10 * w + 10] === 0, 'corner is rounded, not square');
  assert.equal(T.outline(a, w, h, 0).reduce((s, v) => s + v, 0), 0);
  const d = T.distance(a, w, h);
  assert.equal(d[20 * w + 13], 6, 'two pixels = 6 chamfer units');
});

test('Bounds and fit centre the subject in 512 px with padding', () => {
  const w = 100, h = 50, a = new Uint8Array(w * h);
  for (let y = 10; y < 30; y++) for (let x = 20; x < 80; x++) a[y * w + x] = 255;
  const b = T.bounds(a, w, h);
  assert.deepEqual(b, { x: 20, y: 10, w: 60, h: 20 });
  const f = T.fit(b, 512, 16);
  assert.equal(f.scale, 8);
  assert.equal(b.x * f.scale + f.x, 16);
  assert.equal(b.y * f.scale + f.y, 176);
  assert.equal(T.bounds(new Uint8Array(4), 2, 2), null);
});

test('Emoji tags: pictographs only, at most three', () => {
  assert.deepEqual(T.emojis('love 😍🔥 lol 👍🏽😂'), ['😍', '🔥', '👍🏽']);
  assert.deepEqual(T.emojis('abc'), []);
  assert.deepEqual(T.emojis('❤️'), ['❤️']);
});

test('Pack checks follow the WhatsApp limits', () => {
  const ok = { bytes: 20000, emojis: ['😀'], webp: true };
  assert.deepEqual(T.check({ name: 'Kucing', stickers: [ok, ok, ok], tray: { bytes: 4000 } }), []);
  const p = T.check({ name: '', stickers: [{ bytes: 120000, emojis: [], webp: false }], tray: { bytes: 60000 } });
  const t = p.map(x => x.text).join(' | ');
  assert.match(t, /at least 3 stickers; add 2 more/);
  assert.match(t, /118 KB; the limit is 100 KB/);
  assert.match(t, /cannot write WebP/);
  assert.match(t, /no emoji/);
  assert.match(t, /tray icon is over 50 KB/);
  assert.match(t, /name/);
  assert.match(T.check({ name: 'x', stickers: Array(31).fill(ok) }).map(x => x.text).join(), /remove 1/);
});

test('contents.json matches WhatsApp\'s sample app layout', () => {
  const c = T.contents({ name: 'Kucing Comel!', publisher: 'Aminah', stickers: [{ emojis: ['😺'], alt: 'cat waving' }, { emojis: [] }] });
  const p = c.sticker_packs[0];
  assert.equal(p.identifier, 'kucing_comel');
  assert.equal(p.tray_image_file, 'tray.png');
  assert.deepEqual(p.stickers, [{ image_file: '01.webp', emojis: ['😺'], accessibility_text: 'cat waving' }, { image_file: '02.webp', emojis: ['😀'], accessibility_text: '' }]);
  assert.equal(p.animated_sticker_pack, false);
  assert.ok('android_play_store_link' in c && 'ios_app_store_link' in c);
});
