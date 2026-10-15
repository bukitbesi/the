/* Mas kahwin (mahar) in Malaysia by state, its value in gold and gold dinar, and a wedding cost planner. Only rates
   confirmed by an official source plus a second source are given: Selangor RM300 minimum (fatwa under s.47 of the
   Administration of the Religion of Islam (Selangor) Enactment 2003, from 1 January 2010; RM80 / RM40 before), Federal
   Territories RM300 minimum (JAWI, from 1 October 2023), Melaka RM100 minimum (MAIM, from 1 June 2016; RM40 before),
   Pahang RM100 minimum (Sultan's consent, March 2024; RM22.50 before), Negeri Sembilan RM200 anak dara / RM100 janda
   (JHEAINS marriage form). Terengganu and Perlis set no rate. Johor, Kedah, Kelantan, Perak, Pulau Pinang, Sabah and
   Sarawak return null: published figures conflict and no official source was found. Gold dinar = 4.25 g of 917 gold
   (Kelantan Gold Trade). Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = {
    verified: '2026-10-15', dinarGrams: 4.25, dinarFineness: 0.917, penalty: { fine: 1000, months: 6 }, registerMonths: 6, kppi: [80, 120],
    states: {
      johor: { name: 'Johor', status: 'unconfirmed' },
      kedah: { name: 'Kedah', status: 'unconfirmed' },
      kelantan: { name: 'Kelantan', status: 'unconfirmed' },
      melaka: { name: 'Melaka', status: 'min', dara: 100, janda: 100, since: '2016-06-01', before: [40, 40], by: 'MAIM' },
      ns: { name: 'Negeri Sembilan', status: 'rate', dara: 200, janda: 100, by: 'JHEAINS' },
      pahang: { name: 'Pahang', status: 'min', dara: 100, janda: 100, since: '2024-03-28', announced: true, before: [22.5, 22.5], by: 'Sultan of Pahang' },
      penang: { name: 'Pulau Pinang', status: 'unconfirmed', fees: [['officiant', 150], ['witnesses', 100]] },
      perak: { name: 'Perak', status: 'unconfirmed' },
      perlis: { name: 'Perlis', status: 'none', by: 'Perlis fatwa 2014' },
      sabah: { name: 'Sabah', status: 'unconfirmed' },
      sarawak: { name: 'Sarawak', status: 'unconfirmed' },
      selangor: { name: 'Selangor', status: 'min', dara: 300, janda: 300, since: '2010-01-01', before: [80, 40], by: 'Selangor fatwa',
        fees: [['officiant', 150], ['registration', 40], ['witnesses', 40], ['cards', 40]] },
      terengganu: { name: 'Terengganu', status: 'none', by: 'JHEAT' },
      wp: { name: 'Wilayah Persekutuan', status: 'min', dara: 300, janda: 300, since: '2023-10-01', by: 'JAWI',
        fees: [['officiant', 150], ['witnesses', 100], ['cards', 28]] }
    }
  };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };
  var sum = function (list) { return list.reduce(function (s, x) { return s + x[1]; }, 0); };

  // State rule for a bride who is anak dara ('dara') or janda: { amount|null, status, ... }.
  function rate(state, bride) {
    var s = FACTS.states[state] || FACTS.states.selangor, janda = bride === 'janda';
    var amount = s.status === 'min' || s.status === 'rate' ? (janda ? s.janda : s.dara) : null;
    return { state: state in FACTS.states ? state : 'selangor', name: s.name, status: s.status, amount: amount, since: s.since || null, announced: !!s.announced,
      before: s.before ? s.before[janda ? 1 : 0] : null, by: s.by || null, fees: s.fees || null, feeTotal: s.fees ? sum(s.fees) : null };
  }

  // RM value of mas kahwin given as cash, grams of 999 or 916 gold, or gold dinars, at a pure-gold price per gram.
  function value(kind, qty, gram) {
    qty = num(qty); gram = num(gram);
    if (kind === 'gold999') return cents(qty * gram * 0.999);
    if (kind === 'gold916') return cents(qty * gram * 0.916);
    if (kind === 'dinar') return cents(qty * FACTS.dinarGrams * FACTS.dinarFineness * gram);
    return cents(qty);
  }

  // Ringgit amount in grams of 999 gold, grams of 916 gold and gold dinars.
  function inGold(amount, gram) {
    gram = num(gram);
    if (!gram) return null;
    return { g999: amount / (gram * 0.999), g916: amount / (gram * 0.916), dinar: amount / (FACTS.dinarGrams * FACTS.dinarFineness * gram), dinarRm: cents(FACTS.dinarGrams * FACTS.dinarFineness * gram) };
  }

  function calculate(input) {
    var r = rate(input.state, input.bride), gram = num(input.gram), kind = input.kind || 'cash';
    var mahar = value(kind, input.qty, gram);
    r.kind = kind; r.mahar = mahar; r.gold = inGold(mahar, gram);
    r.check = r.status === 'unconfirmed' ? 'unknown' : r.amount === null ? 'free' : mahar >= r.amount ? 'ok' : 'below';
    r.short = r.check === 'below' ? cents(r.amount - mahar) : 0;
    r.deferred = input.paid === 'hutang';
    var guests = Math.round(num(input.guests)), perHead = num(input.perHead);
    var fees = input.fees === '' || input.fees === undefined || input.fees === null ? (r.feeTotal || 0) : num(input.fees);
    var plan = [['mahar', mahar], ['hantaran', cents(num(input.hantaran))], ['gifts', cents(num(input.gifts))], ['catering', cents(guests * perHead)],
      ['other', cents(num(input.other))], ['fees', cents(fees)]];
    var months = Math.max(1, Math.round(num(input.months) || 12)), total = cents(sum(plan));
    r.plan = plan; r.guests = guests; r.total = total; r.months = months; r.monthly = cents(total / months);
    var blank = input.fees === '' || input.fees === undefined || input.fees === null;
    r.feesAuto = blank && r.feeTotal !== null; r.feesMissing = blank && r.feeTotal === null;
    return r;
  }

  var api = { FACTS: FACTS, rate: rate, value: value, inGold: inGold, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBMasKahwin = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
