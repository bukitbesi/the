// Gold price: BNM/spot parsing, per-gram prices by purity, Kijang Emas, jewellery check, chart and units.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const G = require('../../assets/js/gold-core.js');

const KIJANG = { data: { effective_date: '2026-10-09', one_oz: { buying: 17301, selling: 18001 }, half_oz: { buying: 8651, selling: 9183 }, quarter_oz: { buying: 4325, selling: 4683 } }, meta: { total_result: 1 } };

test('Parses the BNM Kijang Emas response', () => {
  const k = G.parseKijang(KIJANG);
  assert.equal(k.date, '2026-10-09');
  assert.deepEqual(k.oneOz, { buy: 17301, sell: 18001 });
  assert.equal(k.halfOz.sell, 9183);
  assert.equal(G.parseKijang({ data: {} }), null);
  assert.equal(G.parseKijang(null), null);
  const h = G.parseKijangHistory({ data: [KIJANG.data, { ...KIJANG.data, effective_date: '2026-10-08' }] });
  assert.equal(h.length, 2);
});

test('Parses exchange rates and spot with sanity limits', () => {
  assert.deepEqual(G.parseBnmFx({ data: { currency_code: 'USD', unit: 1, rate: { date: '2026-10-09', middle_rate: 4.2 } } }), { usdMyr: 4.2, date: '2026-10-09', source: 'BNM' });
  assert.equal(G.parseBnmFx({ data: { unit: 1, rate: { middle_rate: 42 } } }), null);
  assert.equal(G.parseFrankfurter({ date: '2026-10-09', rates: { MYR: 4.21 } }).usdMyr, 4.21);
  assert.equal(G.parseSpot({ price: 4000, updatedAt: 'x' }).usdOz, 4000);
  assert.equal(G.parseSpot({ price: 4 }), null);
});

test('Pure gold per gram from spot, else from Kijang Emas', () => {
  const spot = G.pureGram({ spot: { usdOz: 3110.34768 }, fx: { usdMyr: 4 } });
  assert.equal(Math.round(spot.rm * 100) / 100, 400);
  assert.equal(spot.basis, 'spot');
  const k = G.pureGram({ kijang: G.parseKijang(KIJANG) });
  assert.equal(k.basis, 'kijang');
  assert.equal(Math.round(k.rm * 100) / 100, 556.24);
  assert.equal(G.pureGram({}), null);
});

test('Purity table and Kijang per gram', () => {
  const t = G.table(500);
  assert.deepEqual(t[0], { fineness: 999, karat: 24, gram: 499.5, oz: 15536.19, tenGram: 4995 });
  assert.equal(t.find(r => r.fineness === 916).gram, 458);
  const kg = G.kijangGram(G.parseKijang(KIJANG));
  assert.equal(kg.sell, 578.75);
  assert.equal(kg.spread, 3.89);
});

test('Jewellery check: metal value, making charge and premium', () => {
  const j = G.jewellery({ weight: 10, fineness: 916, making: 30, shop: 5000 }, 500);
  assert.equal(j.metal, 4580);
  assert.equal(j.labour, 300);
  assert.equal(j.fair, 4880);
  assert.equal(j.premium, 9.17);
  assert.equal(j.diff, 120);
});

test('Units, history merge and chart', () => {
  assert.equal(G.units(1, 'oz').g, G.OZ);
  assert.equal(G.units(2, 'kg').g, 2000);
  const h = G.mergeHistory([{ date: '2026-10-08', buy: 1, sell: 2 }], [{ date: '2026-10-08', buy: 3, sell: 4 }, { date: '2026-10-07', buy: 1, sell: 1 }]);
  assert.deepEqual(h.map(r => r.date), ['2026-10-07', '2026-10-08']);
  assert.equal(h[1].sell, 4);
  assert.equal(G.chart([{ date: 'a', sell: 100 }], 300, 100), null);
  const c = G.chart([{ date: 'a', sell: G.OZ * 100 }, { date: 'b', sell: G.OZ * 110 }], 300, 100);
  assert.equal(c.points, '0.0,100.0 300.0,0.0');
  assert.equal(c.change, 10);
});
