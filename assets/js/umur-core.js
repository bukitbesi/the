/* Age calculator for Malaysia: exact age in years, months and days, total days, next birthday, age in Hijri years on
   Malaysia's takwim (needs TBBHijri / hijri-core.js), and the legal age milestones: first MyKad at 12 (MyKid before),
   motorcycle learner licence at 16 and car at 17 (JPJ), voting with automatic registration, Dewan Rakyat candidacy and
   the age of majority at 18 (Federal Constitution Art. 119 and 47 as amended by Act A1603; Age of Majority Act 1971),
   tobacco and vape products at 18 (Act 852), alcohol at 21 (Food (Amendment) Regulations 2016), EPF Akaun Sejahtera
   withdrawal once between 50 and 54, Akaun 55 at 55, minimum retirement age and senior citizen at 60 (Minimum
   Retirement Age Act 2012), EPF Akaun Emas at 60. Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = {
    verified: '2026-10-15',
    milestones: [[12, 'mykad'], [16, 'moto'], [17, 'car'], [18, 'adult'], [21, 'alcohol'], [50, 'epf50'], [55, 'epf55'], [60, 'senior']]
  };
  var DAY = 864e5;
  var parse = function (iso) { var p = String(iso || '').split('-').map(Number); return p.length === 3 && p[0] > 1800 && p[1] >= 1 && p[1] <= 12 && p[2] >= 1 && p[2] <= 31 ? p : null; };
  var utc = function (y, m, d) { return Date.UTC(y, m - 1, d); };
  var iso = function (t) { return new Date(t).toISOString().slice(0, 10); };
  var dim = function (y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
  // The same day n years later; 29 February becomes 1 March in a common year.
  function anniversary(b, n) { var y = b[0] + n; return b[1] === 2 && b[2] === 29 && dim(y, 2) === 28 ? iso(utc(y, 3, 1)) : iso(utc(y, b[1], b[2])); }

  // Whole years and months from a to b (the day clamped to the month's length), then the remaining days.
  function diff(a, b) {
    var months = (b[0] - a[0]) * 12 + (b[1] - a[1]);
    var at = function (n) { var y = a[0] + Math.floor((a[1] - 1 + n) / 12), m = (a[1] - 1 + n) % 12 + 1; return utc(y, m, Math.min(a[2], dim(y, m))); };
    var end = utc(b[0], b[1], b[2]);
    if (at(months) > end) months -= 1;
    return { y: Math.floor(months / 12), m: months % 12, d: Math.round((end - at(months)) / DAY) };
  }

  function hijriAge(dob, today, H) {
    if (!H) return null;
    var r = H.range();
    if (dob < r.first || today > r.last) return null;
    var a = H.toHijri(dob), b = H.toHijri(today);
    if (!a || !b) return null;
    var y = b.y - a.y, m = b.m - a.m, d = b.d - a.d;
    if (d < 0) { m -= 1; d += 30; }
    if (m < 0) { y -= 1; m += 12; }
    var next = null;
    for (var hy = b.y; hy <= b.y + 1 && !next; hy++) {
      var g = H.toGregorian(hy, a.m, Math.min(a.d, H.monthLength(hy, a.m)));
      if (g && g >= today) next = g;
    }
    return { y: y, m: m, d: d, birth: a, next: next };
  }

  function calculate(input) {
    var b = parse(input.dob), t = parse(input.today);
    if (!b || !t || utc(b[0], b[1], b[2]) > utc(t[0], t[1], t[2])) return null;
    var dob = iso(utc(b[0], b[1], b[2])), today = iso(utc(t[0], t[1], t[2]));
    var age = diff(b, t), days = Math.round((utc(t[0], t[1], t[2]) - utc(b[0], b[1], b[2])) / DAY);
    var next = anniversary(b, age.y + 1);
    var nextDays = Math.round((Date.parse(next) - Date.parse(today)) / DAY);
    if (age.m === 0 && age.d === 0) { next = today; nextDays = 0; }
    var ms = FACTS.milestones.map(function (x) { var dt = anniversary(b, x[0]); return { age: x[0], key: x[1], date: dt, reached: dt <= today }; });
    return { dob: dob, today: today, years: age.y, months: age.m, days: age.d, totalDays: days, weeks: Math.floor(days / 7), totalMonths: age.y * 12 + age.m,
      weekday: new Date(Date.parse(dob)).getUTCDay(), next: next, nextDays: nextDays, nextAge: nextDays === 0 ? age.y : age.y + 1,
      hijri: hijriAge(dob, today, input.hijri || root.TBBHijri), milestones: ms };
  }

  var api = { FACTS: FACTS, anniversary: anniversary, diff: diff, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBUmur = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
