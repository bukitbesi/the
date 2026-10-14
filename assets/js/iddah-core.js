/* Iddah and ihdad periods as practised in Malaysia (Shafi'i school; JAKIM's Garis Panduan Ber'iddah and the state
   Islamic family law enactments): divorce after consummation, still menstruating: three quru' (periods of purity),
   which ends when the third menstruation after the talak begins (at least 32 days if divorced while pure, 47 if
   during menstruation); not menstruating (never, menopause or other cause): three Hijri months; pregnant: until
   delivery; divorce before consummation: no iddah. Husband's death: four Hijri months and ten days whether or not the
   marriage was consummated, or until delivery if pregnant, with ihdad (mourning) for the whole iddah. Hijri months
   come from TBBHijri (Malaysia's takwim). Verified 14 October 2026. */
(function (root) {
  'use strict';
  var H = typeof module === 'object' && module.exports ? require('./hijri-core.js') : root.TBBHijri;

  var FACTS = { verified: '2026-10-14', months: 3, wafatMonths: 4, wafatDays: 10, quru: 3, minPure: 32, minHaid: 47, cycle: 28, haid: 7 };

  var num = function (v, d) { v = Number(v); return v !== '' && isFinite(v) && v > 0 ? v : d; };

  // Start dates of the first three menstruations after the talak, projected from the last one at a steady cycle.
  function periods(talak, lastPeriod, cycle) {
    var gap = H.daysBetween(lastPeriod, talak);
    if (isNaN(gap) || gap < 0 || gap > 120) return null;
    var k = Math.floor(gap / cycle) + 1, out = [];
    for (var i = 0; i < FACTS.quru; i++) out.push(H.addDays(lastPeriod, (k + i) * cycle));
    return { starts: out, duringHaid: gap % cycle < FACTS.haid };
  }

  function calculate(input) {
    var event = input.event === 'death' ? 'death' : 'divorce';
    var date = input.date, state = ['haid', 'nohaid', 'pregnant'].indexOf(input.state) >= 0 ? input.state : 'haid';
    var r = { event: event, state: state, start: date, end: null, days: null, kind: '', ihdad: event === 'death', rujuk: false,
      estimate: false, periods: null, minDays: null, error: '' };
    if (isNaN(H.dayNumber(date))) { r.error = 'date'; return r; }
    if (!H.toHijri(date)) { r.error = 'range'; return r; }
    r.rujuk = event === 'divorce' && input.talak !== 'bain';
    if (event === 'divorce' && input.consummated === 'no') {
      r.kind = 'none'; r.end = date; r.days = 0; r.rujuk = false; return r;
    }
    if (state === 'pregnant') {
      r.kind = 'pregnant';
      if (!isNaN(H.dayNumber(input.due)) && input.due >= date) { r.end = input.due; r.estimate = true; }
    } else if (event === 'death') {
      r.kind = 'wafat';
      var m4 = H.addMonths(date, FACTS.wafatMonths);
      r.end = m4 && H.addDays(m4, FACTS.wafatDays);
    } else if (state === 'nohaid') {
      r.kind = 'months';
      r.end = H.addMonths(date, FACTS.months);
    } else {
      r.kind = 'quru';
      var p = !isNaN(H.dayNumber(input.lastPeriod)) && periods(date, input.lastPeriod, Math.min(60, Math.max(15, num(input.cycle, FACTS.cycle))));
      if (p) {
        r.periods = p.starts; r.end = p.starts[FACTS.quru - 1]; r.estimate = true;
        r.minDays = p.duringHaid ? FACTS.minHaid : FACTS.minPure;
      } else r.minDays = FACTS.minPure;
    }
    if (r.end) {
      r.days = H.daysBetween(date, r.end);
      r.startHijri = H.toHijri(date); r.endHijri = H.toHijri(r.end);
    }
    if (r.rujuk) r.rujukUntil = r.end;
    return r;
  }

  var api = { FACTS: FACTS, periods: periods, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBIddah = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
