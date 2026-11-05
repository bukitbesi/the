// Line tools core: list to paragraph and back, duplicate line remover, line-break clean-ups and the line sorter.
// The worked examples here are the ones quoted in the FAQs of the three pages.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const L = require('../../assets/js/lines-core.js');

test('List to paragraph: separators, "and" with and without the Oxford comma, Malay "dan"', () => {
  const list = '- Apples\n- Bananas\n- Cherries';
  assert.equal(L.listToParagraph(list, { sep: 'comma' }).text, 'Apples, Bananas, Cherries');
  assert.equal(L.listToParagraph(list, { sep: 'and' }).text, 'Apples, Bananas, and Cherries');
  assert.equal(L.listToParagraph(list, { sep: 'and', oxford: false }).text, 'Apples, Bananas and Cherries');
  assert.equal(L.listToParagraph(list, { sep: 'or' }).text, 'Apples, Bananas, or Cherries');
  assert.equal(L.listToParagraph('epal\npisang\nceri', { sep: 'and', lang: 'ms' }).text, 'epal, pisang dan ceri');
  assert.equal(L.listToParagraph('tea\ncoffee', { sep: 'and' }).text, 'tea and coffee');
  assert.equal(L.listToParagraph(list, { sep: 'semicolon' }).text, 'Apples; Bananas; Cherries');
  assert.equal(L.listToParagraph(list, { sep: 'custom', custom: ' / ' }).text, 'Apples / Bananas / Cherries');
  assert.equal(L.listToParagraph(list, { sep: 'comma', end: '.' }).text, 'Apples, Bananas, Cherries.');
});

test('List to paragraph: numbered lists, quotes for SQL or CSV, sentences and paragraph groups', () => {
  assert.equal(L.listToParagraph('1. Open the app\n2) Tap Settings\n(3) Choose Language\na. Done', { sep: 'sentence' }).text, 'Open the app. Tap Settings. Choose Language. Done.');
  assert.equal(L.listToParagraph('Is it free?\nYes!', { sep: 'sentence' }).text, 'Is it free? Yes!');
  assert.equal(L.listToParagraph('A001\nB002\nC003', { sep: 'comma', quote: "'" }).text, "'A001', 'B002', 'C003'");
  assert.equal(L.listToParagraph('say "hi"\nok', { sep: 'comma', quote: '"' }).text, '"say ""hi""", "ok"');
  const g = L.listToParagraph('a\nb\n\nc\nd', { sep: 'comma' });
  assert.deepEqual([g.text, g.items, g.paragraphs], ['a, b\n\nc, d', 4, 2]);
  assert.equal(L.listToParagraph('a\nb\n\nc', { sep: 'comma', groups: false }).text, 'a, b, c');
  assert.equal(L.listToParagraph('- keep - dash', { sep: 'comma', strip: false }).text, '- keep - dash');
  assert.equal(L.listToParagraph('  \n\n', { sep: 'comma' }).text, '');
});

test('Paragraph to list: commas with a final "and", sentences, custom split and output formats', () => {
  assert.equal(L.paragraphToList('Apples, bananas, and cherries').text, '- Apples\n- bananas\n- cherries');
  assert.equal(L.paragraphToList('epal, pisang dan ceri', { bullet: 'number' }).text, '1. epal\n2. pisang\n3. ceri');
  assert.equal(L.paragraphToList('salt and pepper, rice').text, '- salt and pepper\n- rice');
  assert.equal(L.paragraphToList('Dr. Tan arrived at 9.30 a.m. on Monday. He left. Did he pay? Yes!', { split: 'sentence', bullet: 'none' }).text,
    'Dr. Tan arrived at 9.30 a.m. on Monday.\nHe left.\nDid he pay?\nYes!');
  assert.equal(L.paragraphToList('a|b|c', { split: 'custom', custom: '|', bullet: 'letter' }).text, 'a. a\nb. b\nc. c');
  assert.equal(L.paragraphToList('x, y', { bullet: 'ul' }).text, '<ul>\n  <li>x</li>\n  <li>y</li>\n</ul>');
  assert.equal(L.paragraphToList('a<b, c', { bullet: 'ol' }).text, '<ol>\n  <li>a&lt;b</li>\n  <li>c</li>\n</ol>');
  assert.equal(L.paragraphToList('a, b', { bullet: 'check' }).text, '- [ ] a\n- [ ] b');
  assert.equal(L.paragraphToList('one two  three', { split: 'space', bullet: 'paren' }).text, '1) one\n2) two\n3) three');
  assert.equal(L.paragraphToList('Red, red, Blue', { dedupe: true }).items, 2);
  assert.equal(L.paragraphToList('line one\nline two').text, '- line one\n- line two');
});

test('Duplicate lines: first copy kept, case, spaces, keep last, unique-only and duplicates-only modes', () => {
  const t = 'apple\nBanana\napple\n\ncherry\nbanana \napple';
  const r = L.dedupe(t);
  assert.equal(r.text, 'apple\nBanana\n\ncherry\nbanana');
  assert.deepEqual([r.total, r.unique, r.removed, r.empty], [6, 4, 2, 1]);
  assert.deepEqual(r.dupes, [{ line: 'apple', count: 3 }]);
  const ci = L.dedupe(t, { ignoreCase: true, removeEmpty: true });
  assert.equal(ci.text, 'apple\nBanana\ncherry');
  assert.equal(ci.removed, 3);
  assert.equal(L.dedupe(t, { ignoreCase: true, keep: 'last', removeEmpty: true }).text, 'cherry\nbanana\napple');
  assert.equal(L.dedupe(t, { ignoreCase: true, mode: 'unique' }).text, 'cherry');
  assert.equal(L.dedupe(t, { ignoreCase: true, mode: 'dupes' }).text, 'apple\nBanana');
  assert.equal(L.dedupe('a  b\na b', { ignoreSpaces: true }).text, 'a  b');
  assert.equal(L.dedupe(' a\na', { trim: false }).text, ' a\na');
});

test('Line breaks: join, keep paragraphs, fix hyphenation, collapse blank lines, one sentence per line', () => {
  const pdf = 'This text was copied\nfrom a PDF and has\nbreaks.\n\nSecond para-\ngraph here.';
  assert.equal(L.breaks(pdf, 'join'), 'This text was copied from a PDF and has breaks. Second para- graph here.');
  assert.equal(L.breaks(pdf, 'paragraphs'), 'This text was copied from a PDF and has breaks.\n\nSecond para- graph here.');
  assert.equal(L.breaks(pdf, 'hyphens'), 'This text was copied from a PDF and has breaks.\n\nSecond paragraph here.');
  assert.equal(L.breaks('a\n\n\n\nb\n \n\nc', 'collapse'), 'a\n\nb\n\nc');
  assert.equal(L.breaks('a\n\n  \nb', 'empty'), 'a\nb');
  assert.equal(L.breaks('One. Two? Three!', 'sentences'), 'One.\nTwo?\nThree!');
  assert.equal(L.breaks('a\nb', 'br'), 'a<br>\nb');
  assert.equal(L.breaks('a\n\nb\nc', 'comma'), 'a, b, c');
});

test('Sort: natural A to Z, Z to A, case, numbers, length, last word, column, articles, shuffle', () => {
  const files = 'item 10\nItem 2\nitem 1\n\nitem 2';
  assert.equal(L.sort(files).text, 'item 1\nItem 2\nitem 2\nitem 10');
  assert.equal(L.sort(files, { natural: false }).text, 'item 1\nitem 10\nItem 2\nitem 2');
  assert.equal(L.sort(files, { order: 'za' }).text, 'item 10\nItem 2\nitem 2\nitem 1');
  assert.equal(L.sort(files, { dedupe: true }).text, 'item 1\nItem 2\nitem 10');
  assert.equal(L.sort('b\nB\na\nA', { caseSensitive: true }).text, 'A\na\nB\nb');
  assert.equal(L.sort('RM1,200 rent\nRM 85 phone\nno price\nRM-5 refund\nRM 1,050.50 car', { order: 'num' }).text, 'RM-5 refund\nRM 85 phone\nRM 1,050.50 car\nRM1,200 rent\nno price');
  assert.equal(L.sort('ccc\na\nbb', { order: 'len' }).text, 'a\nbb\nccc');
  assert.equal(L.sort('ccc\na\nbb', { order: 'lenDesc' }).text, 'ccc\nbb\na');
  assert.equal(L.sort('Siti Aminah\nAhmad Zaki\nLim Wei', { by: 'last' }).text, 'Siti Aminah\nLim Wei\nAhmad Zaki');
  assert.equal(L.sort('Ali,32\nBala,25\nChong,41', { by: 'col', col: 2, order: 'num' }).text, 'Bala,25\nAli,32\nChong,41');
  assert.equal(L.sort('The Zoo\nA Beach\nCity', { ignoreArticles: true }).text, 'A Beach\nCity\nThe Zoo');
  assert.equal(L.sort('1\n2\n3', { order: 'reverse' }).text, '3\n2\n1');
  const s1 = L.sort('a\nb\nc\nd\ne', { order: 'random', seed: 7 }).text, s2 = L.sort('a\nb\nc\nd\ne', { order: 'random', seed: 7 }).text;
  assert.equal(s1, s2);
  assert.deepEqual(s1.split('\n').sort(), ['a', 'b', 'c', 'd', 'e']);
  assert.equal(L.firstNumber('Total: RM12,345.60'), 12345.6);
});

test('Stats count lines, words and characters (emoji count once)', () => {
  assert.deepEqual(L.stats('a b\n\n😀'), { lines: 3, nonEmpty: 2, chars: 6, words: 3 });
  assert.deepEqual(L.stats(''), { lines: 0, nonEmpty: 0, chars: 0, words: 0 });
});

test('run() gives each page the same result and summary as the build', () => {
  assert.deepEqual(L.run('list', '- Nasi lemak\n- Roti canai\n- Satay'), { text: 'Nasi lemak, Roti canai, and Satay', summary: '3 items joined into 1 paragraph.' });
  assert.equal(L.run('list', 'a, b and c', { mode: 'p2l', bullet: 'number' }).text, '1. a\n2. b\n3. c');
  const d = L.run('dedupe', 'x\ny\nx\nx');
  assert.deepEqual(d, { text: 'x\ny', summary: '4 lines, 2 unique, 2 lines removed. Most repeated: "x" ×3.' });
  assert.equal(L.run('dedupe', 'a\nb', { mode: 'breaks', brk: 'join' }).summary, '2 lines → 1 line.');
  assert.equal(L.run('sort', 'b\n\na\na', { dedupe: true }).summary, '2 lines sorted, 2 lines removed (empty or duplicate).');
  assert.equal(L.run('sort', '   ').summary, 'Paste or type your text to start.');
});
