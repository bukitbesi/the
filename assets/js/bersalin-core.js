/* Pregnancy due date and maternity and paternity leave in Malaysia. Due date by Naegele's rule: first day of the last
   period + 280 days, plus (cycle length − 28) days. Trimesters follow the ACOG convention (second from 14w0d, third from
   28w0d); term: early 37w0d, full 39w0d, late 41w0d, post-term 42w0d. Private sector (Employment Act 1955 as amended
   from 1 January 2023; Sabah and Sarawak Labour Ordinances from 1 May 2025): 98 consecutive days of maternity leave,
   starting no earlier than 30 days before confinement; allowance at the ordinary rate of pay for each day (at least
   RM6 a day) if she worked 90 days in the 9 months before and has fewer than 5 surviving children; 7 consecutive days
   of paternity leave after 12 months' service, up to 5 confinements. Civil service: 60 to 90 days per birth, up to 360
   days in service (PP Bil. 5/2017); Budget 2027 announced 98 days and 490 days, start date pending. Paternity leave 7
   days (PP Bil. 9/2002). Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-15', gestation: 280, earliest: 30, private: 98, civil: [60, 90], civilCap: 360, budget2027: [98, 490], paternity: 7, minRate: 6,
    weeks: [['t2', 14], ['t3', 28], ['early', 37], ['full', 39], ['edd', 40], ['late', 41], ['post', 42]] };
  var DAY = 864e5;
  var t = function (iso) { var p = String(iso || '').split('-').map(Number); return p.length === 3 && p[0] > 1900 ? Date.UTC(p[0], p[1] - 1, p[2]) : NaN; };
  var iso = function (ms) { return new Date(ms).toISOString().slice(0, 10); };
  var add = function (d, n) { return iso(t(d) + n * DAY); };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };

  function calculate(input) {
    var lmp = t(input.lmp);
    if (isNaN(lmp)) return null;
    var cycle = Math.min(45, Math.max(21, Math.round(Number(input.cycle) || 28))), adj = cycle - 28, base = iso(lmp + adj * DAY);
    var edd = add(base, FACTS.gestation);
    var r = { lmp: iso(lmp), cycle: cycle, adj: adj, edd: edd, conception: add(base, 14),
      dates: FACTS.weeks.map(function (w) { return { key: w[0], week: w[1], date: add(base, w[1] * 7) }; }) };
    var today = t(input.today);
    if (!isNaN(today)) {
      var ga = Math.round((today - t(base)) / DAY);
      r.ga = ga >= 0 && ga <= 44 * 7 ? { weeks: Math.floor(ga / 7), days: ga % 7, total: ga } : null;
      r.trimester = r.ga ? (ga < 98 ? 1 : ga < 196 ? 2 : 3) : null;
      r.toGo = Math.round((t(edd) - today) / DAY);
    }
    // Leave from the chosen start: 0 = on the due date, otherwise that many days before (at most 30).
    var sector = input.sector === 'civil' ? 'civil' : 'private', before = Math.min(FACTS.earliest, Math.max(0, Math.round(Number(input.before) || 0)));
    var days = sector === 'civil' ? (Number(input.civilDays) === 60 ? 60 : 90) : FACTS.private;
    var start = add(edd, -before);
    r.leave = { sector: sector, days: days, start: start, end: add(start, days - 1), back: add(start, days), earliest: add(edd, -FACTS.earliest), before: before };
    r.paternity = { start: edd, end: add(edd, FACTS.paternity - 1) };
    var rate = Number(input.rate) || 0;
    r.allowance = sector === 'private' && rate > 0 ? cents(Math.max(rate, FACTS.minRate) * FACTS.private) : null;
    return r;
  }

  var api = { FACTS: FACTS, add: add, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBBersalin = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
