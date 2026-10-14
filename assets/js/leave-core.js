/* Leave under the Employment Act 1955 (as amended from 1 January 2023): paid annual leave of 8 days a year (under
   2 years' service), 12 days (2 to under 5 years) and 16 days (5 years or more), pro rata by completed months in a
   part year with a fraction of a day under one half disregarded and one half or more counted as a day (s.60E);
   sick leave of 14, 18 or 22 days and 60 days' hospitalisation (s.60F); 98 days' maternity and 7 days' paternity
   leave. Unused annual leave on leaving is paid at the ordinary rate of pay (monthly wages / 26).
   Verified 14 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-14', annual: [8, 12, 16], sick: [14, 18, 22], hospital: 60, maternity: 98, paternity: 7, paternityMonths: 12, orpDays: 26 };
  var parse = function (s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? [+m[1], +m[2], +m[3]] : null; };
  // Completed whole months from a to b.
  function months(a, b) {
    var m = (b[0] - a[0]) * 12 + (b[1] - a[1]);
    if (b[2] < a[2]) m--;
    return Math.max(0, m);
  }
  var tier = function (years) { return years < 2 ? 0 : years < 5 ? 1 : 2; };
  var round = function (x) { var f = Math.floor(x); return x - f >= 0.5 ? f + 1 : f; };

  // Annual leave for a service year: full year or pro rata by completed months.
  function annual(serviceYears, completedMonths) {
    var full = FACTS.annual[tier(serviceYears)];
    return completedMonths >= 12 ? full : round(full * completedMonths / 12);
  }

  var plus1 = function (d) { var t = new Date(Date.UTC(d[0], d[1] - 1, d[2] + 1)); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; };

  // Leave year = calendar year of the end date, starting on 1 January or on the join date if later.
  function calculate(input) {
    var start = parse(input.start), end = parse(input.end);
    if (!start || !end || end[0] * 1e4 + end[1] * 100 + end[2] < start[0] * 1e4 + start[1] * 100 + start[2]) return null;
    var total = months(start, plus1(end)), t = tier(Math.floor(total / 12)), full = FACTS.annual[t];
    var yStart = start[0] === end[0] ? start : [end[0], 1, 1], leaving = input.leaving === 'yes';
    var counted = Math.min(12, leaving ? months(yStart, plus1(end)) : months(yStart, [end[0] + 1, 1, 1]));
    var earned = counted >= 12 ? full : round(full * counted / 12);
    var taken = Math.max(0, Math.floor(Number(input.taken) || 0)), balance = Math.max(0, earned - taken);
    var wage = Math.max(0, Number(input.wage) || 0), orp = Math.round(wage / FACTS.orpDays * 100) / 100;
    return {
      months: total, years: Math.floor(total / 12), tier: t, full: full, counted: counted, earned: earned, taken: taken, balance: balance,
      orp: orp, payout: leaving ? Math.round(balance * wage / FACTS.orpDays * 100) / 100 : 0, leaving: leaving,
      sick: FACTS.sick[t], hospital: FACTS.hospital, maternity: FACTS.maternity, paternity: total >= FACTS.paternityMonths ? FACTS.paternity : 0
    };
  }

  var api = { FACTS: FACTS, calculate: calculate, annual: annual, months: months, round: round };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBLeave = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
