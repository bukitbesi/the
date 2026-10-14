/* Freelance rate for Malaysia: the yearly revenue a freelancer must bill to take home a target income after business
   expenses, EPF (i-Saraan or voluntary, a % of profit), a SOCSO self-employment (SKSPS) plan if any (not deducted for tax here) and resident income tax
   (YA2026 rates from TBBSalary with self relief RM9,000 and EPF relief up to RM4,000), spread over billable hours
   (weeks worked x hours a week). Verified 14 October 2026. */
(function (root) {
  'use strict';
  var S = typeof module === 'object' && module.exports ? require('./salary-core.js') : root.TBBSalary;
  var FACTS = { verified: '2026-10-14', self: 9000, epfCap: 4000, hoursDay: 8 };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, max) { v = Number(v); return isFinite(v) && v > 0 ? Math.min(v, max || Infinity) : 0; };

  // From yearly profit (revenue minus expenses) to take-home, tax and EPF.
  function fromProfit(profit, epfPct, socso, relief) {
    var epf = cents(profit * epfPct), chargeable = cents(Math.max(0, profit - FACTS.self - Math.min(epf, FACTS.epfCap) - relief));
    var tax = S.annualTax(chargeable);
    return { profit: profit, epf: epf, chargeable: chargeable, tax: tax, net: cents(profit - epf - socso - tax) };
  }

  function calculate(input) {
    var target = num(input.target) * 12, expenses = num(input.expenses) * 12, epfPct = num(input.epf, 100) / 100;
    var socso = num(input.socso) * 12, relief = num(input.relief);
    var weeks = Math.max(1, 52 - Math.min(51, num(input.weeksOff))), hours = num(input.hours, 100), billable = cents(weeks * hours);
    // net(profit) is increasing; bisect to the cent.
    var lo = 0, hi = Math.max(1, target) * 3 + socso + 10000;
    for (var i = 0; i < 80; i++) { var mid = (lo + hi) / 2; if (fromProfit(mid, epfPct, socso, relief).net < target) lo = mid; else hi = mid; }
    var p = fromProfit(Math.ceil(hi * 100) / 100, epfPct, socso, relief), revenue = cents(p.profit + expenses);
    var rate = billable ? revenue / billable : 0;
    return {
      target: target, expenses: expenses, socso: socso, epf: p.epf, tax: p.tax, chargeable: p.chargeable, profit: p.profit, revenue: revenue,
      monthly: cents(revenue / 12), weeks: weeks, billable: billable, hourly: cents(rate), daily: cents(rate * FACTS.hoursDay),
      taxPct: revenue ? p.tax / revenue * 100 : 0
    };
  }

  var api = { FACTS: FACTS, calculate: calculate, fromProfit: fromProfit };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBFreelance = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
