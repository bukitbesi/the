/* Fidyah for missed Ramadan fasts (Shafi'i school, as administered by the state religious councils): one cupak of the
   staple food per day, paid in money at the state rate (set by rice type in some states). Delaying the qada past the
   next Ramadan without a valid reason adds one fidyah per day for every Ramadan passed (the relied-upon Shafi'i view);
   those permanently unable to fast (old age, chronic illness) pay one fidyah per day instead of qada; pregnant or
   nursing women who fasted out of fear for the child make up the fast and pay one fidyah per day. 2026 rates.
   Verified 14 October 2026. */
(function (root) {
  'use strict';

  var FACTS = { verified: '2026-10-14', year: 2026 };
  // State rates for 2026, RM per day: [lowest, ... by rice type]. Labels for types live in TYPES.
  var STATES = {
    johor: { name: 'Johor', rates: [1.75, 3, 5], types: ['local', 'import', 'premium'] },
    kedah: { name: 'Kedah', rates: [2, 4], types: ['local', 'other'] },
    kelantan: { name: 'Kelantan', rates: [2] },
    melaka: { name: 'Melaka', rates: [2] },
    nsembilan: { name: 'Negeri Sembilan', rates: [1.9] },
    pahang: { name: 'Pahang', rates: [1.75] },
    penang: { name: 'Pulau Pinang', rates: [1.75] },
    perak: { name: 'Perak', rates: [2.75, 4.4, 7.45], types: ['local', 'import', 'premium'] },
    perlis: { name: 'Perlis', rates: [5] },
    sabah: { name: 'Sabah', rates: [1.9] },
    sarawak: { name: 'Sarawak', rates: [1.9] },
    selangor: { name: 'Selangor', rates: [2, 4.3, 6.3], types: ['local', 'import', 'premium'] },
    terengganu: { name: 'Terengganu', rates: [2.5] },
    wp: { name: 'Wilayah Persekutuan', rates: [4] }
  };

  var num = function (v, d) { v = Number(v); return v !== '' && isFinite(v) && v >= 0 ? v : (d || 0); };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };

  function rate(state, type) {
    var s = STATES[state] || STATES.selangor, i = Math.min(s.rates.length - 1, Math.max(0, Math.floor(num(type))));
    return s.rates[i];
  }

  // reason: 'delay' (qada late), 'unable' (cannot fast at all), 'child' (pregnant/nursing, fearing for the child).
  function calculate(input) {
    var days = Math.min(30 * 50, Math.floor(num(input.days))), years = Math.min(50, Math.floor(num(input.years)));
    var reason = ['delay', 'unable', 'child'].indexOf(input.reason) >= 0 ? input.reason : 'delay';
    var perDay = input.rate !== undefined && input.rate !== '' ? num(input.rate) : rate(input.state, input.type);
    var units = reason === 'unable' ? 1 : (reason === 'child' ? 1 : 0) + years;
    var count = days * units;
    return { days: days, years: years, reason: reason, perDay: perDay, units: units, count: count, total: cents(count * perDay),
      qada: reason !== 'unable' ? days : 0 };
  }

  var api = { FACTS: FACTS, STATES: STATES, rate: rate, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBFidyah = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
