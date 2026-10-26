/* UPU merit score (Malaysian public university, polytechnic, community college and MARA admission), from UPU's
   circulars for the 2026/2027 session: 90% academic + 10% co-curriculum (supplied by KPM's BSKK, or by the matriculation
   or asasi body). SPM: grade values A+ 18, A 16, A- 14, B+ 12, B 10, C+ 8, C 6, D 4, E 2, G 0; academic =
   [(4 universal subjects BM, BI, Mathematics, Sejarah ÷ 72 × 40) + (2 best package subjects ÷ 36 × 30; STEM C 1 ÷ 18
   × 30) + (2 best other subjects ÷ 36 × 10)] ÷ 80 × 90, each part to 2 decimals as in UPU's worked examples. STPM,
   matriculation and asasi: CGPA ÷ 4 × 90; STAM: Mumtaz 4.00, Jayyid Jiddan 3.00, Jayyid 2.00, Makbul 1.00, Rasib 0.
   Verified 26 October 2026. */
(function (root) {
  'use strict';
  var FACTS = {
    verified: '2026-10-26', session: '2026/2027',
    spm: { 'A+': 18, 'A': 16, 'A-': 14, 'B+': 12, 'B': 10, 'C+': 8, 'C': 6, 'D': 4, 'E': 2, 'G': 0 },
    stpm: { 'A+': 4, 'A': 4, 'A-': 3.67, 'B+': 3.33, 'B': 3, 'B-': 2.67, 'C+': 2.33, 'C': 2, 'C-': 1.67, 'D+': 1.33, 'D': 1, 'F': 0 },
    stam: { 'Mumtaz': 4, 'Jayyid Jiddan': 3, 'Jayyid': 2, 'Makbul': 1, 'Rasib': 0 },
    packages: ['A', 'B', 'C', 'KSI'], kokoMax: 10
  };
  var r2 = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var val = function (g) { return Object.prototype.hasOwnProperty.call(FACTS.spm, g) ? FACTS.spm[g] : null; };
  var koko = function (k) { var n = Number(k); return isFinite(n) ? Math.min(FACTS.kokoMax, Math.max(0, n)) : 0; };
  var desc = function (a, b) { return b - a; };

  /* SPM. o: { pkg: 'A'|'B'|'C'|'KSI', universal: [BM, BI, Maths, Sejarah grades], package: [grades], others: [grades], koko }
     Blank grades are subjects not taken. A missing universal subject counts as G. */
  function spm(o) {
    o = o || {};
    var uni = (o.universal || []).slice(0, 4).map(function (g) { var v = val(g); return v === null ? 0 : v; });
    while (uni.length < 4) uni.push(0);
    var pk = (o.package || []).map(val).filter(function (v) { return v !== null; }).sort(desc);
    var take = o.pkg === 'C' ? 1 : 2;
    var used = pk.slice(0, take), left = pk.slice(take);
    var rest = left.concat((o.others || []).map(val).filter(function (v) { return v !== null; })).sort(desc).slice(0, 2);
    var sum = function (a) { return a.reduce(function (s, v) { return s + v; }, 0); };
    var U = r2(sum(uni) / 72 * 40), P = r2(sum(used) / (take * 18) * 30), T = r2(sum(rest) / 36 * 10);
    var academic = r2((U + P + T) / 80 * 90), k = koko(o.koko);
    return { universal: U, pack: P, best: T, academic: academic, koko: k, merit: r2(academic + k), packUsed: used, bestUsed: rest, packCount: pk.length, short: pk.length < take || rest.length < 2 };
  }
  // STPM, matriculation or asasi (CGPA at face value) and STAM (by pangkat).
  function cgpa(g, k) { var c = Math.min(4, Math.max(0, Number(g) || 0)), a = r2(c / 4 * 90), kk = koko(k); return { cgpa: c, academic: a, koko: kk, merit: r2(a + kk) }; }
  function stam(grade, k) { return cgpa(Object.prototype.hasOwnProperty.call(FACTS.stam, grade) ? FACTS.stam[grade] : 0, k); }
  // ---- Shared view (build-time render and browser give the same text)
  var W = {
    en: { merit: 'Merit score', acad: 'Academic (90%)', koko: 'Co-curriculum (10%)', U: 'Universal subjects (40)', P: 'Package subjects (30)', T: 'Other best subjects (10)', cg: 'CGPA',
      sub: function (r) { return 'Academic ' + r.academic.toFixed(2) + ' + co-curriculum ' + r.koko.toFixed(2); }, short: 'Fewer subjects than the formula counts: missing ones score 0.' },
    ms: { merit: 'Markah merit', acad: 'Akademik (90%)', koko: 'Kokurikulum (10%)', U: 'Mata pelajaran universal (40)', P: 'Mata pelajaran pakej (30)', T: 'Mata pelajaran terbaik lain (10)', cg: 'PNGK',
      sub: function (r) { return 'Akademik ' + r.academic.toFixed(2) + ' + kokurikulum ' + r.koko.toFixed(2); }, short: 'Mata pelajaran kurang daripada yang dikira formula: yang tiada diberi 0.' }
  };
  // o: { mode: 'spm'|'cgpa'|'stam', ...spm fields, cgpa, stam, koko }
  function view(o, lang) {
    var w = W[lang === 'ms' ? 'ms' : 'en'], m = o && o.mode;
    if (m === 'cgpa' || m === 'stam') {
      var c = m === 'stam' ? stam(o.stam, o.koko) : cgpa(o.cgpa, o.koko);
      return { r: c, big: c.merit.toFixed(2), sub: w.sub(c), rows: [[w.cg, c.cgpa.toFixed(2)], [w.acad, c.academic.toFixed(2)], [w.koko, c.koko.toFixed(2)]], note: '' };
    }
    var r = spm(o);
    return { r: r, big: r.merit.toFixed(2), sub: w.sub(r), rows: [[w.U, r.universal.toFixed(2)], [w.P, r.pack.toFixed(2)], [w.T, r.best.toFixed(2)], [w.acad, r.academic.toFixed(2)], [w.koko, r.koko.toFixed(2)]], note: r.short ? w.short : '' };
  }

  var api = { FACTS: FACTS, spm: spm, cgpa: cgpa, stam: stam, view: view };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBMerit = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
