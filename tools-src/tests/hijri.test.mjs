// Hijri calendar: Malaysia's takwim (MABIMS criteria) against published JAKIM / federal holiday dates.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const H = require('../../assets/js/hijri-core.js');

test('Month starts match the official Malaysian takwim, 1443H–1449H', () => {
  const firsts = [
    [1445, 1, '2023-07-19'], [1446, 1, '2024-07-07'], [1447, 1, '2025-06-27'], [1448, 1, '2026-06-17'], [1449, 1, '2027-06-06'],
    [1444, 9, '2023-03-23'], [1445, 9, '2024-03-12'], [1446, 9, '2025-03-02'], [1447, 9, '2026-02-19'],
    [1443, 10, '2022-05-03'], [1444, 10, '2023-04-22'], [1445, 10, '2024-04-10'], [1446, 10, '2025-03-31'], [1447, 10, '2026-03-21'], [1448, 10, '2027-03-10']
  ];
  for (const [y, m, iso] of firsts) assert.equal(H.toGregorian(y, m, 1), iso, `1/${m}/${y}`);
  // Aidiladha (10 Zulhijah) and Maulidur Rasul (12 Rabiulawal) holidays.
  for (const [y, iso] of [[1444, '2023-06-29'], [1445, '2024-06-17'], [1446, '2025-06-07'], [1447, '2026-05-27'], [1448, '2027-05-17']]) assert.equal(H.toGregorian(y, 12, 10), iso);
  for (const [y, iso] of [[1445, '2023-09-28'], [1446, '2024-09-16'], [1447, '2025-09-05'], [1449, '2027-08-15']]) assert.equal(H.toGregorian(y, 3, 12), iso);
});

test('Gregorian to Hijri and back', () => {
  assert.deepEqual(H.toHijri('2026-10-14'), { y: 1448, m: 5, d: 3, length: 30 });
  assert.deepEqual(H.toHijri('1979-11-21'), { y: 1400, m: 1, d: 1, length: 30 });
  assert.equal(H.formatHijri(H.toHijri('2027-03-10'), 'ms'), '1 Syawal 1448H');
  assert.equal(H.formatGregorian('2027-03-10', 'ms', true), 'Rabu, 10 Mac 2027');
  for (let n = H.dayNumber('1980-01-01'); n < H.dayNumber('2076-12-31'); n += 37) {
    const iso = new Date(n * 864e5).toISOString().slice(0, 10), h = H.toHijri(iso);
    assert.equal(H.toGregorian(h.y, h.m, h.d), iso);
  }
  assert.equal(H.toHijri('1979-11-20'), null);
  const short = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find(m => H.monthLength(1448, m) === 29);
  assert.equal(H.toGregorian(1448, short, 30), null);
  assert.equal(H.toGregorian(1448, 1, 31), null);
  assert.equal(H.toGregorian(1448, 13, 1), null);
});

test('Every month has 29 or 30 days and a year 354 or 355', () => {
  for (let y = 1400; y <= 1500; y++) {
    let days = 0;
    for (let m = 1; m <= 12; m++) { const l = H.monthLength(y, m); assert(l === 29 || l === 30); days += l; }
    assert(days === 354 || days === 355, `${y}: ${days}`);
  }
});

test('Adding Hijri months and the key dates', () => {
  assert.equal(H.addMonths('2026-10-14', 4), H.toGregorian(1448, 9, 3));
  const e = H.events(1448);
  assert.equal(e.find(x => x.key === 'syawal').date, '2027-03-10');
  assert.equal(e.find(x => x.key === 'adha').date, '2027-05-17');
  assert.equal(H.upcoming('2026-10-14', 1)[0].key, 'israk');
  assert.equal(H.yearTable(1448).length, 12);
});
