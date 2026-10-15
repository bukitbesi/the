/* Daily calories for Malaysians. BMR by Mifflin-St Jeor (1990): 10 × kg + 6.25 × cm − 5 × age + 5 (men) or − 161
   (women); daily need = BMR × activity factor (1.2, 1.375, 1.55, 1.725, 1.9). Weight change uses about 7,700 kcal per
   kg of body weight, so 0.5 kg a week ≈ 550 kcal a day; a target below BMR is flagged. Macronutrients follow the
   Recommended Nutrient Intakes for Malaysia (RNI 2017): carbohydrate 50–65%, protein 10–20%, fat no more than 30% of
   energy (shown at 55/15/30). BMI bands use the Malaysian CPG (Asian) cut-offs: under 18.5, 18.5–22.9 normal,
   23–27.4 overweight, 27.5+ obese. RNI 2017 reference energy for ages 19–29 at PAL 1.4/1.6/1.8/2.0: men 1,960/2,240/
   2,520/2,800 kcal, women 1,610/1,840/2,080/2,310 kcal. Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = {
    verified: '2026-10-15', kcalPerKg: 7700,
    activity: [['sedentary', 1.2], ['light', 1.375], ['moderate', 1.55], ['active', 1.725], ['extra', 1.9]],
    goals: { maintain: 0, lose025: -0.25, lose05: -0.5, lose1: -1, gain025: 0.25, gain05: 0.5 },
    macros: { carb: 0.55, protein: 0.15, fat: 0.30 },
    bmi: [[18.5, 'under'], [23, 'normal'], [27.5, 'over'], [35, 'obese1'], [40, 'obese2'], [Infinity, 'obese3']],
    rni: { pal: [1.4, 1.6, 1.8, 2.0], male: [1960, 2240, 2520, 2800], female: [1610, 1840, 2080, 2310] }
  };
  var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };

  function calculate(input) {
    var male = input.sex !== 'female', age = num(input.age), kg = num(input.weight), cm = num(input.height);
    if (!age || !kg || !cm) return null;
    var factor = (FACTS.activity.filter(function (a) { return a[0] === input.activity; })[0] || FACTS.activity[2])[1];
    var bmr = Math.round(10 * kg + 6.25 * cm - 5 * age + (male ? 5 : -161)), tdee = Math.round(bmr * factor);
    var goal = FACTS.goals[input.goal] === undefined ? 0 : FACTS.goals[input.goal];
    var change = Math.round(goal * FACTS.kcalPerKg / 7), target = tdee + change;
    var m = FACTS.macros, bmi = kg / Math.pow(cm / 100, 2);
    var band = FACTS.bmi.filter(function (b) { return bmi < b[0]; })[0][1];
    var h2 = Math.pow(cm / 100, 2);
    var levels = FACTS.activity.map(function (a) { return { key: a[0], factor: a[1], kcal: Math.round(bmr * a[1]) }; });
    return { male: male, age: age, bmr: bmr, factor: factor, tdee: tdee, goal: goal, change: change, target: target, belowBmr: target < bmr,
      carb: Math.round(target * m.carb / 4), protein: Math.round(target * m.protein / 4), fat: Math.round(target * m.fat / 9),
      bmi: Math.round(bmi * 10) / 10, band: band, healthy: [Math.round(18.5 * h2 * 10) / 10, Math.round(22.9 * h2 * 10) / 10], levels: levels };
  }

  var api = { FACTS: FACTS, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBKalori = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
