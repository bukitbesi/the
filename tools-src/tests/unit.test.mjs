// Unit converter core: exact SI and US/imperial definitions, Malaysian traditional units, temperature and fuel
// economy formulas, formatting. The numbers here are the ones quoted on the EN and BM pages.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const U = require('../../assets/js/unit-core.js');
const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} ≈ ${b}`);

test('Exact length, mass and volume definitions', () => {
  near(U.convert(1, 'length', 'in', 'cm'), 2.54);
  near(U.convert(1, 'length', 'ft', 'm'), 0.3048);
  near(U.convert(1, 'length', 'mi', 'km'), 1.609344);
  near(U.convert(5, 'length', 'ft', 'cm'), 152.4);
  near(U.convert(1, 'mass', 'lb', 'kg'), 0.45359237);
  near(U.convert(1, 'mass', 'kg', 'lb'), 2.2046226218);
  near(U.convert(1, 'volume', 'gal', 'l'), 3.785411784);
  near(U.convert(1, 'volume', 'impgal', 'l'), 4.54609);
  near(U.convert(1, 'volume', 'cup', 'ml'), 236.5882365);
  near(U.convert(1, 'volume', 'tbsp', 'tsp'), 3);
  near(U.convert(1, 'area', 'ac', 'm2'), 4046.8564224);
  near(U.convert(1, 'area', 'ha', 'ac'), 2.4710538147);
  near(U.convert(1000, 'area', 'ft2', 'm2'), 92.90304);
});

test('Malaysian traditional units: kati = 1⅓ lb, 16 tahil, 100 kati per pikul, gantang = imperial gallon', () => {
  near(U.convert(1, 'mass', 'kati', 'g'), 604.78982666667);
  near(U.convert(1, 'mass', 'tahil', 'g'), 37.79936416667);
  near(U.convert(1, 'mass', 'pikul', 'kg'), 60.478982666667);
  near(U.convert(1, 'mass', 'kg', 'kati'), 1.653466966, 1e-9);
  near(U.convert(1, 'volume', 'gantang', 'l'), 4.54609);
  near(U.convert(1, 'volume', 'gantang', 'cupak'), 4);
  assert.equal(U.format(U.convert(1, 'mass', 'kati', 'g'), 6), '604.79');
});

test('Temperature formulas', () => {
  near(U.convert(100, 'temperature', 'c', 'f'), 212);
  near(U.convert(37, 'temperature', 'c', 'f'), 98.6);
  near(U.convert(98.6, 'temperature', 'f', 'c'), 37);
  near(U.convert(-40, 'temperature', 'f', 'c'), -40);
  near(U.convert(0, 'temperature', 'k', 'c'), -273.15);
  near(U.convert(32, 'temperature', 'f', 'k'), 273.15);
});

test('Speed, time, data, pressure, energy and power', () => {
  near(U.convert(110, 'speed', 'kmh', 'mph'), 68.35083115, 1e-9);
  near(U.convert(1, 'speed', 'kn', 'kmh'), 1.852);
  near(U.convert(1, 'time', 'd', 'min'), 1440);
  near(U.convert(1, 'data', 'GB', 'MB'), 1000);
  near(U.convert(1, 'data', 'GiB', 'MiB'), 1024);
  near(U.convert(1, 'data', 'TB', 'GiB'), 931.3225746);
  near(U.convert(100, 'data', 'Mbit', 'MB'), 12.5);
  near(U.convert(1, 'pressure', 'psi', 'pa'), 6894.757293168);
  near(U.convert(32, 'pressure', 'psi', 'bar'), 2.2063223338);
  near(U.convert(1, 'pressure', 'atm', 'psi'), 14.695948775);
  near(U.convert(1, 'energy', 'kwh', 'kj'), 3600);
  near(U.convert(1, 'energy', 'kcal', 'kj'), 4.184);
  near(U.convert(1, 'power', 'hp', 'w'), 745.69987158227);
  near(U.convert(1, 'power', 'hp', 'kw'), 0.74569987158);
  near(U.convert(1, 'power', 'ps', 'kw'), 0.73549875);
});

test('Fuel economy is reciprocal for L/100 km and matches the published factors', () => {
  near(U.convert(8, 'fuel', 'l100', 'kml'), 12.5);
  near(U.convert(12.5, 'fuel', 'kml', 'l100'), 8);
  near(U.convert(1, 'fuel', 'kml', 'mpg'), 2.352145833);
  near(U.convert(1, 'fuel', 'kml', 'mpguk'), 2.824809363);
  near(U.convert(30, 'fuel', 'mpg', 'l100'), 7.840486111, 1e-9);
  near(U.convert(1, 'fuel', 'mpg', 'mpguk'), 1.200949926);
  assert.equal(U.convert(0, 'fuel', 'l100', 'kml'), Infinity);
});

test('Formatting and the result view', () => {
  assert.equal(U.format(1234567.891, 10), '1,234,567.891');
  assert.equal(U.format(0.1 + 0.2, 10), '0.3');
  assert.equal(U.format(1234.5, 10, 'ms'), '1,234.5');
  assert.equal(U.format(2.5e-9, 6), '2.5 × 10^-9');
  assert.equal(U.format(NaN), '–');
  const v = U.view({ cat: 'mass', from: 'kati', to: 'kg', value: '2' }, 'en');
  assert.equal(v.big, '1.209579653 kg');
  assert.equal(v.rule, '1 kati = 0.6047898267 kg');
  assert.equal(v.rows.length, U.CATS.mass.units.length - 1);
  const t = U.view({ cat: 'temperature', from: 'c', to: 'f', value: '30' }, 'ms');
  assert.deepEqual([t.big, t.rule], ['86 °F', '°F = °C × 9/5 + 32']);
  const bad = U.view({ cat: 'nope', from: 'x', to: 'y', value: 'abc' }, 'en');
  assert.deepEqual([bad.cat, bad.from, bad.to, bad.ok, bad.big], ['length', 'ft', 'cm', false, '–']);
  for (const c of U.ORDER) { assert.ok(U.CATS[c], c); for (const k of U.DEFAULTS[c]) assert.ok(U.unit(c, k), c + ' ' + k); }
  for (const c of U.ORDER) assert.equal(new Set(U.CATS[c].units.map(u => u[0])).size, U.CATS[c].units.length, 'unique keys in ' + c);
});
