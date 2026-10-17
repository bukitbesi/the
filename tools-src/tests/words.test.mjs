// Word Counter core: counts agree with the notepad, Flesch scores on known texts, keyword density with stop words,
// focus keyword, character limits and .docx text.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const W = require('../../assets/js/words-core.js');
const N = require('../../assets/js/notepad-core.js');
const Z = require('../../assets/js/zip-core.js');
const D = require('../../assets/js/docx-core.js');

test('Counts match the Online Notepad', () => {
  const t = 'Saya suka kopi. It\'s 2026, isn\'t it?\n\nLine two — e-mail test.';
  const a = W.analyze(t), n = N.stats(t);
  assert.deepEqual([a.words, a.chars, a.noSpaces, a.paragraphs, a.lines, a.sentences], [n.words, n.chars, n.noSpaces, n.paragraphs, n.lines, n.sentences]);
  assert.equal(a.unique, 11);
  assert.equal(W.analyze('').words, 0);
  assert.equal(W.analyze('word '.repeat(238)).reading, '1 min');
  assert.equal(W.analyze('word '.repeat(300)).speaking, '2 min');
  assert.equal(W.analyze('one two three').reading, '1 sec');
});

test('Syllables and Flesch scores', () => {
  assert.deepEqual(['cat', 'table', 'beautiful', 'readability', 'make', 'running', 'the'].map(W.syllables), [1, 2, 3, 5, 1, 2, 1]);
  const easy = W.analyze('The cat sat on the mat. The dog ran to the cat.');
  assert.ok(easy.fre > 100 && easy.level === 'Very easy', String(easy.fre));
  assert.equal(easy.fkgl, 0);
  const hard = W.analyze('Notwithstanding considerable methodological heterogeneity, investigators systematically demonstrated substantial interdisciplinary applicability.');
  assert.ok(hard.fre < 0 && hard.level === 'Very difficult' && hard.fkgl > 18);
  assert.equal(W.readingLabel(65), 'Plain English');
});

test('Keyword density skips English and Malay stop words', () => {
  const t = 'Harga emas hari ini naik. Harga emas di Malaysia ikut harga emas dunia. The gold price is up.';
  const one = W.density(t, 1);
  assert.deepEqual(one.slice(0, 2).map(x => [x.term, x.count]), [['emas', 3], ['harga', 3]]);
  assert.ok(!one.some(x => ['di', 'ini', 'the', 'is'].includes(x.term)));
  const two = W.density(t, 2);
  assert.deepEqual(two[0], { term: 'harga emas', count: 3, pct: 33.3 });
  assert.ok(W.density(t, 1, { stop: false }).some(x => x.term === 'di'));
  assert.ok(W.density(t, 3).every(x => x.count > 1));
});

test('Focus keyword: count, density and placement', () => {
  const t = 'Kalkulator zakat untuk semua.\n\nZakat pendapatan dan zakat emas dikira di sini.';
  const k = W.keyword(t, 'zakat');
  assert.deepEqual(k, { count: 3, pct: 25, firstWord: 2, inFirstParagraph: true, inFirst100: true });
  assert.equal(W.keyword(t, 'zakat emas').count, 1);
  assert.equal(W.keyword(t, ''), null);
  assert.equal(W.keyword(t, 'gold').count, 0);
});

test('Character limits, with SMS falling to 70 for emoji', () => {
  const plain = W.limits('a'.repeat(200));
  assert.deepEqual(plain.find(l => l.key === 'sms'), { key: 'sms', label: 'SMS (one message)', max: 160, used: 200, left: -40, ok: false, note: '70 if the text has emoji or non-Latin letters' });
  assert.equal(plain.find(l => l.key === 'x').ok, true);
  assert.equal(W.limits('hi 😀').find(l => l.key === 'sms').max, 70);
  assert.equal(W.limits('café').find(l => l.key === 'sms').max, 160);
  assert.equal(W.LIMITS.length, 6);
});

test('Reads the text of a .docx', () => {
  const docx = D.build(N.parse('# Title\n\nFirst para & more\n\n- item'), { date: new Date(0) });
  assert.equal(W.docxText(Z.unzip(docx)), 'Title\nFirst para & more\n• item');
  assert.throws(() => W.docxText([]), /notDocx/);
  assert.match(W.FACTS.verified, /^\d{4}-\d{2}-\d{2}$/);
});
