/* Zakat on income, gold and savings in Malaysia. Rate 2.5%; nisab = value of 85 g of gold, set by each state zakat body
   (default: Lembaga Zakat Selangor, July–December 2026). Income: gross method, or net method after LZS 2026 had
   kifayah and EPF. Worn gold: 2.5% only on the weight above the state's uruf (Selangor and the Federal Territories
   800 g). Zakat paid to a state zakat body is a 100% rebate on income tax (Income Tax Act 1967, s.6A(3)), up to the
   tax charged. Verified 15 October 2026. */
(function (root) {
  'use strict';

  var FACTS = {
    verified: '2026-10-15', rate: 2.5, nisabGrams: 85, nisab: 38748, nisabLabel: 'Selangor (LZS), July–December 2026',
    epfRate: 11,
    // LZS 2026 had kifayah, RM a year (monthly × 12).
    kifayah: { workingAdult: 4944, otherAdult: 2004, child7: 4896, child6: 2100, ipt: 7356 }
  };
  FACTS.goldPrice = Math.round(FACTS.nisab / FACTS.nisabGrams * 100) / 100;
  // Uruf (customary worn-gold limit) in grams where state figures agree across sources.
  var URUF = { selangor: 800, wp: 800, kelantan: 600 };

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, d) { v = Number(v); return v !== '' && v !== null && isFinite(v) && v >= 0 ? v : (d || 0); };
  var blank = function (v) { return v === undefined || v === null || v === ''; };

  function income(input) {
    var salary = num(input.salary), yearly = cents((input.period === 'yearly' ? salary : salary * 12) + num(input.other));
    var nisab = num(input.nisab, FACTS.nisab), method = input.method === 'net' ? 'net' : 'gross', K = FACTS.kifayah;
    var deductions = [];
    if (method === 'net') {
      var salaryYear = input.period === 'yearly' ? salary : salary * 12;
      var epf = blank(input.epf) ? cents(salaryYear * FACTS.epfRate / 100) : num(input.epf);
      [['workingAdult', num(input.adults, 1)], ['otherAdult', num(input.others)], ['child7', num(input.kids7)], ['child6', num(input.kids6)], ['ipt', num(input.ipt)]]
        .forEach(function (d) { if (d[1]) deductions.push({ key: d[0], count: d[1], amount: cents(K[d[0]] * d[1]) }); });
      if (epf) deductions.push({ key: 'epf', count: 1, amount: epf });
    }
    var deducted = cents(deductions.reduce(function (s, d) { return s + d.amount; }, 0));
    var base = cents(Math.max(0, yearly - deducted)), due = base > 0 && base >= nisab;
    var zakat = due ? cents(base * FACTS.rate / 100) : 0;
    var tax = num(input.tax), rebate = cents(Math.min(zakat, tax));
    return {
      method: method, yearly: yearly, deductions: deductions, deducted: deducted, base: base, nisab: nisab, due: due,
      shortOfNisab: due ? 0 : cents(nisab - base), zakat: zakat, monthly: cents(zakat / 12),
      tax: tax, rebate: rebate, taxAfter: cents(tax - rebate)
    };
  }

  function gold(input) {
    var price = num(input.price, FACTS.goldPrice), nisab = num(input.nisab, cents(FACTS.nisabGrams * price));
    var kept = num(input.kept), worn = num(input.worn), uruf = num(input.uruf, URUF.selangor), savings = num(input.savings);
    var keptDue = kept >= FACTS.nisabGrams, excess = Math.max(0, worn - uruf), savingsDue = savings > 0 && savings >= nisab;
    var lines = {
      kept: { grams: kept, value: cents(kept * price), due: keptDue, zakat: keptDue ? cents(kept * price * FACTS.rate / 100) : 0 },
      worn: { grams: worn, uruf: uruf, excess: excess, value: cents(excess * price), due: excess > 0, zakat: cents(excess * price * FACTS.rate / 100) },
      savings: { amount: savings, due: savingsDue, zakat: savingsDue ? cents(savings * FACTS.rate / 100) : 0 }
    };
    return { price: price, nisab: nisab, lines: lines, total: cents(lines.kept.zakat + lines.worn.zakat + lines.savings.zakat) };
  }

  var api = { FACTS: FACTS, URUF: URUF, income: income, gold: gold };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBZakat = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
