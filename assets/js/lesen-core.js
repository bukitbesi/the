/* Driving licence fees in Malaysia (JPJ fee schedule). Learner's licence (LDL): B2 RM2 for 3 or 6 months, B RM20 per
   3 months or RM40 per 6 months, D and DA RM30 per 3 months or RM60 per 6 months, renewable up to 2 years.
   Probationary licence (PDL), 2 years: B2 RM2, B RM40, D and DA RM60. Competent licence (CDL) per year, 1 to 10 years:
   B2 and B RM20, D and DA RM30. Physical licence card RM20 from 23 January 2026 (free for 60+, OKU registered with JKM
   and Class A/A1; the MyJPJ digital licence is free). International Driving Permit RM150 a year. Minimum age 16 for
   motorcycles, 17 for cars. Driving school packages are set by each school. Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = {
    verified: '2026-10-15', card: 20, idp: 150, maxYears: 10, ldlMax: 24,
    classes: {
      B2: { ldl: { 3: 2, 6: 2 }, pdl: 2, cdl: 20, age: 16 },
      B: { ldl: { 3: 20, 6: 40 }, pdl: 40, cdl: 20, age: 16 },
      D: { ldl: { 3: 30, 6: 60 }, pdl: 60, cdl: 30, age: 17 },
      DA: { ldl: { 3: 30, 6: 60 }, pdl: 60, cdl: 30, age: 17 }
    }
  };
  var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };

  function calculate(input) {
    var cls = FACTS.classes[input.cls] ? input.cls : 'D', c = FACTS.classes[cls];
    var period = Number(input.period) === 6 ? 6 : 3, ldlCount = Math.max(1, Math.min(FACTS.ldlMax / period, Math.round(num(input.ldlCount) || 1)));
    var years = Math.max(1, Math.min(FACTS.maxYears, Math.round(num(input.years) || 1)));
    var freeCard = input.freeCard === 'yes', card = input.card === 'yes' ? (freeCard ? 0 : FACTS.card) : 0, idp = input.idp === 'yes' ? FACTS.idp : 0;
    var ldl = c.ldl[period] * ldlCount, pdl = c.pdl, jpj = ldl + pdl, school = num(input.school);
    var renewal = c.cdl * years;
    return { cls: cls, period: period, ldlCount: ldlCount, ldlMonths: period * ldlCount, ldl: ldl, pdl: pdl, jpj: jpj, school: school, newTotal: jpj + school + card,
      years: years, renewal: renewal, card: card, idp: idp, renewTotal: renewal + card + idp, perYear: c.cdl, age: c.age };
  }

  var api = { FACTS: FACTS, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBLesen = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
