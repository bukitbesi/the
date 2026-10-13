/* Land area units used in Malaysia, all defined exactly in square feet: international units, the imperial acre with
   its rood and pole (old grants: "2a 1r 20p"), and the traditional relung (Kedah, Perlis, Seberang Perai) and orlong
   (Penang Island, Melaka). Verified 14 October 2026. */
(function (root) {
  'use strict';

  var M2 = 1 / 0.09290304; // square feet in one square metre (1 ft = 0.3048 m exactly)
  var UNITS = {
    sqft: 1,
    sqm: M2,
    sqyd: 9,
    hectare: 10000 * M2,
    acre: 43560,
    rood: 10890,
    pole: 272.25,
    relung: 30976,
    jemba: 64,
    orlong: 57600
  };
  var ORDER = ['sqft', 'sqm', 'acre', 'hectare', 'relung', 'orlong', 'sqyd', 'jemba', 'rood', 'pole'];
  var NAMES = {
    en: { sqft: 'Square feet', sqm: 'Square metres', sqyd: 'Square yards', hectare: 'Hectares', acre: 'Acres', rood: 'Roods', pole: 'Poles (perches)', relung: 'Relung', jemba: 'Jemba', orlong: 'Orlong' },
    ms: { sqft: 'Kaki persegi', sqm: 'Meter persegi', sqyd: 'Ela persegi', hectare: 'Hektar', acre: 'Ekar', rood: 'Rod', pole: 'Pole (jerumbai)', relung: 'Relung', jemba: 'Jemba', orlong: 'Orlong' }
  };
  var SHORT = { sqft: 'sq ft', sqm: 'm²', sqyd: 'sq yd', hectare: 'ha', acre: 'ac', rood: 'r', pole: 'p', relung: 'relung', jemba: 'jemba', orlong: 'orlong' };

  var num = function (v) { v = Number(v); return isFinite(v) && v >= 0 ? v : 0; };

  function convert(value, from) { return num(value) * (UNITS[from] || 1); }

  // Every unit for an area given in square feet.
  function all(sqft) {
    var out = {};
    ORDER.forEach(function (u) { out[u] = sqft / UNITS[u]; });
    return out;
  }

  // Acres, roods and poles as written on old titles; poles rounded to two decimals.
  function toArp(sqft) {
    var poles = Math.round(sqft / UNITS.pole * 100) / 100;
    var a = Math.floor(poles / 160 + 1e-9), r = Math.floor((poles - a * 160) / 40 + 1e-9);
    return { a: a, r: r, p: Math.round((poles - a * 160 - r * 40) * 100) / 100 };
  }
  function fromArp(a, r, p) { return num(a) * UNITS.acre + num(r) * UNITS.rood + num(p) * UNITS.pole; }

  // Area from the sides of a rectangular lot, in feet or metres.
  function rect(length, width, unit) {
    var f = unit === 'm' ? 1 / 0.3048 : 1;
    return num(length) * f * num(width) * f;
  }

  // Price per unit of area for a total price.
  function price(total, sqft) {
    total = num(total);
    if (!(sqft > 0) || !(total > 0)) return null;
    return { sqft: total / sqft, sqm: total / (sqft / UNITS.sqm), acre: total / (sqft / UNITS.acre), relung: total / (sqft / UNITS.relung) };
  }

  var api = { UNITS: UNITS, ORDER: ORDER, NAMES: NAMES, SHORT: SHORT, convert: convert, all: all, toArp: toArp, fromArp: fromArp, rect: rect, price: price,
    FACTS: { verified: '2026-10-14' } };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBLand = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
