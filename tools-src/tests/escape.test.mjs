// Parse HTML / Encoder-Decoder core: every mode round-trips, matches the platform functions, and rejects bad input.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('../../assets/js/escape-core.js');
const SAMPLE = '<a href="x?a=1&b=2">Kopi\'s café ☕ 🇲🇾</a>\n\tline';

test('HTML entities', () => {
  assert.equal(E.htmlEncode('<b class="x">Tom & Jerry\'s</b>'), '&lt;b class=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/b&gt;');
  assert.equal(E.htmlEncode('"<"', { quotes: false }), '"&lt;"');
  assert.equal(E.htmlEncode('é ☕', { nonAscii: true }), '&#233; &#9749;');
  assert.equal(E.htmlDecode('&lt;p&gt; &amp;amp; &#8217; &#x1F1F2; &rsquo;&nbsp;&bogus; &#0;'), '<p> &amp; ’ 🇲 ’ &bogus; &#0;');
  assert.equal(E.htmlDecode(E.htmlEncode(SAMPLE, { nonAscii: true })), SAMPLE);
  assert.equal(E.codeBlock('<b>\r\n"x"</b>', 'html'), '<pre><code class="language-html">&lt;b&gt;\n"x"&lt;/b&gt;</code></pre>');
});

test('URL and Base64', () => {
  assert.equal(E.urlEncode('a b&c=ø/?'), encodeURIComponent('a b&c=ø/?'));
  assert.equal(E.urlEncode('https://x.my/a b?q=1&r=é', { whole: true }), 'https://x.my/a%20b?q=1&r=%C3%A9');
  assert.equal(E.urlDecode('a+b%20c', { plus: true }), 'a b c');
  assert.throws(() => E.urlDecode('%E0%A4%A'), /two hex digits/);
  assert.equal(E.b64Encode('Hello, dunia ☕'), Buffer.from('Hello, dunia ☕').toString('base64'));
  assert.equal(E.b64Decode(E.b64Encode(SAMPLE)), SAMPLE);
  assert.equal(E.b64Encode('??>', { urlSafe: true }), 'Pz8-');
  assert.equal(E.b64Decode('Pz8-'), '??>');
  assert.equal(E.b64Decode('SGVs\nbG8'), 'Hello');
  assert.throws(() => E.b64Decode('abc$'), /Not valid Base64/);
});

test('JavaScript strings and Unicode escapes', () => {
  assert.equal(E.jsEncode('He said "hi"\n</script>'), 'He said \\"hi\\"\\n<\\/script>');
  assert.equal(E.jsEncode('it\'s "x"', { single: true }), 'it\\\'s "x"');
  assert.equal(E.jsDecode(JSON.stringify(SAMPLE)), SAMPLE);
  assert.equal(E.jsDecode("'it\\'s \\x41\\u0042\\u{1F600}'"), "it's AB😀");
  assert.throws(() => E.jsDecode('bad \\q'), /Unknown escape \\q at position 5/);
  assert.equal(E.uniEncode('café ☕ 😀'), 'caf\\u00e9 \\u2615 \\ud83d\\ude00');
  assert.equal(E.uniDecode('caf\\u00e9 \\u{1F600} &#x2615; U+1F1F2'), 'café 😀 ☕ 🇲');
  assert.equal(E.uniDecode(E.uniEncode(SAMPLE)), SAMPLE);
});

test('run() wraps every mode', () => {
  for (const m of Object.keys(E.MODES)) {
    const enc = E.run(m, 'encode', SAMPLE);
    assert.ok(enc.ok, m);
    assert.equal(E.run(m, 'decode', enc.text).text, SAMPLE, m);
  }
  assert.deepEqual(E.run('base64', 'decode', '***'), { ok: false, error: 'Not valid Base64: only A-Z, a-z, 0-9, +, / (or - and _) and = padding are allowed.' });
  assert.equal(E.run('nope', 'encode', 'x').ok, false);
  assert.match(E.FACTS.verified, /^\d{4}-\d{2}-\d{2}$/);
});
