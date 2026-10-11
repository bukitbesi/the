/* Malaysian resident individual income tax for a full year of assessment.
   YA2026 uses the enacted rates and relief limits. YA2027 applies the Budget 2027 proposals
   (tabled 9 October 2026) and is labelled as a proposal wherever it is shown. */
(function (root) {
  'use strict';

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };

  // [lower bound, upper bound, rate] on chargeable income.
  var BANDS_2026 = [
    [0, 5000, 0], [5000, 20000, 0.01], [20000, 35000, 0.03], [35000, 50000, 0.06], [50000, 70000, 0.11],
    [70000, 100000, 0.19], [100000, 400000, 0.25], [400000, 600000, 0.26], [600000, 2000000, 0.28], [2000000, Infinity, 0.30]
  ];
  var BANDS_2027 = [
    [0, 5000, 0], [5000, 20000, 0.01], [20000, 35000, 0.03], [35000, 50000, 0.06], [50000, 70000, 0.11],
    [70000, 100000, 0.18], [100000, 150000, 0.24], [150000, 400000, 0.25], [400000, 600000, 0.26], [600000, 1000000, 0.28], [1000000, Infinity, 0.30]
  ];

  // Relief limits (RM). Amount fields are capped at the limit; count fields multiply the per-person amount.
  var RELIEFS = [
    { id: 'disabled', limit: 7000, flag: true },
    { id: 'spouse', limit: 4000, flag: true },
    { id: 'spouseDisabled', limit: 6000, flag: true },
    { id: 'childUnder18', per: 2000 },
    { id: 'child18School', per: 2000 },
    { id: 'child18Higher', per: 8000 },
    { id: 'childDisabled', per: 8000 },
    { id: 'parentsMedical', limit: 8000 },
    { id: 'medical', limit: 10000 },
    { id: 'equipment', limit: 6000 },
    { id: 'education', limit: 7000 },
    { id: 'lifestyle', limit: 2500 },
    { id: 'sports', limit: 1000 },
    { id: 'breastfeeding', limit: 1000 },
    { id: 'childcare', limit: 3000 },
    { id: 'sspn', limit: 8000 },
    { id: 'epf', limit: 4000 },
    { id: 'lifeInsurance', limit: 3000 },
    { id: 'prs', limit: 3000 },
    { id: 'eduMedInsurance', limit: 4000 },
    { id: 'socso', limit: 350 },
    { id: 'evCharging', limit: 2500 },
    { id: 'housingLoan', limit: 7000 }
  ];

  var YEARS = {
    2026: { ya: 2026, self: 9000, bands: BANDS_2026, proposal: false },
    2027: { ya: 2027, self: 12000, bands: BANDS_2027, proposal: true }
  };
  var REBATE_LIMIT = 35000, REBATE = 400;

  function bandTax(chargeable, bands) {
    var t = 0, top = 0;
    bands.forEach(function (b) {
      if (chargeable > b[0]) { t += (Math.min(chargeable, b[1]) - b[0]) * b[2]; top = b[2]; }
    });
    return { tax: cents(t), marginal: top };
  }

  var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };

  function reliefBreakdown(input, year) {
    var items = [{ id: 'self', amount: year.self }];
    RELIEFS.forEach(function (r) {
      var v = input[r.id];
      var amount;
      if (r.flag) amount = v ? r.limit : 0;
      else if (r.per) amount = Math.floor(num(v)) * r.per;
      else {
        var lim = r.id === 'housingLoan' && input.housingTier === 'upper' ? 5000 : r.limit;
        amount = Math.min(num(v), lim);
      }
      // Spouse relief and disabled-spouse relief stack only when the spouse relief itself is claimed.
      if (r.id === 'spouseDisabled' && !input.spouse) amount = 0;
      if (amount) items.push({ id: r.id, amount: cents(amount) });
    });
    return items;
  }

  function calculate(input, ya) {
    var year = YEARS[ya || 2026];
    var employment = num(input.employment), other = num(input.other);
    var total = cents(employment + other);
    // Approved donations are deductible up to 10% of aggregate income.
    var donations = cents(Math.min(num(input.donations), total * 0.1));
    var reliefs = reliefBreakdown(input, year);
    var reliefTotal = cents(reliefs.reduce(function (s, r) { return s + r.amount; }, 0));
    var chargeable = cents(Math.max(0, total - donations - reliefTotal));
    var t = bandTax(chargeable, year.bands);
    var rebate = chargeable <= REBATE_LIMIT ? REBATE + (input.spouse ? REBATE : 0) : 0;
    var afterRebate = Math.max(0, t.tax - rebate);
    var zakat = cents(Math.min(num(input.zakat), afterRebate));
    var payable = cents(afterRebate - zakat);
    var pcb = cents(num(input.pcb));
    return {
      ya: year.ya, proposal: year.proposal,
      income: total, donations: donations, reliefs: reliefs, reliefTotal: reliefTotal,
      chargeable: chargeable, grossTax: t.tax, rebate: cents(Math.min(rebate, t.tax)), zakat: zakat,
      payable: payable, monthly: cents(payable / 12), pcb: pcb, balance: cents(payable - pcb),
      effectiveRate: total ? cents(payable / total * 100) : 0, marginalRate: Math.round(t.marginal * 100)
    };
  }

  var api = { YEARS: YEARS, RELIEFS: RELIEFS, BANDS_2026: BANDS_2026, BANDS_2027: BANDS_2027, bandTax: bandTax, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBTax = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
