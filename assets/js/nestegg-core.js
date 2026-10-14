/* Retirement savings (nest egg) for Malaysia: the savings needed at retirement to pay today's monthly expenses,
   rising with inflation, for every year until the age you plan for (paid at the start of each month, the rest
   earning the post-retirement return), against your EPF and other savings grown to retirement with monthly
   contributions; the shortfall, the extra monthly saving to close it and the age the money runs out. Compared with
   EPF's Retirement Income Adequacy benchmarks at 55: RM390,000 basic (phased in by 2028), RM650,000 adequate and
   RM1.3 million enhanced. Verified 14 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-14', basic: 390000, adequate: 650000, enhanced: 1300000, basicPhase: [[2026, 290000], [2027, 340000], [2028, 390000]], epf2025: 6.15 };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, max) { v = Number(v); return isFinite(v) && v > 0 ? Math.min(v, max || Infinity) : 0; };
  var mrate = function (y) { return Math.pow(1 + y, 1 / 12) - 1; };

  // Simulate retirement month by month; returns the balance path and the month the money runs out (or null).
  function drawdown(balance, expense, inflation, ret, months) {
    var r = mrate(ret), g = mrate(inflation), b = balance, e = expense;
    for (var m = 0; m < months; m++) {
      if (b < e) return { runsOut: m, left: 0 };
      b = (b - e) * (1 + r); e *= 1 + g;
    }
    return { runsOut: null, left: b };
  }

  function calculate(input) {
    var age = Math.min(80, Math.max(18, Math.round(Number(input.age) || 30))), retire = Math.min(80, Math.max(age, Math.round(Number(input.retire) || 60)));
    var until = Math.min(110, Math.max(retire + 1, Math.round(Number(input.until) || 85)));
    var inf = num(input.inflation, 20) / 100, pre = num(input.pre, 20) / 100, post = num(input.post, 20) / 100;
    var expense = num(input.expense), saved = num(input.saved), monthly = num(input.monthly);
    var n = (retire - age) * 12, rm = mrate(pre), months = (until - retire) * 12;
    var first = cents(expense * Math.pow(1 + inf, retire - age));
    // Present value at retirement of a growing monthly annuity due.
    var rr = mrate(post), gg = mrate(inf), k = (1 + gg) / (1 + rr), need = 0;
    need = Math.abs(1 - k) < 1e-12 ? first * months : first * (1 - Math.pow(k, months)) / (1 - k);
    var fvFactor = n ? (rm ? (Math.pow(1 + rm, n) - 1) / rm * (1 + rm) : n) : 0;
    var projected = cents(saved * Math.pow(1 + rm, n) + monthly * fvFactor);
    var gap = Math.max(0, cents(need - projected)), extra = gap ? (n ? cents(gap / fvFactor) : null) : 0;
    var d = drawdown(projected, first, inf, post, months);
    return {
      years: retire - age, retireYears: until - retire, first: first, need: cents(need), projected: projected, gap: gap, extra: extra,
      runsOutAge: d.runsOut === null ? null : retire + d.runsOut / 12, enough: d.runsOut === null, left: cents(d.left),
      retire: retire, until: until, todayMonthly: expense, needToday: cents(need / Math.pow(1 + inf, retire - age))
    };
  }

  var api = { FACTS: FACTS, calculate: calculate, drawdown: drawdown };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBNestEgg = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
