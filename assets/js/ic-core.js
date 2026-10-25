/* Malaysian MyKad number decoder (YYMMDD-PB-###G). Place-of-birth (PB) codes are JPN's published Kod Negeri and
   Kod Negara lists (fetched 25 October 2026). Two parts are not published by JPN and are labelled as such on the page:
   the last digit's gender convention (odd = male, even = female, widely observed) and the birth century (YY is
   ambiguous; the most recent valid date is assumed and can be switched). Nothing is stored or sent anywhere. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-25' };
  // Born in Malaysia: state → codes (JPN Kod Negeri).
  var STATES = {
    'Johor': [1, 21, 22, 23, 24], 'Kedah': [2, 25, 26, 27], 'Kelantan': [3, 28, 29], 'Melaka': [4, 30], 'Negeri Sembilan': [5, 31, 59],
    'Pahang': [6, 32, 33], 'Pulau Pinang': [7, 34, 35], 'Perak': [8, 36, 37, 38, 39], 'Perlis': [9, 40], 'Selangor': [10, 41, 42, 43, 44],
    'Terengganu': [11, 45, 46], 'Sabah': [12, 47, 48, 49], 'Sarawak': [13, 50, 51, 52, 53], 'WP Kuala Lumpur': [14, 54, 55, 56, 57],
    'WP Labuan': [15, 58], 'WP Putrajaya': [16]
  };
  // Born outside Malaysia: code → [English, Malay] (JPN Kod Negara; 83–93 are regions, not single countries).
  var ABROAD = {
    60: ['Brunei', 'Brunei'], 61: ['Indonesia', 'Indonesia'], 62: ['Cambodia', 'Kemboja'], 63: ['Laos', 'Laos'], 64: ['Myanmar', 'Myanmar'],
    65: ['Philippines', 'Filipina'], 66: ['Singapore', 'Singapura'], 67: ['Thailand', 'Thailand'], 68: ['Vietnam', 'Vietnam'],
    71: ['Abroad (before country codes were used)', 'Luar negara (sebelum kod negara digunakan)'], 72: ['Abroad (before country codes were used)', 'Luar negara (sebelum kod negara digunakan)'],
    74: ['China', 'China'], 75: ['India', 'India'], 76: ['Pakistan', 'Pakistan'], 77: ['Saudi Arabia', 'Arab Saudi'], 78: ['Sri Lanka', 'Sri Lanka'], 79: ['Bangladesh', 'Bangladesh'],
    82: ['Malaysia, state not known', 'Malaysia, negeri tidak diketahui'],
    83: ['Asia-Pacific (e.g. Australia, New Zealand, Fiji)', 'Asia Pasifik (cth. Australia, New Zealand, Fiji)'], 84: ['South America', 'Amerika Selatan'], 85: ['Africa', 'Afrika'],
    86: ['Europe', 'Eropah'], 87: ['United Kingdom or Ireland', 'United Kingdom atau Ireland'], 88: ['Middle East (e.g. Iran, Turkey, UAE)', 'Timur Tengah (cth. Iran, Turki, UAE)'],
    89: ['Far East (Japan, Korea, Taiwan)', 'Timur Jauh (Jepun, Korea, Taiwan)'], 90: ['Caribbean or Central America (incl. Mexico)', 'Caribbean atau Amerika Tengah (termasuk Mexico)'],
    91: ['North America (USA, Canada)', 'Amerika Utara (AS, Kanada)'], 92: ['Eastern Europe (incl. Russia, Ukraine)', 'Eropah Timur (termasuk Rusia, Ukraine)'],
    93: ['Other countries (e.g. Hong Kong, Nepal, Afghanistan)', 'Negara lain (cth. Hong Kong, Nepal, Afghanistan)'], 98: ['Stateless', 'Tanpa negara'],
    99: ['Refugee, UN organisation or nationality not stated', 'Pelarian, organisasi PBB atau kewarganegaraan tidak dinyatakan']
  };
  var CODE_STATE = {};
  Object.keys(STATES).forEach(function (s) { STATES[s].forEach(function (c) { CODE_STATE[c] = s; }); });

  function place(code, lang) {
    var i = lang === 'ms' ? 1 : 0;
    if (CODE_STATE[code]) return { kind: 'state', name: CODE_STATE[code], malaysia: true };
    if (ABROAD[code]) return { kind: code === 82 ? 'unknown' : (code >= 83 && code <= 93 ? 'region' : 'country'), name: ABROAD[code][i], malaysia: code === 82 };
    return null;
  }
  var leap = function (y) { return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0); };
  function validDate(y, m, d) { return m >= 1 && m <= 12 && d >= 1 && d <= [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }
  function age(y, m, d, today) {
    var t = today.split('-').map(Number), a = t[0] - y;
    if (t[1] < m || (t[1] === m && t[2] < d)) a--;
    return a;
  }

  // Decode one number. today: ISO date; century: '' (auto) | '19' | '20'.
  function decode(raw, lang, today, century) {
    var digits = String(raw || '').replace(/[\s-]/g, '');
    if (!/^\d{12}$/.test(digits)) return { ok: false, error: digits.length && /^\d+$/.test(digits) ? 'length' : (digits ? 'chars' : 'empty'), digits: digits };
    var yy = +digits.slice(0, 2), m = +digits.slice(2, 4), d = +digits.slice(4, 6), pb = +digits.slice(6, 8), last = +digits[11];
    var t = today.split('-').map(Number), options = [1900 + yy, 2000 + yy].filter(function (y) { return validDate(y, m, d) && (y < t[0] || (y === t[0] && (m < t[1] || (m === t[1] && d <= t[2])))); });
    var year = century === '19' ? 1900 + yy : century === '20' ? 2000 + yy : options.length ? Math.max.apply(null, options) : null;
    var dateOk = year !== null && validDate(year, m, d) && options.indexOf(year) >= 0;
    var p = place(pb, lang);
    var iso = dateOk ? year + '-' + ('0' + m).slice(-2) + '-' + ('0' + d).slice(-2) : null;
    return {
      ok: dateOk && !!p, digits: digits, formatted: digits.slice(0, 6) + '-' + digits.slice(6, 8) + '-' + digits.slice(8),
      birth: iso, ambiguous: options.length > 1 && !century, age: dateOk ? age(year, m, d, today) : null,
      pb: pb, place: p, gender: last % 2 ? 'male' : 'female', serial: digits.slice(8, 11),
      error: !validDate(2000 + yy, m, d) && !validDate(1900 + yy, m, d) ? 'date' : !dateOk ? 'future' : !p ? 'code' : null
    };
  }
  // Several numbers, one per line → decoded rows (for a class or staff list); blank lines skipped.
  function decodeMany(text, lang, today) { return String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).slice(0, 1000).map(function (l) { return decode(l, lang, today, ''); }); }
  // Masked form for display: 900101-14-**** keeps the shareable parts and hides the serial.
  function mask(digits) { return digits.length === 12 ? digits.slice(0, 6) + '-' + digits.slice(6, 8) + '-****' : digits; }

  var api = { FACTS: FACTS, STATES: STATES, ABROAD: ABROAD, place: place, decode: decode, decodeMany: decodeMany, mask: mask, validDate: validDate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBIc = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
