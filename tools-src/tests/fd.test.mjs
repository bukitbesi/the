// Fixed deposit: simple interest for the tenure, renewal compounding, PIDM limit.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const F = require('../../assets/js/fd-core.js');

test('RM10,000 at 3.8% for 12 months', () => {
  const r = F.calculate({ amount: 10000, rate: 3.8, months: 12 });
  assert.equal(r.interest, 380);
  assert.equal(r.maturity, 10380);
  assert.equal(r.monthly, 31.67);
  assert.equal(F.interest(10000, 3.8, 6), 190);
  assert.equal(F.interest(50000, 2.5, 3), 312.5);
});

test('Renewing for 5 years compounds each maturity', () => {
  const r = F.calculate({ amount: 10000, rate: 3.8, months: 12, renew: 5 });
  assert.equal(r.total, 12050);
  assert.equal(r.earned, 2050);
  assert.equal(Math.round(r.effective * 100) / 100, 3.8);
  const s = F.calculate({ amount: 10000, rate: 3.8, months: 6, renew: 2 });
  assert.equal(s.total, 10383.61);
});

test('PIDM covers RM250,000 per depositor per bank, interest included', () => {
  assert.equal(F.calculate({ amount: 250000, rate: 4, months: 12 }).overPidm, 10000);
  assert.equal(F.calculate({ amount: 200000, rate: 4, months: 12 }).overPidm, 0);
  assert.equal(F.calculate({ amount: 10000, rate: 3.8, months: 12 }).real.toFixed(1), '1.9');
});
