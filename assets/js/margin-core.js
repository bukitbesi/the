/* Profit margin and markup for Malaysian sellers: profit per unit after cost, percentage fees (marketplace commission,
   payment and service fees), fixed fees per order, shipping and ad cost; margin = profit / price, markup = profit /
   cost; break-even price and the price for a target margin. Fee rates are user inputs (platforms change them often).
   Verified 14 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-14', sst: 0.08 };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };

  // Price needed so that margin (after fees) equals target: (cost + fixed) / (1 - fee% - target).
  function priceFor(cost, feePct, fixed, target) {
    var k = 1 - feePct - target;
    return k > 0 ? cents((cost + fixed) / k) : null;
  }
  var markupFromMargin = function (m) { return m < 1 ? m / (1 - m) : null; };
  var marginFromMarkup = function (u) { return u / (1 + u); };

  function calculate(input) {
    var price = num(input.price), cost = num(input.cost), feePct = num(input.feePct) / 100;
    var fixed = cents(num(input.fixedFee) + num(input.shipping) + num(input.ads));
    var qty = Math.max(0, Math.round(num(input.qty)));
    var fees = cents(price * feePct + num(input.fixedFee));
    var profit = cents(price - cost - fees - num(input.shipping) - num(input.ads));
    var target = num(input.target) / 100;
    return {
      price: price, cost: cost, fees: fees, shipping: num(input.shipping), ads: num(input.ads), profit: profit,
      margin: price ? profit / price * 100 : 0, markup: cost ? profit / cost * 100 : 0,
      grossMargin: price ? (price - cost) / price * 100 : 0,
      breakEven: priceFor(cost, feePct, fixed, 0), targetPct: target * 100, targetPrice: priceFor(cost, feePct, fixed, target),
      qty: qty, monthly: cents(profit * qty), revenue: cents(price * qty)
    };
  }

  var api = { FACTS: FACTS, calculate: calculate, priceFor: priceFor, markupFromMargin: markupFromMargin, marginFromMarkup: marginFromMarkup };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBMargin = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
