/* Currency conversion at Bank Negara Malaysia's published rates: the noon (12:00) middle rate from the Kuala Lumpur
   interbank market, in ringgit per unit (some currencies are quoted per 100 units). Snapshot shape, written daily by
   tools-src/gold-fetch.mjs into tools-src/fx-data.json:
     { date, session, source, rates: { USD: { unit, buy, sell, mid }, ... } }
   ECB reference rates (Frankfurter) are the backup when BNM does not answer. Indicative only: banks and money changers
   apply their own buy and sell rates. Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-15', session: '1200' };
  var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : null; };

  // BNM /public/exchange-rate: { data: [{ currency_code, unit, rate: { date, buying_rate, selling_rate, middle_rate } }], meta }.
  function parseBnm(json) {
    var d = json && json.data;
    if (!Array.isArray(d)) return null;
    var rates = {}, date = '';
    d.forEach(function (x) {
      var code = x && String(x.currency_code || '').toUpperCase(), r = x && x.rate;
      if (!code || !r || code === 'SDR' || code === 'XDR') return;
      var buy = num(r.buying_rate), sell = num(r.selling_rate), mid = num(r.middle_rate) || (buy && sell ? (buy + sell) / 2 : null);
      if (!mid) return;
      rates[code] = { unit: num(x.unit) || 1, buy: buy, sell: sell, mid: mid };
      if (r.date && String(r.date) > date) date = String(r.date).slice(0, 10);
    });
    return Object.keys(rates).length >= 5 ? { date: date, session: (json.meta && json.meta.session) || FACTS.session, source: 'BNM', rates: rates } : null;
  }

  // Frankfurter (ECB): { date, base: 'MYR', rates: { USD: 0.2379, ... } } — foreign units per ringgit.
  function parseFrankfurter(json) {
    var r = json && json.rates;
    if (!r) return null;
    var rates = {};
    Object.keys(r).forEach(function (k) { var v = num(r[k]); if (v) rates[k] = { unit: 1, buy: null, sell: null, mid: 1 / v }; });
    return Object.keys(rates).length >= 5 ? { date: json.date || '', session: 'ECB', source: 'ECB', rates: rates } : null;
  }

  // Ringgit per one unit of a currency.
  function perUnit(snap, code) {
    if (code === 'MYR') return 1;
    var r = snap && snap.rates && snap.rates[code];
    return r ? r.mid / r.unit : null;
  }

  function convert(snap, amount, from, to) {
    var a = perUnit(snap, from), b = perUnit(snap, to), n = Number(amount);
    if (!a || !b || !isFinite(n)) return null;
    return { amount: n, from: from, to: to, result: n * a / b, rate: a / b, inverse: b / a };
  }

  // How far a counter rate (ringgit per unit, buying the foreign currency) is from the BNM middle rate, in %.
  function spread(snap, code, offered) {
    var mid = perUnit(snap, code), o = num(offered);
    return mid && o ? (o - mid) / mid * 100 : null;
  }

  var api = { FACTS: FACTS, parseBnm: parseBnm, parseFrankfurter: parseFrankfurter, perUnit: perUnit, convert: convert, spread: spread };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBFx = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
