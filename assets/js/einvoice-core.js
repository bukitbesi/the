/* LHDN e-Invoice (MyInvois) start-date checker. Rules from LHDN's e-Invoice FAQ (updated 4 September 2026) and
   e-Invoice Guideline sections 1.5, 1.6.10 and 16: phases by YA2022 annual turnover or revenue; businesses with
   turnover below RM3 million are exempt (threshold raised from RM1 million, effective 1 September 2026) unless a
   corporate shareholder, holding company, related company or joint venture has RM3 million or more; a business that
   reaches RM3 million from YA2026 starts on 1 January of the second year after that YA. Verified 25 October 2026. */
(function (root) {
  'use strict';
  var FACTS = {
    verified: '2026-10-25', faqDate: '2026-09-04', threshold: 3000000, thresholdFrom: '2026-09-01', concession: '2026-07-01',
    // [min turnover exclusive, max inclusive, start date, end of interim relaxation]
    phases: [
      [100000000, Infinity, '2024-08-01', '2025-01-31'],
      [25000000, 100000000, '2025-01-01', '2025-06-30'],
      [5000000, 25000000, '2025-07-01', '2025-12-31'],
      [3000000, 5000000, '2026-01-01', '2027-12-31']
    ],
    relax2026: '2027-12-31', penalty: [200, 20000], jailMonths: 6, consolidateDays: 7, cancelHours: 72
  };

  // o: { started: 'by2022' | '2023' | '2024' | '2025' | '2026+', rev2022 (RM), reached: '' | 'YA2023-2025' | 2026… (YA first at RM3m+),
  //      group (bool: corporate shareholder / holding / related company / JV with RM3m+), commenced (ISO date, for 2026+) }
  // Returns { status: 'mandatory' | 'exempt', date, relaxEnd, rule } — rule is a key the page explains.
  function check(o) {
    o = o || {};
    var started = String(o.started || 'by2022'), rev = Number(String(o.rev2022 == null ? '' : o.rev2022).replace(/[, ]/g, '')) || 0, group = !!o.group;
    var reached = o.reached === 'YA2023-2025' ? 'early' : (Number(o.reached) >= 2026 ? Number(o.reached) : 0);
    var later = function (y) { return { status: 'mandatory', date: (y + 2) + '-01-01', relaxEnd: null, rule: 'reach' }; };
    var concession = { status: 'mandatory', date: FACTS.concession, relaxEnd: FACTS.relax2026 };
    if (started === 'by2022') {
      if (rev >= FACTS.threshold) {
        for (var i = 0; i < FACTS.phases.length; i++) {
          var p = FACTS.phases[i];
          if (rev > p[0] || (i === FACTS.phases.length - 1 && rev >= FACTS.threshold)) return { status: 'mandatory', date: p[2], relaxEnd: p[3], rule: 'phase' + (i + 1) };
        }
      }
      if (group) return Object.assign({ rule: 'group' }, concession);
      if (reached === 'early') return Object.assign({ rule: 'grew' }, concession);
      if (reached) return later(reached);
      return { status: 'exempt', date: null, relaxEnd: null, rule: 'exempt' };
    }
    if (started === '2026+') {
      if (group) {
        var c = /^\d{4}-\d{2}-\d{2}$/.test(o.commenced || '') && o.commenced > FACTS.concession ? o.commenced : FACTS.concession;
        return { status: 'mandatory', date: c, relaxEnd: c === FACTS.concession ? FACTS.relax2026 : null, rule: 'groupNew' };
      }
      if (reached) return later(reached === 'early' ? 2026 : reached);
      return { status: 'exempt', date: null, relaxEnd: null, rule: 'exempt' };
    }
    // Commenced in YA2023, YA2024 or YA2025.
    if (reached === 'early') return Object.assign({ rule: 'grew' }, concession);
    if (group) return Object.assign({ rule: 'group' }, concession);
    if (reached) return later(reached);
    return { status: 'exempt', date: null, relaxEnd: null, rule: 'exempt' };
  }

  // Penalty range for one failure to issue an e-invoice (Income Tax Act 1967 s.120(1)(d)).
  function penalty(n) { n = Math.max(1, Math.floor(Number(n) || 1)); return { min: FACTS.penalty[0] * n, max: FACTS.penalty[1] * n }; }


  // ---- wording shared by the page build and the browser (so the first result is identical before and after JS)
  function describe(o, lang, today) {
    var ms = lang === 'ms', r = check(o), must = r.status === 'mandatory';
    var MON = (ms ? 'Januari Februari Mac April Mei Jun Julai Ogos September Oktober November Disember' : 'January February March April May June July August September October November December').split(' ');
    var date = function (iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? Number(m[3]) + ' ' + MON[Number(m[2]) - 1] + ' ' + m[1] : ''; };
    var rm = function (n) { return 'RM' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
    var past = function (iso) { return iso && iso < today; };
    var T = ms ? {
      must: 'Wajib e-Invois', ex: 'Dikecualikan', from: 'Mula ', relax: function (d) { return (past(d) ? 'Tempoh kelonggaran tamat ' : 'Tempoh kelonggaran hingga ') + date(d); }, noRelax: 'Tempoh kelonggaran tidak dinyatakan untuk tarikh ini', none: 'Tiada tarikh mula selagi perolehan di bawah RM3 juta',
      why: {
        phase: function (r, rev, n) { return 'Perolehan YA2022 anda ' + rm(rev) + ' meletakkan anda dalam Fasa ' + n + ', bermula ' + date(r.date) + '.'; },
        group: 'Perolehan di bawah RM3 juta, tetapi pengecualian tidak terpakai kerana pemegang saham korporat, syarikat induk, syarikat berkaitan atau usaha sama anda mempunyai perolehan RM3 juta atau lebih. Tarikh konsesi: 1 Julai 2026.',
        grew: 'Perolehan anda mencapai RM3 juta dalam YA2023 hingga YA2025, jadi anda mula pada tarikh konsesi 1 Julai 2026.',
        reach: function (y) { return 'Perolehan mencapai RM3 juta dalam YA' + y + ', jadi anda mula pada 1 Januari tahun kedua selepas YA itu.'; },
        groupNew: 'Perniagaan baharu yang tidak layak dikecualikan (ada kaitan kumpulan RM3 juta ke atas) mula pada 1 Julai 2026 atau tarikh mula operasi, yang mana lebih lewat.',
        exempt: 'Perolehan di bawah RM3 juta dan tiada kaitan kumpulan RM3 juta ke atas: anda dikecualikan, termasuk e-Invois bil kendiri. Invois dan resit biasa masih sah. Jika sudah mengeluarkan e-Invois, anda boleh berhenti serta-merta tanpa permohonan.'
      },
      todoMust: ['Log masuk MyInvois Portal (percuma) dengan MyTax, atau guna perisian perakaunan yang disambung melalui API.', 'Dapatkan TIN pembeli yang meminta e-Invois; pembeli lain boleh direkodkan dalam e-Invois disatukan setiap bulan, dihantar dalam 7 hari selepas hujung bulan.', 'Semak setiap e-Invois disahkan (ID unik dan kod QR). Pembatalan dibenarkan dalam 72 jam; selepas itu guna nota kredit atau debit.', 'Gagal mengeluarkan e-Invois boleh didenda RM200 hingga RM20,000 atau penjara hingga 6 bulan bagi setiap kesalahan, selepas tempoh kelonggaran.'],
      todoEx: ['Teruskan invois dan resit biasa (gunakan Penjana Invois kami secara percuma).', 'Semak perolehan setiap tahun: jika mencapai RM3 juta dalam sesuatu YA, anda wajib mula 1 Januari tahun kedua selepas YA itu.', 'Pengecualian hilang jika anda mendapat pemegang saham korporat, syarikat induk, syarikat berkaitan atau usaha sama dengan perolehan RM3 juta atau lebih.']
    } : {
      must: 'e-Invoice required', ex: 'Exempt', from: 'From ', relax: function (d) { return (past(d) ? 'Interim relaxation ended ' : 'Interim relaxation until ') + date(d); }, noRelax: 'No interim relaxation period is stated for this date', none: 'No start date while turnover stays below RM3 million',
      why: {
        phase: function (r, rev, n) { return 'Your YA2022 turnover of ' + rm(rev) + ' puts you in Phase ' + n + ', which started on ' + date(r.date) + '.'; },
        group: 'Turnover is below RM3 million, but the exemption does not apply because a corporate shareholder, holding company, related company or joint venture has turnover of RM3 million or more. Concessionary start date: 1 July 2026.',
        grew: 'Your turnover reached RM3 million in YA2023 to YA2025, so you start on the concessionary date of 1 July 2026.',
        reach: function (y) { return 'Turnover reached RM3 million in YA' + y + ', so you start on 1 January of the second year after that YA.'; },
        groupNew: 'A new business that cannot be exempted (it has a group link of RM3 million or more) starts on 1 July 2026 or the day it starts operating, whichever is later.',
        exempt: 'Turnover below RM3 million with no group link of RM3 million or more: you are exempt, including from self-billed e-invoices. Normal invoices and receipts remain valid. If you already issue e-invoices, you may stop at once without applying.'
      },
      todoMust: ['Log in to the MyInvois Portal (free) with MyTax, or use accounting software connected through the API.', 'Get the TIN of buyers who ask for an e-invoice; other sales can go in one consolidated e-invoice a month, sent within 7 days after month-end.', 'Check each e-invoice is validated (unique ID and QR code). You can cancel within 72 hours; after that, issue a credit or debit note.', 'Failing to issue an e-invoice can mean a fine of RM200 to RM20,000 or up to 6 months in jail for each offence, after the relaxation period.'],
      todoEx: ['Keep issuing normal invoices and receipts (use our free Invoice Generator).', 'Check turnover each year: if it reaches RM3 million in a YA, you must start on 1 January of the second year after that YA.', 'The exemption is lost if you gain a corporate shareholder, holding company, related company or joint venture with turnover of RM3 million or more.']
    };

    var why = /^phase/.test(r.rule) ? T.why.phase(r, Number(String(o.rev2022).replace(/[, ]/g, '')), r.rule.slice(5)) : r.rule === 'reach' ? T.why.reach(Number(r.date.slice(0, 4)) - 2) : T.why[r.rule];
    return { must: must, badge: must ? T.must : T.ex, date: must ? T.from + date(r.date) : T.none, relax: must ? (r.relaxEnd ? T.relax(r.relaxEnd) : T.noRelax) : '', why: why, steps: must ? T.todoMust : T.todoEx, result: r };
  }

  var api = { FACTS: FACTS, check: check, penalty: penalty, describe: describe };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBEinvoice = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
