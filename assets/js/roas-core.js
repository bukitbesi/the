/* ROAS and ROI for online ads in Malaysia: ROAS = ad revenue / ad spend; profit = revenue x gross margin - ad spend;
   ROI = profit / ad spend; break-even ROAS = 1 / gross margin; CPA and average order value. Optional 8% service tax on
   ad spend (imported digital services, from 1 March 2024). Verified 14 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-14', serviceTax: 0.08, serviceTaxFrom: '2024-03-01' };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };

  var breakEven = function (marginPct) { return marginPct > 0 ? 100 / marginPct : null; };

  function calculate(input) {
    var base = num(input.spend), tax = input.tax === 'yes' ? cents(base * FACTS.serviceTax) : 0, spend = cents(base + tax);
    var revenue = num(input.revenue), margin = Math.min(100, num(input.margin)) / 100, orders = Math.round(num(input.orders));
    var gross = cents(revenue * margin), profit = cents(gross - spend);
    var be = breakEven(margin * 100);
    return {
      spend: spend, baseSpend: base, tax: tax, revenue: revenue, marginPct: margin * 100, gross: gross, profit: profit,
      roas: spend ? revenue / spend : 0, roi: spend ? profit / spend * 100 : 0, breakEven: be,
      breakEvenRevenue: be ? cents(spend * be) : null, acos: revenue ? spend / revenue * 100 : 0,
      orders: orders, cpa: orders ? cents(spend / orders) : null, aov: orders ? cents(revenue / orders) : null,
      maxCpa: orders && revenue ? cents(revenue / orders * margin) : null
    };
  }

  var api = { FACTS: FACTS, calculate: calculate, breakEven: breakEven };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBRoas = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
