// Zakat: income (gross and LZS net), nisab, tax rebate; gold (kept, worn over uruf) and savings.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Z = require('../../assets/js/zakat-core.js');

test('Gross method: RM5,000 a month', () => {
  const r = Z.income({ salary: 5000 });
  assert.equal(r.yearly, 60000);
  assert.equal(r.zakat, 1500);
  assert.equal(r.monthly, 125);
  assert.equal(Z.income({ salary: 60000, period: 'yearly' }).zakat, 1500);
});

test('Below the nisab owes nothing', () => {
  const r = Z.income({ salary: 3000 });
  assert.equal(r.due, false);
  assert.equal(r.zakat, 0);
  assert.equal(r.shortOfNisab, 38748 - 36000);
});

test('Net method with LZS 2026 had kifayah and 11% EPF', () => {
  const r = Z.income({ salary: 5000, method: 'net', adults: 1, others: 1, kids7: 1, kids6: 1 });
  assert.equal(r.deducted, 4944 + 2004 + 4896 + 2100 + 6600);
  assert.equal(r.base, 39456);
  assert.equal(r.zakat, 986.4);
  assert.equal(Z.income({ salary: 5000, method: 'net', epf: 0 }).deducted, 4944);
});

test('Tax rebate is capped at the tax', () => {
  const r = Z.income({ salary: 5000, tax: 1200 });
  assert.equal(r.rebate, 1200);
  assert.equal(r.taxAfter, 0);
  assert.equal(Z.income({ salary: 5000, tax: 3000 }).taxAfter, 1500);
});

test('Gold: kept from 85 g, worn above uruf, savings above nisab', () => {
  assert.equal(Z.FACTS.goldPrice, 455.86);
  const r = Z.gold({ kept: 100, worn: 900, uruf: 800, savings: 50000 });
  assert.equal(r.lines.kept.zakat, 1139.65);
  assert.equal(r.lines.worn.excess, 100);
  assert.equal(r.lines.worn.zakat, 1139.65);
  assert.equal(r.lines.savings.zakat, 1250);
  assert.equal(r.total, 3529.3);
  assert.equal(Z.gold({ kept: 84 }).lines.kept.zakat, 0);
  assert.equal(Z.gold({ worn: 800, uruf: 800 }).lines.worn.zakat, 0);
  assert.equal(Z.gold({ worn: 700, uruf: 600 }).lines.worn.excess, 100);
  assert.equal(Z.gold({ savings: 30000 }).lines.savings.zakat, 0);
});
