/* Cups and spoons to grams (sukatan cawan ke gram) for Malaysian baking and cooking. Weights are grams per US cup
   (236.59 ml) from King Arthur Baking's ingredient weight chart and USDA FoodData Central; where they differ both are
   kept as a range and the first (spooned and levelled) is the default. Grams for other cups scale by volume: Malaysian
   measuring sets are mostly 250 ml (metric cup), some recipe sites use 240 ml (US legal cup). Spoons: sudu besar
   15 ml, sudu kecil / sudu teh 5 ml. Liquids use density (water 1 g/ml). Ingredients whose published weights conflict
   (tepung kek, tepung beras, tepung pulut, gula melaka, kelapa parut segar) are left out. Verified 20 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-20', usCup: 236.5882365, cups: { 250: 'metric', 240: 'uslegal', 236.59: 'us' }, tbsp: 15, tsp: 5,
    eggs: { A: [65, 69.9], B: [60, 64.9], C: [55, 59.9] }, butterStick: 113 };
  // key: [ms name, en name, [g per US cup (default), other source], aliases]
  var ING = {
    flour: ['Tepung gandum', 'All-purpose flour', [120, 125], 'tepung gandum|tepung serbaguna|tepung|all-purpose flour|plain flour|flour'],
    srflour: ['Tepung naik sendiri', 'Self-raising flour', [113, 125], 'tepung naik sendiri|self-raising flour|self raising flour|self-rising flour'],
    cornflour: ['Tepung jagung', 'Cornflour (cornstarch)', [112, 128], 'tepung jagung|cornflour|cornstarch|corn flour'],
    sugar: ['Gula pasir', 'Granulated sugar', [198, 200], 'gula pasir|gula kasar|granulated sugar|white sugar|caster sugar|gula castor|sugar|gula'],
    brown: ['Gula perang (ditekan)', 'Brown sugar (packed)', [213, 220], 'gula perang|brown sugar'],
    icing: ['Gula aising', 'Icing sugar', [113, 120], 'gula aising|gula icing|icing sugar|powdered sugar|confectioners sugar'],
    butter: ['Mentega', 'Butter', [227, 227], 'mentega|butter'],
    margarine: ['Marjerin', 'Margarine', [227, 227], 'marjerin|majerin|planta|margarine'],
    oil: ['Minyak masak', 'Cooking oil', [218, 218], 'minyak masak|minyak sayur|minyak jagung|minyak|vegetable oil|cooking oil|oil'],
    water: ['Air', 'Water', [236.6, 236.6], 'air|water'],
    milk: ['Susu segar', 'Milk', [244, 244], 'susu segar|susu cair|susu full cream|fresh milk|milk|susu'],
    coconut: ['Santan', 'Coconut milk', [226, 241], 'santan|coconut milk'],
    condensed: ['Susu pekat manis', 'Sweetened condensed milk', [312, 306], 'susu pekat manis|susu pekat|condensed milk'],
    cocoa: ['Serbuk koko', 'Cocoa powder', [84, 86], 'serbuk koko|koko|cocoa powder|cocoa'],
    rice: ['Beras', 'Rice (raw)', [185, 189], 'beras|rice'],
    desiccated: ['Kelapa kering', 'Desiccated coconut', [85, 80], 'kelapa kering|desiccated coconut'],
    honey: ['Madu', 'Honey', [336, 339], 'madu|honey'],
    oats: ['Oat', 'Rolled oats', [89, 90], 'oat|oats|rolled oats'],
    peanuts: ['Kacang tanah', 'Peanuts', [142, 146], 'kacang tanah|peanuts|groundnuts'],
    yogurt: ['Yogurt', 'Yogurt', [245, 227], 'yogurt|yoghurt|dadih'],
    cream: ['Krim putar', 'Whipping cream', [238, 227], 'krim putar|whipping cream|heavy cream|krim'],
    cheese: ['Keju parut', 'Grated cheese', [113, 113], 'keju parut|keju|cheese|cheddar'],
    salt: ['Garam', 'Salt', [288, 288], 'garam|salt']
  };
  // Unit → ml (cups use the chosen cup); null means a weight unit.
  var UNITS = [
    [/^(cawan|cwn|cups?|c)$/i, 'cup'], [/^(sudu besar|sb|s\.b\.?|tbsp|tbs|tablespoons?|camca besar)$/i, 'tbsp'],
    [/^(sudu kecil|sudu teh|sk|s\.k\.?|st|tsp|teaspoons?|camca kecil)$/i, 'tsp'], [/^(ml|mililiter|millilitres?|milliliters?)$/i, 'ml'],
    [/^(l|liter|litre|liters|litres)$/i, 'l'], [/^(g|gram|grams|gm)$/i, 'g'], [/^(kg|kilogram|kilograms)$/i, 'kg']
  ];
  var FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };

  // "1 1/2", "1½", "¾", "0.5", "1,5" → number; NaN if none.
  function parseAmount(s) {
    s = String(s || '').trim().replace(',', '.');
    var total = 0, found = false;
    s = s.replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g, function (f) { total += FRACTIONS[f]; found = true; return ' '; });
    var m = s.match(/^\s*(\d+(?:\.\d+)?)?\s*(?:(\d+)\s*\/\s*(\d+))?\s*$/);
    if (!m) return found ? total : NaN;
    if (m[1] && m[2]) { total += Number(m[1]) + Number(m[2]) / Number(m[3]); found = true; }
    else if (m[2]) { total += Number(m[2]) / Number(m[3]); found = true; }
    else if (m[1]) { total += Number(m[1]); found = true; }
    return found ? total : NaN;
  }
  function unitOf(s) { s = String(s || '').trim(); for (var i = 0; i < UNITS.length; i++) if (UNITS[i][0].test(s)) return UNITS[i][1]; return null; }
  function ml(amount, unit, cupMl) {
    cupMl = cupMl || 250;
    return unit === 'cup' ? amount * cupMl : unit === 'tbsp' ? amount * FACTS.tbsp : unit === 'tsp' ? amount * FACTS.tsp : unit === 'ml' ? amount : unit === 'l' ? amount * 1000 : null;
  }
  // Grams for a volume of an ingredient: { g, low, high } (low/high from the two sources).
  function grams(key, volMl) {
    var d = ING[key][2], per = function (gpc) { return gpc / FACTS.usCup * volMl; };
    var a = per(d[0]), b = per(d[1]);
    return { g: a, low: Math.min(a, b), high: Math.max(a, b) };
  }
  // Volume for a weight (grams to cups): ml.
  function volume(key, g) { return g / (ING[key][2][0] / FACTS.usCup); }

  function convert(o) {
    var key = ING[o.ing] ? o.ing : 'flour', amount = parseAmount(o.amount), unit = o.unit || 'cup', cupMl = Number(o.cup) || 250;
    if (!(amount >= 0)) amount = 0;
    var g, v;
    if (unit === 'g' || unit === 'kg') { g = unit === 'kg' ? amount * 1000 : amount; v = volume(key, g); return { key: key, g: g, low: g, high: g, ml: v, cups: v / cupMl, tbsp: v / FACTS.tbsp, tsp: v / FACTS.tsp, cupMl: cupMl }; }
    v = ml(amount, unit, cupMl);
    var r = grams(key, v);
    return { key: key, g: r.g, low: r.low, high: r.high, ml: v, cups: v / cupMl, tbsp: v / FACTS.tbsp, tsp: v / FACTS.tsp, cupMl: cupMl };
  }

  // Finds the ingredient named in free text (longest alias wins, so "tepung naik sendiri" beats "tepung").
  var ALIASES = [];
  Object.keys(ING).forEach(function (k) { ING[k][3].split('|').forEach(function (a) { ALIASES.push([a, k]); }); });
  ALIASES.sort(function (a, b) { return b[0].length - a[0].length; });
  function findIngredient(text) {
    var t = ' ' + String(text || '').toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ') + ' ';
    for (var i = 0; i < ALIASES.length; i++) if (t.indexOf(' ' + ALIASES[i][0] + ' ') >= 0) return ALIASES[i][1];
    return null;
  }
  // One recipe line, e.g. "2 1/2 cawan tepung gandum (diayak)" → amount, unit, ingredient and grams × factor.
  function parseLine(line, cupMl, factor) {
    var raw = String(line || '').trim(), f = Number(factor) || 1;
    if (!raw) return null;
    var m = raw.match(/^[-•*\s]*((?:\d+(?:[.,]\d+)?)?\s*(?:\d+\s*\/\s*\d+)?\s*[½¼¾⅓⅔⅛⅜⅝⅞]?)\s*(sudu besar|sudu kecil|sudu teh|camca besar|camca kecil|[a-zA-Z.]+)?\s*(.*)$/);
    var amount = m ? parseAmount(m[1]) : NaN, unit = m && m[2] ? unitOf(m[2]) : null, rest = m ? m[3] : raw;
    if (m && m[2] && !unit) rest = m[2] + ' ' + rest;
    var key = findIngredient(rest);
    var out = { line: raw, amount: amount, unit: unit, key: key, scaled: isFinite(amount) ? amount * f : NaN, g: null, low: null, high: null };
    if (!isFinite(amount)) return out;
    // Eggs by count: Gred B (60.0–64.9 g in shell, P.U.(A) 223/2022), the grade most recipes assume.
    if (!key && /\b(telur|eggs?)\b/i.test(rest)) { var e = FACTS.eggs.B; out.key = 'egg'; out.low = e[0] * out.scaled; out.high = e[1] * out.scaled; out.g = (e[0] + e[1]) / 2 * out.scaled; return out; }
    if (unit === 'g' || unit === 'kg') { out.g = out.low = out.high = out.scaled * (unit === 'kg' ? 1000 : 1); return out; }
    var v = unit ? ml(out.scaled, unit, cupMl) : null;
    if (v !== null && key) { var r = grams(key, v); out.g = r.g; out.low = r.low; out.high = r.high; }
    else if (v !== null && (unit === 'ml' || unit === 'l')) out.ml = v;
    return out;
  }
  function parseRecipe(text, cupMl, factor) { return String(text || '').split(/\r?\n/).map(function (l) { return parseLine(l, cupMl, factor); }).filter(Boolean); }

  // Scale a recipe for a different tin: ratio of base areas (round: diameter, square: side, rectangle: w × h in cm or inches).
  function tinArea(shape, a, b) { a = Number(a) || 0; b = Number(b) || a; return shape === 'round' ? Math.PI * a * a / 4 : shape === 'rect' ? a * b : a * a; }
  function tinFactor(from, to) { var A = tinArea(from.shape, from.a, from.b); return A ? tinArea(to.shape, to.a, to.b) / A : 1; }

  // Display rounding: < 10 g to 0.5 g, otherwise whole grams.
  function round(g) { return g < 10 ? Math.round(g * 2) / 2 : Math.round(g); }

  var api = { FACTS: FACTS, ING: ING, parseAmount: parseAmount, unitOf: unitOf, ml: ml, grams: grams, volume: volume, convert: convert, findIngredient: findIngredient, parseLine: parseLine, parseRecipe: parseRecipe, tinFactor: tinFactor, round: round };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBSukatan = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
