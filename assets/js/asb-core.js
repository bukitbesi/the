/* Amanah Saham Bumiputera (ASB) maths. The yearly distribution (dividend + bonus, sen per RM1 unit) is paid on the
   average of each month's lowest balance, credited as new units around 1 January. The RM200,000 limit caps what
   you put in, not the account value. Rates per PNB/ASNB announcements; verified 13 October 2026. */
(function (root) {
  'use strict';

  // [year, dividend sen, bonus sen, total sen]; null where the split was not confirmed.
  var HISTORY = [
    [2019, 5.00, 0.50, 5.50],
    [2020, null, null, 5.00],
    [2021, 4.25, 0.75, 5.00],
    [2022, 3.35, 1.25, 4.60],
    [2023, 4.25, 1.00, 5.25],
    [2024, 5.50, 0.25, 5.75],
    [2025, 5.20, 0.55, 5.75]
  ];
  var last = HISTORY[HISTORY.length - 1];
  var five = HISTORY.slice(-5);
  var FACTS = {
    verified: '2026-10-13', inputLimit: 200000,
    latest: last[3], latestYear: last[0], latestDividend: last[1], latestBonus: last[2],
    average5: Math.round(five.reduce(function (s, h) { return s + h[3]; }, 0) / five.length * 100) / 100,
    conservative: 4.5, defaultFinancingRate: 4.25, defaultFinancingYears: 20
  };

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, d) { v = Number(v); return v !== '' && isFinite(v) && v >= 0 ? v : (d || 0); };

  // Distribution on twelve monthly lowest balances.
  function dividend(minBalances, ratePct) {
    var sum = 0;
    for (var i = 0; i < 12; i++) sum += num(minBalances[i]);
    var avg = sum / 12;
    return { average: cents(avg), amount: cents(avg * num(ratePct) / 100) };
  }

  // One year from an opening balance and a fixed monthly saving. A deposit made on the 1st counts that month;
  // a later deposit only from the next month. Deposits stop at the input limit.
  function year(opening, invested, monthly, timing) {
    var bal = num(opening), mins = [], deposits = 0;
    for (var m = 0; m < 12; m++) {
      var add = Math.min(num(monthly), Math.max(0, FACTS.inputLimit - invested - deposits));
      if (timing === 'early') { bal += add; mins.push(bal); }
      else { mins.push(bal); bal += add; }
      deposits += add;
    }
    return { mins: mins, deposits: cents(deposits), closing: cents(bal) };
  }

  function project(input) {
    var rate = num(input.rate, FACTS.latest), years = Math.min(40, Math.max(1, Math.round(num(input.years, 10))));
    var start = num(input.start), monthly = num(input.monthly), timing = input.timing === 'early' ? 'early' : 'late';
    var invested = Math.min(start, FACTS.inputLimit), bal = start, rows = [], totalDeposits = 0, totalDividends = 0;
    for (var y = 1; y <= years; y++) {
      var r = year(bal, invested, monthly, timing), d = dividend(r.mins, rate);
      invested += r.deposits; totalDeposits += r.deposits; totalDividends += d.amount;
      bal = cents(r.closing + d.amount);
      rows.push({ year: y, deposits: r.deposits, average: d.average, dividend: d.amount, balance: bal });
    }
    var first = rows[0];
    return {
      start: start, monthly: monthly, rate: rate, years: years, timing: timing, rows: rows,
      firstDividend: first.dividend, firstAverage: first.average,
      totalDeposits: cents(totalDeposits), totalDividends: cents(totalDividends), final: bal,
      limitReached: invested >= FACTS.inputLimit
    };
  }

  // ASB financing: units bought up front with a term loan; the distribution on the full amount is weighed
  // against the loan interest. Assumes the distribution is taken out each year, not reinvested.
  function financing(input) {
    var amount = num(input.amount), rate = num(input.rate, FACTS.defaultFinancingRate);
    var years = Math.min(30, Math.max(1, Math.round(num(input.years, FACTS.defaultFinancingYears)))), n = years * 12;
    var r = rate / 1200, pay = amount > 0 ? (r ? amount * r / (1 - Math.pow(1 + r, -n)) : amount / n) : 0;
    pay = cents(pay);
    var interest = cents(Math.max(0, pay * n - amount)), yearly = cents(amount * num(input.divRate, FACTS.latest) / 100);
    var dividends = cents(yearly * years);
    return {
      amount: amount, rate: rate, years: years, monthly: pay, interest: interest, yearlyDividend: yearly,
      dividends: dividends, net: cents(dividends - interest),
      breakEven: amount > 0 ? Math.round(interest / (amount * years) * 10000) / 100 : 0
    };
  }

  var api = { FACTS: FACTS, HISTORY: HISTORY, dividend: dividend, project: project, financing: financing };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBAsb = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
