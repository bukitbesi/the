/* Personal loan maths for Malaysia, built on the car loan core's flat-rate and reducing-balance (EIR) functions.
   Banks still quote most personal loans at a flat rate; Bank Negara's policy bans flat-rate pricing and the Rule of 78
   for new personal financing from 1 January 2027. Stamp duty on the loan agreement is 0.5%. Verified 14 October 2026. */
(function (root) {
  'use strict';
  var C = typeof module === 'object' && module.exports ? require('./carloan-core.js') : root.TBBCarLoan;

  var FACTS = { verified: '2026-10-14', flatBanFrom: '2027-01-01', stampDuty: 0.005, maxYears: 10, defaultFlat: 6, unsecuredCap: 18, securedCap: 12 };

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, d) { v = Number(v); return v !== '' && isFinite(v) && v >= 0 ? v : (d || 0); };

  function calculate(input) {
    var amount = num(input.amount);
    var years = Math.min(FACTS.maxYears, Math.max(1, Math.round(num(input.years, 5)))), n = years * 12;
    var method = input.method === 'eir' ? 'eir' : 'flat';
    var rate = num(input.rate, FACTS.defaultFlat);
    var monthly = method === 'flat' ? C.flatInstalment(amount, rate, years) : C.eirInstalment(amount, rate, years);
    var interest = method === 'flat' ? cents(amount * rate / 100 * years) : cents(Math.max(0, monthly * n - amount));
    var eir = method === 'flat' ? C.flatToEir(rate, years) : rate;
    var flat = method === 'flat' ? rate : C.eirToFlat(rate, years);
    var stamp = cents(amount * FACTS.stampDuty), deducted = input.stamp !== 'separate';
    var schedule = [];
    for (var y = 1; y <= years; y++) {
      var before = C.balanceAfter(amount, eir, years, (y - 1) * 12), after = y === years ? 0 : C.balanceAfter(amount, eir, years, y * 12);
      schedule.push({ year: y, principal: cents(before - after), interest: cents(monthly * 12 - (before - after)), balance: cents(after) });
    }
    return {
      amount: amount, years: years, months: n, method: method, rate: rate, monthly: monthly, interest: interest,
      totalPaid: cents(amount + interest), eir: eir, flat: flat, stamp: stamp, received: cents(deducted ? amount - stamp : amount),
      cost: cents(interest + stamp), schedule: schedule
    };
  }

  var api = { FACTS: FACTS, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBPersonalLoan = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
