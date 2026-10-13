/* Malaysian car loan (hire purchase) maths. Since 1 June 2026 the Hire-Purchase (Amendment) Act requires the
   reducing-balance method quoted as an effective interest rate (EIR); banks have until 31 March 2027 to switch,
   and older agreements keep the flat rate with Rule of 78 rebates. Both are modelled. Verified 12 October 2026.
   Running costs: JPJ road tax (LKM) for petrol and hybrid cars registered to individuals in Peninsular Malaysia,
   and a comprehensive insurance estimate from the former motor tariff (premiums are now set by each insurer). */
(function (root) {
  'use strict';

  var FACTS = {
    verified: '2026-10-12',
    newRulesFrom: '2026-06-01', transitionUntil: '2027-03-31',
    defaultRate: 4.5, defaultFlat: 2.5, maxYears: 9,
    runningVerified: '2026-10-14', insuranceSst: 0.08, insuranceStamp: 10
  };

  // [upper cc, base RM, RM per cc above the previous band's upper limit]
  var ROAD_TAX = {
    saloon: [[1000, 20, 0], [1200, 55, 0], [1400, 70, 0], [1600, 90, 0], [1800, 200, 0.4], [2000, 280, 0.5],
      [2500, 380, 1], [3000, 880, 2.5], [Infinity, 2130, 4.5]],
    nonSaloon: [[1000, 20, 0], [1200, 85, 0], [1400, 100, 0], [1600, 120, 0], [1800, 300, 0.3], [2000, 360, 0.4],
      [2500, 440, 0.8], [3000, 840, 1.6], [Infinity, 1640, 1.6]]
  };
  // Former tariff, Peninsular: premium for the first RM1,000 sum insured by engine size, then RM26 per RM1,000.
  var INSURANCE_BASE = [[1400, 273.8], [1650, 305.5], [2200, 339.1], [3050, 372.6], [4100, 404.3], [4250, 436], [4400, 469.6], [Infinity, 501.3]];
  var NCD = [0, 25, 30, 38.33, 45, 55];

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, d) { v = Number(v); return isFinite(v) && v >= 0 ? v : (d || 0); };

  function annuity(loan, monthlyRate, n) {
    if (!(loan > 0) || !(n > 0)) return 0;
    return monthlyRate ? loan * monthlyRate / (1 - Math.pow(1 + monthlyRate, -n)) : loan / n;
  }

  // Flat rate: interest on the original loan for the whole term, spread evenly.
  function flatInstalment(loan, flatPct, years) {
    var n = Math.round(num(years) * 12);
    return n ? cents((num(loan) + num(loan) * num(flatPct) / 100 * num(years)) / n) : 0;
  }
  function eirInstalment(loan, eirPct, years) { return cents(annuity(num(loan), num(eirPct) / 1200, Math.round(num(years) * 12))); }

  // Yearly EIR (nominal, monthly rest) that gives the same instalment as a flat rate.
  function flatToEir(flatPct, years) {
    var n = Math.round(num(years) * 12), loan = 100000;
    var target = (loan + loan * num(flatPct) / 100 * num(years)) / n;
    if (!(flatPct > 0) || !n) return 0;
    var lo = 0, hi = 1;
    for (var i = 0; i < 100; i++) {
      var mid = (lo + hi) / 2;
      if (annuity(loan, mid / 12, n) > target) hi = mid; else lo = mid;
    }
    return Math.round(lo * 10000) / 100;
  }
  function eirToFlat(eirPct, years) {
    var n = Math.round(num(years) * 12), loan = 100000;
    if (!n) return 0;
    return Math.round((annuity(loan, num(eirPct) / 1200, n) * n - loan) / (loan * num(years)) * 10000) / 100;
  }

  // Balance owed after m payments under reducing balance.
  function balanceAfter(loan, eirPct, years, m) {
    var r = num(eirPct) / 1200, n = Math.round(num(years) * 12), pay = annuity(loan, r, n);
    if (!r) return Math.max(0, loan - pay * m);
    return Math.max(0, loan * Math.pow(1 + r, m) - pay * (Math.pow(1 + r, m) - 1) / r);
  }

  // Rule of 78 rebate on early settlement: unearned share of total charges = k(k+1) / n(n+1), k = months left.
  function rule78Rebate(totalInterest, n, k) {
    return n > 0 && k > 0 ? totalInterest * k * (k + 1) / (n * (n + 1)) : 0;
  }

  function roadTax(cc, body) {
    cc = Math.round(num(cc));
    if (!cc) return 0;
    var bands = ROAD_TAX[body === 'nonSaloon' ? 'nonSaloon' : 'saloon'], prev = 0;
    for (var i = 0; i < bands.length; i++) {
      if (cc <= bands[i][0]) return cents(bands[i][1] + bands[i][2] * Math.max(0, cc - prev));
      prev = bands[i][0];
    }
    return 0;
  }

  function insurance(sumInsured, cc, ncdPct) {
    sumInsured = num(sumInsured); cc = Math.round(num(cc));
    if (!(sumInsured > 0) || !cc) return { gross: 0, ncd: 0, sst: 0, stamp: 0, total: 0 };
    var base = 0;
    for (var i = 0; i < INSURANCE_BASE.length; i++) if (cc <= INSURANCE_BASE[i][0]) { base = INSURANCE_BASE[i][1]; break; }
    var gross = cents(base + 26 * Math.max(0, sumInsured - 1000) / 1000);
    var ncd = cents(gross * Math.min(55, num(ncdPct)) / 100), net = gross - ncd;
    var sst = cents(net * FACTS.insuranceSst);
    return { gross: gross, ncd: ncd, sst: sst, stamp: FACTS.insuranceStamp, total: cents(net + sst + FACTS.insuranceStamp) };
  }

  function calculate(input) {
    var price = num(input.price);
    var downPct = Math.min(100, num(input.downPct, 10));
    var loan = cents(price * (1 - downPct / 100));
    var years = Math.min(FACTS.maxYears, Math.max(1, Math.round(num(input.years, FACTS.maxYears))));
    var n = years * 12;
    var method = input.method === 'flat' ? 'flat' : 'eir';
    var rate = num(input.rate, method === 'flat' ? FACTS.defaultFlat : FACTS.defaultRate);
    var monthly = method === 'flat' ? flatInstalment(loan, rate, years) : eirInstalment(loan, rate, years);
    var eir = method === 'flat' ? flatToEir(rate, years) : rate;
    var flat = method === 'flat' ? rate : eirToFlat(rate, years);
    // Flat-rate charges are fixed by the agreement; the instalment is rounded from them.
    var interest = method === 'flat' ? cents(loan * rate / 100 * years) : cents(monthly * n - loan);
    var out = {
      price: price, loan: loan, downPayment: cents(price - loan), years: years, months: n, method: method, rate: rate,
      monthly: monthly, interest: Math.max(0, interest), totalPaid: cents(loan + Math.max(0, interest)), eir: eir, flat: flat,
      schedule: []
    };
    // Yearly schedule on the reducing-balance view (for flat loans, at the equivalent EIR).
    for (var y = 1; y <= years; y++) {
      var before = balanceAfter(loan, eir, years, (y - 1) * 12), after = y === years ? 0 : balanceAfter(loan, eir, years, y * 12);
      out.schedule.push({ year: y, principal: cents(before - after), interest: cents(monthly * 12 - (before - after)), balance: cents(after) });
    }
    if (input.cc !== undefined && input.cc !== '') {
      var tax = roadTax(input.cc, input.body), ins = insurance(input.sumInsured === undefined || input.sumInsured === '' ? price : input.sumInsured, input.cc, input.ncd);
      out.running = { cc: Math.round(num(input.cc)), body: input.body === 'nonSaloon' ? 'nonSaloon' : 'saloon', roadTax: tax, insurance: ins,
        yearly: cents(tax + ins.total), monthly: cents(monthly + (tax + ins.total) / 12) };
    }
    var settleAfter = Math.round(num(input.settleAfter));
    if (settleAfter > 0 && settleAfter < n) {
      var k = n - settleAfter, remaining = cents(monthly * k);
      var fair = cents(balanceAfter(loan, eir, years, settleAfter));
      var settlement = method === 'flat' ? cents(remaining - rule78Rebate(out.interest, n, k)) : fair;
      out.settlement = {
        after: settleAfter, monthsLeft: k, remaining: remaining, amount: settlement,
        saved: cents(remaining - settlement), extraVsReducing: method === 'flat' ? cents(settlement - fair) : 0
      };
    }
    return out;
  }

  var api = { FACTS: FACTS, flatInstalment: flatInstalment, eirInstalment: eirInstalment, flatToEir: flatToEir,
    eirToFlat: eirToFlat, balanceAfter: balanceAfter, rule78Rebate: rule78Rebate, roadTax: roadTax, insurance: insurance,
    NCD: NCD, ROAD_TAX: ROAD_TAX, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBCarLoan = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
