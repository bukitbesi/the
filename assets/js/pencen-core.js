/* Malaysian civil service pension (Akta Pencen 1980 [Akta 227]) as applied in JPA's pension circular (PPSM, Pekeliling
   Perkhidmatan Pencen) and the SSPA FAQ (PP Bil. 1/2024): monthly pension = 1/600 × whole months of qualifying service
   × last salary, at most 3/5 (60%, reached at 360 months), at least RM1,000 with 300 months or more; gratuity = 7.5% ×
   whole months (not capped) × last salary; leave cash award (GCR) = days (at most 180 from 2023) ÷ 30 × (last salary +
   fixed allowances). The pension is paid from the pension age (55 for appointments from 12 April 1991), gratuity and
   GCR on the retirement date. The 2% yearly increase ended with the Federal Court ruling of 27 June 2023; pensions now
   follow pay revisions: SSPA +8% (+RM240 at RM3,000 or less; JUSA +4%) from 1 December 2024 and +7% (JUSA +3%) from
   1 January 2026. Budget 2027 raises the minimum to RM1,350 from a date not yet published. Verified 25 October 2026. */
(function (root) {
  'use strict';
  var FACTS = {
    verified: '2026-10-25', div: 600, capMonths: 360, maxShare: 0.6, minPension: 1000, minMonths: 300, minPension2027: 1350,
    gratuity: 0.075, gcrMax: 180, gcrDiv: 30, minService: 120, optionalFrom: 40, compulsory: 60, pensionAge: 55, pensionAgeFrom: '1991-04-12',
    sspa: [{ from: '2024-12-01', pct: 8, jusa: 4, floor: 240, floorUpTo: 3000, retiredBy: '2024-12-01' }, { from: '2026-01-01', pct: 7, jusa: 3, retiredBy: '2026-01-01' }]
  };
  var sen = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v) { var n = Number(String(v == null ? '' : v).replace(/[, ]/g, '')); return isFinite(n) && n > 0 ? n : 0; };
  var parse = function (s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? [+m[1], +m[2], +m[3]] : null; };
  var iso = function (y, m, d) { return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10); };

  // Whole months from a to b (ISO dates), as JPA counts qualifying service.
  function months(a, b) {
    var x = parse(a), y = parse(b); if (!x || !y) return 0;
    var n = (y[0] - x[0]) * 12 + (y[1] - x[1]) - (y[2] < x[2] ? 1 : 0);
    return Math.max(0, n);
  }
  // Date at a given age; 29 February falls back to 28 February.
  function atAge(birth, age) {
    var b = parse(birth); if (!b) return '';
    var y = b[0] + age, d = b[2];
    if (b[1] === 2 && d === 29 && !(y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0))) d = 28;
    return iso(y, b[1], d);
  }

  // Monthly pension for a last salary and months of service (the minimum applies from 300 months).
  function pension(salary, m) {
    salary = num(salary); m = Math.max(0, Math.floor(m || 0));
    var share = Math.min(Math.min(m, FACTS.capMonths) / FACTS.div, FACTS.maxShare), p = sen(share * salary);
    if (m >= FACTS.minMonths && p < FACTS.minPension) p = FACTS.minPension;
    return { pension: p, share: share, counted: Math.min(m, FACTS.capMonths), floor: m >= FACTS.minMonths && sen(share * salary) < FACTS.minPension };
  }
  // Gratuity in whole sen, exact halves to the even sen (matches JPA's RM2,203.56 × 255 = RM42,143.08).
  function gratuity(salary, m) {
    var v = Math.round(num(salary) * 100) * Math.max(0, Math.floor(m || 0)) * Math.round(FACTS.gratuity * 1000), q = Math.floor(v / 1000), r = Math.round(v - q * 1000);
    if (r > 500 || (r === 500 && q % 2)) q++;
    return q / 100;
  }
  var gcr = function (salary, allowances, days) { var d = Math.min(FACTS.gcrMax, Math.max(0, Math.floor(num(days)))); return { days: d, amount: sen(d / FACTS.gcrDiv * (num(salary) + num(allowances))) }; };

  // Retiring civil servant. o: { birth, appointed, retire (ISO; default 60th birthday), salary, allowances, gcrDays, gender ('f' for pre-1991 women) }
  function retiree(o) {
    o = o || {};
    var retire = o.retire || atAge(o.birth, FACTS.compulsory), m = o.months != null && o.months !== '' ? Math.floor(num(o.months)) : months(o.appointed, retire);
    var p = pension(o.salary, m), g = gratuity(o.salary, m), c = gcr(o.salary, o.allowances, o.gcrDays);
    var eligible = m >= FACTS.minService;
    var age = o.birth && retire ? months(o.birth, retire) / 12 : null;
    // Pension age: 55 for appointments from 12 April 1991; earlier appointees 50 (men) or 45 (women).
    var pAge = !o.appointed || o.appointed >= FACTS.pensionAgeFrom ? FACTS.pensionAge : (o.gender === 'f' ? 45 : 50);
    var starts = o.birth ? (age !== null && age >= pAge ? retire : atAge(o.birth, pAge)) : retire;
    return {
      months: m, years: Math.floor(m / 12), restMonths: m % 12, eligible: eligible, retire: retire, ageAtRetire: age, pensionAge: pAge, pensionStarts: starts,
      pension: eligible ? p.pension : 0, share: eligible ? p.share : 0, counted: p.counted, floor: eligible && p.floor,
      gratuity: eligible ? g : 0, gcr: c.amount, gcrDays: c.days, lump: (eligible ? g : 0) + c.amount,
      pension2027: eligible && m >= FACTS.minMonths ? Math.max(p.pension, FACTS.minPension2027) : (eligible ? p.pension : 0)
    };
  }

  // Existing pensioner (SSPA FAQ Q20): the last (or equivalent) salary is raised phase by phase, then pension =
  // 1/600 × months × new salary (capped) + PKKP. o: { salary, months, retired (ISO), jusa, pkkp }
  function adjusted(o) {
    o = o || {};
    var s = num(o.salary), steps = [], k = num(o.pkkp);
    FACTS.sspa.forEach(function (ph) {
      if (!o.retired || o.retired > ph.retiredBy) return;
      var before = s;
      s = o.jusa ? s * (1 + ph.jusa / 100) : (ph.floor && s <= ph.floorUpTo ? s + ph.floor : s * (1 + ph.pct / 100));
      s = sen(s); steps.push({ from: ph.from, before: before, after: s, pension: sen(pension(s, o.months).pension + k) });
    });
    return { original: sen(pension(num(o.salary), o.months).pension + k), salary: s, pension: sen(pension(s, o.months).pension + k), pkkp: k, steps: steps };
  }

  // ---- Shared view (build-time render and browser give the same text)
  var MON = { en: 'January February March April May June July August September October November December'.split(' '), ms: 'Januari Februari Mac April Mei Jun Julai Ogos September Oktober November Disember'.split(' ') };
  function money(n) { var x = sen(n).toFixed(2).split('.'); return 'RM' + x[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + x[1]; }
  function date(s, lang) { var d = parse(s); return d ? d[2] + ' ' + MON[lang === 'ms' ? 'ms' : 'en'][d[1] - 1] + ' ' + d[0] : '–'; }
  var W = {
    en: { pension: 'Monthly pension', none: 'No pension', svc: function (r) { return r.years + ' years ' + r.restMonths + ' months (' + r.months + ' months)'; }, short: 'Under 10 years of service: no pension or gratuity (GCR is still paid).',
      grat: 'Gratuity', gcr: 'Leave cash (GCR)', lump: 'Lump sum at retirement', months: 'Service counted', retire: 'Retirement date', starts: 'Pension starts', share: 'Pension rate', days: 'GCR leave days', dd: ' days (maximum 180)', young: 'Optional retirement is allowed from age 40.', old: 'Compulsory retirement age is 60.',
      sub: function (r, l) { return r.eligible ? (r.floor ? 'Minimum pension (RM1,000)' : (r.share * 100).toFixed(2).replace(/\.?0+$/, '') + '% of last salary') + ' · from ' + date(r.pensionStarts, l) : 'Under 10 years of service'; },
      b27: function (r) { return r.pension2027 > r.pension ? 'Budget 2027 minimum RM1,350 (start date not yet set): ' + money(r.pension2027) + ' a month.' : ''; },
      wait: function (r, l) { return r.pensionStarts > r.retire ? 'Gratuity and GCR are paid on ' + date(r.retire, l) + '; the monthly pension waits until age ' + r.pensionAge + ' on ' + date(r.pensionStarts, l) + '.' : ''; },
      adj: 'Pension after SSPA', orig: 'Pension before SSPA', newSal: 'Adjusted last salary', phase: function (i) { return i ? 'Phase 2 (1 January 2026)' : 'Phase 1 (1 December 2024)'; }, pkkp: 'PKKP included', noAdj: 'Retired after 1 January 2026: your pension already uses the SSPA salary.',
      asub: function (a) { return a.steps.length ? '+' + money(a.pension - a.original) + ' a month from ' + money(a.original) : 'No SSPA adjustment'; } },
    ms: { pension: 'Pencen bulanan', none: 'Tiada pencen', svc: function (r) { return r.years + ' tahun ' + r.restMonths + ' bulan (' + r.months + ' bulan)'; }, short: 'Kurang 10 tahun perkhidmatan: tiada pencen atau ganjaran (GCR tetap dibayar).',
      grat: 'Ganjaran', gcr: 'Gantian cuti rehat (GCR)', lump: 'Bayaran sekali gus semasa bersara', months: 'Tempoh dikira', retire: 'Tarikh bersara', starts: 'Pencen bermula', share: 'Kadar pencen', days: 'Hari cuti GCR', dd: ' hari (maksimum 180)', young: 'Persaraan pilihan dibenarkan dari umur 40.', old: 'Umur bersara wajib ialah 60.',
      sub: function (r, l) { return r.eligible ? (r.floor ? 'Pencen minimum (RM1,000)' : (r.share * 100).toFixed(2).replace(/\.?0+$/, '') + '% gaji akhir') + ' · mulai ' + date(r.pensionStarts, l) : 'Kurang 10 tahun perkhidmatan'; },
      b27: function (r) { return r.pension2027 > r.pension ? 'Minimum Belanjawan 2027 RM1,350 (tarikh mula belum ditetapkan): ' + money(r.pension2027) + ' sebulan.' : ''; },
      wait: function (r, l) { return r.pensionStarts > r.retire ? 'Ganjaran dan GCR dibayar pada ' + date(r.retire, l) + '; pencen bulanan menunggu umur ' + r.pensionAge + ' pada ' + date(r.pensionStarts, l) + '.' : ''; },
      adj: 'Pencen selepas SSPA', orig: 'Pencen sebelum SSPA', newSal: 'Gaji akhir selepas pelarasan', phase: function (i) { return i ? 'Fasa 2 (1 Januari 2026)' : 'Fasa 1 (1 Disember 2024)'; }, pkkp: 'Termasuk PKKP', noAdj: 'Bersara selepas 1 Januari 2026: pencen anda sudah guna gaji SSPA.',
      asub: function (a) { return a.steps.length ? '+' + money(a.pension - a.original) + ' sebulan daripada ' + money(a.original) : 'Tiada pelarasan SSPA'; } }
  };
  function view(o, lang) {
    var w = W[lang === 'ms' ? 'ms' : 'en'], r = retiree(o);
    return {
      r: r, big: r.eligible ? money(r.pension) : w.none, sub: w.sub(r, lang),
      grid: [[w.grat, money(r.gratuity)], [w.gcr, money(r.gcr)], [w.lump, money(r.lump)], [w.share, r.eligible ? (r.share * 100).toFixed(2).replace(/\.?0+$/, '') + '%' : '0%']],
      rows: [[w.months, w.svc(r)], [w.retire, date(r.retire, lang)], [w.starts, r.eligible ? date(r.pensionStarts, lang) : '–'], [w.days, r.gcrDays + w.dd]],
      note: [r.ageAtRetire !== null && r.ageAtRetire < FACTS.optionalFrom ? w.young : '', r.ageAtRetire !== null && r.ageAtRetire > FACTS.compulsory ? w.old : '', r.eligible ? '' : w.short, w.wait(r, lang), w.b27(r)].filter(Boolean).join(' ')
    };
  }
  function viewAdjusted(o, lang) {
    var w = W[lang === 'ms' ? 'ms' : 'en'], a = adjusted(o);
    var rows = [[w.orig, money(a.original)]].concat(a.steps.map(function (s, i) { return [w.phase(FACTS.sspa[0].from === s.from ? 0 : 1), money(s.before) + ' → ' + money(s.after) + ' · ' + money(s.pension)]; }));
    if (a.pkkp) rows.push([w.pkkp, money(a.pkkp)]);
    return { a: a, big: money(a.pension), sub: w.asub(a), rows: rows, note: a.steps.length ? '' : w.noAdj };
  }

  var api = { FACTS: FACTS, months: months, atAge: atAge, pension: pension, gratuity: gratuity, gcr: gcr, retiree: retiree, adjusted: adjusted, money: money, date: date, view: view, viewAdjusted: viewAdjusted };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBPencen = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
