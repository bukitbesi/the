/* PERKESO Employment Insurance System (LINDUNG KERJAYA) after losing a job: Job Search Allowance of 80%, 50%, 40%,
   40%, 30% and 30% of the assumed monthly wage for months 1 to 6 (3 to 6 months by your contributions; at least 12
   contributions in the 24 months before), wages counted up to the RM6,000 insured ceiling; Early Re-employment
   Allowance of 50% of the unpaid allowance for job loss from 1 October 2026 (25% before); a new RM1,000 mobility
   allowance; training fees up to RM7,000 with RM30 a day (Employment Insurance System (Amendment) Act 2026).
   Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-15', rates: [0.8, 0.5, 0.4, 0.4, 0.3, 0.3], ceiling: 6000, newFrom: '2026-10-01',
    era: { before: 0.25, after: 0.5 }, mobility: 1000, training: { before: 4000, after: 7000 }, trainingDay: 30, claimDays: 60, minContrib: 12 };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };

  function calculate(input) {
    var wage = Math.min(FACTS.ceiling, num(input.wage)), months = Math.min(6, Math.max(3, Math.round(num(input.months) || 6)));
    var after = input.lossAfter !== 'no', job = Math.round(Number(input.newJob) || 0);
    var schedule = FACTS.rates.slice(0, months).map(function (r, i) { return { month: i + 1, rate: r * 100, amount: cents(wage * r) }; });
    var total = cents(schedule.reduce(function (s, x) { return s + x.amount; }, 0));
    var r = { wage: wage, capped: num(input.wage) > FACTS.ceiling, months: months, schedule: schedule, total: total, after: after };
    if (job > 0 && job < months) {
      var paid = cents(schedule.slice(0, job).reduce(function (s, x) { return s + x.amount; }, 0)), unpaid = cents(total - paid);
      r.newJob = job; r.paid = paid; r.unpaid = unpaid; r.era = cents(unpaid * (after ? FACTS.era.after : FACTS.era.before)); r.received = cents(paid + r.era);
    }
    r.mobility = after && input.far === 'yes' ? FACTS.mobility : 0;
    r.trainingCap = after ? FACTS.training.after : FACTS.training.before;
    return r;
  }

  var api = { FACTS: FACTS, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBEis = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
