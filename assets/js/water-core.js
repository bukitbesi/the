/* Domestic water bill (individual meter) by state: block tariff per m3 for 0-20, 20-35 and above 35 m3 a month,
   with the monthly minimum charge. Rates from the operators' tariff tables under SPAN's TSM 2025 review (Selangor,
   KL and Putrajaya from 1 Sep 2025; Johor, Melaka, Kedah and Terengganu from 1 Aug 2025; Kelantan from 10 Sep 2025;
   Penang from 1 Jul 2026). Perak, Negeri Sembilan, Pahang, Perlis, Labuan, Sabah and Sarawak are left out until
   their current tables can be confirmed. Domestic water is exempt from SST. Verified 14 October 2026. */
(function (root) {
  'use strict';
  // [key, name, operator, effective, [band1, band2, band3] RM per m3, minimum RM]
  var STATES = [
    ['selangor', 'Selangor', 'Air Selangor', '2025-09-01', [0.65, 1.62, 3.51], 6.50],
    ['kl', 'Kuala Lumpur', 'Air Selangor', '2025-09-01', [0.65, 1.62, 3.51], 6.50],
    ['putrajaya', 'Putrajaya', 'Air Selangor', '2025-09-01', [0.65, 1.62, 3.51], 6.50],
    ['johor', 'Johor', 'Ranhill SAJ', '2025-08-01', [1.05, 2.35, 3.50], 10.50],
    ['penang', 'Pulau Pinang', 'PBAPP', '2026-07-01', [0.65, 1.30, 2.21], 6.50],
    ['melaka', 'Melaka', 'SAMB', '2025-08-01', [0.94, 1.69, 2.26], 9.40],
    ['kedah', 'Kedah', 'SADA', '2025-08-01', [0.81, 1.48, 2.00], 8.10],
    ['kelantan', 'Kelantan', 'Air Kelantan', '2025-09-10', [0.80, 1.55, 2.10], 8.00],
    ['terengganu', 'Terengganu', 'SATU', '2025-08-01', [0.66, 1.69, 2.25], 6.60]
  ];
  var FACTS = { verified: '2026-10-14', bands: [20, 35], sst: 0, left: ['Perak', 'Negeri Sembilan', 'Pahang', 'Perlis', 'Labuan', 'Sabah', 'Sarawak'] };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var find = function (k) { for (var i = 0; i < STATES.length; i++) if (STATES[i][0] === k) return STATES[i]; return STATES[0]; };
  var name = function (k, lang) { var s = find(k); return lang === 'en' && k === 'penang' ? 'Penang' : s[1]; };

  function calculate(input) {
    var s = find(input.state), m3 = Math.max(0, Number(input.m3) || 0), r = s[4], b = FACTS.bands;
    var parts = [Math.min(m3, b[0]), Math.max(0, Math.min(m3, b[1]) - b[0]), Math.max(0, m3 - b[1])];
    var lines = parts.map(function (q, i) { return { m3: cents(q), rate: r[i], amount: cents(q * r[i]) }; });
    var usage = cents(lines[0].amount + lines[1].amount + lines[2].amount), total = Math.max(usage, s[5]);
    return {
      state: s[0], operator: s[2], effective: s[3], rates: r, minimum: s[5], m3: m3, lines: lines, usage: usage, total: cents(total),
      minApplied: usage < s[5], perM3: m3 ? total / m3 : 0, litres: Math.round(m3 * 1000), daily: cents(m3 * 1000 / 30)
    };
  }

  var api = { FACTS: FACTS, STATES: STATES, calculate: calculate, name: name };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBWater = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
