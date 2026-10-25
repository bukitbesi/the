// Typing test: 5-character words, gross/net WPM, accuracy and the generated texts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../../assets/js/typing-core.js');

test('250 characters in one minute is 50 gross WPM; 3 uncorrected errors make 47 net WPM', () => {
  const target = 'a'.repeat(250), typed = 'a'.repeat(247) + 'bbb';
  const r = T.score({ target, typed, ms: 60000, keystrokes: 260, mistakes: 13 });
  assert.equal(r.gross, 50); assert.equal(r.errors, 3); assert.equal(r.net, 47);
  assert.equal(r.accuracy, 0.95); assert.equal(r.cpm, 247);
});

test('30-second test: 150 characters with no errors is 60 WPM; extra characters count as errors', () => {
  const r = T.score({ target: 'x'.repeat(150), typed: 'x'.repeat(150), ms: 30000 });
  assert.equal(r.gross, 60); assert.equal(r.net, 60); assert.equal(r.accuracy, 1);
  const over = T.score({ target: 'ab', typed: 'abcd', ms: 60000 });
  assert.equal(over.errors, 2);
  assert.equal(T.score({ target: 'abc', typed: 'xyz', ms: 6000 }).net, 0);
});

test('bands and weak keys', () => {
  assert.equal(T.band(10), 'beginner'); assert.equal(T.band(41), 'average'); assert.equal(T.band(85), 'very fast'); assert.equal(T.band(120), 'expert');
  assert.deepEqual(T.weakKeys({ e: 2, a: 5, t: 2 }, 2), [['a', 5], ['e', 2]]);
});

test('texts are deterministic per seed, long enough and in the right language', () => {
  for (const lang of ['en', 'ms']) for (const mode of ['words', 'sentences', 'numbers']) {
    const a = T.generate({ lang, mode, secs: 60, seed: 7 }), b = T.generate({ lang, mode, secs: 60, seed: 7 });
    assert.equal(a, b); assert.ok(a.length >= 1100, lang + mode + a.length);
    assert.ok(!/\s{2}/.test(a)); assert.ok(!/^\s|\s$/.test(a));
  }
  assert.ok(T.generate({ lang: 'ms', mode: 'words', seed: 3 }).split(' ').every(w => T.WORDS.ms.includes(w)));
  assert.ok(/\d/.test(T.generate({ lang: 'en', mode: 'numbers', seed: 3 })));
  assert.notEqual(T.generate({ seed: 1 }), T.generate({ seed: 2 }));
});
