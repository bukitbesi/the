// Image Converter core: format sniffing, resize maths, BMP/ICO writers (checked byte by byte and with Pillow when
// the tests were written) and the target-file-size quality search.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const I = require('../../assets/js/imgconv-core.js');
const fix = n => new Uint8Array(fs.readFileSync(new URL('./fixtures/' + n, import.meta.url)));

test('Sniffs input formats from their first bytes', () => {
  assert.equal(I.sniff(fix('exif-iphone.jpg')), 'jpeg');
  assert.equal(I.sniff(fix('exif-ai.png')), 'png');
  assert.equal(I.sniff(fix('exif-iphone.webp')), 'webp');
  const t = s => new TextEncoder().encode(s.padEnd(16, ' '));
  assert.equal(I.sniff(t('GIF89a')), 'gif');
  assert.equal(I.sniff(t('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg">')), 'svg');
  assert.equal(I.sniff(new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63])), 'heic');
  assert.equal(I.sniff(new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66])), 'avif');
  assert.equal(I.sniff(new Uint8Array([0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 0, 0, 0, 0])), 'tiff');
  assert.equal(I.sniff(new Uint8Array(20)), '');
});

test('Resize keeps the aspect ratio and never enlarges unless asked', () => {
  assert.deepEqual(I.fit(4000, 3000, { mode: 'fit', w: 1920, h: 1080 }), { w: 1440, h: 1080 });
  assert.deepEqual(I.fit(4000, 3000, { mode: 'fit', w: 1200 }), { w: 1200, h: 900 });
  assert.deepEqual(I.fit(800, 533, { mode: 'fit', w: 1920, h: 1080 }), { w: 800, h: 533 });
  assert.deepEqual(I.fit(800, 533, { mode: 'fit', w: 1600, enlarge: true }), { w: 1600, h: 1066 });
  assert.deepEqual(I.fit(1000, 500, { mode: 'percent', percent: 50 }), { w: 500, h: 250 });
  assert.deepEqual(I.fit(1000, 500, { mode: 'width', w: 333 }), { w: 333, h: 167 });
  assert.deepEqual(I.fit(10, 10, { mode: 'percent', percent: 1 }), { w: 1, h: 1 });
  assert.deepEqual(I.fit(10, 20), { w: 10, h: 20 });
  const c = I.capPixels({ w: 12000, h: 9000 });
  assert.ok(c.w * c.h <= 60e6 && Math.abs(c.w / c.h - 4 / 3) < 0.001);
});

test('BMP writer: header, bottom-up rows and 4-byte padding', () => {
  // 3 x 2 image: red, green, blue / white, black, grey.
  const px = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255, 128, 128, 128, 255]);
  const b = I.encodeBmp(px, 3, 2), dv = new DataView(b.buffer);
  assert.equal(b.length, 54 + 12 * 2);
  assert.equal(dv.getUint32(2, true), b.length);
  assert.equal(dv.getInt32(18, true), 3);
  assert.equal(dv.getUint16(28, true), 24);
  assert.deepEqual([...b.subarray(54, 66)], [255, 255, 255, 0, 0, 0, 128, 128, 128, 0, 0, 0], 'bottom row first, BGR, padded');
  assert.deepEqual([...b.subarray(66, 75)], [0, 0, 255, 0, 255, 0, 255, 0, 0]);
});

test('ICO writer stores PNG entries with 256 written as 0', () => {
  const png = fix('exif-ai.png');
  const ico = I.encodeIco([{ size: 256, bytes: png }, { size: 16, bytes: png.subarray(0, 100) }]);
  assert.deepEqual([...ico.subarray(0, 6)], [0, 0, 1, 0, 2, 0]);
  const e = I.readIco(ico);
  assert.deepEqual(e.map(x => x.size), [16, 256], 'sorted small to large');
  assert.equal(ico[6 + 16], 0, '256 px stored as 0');
  assert.equal(e[1].offset, 6 + 32 + 100);
  assert.deepEqual([...ico.subarray(e[1].offset, e[1].offset + 8)], [...png.subarray(0, 8)]);
  assert.deepEqual(I.icoSizes(48, 48), [16, 32, 48]);
  assert.deepEqual(I.icoSizes(10, 10), [16]);
  assert.deepEqual(I.icoSizes(1000, 500, [32, 512]), [32]);
});

test('Target size search finds the highest quality that fits', async () => {
  // A fake encoder whose size grows with quality: 100 KB at q=1, 10 KB at q=0.05.
  const enc = q => Math.round(10000 + (q - 0.05) / 0.95 * 90000);
  const r = await I.searchQuality(enc, 50000);
  assert.equal(r.fits, true);
  assert.ok(r.size <= 50000 && r.size > 48000, String(r.size));
  assert.ok(r.steps <= 9);
  assert.deepEqual(await I.searchQuality(enc, 200000), { q: 1, size: 100000, fits: true, steps: 1 });
  const low = await I.searchQuality(enc, 5000);
  assert.equal(low.fits, false);
  assert.equal(low.q, 0.05);
});

test('Names, sizes and changes', () => {
  assert.equal(I.outName('Holiday Photo.HEIC', 'jpeg'), 'Holiday Photo.jpg');
  assert.equal(I.outName('a.png', 'webp', { w: 800, h: 600 }, { suffix: true }), 'a-800x600.webp');
  assert.equal(I.outName('x/y:z.png', 'ico'), 'x-y-z.ico');
  assert.equal(I.size(16692), '16.3 KB');
  assert.equal(I.change(1000, 660), '34% smaller');
  assert.equal(I.change(1000, 1200), '20% larger');
  assert.equal(Object.keys(I.FORMATS).length, 6);
  assert.match(I.FACTS.verified, /^\d{4}-\d{2}-\d{2}$/);
});
