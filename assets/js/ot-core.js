/* Overtime, rest-day and public holiday pay under the Employment Act 1955 (Peninsular Malaysia and Labuan), as amended
   from 1 January 2023: ordinary rate of pay (ORP) = monthly wages ÷ 26 (s.60I), hourly rate = ORP ÷ normal daily hours,
   overtime 1.5× (s.60A), rest day (s.60), public holiday 2 days' ORP and 3× for overtime (s.60D). The premiums are
   guaranteed to employees earning up to RM4,000 a month and to manual and other First Schedule employees. Verified 14 October 2026. */
(function (root) {
  'use strict';

  var FACTS = {
    verified: '2026-10-14', threshold: 4000, monthlyCap: 104, orpDays: 26, weeklyHours: 45, minimumWage: 1700,
    rates: { normal: 1.5, restOt: 2, holidayDays: 2, holidayOt: 3 }
  };

  var LABELS = {
    en: { normal: 'Overtime on a normal day (1.5×)', restHalf: 'Rest day, up to half the normal hours', restFull: 'Rest day, over half the normal hours',
      restOt: 'Overtime on a rest day (2×)', holiday: "Public holiday worked (2 days' pay)", holidayOt: 'Overtime on a public holiday (3×)',
      hour: 'h', day: 'day', days: 'days' },
    ms: { normal: 'Kerja lebih masa hari biasa (1.5×)', restHalf: 'Hari rehat, hingga separuh waktu biasa', restFull: 'Hari rehat, melebihi separuh waktu biasa',
      restOt: 'Kerja lebih masa hari rehat (2×)', holiday: 'Bekerja pada cuti umum (gaji 2 hari)', holidayOt: 'Kerja lebih masa cuti umum (3×)',
      hour: 'jam', day: 'hari', days: 'hari' }
  };
  // "10 h × RM18.75" style detail for a result row.
  function detail(l, lang, money) {
    var L = LABELS[lang === 'ms' ? 'ms' : 'en'];
    return l.qty + ' ' + (l.unit === 'hour' ? L.hour : l.qty === 1 ? L.day : L.days) + ' × ' + money(l.rate);
  }

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, d) { v = Number(v); return v !== '' && isFinite(v) && v >= 0 ? v : (d || 0); };

  function rates(wage, basis, hoursPerDay) {
    var orp = basis === 'daily' ? num(wage) : num(wage) / FACTS.orpDays;
    var hours = Math.min(12, Math.max(1, num(hoursPerDay, 8)));
    return { orp: orp, hrp: orp / hours, hours: hours };
  }

  function calculate(input) {
    var basis = input.basis === 'daily' ? 'daily' : 'monthly';
    var r = rates(input.wage, basis, input.hoursPerDay), R = FACTS.rates;
    // Rest day within normal hours: monthly-rated get ½ or 1 day's ORP, daily-rated 1 or 2 days' (s.60(3)).
    var half = basis === 'daily' ? 1 : 0.5, full = basis === 'daily' ? 2 : 1;
    var lines = [
      { key: 'normal', qty: num(input.normalOt), unit: 'hour', rate: r.hrp * R.normal, factor: R.normal },
      { key: 'restHalf', qty: num(input.restHalf), unit: 'day', rate: r.orp * half, factor: half },
      { key: 'restFull', qty: num(input.restFull), unit: 'day', rate: r.orp * full, factor: full },
      { key: 'restOt', qty: num(input.restOt), unit: 'hour', rate: r.hrp * R.restOt, factor: R.restOt },
      { key: 'holiday', qty: num(input.holidayDays), unit: 'day', rate: r.orp * R.holidayDays, factor: R.holidayDays },
      { key: 'holidayOt', qty: num(input.holidayOt), unit: 'hour', rate: r.hrp * R.holidayOt, factor: R.holidayOt }
    ].map(function (l) { l.amount = cents(l.qty * l.rate); l.rate = cents(l.rate); return l; });
    var total = cents(lines.reduce(function (s, l) { return s + l.amount; }, 0));
    var otHours = num(input.normalOt) + num(input.restOt) + num(input.holidayOt);
    var monthly = basis === 'daily' ? num(input.wage) * FACTS.orpDays : num(input.wage);
    return {
      basis: basis, wage: num(input.wage), orp: cents(r.orp), hrp: cents(r.hrp), hours: r.hours, lines: lines, total: total,
      otHours: otHours, overCap: otHours > FACTS.monthlyCap,
      covered: monthly <= FACTS.threshold || input.specified === 'yes' || input.specified === true,
      belowMinimum: monthly > 0 && monthly < FACTS.minimumWage
    };
  }

  var api = { FACTS: FACTS, LABELS: LABELS, detail: detail, rates: rates, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBOvertime = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
