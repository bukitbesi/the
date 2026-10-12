/* Malaysian home loan maths: monthly-rest instalment, amortisation with extra payments, stamp duty,
   SRO 2023 legal fees and debt service ratio. Facts last verified 12 October 2026. */
(function (root) {
  'use strict';

  var FACTS = {
    verified: '2026-10-12',
    opr: 2.75, oprSince: '2025-07-09',
    defaultRate: 4.2, maxTenure: 35, maxAge: 70,
    sst: 0.08,
    // Instrument of transfer (MOT / DOA) scale for Malaysians; the loan agreement is a flat 0.5%.
    transferBands: [[100000, 0.01], [500000, 0.02], [1000000, 0.03], [Infinity, 0.04]],
    loanDuty: 0.005,
    // Solicitors' Remuneration Order 2023, Table A (sale and purchase, and loan): minimum RM500.
    legalBands: [[500000, 0.0125], [7500000, 0.01]], legalMin: 500,
    firstHome: {
      current: { cap: 500000, until: '2027-12-31' },
      budget2027: { full: 500000, cap: 750000, from: '2027-01-01', until: '2030-12-31' }
    }
  };

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, d) { v = Number(v); return isFinite(v) && v >= 0 ? v : (d || 0); };

  function banded(amount, bands) {
    var tax = 0, lower = 0;
    for (var i = 0; i < bands.length && amount > lower; i++) {
      tax += (Math.min(amount, bands[i][0]) - lower) * bands[i][1];
      lower = bands[i][0];
    }
    return tax;
  }

  // Standard annuity with monthly rest, the method Malaysian banks quote.
  function instalment(loan, ratePct, years) {
    var n = Math.round(num(years) * 12), r = num(ratePct) / 1200;
    loan = num(loan);
    if (!(loan > 0) || !(n > 0)) return 0;
    if (!r) return cents(loan / n);
    return cents(loan * r / (1 - Math.pow(1 + r, -n)));
  }

  // Month-by-month schedule; extra is paid on top of the instalment and goes straight to principal.
  function amortise(loan, ratePct, years, extra) {
    var r = num(ratePct) / 1200, pay = instalment(loan, ratePct, years), add = num(extra);
    var balance = num(loan), months = 0, interest = 0, rows = [], yi = 0, yp = 0, n = Math.round(num(years) * 12);
    while (balance > 0.005 && months < 1200) {
      var i = cents(balance * r);
      // Rounding leaves a few sen at the end; the final instalment clears it, as banks do.
      var p = months + 1 >= n ? balance : Math.min(balance, pay + add - i);
      if (p <= 0) break;
      balance = cents(balance - p); months++; interest += i; yi += i; yp += p;
      if (months % 12 === 0 || balance <= 0.005) {
        rows.push({ year: Math.ceil(months / 12), interest: cents(yi), principal: cents(yp), balance: Math.max(0, balance) });
        yi = 0; yp = 0;
      }
    }
    return { instalment: pay, months: months, interest: cents(interest), rows: rows };
  }

  function stampDutyTransfer(price) { return Math.round(banded(num(price), FACTS.transferBands)); }
  function stampDutyLoan(loan) { return Math.round(num(loan) * FACTS.loanDuty); }
  function legalFee(amount) {
    amount = num(amount);
    return amount > 0 ? cents(Math.max(FACTS.legalMin, banded(amount, FACTS.legalBands))) : 0;
  }

  // First-home exemption. 'current': full exemption up to RM500,000 (SPAs to 31 Dec 2027).
  // 'budget2027' (proposal, SPAs 2027–2030): up to RM750,000, full on the first RM500,000 and half on the rest;
  // the loan agreement is relieved in the same proportion as the price.
  function exemption(rule, price, loan) {
    var mot = stampDutyTransfer(price), la = stampDutyLoan(loan);
    if (rule === 'current' && price <= FACTS.firstHome.current.cap) return { mot: mot, loan: la };
    if (rule === 'budget2027' && price <= FACTS.firstHome.budget2027.cap) {
      var full = FACTS.firstHome.budget2027.full;
      if (price <= full) return { mot: mot, loan: la };
      var motOff = stampDutyTransfer(full) + (mot - stampDutyTransfer(full)) / 2;
      var share = (full + (price - full) / 2) / price;
      return { mot: Math.round(motOff), loan: Math.round(la * share) };
    }
    return { mot: 0, loan: 0 };
  }

  function calculate(input) {
    var price = num(input.price);
    var downPct = Math.min(100, num(input.downPct, 10));
    var loan = cents(price * (1 - downPct / 100));
    var rate = num(input.rate, FACTS.defaultRate);
    var years = Math.min(FACTS.maxTenure, Math.max(1, Math.round(num(input.years, FACTS.maxTenure))));
    var base = amortise(loan, rate, years, 0);
    var extra = num(input.extra);
    var fast = extra > 0 ? amortise(loan, rate, years, extra) : base;
    var off = exemption(input.firstHome, price, loan);
    var mot = stampDutyTransfer(price), la = stampDutyLoan(loan);
    var legalSpa = legalFee(price), legalLoan = legalFee(loan);
    var sst = cents((legalSpa + legalLoan) * FACTS.sst);
    var costs = {
      downPayment: cents(price - loan),
      stampTransfer: mot - off.mot, stampLoan: la - off.loan, exempted: off.mot + off.loan,
      legalSpa: legalSpa, legalLoan: legalLoan, sst: sst
    };
    costs.total = cents(costs.downPayment + costs.stampTransfer + costs.stampLoan + legalSpa + legalLoan + sst);
    var income = num(input.income), commitments = num(input.commitments);
    var dsrLimit = num(input.dsrLimit, 70) / 100;
    var dsr = income > 0 ? Math.round((base.instalment + commitments) / income * 1000) / 10 : null;
    var room = Math.max(0, income * dsrLimit - commitments);
    var r = rate / 1200, n = years * 12;
    var maxLoan = income > 0 ? Math.floor(r ? room * (1 - Math.pow(1 + r, -n)) / r : room * n) : null;
    var age = num(input.age);
    return {
      price: price, loan: loan, rate: rate, years: years,
      instalment: base.instalment, interest: base.interest, totalPaid: cents(loan + base.interest),
      schedule: base.rows,
      extra: extra, extraMonths: fast.months, extraInterest: fast.interest,
      interestSaved: cents(base.interest - fast.interest), monthsSaved: base.months - fast.months,
      rateUp25: instalment(loan, rate + 0.25, years), rateUp50: instalment(loan, rate + 0.5, years),
      costs: costs, dsr: dsr, dsrLimit: dsrLimit * 100, maxLoan: maxLoan,
      maxPrice: maxLoan == null ? null : Math.floor(maxLoan / Math.max(0.01, 1 - downPct / 100)),
      endAge: age > 0 ? age + years : null, pastMaxAge: age > 0 && age + years > FACTS.maxAge
    };
  }

  var api = { FACTS: FACTS, instalment: instalment, amortise: amortise, stampDutyTransfer: stampDutyTransfer,
    stampDutyLoan: stampDutyLoan, legalFee: legalFee, exemption: exemption, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBLoan = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
