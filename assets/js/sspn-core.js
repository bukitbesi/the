/* SSPN (Simpan SSPN, PTPTN) savings and tax relief: balance projection with the yearly dividend (4.10% for 2025,
   4.05% for 2024, 3.60% for 2023) credited at year end on the average monthly balance, and the income tax relief of up
   to RM8,000 a year per taxpayer on deposits (YA2025 to YA2027), with tax saved at YA2026 resident rates from
   TBBSalary. Verified 14 October 2026. */
(function (root) {
  'use strict';
  var S = typeof module === 'object' && module.exports ? require('./salary-core.js') : root.TBBSalary;
  var FACTS = { verified: '2026-10-14', relief: 8000, reliefUntil: 2027, dividends: [[2025, 4.10], [2024, 4.05], [2023, 3.60]], primeMin: 20, plusMin: 30 };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, max) { v = Number(v); return isFinite(v) && v > 0 ? Math.min(v, max || Infinity) : 0; };

  // Balance after each year: deposits at the start of each month, dividend on the average month-end balance.
  function project(balance, monthly, lump, years, rate) {
    var b = balance, out = [], paid = balance, div = 0;
    for (var y = 1; y <= years; y++) {
      var sum = 0;
      if (y === 1 && lump) { b += lump; paid += lump; }
      for (var m = 0; m < 12; m++) { b += monthly; paid += monthly; sum += b; }
      var d = cents(sum / 12 * rate);
      b = cents(b + d); div = cents(div + d);
      out.push({ year: y, balance: b, deposits: cents(paid), dividends: div });
    }
    return out;
  }

  function taxSaved(chargeable, relief) {
    var c = Math.max(0, chargeable);
    return cents(S.annualTax(c) - S.annualTax(Math.max(0, c - relief)));
  }

  function calculate(input) {
    var balance = num(input.balance), monthly = num(input.monthly), lump = num(input.lump);
    var years = Math.max(1, Math.min(30, Math.round(num(input.years) || 1))), rate = num(input.rate, 20) / 100;
    var rows = project(balance, monthly, lump, years, rate), last = rows[rows.length - 1];
    var yearDeposit = cents(monthly * 12 + lump), relief = Math.min(FACTS.relief, yearDeposit), ci = num(input.income);
    var saved = taxSaved(ci, relief);
    return {
      rows: rows, balance: last.balance, deposits: last.deposits, dividends: last.dividends, years: years,
      yearDeposit: yearDeposit, relief: relief, unused: cents(FACTS.relief - relief), income: ci, taxSaved: saved,
      taxBefore: S.annualTax(ci), monthlyForMax: cents(FACTS.relief / 12)
    };
  }

  var api = { FACTS: FACTS, calculate: calculate, project: project, taxSaved: taxSaved };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBSspn = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
