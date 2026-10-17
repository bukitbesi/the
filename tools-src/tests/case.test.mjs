// Case Converter core: text cases keep acronyms, title case follows AP small-word rules, developer cases split
// words at punctuation and camelCase humps and convert each line.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../../assets/js/case-core.js');
const all = (t, o) => Object.fromEntries(C.CASES.map(c => [c.key, C.convert(t, c.key, o)]));

test('Sentence case keeps acronyms and capitalises after full stops and line breaks', () => {
  assert.equal(C.sentence('hello WORLD. how ARE you? i am fine\nnew LINE about SEO and KWSP.'), 'Hello WORLD. How ARE you? I am fine\nNew LINE about SEO and KWSP.');
  assert.equal(C.sentence('THIS IS ALL CAPS. REALLY.'), 'This is all caps. Really.');
  assert.equal(C.sentence('use SEO tools', { keepAcronyms: false }), 'Use seo tools');
  assert.equal(C.sentence("i'm here. it's 3.5 km"), "I'm here. It's 3.5 km");
});

test('Title case follows AP small-word rules', () => {
  assert.equal(C.title('how to calculate EPF contribution in malaysia: a step-by-step guide for 2026'), 'How to Calculate EPF Contribution in Malaysia: A Step-by-Step Guide for 2026');
  assert.equal(C.title('the lord of the rings'), 'The Lord of the Rings');
  assert.equal(C.title('what are you looking for'), 'What Are You Looking For');
  assert.equal(C.title('WAR AND PEACE'), 'War and Peace');
  assert.equal(C.title('a tale\nof two cities'), 'A Tale\nOf Two Cities');
  assert.equal(C.title('nasi lemak with sambal from the east coast'), 'Nasi Lemak With Sambal From the East Coast');
});

test('Other text cases', () => {
  const r = all('Hello World');
  assert.deepEqual([r.upper, r.lower, r.each, r.alt, r.inverse], ['HELLO WORLD', 'hello world', 'Hello World', 'hElLo WoRlD', 'hELLO wORLD']);
  assert.equal(C.convert("don't STOP me now", 'each'), "Don't STOP Me Now");
  assert.equal(C.convert('ÉCOLE ß', 'lower'), 'école ß');
});

test('Developer cases', () => {
  const r = all('User profile ID, version 2');
  assert.deepEqual([r.camel, r.pascal, r.snake, r.constant, r.kebab, r.train, r.dot, r.path, r.slug], ['userProfileIdVersion2', 'UserProfileIdVersion2',
    'user_profile_id_version_2', 'USER_PROFILE_ID_VERSION_2', 'user-profile-id-version-2', 'User-Profile-Id-Version-2', 'user.profile.id.version.2', 'user/profile/id/version/2', 'user-profile-id-version-2']);
  assert.deepEqual(C.split('XMLHttpRequest getUserID2fa'), ['XML', 'Http', 'Request', 'get', 'User', 'ID2fa']);
  assert.equal(C.convert('firstName\nlast_name\nDate-Of-Birth', 'snake'), 'first_name\nlast_name\ndate_of_birth');
  assert.equal(C.convert("Kuih Raya & Café Menu 2026!", 'slug'), 'kuih-raya-and-cafe-menu-2026');
  assert.equal(C.convert('---', 'camel'), '');
});

test('Clean, counts and views', () => {
  assert.equal(C.clean('  too   many\tspaces  \n\n\n\nnext  '), 'too many spaces\n\nnext');
  assert.deepEqual(C.counts('Hi 😀 there\nok'), { chars: 13, words: 3, lines: 2 });
  assert.equal(C.views.countsText(C.counts('one')), '3 characters, 1 word, 1 line');
  assert.match(C.views.devRows('a b'), /<code>a_b<\/code>/);
  assert.equal(C.SMALL.every(w => w.length <= 3), true);
  assert.match(C.FACTS.verified, /^\d{4}-\d{2}-\d{2}$/);
});
