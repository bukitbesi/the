/* Malaysian Sales and Service Tax: add tax to a price or take it out of a tax-inclusive price at the service tax rates
   (8% general from 1 March 2024; 6% for food and beverage, telecommunications, parking, logistics, construction,
   private healthcare for non-citizens, private education and, from 1 January 2026, rental and leasing) or the
   sales tax rates (5% and 10%). For restaurants, service tax is on the food and drink, not on the service charge
   (RMCD F&B guide). Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-15', general: 8, reduced: 6, sales: [5, 10], generalFrom: '2024-03-01', rentalSixFrom: '2026-01-01',
    thresholds: [['services', 500000], ['manufacturer', 500000], ['fnb', 1500000], ['rental', 1000000], ['financial', 1000000], ['construction', 1500000], ['healthcare', 1500000]] };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };

  function calculate(input) {
    var rate = Math.min(100, num(input.rate)) / 100, amount = num(input.amount), charge = Math.min(100, num(input.charge)) / 100;
    var r = { rate: rate * 100, charge: charge * 100, mode: input.mode === 'remove' ? 'remove' : 'add' };
    if (r.mode === 'remove') {
      // Total = base x (1 + charge + rate) when the tax is on the base only.
      var base = amount / (1 + charge + rate);
      r.base = cents(base); r.serviceCharge = cents(base * charge); r.tax = cents(base * rate); r.total = amount;
    } else {
      r.base = amount; r.serviceCharge = cents(amount * charge); r.tax = cents(amount * rate); r.total = cents(amount + r.serviceCharge + r.tax);
    }
    r.taxShare = r.total ? r.tax / r.total * 100 : 0;
    return r;
  }

  var api = { FACTS: FACTS, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBSst = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
