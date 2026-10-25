// MyKad decoder: JPN place-of-birth codes, dates, century choice, gender digit and validation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../../assets/js/ic-core.js');
const T = '2026-10-25';

test('every state code from JPN Kod Negeri maps to its state; 82 is Malaysia, state unknown', () => {
  const all = Object.values(C.STATES).flat();
  assert.equal(all.length, 55); assert.equal(new Set(all).size, 55);
  assert.equal(C.place(14, 'en').name, 'WP Kuala Lumpur'); assert.equal(C.place(59, 'en').name, 'Negeri Sembilan'); assert.equal(C.place(16, 'en').name, 'WP Putrajaya');
  assert.equal(C.place(82, 'ms').kind, 'unknown'); assert.equal(C.place(74, 'ms').name, 'China'); assert.equal(C.place(86, 'en').kind, 'region');
  for (const c of [0, 17, 20, 69, 70, 73, 80, 81, 94, 97]) assert.equal(C.place(c, 'en'), null, String(c));
});

test('decode: date of birth, age, place and gender digit', () => {
  const r = C.decode('900101-14-5679', 'en', T, '');
  assert.equal(r.ok, true); assert.equal(r.birth, '1990-01-01'); assert.equal(r.age, 36); assert.equal(r.place.name, 'WP Kuala Lumpur'); assert.equal(r.gender, 'male');
  assert.equal(C.decode('050615 10 1234', 'ms', T, '').birth, '2005-06-15');
  assert.equal(C.decode('050615101234', 'ms', T, '').gender, 'female');
  assert.equal(C.decode('950229-01-5555', 'en', T, '').error, 'date');
  assert.equal(C.decode('961231-20-5555', 'en', T, '').error, 'code');
  assert.equal(C.decode('12345', 'en', T, '').error, 'length'); assert.equal(C.decode('ABC', 'en', T, '').error, 'chars');
});

test('century: future 20YY means 19YY; both possible is flagged and can be switched', () => {
  assert.equal(C.decode('300101-01-1111', 'en', T, '').birth, '1930-01-01');
  const amb = C.decode('250101-01-1111', 'en', T, '');
  assert.equal(amb.birth, '2025-01-01'); assert.equal(amb.ambiguous, true); assert.equal(amb.age, 1);
  assert.equal(C.decode('250101-01-1111', 'en', T, '19').birth, '1925-01-01');
  assert.equal(C.decode('000229-01-1111', 'en', T, '').birth, '2000-02-29');
  assert.equal(C.decode('261231-01-1111', 'en', T, '20').error, 'future');
});

test('many numbers at once, masking', () => {
  const rows = C.decodeMany('900101145679\n\n050615101234\nbad', 'en', T);
  assert.equal(rows.length, 3); assert.equal(rows[2].ok, false);
  assert.equal(C.mask('900101145679'), '900101-14-****');
});
