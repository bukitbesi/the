/* PTPTN repayment under the ujrah (service charge) scheme: 1% a year on the loan for the repayment period, spread evenly
   over the months (total ujrah = principal × 1% × years); repayment starts 12 months after the loan ends and ujrah is
   charged from the 13th month. Settling early pays the principal balance plus ujrah to the current month only.
   Restructuring can extend the period to age 60 with a minimum instalment of about 5–8% of gross income.
   No repayment discount is offered under Budget 2026. Verified 14 October 2026. */
(function (root) {
  'use strict';

  var FACTS = { verified: '2026-10-14', ujrah: 1, graceMonths: 12, maxAge: 60, minIncomeShare: [5, 8], defaultYears: 15 };

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, d) { v = Number(v); return v !== '' && isFinite(v) && v >= 0 ? v : (d || 0); };

  function calculate(input) {
    var principal = num(input.amount), years = Math.min(40, Math.max(1, Math.round(num(input.years, FACTS.defaultYears)))), n = years * 12;
    var ujrah = cents(principal * FACTS.ujrah / 100 * years), total = cents(principal + ujrah), monthly = cents(total / n);
    var paid = Math.min(n, Math.max(0, Math.floor(num(input.paid))));
    var principalLeft = cents(principal - principal / n * paid), ujrahLeft = cents(ujrah - ujrah / n * paid);
    var income = num(input.income);
    return {
      principal: principal, years: years, months: n, ujrah: ujrah, total: total, monthly: monthly, paid: paid,
      settle: principalLeft, saving: ujrahLeft, balance: cents(principalLeft + ujrahLeft),
      minLow: cents(income * FACTS.minIncomeShare[0] / 100), minHigh: cents(income * FACTS.minIncomeShare[1] / 100)
    };
  }

  var api = { FACTS: FACTS, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBPtptn = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
