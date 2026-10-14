/* Unit trust returns in Malaysia: a lump sum and monthly investments bought at NAV plus the sales charge (units =
   amount / (NAV x (1 + charge))), grown at the fund's gross return less yearly fees (management + trustee) charged
   monthly on the value. Compares the same plan at the EPF i-Invest online cap (0.5%) and with no charges, and gives
   the net yearly return (IRR). Verified 14 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-14', iInvest: 0.5, epfAgentCap: 3 };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, max) { v = Number(v); return isFinite(v) && v > 0 ? Math.min(v, max || Infinity) : 0; };

  function grow(lump, monthly, years, gross, charge, fee) {
    var g = Math.pow(1 + gross, 1 / 12) - 1, v = 0, paid = 0, charges = 0, fees = 0, rows = [];
    var buy = function (a) { if (!a) return; var net = a / (1 + charge); charges += a - net; v += net; paid += a; };
    for (var m = 1; m <= years * 12; m++) {
      if (m === 1) buy(lump);
      buy(monthly);
      v *= 1 + g;
      var f = v * fee / 12; fees += f; v -= f;
      if (m % 12 === 0) rows.push({ year: m / 12, value: cents(v), paid: cents(paid) });
    }
    return { value: cents(v), paid: cents(paid), charges: cents(charges), fees: cents(fees), rows: rows };
  }

  // Yearly IRR of the cash flows (lump at month 1, monthly at the start of each month, value at the end).
  function irr(lump, monthly, years, value) {
    var n = years * 12, lo = -0.99, hi = 1;
    var fv = function (r) { var i = Math.pow(1 + r, 1 / 12) - 1, s = lump * Math.pow(1 + i, n); for (var m = 0; m < n; m++) s += monthly * Math.pow(1 + i, n - m); return s; };
    if (!(lump + monthly)) return 0;
    for (var k = 0; k < 100; k++) { var mid = (lo + hi) / 2; if (fv(mid) < value) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }

  function calculate(input) {
    var lump = num(input.lump), monthly = num(input.monthly), years = Math.max(1, Math.min(40, Math.round(num(input.years) || 1)));
    var gross = num(input.gross, 50) / 100, charge = num(input.charge, 10) / 100, fee = num(input.fee, 10) / 100;
    var a = grow(lump, monthly, years, gross, charge, fee), b = grow(lump, monthly, years, gross, FACTS.iInvest / 100, fee), z = grow(lump, monthly, years, gross, 0, 0);
    return {
      years: years, value: a.value, paid: a.paid, profit: cents(a.value - a.paid), charges: a.charges, fees: a.fees, rows: a.rows,
      net: irr(lump, monthly, years, a.value) * 100, iInvest: b.value, noCost: z.value, costOfFees: cents(z.value - a.value), chargePct: charge * 100
    };
  }

  var api = { FACTS: FACTS, calculate: calculate, grow: grow, irr: irr };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBUnitTrust = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
