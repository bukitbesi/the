/* EPF (KWSP) savings projection. Contributions come from the salary core's Third Schedule bands;
   dividends follow EPF's method of earning on balances through the year and crediting at year end.
   Facts last verified 12 October 2026. */
(function (root) {
  'use strict';
  var S = root.TBBSalary || (typeof require === 'function' ? require('./salary-core.js') : null);

  var DIVIDENDS = [
    [2016, 5.70, null], [2017, 6.90, 6.40], [2018, 6.15, 5.90], [2019, 5.45, 5.00], [2020, 5.20, 4.90],
    [2021, 6.10, 5.65], [2022, 5.35, 4.75], [2023, 5.50, 5.40], [2024, 6.30, 6.30], [2025, 6.15, 6.15]
  ];
  var avg = function (col) {
    var v = DIVIDENDS.map(function (d) { return d[col]; }).filter(function (x) { return x != null; });
    return Math.round(v.reduce(function (s, x) { return s + x; }, 0) / v.length * 100) / 100;
  };
  var FACTS = {
    verified: '2026-10-12',
    latestYear: 2025, latest: 6.15, average10: avg(1), averageShariah: avg(2),
    split: { persaraan: 0.75, sejahtera: 0.15, fleksibel: 0.10 },
    // Retirement Income Adequacy benchmarks at age 60 (basic phases in: 2026 RM290k, 2027 RM340k, 2028 RM390k).
    ria: { basic: 390000, adequate: 650000, enhanced: 1300000, basicByYear: { 2026: 290000, 2027: 340000, 2028: 390000 } }
  };

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, d) { v = Number(v); return isFinite(v) && v >= 0 ? v : (d || 0); };

  // Monthly contributions for a wage, using the statutory rates unless the member chose a higher own rate.
  function monthly(wage, ownRate) {
    if (!(wage > 0)) return { employee: 0, employer: 0 };
    var e = S.epf(wage, false);
    var employee = ownRate > 0.11 ? Math.ceil(wage * ownRate) : e.employee;
    return { employee: employee, employer: e.employer };
  }

  function project(input) {
    var age = Math.floor(num(input.age, 30));
    var retire = Math.min(60, Math.max(age + 1, Math.floor(num(input.retireAge, 60))));
    var rate = num(input.dividend, FACTS.average10) / 100;
    var raise = num(input.raise, 3) / 100;
    var ownRate = num(input.ownRate, 11) / 100;
    var topUp = num(input.topUp);
    var inflation = num(input.inflation) / 100;
    var wage = num(input.salary);
    var acc = {
      persaraan: num(input.persaraan),
      sejahtera: num(input.sejahtera),
      fleksibel: num(input.fleksibel)
    };
    var startBalance = acc.persaraan + acc.sejahtera + acc.fleksibel;
    var years = [], totals = { employee: 0, employer: 0, topUp: 0, dividend: 0 };
    for (var a = age; a < retire; a++) {
      var c = monthly(wage, ownRate);
      var perMonth = c.employee + c.employer + topUp;
      var dividend = 0, contributed = 0;
      // Opening balances earn the full year; each month's contribution earns for the months left after it.
      var opening = acc.persaraan + acc.sejahtera + acc.fleksibel;
      dividend += opening * rate;
      for (var m = 1; m <= 12; m++) {
        contributed += perMonth;
        dividend += perMonth * rate * (12 - m) / 12;
      }
      // New money and its dividend are split 75/15/10; existing balances earn their own dividend.
      ['persaraan', 'sejahtera', 'fleksibel'].forEach(function (k) {
        var own = acc[k] * rate;
        var share = FACTS.split[k];
        acc[k] += own + (contributed + (dividend - opening * rate)) * share;
      });
      totals.employee += c.employee * 12; totals.employer += c.employer * 12; totals.topUp += topUp * 12; totals.dividend += dividend;
      years.push({ age: a + 1, salary: cents(wage), employee: cents(c.employee * 12), employer: cents(c.employer * 12),
        topUp: cents(topUp * 12), dividend: cents(dividend), balance: cents(acc.persaraan + acc.sejahtera + acc.fleksibel) });
      wage = wage * (1 + raise);
    }
    var final = cents(acc.persaraan + acc.sejahtera + acc.fleksibel);
    // EPF's benchmarks are in today's prices, so compare the inflation-adjusted value.
    var real = cents(final / Math.pow(1 + inflation, retire - age));
    var tier = real >= FACTS.ria.enhanced ? 'enhanced' : real >= FACTS.ria.adequate ? 'adequate' : real >= FACTS.ria.basic ? 'basic' : 'below';
    return {
      age: age, retireAge: retire, rate: rate, years: years, start: cents(startBalance), final: final, real: real, inflation: inflation,
      accounts: { persaraan: cents(acc.persaraan), sejahtera: cents(acc.sejahtera), fleksibel: cents(acc.fleksibel) },
      totals: { employee: cents(totals.employee), employer: cents(totals.employer), topUp: cents(totals.topUp), dividend: cents(totals.dividend) },
      firstYearDividend: years.length ? years[0].dividend : 0,
      monthlyFor20Years: cents(final / 240), realMonthlyFor20Years: cents(real / 240),
      tier: tier, gapToBasic: cents(Math.max(0, FACTS.ria.basic - real))
    };
  }

  // Dividend on a balance held for the whole year.
  function dividendOn(balance, ratePct) { return cents(num(balance) * num(ratePct) / 100); }

  var api = { FACTS: FACTS, DIVIDENDS: DIVIDENDS, monthly: monthly, project: project, dividendOn: dividendOn };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBEpf = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
