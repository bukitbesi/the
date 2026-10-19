// WhatsApp Link Generator core: number normalisation to WhatsApp's international digits-only form, message
// encoding, link parsing, formatting preview, button code and a QR code that decodes back to the link.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const W = require('../../assets/js/wa-core.js');
const ctx = {};
vm.runInNewContext(fs.readFileSync(new URL('../../assets/vendor/qrcode-generator-1.4.4.js', import.meta.url), 'utf8'), ctx);

test('Normalises local and international numbers', () => {
  for (const n of ['012-345 6789', '+60 12-345 6789', '60123456789', '0060123456789', '(012) 345-6789', '+60 012 345 6789', 'tel:+60123456789'])
    assert.equal(W.normalize(n, '60').digits, '60123456789', n);
  assert.equal(W.normalize('011-2345 6789', '60').digits, '601123456789');
  assert.equal(W.normalize('9123 4567', '65').digits, '6591234567');
  assert.equal(W.normalize('(202) 555-0143', '1').digits, '12025550143');
  assert.equal(W.normalize('07911 123456', '44').digits, '447911123456');
  assert.deepEqual(W.normalize('+60 012 345 6789').warn, ['trunk']);
  assert.deepEqual(W.normalize('03-2345 6789').warn, ['myLandline']);
  assert.deepEqual(W.normalize('012-345').error, 'short');
  assert.equal(W.normalize('1234567890123456', '60').error, 'long');
  assert.equal(W.normalize('call me').error, 'letters');
  assert.equal(W.normalize('').error, 'empty');
  assert.equal(W.countryOf('6731234567'), '673');
});

test('Builds and parses wa.me links', () => {
  assert.equal(W.link('60123456789', ''), 'https://wa.me/60123456789');
  assert.equal(W.link('60123456789', "I'm interested in your car for sale"), 'https://wa.me/60123456789?text=I%27m%20interested%20in%20your%20car%20for%20sale');
  assert.equal(W.link('', 'Hai! Harga? 50% & RM10\nTerima kasih 🙏'), 'https://wa.me/?text=Hai%21%20Harga%3F%2050%25%20%26%20RM10%0ATerima%20kasih%20%F0%9F%99%8F');
  assert.deepEqual(W.parseLink('https://wa.me/60123456789?text=Hi%20there'), { digits: '60123456789', text: 'Hi there' });
  assert.deepEqual(W.parseLink('https://api.whatsapp.com/send?phone=6012&text=a+b'), { digits: '6012', text: 'a b' });
  assert.equal(W.parseLink('https://example.com'), null);
  const t = 'Café ✓ "quotes" (1)*';
  assert.equal(decodeURIComponent(W.link('6012', t).split('?text=')[1]), t);
});

test('Formatting preview follows WhatsApp syntax and escapes HTML', () => {
  assert.equal(W.formatHtml('*bold* _it_ ~gone~ `x` <b>'), '<strong>bold</strong> <em>it</em> <s>gone</s> <code>x</code> &lt;b&gt;');
  assert.equal(W.formatHtml('```a *b*```'), '<code class="wa-mono">a *b*</code>');
  assert.equal(W.formatHtml('> quote\n- item\n* item2'), '<span class="wa-quote">quote</span><br><span class="wa-li">• item</span><br><span class="wa-li">• item2</span>');
  assert.equal(W.formatHtml('2*3*4 and snake_case_name'), '2*3*4 and snake_case_name');
});

test('Button code and QR code', () => {
  const url = W.link('60123456789', 'Hi');
  assert.match(W.snippet(url, 'Chat with us'), /^<a href="https:\/\/wa\.me\/60123456789\?text=Hi" rel="noopener" style=".*">Chat with us<\/a>$/);
  assert.match(W.snippet(url, 'x', 'floating'), /class="wa-float"[\s\S]*position:fixed/);
  const m = W.qrMatrix(ctx.qrcode, url);
  assert.equal(m.length, 29);
  assert.ok(m[0][0] && m[0][6] && m[6][0] && !m[7][7], 'finder pattern');
  const svg = W.qrSvg(m, 'QR');
  assert.match(svg, /^<svg[^>]+viewBox="0 0 37 37"/);
  assert.match(W.FACTS.verified, /^\d{4}-\d{2}-\d{2}$/);
});
