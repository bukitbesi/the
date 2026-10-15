/* Ar-Rahnu (Islamic gold pawning) in Malaysia. Two charging models: banks under tawarruq (since Bank Negara's Shariah
   Advisory Council ruling, effective 1 February 2020) charge a yearly profit rate on the financing; non-bank operators
   charge a safekeeping fee (upah simpan) per RM100 of the gold's value (marhun) a month. Published rates: Bank Muamalat
   11.25% a year, up to 80% of the gold's value, up to 18 months; Bank Islam up to 11.25% a year (ceiling), 80%; YaPEIM
   Care RM0.75 and Bisnes RM1.00 (Didik RM0.85, margin not confirmed) per RM100 a month; TEKUN RM0.50 per RM100 a month, 80%, 6 months. Bank
   Rakyat, Agrobank and MAIDAM do not publish a current rate; Pos Ar-Rahnu's RM0.56 has one source. Conventional pawnshops:
   up to 2% a month on the loan (Pawnbrokers Act 1972). Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = {
    verified: '2026-10-15', pawnCap: 2,
    providers: [
      { id: 'muamalat', name: 'Bank Muamalat', kind: 'rate', rate: 11.25, mof: 80, tenure: 18 },
      { id: 'bankislam', name: 'Bank Islam', kind: 'rate', rate: 11.25, mof: 80, tenure: 18, ceiling: true },
      { id: 'tekun', name: 'TEKUN', kind: 'fee', fee: 0.5, mof: 80, tenure: 6 },
      { id: 'care', name: 'YaPEIM Care', kind: 'fee', fee: 0.75, mof: 80, tenure: 6 },
      { id: 'bisnes', name: 'YaPEIM Bisnes', kind: 'fee', fee: 1, mof: 80, tenure: 6 }
    ],
    purity: { 999: 0.999, 916: 0.916, 875: 0.875, 835: 0.835, 750: 0.75 }
  };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };

  // One provider: financing (capped at its margin of financing, or the amount asked), charge over the months, repayment.
  function quote(p, marhun, months, want) {
    var mof = p.mof, max = cents(marhun * mof / 100), fin = want > 0 ? Math.min(want, max) : max;
    var monthly = p.kind === 'rate' ? cents(fin * p.rate / 100 / 12) : cents(marhun / 100 * p.fee);
    var charge = cents(monthly * months);
    return { id: p.id, name: p.name, kind: p.kind, mof: p.mof, max: max, financing: cents(fin), monthly: monthly, charge: charge,
      repay: cents(fin + charge), apr: fin ? monthly / fin * 1200 : 0, renew: months > p.tenure, tenure: p.tenure, rate: p.rate, fee: p.fee, ceiling: !!p.ceiling };
  }

  function calculate(input) {
    var k = FACTS.purity[input.karat] ? String(input.karat) : '916', grams = num(input.grams), gram = num(input.gram);
    var months = Math.min(18, Math.max(1, Math.round(num(input.months) || 6))), want = num(input.want);
    var marhun = cents(grams * FACTS.purity[k] * gram);
    var list = FACTS.providers.map(function (p) { return quote(p, marhun, months, want); });
    var pick = list.filter(function (x) { return x.id === input.provider; })[0] || list[0];
    var best = list.slice().sort(function (a, b) { return a.charge - b.charge; })[0];
    var pawn = cents(pick.financing * FACTS.pawnCap / 100 * months);
    return { karat: k, grams: grams, gram: gram, months: months, marhun: marhun, list: list, pick: pick, best: best, pawn: pawn };
  }

  var api = { FACTS: FACTS, quote: quote, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBRahnu = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
