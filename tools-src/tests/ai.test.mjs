// AI writing tools: language detection, task instructions, reply cleaning, caption parsing and word diff.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const A = require('../../assets/js/ai-core.js');

test('detects Malay and English; counts words and reading time', () => {
  assert.equal(A.detectLang('Saya pergi ke kedai untuk membeli roti dan susu.'), 'ms');
  assert.equal(A.detectLang('I went to the shop to buy bread and milk.'), 'en');
  const c = A.count('One two three. Four five!');
  assert.equal(c.words, 5); assert.equal(c.sentences, 2);
});

test('task builders: modes, language and limits go into the instructions', () => {
  const p = A.paraphrase({ text: 'Saya suka makan nasi lemak setiap pagi.', mode: 'formal' });
  assert.equal(p.task, 'paraphrase'); assert.equal(p.lang, 'ms'); assert.match(p.system, /nada rasmi/); assert.match(p.system, /bahasa Melayu baku/);
  assert.match(A.paraphrase({ text: 'I like it.', mode: 'standard', lang: 'ms' }).system, /bahasa Melayu baku/);
  const g = A.paraphrase({ text: 'He go to school yesterday.', mode: 'grammar' });
  assert.equal(g.task, 'grammar'); assert.match(g.system, /English/); assert.ok(g.temperature < 0.2);
  assert.match(A.summarize({ text: 'x', length: 'short', format: 'keypoints' }).system, /2 to 3 sentences.*Takeaway/);
  const c = A.caption({ text: 'nasi lemak', count: 3, hashtags: 0, platform: 'x', lang: 'manglish', occasion: 'raya', emoji: 'no' });
  assert.match(c.system, /3 different X/); assert.match(c.system, /Hari Raya Aidilfitri/); assert.match(c.system, /Do not write hashtags/); assert.match(c.system, /Do not use emoji/);
  assert.equal(A.enhance({ text: 'kucing makan durian' }).task, 'enhance');
  assert.match(A.caption({ text: 'x', platform: 'instagram', hashtags: 30 }).system, /followed by 5 relevant hashtags/);
  assert.match(A.caption({ text: 'x', platform: 'linkedin' }).system, /followed by 5 relevant/);
});

test('clean strips fences, quotes and "Here is" prefaces', () => {
  assert.equal(A.clean('Here is the rewritten text:\nThe cat sat.'), 'The cat sat.');
  assert.equal(A.clean('Berikut adalah ringkasan:\n- Satu'), '- Satu');
  assert.equal(A.clean('```\nHello\n```'), 'Hello');
  assert.equal(A.clean('"Quoted line"'), 'Quoted line');
});

test('parseCaptions reads numbered captions and unique hashtags', () => {
  const r = A.parseCaptions('1. Pagi yang indah ☀️\n2) Kopi dulu, baru kerja\nsambung baris\n3 - Jom sarapan!\n\nHashtags: #NasiLemak #sarapan nasilemak #KL #kl');
  assert.deepEqual(r.captions, ['Pagi yang indah ☀️', 'Kopi dulu, baru kerja\nsambung baris', 'Jom sarapan!']);
  assert.deepEqual(r.hashtags, ['#NasiLemak', '#sarapan', '#KL']);
});

test('diff marks added and removed words; similarity is the share of words kept', () => {
  const d = A.diff('He go to school yesterday.', 'He went to school yesterday.');
  assert.deepEqual(d.map(x => x.t), ['same', 'del', 'add', 'same']);
  assert.equal(d[1].w.trim(), 'go'); assert.equal(d[2].w.trim(), 'went');
  assert.equal(A.similarity('a b c d', 'a b c d'), 1);
  assert.equal(A.similarity('a b c d', 'a x c y'), 0.5);
  assert.match(A.errorText('quota', 'ms'), /8 pagi/);
});

test('image prompt adds the style; mime type from base64', () => {
  assert.equal(A.imagePrompt('a cat eating durian.', 'watercolour'), 'a cat eating durian, watercolour painting, soft washes, paper texture, gentle colours');
  assert.equal(A.imagePrompt('a cat', 'none'), 'a cat');
  assert.equal(A.mimeOf('/9j/4AAQ'), 'image/jpeg'); assert.equal(A.mimeOf('iVBORw0K'), 'image/png'); assert.equal(A.mimeOf('UklGRiQ'), 'image/webp');
});

test('Malay text gets Malay instructions with DBP collocation rules and a JSON grammar reply', () => {
  const t = 'Kami mengucapkan maaf kerana mesyuarat terpaksa diundurkan.';
  const g = A.paraphrase({ text: t, mode: 'grammar' });
  assert.equal(g.lang, 'ms'); assert.match(g.system, /membatalkan mesyuarat/); assert.match(g.system, /meminta maaf/i); assert.match(g.system, /"changes"/);
  assert.equal(A.paraphrase({ text: 'I like it.', mode: 'grammar' }).lang, 'en');
  assert.match(A.paraphrase({ text: 'I like it.', mode: 'formal', lang: 'ms' }).system, /^Anda penulis/);
  const r = A.parseGrammar('{"text":"Kami meminta maaf.","changes":[{"from":"mengucapkan","to":"meminta","why":"kolokasi"},{"from":"x","to":"x"}]}');
  assert.equal(r.text, 'Kami meminta maaf.'); assert.deepEqual(r.changes, [{ from: 'mengucapkan', to: 'meminta', why: 'kolokasi' }]);
  assert.deepEqual(A.parseGrammar('Plain corrected text.'), { text: 'Plain corrected text.', changes: [] });
});
