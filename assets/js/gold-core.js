/* Gold price maths for Malaysia. One normalized snapshot shape is shared by the Cloudflare Worker (live), the daily
   GitHub Action (tools-src/gold-fetch.mjs) and the page:
     { fetchedAt, spot: { usdOz, at, source } | null, fx: { usdMyr, date, source } | null,
       kijang: { date, oneOz: { buy, sell }, halfOz, quarterOz } | null, history: [{ date, buy, sell }] }
   Spot gold (USD per troy ounce) × USD/MYR ÷ 31.1034768 gives the ringgit price of pure gold per gram; BNM's Kijang
   Emas 1 oz coin prices are the official daily reference. Verified 16 October 2026. */
(function (root) {
  'use strict';

  var OZ = 31.1034768; // grams in a troy ounce
  // [fineness in parts per thousand, karat]
  var PURITIES = [[999, 24], [916, 22], [835, 20], [750, 18], [585, 14], [375, 9]];
  var FACTS = { verified: '2026-10-16', oz: OZ, kijangFineness: 999.9 };

  var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : null; };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };

  // BNM Open API: { data: { effective_date, one_oz: { buying, selling }, half_oz, quarter_oz } } (or data as an array).
  function parseKijang(json) {
    var d = json && json.data;
    if (Array.isArray(d)) d = d[d.length - 1];
    if (!d || !d.one_oz) return null;
    var pair = function (x) { return x && num(x.buying) && num(x.selling) ? { buy: num(x.buying), sell: num(x.selling) } : null; };
    var oneOz = pair(d.one_oz);
    return oneOz ? { date: String(d.effective_date || '').slice(0, 10), oneOz: oneOz, halfOz: pair(d.half_oz), quarterOz: pair(d.quarter_oz) } : null;
  }

  // Month of Kijang Emas prices → [{ date, buy, sell }] (1 oz).
  function parseKijangHistory(json) {
    var d = json && json.data;
    if (!Array.isArray(d)) d = d ? [d] : [];
    return d.map(function (x) { return x && x.one_oz && num(x.one_oz.buying) && num(x.one_oz.selling) ? { date: String(x.effective_date).slice(0, 10), buy: num(x.one_oz.buying), sell: num(x.one_oz.selling) } : null; })
      .filter(Boolean);
  }

  // BNM exchange rate: { data: { currency_code, unit, rate: { date, middle_rate } } }.
  function parseBnmFx(json) {
    var d = json && json.data, r = d && d.rate;
    if (Array.isArray(r)) r = r[r.length - 1];
    var rate = r && (num(r.middle_rate) || (num(r.buying_rate) && num(r.selling_rate) && (r.buying_rate + r.selling_rate) / 2));
    rate = rate && rate / (num(d.unit) || 1);
    return rate && rate > 2 && rate < 10 ? { usdMyr: rate, date: String(r.date || '').slice(0, 10), source: 'BNM' } : null;
  }

  // Spot gold in USD per troy ounce: gold-api.com { price, updatedAt }. Out-of-range values are rejected.
  function parseSpot(json) {
    var p = json && num(json.price);
    return p && p > 500 && p < 20000 ? { usdOz: p, at: json.updatedAt || null, source: 'gold-api.com' } : null;
  }

  // Frankfurter (European Central Bank reference rates): { date, rates: { MYR } }.
  function parseFrankfurter(json) {
    var r = json && json.rates && num(json.rates.MYR);
    return r && r > 2 && r < 10 ? { usdMyr: r, date: json.date || '', source: 'ECB' } : null;
  }

  // Merge history rows by date, newest last, capped.
  function mergeHistory(a, b, max) {
    var map = {};
    (a || []).concat(b || []).forEach(function (r) { if (r && r.date) map[r.date] = r; });
    return Object.keys(map).sort().map(function (k) { return map[k]; }).slice(-(max || 400));
  }

  // Ringgit per gram of pure gold: live spot when available, else BNM's Kijang Emas buying price.
  function pureGram(snap) {
    if (snap && snap.spot && snap.fx && num(snap.spot.usdOz) && num(snap.fx.usdMyr)) return { rm: snap.spot.usdOz * snap.fx.usdMyr / OZ, basis: 'spot' };
    if (snap && snap.kijang) return { rm: snap.kijang.oneOz.buy / OZ, basis: 'kijang' };
    return null;
  }

  function table(pure) {
    return PURITIES.map(function (p) {
      var g = pure * p[0] / 1000;
      return { fineness: p[0], karat: p[1], gram: cents(g), oz: cents(g * OZ), tenGram: cents(g * 10) };
    });
  }

  function kijangGram(k) {
    return k ? { buy: cents(k.oneOz.buy / OZ), sell: cents(k.oneOz.sell / OZ), spread: cents((k.oneOz.sell - k.oneOz.buy) / k.oneOz.sell * 100) } : null;
  }

  // Jewellery price check: metal value at the purity, making charge (per gram), against the shop's price.
  function jewellery(input, pure) {
    var w = Number(input.weight) || 0, fine = Number(input.fineness) || 916, making = Number(input.making) || 0, shop = Number(input.shop) || 0;
    var metal = cents(w * pure * fine / 1000), labour = cents(w * making), fair = cents(metal + labour);
    return { metal: metal, labour: labour, fair: fair, shop: shop, premium: shop && metal ? cents((shop - metal) / metal * 100) : null, diff: shop ? cents(shop - fair) : null };
  }

  // Grams, troy ounces and kilograms.
  function units(value, unit) {
    var g = (Number(value) || 0) * (unit === 'oz' ? OZ : unit === 'kg' ? 1000 : 1);
    return { g: g, oz: g / OZ, kg: g / 1000 };
  }

  // SVG polyline points for a price series (viewBox 0 0 w h), with min and max for labels.
  function chart(rows, w, h, key) {
    var v = (rows || []).map(function (r) { return r[key || 'sell'] / OZ; });
    if (v.length < 2) return null;
    var min = Math.min.apply(null, v), max = Math.max.apply(null, v), span = max - min || 1;
    var pts = v.map(function (x, i) { return (i / (v.length - 1) * w).toFixed(1) + ',' + (h - (x - min) / span * h).toFixed(1); }).join(' ');
    return { points: pts, min: cents(min), max: cents(max), first: rows[0].date, last: rows[rows.length - 1].date, change: cents((v[v.length - 1] - v[0]) / v[0] * 100) };
  }

  var api = { FACTS: FACTS, OZ: OZ, PURITIES: PURITIES, parseKijang: parseKijang, parseKijangHistory: parseKijangHistory, parseBnmFx: parseBnmFx, parseSpot: parseSpot, parseFrankfurter: parseFrankfurter,
    mergeHistory: mergeHistory, pureGram: pureGram, table: table, kijangGram: kijangGram, jewellery: jewellery, units: units, chart: chart };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBGold = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
