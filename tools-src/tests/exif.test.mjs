// EXIF reader, remover and writer. Fixtures were written by ExifTool 13.59 (an independent implementation):
// exif-iphone.jpg is a progressive, little-endian JPEG with GPS, a thumbnail, IPTC IIM, XMP, ICC and a comment;
// exif-ai.png carries eXIf, XMP, iCCP and a Stable Diffusion "parameters" text chunk; exif-iphone.webp has
// EXIF, XMP and ICCP chunks. Every output was also checked with `exiftool -validate` and decoded with Pillow
// to identical pixels while the tests were written.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const X = require('../../assets/js/exif-core.js');
const fix = name => new Uint8Array(fs.readFileSync(new URL('./fixtures/' + name, import.meta.url)));
const jpg = fix('exif-iphone.jpg'), png = fix('exif-ai.png'), webp = fix('exif-iphone.webp');
const sample = new Uint8Array(fs.readFileSync(new URL('../../assets/img/exif-sample-bukit-besi.jpg', import.meta.url)));
const field = (r, name) => (r.exif.fields.find(f => f.name === name) || {}).value;
test('Detects formats and refuses HEIC and unknown files', () => {
  assert.equal(X.detect(jpg), 'jpeg');
  assert.equal(X.detect(png), 'png');
  assert.equal(X.detect(webp), 'webp');
  const heic = new Uint8Array(16);
  heic.set([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]);
  assert.equal(X.read(heic).error, 'heif');
  assert.equal(X.read(new Uint8Array(20)).error, 'unsupported');
  assert.throws(() => X.strip(heic), /heif/);
});

test('Reads camera, date and GPS from a little-endian iPhone JPEG', () => {
  const r = X.read(jpg);
  assert.equal(r.width, 240);
  assert.equal(r.height, 160);
  assert.equal(r.tiff.le, true);
  assert.equal(field(r, 'Make'), 'Apple');
  assert.equal(field(r, 'Model'), 'iPhone 15 Pro');
  assert.equal(field(r, 'Orientation'), 'Rotated 90° CW');
  assert.equal(field(r, 'ExposureTime'), '1/125 s');
  assert.equal(field(r, 'FNumber'), 'f/1.78');
  assert.equal(field(r, 'FocalLength'), '6.86 mm');
  assert.equal(field(r, 'DateTimeOriginal'), '2026:07:04 18:20:01');
  assert.equal(field(r, 'ComponentsConfiguration'), 'Y, Cb, Cr, -');
  assert.deepEqual(r.exif.gps, { lat: 3.139, lon: 101.6869, alt: 56 });
  assert.equal(r.tiff.thumbnail.length, 683);
  assert.deepEqual(r.privacy.map(p => p.key), ['gps', 'date', 'camera', 'serial', 'software', 'thumb', 'xmp', 'iptc', 'comment']);
  assert.deepEqual(r.blocks.map(b => b.kind), ['exif', 'iptc', 'xmp', 'icc', 'comment']);
});

test('Reads rights from XMP first, then IPTC IIM', () => {
  const r = X.read(jpg);
  assert.equal(r.rights.creator, 'Old Name');
  assert.equal(r.rights.credit, 'Old credit');
  assert.equal(r.rights.copyright, '(c) old');
  assert.deepEqual(r.iptc.creator, ['Old IIM']);
  assert.equal(r.xmpProps['xmpMM:DocumentID'][0], 'xmp.did:123');
});

test('Finds AI generator settings in PNG text chunks', () => {
  const r = X.read(png);
  assert.deepEqual(r.texts.find(t => t.key === 'parameters'), { key: 'parameters', value: 'a cat, masterpiece, Steps: 20' });
  assert.ok(r.privacy.some(p => p.key === 'ai' && p.value === 'parameters'));
});

test('Removing EXIF from the sample JPEG returns the original image bytes', () => {
  // The sample is a plain JPEG to which ExifTool added an APP1 EXIF and an APP1 XMP block.
  const s = X.strip(sample);
  assert.equal(s.before, 16692);
  assert.equal(s.after, 10897);
  assert.equal(s.orientation, 0);
  assert.deepEqual(s.removed.map(b => b.kind), ['exif', 'xmp']);
  const again = X.read(s.bytes);
  assert.equal(again.exif, null);
  assert.equal(again.privacy.length, 0);
  assert.equal(again.width, 800);
});

test('Strip keeps orientation and the colour profile by default, lossless', () => {
  for (const b of [jpg, png, webp]) {
    const s = X.strip(b), r = X.read(s.bytes);
    assert.equal(r.exif.orientation, 6, 'orientation kept');
    assert.equal(r.exif.gps, null, 'GPS removed');
    assert.equal(r.exif.fields.filter(f => f.group !== 'ifd0').length, 0);
    assert.ok(r.icc > 0, 'ICC kept');
    assert.equal(r.xmp, '');
    assert.equal(r.iptc, null);
    assert.equal(r.texts.length, 0);
    assert.equal(r.comments.length, 0);
    assert.equal(r.width, 240);
  }
  assert.deepEqual(X.read(X.strip(jpg).bytes).exif.fields.map(f => f.name), ['Orientation', 'YCbCrPositioning']);
});

test('Strip everything: no orientation, no ICC', () => {
  for (const b of [jpg, png, webp]) {
    const s = X.strip(b, { keepOrientation: false, keepIcc: false }), r = X.read(s.bytes);
    assert.equal(r.exif, null);
    assert.equal(r.icc, 0);
    assert.equal(r.blocks.length, 0);
  }
  // WebP with nothing left drops the VP8X header and becomes a simple lossy file.
  const w = X.strip(webp, { keepOrientation: false, keepIcc: false }).bytes;
  assert.equal(String.fromCharCode(...w.subarray(12, 16)), 'VP8 ');
  assert.equal(w.length, new DataView(w.buffer, w.byteOffset).getUint32(4, true) + 8);
});

test('Strip copies compressed image data byte for byte', () => {
  const scans = b => {
    // Everything from the first SOS (FFDA) to the end is entropy-coded data plus tables.
    for (let i = 2; i < b.length;) {
      if (b[i + 1] === 0xda) return Buffer.from(b.subarray(i)).toString('hex');
      i += 2 + ((b[i + 2] << 8) | b[i + 3]);
    }
  };
  assert.equal(scans(X.strip(jpg).bytes), scans(jpg));
  const idat = b => { const s = Buffer.from(b).toString('latin1'); return s.slice(s.indexOf('IDAT') - 4); };
  assert.equal(idat(X.strip(png).bytes), idat(png));
  const vp8 = b => { const s = Buffer.from(b).toString('latin1'); const i = s.indexOf('VP8 '); return s.slice(i, i + 8 + new DataView(b.buffer, b.byteOffset + i + 4).getUint32(0, true)); };
  assert.equal(vp8(X.strip(webp).bytes), vp8(webp));
});

test('Trailing data after the image end is removed unless asked to keep it', () => {
  const extra = new Uint8Array([...jpg, 1, 2, 3, 4]);
  assert.ok(X.read(extra).privacy.some(p => p.key === 'trailer'));
  assert.equal(X.strip(extra).bytes.length, X.strip(jpg).bytes.length);
  assert.equal(X.strip(extra, { keepTrailer: true }).bytes.length, X.strip(jpg).bytes.length + 4);
});

test('Editor writes Google Images rights fields to XMP in all three formats', () => {
  const rights = { creator: 'Aminah', credit: 'Aminah / The Bukit Besi', copyright: '© 2026 Aminah', webStatement: 'https://example.com/licence',
    licensorUrl: 'https://example.com/buy', title: 'Hills', description: 'Hills at dawn', keywords: 'hills, dawn, hills' };
  for (const b of [jpg, png, webp]) {
    const r = X.read(X.write(b, { rights }));
    assert.deepEqual(r.rights, { ...rights, keywords: 'hills, dawn' });
    assert.equal(r.iptc, null, 'old IPTC IIM removed so it cannot contradict the XMP');
    assert.equal(r.xmpProps['xmpRights:Marked'][0], 'True');
    assert.equal(field(r, 'Model'), 'iPhone 15 Pro', 'EXIF untouched');
  }
});

test('XMP escapes markup and reads back attribute and element forms', () => {
  const xml = X.buildXmp({ creator: 'A & B <x>', copyright: '"Q"' });
  assert.ok(xml.includes('A &amp; B &lt;x&gt;'));
  assert.deepEqual(X.xmpProps(xml)['dc:creator'], ['A & B <x>']);
  assert.deepEqual(X.xmpProps('<rdf:Description photoshop:Credit="C &amp; D" xmpRights:WebStatement="https://a.b/"/>'),
    { 'photoshop:Credit': ['C & D'], 'xmpRights:WebStatement': ['https://a.b/'] });
  assert.equal(X.buildXmp({}), '');
});

test('Editor changes, adds and removes EXIF fields', () => {
  const out = X.write(jpg, { exif: { Model: 'iPhone 15 Pro Max', SerialNumber: '', Artist: 'Aminah', DateTimeOriginal: '2026-10-17T09:30', UserComment: 'Hai ✓' }, orientation: 1 });
  const r = X.read(out);
  assert.equal(field(r, 'Model'), 'iPhone 15 Pro Max');
  assert.equal(field(r, 'SerialNumber'), undefined);
  assert.equal(field(r, 'Artist'), 'Aminah');
  assert.equal(field(r, 'DateTimeOriginal'), '2026:10:17 09:30:00');
  assert.equal(field(r, 'UserComment'), 'Hai ✓');
  assert.equal(r.exif.orientation, 1);
  assert.equal(r.tiff.thumbnail.length, 683, 'thumbnail kept');
  assert.equal(r.tiff.le, true, 'byte order kept');
  assert.equal(r.rights.creator, 'Old Name', 'XMP untouched without rights edits');
  assert.equal(X.read(X.write(jpg, { exif: { UserComment: 'plain' } })).tiff.exif.find(e => e.tag === 0x9286).raw.subarray(0, 8).toString(), '65,83,67,73,73,0,0,0');
});

test('Editor sets, rounds and removes GPS', () => {
  const r = X.read(X.write(jpg, { gps: { lat: -33.856784, lon: 151.215297, alt: -12.5 } }));
  assert.deepEqual(r.exif.gps, { lat: -33.856784, lon: 151.215297, alt: -12.5 });
  assert.equal(field(r, 'GPSLatitudeRef'), 'S');
  assert.equal(field(r, 'GPSMapDatum'), 'WGS-84');
  const gone = X.read(X.write(jpg, { gps: null }));
  assert.equal(gone.exif.gps, null);
  assert.equal(gone.exif.fields.filter(f => f.group === 'gps').length, 0);
});

test('Editor adds EXIF to a file that had none, with a valid Exif version', () => {
  const plain = X.strip(sample).bytes;
  const r = X.read(X.write(plain, { exif: { Artist: 'The Bukit Besi', DateTimeOriginal: '2026:10:17 08:00:00' } }));
  assert.equal(field(r, 'Artist'), 'The Bukit Besi');
  assert.equal(field(r, 'ExifVersion'), '0232');
  assert.equal(r.tiff.le, false);
});

test('Editor removes the embedded thumbnail', () => {
  const r = X.read(X.write(jpg, { removeThumbnail: true }));
  assert.equal(r.tiff.thumbnail, null);
  assert.equal(r.tiff.ifd1.length, 0);
});

test('Validation rejects bad dates and coordinates', () => {
  assert.deepEqual(X.validate({ exif: { DateTimeOriginal: '17/10/2026' }, gps: { lat: 91, lon: 0 } }), ['DateTimeOriginal', 'lat']);
  assert.throws(() => X.write(jpg, { gps: { lat: 0, lon: 200 } }), /invalid:lon/);
  assert.equal(X.exifDate('2026-10-17 09:30:15'), '2026:10:17 09:30:15');
  assert.equal(X.exifDate('yesterday'), null);
});

test('GPS conversion matches the worked example (Bukit Besi, Terengganu)', () => {
  const r = X.read(sample);
  assert.deepEqual(r.exif.gps, { lat: 4.75833, lon: 103.195, alt: 42 });
  assert.equal(X.gpsDecimal([4, 45, 29.988], 'N'), 4.75833);
  assert.equal(Math.round(X.gpsDecimal([101, 41, 12.84], 'W') * 1e4) / 1e4, -101.6869);
});

test('ZIP archive of stored files has valid CRCs and unique names', () => {
  const files = [{ name: 'a.jpg', bytes: new Uint8Array([1, 2, 3]) }, { name: 'a.jpg', bytes: new Uint8Array([4]) }];
  const z = Buffer.from(X.zip(files));
  assert.equal(z.readUInt32LE(0), 0x04034b50);
  assert.equal(z.readUInt32LE(14), X.crc32(new Uint8Array([1, 2, 3])));
  assert.equal(X.crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const end = z.length - 22;
  assert.equal(z.readUInt32LE(end), 0x06054b50);
  assert.equal(z.readUInt16LE(end + 10), 2);
  assert.ok(z.includes('a-2.jpg'));
});

test('Every field in the Google Images rights table has an XMP property', () => {
  assert.equal(X.RIGHTS.length, 8);
  for (const r of X.RIGHTS) assert.ok(r.xmp && r.label && r.google);
  assert.match(X.FACTS.verified, /^\d{4}-\d{2}-\d{2}$/);
});

test('Transplant copies EXIF and rights into a converted copy, upright and without the thumbnail', () => {
  const plain = X.strip(sample, { keepOrientation: false, keepIcc: false }).bytes;
  const out = X.transplant(jpg, plain, { w: 120, h: 80 });
  const r = X.read(out);
  assert.equal(field(r, 'Model'), 'iPhone 15 Pro');
  assert.equal(r.exif.orientation, 1);
  assert.equal(field(r, 'ExifImageWidth'), '120');
  assert.equal(r.tiff.thumbnail, null);
  assert.deepEqual(r.exif.gps, { lat: 3.139, lon: 101.6869, alt: 56 });
  assert.equal(r.rights.creator, 'Old Name');
  assert.equal(X.transplant(plain, plain), plain, 'nothing to copy');
  assert.equal(X.transplant(jpg, new Uint8Array([1, 2, 3])).length, 3, 'unsupported target returned as is');
});
