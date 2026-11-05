/* Unit converter core: length, mass (with kati, tahil and pikul), volume (with gantang and cupak), area, temperature,
   speed, time, digital storage (SI and binary prefixes), pressure, energy, power and fuel economy.
   Every factor is an exact definition (NIST SP 811 / Handbook 44, BIPM SI Brochure, IEC 80000-13) unless marked.
   UMD: module.exports in Node, window.TBBUnit in the browser. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-11-05' };

  var FT = 0.3048, IN = 0.0254, MI = 1609.344, LB = 0.45359237, USGAL = 3.785411784, IMPGAL = 4.54609, LBF = 4.4482216152605;
  var BTU = 1055.05585262, KATI = LB * 4 / 3;
  // [key, factor to the category base unit, EN name, MS name, symbol]
  var CATS = {
    length: { base: 'm', en: 'Length', ms: 'Panjang', units: [
      ['mm', 0.001, 'Millimetre', 'Milimeter', 'mm'], ['cm', 0.01, 'Centimetre', 'Sentimeter', 'cm'], ['m', 1, 'Metre', 'Meter', 'm'],
      ['km', 1000, 'Kilometre', 'Kilometer', 'km'], ['in', IN, 'Inch', 'Inci', 'in'], ['ft', FT, 'Foot', 'Kaki', 'ft'],
      ['yd', 0.9144, 'Yard', 'Ela', 'yd'], ['mi', MI, 'Mile', 'Batu', 'mi'], ['nmi', 1852, 'Nautical mile', 'Batu nautika', 'nmi'],
      ['um', 1e-6, 'Micrometre', 'Mikrometer', 'µm']] },
    mass: { base: 'kg', en: 'Mass (weight)', ms: 'Jisim (berat)', units: [
      ['mg', 1e-6, 'Milligram', 'Miligram', 'mg'], ['g', 0.001, 'Gram', 'Gram', 'g'], ['kg', 1, 'Kilogram', 'Kilogram', 'kg'],
      ['t', 1000, 'Tonne (metric ton)', 'Tan metrik', 't'], ['oz', LB / 16, 'Ounce', 'Auns', 'oz'], ['lb', LB, 'Pound', 'Paun', 'lb'],
      ['st', LB * 14, 'Stone', 'Stone', 'st'], ['ton', LB * 2000, 'US ton (short)', 'Tan AS (pendek)', 'US ton'],
      ['lton', LB * 2240, 'UK ton (long)', 'Tan UK (panjang)', 'UK ton'], ['ct', 0.0002, 'Carat', 'Karat', 'ct'],
      ['tahil', KATI / 16, 'Tahil', 'Tahil', 'tahil'], ['kati', KATI, 'Kati', 'Kati', 'kati'], ['pikul', KATI * 100, 'Pikul', 'Pikul', 'pikul']] },
    volume: { base: 'l', en: 'Volume', ms: 'Isi padu', units: [
      ['ml', 0.001, 'Millilitre', 'Mililiter', 'ml'], ['l', 1, 'Litre', 'Liter', 'L'], ['m3', 1000, 'Cubic metre', 'Meter padu', 'm³'],
      ['tsp', USGAL / 768, 'Teaspoon (US)', 'Sudu kecil (AS)', 'tsp'], ['tbsp', USGAL / 256, 'Tablespoon (US)', 'Sudu besar (AS)', 'tbsp'],
      ['floz', USGAL / 128, 'Fluid ounce (US)', 'Auns cecair (AS)', 'fl oz'], ['cup', USGAL / 16, 'Cup (US)', 'Cawan (AS)', 'cup'],
      ['mcup', 0.25, 'Cup (metric, 250 ml)', 'Cawan metrik (250 ml)', 'cup'], ['pt', USGAL / 8, 'Pint (US)', 'Pain (AS)', 'pt'],
      ['qt', USGAL / 4, 'Quart (US)', 'Kuart (AS)', 'qt'], ['gal', USGAL, 'Gallon (US)', 'Gelen (AS)', 'gal'],
      ['impgal', IMPGAL, 'Gallon (imperial, UK)', 'Gelen imperial (UK)', 'imp gal'], ['imppt', IMPGAL / 8, 'Pint (imperial, UK)', 'Pain imperial (UK)', 'imp pt'],
      ['ft3', FT * FT * FT * 1000, 'Cubic foot', 'Kaki padu', 'ft³'], ['cupak', IMPGAL / 4, 'Cupak', 'Cupak', 'cupak'],
      ['gantang', IMPGAL, 'Gantang', 'Gantang', 'gantang'], ['bbl', USGAL * 42, 'Barrel (oil)', 'Tong (minyak)', 'bbl']] },
    area: { base: 'm2', en: 'Area', ms: 'Luas', units: [
      ['cm2', 1e-4, 'Square centimetre', 'Sentimeter persegi', 'cm²'], ['m2', 1, 'Square metre', 'Meter persegi', 'm²'],
      ['ha', 10000, 'Hectare', 'Hektar', 'ha'], ['km2', 1e6, 'Square kilometre', 'Kilometer persegi', 'km²'],
      ['in2', IN * IN, 'Square inch', 'Inci persegi', 'in²'], ['ft2', FT * FT, 'Square foot', 'Kaki persegi', 'sq ft'],
      ['yd2', 0.9144 * 0.9144, 'Square yard', 'Ela persegi', 'sq yd'], ['ac', FT * FT * 43560, 'Acre', 'Ekar', 'ac'],
      ['mi2', MI * MI, 'Square mile', 'Batu persegi', 'sq mi']] },
    temperature: { base: 'c', en: 'Temperature', ms: 'Suhu', units: [
      ['c', null, 'Celsius', 'Celsius', '°C'], ['f', null, 'Fahrenheit', 'Fahrenheit', '°F'], ['k', null, 'Kelvin', 'Kelvin', 'K']] },
    speed: { base: 'ms', en: 'Speed', ms: 'Laju', units: [
      ['kmh', 1 / 3.6, 'Kilometres per hour', 'Kilometer sejam', 'km/h'], ['ms', 1, 'Metres per second', 'Meter sesaat', 'm/s'],
      ['mph', MI / 3600, 'Miles per hour', 'Batu sejam', 'mph'], ['kn', 1852 / 3600, 'Knot', 'Knot', 'kn'], ['fts', FT, 'Feet per second', 'Kaki sesaat', 'ft/s']] },
    time: { base: 's', en: 'Time', ms: 'Masa', units: [
      ['ms', 0.001, 'Millisecond', 'Milisaat', 'ms'], ['s', 1, 'Second', 'Saat', 's'], ['min', 60, 'Minute', 'Minit', 'min'],
      ['h', 3600, 'Hour', 'Jam', 'h'], ['d', 86400, 'Day', 'Hari', 'd'], ['wk', 604800, 'Week', 'Minggu', 'wk'],
      ['yr', 31536000, 'Year (365 days)', 'Tahun (365 hari)', 'yr']] },
    data: { base: 'B', en: 'Digital storage', ms: 'Storan digital', units: [
      ['bit', 0.125, 'Bit', 'Bit', 'bit'], ['B', 1, 'Byte', 'Bait', 'B'], ['kB', 1e3, 'Kilobyte (1000 B)', 'Kilobait (1000 B)', 'kB'],
      ['MB', 1e6, 'Megabyte', 'Megabait', 'MB'], ['GB', 1e9, 'Gigabyte', 'Gigabait', 'GB'], ['TB', 1e12, 'Terabyte', 'Terabait', 'TB'],
      ['KiB', 1024, 'Kibibyte (1024 B)', 'Kibibait (1024 B)', 'KiB'], ['MiB', 1048576, 'Mebibyte', 'Mebibait', 'MiB'],
      ['GiB', 1073741824, 'Gibibyte', 'Gibibait', 'GiB'], ['TiB', 1099511627776, 'Tebibyte', 'Tebibait', 'TiB'],
      ['Mbit', 125000, 'Megabit', 'Megabit', 'Mb'], ['Gbit', 125e6, 'Gigabit', 'Gigabit', 'Gb']] },
    pressure: { base: 'pa', en: 'Pressure', ms: 'Tekanan', units: [
      ['pa', 1, 'Pascal', 'Pascal', 'Pa'], ['kpa', 1000, 'Kilopascal', 'Kilopascal', 'kPa'], ['bar', 1e5, 'Bar', 'Bar', 'bar'],
      ['psi', LBF / (IN * IN), 'Pound per square inch', 'Paun per inci persegi', 'psi'], ['atm', 101325, 'Standard atmosphere', 'Atmosfera piawai', 'atm'],
      ['mmhg', 133.322387415, 'Millimetre of mercury', 'Milimeter merkuri', 'mmHg'], ['kgcm2', 98066.5, 'Kilogram-force per cm²', 'Kilogram-daya per cm²', 'kgf/cm²']] },
    energy: { base: 'j', en: 'Energy', ms: 'Tenaga', units: [
      ['j', 1, 'Joule', 'Joule', 'J'], ['kj', 1000, 'Kilojoule', 'Kilojoule', 'kJ'], ['cal', 4.184, 'Calorie (thermochemical)', 'Kalori (termokimia)', 'cal'],
      ['kcal', 4184, 'Kilocalorie (food Calorie)', 'Kilokalori (kalori makanan)', 'kcal'], ['wh', 3600, 'Watt-hour', 'Watt-jam', 'Wh'],
      ['kwh', 3.6e6, 'Kilowatt-hour (unit of electricity)', 'Kilowatt-jam (unit elektrik)', 'kWh'], ['btu', BTU, 'British thermal unit (IT)', 'Unit terma British (IT)', 'BTU']] },
    power: { base: 'w', en: 'Power', ms: 'Kuasa', units: [
      ['w', 1, 'Watt', 'Watt', 'W'], ['kw', 1000, 'Kilowatt', 'Kilowatt', 'kW'], ['hp', 550 * FT * LBF, 'Horsepower (mechanical)', 'Kuasa kuda (mekanikal)', 'hp'],
      ['ps', 735.49875, 'Metric horsepower (PS)', 'Kuasa kuda metrik (PS)', 'PS'], ['btuh', BTU / 3600, 'BTU per hour', 'BTU sejam', 'BTU/h']] },
    fuel: { base: 'kml', en: 'Fuel economy', ms: 'Penggunaan bahan api', units: [
      ['kml', null, 'Kilometres per litre', 'Kilometer seliter', 'km/L'], ['l100', null, 'Litres per 100 km', 'Liter setiap 100 km', 'L/100 km'],
      ['mpg', null, 'Miles per gallon (US)', 'Batu segelen (AS)', 'mpg US'], ['mpguk', null, 'Miles per gallon (UK)', 'Batu segelen (UK)', 'mpg UK']] }
  };
  var ORDER = ['length', 'mass', 'volume', 'area', 'temperature', 'speed', 'time', 'data', 'pressure', 'energy', 'power', 'fuel'];
  var DEFAULTS = { length: ['ft', 'cm'], mass: ['kati', 'kg'], volume: ['gal', 'l'], area: ['ft2', 'm2'], temperature: ['c', 'f'], speed: ['kmh', 'mph'],
    time: ['h', 'min'], data: ['GB', 'MB'], pressure: ['psi', 'bar'], energy: ['kwh', 'kj'], power: ['hp', 'kw'], fuel: ['l100', 'kml'] };

  function unit(cat, key) { var c = CATS[cat]; if (!c) return null; for (var i = 0; i < c.units.length; i++) if (c.units[i][0] === key) return c.units[i]; return null; }

  var TEMP = {
    c: [function (v) { return v; }, function (v) { return v; }],
    f: [function (v) { return (v - 32) * 5 / 9; }, function (c) { return c * 9 / 5 + 32; }],
    k: [function (v) { return v - 273.15; }, function (c) { return c + 273.15; }]
  };
  // Fuel economy via km/L; L/100 km is the reciprocal, so 0 has no finite equivalent.
  var KML_MPG = MI / USGAL / 1000, KML_MPGUK = MI / IMPGAL / 1000;
  var FUEL = {
    kml: [function (v) { return v; }, function (v) { return v; }],
    l100: [function (v) { return v ? 100 / v : Infinity; }, function (v) { return v ? 100 / v : Infinity; }],
    mpg: [function (v) { return v * KML_MPG; }, function (v) { return v / KML_MPG; }],
    mpguk: [function (v) { return v * KML_MPGUK; }, function (v) { return v / KML_MPGUK; }]
  };

  function convert(value, cat, from, to) {
    var v = Number(value);
    if (!isFinite(v)) return NaN;
    if (cat === 'temperature') { if (!TEMP[from] || !TEMP[to]) return NaN; return TEMP[to][1](TEMP[from][0](v)); }
    if (cat === 'fuel') { if (!FUEL[from] || !FUEL[to]) return NaN; return FUEL[to][1](FUEL[from][0](v)); }
    var a = unit(cat, from), b = unit(cat, to);
    if (!a || !b) return NaN;
    if (from === to) return v;
    return v * a[1] / b[1];
  }

  // Rounds away binary noise: 12 significant digits, then trims trailing zeros.
  function clean(n) { return isFinite(n) ? Number(n.toPrecision(12)) : n; }

  // Readable number: grouping, up to `sig` significant digits, scientific notation for very large or tiny values.
  function format(n, sig, lang) {
    if (n === Infinity || n === -Infinity) return '∞';
    if (!isFinite(n)) return '–';
    sig = sig || 8;
    n = clean(n);
    if (n === 0) return '0';
    var a = Math.abs(n), sep = lang === 'ms' ? 'ms-MY' : 'en-US';
    if (a >= 1e15 || a < 1e-6) return n.toExponential(Math.min(sig, 10) - 1).replace(/\.?0+e/, 'e').replace('e+', ' × 10^').replace('e-', ' × 10^-');
    var r = Number(n.toPrecision(sig));
    var dec = Math.max(0, sig - 1 - Math.floor(Math.log10(Math.abs(r))));
    return r.toLocaleString(sep, { maximumFractionDigits: Math.min(dec, 20), useGrouping: true });
  }

  function name(u, lang) { return u[lang === 'ms' ? 3 : 2]; }

  // Everything the result panel shows for one input; the build calls it for the first paint.
  function view(s, lang) {
    lang = lang === 'ms' ? 'ms' : 'en';
    var cat = CATS[s.cat] ? s.cat : 'length', d = DEFAULTS[cat];
    var from = unit(cat, s.from) ? s.from : d[0], to = unit(cat, s.to) ? s.to : d[1];
    var raw = String(s.value == null ? '' : s.value).replace(/,/g, '').trim(), v = raw === '' ? NaN : Number(raw);
    var a = unit(cat, from), b = unit(cat, to), out = convert(v, cat, from, to), one = convert(1, cat, from, to);
    var ok = isFinite(v);
    var big = ok ? format(out, 10, lang) + ' ' + b[4] : '–';
    var sub = ok ? format(v, 10, lang) + ' ' + a[4] + ' = ' + format(out, 10, lang) + ' ' + b[4] : (lang === 'ms' ? 'Masukkan nombor.' : 'Enter a number.');
    var rule = cat === 'temperature' || cat === 'fuel' ? formula(cat, from, to, lang) : '1 ' + a[4] + ' = ' + format(one, 10, lang) + ' ' + b[4];
    var rows = CATS[cat].units.filter(function (u) { return u[0] !== from; }).map(function (u) {
      return [name(u, lang), ok ? format(convert(v, cat, from, u[0]), 8, lang) + ' ' + u[4] : '–', u[0]];
    });
    return { cat: cat, from: from, to: to, value: raw, ok: ok, result: out, big: big, sub: sub, rule: rule, rows: rows };
  }

  function formula(cat, from, to, lang) {
    var F = {
      'c>f': '°F = °C × 9/5 + 32', 'f>c': '°C = (°F − 32) × 5/9', 'c>k': 'K = °C + 273.15', 'k>c': '°C = K − 273.15',
      'f>k': 'K = (°F − 32) × 5/9 + 273.15', 'k>f': '°F = (K − 273.15) × 9/5 + 32',
      'kml>l100': 'L/100 km = 100 ÷ km/L', 'l100>kml': 'km/L = 100 ÷ L/100 km', 'kml>mpg': 'mpg (US) = km/L × 2.352146', 'mpg>kml': 'km/L = mpg (US) × 0.4251437',
      'kml>mpguk': 'mpg (UK) = km/L × 2.824809', 'mpguk>kml': 'km/L = mpg (UK) × 0.3540062', 'l100>mpg': 'mpg (US) = 235.2146 ÷ L/100 km',
      'mpg>l100': 'L/100 km = 235.2146 ÷ mpg (US)', 'l100>mpguk': 'mpg (UK) = 282.4809 ÷ L/100 km', 'mpguk>l100': 'L/100 km = 282.4809 ÷ mpg (UK)',
      'mpg>mpguk': 'mpg (UK) = mpg (US) × 1.200950', 'mpguk>mpg': 'mpg (US) = mpg (UK) × 0.8326742'
    };
    return F[from + '>' + to] || (lang === 'ms' ? 'Unit yang sama' : 'Same unit');
  }

  var api = { FACTS: FACTS, CATS: CATS, ORDER: ORDER, DEFAULTS: DEFAULTS, unit: unit, convert: convert, format: format, clean: clean, view: view, name: name, formula: formula, KATI: KATI };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBUnit = api;
})(this);
