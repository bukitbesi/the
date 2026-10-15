/* Sistem Saraan Perkhidmatan Awam (SSPA) salary adjustment for Malaysian civil servants who took the SSPA option
   (Pekeliling Perkhidmatan Bil. 1 and 2 Tahun 2024). Phase 1 from 1 December 2024: Pelaksana and Pengurusan dan
   Profesional 8% of basic salary, at least RM240 (basic up to RM3,000 gets RM240); Pengurusan Tertinggi (JUSA, Gred Utama
   and Gred Khas) 4%. Phase 2 from 1 January 2026: 7% (3% for Pengurusan Tertinggi) of the basic salary as at
   31 December 2025, so it compounds on Phase 1 and any 2025 annual increment. Pensions follow the last-salary group:
   8% / 4% from 1 December 2024 and 7% / 3% from 1 January 2026 (Pensions Adjustment Act 1980). Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = {
    verified: '2026-10-15', floor: 240, gpt: 1500, phase1: '2024-12-01', phase2: '2026-01-01',
    rates: { pelaksana: [0.08, 0.07], pp: [0.08, 0.07], kpt: [0.04, 0.03] },
    grades: [['19/20', '1'], ['21/22/24', '2'], ['25/26', '3'], ['27/28', '4'], ['29/30', '5'], ['31 to 36', '6'], ['36 to 38', '7'], ['39/40', '8'], ['41/42', '9'], ['43/44', '10']]
  };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };

  // mode 'salary': basic salary on 30 November 2024 (+ 2025 annual increment). mode 'pension': monthly pension before 1 December 2024.
  function calculate(input) {
    var group = FACTS.rates[input.group] ? input.group : 'pelaksana', rt = FACTS.rates[group], pension = input.mode === 'pension';
    var base = num(input.basic), kgt = pension ? 0 : num(input.kgt);
    var p1 = cents(base * rt[0]);
    if (!pension && group !== 'kpt') p1 = Math.max(p1, base > 0 ? FACTS.floor : 0);
    var s1 = cents(base + p1), dec2025 = cents(s1 + kgt), p2 = cents(dec2025 * rt[1]), s2 = cents(dec2025 + p2);
    var rise = cents(s2 - base - kgt);
    return { group: group, mode: pension ? 'pension' : 'salary', base: base, kgt: kgt, p1: p1, s1: s1, dec2025: dec2025, p2: p2, s2: s2,
      rise: rise, risePct: base ? rise / base * 100 : 0, yearly: cents(rise * 12), floorUsed: !pension && group !== 'kpt' && base > 0 && base * rt[0] < FACTS.floor };
  }

  var api = { FACTS: FACTS, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBSspa = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
