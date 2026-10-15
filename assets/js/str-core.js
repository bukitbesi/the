/* Sumbangan Tunai Rahmah (STR) and Sumbangan Asas Rahmah (SARA) 2026. STR cash a year for households (married couple
   or single parent) by monthly gross household income and children: up to RM2,500 = RM700, RM1,200, RM1,700, RM2,200
   (0, 1–2, 3–4, 5+ children); RM2,501–5,000 = RM200, RM450, RM700, RM950. Every household rate is RM300 below 2025.
   Senior citizens (60+) without a spouse RM600 cash. Singles 21–59 (OKU 19–59) earning up to RM2,500 get no cash but
   RM600 SARA (RM50 a month). SARA for STR households RM1,200 (RM100 a month), RM2,400 for eKasih households. SARA untuk
   Semua: RM100 once to every citizen aged 18+ (credited 9 February 2026). Sources: HASiL FAQ STR 2026, sara.gov.my FAQ,
   MOF media releases. The senior citizens' income cap is published as RM2,500 and RM5,000 by different sources, and
   their SARA amount is not confirmed. Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = {
    verified: '2026-10-15', sus: 100,
    household: { low: [700, 1200, 1700, 2200], mid: [200, 450, 700, 950] },
    household2025: { low: [1000, 1500, 2000, 2500], mid: [500, 750, 1000, 1250] },
    senior: 600, single: { cash: 0, sara: 600, cash2025: 600 }, sara: { household: 1200, ekasih: 2400 },
    bands: [2500, 5000],
    phases: [['1', '2026-01-20', [100, 500]], ['2', '2026-03-10', [100, 600]], ['3', '2026-08-15', [150, 600]], ['4', null, null]],
    budget2027: { saraMax: 1800, saraMonth: 150, allocation: 16e9 }
  };
  var num = function (v) { v = Number(v); return isFinite(v) && v >= 0 ? v : 0; };
  var tier = function (kids) { kids = Math.floor(num(kids)); return kids === 0 ? 0 : kids <= 2 ? 1 : kids <= 4 ? 2 : 3; };

  function calculate(input) {
    var cat = input.cat === 'single' || input.cat === 'senior' ? input.cat : 'household';
    var income = num(input.income), age = Math.floor(num(input.age)), oku = input.oku === 'yes', kids = Math.floor(num(input.children));
    var r = { cat: cat, income: income, children: kids, eligible: true, reason: null, str: 0, sara: 0, str2025: null };
    if (cat === 'household') {
      if (income > FACTS.bands[1]) { r.eligible = false; r.reason = 'income'; }
      else {
        var band = income <= FACTS.bands[0] ? 'low' : 'mid', t = tier(kids);
        r.band = band; r.tier = t; r.str = FACTS.household[band][t]; r.str2025 = FACTS.household2025[band][t];
        r.ekasih = input.ekasih === 'yes'; r.sara = r.ekasih ? FACTS.sara.ekasih : FACTS.sara.household;
      }
    } else if (cat === 'single') {
      var minAge = oku ? 19 : 21;
      if (age >= 60) { r.eligible = false; r.reason = 'senior'; }
      else if (age < minAge) { r.eligible = false; r.reason = 'age'; }
      else if (income > FACTS.bands[0]) { r.eligible = false; r.reason = 'income'; }
      else { r.str = FACTS.single.cash; r.sara = FACTS.single.sara; r.str2025 = FACTS.single.cash2025; }
    } else {
      if (age < 60) { r.eligible = false; r.reason = 'age'; }
      else if (income > FACTS.bands[1]) { r.eligible = false; r.reason = 'income'; }
      else if (income > FACTS.bands[0]) { r.eligible = 'unknown'; r.reason = 'cap'; r.str = FACTS.senior; r.sara = null; }
      else { r.str = FACTS.senior; r.sara = null; }
    }
    if (!r.eligible) { r.str = 0; r.sara = 0; }
    r.total = r.str + (r.sara || 0);
    // Singles' 2025 cash moved into SARA, so their cash change is not a loss.
    r.change = r.str2025 === null || !r.eligible || cat === 'single' ? null : r.str - r.str2025;
    return r;
  }

  var api = { FACTS: FACTS, tier: tier, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBStr = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
