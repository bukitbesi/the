// Privacy Policy Generator core: both languages carry the same sections, AdSense and Analytics statements appear only
// when chosen, answers fill in, output formats agree, and the checklist flags placeholders.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../../assets/js/privacy-core.js');

test('English and Malay have matching sections', () => {
  assert.deepEqual(P.TEXT.en.sections.map(s => s[0]), P.TEXT.ms.sections.map(s => s[0]));
  const [en, ms] = P.generate({ lang: 'both' });
  assert.deepEqual([en.lang, ms.lang], ['en', 'ms']);
  assert.deepEqual(en.sections.map(s => s.id), ms.sections.map(s => s.id));
  assert.equal(en.sections.length, 16);
  assert.equal(P.generate({ lang: 'ms' }).length, 1);
  assert.equal(ms.updated, 'Dikemas kini: 19 Oktober 2026');
});

test('Google AdSense and Analytics statements', () => {
  const md = P.markdown(P.generate({ lang: 'en' }));
  assert.match(md, /Third party vendors, including Google, use cookies to serve ads based on your prior visits/);
  assert.match(md, /Google's use of advertising cookies enables it and its partners to serve ads/);
  assert.match(md, /opt out of personalized advertising by visiting \[Google Ads Settings\]\(https:\/\/adssettings\.google\.com\/\)/);
  assert.match(md, /We use Google Analytics/);
  const none = P.markdown(P.generate({ lang: 'en', services: { adsense: false, analytics: false } }));
  assert.doesNotMatch(none, /AdSense|Google Analytics|Analytics\n/);
  assert.ok(!P.generate({ lang: 'en', services: { analytics: false } })[0].sections.some(s => s.id === 'analytics'));
});

test('Answers fill in and options change the text', () => {
  const o = { lang: 'en', site: 'Kedai Kopi', url: 'https://kopi.my', owner: 'Kopi Sdn Bhd', email: 'help@kopi.my', address: 'Dungun, Terengganu', collect: { orders: true, newsletter: true }, gdpr: false, children: false };
  const md = P.markdown(P.generate(o));
  assert.match(md, /how Kopi Sdn Bhd \("we", "us"\) collects, uses and protects your personal data when you visit Kedai Kopi at https:\/\/kopi\.my/);
  assert.match(md, /delivery address and order details/);
  assert.match(md, /contact Kopi Sdn Bhd at help@kopi\.my, Dungun, Terengganu\./);
  assert.doesNotMatch(md, /GDPR|European/);
  assert.doesNotMatch(md, /## Children/);
  assert.doesNotMatch(md, /\{\w+\}/);
  assert.match(md, /when you fill in a form, leave a comment or place an order\./);
  assert.match(P.markdown(P.generate({ lang: 'ms', collect: { comments: false } })), /apabila anda mengisi borang\./);
  assert.match(P.markdown(P.generate({ lang: 'en' })), /^# Privacy Policy\n\n\*Last updated: 19 October 2026\*/);
});

test('HTML, Markdown and text output', () => {
  const docs = P.generate({ lang: 'en', site: 'A & B <x>' });
  const h = P.html(docs);
  assert.match(h, /^<section lang="en">\n<h2>Privacy Policy<\/h2>/);
  assert.match(h, /<h3>Your rights<\/h3>/);
  assert.match(h, /A &amp; B &lt;x&gt;/);
  assert.match(h, /<a href="https:\/\/tools\.google\.com\/dlpage\/gaoptout" rel="nofollow noopener">/);
  assert.match(P.html(docs, 1), /<h1>Privacy Policy<\/h1>/);
  assert.match(P.text(docs), /Google Analytics opt-out browser add-on \(https:\/\/tools\.google\.com\/dlpage\/gaoptout\)/);
  assert.match(P.html(P.generate({ lang: 'both' })), /<\/section>\n<hr>\n<section lang="ms">/);
});

test('Checklist flags placeholders and bad contact details', () => {
  assert.deepEqual(P.check({}), ['placeholder']);
  assert.deepEqual(P.check({ site: 'Mine', owner: 'Me', email: 'bad', url: 'example' }), ['url', 'email']);
  assert.deepEqual(P.check({ site: 'Mine', owner: 'Me', email: 'me@mine.my', url: 'https://mine.my' }), []);
  assert.match(P.FACTS.verified, /^\d{4}-\d{2}-\d{2}$/);
});
