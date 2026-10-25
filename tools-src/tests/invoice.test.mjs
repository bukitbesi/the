// Invoice maths: sen arithmetic, line and bill discounts, SST per rate, BNM cash rounding, amounts in words.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const I = require('../../assets/js/invoice-core.js');

test('worked example: 3 × RM150 design (8% service tax) + 2 × RM45.50 printing, RM20 delivery', () => {
  const t = I.totals({ items: [{ qty: 3, price: '150', tax: 'st8' }, { qty: 2, price: '45.50', tax: 'none' }], shipping: '20' });
  assert.equal(t.subtotal, 54100); assert.equal(t.tax, 3600); assert.equal(t.total, 59700);
  assert.deepEqual(t.taxes, { 8: { base: 45000, tax: 3600 } });
  assert.equal(I.money(t.total), 'RM597.00');
});

test('line discount, whole-bill discount spread before tax, deposit and balance', () => {
  const l = I.line({ qty: 1, price: '1000', discount: 10, tax: 'st8' });
  assert.deepEqual(l, { gross: 100000, discount: 10000, net: 90000, rate: 8, tax: 7200 });
  const t = I.totals({ items: [{ qty: 1, price: '1000', tax: 'st8' }], discount: '10%', paid: '500' });
  assert.equal(t.discount, 10000); assert.equal(t.tax, 7200); assert.equal(t.total, 97200); assert.equal(t.due, 47200);
  const mixed = I.totals({ items: [{ qty: 1, price: '100', tax: 'st8' }, { qty: 1, price: '100', tax: 'sales10' }], discount: '20' });
  assert.equal(mixed.taxes[8].base + mixed.taxes[10].base, 18000); assert.equal(mixed.tax, 720 + 900);
});

test('tax rounds half up to the sen; float noise never leaks', () => {
  assert.equal(I.line({ qty: 1, price: '12.34', tax: 'st8' }).tax, 99);   // 98.72 sen
  assert.equal(I.line({ qty: 3, price: '0.10', tax: 'none' }).net, 30);
  assert.equal(I.line({ qty: 1, price: '6.25', tax: 'st8' }).tax, 50);    // exactly 50
  assert.equal(I.sen('1,234.565'), 123457);
});

test('BNM cash rounding to the nearest 5 sen', () => {
  assert.deepEqual([101, 102, 103, 104, 105, 106, 107, 108, 109].map(I.cash5), [100, 100, 105, 105, 105, 105, 105, 110, 110]);
  const t = I.totals({ items: [{ qty: 1, price: '10.07' }], cashRounding: true });
  assert.equal(t.rounding, -2); assert.equal(t.total, 1005);
});

test('amounts in words in English and Malay', () => {
  assert.equal(I.words(59700, 'en'), 'Ringgit Malaysia Five hundred and ninety-seven only');
  assert.equal(I.words(123456, 'en'), 'Ringgit Malaysia One thousand two hundred and thirty-four and cents fifty-six only');
  assert.equal(I.words(59700, 'ms'), 'Ringgit Malaysia Lima ratus sembilan puluh tujuh sahaja');
  assert.equal(I.words(111150, 'ms'), 'Ringgit Malaysia Seribu seratus sebelas dan sen lima puluh sahaja');
  assert.equal(I.msWords(2019), 'dua ribu sembilan belas'); assert.equal(I.msWords(1000000), 'satu juta');
});

test('document numbers and due dates', () => {
  assert.equal(I.nextNumber('INV-2026-0009'), 'INV-2026-0010'); assert.equal(I.nextNumber('Q99'), 'Q100'); assert.equal(I.nextNumber('ABC'), 'ABC-2');
  assert.equal(I.dueDate('2026-10-25', 30), '2026-11-24'); assert.equal(I.dueDate('2026-12-20', 14), '2027-01-03'); assert.equal(I.dueDate('bad', 7), '');
});

test('preview: escapes input, shows SST line, words and balance; receipt and quotation labels', () => {
  const d = { lang: 'en', doc: 'invoice', number: 'INV-1', date: '2026-10-25', terms: 30, from: { name: 'A <b>&</b> B', sst: 'W10-1808-32000001' }, to: { name: 'Client' },
    items: [{ desc: 'Design', qty: 3, price: '150', tax: 'st8' }, { desc: 'Print', qty: 2, price: '45.50', tax: 'none' }], shipping: '20', paid: '97' };
  const h = I.preview(d);
  assert.ok(h.includes('A &lt;b&gt;&amp;&lt;/b&gt; B') && !h.includes('<b>&</b>'));
  assert.ok(h.includes('Service tax 8%') && h.includes('RM36.00') && h.includes('RM597.00') && h.includes('RM500.00'));
  assert.ok(h.includes('Ringgit Malaysia Five hundred only') && h.includes('24 Nov 2026') && h.includes('Payment due in 30 days'));
  const ms = I.preview({ ...d, lang: 'ms', doc: 'quotation', paid: '' });
  assert.ok(ms.includes('SEBUT HARGA') && ms.includes('Sah sehingga') && ms.includes('Cukai perkhidmatan 8%') && ms.includes('sahaja'));
  assert.ok(I.preview({ ...d, doc: 'receipt' }).includes('Received with thanks.'));
});

test('preview leaves out blank lines and an empty customer box', () => {
  const h = I.preview({ lang: 'en', doc: 'invoice', number: 'A1', date: '2026-10-25', from: { name: 'Me' }, to: {}, items: [{ desc: 'Work', qty: 1, price: '10' }, { desc: '', qty: 1, price: '' }] });
  assert.equal((h.match(/<tr><td>/g) || []).length, 1); assert.ok(!h.includes('inv-to'));
});
