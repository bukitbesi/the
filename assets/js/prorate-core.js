/* Prorated salary for an incomplete month in Malaysia. Section 18A of the Employment Act 1955 (from 1 January 2023):
   monthly wages ÷ days in the wage period × days eligible, for a new joiner, a leaver, unpaid leave or national
   service. Working-day and 26-day methods are shown for comparison with contracts that use them. Verified 13 October 2026. */
(function (root) {
  'use strict';

  var FACTS = { verified: '2026-10-13', since: '2023-01-01', orpDays: 26 };
  // Weight of each weekday (Sunday = 0) as a working day.
  var PATTERNS = {
    'mon-fri': [0, 1, 1, 1, 1, 1, 0],
    'mon-sat': [0, 1, 1, 1, 1, 1, 1],
    'sun-thu': [1, 1, 1, 1, 1, 0, 0],
    'half-sat': [0, 1, 1, 1, 1, 1, 0.5]
  };
  var MONTHS = {
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    ms: ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember']
  };

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, d) { v = Number(v); return v !== '' && isFinite(v) && v >= 0 ? v : (d || 0); };

  function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

  // Working days from day `from` to day `to` (inclusive) of month m (1–12).
  function workingDays(y, m, from, to, pattern) {
    var w = PATTERNS[pattern] || PATTERNS['mon-fri'], n = 0;
    for (var d = from; d <= to; d++) n += w[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    return n;
  }

  function prorate(salary, days, base) { return base > 0 ? cents(num(salary) * Math.min(days, base) / base) : 0; }

  function parse(input) {
    var c = input.case === 'leave' || input.case === 'full' ? input.case : 'join';
    var src = c === 'full' ? String(input.month || '') + '-01' : String(input.date || '');
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(src);
    var now = new Date();
    var y = m ? +m[1] : now.getUTCFullYear(), mo = m ? Math.min(12, Math.max(1, +m[2])) : now.getUTCMonth() + 1;
    var dim = daysInMonth(y, mo), day = m ? Math.min(dim, Math.max(1, +m[3])) : 1;
    var from = c === 'join' ? day : 1, to = c === 'leave' ? day : dim;
    return { kind: c, y: y, m: mo, dim: dim, from: from, to: to };
  }

  function calculate(input) {
    var p = parse(input), salary = num(input.salary), pattern = PATTERNS[input.workdays] ? input.workdays : 'mon-fri';
    var unpaid = num(input.unpaid);
    var eligible = p.to - p.from + 1, days = Math.max(0, eligible - unpaid);
    var monthWork = workingDays(p.y, p.m, 1, p.dim, pattern), work = workingDays(p.y, p.m, p.from, p.to, pattern);
    var workDays = Math.max(0, work - unpaid);
    // On the 26-day basis a full month is 26 days, whatever the calendar.
    var orpDays = p.kind === 'full' ? Math.max(0, FACTS.orpDays - unpaid) : Math.min(FACTS.orpDays, workDays);
    var methods = [
      { key: 'calendar', base: p.dim, days: days },
      { key: 'working', base: monthWork, days: workDays },
      { key: 'fixed26', base: FACTS.orpDays, days: orpDays }
    ].map(function (x) { x.daily = x.base ? cents(salary / x.base) : 0; x.pay = prorate(salary, x.days, x.base); return x; });
    var label = function (lang) {
      var name = MONTHS[lang][p.m - 1] + ' ' + p.y;
      return p.from === 1 && p.to === p.dim ? name : p.from + '–' + p.to + ' ' + name;
    };
    return {
      salary: salary, kind: p.kind, year: p.y, month: p.m, from: p.from, to: p.to, calendarDays: p.dim,
      eligible: eligible, unpaid: unpaid, days: days, workingDays: work, monthWorkingDays: monthWork,
      pay: methods[0].pay, deduction: cents(salary - methods[0].pay), methods: methods,
      label: { en: label('en'), ms: label('ms') }
    };
  }

  var api = { FACTS: FACTS, PATTERNS: PATTERNS, daysInMonth: daysInMonth, workingDays: workingDays, prorate: prorate, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBProrate = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
