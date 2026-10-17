// Online Notepad: statistics, Markdown subset (and its XSS safety), find/replace, transforms, snapshots, backups,
// share-link encoding, and the .docx / ZIP writers it shares with other tools.
import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const N = require('../../assets/js/notepad-core.js');
const Z = require('../../assets/js/zip-core.js');
const D = require('../../assets/js/docx-core.js');

test('Counts words, characters, lines, paragraphs, sentences and reading time', () => {
  const s = N.stats('Saya suka kopi. It\'s 2026, isn\'t it?\n\nLine two — e-mail test.');
  assert.equal(s.words, 11);
  assert.equal(s.sentences, 3);
  assert.equal(s.paragraphs, 2);
  assert.equal(s.lines, 3);
  assert.equal(N.stats('😀 ab').chars, 4, 'emoji counts as one character');
  assert.equal(N.stats('a b').noSpaces, 2);
  assert.deepEqual([N.stats('').words, N.stats('').reading], [0, '0 min']);
  assert.equal(N.stats('word '.repeat(476)).reading, '2 min', '476 words at 238 wpm');
  assert.equal(N.stats('word '.repeat(100)).reading, 'under 1 min');
  assert.equal(N.FACTS.wpm, 238);
});

test('Markdown: headings, emphasis, lists, tasks, quotes, code, rules', () => {
  const h = N.html('# Title\n\nSome **bold**, *it*, ~~old~~ and `x<y`.\n\n- a\n- [x] done\n- [ ] todo\n\n1. one\n2. two\n\n> quote\n\n```\n<b>raw</b>\n```\n\n---');
  assert.equal(h, '<h1>Title</h1>\n<p>Some <strong>bold</strong>, <em>it</em>, <del>old</del> and <code>x&lt;y</code>.</p>\n' +
    '<ul><li>a</li><li><span class="md-task" role="img" aria-label="Done">☑</span> done</li><li><span class="md-task" role="img" aria-label="To do">☐</span> todo</li></ul>\n' +
    '<ol><li>one</li><li>two</li></ol>\n<blockquote><p>quote</p></blockquote>\n<pre><code>&lt;b&gt;raw&lt;/b&gt;</code></pre>\n<hr>');
  assert.equal(N.html('snake_case_name stays'), '<p>snake_case_name stays</p>');
  assert.equal(N.html('line one\nline two'), '<p>line one<br>line two</p>');
});

test('Markdown output cannot run scripts', () => {
  for (const evil of ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '[x](javascript:alert(1))', '[x](//evil.com)', '[x](data:text/html,hi)', '"><svg onload=1>']) {
    const out = N.html(evil);
    assert.ok(!/<script|<img|<svg|javascript:|href="\/\/|href="data:/i.test(out), out);
  }
  assert.equal(N.html('[ok](https://a.com/?q=1&b=2)'), '<p><a href="https://a.com/?q=1&amp;b=2" rel="noopener nofollow ugc" target="_blank">ok</a></p>');
  assert.equal(N.html('see https://a.com/x.'), '<p>see <a href="https://a.com/x" rel="noopener nofollow ugc" target="_blank">https://a.com/x</a>.</p>');
});

test('Find and replace: plain, case, whole word, regex', () => {
  const t = 'Cat cat catalog CAT';
  assert.equal(N.findAll(t, 'cat').length, 4);
  assert.equal(N.findAll(t, 'cat', { caseSensitive: true }).length, 2);
  assert.equal(N.findAll(t, 'cat', { word: true }).length, 3);
  assert.deepEqual(N.replaceAll(t, 'cat', 'dog', { word: true }), { text: 'dog dog catalog dog', count: 3 });
  assert.deepEqual(N.replaceAll('a1 b22', '(\\w)(\\d+)', '$2$1', { regex: true }), { text: '1a 22b', count: 2 });
  assert.equal(N.replaceAll('x', 'x', '$&$&').text, '$&$&', 'plain mode is literal');
  assert.throws(() => N.findAll('x', '(', { regex: true }));
  assert.equal(N.findAll('kopi Kopi', 'kopi', { word: true }).length, 2);
});

test('Transforms', () => {
  const T = N.TRANSFORMS;
  assert.equal(T.title.fn('hello wORLD (kuala lumpur)'), 'Hello World (Kuala Lumpur)');
  assert.equal(T.sentence.fn('HELLO. how are YOU? fine'), 'Hello. How are you? Fine');
  assert.equal(T.spaces.fn('  a   b \n  c  '), 'a b\nc');
  assert.equal(T.blank.fn('a\n\n \nb'), 'a\nb');
  assert.equal(T.sort.fn('b10\nB2\na'), 'a\nB2\nb10');
  assert.equal(T.unique.fn('a\nb\na'), 'a\nb');
  assert.equal(T.number.fn('a\nb'), '1. a\n2. b');
});

test('Notes: titles, snapshots every 2 minutes, search, backups', () => {
  const n = N.newNote('# Shopping list\n- milk', 1000);
  assert.equal(N.title(n), 'Shopping list');
  assert.equal(N.title(N.newNote('')), 'Untitled note');
  assert.equal(N.snapshot(n, 1000), true);
  n.text += '\n- eggs';
  assert.equal(N.snapshot(n, 60000), false, 'within 2 minutes');
  assert.equal(N.snapshot(n, 60000, true), true, 'forced');
  assert.equal(N.snapshot(n, 999999), false, 'unchanged');
  for (let i = 0; i < 30; i++) { n.text += i; N.snapshot(n, 1e6 + i * 2e5); }
  assert.equal(n.snaps.length, 20);
  const other = N.newNote('Meeting notes', 5);
  assert.deepEqual(N.search([n, other], 'MEETING').map(x => x.id), [other.id]);
  const back = N.importBackup(JSON.stringify({ notes: [n, { text: 'x', id: other.id }, { bad: 1 }] }), [other]);
  assert.equal(back.length, 2);
  assert.equal(back[0].id, n.id);
  assert.notEqual(back[1].id, other.id, 'clashing id replaced');
  assert.throws(() => N.importBackup('{"a":1}'), /notBackup/);
});

test('Share links round-trip through deflate and base64url', () => {
  const text = 'Nota saya ✓ '.repeat(50);
  const packed = N.toBase64Url(new Uint8Array(zlib.deflateRawSync(Buffer.from(text))));
  assert.match(packed, /^[A-Za-z0-9_-]+$/);
  assert.equal(zlib.inflateRawSync(Buffer.from(N.fromBase64Url(packed))).toString(), text);
  assert.ok(packed.length < 200, 'repetitive text compresses well');
});

test('ZIP writer and reader agree, with valid CRCs', () => {
  const z = Z.zip([{ name: 'a.txt', text: 'héllo' }, { name: 'a.txt', bytes: new Uint8Array([1, 2]) }]);
  const back = Z.unzip(z);
  assert.deepEqual(back.map(e => e.name), ['a.txt', 'a-2.txt']);
  assert.equal(new TextDecoder().decode(back[0].bytes), 'héllo');
  assert.equal(Z.crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  assert.throws(() => Z.unzip(new Uint8Array(30)), /notZip/);
});

test('.docx export contains the parts Word needs and the note text', () => {
  const blocks = N.parse('# Plan\n\nBuy **milk** & eggs\n\n- one\n- [x] two\n\n```\ncode <x>\n```');
  const z = D.build(blocks, { title: 'Plan', date: new Date('2026-10-17T00:00:00Z') });
  const parts = Object.fromEntries(Z.unzip(z).map(e => [e.name, new TextDecoder().decode(e.bytes)]));
  assert.deepEqual(Object.keys(parts).sort(), ['[Content_Types].xml', '_rels/.rels', 'docProps/core.xml', 'word/document.xml']);
  const doc = parts['word/document.xml'];
  assert.ok(doc.includes('<w:t xml:space="preserve">Plan</w:t>'));
  assert.ok(doc.includes('<w:b/><w:sz w:val="40"/>'), 'heading 1 is bold 20 pt');
  assert.ok(doc.includes('&amp; eggs') && doc.includes('code &lt;x&gt;'));
  assert.ok(doc.includes('☑ '));
  assert.ok(parts['docProps/core.xml'].includes('<dc:title>Plan</dc:title>'));
  assert.equal(N.plain(blocks), 'Plan\n\nBuy milk & eggs\n\n• one\n• two\n\ncode <x>');
  assert.equal(N.safeName('a/b:c?'), 'a b c');
});
