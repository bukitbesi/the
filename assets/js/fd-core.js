/* Fixed deposit returns in Malaysia: simple interest for the tenure (principal × rate × months ÷ 12) paid at maturity,
   or monthly; renewing at maturity compounds it. PIDM protects up to RM250,000 per depositor per member bank,
   principal and interest together (Islamic and conventional deposits separately). Interest from licensed banks is
   exempt from tax for resident individuals. OPR 2.75% (held 3 September 2026). Verified 14 October 2026. */
(function (root) {
  'use strict';

  var FACTS = { verified: '2026-10-14', pidm: 250000, opr: 2.75, oprAsOf: '2026-09-03', inflation: 1.9 };

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, d) { v = Number(v); return v !== '' && isFinite(v) && v >= 0 ? v : (d || 0); };

  function interest(amount, ratePct, months) { return cents(num(amount) * num(ratePct) / 100 * num(months) / 12); }

  function calculate(input) {
    var amount = num(input.amount), rate = num(input.rate), months = Math.min(60, Math.max(1, Math.round(num(input.months, 12))));
    var renew = Math.min(30, Math.max(1, Math.round(num(input.renew, 1))));
    var once = interest(amount, rate, months), total = amount, rows = [];
    for (var i = 1; i <= renew; i++) {
      var add = interest(total, rate, months);
      total = cents(total + add);
      rows.push({ term: i, months: i * months, interest: add, balance: total });
    }
    var years = renew * months / 12;
    var effective = years > 0 && amount > 0 ? (Math.pow(total / amount, 1 / years) - 1) * 100 : 0;
    var inflation = input.inflation === undefined || input.inflation === '' ? FACTS.inflation : num(input.inflation);
    return {
      amount: amount, rate: rate, months: months, interest: once, maturity: cents(amount + once), monthly: cents(amount * rate / 1200),
      renew: renew, total: total, earned: cents(total - amount), effective: effective, rows: rows,
      real: rate - inflation, inflation: inflation, overPidm: cents(Math.max(0, amount + once - FACTS.pidm))
    };
  }

  var api = { FACTS: FACTS, interest: interest, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBFd = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
