/* Retirement age and date in Malaysia: minimum retirement age 60 for private-sector employees (Minimum Retirement Age
   Act 2012), compulsory retirement 60 for civil servants (optional from 40 with 10 years' service), EPF milestones
   (50, 55, 60, contributions until 75) and, for pensionable civil servants, the pension (1/600 x months of service up
   to 360 x final basic salary, at most 60%, at least RM1,000 with 300 months or more) and gratuity (7.5% x months of service x final basic salary).
   Verified 14 October 2026. */
(function (root) {
  'use strict';
  var FACTS = {
    verified: '2026-10-14', minAge: 60, govAge: 60, optionalFrom: 40, minService: 120, pensionCap: 360, pensionDiv: 600,
    pensionMax: 0.6, minPension: 1000, minMonths: 300, gratuity: 0.075, epf: [50, 55, 60, 75]
  };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var parse = function (s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? [+m[1], +m[2], +m[3]] : null; };
  var iso = function (y, m, d) { var t = new Date(Date.UTC(y, m - 1, d)); return t.toISOString().slice(0, 10); };
  // Birthday at a given age; 29 February falls on 28 February in non-leap years.
  var birthday = function (b, age) { var y = b[0] + age, d = b[2]; if (b[1] === 2 && d === 29 && !(y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0))) d = 28; return iso(y, b[1], d); };

  // Whole years, months and days from a to b (a <= b).
  function diff(a, b) {
    var y = b[0] - a[0], m = b[1] - a[1], d = b[2] - a[2];
    if (d < 0) { m--; d += new Date(Date.UTC(b[0], b[1] - 1, 0)).getUTCDate(); }
    if (m < 0) { y--; m += 12; }
    return { years: y, months: m, days: d, totalMonths: y * 12 + m };
  }
  var cmp = function (a, b) { return (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]); };

  function calculate(input) {
    var b = parse(input.dob), today = parse(input.today) || parse(FACTS.verified);
    if (!b) return null;
    var gov = input.sector === 'gov', age = Math.round(Number(input.age) || FACTS.minAge);
    age = Math.min(75, Math.max(gov ? FACTS.optionalFrom : 40, age));
    if (gov) age = Math.min(age, FACTS.govAge);
    var date = birthday(b, age), d = parse(date);
    var r = { sector: gov ? 'gov' : 'private', age: age, date: date, dayOfWeek: new Date(date + 'T00:00:00Z').getUTCDay(), early: age < FACTS.minAge };
    r.ageNow = cmp(today, b) >= 0 ? diff(b, today) : null;
    r.past = cmp(today, d) >= 0;
    r.left = r.past ? null : diff(today, d);
    r.milestones = FACTS.epf.map(function (a) { var x = birthday(b, a); return { age: a, date: x, past: cmp(today, parse(x)) >= 0 }; });
    if (gov) {
      var s = parse(input.start), salary = Math.max(0, Number(input.salary) || 0);
      if (s && cmp(s, d) < 0) {
        var svc = diff(s, d), months = svc.totalMonths, eligible = months >= FACTS.minService;
        var pm = Math.min(months, FACTS.pensionCap);
        r.service = svc;
        r.eligible = eligible;
        r.pension = eligible ? cents(Math.min(pm / FACTS.pensionDiv, FACTS.pensionMax) * salary) : 0;
        if (eligible && months >= FACTS.minMonths && r.pension < FACTS.minPension) r.pension = FACTS.minPension;
        r.pensionPct = eligible ? Math.min(pm / FACTS.pensionDiv, FACTS.pensionMax) * 100 : 0;
        r.gratuity = eligible ? cents(FACTS.gratuity * months * salary) : 0;
        r.salary = salary;
        r.optionalOk = age >= FACTS.optionalFrom && eligible;
      }
    }
    return r;
  }

  var api = { FACTS: FACTS, calculate: calculate, diff: diff, birthday: birthday };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBRetire = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
