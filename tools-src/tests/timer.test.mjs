// Timer, stopwatch and Pomodoro: parsing, formatting, laps and plans.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../../assets/js/timer-core.js');

test('parse accepts seconds, clock formats and units in English and Malay', () => {
  assert.equal(T.parse('90'), 90000); assert.equal(T.parse('1:30'), 90000); assert.equal(T.parse('01:02:03'), 3723000);
  assert.equal(T.parse('5m'), 300000); assert.equal(T.parse('1h30m'), 5400000); assert.equal(T.parse('2 min 30 s'), 150000);
  assert.equal(T.parse('1,5 jam'), 5400000); assert.equal(T.parse('10 minit'), 600000); assert.equal(T.parse('45 saat'), 45000);
  assert.ok(Number.isNaN(T.parse('abc'))); assert.ok(Number.isNaN(T.parse(''))); assert.ok(Number.isNaN(T.parse('5 apples')));
});

test('format and countdown rounding', () => {
  assert.equal(T.format(0), '00:00'); assert.equal(T.format(65000), '01:05'); assert.equal(T.format(3723000), '1:02:03');
  assert.equal(T.format(83456, true), '01:23.45');
  assert.equal(T.countdownText(1), '00:01'); assert.equal(T.countdownText(299001), '05:00'); assert.equal(T.countdownText(0), '00:00');
  assert.equal(T.remaining(1000, 1500), 0); assert.equal(T.remaining(5000, 1500), 3500);
});

test('laps: splits, best and worst, CSV', () => {
  const l = T.laps([60000, 115000, 185000]);
  assert.deepEqual(l.map(x => x.split), [60000, 55000, 70000]);
  assert.ok(l[1].best && l[2].worst && !l[0].best && !l[0].worst);
  assert.equal(T.lapsCsv(l).split('\n')[2], '2,00:55.00,01:55.00');
});

test('Pomodoro: 4 blocks is 25+5+25+5+25+5+25 = 115 minutes; a long break after the 4th of 8', () => {
  const p = T.pomodoro(4);
  assert.deepEqual(p.map(x => x.kind), ['focus', 'short', 'focus', 'short', 'focus', 'short', 'focus']);
  assert.equal(T.planMinutes(p), 115);
  assert.equal(T.pomodoro(8)[7].kind, 'long'); assert.equal(T.planMinutes(T.pomodoro(8)), 8 * 25 + 6 * 5 + 20);
});
