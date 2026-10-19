// Find and Replace / Text Cleaner core: plain and regex rules in order, options, groups, highlighting and clean-ups.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../../assets/js/textclean-core.js');

test('Plain find and replace with options', () => {
  const t = 'Cat cat category. CAT!';
  assert.deepEqual(T.replaceAll(t, [{ find: 'cat', replace: 'dog' }]), { text: 'dog dog dogegory. dog!', counts: [4], errors: [null] });
  assert.equal(T.replaceAll(t, [{ find: 'cat', replace: 'dog', caseSensitive: true }]).text, 'Cat dog dogegory. CAT!');
  assert.equal(T.replaceAll(t, [{ find: 'cat', replace: 'dog', wholeWord: true }]).text, 'dog dog category. dog!');
  assert.equal(T.replaceAll('a.b.c', [{ find: '.', replace: '-' }]).text, 'a-b-c');
  assert.equal(T.replaceAll('a, b, c', [{ find: ', ', replace: '\\n' }]).text, 'a\nb\nc');
  assert.equal(T.replaceAll('kafé café', [{ find: 'café', replace: 'cafe', wholeWord: true }]).text, 'kafé cafe');
  assert.equal(T.replaceAll('x', [{ find: '', replace: 'y' }]).text, 'x');
});

test('Regex rules, groups and errors; rules run in order', () => {
  assert.equal(T.replaceAll('2026-10-19', [{ find: '(\\d+)-(\\d+)-(\\d+)', replace: '$3/$2/$1', regex: true }]).text, '19/10/2026');
  assert.equal(T.replaceAll('RM10 RM25', [{ find: 'RM(?<n>\\d+)', replace: '$<n> ringgit ($&)', regex: true }]).text, '10 ringgit (RM10) 25 ringgit (RM25)');
  assert.equal(T.replaceAll('price $5', [{ find: 'price', replace: '$$', regex: true }]).text, '$ $5');
  const r = T.replaceAll('one two', [{ find: '(', replace: 'x', regex: true }, { find: 'one', replace: '1' }]);
  assert.equal(r.errors[0], 'Unterminated group');
  assert.equal(r.text, '1 two');
  assert.deepEqual(T.replaceAll('a b', [{ find: 'a', replace: 'b' }, { find: 'b', replace: 'c' }]), { text: 'c c', counts: [1, 2], errors: [null, null] });
  assert.equal(T.replaceAll('l1\nl2', [{ find: '^', replace: '- ', regex: true, multiline: true }]).text, '- l1\n- l2');
});

test('Highlighting escapes HTML', () => {
  assert.deepEqual(T.highlight('<b>cat</b> Cat', { find: 'cat' }), { html: '&lt;b&gt;<mark>cat</mark>&lt;/b&gt; <mark>Cat</mark>', count: 2 });
  assert.equal(T.highlight('aaa', { find: 'a*', regex: true }).count, 1);
  assert.equal(T.highlight('x', { find: '[', regex: true }).count, 0);
});

test('Clean-ups', () => {
  const C = (t, ...k) => T.clean(t, k);
  assert.equal(C('  hello    world \t\n  next  ', 'spaces', 'trim'), 'hello world\nnext');
  assert.equal(C('line one\nline two\n\npara two\nmore', 'linebreaks'), 'line one line two\n\npara two more');
  assert.equal(C('a\n\nb\n', 'alllines'), 'a b ');
  assert.equal(C('b\n\na\nb\n10\n9', 'empty', 'dupes', 'sort'), '9\n10\na\nb');
  assert.equal(C('Harga RM12.50 (diskaun 10%)!', 'numbers'), 'Harga RM. (diskaun %)!');
  assert.equal(C('Hi, there! #tag @me $5', 'punctuation'), 'Hi there tag me 5');
  assert.equal(C('Hi, there! #tag @me $5 ✓', 'special'), 'Hi, there! tag me 5 ');
  assert.equal(C('Terima kasih 🙏🏽 👨‍👩‍👧 🇲🇾 ❤️!', 'emoji'), 'Terima kasih    !');
  assert.equal(C('Café naïve résumé', 'accents'), 'Cafe naive resume');
  assert.equal(C('Visit https://x.my/a?b=1 or www.y.com, mail me@x.my', 'urls', 'emails'), 'Visit  or  mail ');
  assert.equal(C('<p>Hi&nbsp;<b>there</b></p><script>x()</script><p>a &amp; b</p>', 'html'), 'Hi there\na & b\n');
  assert.equal(C('naïve 中文 ok', 'nonascii'), 'nave  ok');
  assert.equal(T.clean('a-b_c[d]', [], '-_[]'), 'abcd');
  assert.equal(C('a\r\nb', 'reverse'), 'b\na');
  assert.deepEqual(T.stats('héllo', 'hé'), { before: 5, after: 2, removed: 3, lines: 1 });
  assert.equal(T.OPS.length, 17);
  assert.match(T.FACTS.verified, /^\d{4}-\d{2}-\d{2}$/);
});
