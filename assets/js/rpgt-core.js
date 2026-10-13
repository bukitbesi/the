/* Real Property Gains Tax (RPGT, cukai keuntungan harta tanah) under the Real Property Gains Tax Act 1976, Schedule 5
   rates in force since 1 January 2022 and unchanged for 2026. Individuals deduct RM10,000 or 10% of the gain, whichever
   is greater; a citizen or PR may exempt one private residence once in a lifetime. The buyer retains 3% of the price
   (7% when the seller is not a citizen or PR) for LHDN. Verified 14 October 2026. */
(function (root) {
  'use strict';

  // Rate by year of disposal after acquisition: years 1–3, 4, 5, 6 and later.
  var RATES = {
    citizen: [30, 30, 30, 20, 15, 0],
    foreigner: [30, 30, 30, 30, 30, 10],
    company: [30, 30, 30, 20, 15, 10]
  };
  var FACTS = { verified: '2026-10-14', since: '2022-01-01', exemptionMin: 10000, exemptionPct: 10, retention: 3, retentionForeigner: 7 };

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v) { v = Number(v); return v !== '' && isFinite(v) && v >= 0 ? v : 0; };
  var parse = function (s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; };

  // The year of ownership the disposal falls in: within 3 years is year ≤ 3, then the 4th, 5th, 6th year...
  function holdingYear(acquired, disposed) {
    var a = parse(acquired), d = parse(disposed);
    if (isNaN(a) || isNaN(d) || d < a) return 0;
    var from = new Date(a);
    for (var k = 1; k < 100; k++) {
      var end = Date.UTC(from.getUTCFullYear() + k, from.getUTCMonth(), from.getUTCDate());
      if (d <= end) return k;
    }
    return 100;
  }

  function rateFor(owner, year) {
    var r = RATES[owner] || RATES.citizen;
    return year < 1 ? r[0] : r[Math.min(year, 6) - 1];
  }

  function calculate(input) {
    var owner = RATES[input.owner] ? input.owner : 'citizen';
    var year = holdingYear(input.acquired, input.disposed);
    var sale = num(input.sale), cost = num(input.purchase) + num(input.acqCosts) + num(input.enhance);
    var net = sale - num(input.saleCosts), gain = cents(net - cost);
    var individual = owner !== 'company';
    var exemption = individual && gain > 0 ? cents(Math.max(FACTS.exemptionMin, gain * FACTS.exemptionPct / 100)) : 0;
    var residence = owner === 'citizen' && (input.residence === 'yes' || input.residence === true);
    var chargeable = residence ? 0 : cents(Math.max(0, gain - exemption));
    var rate = rateFor(owner, year), tax = cents(chargeable * rate / 100);
    var retentionPct = owner === 'foreigner' ? FACTS.retentionForeigner : FACTS.retention, retention = cents(sale * retentionPct / 100);
    return {
      owner: owner, year: year, rate: rate, sale: sale, cost: cents(cost), net: cents(net), gain: gain,
      exemption: residence ? Math.max(0, gain) : Math.min(exemption, Math.max(0, gain)), residence: residence,
      chargeable: chargeable, tax: tax, retentionPct: retentionPct, retention: retention, refund: cents(retention - tax)
    };
  }

  var api = { FACTS: FACTS, RATES: RATES, holdingYear: holdingYear, rateFor: rateFor, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBRpgt = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
