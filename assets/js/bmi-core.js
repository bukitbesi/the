/* Adult BMI with the Malaysian Clinical Practice Guidelines on Management of Obesity cut-offs (Asian: overweight from
   23.0, obese from 27.5), the WHO international categories for comparison, waist circumference (risk from 90 cm in men,
   80 cm in women) and waist-to-height ratio (NICE: keep the waist below half the height). Verified 15 October 2026. */
(function (root) {
  'use strict';

  var FACTS = { verified: '2026-10-15', healthyLow: 18.5, healthyHigh: 22.9, waistMen: 90, waistWomen: 80 };
  // [upper limit (exclusive), key]
  var CPG = [[18.5, 'under'], [23, 'normal'], [27.5, 'over'], [35, 'obese1'], [40, 'obese2'], [Infinity, 'obese3']];
  var WHO = [[18.5, 'under'], [25, 'normal'], [30, 'over'], [Infinity, 'obese']];
  var WHTR = [[0.4, 'low'], [0.5, 'healthy'], [0.6, 'increased'], [Infinity, 'high']];
  var LABELS = {
    en: { under: 'Underweight', normal: 'Healthy weight', over: 'Overweight', obese1: 'Obese class I', obese2: 'Obese class II', obese3: 'Obese class III', obese: 'Obese',
      low: 'Low', healthy: 'Healthy', increased: 'Increased risk', high: 'High risk' },
    ms: { under: 'Kurang berat badan', normal: 'Berat badan sihat', over: 'Berlebihan berat badan', obese1: 'Obes kelas I', obese2: 'Obes kelas II', obese3: 'Obes kelas III', obese: 'Obes',
      low: 'Rendah', healthy: 'Sihat', increased: 'Risiko meningkat', high: 'Risiko tinggi' }
  };

  var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };
  var r1 = function (n) { return Math.round(n * 10) / 10; };
  var band = function (table, v) { for (var i = 0; i < table.length; i++) if (v < table[i][0]) return table[i][1]; return table[table.length - 1][1]; };

  // Height in metres and weight in kg from either unit system.
  function measures(input) {
    if (input.unit === 'imperial') {
      var inches = num(input.ft) * 12 + num(input.inch);
      return { m: inches * 0.0254, kg: num(input.lb) * 0.45359237, waistCm: num(input.waist) * 2.54 };
    }
    return { m: num(input.cm) / 100, kg: num(input.kg), waistCm: num(input.waist) };
  }

  function calculate(input) {
    var x = measures(input), h2 = x.m * x.m;
    var bmi = x.m && x.kg ? x.kg / h2 : 0;
    var low = FACTS.healthyLow * h2, high = FACTS.healthyHigh * h2;
    var out = {
      bmi: r1(bmi), valid: bmi > 0, category: band(CPG, bmi), who: band(WHO, bmi),
      heightCm: r1(x.m * 100), weightKg: r1(x.kg), healthy: { low: r1(low), high: r1(high) },
      change: bmi > FACTS.healthyHigh ? r1(x.kg - high) : bmi < FACTS.healthyLow ? r1(low - x.kg) : 0,
      direction: bmi > FACTS.healthyHigh ? 'lose' : bmi < FACTS.healthyLow ? 'gain' : 'keep',
      // Marker position on a 15–40 scale.
      gauge: Math.max(0, Math.min(100, (bmi - 15) / 25 * 100))
    };
    if (x.waistCm && x.m) {
      var limit = input.sex === 'female' ? FACTS.waistWomen : FACTS.waistMen, ratio = x.waistCm / (x.m * 100);
      out.waist = { cm: r1(x.waistCm), limit: limit, atRisk: x.waistCm >= limit, ratio: Math.round(ratio * 100) / 100, ratioBand: band(WHTR, ratio), halfHeight: r1(x.m * 50) };
    }
    return out;
  }

  // Healthy weight range for a height in cm (for tables).
  function range(cm) { var h2 = Math.pow(cm / 100, 2); return { low: r1(FACTS.healthyLow * h2), high: r1(FACTS.healthyHigh * h2), over: r1(27.5 * h2) }; }

  var api = { FACTS: FACTS, CPG: CPG, WHO: WHO, LABELS: LABELS, calculate: calculate, range: range };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBBmi = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
