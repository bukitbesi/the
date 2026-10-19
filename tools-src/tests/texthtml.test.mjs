// Text to HTML core: paragraphs, line breaks, lists, links and escaping; Markdown via the notepad renderer; HTML back
// to text.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const H = require('../../assets/js/texthtml-core.js');

test('Plain text to paragraphs and line breaks, with escaping', () => {
  assert.equal(H.fromText('Line one\nline two\n\n\nPara <b> & "x"'), '<p>Line one<br>\n  line two</p>\n<p>Para &lt;b&gt; &amp; &quot;x&quot;</p>');
  assert.equal(H.fromText('a\nb', { breaks: false }), '<p>a b</p>');
  assert.equal(H.fromText('a\nb', { indent: false }), '<p>a<br>\nb</p>');
  assert.equal(H.fromText('  \n\n '), '');
});

test('Lists', () => {
  assert.equal(H.fromText('- Nasi\n- Teh'), '<ul>\n  <li>Nasi</li>\n  <li>Teh</li>\n</ul>');
  assert.equal(H.fromText('• one\n* two'), '<ul>\n  <li>one</li>\n  <li>two</li>\n</ul>');
  assert.equal(H.fromText('3. c\n4) d'), '<ol start="3">\n  <li>c</li>\n  <li>d</li>\n</ol>');
  assert.equal(H.fromText('- a\nnot a list'), '<p>- a<br>\n  not a list</p>');
  assert.equal(H.fromText('- a', { lists: false }), '<p>- a</p>');
});

test('Links and emails', () => {
  assert.equal(H.fromText('Go to https://example.com/a?b=1&c=2. Or www.x.my!'), '<p>Go to <a href="https://example.com/a?b=1&amp;c=2">https://example.com/a?b=1&amp;c=2</a>. Or <a href="https://www.x.my">www.x.my</a>!</p>');
  assert.equal(H.fromText('Mail me@kopi.my', { newTab: true, nofollow: true }), '<p>Mail <a href="mailto:me@kopi.my">me@kopi.my</a></p>');
  assert.equal(H.fromText('(see https://x.com)', { newTab: true, nofollow: true }), '<p>(see <a href="https://x.com" rel="nofollow noopener" target="_blank">https://x.com</a>)</p>');
  assert.equal(H.fromText('https://x.com', { links: false }), '<p>https://x.com</p>');
  assert.equal(H.fromText('javascript:alert(1)'), '<p>javascript:alert(1)</p>');
});

test('Markdown and HTML to text', () => {
  assert.match(H.convert('# Title\n\n**bold** [link](https://x.my)', 'markdown'), /<h1>Title<\/h1>[\s\S]*<strong>bold<\/strong>[\s\S]*<a href="https:\/\/x\.my"/);
  assert.doesNotMatch(H.convert('[x](javascript:alert(1))', 'markdown'), /javascript:/);
  assert.equal(H.toText('<h1>Hi</h1><p>One<br>two &amp; &#8217;three&#x2019;</p><ul><li>a</li><li>b</li></ul><script>x</script>'), 'Hi\n\nOne\ntwo & ’three’\n\n• a\n• b');
  assert.equal(H.toText('<p><a href="https://x.my">site</a> and <a href="https://y.my">https://y.my</a></p>'), 'site (https://x.my) and https://y.my');
  assert.match(H.page('<p>x</p>', 'A & B'), /<title>A &amp; B<\/title>[\s\S]*<body>\n<p>x<\/p>/);
  assert.match(H.FACTS.verified, /^\d{4}-\d{2}-\d{2}$/);
});
