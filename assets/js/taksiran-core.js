/* Assessment tax (cukai taksiran / cukai pintu) in Malaysia under the Local Government Act 1976 (Act 171): yearly tax =
   annual value (nilai tahunan, the estimated gross rent a year: monthly rent × 12) × the council's rate (s.127, set
   by the council with state approval; at most 35% of annual value, s.130). Paid in two halves, due by 28 February and
   31 August; unpaid amounts become arrears after those dates (s.147) and late charges are set by each council.
   Rates confirmed by an official source and a second source: DBKL 4% residential, 10% commercial; MBPJ (2025 list)
   4% landed, 3% flat/apartment/condominium, 2% low-cost high-rise, 3.5% serviced apartment, with Selangor's 25% cap
   on the increase from 1 January 2025; MBPP (from 1 January 2025) 5.6% landed, 5.0% low-cost and low-medium-cost
   landed, 5.0% low-cost and middle-class flats, 5.5% apartment/condominium, 9% commercial, 10.5% industrial. Other
   councils (MBSA, MBSJ, MBKj, Johor and Melaka councils, Putrajaya) are entered as a custom rate. Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-15', maxRate: 35, due: ['28 February', '31 August'], dueMs: ['28 Februari', '31 Ogos'], selangorCap: 25 };
  var COUNCILS = {
    dbkl: { cap: false, types: { residential: 4, commercial: 10 } },
    mbpj: { cap: true, types: { landed: 4, strata: 3, lowcost: 2, serviced: 3.5 } },
    mbpp: { cap: false, types: { landed: 5.6, landedLow: 5, flatLow: 5, strata: 5.5, commercial: 9, industrial: 10.5 } }
  };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };

  function rateOf(council, type, custom) {
    var c = COUNCILS[council];
    if (!c) return Math.min(FACTS.maxRate, num(custom));
    return c.types[type] !== undefined ? c.types[type] : c.types[Object.keys(c.types)[0]];
  }

  function calculate(input) {
    var council = COUNCILS[input.council] ? input.council : 'custom', c = COUNCILS[council];
    var type = c && c.types[input.type] !== undefined ? input.type : c ? Object.keys(c.types)[0] : null;
    var rate = rateOf(council, type, input.rate);
    var annual = input.mode === 'annual' ? num(input.annual) : num(input.rent) * 12;
    var tax = cents(annual * rate / 100), old = num(input.oldTax), capped = null;
    if (c && c.cap && old > 0) capped = Math.min(tax, cents(old * (1 + FACTS.selangorCap / 100)));
    var pay = capped !== null ? capped : tax;
    return { council: council, type: type, rate: rate, annual: annual, tax: tax, capped: capped, pay: pay, half: cents(pay / 2), monthly: cents(pay / 12),
      increase: old > 0 ? cents(pay - old) : null };
  }

  // The same rent priced at every confirmed council rate.
  function compare(rent) {
    var out = [];
    Object.keys(COUNCILS).forEach(function (k) {
      Object.keys(COUNCILS[k].types).forEach(function (t) { out.push({ council: k, type: t, rate: COUNCILS[k].types[t], tax: cents(num(rent) * 12 * COUNCILS[k].types[t] / 100) }); });
    });
    return out;
  }

  var api = { FACTS: FACTS, COUNCILS: COUNCILS, calculate: calculate, compare: compare };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBTaksiran = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
