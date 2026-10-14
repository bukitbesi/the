/* Education cost planner: today's yearly cost (fees and living costs) grown at an education inflation rate you set
   to each year of study, the total at the start of university, and the monthly saving needed from now (deposits at
   the start of each month, compounding monthly at the savings return, e.g. the 4.10% Simpan SSPN dividend for 2025)
   after existing savings. Verified 14 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-14', sspn2025: 4.10 };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, max) { v = Number(v); return isFinite(v) && v > 0 ? Math.min(v, max || Infinity) : 0; };

  function calculate(input) {
    var age = Math.min(25, Math.max(0, Math.round(Number(input.age) || 0))), start = Math.min(30, Math.max(age, Math.round(Number(input.start) || 18)));
    var years = Math.max(0, start - age), study = Math.max(1, Math.min(8, Math.round(num(input.study) || 1)));
    var cost = num(input.cost), infl = num(input.inflation, 30) / 100, ret = num(input.ret, 30) / 100, saved = num(input.saved);
    var list = [], total = 0, pv = 0, mr = Math.pow(1 + ret, 1 / 12) - 1;
    for (var k = 0; k < study; k++) {
      var c = cents(cost * Math.pow(1 + infl, years + k));
      list.push({ year: k + 1, age: start + k, cost: c });
      total += c;
      pv += c / Math.pow(1 + ret, k); // later years' fees can keep earning until paid
    }
    var n = years * 12, need = cents(pv), grown = cents(saved * Math.pow(1 + ret, years)), gap = Math.max(0, need - grown);
    var factor = n ? (mr ? (Math.pow(1 + mr, n) - 1) / mr * (1 + mr) : n) : 0;
    var monthly = gap ? (n ? cents(gap / factor) : null) : 0;
    return {
      years: years, study: study, list: list, total: cents(total), today: cents(cost * study), need: need, grown: grown, gap: cents(gap),
      monthly: monthly, deposits: monthly ? cents(monthly * n) : 0, startAge: start
    };
  }

  var api = { FACTS: FACTS, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBEdu = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
