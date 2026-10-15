/* Hajj cost and Tabung Haji savings for Malaysian pilgrims. Muassasah actual cost RM33,300 a pilgrim for 1447H/2026 and
   1448H/2027 (unchanged a fourth year); first-time B40 pays RM15,000 (Bantuan Kewangan Haji RM18,300, of which RM1,000
   from the government), M40 RM23,500 (RM9,800), T20 the full RM33,300. A RM15,000 TH balance is needed to receive a hajj
   offer, and under Seruan Istito'ah (11 September 2026) it gives automatic queue eligibility; people already registered
   must reach it by 31 December 2028 to keep their queue date. Hibah after zakat: 3.10% (2022, 2023), 3.25% (2024),
   3.50% (2025), paid on the average monthly minimum balance. Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = {
    verified: '2026-10-15', cost: 33300, threshold: 15000, deadline: '2028-12-31', istitoah: '2026-09-11', quota: 31600, gov: 1000,
    seasons: { 2026: { label: '1447H/2026', hafis: 210e6 }, 2027: { label: '1448H/2027', hafis: 234e6 } },
    pay: { B40: 15000, M40: 23500, T20: 33300 },
    hibah: [[2022, 3.10], [2023, 3.10], [2024, 3.25], [2025, 3.50]]
  };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };

  // Months of saving until the balance reaches target. Each month's minimum balance is the balance before that month's
  // deposit; hibah = rate × average of the 12 monthly minimums, credited every 12 months. null if never within 50 years.
  function monthsTo(balance, monthly, rate, target) {
    var b = num(balance), d = num(monthly), r = num(rate) / 100, mins = 0, hibah = 0;
    if (b >= target) return { months: 0, hibah: 0, balance: cents(b) };
    for (var m = 1; m <= 600; m++) {
      mins += b; b += d;
      if (m % 12 === 0) { var h = cents(r * mins / 12); b += h; hibah += h; mins = 0; }
      if (b >= target - 1e-9) return { months: m, hibah: cents(hibah), balance: cents(b) };
    }
    return null;
  }

  // Balance after n months with the same rule.
  function grow(balance, monthly, rate, n) {
    var b = num(balance), d = num(monthly), r = num(rate) / 100, mins = 0, hibah = 0;
    for (var m = 1; m <= n; m++) {
      mins += b; b += d;
      if (m % 12 === 0) { var h = cents(r * mins / 12); b += h; hibah += h; mins = 0; }
    }
    return { balance: cents(b), hibah: cents(hibah), deposits: cents(d * n) };
  }

  // Smallest whole-ringgit monthly deposit that reaches target within n months.
  function monthlyFor(balance, target, n, rate) {
    if (num(balance) >= target) return 0;
    if (n < 1) return null;
    var lo = 0, hi = Math.ceil(target);
    while (lo < hi) { var mid = Math.floor((lo + hi) / 2), x = monthsTo(balance, mid, rate, target); if (x && x.months <= n) hi = mid; else lo = mid + 1; }
    return lo;
  }

  // Whole months from the start of the month after `from` (YYYY-MM-DD) up to and including the deadline month.
  function monthsLeft(from) {
    var a = String(from).split('-').map(Number), b = FACTS.deadline.split('-').map(Number);
    return Math.max(0, (b[0] - a[0]) * 12 + (b[1] - a[1]));
  }

  // 'YYYY-MM' n months after the month of `from` (YYYY-MM-DD).
  function reach(from, n) {
    var a = String(from).split('-').map(Number), t = a[0] * 12 + a[1] - 1 + n;
    return Math.floor(t / 12) + '-' + ('0' + (t % 12 + 1)).slice(-2);
  }

  function calculate(input) {
    var cat = FACTS.pay[input.cat] ? input.cat : 'B40', pay = FACTS.pay[cat], people = Math.max(1, Math.round(num(input.people) || 1));
    var rate = input.rate === undefined || input.rate === '' ? FACTS.hibah[FACTS.hibah.length - 1][1] : num(input.rate);
    var balance = num(input.balance), monthly = num(input.monthly);
    var r = { cat: cat, pay: pay, subsidy: FACTS.cost - pay, gov: cat === 'B40' ? FACTS.gov : 0, cost: FACTS.cost, share: Math.round(pay / FACTS.cost * 100),
      people: people, total: pay * people, rate: rate, balance: balance, monthly: monthly };
    r.toOffer = monthsTo(balance, monthly, rate, FACTS.threshold);
    r.toPay = monthsTo(balance, monthly, rate, pay);
    var today = input.today || FACTS.verified;
    r.left = monthsLeft(today);
    r.offerMonth = r.toOffer ? reach(today, r.toOffer.months) : null;
    r.payMonth = r.toPay ? reach(today, r.toPay.months) : null;
    r.needDeadline = monthlyFor(balance, FACTS.threshold, r.left, rate);
    r.meetsDeadline = !!(r.toOffer && r.toOffer.months <= r.left);
    r.fiveYears = grow(balance, monthly, rate, 60);
    return r;
  }

  var api = { FACTS: FACTS, monthsTo: monthsTo, grow: grow, monthlyFor: monthlyFor, monthsLeft: monthsLeft, reach: reach, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBHaji = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
