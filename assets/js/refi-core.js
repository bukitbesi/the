/* Home loan refinancing in Malaysia: the remaining loan at the current rate against a new loan at a lower rate or longer
   tenure, with an optional cash-out. Costs: 0.5% stamp duty on the new loan agreement (no refinancing exemption),
   SRO 2023 legal fees on the new loan plus 8% SST, any lock-in penalty on the old loan, valuation and other fees.
   Built on TBBLoan (loan-core.js). Verified 14 October 2026. */
(function (root) {
  'use strict';
  var L = typeof module === 'object' && module.exports ? require('./loan-core.js') : root.TBBLoan;

  var FACTS = { verified: '2026-10-14', sst: 0.08, opr: 2.75, oprAsOf: '2026-09-03' };

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, d) { v = Number(v); return v !== '' && isFinite(v) && v >= 0 ? v : (d || 0); };

  function calculate(input) {
    var balance = num(input.balance), rate = num(input.rate), left = Math.min(35, Math.max(1, num(input.yearsLeft, 25)));
    var newRate = num(input.newRate), newYears = Math.min(35, Math.max(1, num(input.newYears, left)));
    var cashOut = num(input.cashOut), lockPct = num(input.lockPct);
    var old = L.amortise(balance, rate, left, 0);
    // Same balance at the new terms: the like-for-like saving, before any cash-out.
    var same = L.amortise(balance, newRate, newYears, 0);
    var newLoan0 = cents(balance + cashOut);
    var stamp = L.stampDutyLoan(newLoan0), legal = L.legalFee(newLoan0), sst = cents(legal * FACTS.sst);
    var penalty = cents(balance * lockPct / 100), valuation = num(input.valuation), other = num(input.other);
    var costs = cents(stamp + legal + sst + penalty + valuation + other);
    var financed = input.finance === 'loan';
    var newLoan = cents(newLoan0 + (financed ? costs : 0));
    var fresh = L.amortise(newLoan, newRate, newYears, 0);
    var monthlySaving = cents(old.instalment - same.instalment);
    var interestSaved = cents(old.interest - same.interest);
    return {
      balance: balance, oldInstalment: old.instalment, oldInterest: old.interest, oldMonths: old.months,
      newLoan: newLoan, newInstalment: fresh.instalment, newInterest: fresh.interest, newMonths: fresh.months,
      sameInstalment: same.instalment, sameInterest: same.interest, monthlySaving: monthlySaving, interestSaved: interestSaved,
      costs: costs, stamp: stamp, legal: legal, sst: sst, penalty: penalty, valuation: valuation, other: other, financed: financed,
      cashOut: cashOut, netSaving: cents(interestSaved - costs),
      breakEven: monthlySaving > 0 ? Math.ceil(costs / monthlySaving) : null
    };
  }

  var api = { FACTS: FACTS, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBRefi = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
