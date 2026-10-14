// SSPN: balance projection with the yearly dividend, RM8,000 tax relief and tax saved.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../../assets/js/sspn-core.js');

test('RM200 a month for 18 years at 4.10% grows to RM63,496.58', () => {
  const r = S.calculate({ monthly: 200, years: 18, rate: 4.1, income: 60000 });
  assert.equal(r.deposits, 43200);
  assert.equal(r.balance, 63496.58);
  assert.equal(r.dividends, 20296.58);
  assert.equal(S.calculate({ monthly: 200, years: 1, rate: 4.1 }).balance, 2453.3);
});

test('Relief is capped at RM8,000; tax saved at the marginal rate', () => {
  const r = S.calculate({ monthly: 200, years: 18, rate: 4.1, income: 60000 });
  assert.equal(r.relief, 2400);
  assert.equal(r.taxSaved, 264);
  const m = S.calculate({ monthly: 500, lump: 2000, years: 1, rate: 4.1, income: 60000 });
  assert.equal(m.relief, 8000);
  assert.equal(m.taxSaved, 880);
  assert.equal(S.calculate({ monthly: 1000, years: 1, rate: 4.1, income: 120000 }).taxSaved, 2000);
  assert.equal(S.calculate({ monthly: 500, years: 1, rate: 4.1, income: 30000 }).taxSaved, 50);
});
