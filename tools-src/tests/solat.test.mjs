// Waktu solat: JAKIM timetable files, next prayer and countdown, current prayer, zone from GPS, typo repair.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const S = require('../../assets/js/solat-core.js');
const H = require('../../assets/js/hijri-core.js');
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../assets/solat');
const load = (y, z) => S.decodeYear(fs.readFileSync(path.join(dir, String(y), z + '.json'), 'utf8'));
const hm = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

test('Kuala Lumpur on 1 October 2026 matches JAKIM e-Solat', () => {
  const t = S.day(load(2026, 'WLY01'), '2026-10-01');
  assert.deepEqual(t.map(S.hhmm), ['05:43', '05:53', '07:00', '07:25', '13:06', '16:16', '19:07', '20:16']);
  assert.equal(H.formatHijri(H.toHijri('2026-10-01'), 'ms'), '19 Rabiulakhir 1448H');
});

test('Next prayer and countdown, including after Isyak', () => {
  const d = load(2026, 'WLY01'), today = S.day(d, '2026-10-01'), tomorrow = S.day(d, '2026-10-02');
  assert.deepEqual(S.next(today, tomorrow, hm('12:00')), { i: 4, at: hm('13:06'), tomorrow: false, mins: 66 });
  assert.deepEqual(S.next(today, tomorrow, hm('13:06')), { i: 5, at: hm('16:16'), tomorrow: false, mins: 190 });
  const night = S.next(today, tomorrow, hm('21:00'));
  assert.equal(night.i, 1);
  assert.equal(night.tomorrow, true);
  assert.equal(night.mins, hm('05:53') + 1440 - hm('21:00'));
  assert.equal(S.next(today, null, hm('21:00')), null);
  assert.equal(S.duration(66, 'en'), '1 h 6 min');
  assert.equal(S.duration(66, 'ms'), '1 j 6 min');
  assert.equal(S.duration(9, 'ms'), '9 min');
});

test('Current prayer: Subuh until syuruk, none until Zohor, Isyak until Subuh', () => {
  const t = S.day(load(2026, 'WLY01'), '2026-10-01');
  assert.equal(S.current(t, hm('04:30')), 7);
  assert.equal(S.current(t, hm('06:00')), 1);
  assert.equal(S.current(t, hm('08:00')), -1);
  assert.equal(S.current(t, hm('13:06')), 4);
  assert.equal(S.current(t, hm('19:30')), 6);
  assert.equal(S.current(t, hm('23:00')), 7);
});

test('12- and 24-hour clock', () => {
  assert.equal(S.time(hm('13:06'), false), '1:06 PM');
  assert.equal(S.time(hm('05:53'), false), '5:53 AM');
  assert.equal(S.time(hm('12:00'), false), '12:00 PM');
  assert.equal(S.time(hm('00:30'), false), '12:30 AM');
  assert.equal(S.time(hm('05:53'), true), '05:53');
});

test('Malaysia time is UTC+8 with no daylight saving', () => {
  assert.deepEqual(S.myt(Date.UTC(2026, 9, 1, 16, 30, 15)), { iso: '2026-10-02', minute: 30, second: 15 });
  assert.equal(S.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(S.daysInYear(2028), 366);
});

test('Use my location: the nearest district gives the JAKIM zone', () => {
  const zone = (lat, lon) => S.nearest(lat, lon).zone;
  assert.equal(zone(3.139, 101.687), 'WLY01'); // Kuala Lumpur
  assert.equal(zone(3.073, 101.519), 'SGR01'); // Shah Alam
  assert.equal(zone(3.044, 101.445), 'SGR03'); // Klang
  assert.equal(zone(4.597, 101.090), 'PRK02'); // Ipoh, in Kinta district
  assert.equal(zone(5.125, 100.490), 'PRK06'); // Parit Buntar, in Kerian district
  assert.equal(zone(4.026, 101.019), 'PRK05'); // Teluk Intan, in Hilir Perak district
  assert.equal(zone(2.807, 103.486), 'PHG07'); // Kuala Rompin
  assert.equal(zone(3.808, 103.326), 'PHG02'); // Kuantan
  assert.equal(zone(1.493, 103.741), 'JHR02'); // Johor Bahru
  assert.equal(zone(5.414, 100.329), 'PNG01'); // George Town
  assert.equal(zone(5.980, 116.074), 'SBH07'); // Kota Kinabalu
  assert.equal(zone(1.554, 110.359), 'SWK08'); // Kuching
  assert.equal(S.nearest(13.756, 100.502), null); // Bangkok
  assert(S.PLACES.every(p => S.zone(p[2])), 'Every district points to a real zone');
});

test("Repairs JAKIM's typos and keeps Perlis's imsak at Subuh", () => {
  const imsak = [hm('15:20'), hm('05:04'), hm('06:13'), hm('06:41'), hm('12:20'), hm('15:20'), hm('18:25'), hm('19:34')];
  assert.deepEqual(S.tidy(imsak), ['imsak 15:20 → 04:54']);
  assert.equal(S.ordered(imsak), true);
  const maghrib = [hm('04:41'), hm('04:51'), hm('06:03'), hm('06:28'), hm('12:18'), hm('15:40'), hm('06:28'), hm('19:42')];
  assert.deepEqual(S.tidy(maghrib), ['maghrib 06:28 → 18:28']);
  assert.equal(S.ordered(maghrib), true);
  const perlis = S.day(load(2026, 'PLS01'), '2026-10-01');
  assert.equal(perlis[0], perlis[1]);
  assert.deepEqual(S.tidy(perlis.slice()), []);
});

test('Every zone has a complete, ordered 2026 timetable', () => {
  assert.equal(S.ZONES.length, 60);
  for (const [z] of S.ZONES) {
    const d = load(2026, z);
    assert(d && d.zone === z && d.year === 2026, z);
    for (const t of d.t) assert(S.ordered(t), `${z} out of order`);
  }
  // Imsak is 10 minutes before Subuh in Kuala Lumpur every day of the year.
  assert(load(2026, 'WLY01').t.every(t => t[1] - t[0] === 10));
});

test('Maghrib in SBH03 is 72 to 78 minutes earlier than Langkawi all year', () => {
  const a = load(2026, 'SBH03'), b = load(2026, 'KDH06');
  const gaps = a.t.map((t, i) => b.t[i][6] - t[6]);
  assert.equal(Math.min(...gaps), 72);
  assert.equal(Math.max(...gaps), 78);
});

test('State pages cover all 60 zones exactly once', async () => {
  const { solatStates, statePages } = await import('../solat-states.mjs');
  const zones = solatStates.flatMap(st => st.zones).sort();
  assert.deepEqual(zones, S.ZONES.map(z => z[0]).sort());
  for (const st of solatStates) assert(st.zones.includes(st.main), `${st.bm} main zone`);
  const pages = statePages('2026-10-18', '2026-10-18');
  assert.equal(pages.length, 30);
  for (const p of pages) {
    assert(p.title.length <= 70, `${p.path} title ${p.title.length}`);
    assert(p.description.length <= 160, `${p.path} description ${p.description.length}`);
  }
});
