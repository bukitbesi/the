/* Tenancy agreement stamp duty in Malaysia (Stamp Act 1949, First Schedule item 49(a) as amended by the Finance
   Act 2024): duty per RM250 or part of the average yearly rent, with no exemption threshold: RM1 for a term up to
   1 year, RM3 for over 1 to 3 years, RM5 for over 3 to 5 years and RM7 for over 5 years; minimum RM10; RM10 for
   each stamped copy. Stamp within 30 days through e-Duti Setem on MyTax (self-assessment from 1 January 2026).
   Also the rental yield: gross and net of vacancy and owner's costs. Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-15', unit: 250, bands: [[12, 1], [36, 3], [60, 5], [Infinity, 7]], minimum: 10, copy: 10, days: 30, selfAssessFrom: '2026-01-01',
    old: { threshold: 2400, bands: [[12, 1], [36, 2], [Infinity, 4]] } };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };
  var rateFor = function (bands, months) { for (var i = 0; i < bands.length; i++) if (months <= bands[i][0]) return bands[i][1]; return bands[bands.length - 1][1]; };

  function stampDuty(monthlyRent, months) {
    var annual = num(monthlyRent) * 12, units = Math.ceil(annual / FACTS.unit - 1e-9), rate = rateFor(FACTS.bands, months);
    return { annual: cents(annual), units: units, rate: rate, duty: annual ? Math.max(FACTS.minimum, units * rate) : 0 };
  }
  // The rule before the Finance Act 2024: first RM2,400 of yearly rent exempt, RM1, RM2 or RM4 per RM250.
  function oldDuty(monthlyRent, months) {
    var over = num(monthlyRent) * 12 - FACTS.old.threshold;
    return over > 0 ? Math.ceil(over / FACTS.unit - 1e-9) * rateFor(FACTS.old.bands, months) : 0;
  }

  function calculate(input) {
    var rent = num(input.rent), months = Math.max(1, Math.round(num(input.months) || 12)), copies = Math.max(0, Math.round(Number(input.copies) || 0));
    var s = stampDuty(rent, months), price = num(input.price), costs = num(input.costs), vacancy = Math.min(12, num(input.vacancy));
    var gross = rent * 12, net = rent * (12 - vacancy) - costs;
    return {
      rent: rent, months: months, annual: s.annual, units: s.units, rate: s.rate, duty: s.duty, copies: copies, copyDuty: copies * FACTS.copy,
      total: s.duty + copies * FACTS.copy, old: oldDuty(rent, months), price: price, grossYield: price ? gross / price * 100 : 0,
      netIncome: cents(net), netYield: price ? net / price * 100 : 0, vacancy: vacancy, costs: costs
    };
  }

  var api = { FACTS: FACTS, calculate: calculate, stampDuty: stampDuty, oldDuty: oldDuty };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBTenancy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
