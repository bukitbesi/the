// HTML Table Generator core: CSV/TSV/Markdown import, accessible HTML with scoped CSS or inline styles, numeric
// alignment, Markdown and CSV export.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../../assets/js/table-core.js');

test('Imports CSV, tab-separated and Markdown', () => {
  assert.deepEqual(T.parse('Item,Price\n"Kopi, O",2.50\n"Say ""hi""",3'), [['Item', 'Price'], ['Kopi, O', '2.50'], ['Say "hi"', '3']]);
  assert.deepEqual(T.parse('a\tb\tc\n1\t2'), [['a', 'b', 'c'], ['1', '2', '']]);
  assert.deepEqual(T.parse('a;b\n1,5;2'), [['a', 'b'], ['1,5', '2']]);
  assert.deepEqual(T.parse('| Item | Price |\n|---|---:|\n| Teh | RM2 |\n| a \\| b | 3 |'), [['Item', 'Price'], ['Teh', 'RM2'], ['a | b', '3']]);
  assert.deepEqual(T.parse('"multi\nline",x'), [['multi\nline', 'x']]);
  assert.deepEqual(T.parse('﻿a,b\n'), [['a', 'b']]);
  assert.deepEqual(T.parse('  '), []);
});

test('Accessible HTML with scoped CSS', () => {
  const rows = [['Item', 'Price'], ['Kopi <O>', 'RM2.50'], ['Teh', 'RM2.00']];
  const h = T.html(rows, { caption: 'Menu', firstCol: true });
  assert.match(h, /^<style>\n\.tbb-table-wrap\{overflow-x:auto/);
  assert.match(h, /<table class="tbb-table">\n  <caption>Menu<\/caption>\n  <thead>\n    <tr><th scope="col">Item<\/th><th scope="col" class="num">Price<\/th><\/tr>/);
  assert.match(h, /<tr><th scope="row">Kopi &lt;O&gt;<\/th><td class="num">RM2.50<\/td><\/tr>/);
  assert.doesNotMatch(T.html(rows, { header: false, responsive: false }), /<thead>|-wrap/);
  assert.match(T.html(rows, { theme: 'striped' }), /tbody tr:nth-child\(even\)\{background:#f5f6fb\}/);
  assert.equal(T.html([]), '');
});

test('Inline styles for Blogger and email', () => {
  const h = T.html([['A', 'N'], ['x', '1'], ['y', '2']], { inline: true, theme: 'striped' });
  assert.doesNotMatch(h, /<style>|class=/);
  assert.match(h, /<th scope="col" style="padding:10px 12px;border:1px solid #e3e5ee;text-align:right;vertical-align:top;background:#4a3cc2;color:#ffffff;font-weight:700">N<\/th>/);
  assert.match(h, /<tr><td style="[^"]*text-align:left[^"]*background:#f5f6fb">y<\/td>/);
});

test('Numeric columns, Markdown and CSV export', () => {
  assert.deepEqual(T.numericCols([['n', 'p', 'm'], ['1,200', 'RM3.50', 'x'], ['', '12%', '5']], true), [true, true, false]);
  assert.equal(T.markdown([['Item', 'Qty'], ['a|b', '2']]), '| Item | Qty |\n| --- | ---: |\n| a\\|b | 2 |\n');
  assert.equal(T.csv([['a', 'b,c'], ['"q"', ' x']]), 'a,"b,c"\r\n"""q"""," x"\r\n');
  assert.equal(Object.keys(T.THEMES).length, 5);
  assert.match(T.FACTS.verified, /^\d{4}-\d{2}-\d{2}$/);
});
