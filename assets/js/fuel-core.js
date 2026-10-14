/* Fuel cost and consumption in Malaysia. Weekly pump prices are set by the Ministry of Finance (APM) and published on
   data.gov.my (dataset "fuelprice"); tools-src/fuel-fetch.mjs bakes them in every week. BUDI95: RON95 at RM1.99 a
   litre for eligible Malaysians up to the monthly quota (300 litres from 1 September 2026), market price above it.
   Verified 14 October 2026. */
(function (root) {
  'use strict';

  var FACTS = { verified: '2026-10-14', budiQuota: 300, budiDieselQuota: 300 };
  // Keys match the data.gov.my columns.
  var FUELS = ['ron95_budi95', 'ron95', 'ron97', 'diesel', 'diesel_eastmsia', 'diesel_budi'];
  var LABELS = {
    en: { ron95_budi95: 'RON95 (BUDI95 subsidised)', ron95: 'RON95 (unsubsidised)', ron97: 'RON97', diesel: 'Diesel (Peninsular)',
      diesel_eastmsia: 'Diesel (Sabah, Sarawak, Labuan)', diesel_budi: 'Diesel (BUDI Diesel subsidised)' },
    ms: { ron95_budi95: 'RON95 (BUDI95 bersubsidi)', ron95: 'RON95 (tanpa subsidi)', ron97: 'RON97', diesel: 'Diesel (Semenanjung)',
      diesel_eastmsia: 'Diesel (Sabah, Sarawak, Labuan)', diesel_budi: 'Diesel (BUDI Diesel bersubsidi)' }
  };

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, d) { v = Number(v); return v !== '' && isFinite(v) && v >= 0 ? v : (d || 0); };

  // L/100 km <-> km/L
  function toL100(value, unit) { value = num(value); return value > 0 ? (unit === 'kml' ? 100 / value : value) : 0; }

  // One trip: litres, fuel cost, tolls, cost per km and per person.
  function trip(input) {
    var km = num(input.distance) * (input.roundTrip === true || input.roundTrip === 'yes' ? 2 : 1);
    var l100 = toL100(input.consumption, input.unit), price = num(input.price);
    var litres = km * l100 / 100, fuel = cents(litres * price), toll = num(input.toll);
    var people = Math.max(1, Math.floor(num(input.passengers, 1)));
    var total = cents(fuel + toll);
    return { km: km, l100: l100, kml: l100 ? 100 / l100 : 0, litres: Math.round(litres * 100) / 100, fuel: fuel, toll: toll, total: total,
      perKm: km ? litres * price / km : 0, perPerson: cents(total / people), people: people };
  }

  // Full-tank method: km since the last fill-up and litres to refill.
  function measure(input) {
    var km = num(input.km), litres = num(input.litres), price = num(input.price);
    var l100 = km ? litres / km * 100 : 0;
    return { km: km, litres: litres, l100: l100, kml: litres ? km / litres : 0, cost: cents(litres * price), perKm: km ? litres * price / km : 0 };
  }

  // A month of driving; BUDI95 / BUDI Diesel litres above the quota are charged at the market price.
  function monthly(litres, key, prices, quota) {
    litres = num(litres);
    var p = prices || {}, market = key === 'ron95_budi95' ? p.ron95 : key === 'diesel_budi' ? p.diesel : null;
    var q = market ? num(quota, key === 'diesel_budi' ? FACTS.budiDieselQuota : FACTS.budiQuota) : Infinity;
    var sub = Math.min(litres, q), over = Math.max(0, litres - q);
    var cost = cents(sub * num(p[key]) + over * num(market));
    return { litres: litres, subsidised: market ? sub : 0, over: over, cost: cost, market: market ? cents(litres * market) : cost,
      saving: market ? cents(litres * market - cost) : 0, quota: market ? q : 0 };
  }

  // data.gov.my rows -> [{ date, ron95, ... }] sorted by date, weekly price levels only.
  function parseApi(json) {
    var rows = Array.isArray(json) ? json : json && Array.isArray(json.data) ? json.data : [];
    return rows.filter(function (r) { return r && r.series_type === 'level' && /^\d{4}-\d{2}-\d{2}$/.test(r.date); })
      .map(function (r) {
        var o = { date: r.date };
        FUELS.forEach(function (k) { var v = Number(r[k]); o[k] = r[k] !== null && r[k] !== undefined && isFinite(v) && v > 0 ? v : null; });
        return o;
      })
      .filter(function (r) { return r.ron95 && r.ron97 && r.diesel; })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  function mergeHistory(old, fresh, keep) {
    var byDate = {};
    (old || []).concat(fresh || []).forEach(function (r) { byDate[r.date] = r; });
    return Object.keys(byDate).sort().slice(-(keep || 52)).map(function (d) { return byDate[d]; });
  }
  // Latest prices and the change from the week before, per fuel.
  function latest(history) {
    var h = history || [], now = h[h.length - 1] || {}, prev = h[h.length - 2] || {};
    var out = { date: now.date, prices: {}, change: {} };
    FUELS.forEach(function (k) {
      out.prices[k] = now[k] || null;
      out.change[k] = now[k] && prev[k] ? cents(now[k] - prev[k]) : 0;
    });
    return out;
  }

  var api = { FACTS: FACTS, FUELS: FUELS, LABELS: LABELS, toL100: toL100, trip: trip, measure: measure, monthly: monthly,
    parseApi: parseApi, mergeHistory: mergeHistory, latest: latest };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBFuel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
