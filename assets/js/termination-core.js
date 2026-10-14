/* Termination under the Employment Act 1955: notice of 4 weeks (under 2 years' service), 6 weeks (2 to under 5) or
   8 weeks (5 years or more) unless the contract gives more (s.12(2)), with indemnity in lieu at the weekly wage
   (monthly x 12 / 52); and the minimum termination or lay-off benefit under the Employment (Termination and Lay-Off
   Benefits) Regulations 1980 for employees with 12 months' continuous service: 10 days' wages for each year of
   service under 2 years, 15 days for 2 to under 5 years, 20 days for 5 years or more, an incomplete year pro rata to
   the nearest month, at the ordinary rate of pay (monthly wages / 26). Not guaranteed to non-manual employees
   earning above RM4,000 a month. Verified 14 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-14', notice: [4, 6, 8], days: [10, 15, 20], minMonths: 12, threshold: 4000, orpDays: 26 };
  var parse = function (s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? [+m[1], +m[2], +m[3]] : null; };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var tier = function (years) { return years < 2 ? 0 : years < 5 ? 1 : 2; };

  // Completed months of service, and months rounded to the nearest month (a part month of 15 days or more counts).
  function service(a, b) {
    var m = (b[0] - a[0]) * 12 + (b[1] - a[1]), d = b[2] - a[2] + 1, dim = new Date(Date.UTC(b[0], b[1], 0)).getUTCDate();
    if (d < 0) { m--; d += new Date(Date.UTC(b[0], b[1] - 1, 0)).getUTCDate(); }
    if (d >= dim) { m++; d = 0; }
    return { months: Math.max(0, m), rounded: Math.max(0, m + (d >= 15 ? 1 : 0)) };
  }

  function calculate(input) {
    var a = parse(input.start), b = parse(input.end);
    if (!a || !b) return null;
    var s = service(a, b), yrs = Math.floor(s.months / 12), t = tier(yrs), wage = Math.max(0, Number(input.wage) || 0);
    var covered = wage <= FACTS.threshold || input.manual === 'yes', eligible = covered && s.months >= FACTS.minMonths && input.reason !== 'resign';
    var notice = Math.max(FACTS.notice[t], Math.floor(Number(input.contract) || 0)), weekly = wage * 12 / 52, orp = wage / FACTS.orpDays;
    var benefitYears = s.rounded / 12, benefitDays = eligible ? FACTS.days[t] * benefitYears : 0;
    return {
      months: s.months, years: yrs, rounded: s.rounded, tier: t, notice: notice, statutoryNotice: FACTS.notice[t], weekly: cents(weekly),
      inLieu: cents(weekly * notice), orp: cents(orp), daysPerYear: FACTS.days[t], benefitYears: benefitYears, benefitDays: Math.round(benefitDays * 100) / 100,
      benefit: cents(benefitDays * orp), eligible: eligible, covered: covered, resign: input.reason === 'resign', shortService: s.months < FACTS.minMonths
    };
  }

  var api = { FACTS: FACTS, calculate: calculate, service: service };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBTermination = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
