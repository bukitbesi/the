/* Debt consolidation in Malaysia: credit card and other debts paid off as they are (monthly interest on the balance;
   card minimum payment 5% of the balance or RM50, whichever is higher; card finance charges 15%, 17% or 18% a year)
   against one personal loan (flat rate converted to EIR, 0.5% stamp duty). Built on TBBCarLoan's loan maths.
   Verified 14 October 2026. */
(function (root) {
  'use strict';
  var C = typeof module === 'object' && module.exports ? require('./carloan-core.js') : root.TBBCarLoan;

  var FACTS = { verified: '2026-10-14', minPct: 5, minFloor: 50, cardTiers: [15, 17, 18], stampDuty: 0.005, maxMonths: 600 };

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, d) { v = Number(v); return v !== '' && isFinite(v) && v >= 0 ? v : (d || 0); };

  // Pay one debt down month by month; payment 0 means the card minimum. Returns months, interest and first payment.
  function payoff(balance, ratePct, payment) {
    var b = num(balance), r = num(ratePct) / 1200, fixed = num(payment), m = 0, interest = 0, first = 0;
    while (b > 0.005 && m < FACTS.maxMonths) {
      var i = b * r, pay = fixed || Math.max(b * FACTS.minPct / 100, FACTS.minFloor);
      pay = Math.min(pay, b + i);
      if (!m) first = pay;
      if (pay <= i + 1e-9) return { months: Infinity, interest: Infinity, first: cents(first), never: true };
      interest += i; b = b + i - pay; m++;
    }
    return { months: b > 0.005 ? Infinity : m, interest: b > 0.005 ? Infinity : cents(interest), first: cents(first), never: b > 0.005 };
  }

  function calculate(input) {
    var debts = (input.debts || []).map(function (d) { return { balance: num(d.balance), rate: num(d.rate), payment: num(d.payment) }; })
      .filter(function (d) { return d.balance > 0; });
    var owed = cents(debts.reduce(function (s, d) { return s + d.balance; }, 0));
    var now = debts.map(function (d) { return Object.assign({}, d, payoff(d.balance, d.rate, d.payment)); });
    var never = now.some(function (d) { return d.never; });
    var nowInterest = never ? Infinity : cents(now.reduce(function (s, d) { return s + d.interest; }, 0));
    var nowMonths = never ? Infinity : now.reduce(function (s, d) { return Math.max(s, d.months); }, 0);
    var nowMonthly = cents(now.reduce(function (s, d) { return s + d.first; }, 0));
    var years = Math.min(10, Math.max(1, Math.round(num(input.years, 5)))), n = years * 12, rate = num(input.rate, 6);
    var eirMethod = input.method === 'eir';
    var monthly = owed ? (eirMethod ? C.eirInstalment(owed, rate, years) : C.flatInstalment(owed, rate, years)) : 0;
    var loanInterest = owed ? (eirMethod ? cents(Math.max(0, monthly * n - owed)) : cents(owed * rate / 100 * years)) : 0;
    var stamp = cents(owed * FACTS.stampDuty), cost = cents(loanInterest + stamp);
    return {
      debts: now, owed: owed, nowInterest: nowInterest, nowMonths: nowMonths, nowMonthly: nowMonthly, never: never,
      years: years, months: n, rate: rate, eir: eirMethod ? rate : C.flatToEir(rate, years), monthly: monthly,
      loanInterest: loanInterest, stamp: stamp, cost: cost, saving: never ? Infinity : cents(nowInterest - cost),
      monthlyChange: cents(nowMonthly - monthly)
    };
  }

  var api = { FACTS: FACTS, payoff: payoff, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBDebt = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
