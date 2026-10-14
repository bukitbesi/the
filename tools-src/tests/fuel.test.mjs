// Fuel cost: trip cost, consumption from a fill-up, BUDI95 quota and the data.gov.my parser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const F = require('../../assets/js/fuel-core.js');
const data = require('../fuel-data.json');

test('Trip cost: litres × price, cost per km and per person', () => {
  const r = F.trip({ distance: 350, consumption: 7, unit: 'l100', price: 1.99, passengers: 1 });
  assert.equal(r.litres, 24.5);
  assert.equal(r.fuel, 48.76);
  assert.equal(Math.round(r.perKm * 1000) / 1000, 0.139);
  const rt = F.trip({ distance: 350, consumption: 14.2857142857, unit: 'kml', price: 1.99, roundTrip: 'yes', passengers: 2, toll: 60 });
  assert.equal(rt.km, 700);
  assert.equal(rt.litres, 49);
  assert.equal(rt.total, 157.51);
  assert.equal(rt.perPerson, 78.76);
});

test('Consumption from the full-tank method', () => {
  const r = F.measure({ km: 450, litres: 36, price: 1.99 });
  assert.equal(r.l100, 8);
  assert.equal(r.kml, 12.5);
  assert.equal(r.cost, 71.64);
  assert.equal(F.toL100(12.5, 'kml'), 8);
});

test('BUDI95: litres above the 300-litre quota pay the market price', () => {
  const prices = { ron95_budi95: 1.99, ron95: 4.67 };
  const r = F.monthly(350, 'ron95_budi95', prices, 300);
  assert.equal(r.subsidised, 300);
  assert.equal(r.over, 50);
  assert.equal(r.cost, 830.5);
  assert.equal(r.saving, 804);
  assert.equal(F.monthly(100, 'ron97', { ron97: 5.15 }).cost, 515);
  assert.equal(F.FACTS.budiQuota, 300);
});

test('data.gov.my rows and the baked snapshot', () => {
  const rows = F.parseApi([{ date: '2026-10-08', series_type: 'level', ron95: 4.67, ron97: 5.15, diesel: 5.27, ron95_budi95: 1.99, diesel_eastmsia: 2.15, diesel_budi: 2.1 },
    { date: '2026-10-08', series_type: 'change_weekly', ron95: 0.15, ron97: 0.15, diesel: 0 }]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].ron95_budi95, 1.99);
  const merged = F.mergeHistory([{ date: '2026-10-01', ron95: 4.52 }], rows);
  assert.deepEqual(merged.map(r => r.date), ['2026-10-01', '2026-10-08']);
  const L = F.latest(data.history);
  assert(L.prices.ron95_budi95 > 0 && L.prices.ron95 > L.prices.ron95_budi95 && L.prices.ron97 > 0 && L.prices.diesel > 0);
  assert(data.history.length >= 8 && data.history.length <= 52);
});
