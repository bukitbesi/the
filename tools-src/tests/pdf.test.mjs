// PDF Converter core: the image-page PDF writer (structure and cross-reference offsets), page layout, JPEG
// facts, page ranges and the reading-order rebuild used for PDF to Word.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../../assets/js/pdf-core.js');
const jpg = new Uint8Array(fs.readFileSync(new URL('../../assets/img/exif-sample-bukit-besi.jpg', import.meta.url)));
const iphone = new Uint8Array(fs.readFileSync(new URL('./fixtures/exif-iphone.jpg', import.meta.url)));

test('Layout: A4 portrait and landscape, margins, fit to image', () => {
  assert.deepEqual(P.layout(800, 533, { size: 'a4' }), { pw: 841.89, ph: 595.28, x: 0, y: 17.19, w: 841.89, h: 560.91 }, 'wide image turns the page');
  assert.deepEqual(P.layout(800, 533, { size: 'a4', orient: 'portrait', margin: 10 }), { pw: 595.28, ph: 841.89, x: 28.35, y: 241.53, w: 538.59, h: 358.83 });
  assert.deepEqual(P.layout(800, 600, { size: 'fit' }), { pw: 600, ph: 450, x: 0, y: 0, w: 600, h: 450 }, '96 dpi');
  const c = P.layout(1000, 1000, { size: 'letter', mode: 'cover' });
  assert.equal(c.w, 792);
  assert.equal(c.x, -90);
});

test('JPEG facts: size, components, orientation', () => {
  assert.deepEqual(P.jpegInfo(jpg), { h: 533, w: 800, comps: 3, progressive: false, orient: 1 });
  const i = P.jpegInfo(iphone);
  assert.deepEqual([i.w, i.h, i.progressive, i.orient], [240, 160, true, 6]);
  assert.equal(P.embeddable(P.jpegInfo(jpg)), true);
  assert.equal(P.embeddable(i), false, 'rotated photos are redrawn upright first');
  assert.equal(P.jpegInfo(new Uint8Array([0x89, 0x50])), null);
});

test('Images to PDF: valid structure, exact cross-reference offsets, JPEG embedded unchanged', () => {
  const info = P.jpegInfo(jpg);
  const pdf = P.imagesToPdf([{ jpeg: jpg, w: info.w, h: info.h, comps: 3, place: P.layout(info.w, info.h, { size: 'a4' }) },
    { jpeg: jpg, w: info.w, h: info.h, comps: 3, place: P.layout(info.w, info.h, { size: 'fit' }) }], { title: 'Résumé', date: new Date('2026-10-17T08:00:00Z') });
  const s = Buffer.from(pdf).toString('latin1');
  assert.ok(s.startsWith('%PDF-1.4'));
  assert.ok(s.endsWith('%%EOF\n'));
  assert.match(s, /\/Count 2 >>/);
  assert.match(s, /\/MediaBox \[0 0 841.89 595.28\]/);
  assert.match(s, /\/MediaBox \[0 0 600 399.75\]/);
  assert.match(s, /\/Title <FEFF0052/);
  assert.match(s, /\/CreationDate \(D:20261017080000Z\)/);
  const startxref = +/startxref\n(\d+)/.exec(s)[1];
  assert.ok(s.slice(startxref).startsWith('xref'));
  const entries = [...s.slice(startxref).matchAll(/(\d{10}) 00000 n /g)].map(m => +m[1]);
  entries.forEach((off, i) => assert.ok(s.slice(off).startsWith((i + 1) + ' 0 obj'), 'object ' + (i + 1)));
  assert.ok(Buffer.from(pdf).includes(Buffer.from(jpg)), 'JPEG bytes copied as-is');
  assert.equal(P.pdfString('a(b)\\c'), '(a\\(b\\)\\\\c)');
  assert.equal(P.pdfString('é'), '<FEFF00E9>');
});

test('Page ranges for extract and split', () => {
  assert.deepEqual(P.parseRanges('1-3, 5, 8-', 10), [0, 1, 2, 4, 7, 8, 9]);
  assert.deepEqual(P.parseRanges('3-1', 5), [2, 1, 0], 'reversed range keeps the written order');
  assert.deepEqual(P.parseRanges('-2 12', 10), [0, 1], 'missing pages dropped');
  assert.deepEqual(P.parseRanges('9-', 5), [], 'open range past the end is empty');
  assert.throws(() => P.parseRanges('a-b', 3), /range/);
  assert.deepEqual(P.splitGroups('every', 3), [[0], [1], [2]]);
  assert.deepEqual(P.splitGroups('chunks', 5, 2), [[0, 1], [2, 3], [4]]);
  assert.deepEqual(P.splitGroups('ranges', 6, '1-2; 4-6'), [[0, 1], [3, 4, 5]]);
});

test('PDF text to Word: lines, paragraphs, headings, bullets and hyphens', () => {
  const item = (str, x, y, h = 11, w) => ({ str, transform: [h, 0, 0, h, x, y], height: h, width: w || str.length * h * 0.5 });
  const page = [
    item('Annual', 72, 760, 22), item('Report', 150, 760, 22, 70),
    item('This is the first para-', 72, 720), item('graph of the report.', 72, 707),
    item('A new paragraph starts', 72, 670), item('after a gap.', 72, 657),
    item('• First point', 72, 630), item('• Second point', 72, 617),
    item('Total', 72, 590), item('RM 1,200', 300, 590)
  ];
  const ls = P.lines(page);
  assert.equal(ls[0].text, 'Annual Report');
  assert.equal(ls.at(-1).text, 'Total RM 1,200', 'same baseline joins left to right');
  const blocks = P.toBlocks([ls]);
  assert.deepEqual(blocks.map(b => b.t), ['h', 'p', 'p', 'ul', 'p']);
  assert.equal(blocks[0].level, 1);
  assert.equal(blocks[1].inl[0].text, 'This is the first paragraph of the report.');
  assert.equal(blocks[2].inl[0].text, 'A new paragraph starts after a gap.');
  assert.deepEqual(blocks[3].items.map(i => i.inl[0].text), ['First point', 'Second point']);
  assert.equal(P.bodySize([ls]), 11);
  const two = P.toBlocks([ls, P.lines([item('Page two', 72, 760)])], { pageBreaks: true });
  assert.ok(two.some(b => b.t === 'pagebreak'));
  assert.match(P.blocksToText(blocks), /^Annual Report\n\nThis is the first paragraph/);
});

test('Names, sizes and vendor paths', () => {
  assert.equal(P.baseName('Report v2.final.pdf'), 'Report v2.final');
  assert.equal(P.size(1536), '1.5 KB');
  for (const v of Object.values(P.VENDOR)) assert.ok(fs.existsSync(new URL('../..' + v, import.meta.url)), v);
  assert.match(P.FACTS.verified, /^\d{4}-\d{2}-\d{2}$/);
});
