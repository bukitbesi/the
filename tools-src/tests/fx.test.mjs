// Currency: BNM noon middle rates (per 1 or 100 units), ECB backup, conversion and money-changer spread.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const X = require('../../assets/js/fx-core.js');
const bnm = { data: [
  { currency_code: 'USD', unit: 1, rate: { date: '2026-10-14', buying_rate: 4.2, selling_rate: 4.21, middle_rate: 4.205 } },
  { currency_code: 'JPY', unit: 100, rate: { date: '2026-10-14', buying_rate: 2.79, selling_rate: 2.8, middle_rate: null } },
  { currency_code: 'SGD', unit: 1, rate: { date: '2026-10-14', buying_rate: 3.25, selling_rate: 3.26, middle_rate: 3.255 } },
  { currency_code: 'EUR', unit: 1, rate: { date: '2026-10-14', buying_rate: 4.9, selling_rate: 4.92, middle_rate: 4.91 } },
  { currency_code: 'IDR', unit: 100, rate: { date: '2026-10-14', buying_rate: 0.026, selling_rate: 0.0262, middle_rate: 0.0261 } },
  { currency_code: 'SDR', unit: 1, rate: { date: '2026-10-14', buying_rate: 5.7, selling_rate: 5.72, middle_rate: 5.71 } }
], meta: { session: '1200' } };

test('BNM parse: per-100 units, mid from buy/sell when missing, SDR dropped', () => {
  const s = X.parseBnm(bnm);
  assert.equal(s.date, '2026-10-14'); assert.equal(s.source, 'BNM');
  assert.equal(s.rates.SDR, undefined);
  assert.ok(Math.abs(X.perUnit(s, 'JPY') - 0.02795) < 1e-9);
  assert.equal(X.parseBnm({ data: [] }), null);
});

test('USD 100 = RM420.50; RM100 = USD 23.78; SGD to USD; spread of a 4.35 counter rate is 3.45%', () => {
  const s = X.parseBnm(bnm);
  assert.equal(Math.round(X.convert(s, 100, 'USD', 'MYR').result * 100) / 100, 420.5);
  assert.equal(Math.round(X.convert(s, 100, 'MYR', 'USD').result * 100) / 100, 23.78);
  assert.ok(Math.abs(X.convert(s, 1, 'SGD', 'USD').result - 3.255 / 4.205) < 1e-12);
  assert.equal(Math.round(X.spread(s, 'USD', 4.35) * 100) / 100, 3.45);
  assert.equal(X.convert(s, 1, 'XXX', 'MYR'), null);
});

test('ECB backup: ringgit per unit is the inverse of the quoted rate', () => {
  const e = X.parseFrankfurter({ date: '2026-10-14', base: 'MYR', rates: { USD: 0.25, EUR: 0.2, GBP: 0.18, JPY: 35, SGD: 0.31 } });
  assert.equal(X.perUnit(e, 'USD'), 4); assert.equal(e.source, 'ECB');
});
