/* Traffic summons (saman) compound in Malaysia: the "pay early, pay less" tiered scheme for JPJ and PDRM, including
   AwAS camera summonses, from 1 January 2026 (Cabinet 17 October 2025, MOT; replaces blanket discount campaigns).
   Day 1 to 15 from the notice date: 50% off; day 16 to 30: about one third off (RM200 on a RM300 compound, JPJ's own
   example); day 31 to 60: the full compound (maximum RM300); from day 61: no compound offer, the case can go to court
   and the licence or road tax can be blacklisted. Non-compoundable offences (no insurance, no road tax, no licence,
   racing) go straight to court. The Road Transport (Amendment) Act 2026 raises the maximum compound to RM500 from
   1 January 2029. The notice date is counted as day 1, which gives the earliest deadline. Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = {
    verified: '2026-10-15', start: '2026-01-01', max: 300, max2029: 500, from2029: '2029-01-01',
    tiers: [{ key: 'early', to: 15, factor: 1 / 2 }, { key: 'mid', to: 30, factor: 2 / 3 }, { key: 'full', to: 60, factor: 1 }]
  };
  var ms = function (iso) { var p = String(iso || '').split('-'); return p.length === 3 ? Date.UTC(+p[0], +p[1] - 1, +p[2]) : NaN; };
  var iso = function (t) { return new Date(t).toISOString().slice(0, 10); };
  function add(d, n) { return iso(ms(d) + n * 864e5); }
  function days(a, b) { return Math.round((ms(b) - ms(a)) / 864e5); }
  var r2 = function (n) { return Math.round(n * 100) / 100; };

  function calculate(input) {
    var amount = Number(input.amount); if (!(isFinite(amount) && amount > 0)) amount = FACTS.max;
    var notice = isFinite(ms(input.notice)) ? input.notice : input.today, pay = isFinite(ms(input.pay)) ? input.pay : input.today;
    var day = Math.max(1, days(notice, pay) + 1);
    var tiers = FACTS.tiers.map(function (t, i) {
      return { key: t.key, from: i ? FACTS.tiers[i - 1].to + 1 : 1, to: t.to, last: add(notice, t.to - 1), pay: r2(amount * t.factor), save: r2(amount - amount * t.factor) };
    });
    var cur = null;
    for (var i = 0; i < tiers.length; i++) if (day <= tiers[i].to) { cur = tiers[i]; break; }
    return {
      amount: amount, notice: notice, pay: pay, day: day, before2026: notice < FACTS.start, overMax: amount > FACTS.max,
      tier: cur ? cur.key : 'court', payable: cur ? cur.pay : null, save: cur ? cur.save : 0,
      daysLeft: cur ? cur.to - day : 0, lastDay: cur ? cur.last : add(notice, 59), courtFrom: add(notice, 60), tiers: tiers
    };
  }

  var api = { FACTS: FACTS, calculate: calculate, add: add, days: days };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBSaman = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
