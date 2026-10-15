/* Bursa Malaysia share trading costs: brokerage (negotiable, set by each broker: a rate with a minimum per contract),
   clearing fee 0.03% capped at RM1,000 per contract, and stamp duty on contract notes 0.10% capped at RM1,000
   (remission order for listed shares, 13 July 2023 to 12 July 2028), on both the buy and the sell. 8% service tax
   applies to brokerage and clearing for ETFs, REITs, warrants and similar securities; ordinary shares are exempt.
   Gives net profit, return and the break-even selling price. Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-15', clearing: 0.0003, clearingCap: 1000, stamp: 0.001, stampCap: 1000, sst: 0.08, lot: 100, stampUntil: '2028-07-12', dividendTax: 0.02, dividendFree: 100000 };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };

  function fees(value, brokerPct, brokerMin, sstOn) {
    if (!value) return { brokerage: 0, clearing: 0, stamp: 0, sst: 0, total: 0 };
    var brokerage = cents(Math.max(value * brokerPct, brokerMin)), clearing = cents(Math.min(value * FACTS.clearing, FACTS.clearingCap));
    var stamp = cents(Math.min(value * FACTS.stamp, FACTS.stampCap)), sst = sstOn ? cents((brokerage + clearing) * FACTS.sst) : 0;
    return { brokerage: brokerage, clearing: clearing, stamp: stamp, sst: sst, total: cents(brokerage + clearing + stamp + sst) };
  }

  function calculate(input) {
    var qty = Math.round(num(input.qty)), buy = num(input.buy), sell = num(input.sell), pct = num(input.brokerPct) / 100, min = num(input.brokerMin);
    var sstOn = input.asset === 'etf', div = num(input.dividend);
    var bv = cents(buy * qty), sv = cents(sell * qty), bf = fees(bv, pct, min, sstOn), sf = fees(sv, pct, min, sstOn);
    var cost = cents(bv + bf.total), proceeds = cents(sv - sf.total), dividends = cents(div * qty), profit = cents(proceeds - cost + dividends);
    // Lowest price (to RM0.005, Bursa's smallest tick) where proceeds after selling costs cover the buy cost.
    var be = null;
    if (qty) {
      var lo = 0, hi = Math.max(buy * 2, 1) + 10;
      for (var i = 0; i < 60; i++) { var mid = (lo + hi) / 2; if (cents(mid * qty) - fees(cents(mid * qty), pct, min, sstOn).total >= cost) hi = mid; else lo = mid; }
      be = Math.ceil(hi * 1000 - 1e-6) / 1000;
    }
    return { qty: qty, lots: qty / FACTS.lot, buyValue: bv, sellValue: sv, buyFees: bf, sellFees: sf, cost: cost, proceeds: proceeds, dividends: dividends,
      profit: profit, ret: cost ? profit / cost * 100 : 0, breakEven: be, feesTotal: cents(bf.total + sf.total) };
  }

  var api = { FACTS: FACTS, calculate: calculate, fees: fees };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBBursa = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
