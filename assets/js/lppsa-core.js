/* LPPSA civil service housing financing (Lembaga Pembiayaan Perumahan Sektor Awam), rules from LPPSA's own notices and
   FAQ: from 4 October 2026 the maximum financing follows net income (RM280,000 up to RM2,500 net, RM1 million above
   RM10,000), the profit rate is 4% a year up to RM750,000 and 4.5% on the part above it (blended across first and
   second financing), on a reducing balance; the instalment may not exceed 60% of basic salary + fixed allowances,
   total debts may not exceed 80% of net income and take-home pay must stay at least 20% of gross; tenure is up to
   420 months (480 under the young civil servants' scheme, SPPM, age 30 and under) and not past age 90 on the pension
   scheme or the retirement age on the EPF scheme; a second financing while the first is active lends up to 90% and
   uses what is left of the limit. Verified 26 October 2026. */
(function (root) {
  'use strict';
  var FACTS = {
    verified: '2026-10-26', effective: '2026-10-04',
    // [net income up to (RM), maximum financing (RM)]; above the last row: RM1,000,000.
    limits: [[2500, 280000], [3000, 350000], [3500, 430000], [4000, 480000], [4500, 550000], [5000, 610000], [5500, 670000], [6000, 730000],
      [6500, 780000], [7000, 800000], [7500, 830000], [8000, 850000], [8500, 880000], [9000, 900000], [9500, 930000], [10000, 950000]],
    top: 1000000, tier: 750000, rate1: 4, rate2: 4.5, instalmentShare: 0.6, debtShare: 0.8, netFloor: 0.2,
    months: 420, sppmMonths: 480, secondMonths: 360, sppmAge: 30, sppmUntil: '2026-12-31', pensionAge: 90, secondMargin: 0.9
  };
  var sen = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v) { var n = Number(String(v == null ? '' : v).replace(/[, ]/g, '')); return isFinite(n) && n > 0 ? n : 0; };

  // Maximum financing for a net income (each row covers incomes above the previous row, up to its own figure).
  function limitFor(net) {
    net = num(net);
    for (var i = 0; i < FACTS.limits.length; i++) if (net <= FACTS.limits[i][0]) return FACTS.limits[i][1];
    return FACTS.top;
  }
  // Blended profit rate (% a year) for a new amount when `used` is already approved on an earlier financing.
  function rate(amount, used) {
    amount = num(amount); used = num(used);
    if (!amount) return FACTS.rate1;
    var a1 = Math.min(amount, Math.max(0, FACTS.tier - used)), a2 = amount - a1;
    return (a1 * FACTS.rate1 + a2 * FACTS.rate2) / amount;
  }
  function instalment(amount, pct, months) {
    amount = num(amount); months = Math.max(1, Math.floor(months || 0));
    var i = pct / 1200;
    return sen(i ? amount * i / (1 - Math.pow(1 + i, -months)) : amount / months);
  }
  // Largest amount whose instalment fits `pay` (the rate depends on the amount, so search for it).
  function affordable(pay, months, used) {
    if (!(pay > 0) || !(months > 0)) return 0;
    var lo = 0, hi = 5e6;
    for (var k = 0; k < 60; k++) { var mid = (lo + hi) / 2; if (instalment(mid, rate(mid, used), months) <= pay) lo = mid; else hi = mid; }
    return Math.floor(lo / 100) * 100;
  }
  // Whole months from age `age` (years, may be fractional) to `end`.
  var monthsTo = function (age, end) { return Math.max(0, Math.floor((end - age) * 12 + 1e-9)); };

  /* o: { basic, allowances, mandatory (EPF, SOCSO, tax, court orders…), debts (other loan deductions: Angkasa, cooperative,
     personal loan), others (zakat, Tabung Haji, ASB…), age, scheme ('pencen'|'kwsp'), retireAge, second (bool),
     firstUsed (RM approved on the first financing), price, amount (requested; blank = the maximum), today (ISO) } */
  function calculate(o) {
    o = o || {};
    var basic = num(o.basic), allow = num(o.allowances), gross = basic + allow, mand = num(o.mandatory), debts = num(o.debts), others = num(o.others);
    var net = Math.max(0, gross - mand), takeHome = gross - mand - debts - others;
    var age = num(o.age), second = !!o.second, used = second ? num(o.firstUsed) : 0, pencen = o.scheme !== 'kwsp';
    var retire = num(o.retireAge) || 60;
    var sppm = !second && age > 0 && age <= FACTS.sppmAge && (o.today || FACTS.verified) <= FACTS.sppmUntil;
    var cap = second ? FACTS.secondMonths : sppm ? FACTS.sppmMonths : FACTS.months;
    var months = age > 0 ? Math.min(cap, monthsTo(age, pencen ? FACTS.pensionAge : retire)) : cap;
    // Monthly room under each LPPSA rule.
    var byShare = FACTS.instalmentShare * gross, byDebt = FACTS.debtShare * net - debts, byNet = takeHome - FACTS.netFloor * gross;
    var room = Math.max(0, Math.min(byShare, byDebt, byNet));
    var table = limitFor(net), limitLeft = Math.max(0, table - used);
    var price = num(o.price), margin = second ? FACTS.secondMargin : 1;
    var byPrice = price ? Math.floor(price * margin) : Infinity;
    var byPay = affordable(room, months, used);
    var max = Math.max(0, Math.min(limitLeft, byPay, byPrice));
    var amount = num(o.amount) ? Math.min(num(o.amount), max) : max;
    var r = rate(amount, used), pay = amount ? instalment(amount, r, months) : 0;
    var binding = max === limitLeft ? 'table' : max === byPay ? 'pay' : 'price';
    return {
      gross: sen(gross), net: sen(net), takeHome: sen(takeHome), months: months, years: Math.floor(months / 12), restMonths: months % 12, sppm: sppm, pencen: pencen,
      table: table, limitLeft: limitLeft, byPay: byPay, byPrice: isFinite(byPrice) ? byPrice : null, max: max, binding: binding, margin: margin,
      room: sen(room), rules: { share: sen(byShare), debt: sen(byDebt), net: sen(byNet) },
      amount: amount, rate: r, pay: pay, total: sen(pay * months), profit: sen(pay * months - amount),
      requestedCut: num(o.amount) > max, afterPay: sen(takeHome - pay)
    };
  }

  // ---- Shared view (build-time render and browser give the same text)
  function money(n, d) { var x = sen(n).toFixed(d === 0 ? 0 : 2).split('.'); return 'RM' + x[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (x[1] ? '.' + x[1] : ''); }
  var pct = function (r) { return r.toFixed(2).replace(/\.?0+$/, '') + '%'; };
  var W = {
    en: { max: 'Maximum financing', pay: 'Monthly instalment', rate: 'Profit rate', tenure: 'Tenure', total: 'Total repaid', profit: 'Total profit', net: 'Net income (LPPSA)', table: 'Limit for your net income',
      room: 'Highest instalment allowed', take: 'Take-home pay after instalment', ym: function (r) { return r.years + ' years' + (r.restMonths ? ' ' + r.restMonths + ' months' : '') + ' (' + r.months + ' months)'; },
      why: { table: 'Capped by the limit for your net income.', pay: 'Capped by what your salary can repay (60% / 80% / 20% rules).', price: 'Capped by the property price.' },
      sub: function (r) { return money(r.pay) + ' a month · ' + pct(r.rate) + ' · ' + r.months + ' months'; }, sppm: 'Young civil servants’ scheme (SPPM): up to 40 years.', second: 'Second financing while the first is active: up to 90% of the price.', cut: 'The amount you entered is above your maximum, so the maximum is used.', none: 'Your deductions leave no room for an instalment.' },
    ms: { max: 'Pembiayaan maksimum', pay: 'Ansuran bulanan', rate: 'Kadar keuntungan', tenure: 'Tempoh', total: 'Jumlah bayaran balik', profit: 'Jumlah keuntungan', net: 'Pendapatan bersih (LPPSA)', table: 'Had bagi pendapatan bersih anda',
      room: 'Ansuran tertinggi dibenarkan', take: 'Gaji bersih selepas ansuran', ym: function (r) { return r.years + ' tahun' + (r.restMonths ? ' ' + r.restMonths + ' bulan' : '') + ' (' + r.months + ' bulan)'; },
      why: { table: 'Dihadkan oleh had bagi pendapatan bersih anda.', pay: 'Dihadkan oleh kemampuan gaji anda (peraturan 60% / 80% / 20%).', price: 'Dihadkan oleh harga hartanah.' },
      sub: function (r) { return money(r.pay) + ' sebulan · ' + pct(r.rate) + ' · ' + r.months + ' bulan'; }, sppm: 'Skim Pembiayaan Perumahan Muda (SPPM): sehingga 40 tahun.', second: 'Pembiayaan kedua semasa pembiayaan pertama aktif: sehingga 90% harga.', cut: 'Amaun yang anda masukkan melebihi maksimum, jadi maksimum digunakan.', none: 'Potongan anda tidak meninggalkan ruang untuk ansuran.' }
  };
  function view(o, lang) {
    var w = W[lang === 'ms' ? 'ms' : 'en'], r = calculate(o);
    return {
      r: r, big: money(r.max, 0), sub: r.max ? w.sub(r) : w.none,
      grid: [[w.pay, money(r.pay)], [w.rate, pct(r.rate)], [w.tenure, w.ym(r)], [w.total, money(r.total)]],
      rows: [[w.net, money(r.net)], [w.table, money(r.table, 0)], [w.room, money(r.room)], [w.profit, money(r.profit)], [w.take, money(r.afterPay)]],
      note: [r.max ? w.why[r.binding] : '', r.sppm ? w.sppm : '', o && o.second ? w.second : '', r.requestedCut ? w.cut : ''].filter(Boolean).join(' ')
    };
  }

  var api = { FACTS: FACTS, limitFor: limitFor, rate: rate, instalment: instalment, affordable: affordable, calculate: calculate, money: money, view: view };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBLppsa = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
