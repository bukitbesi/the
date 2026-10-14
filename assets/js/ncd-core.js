/* No Claim Discount (NCD) on Malaysian motor insurance. The scale from the former motor tariff is still applied by
   every insurer and takaful operator: private cars 25%, 30%, 38.33%, 45% and 55% after one to five or more
   claim-free years; motorcycles and commercial vehicles 15%, 20%, then 25%. An own-damage or theft claim resets the
   NCD to 0% at the next renewal. Premium = gross premium − NCD, plus 8% SST and RM10 stamp duty.
   Verified 14 October 2026. */
(function (root) {
  'use strict';

  var FACTS = { verified: '2026-10-14', sst: 0.08, stamp: 10, maxYears: 5 };
  var SCALE = { car: [0, 25, 30, 38.33, 45, 55], motorcycle: [0, 15, 20, 25, 25, 25], commercial: [0, 15, 20, 25, 25, 25] };

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, d) { v = Number(v); return v !== '' && isFinite(v) && v >= 0 ? v : (d || 0); };
  var kind = function (t) { return SCALE[t] ? t : 'car'; };

  // NCD % for a number of consecutive claim-free years.
  function rate(type, years) { return SCALE[kind(type)][Math.min(FACTS.maxYears, Math.max(0, Math.floor(num(years))))]; }

  function premium(gross, ncdPct) {
    gross = num(gross);
    var discount = cents(gross * ncdPct / 100), net = cents(gross - discount), sst = cents(net * FACTS.sst);
    return { gross: gross, ncd: ncdPct, discount: discount, net: net, sst: sst, stamp: gross ? FACTS.stamp : 0, total: gross ? cents(net + sst + FACTS.stamp) : 0 };
  }

  // Renewal-by-renewal NCD with no claim versus after one claim this policy year, and the extra premium the claim costs.
  function claimCost(type, years, gross) {
    var rows = [], loss = 0;
    for (var k = 1; k <= FACTS.maxYears + 1; k++) {
      var keep = rate(type, num(years) + k), after = rate(type, k - 1);
      var extra = cents(num(gross) * (keep - after) / 100 * (1 + FACTS.sst));
      if (keep === after && k > 1) break;
      rows.push({ renewal: k, keep: keep, after: after, extra: extra });
      loss += extra;
    }
    return { rows: rows, total: cents(loss) };
  }

  function calculate(input) {
    var type = kind(input.type), years = Math.min(FACTS.maxYears, Math.max(0, Math.floor(num(input.years))));
    var now = rate(type, years), p = premium(input.gross, now), cost = claimCost(type, years, p.gross), repair = num(input.repair);
    var ladder = [];
    for (var y = 0; y <= FACTS.maxYears; y++) ladder.push({ years: y, ncd: rate(type, y), total: premium(p.gross, rate(type, y)).total });
    return {
      type: type, years: years, ncd: now, next: rate(type, years + 1), max: SCALE[type][FACTS.maxYears], premium: p, ladder: ladder,
      claim: cost, repair: repair, advice: repair > 0 ? (repair > cost.total ? 'claim' : 'pay') : ''
    };
  }

  var api = { FACTS: FACTS, SCALE: SCALE, rate: rate, premium: premium, claimCost: claimCost, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBNcd = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
