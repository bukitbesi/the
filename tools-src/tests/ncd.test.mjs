// NCD: the motor scale, premium after NCD with SST and stamp duty, and what one claim costs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const N = require('../../assets/js/ncd-core.js');
const C = require('../../assets/js/carloan-core.js');

test('NCD scale by claim-free years', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 9].map(y => N.rate('car', y)), [0, 25, 30, 38.33, 45, 55, 55]);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(y => N.rate('motorcycle', y)), [0, 15, 20, 25, 25, 25]);
  assert.equal(N.rate('commercial', 3), 25);
  assert.deepEqual(C.NCD, N.SCALE.car);
  assert.equal(N.FACTS.sst, C.FACTS.insuranceSst);
  assert.equal(N.FACTS.stamp, C.FACTS.insuranceStamp);
});

test('Premium after NCD, SST and stamp duty', () => {
  const r = N.calculate({ type: 'car', years: 5, gross: 2000 });
  assert.equal(r.premium.discount, 1100);
  assert.equal(r.premium.net, 900);
  assert.equal(r.premium.sst, 72);
  assert.equal(r.premium.total, 982);
  assert.equal(r.ladder[0].total, 2170);
  assert.equal(N.calculate({ type: 'car', years: 3, gross: 2000 }).premium.total, 1342.07);
});

test('One claim at 55% costs RM2,952.07 in extra premium on RM2,000', () => {
  const c = N.claimCost('car', 5, 2000);
  assert.deepEqual(c.rows.map(r => r.after), [0, 25, 30, 38.33, 45]);
  assert.equal(c.total, 2952.07);
  assert.equal(N.calculate({ type: 'car', years: 5, gross: 2000, repair: 2000 }).advice, 'pay');
  assert.equal(N.calculate({ type: 'car', years: 5, gross: 2000, repair: 5000 }).advice, 'claim');
  assert.equal(N.claimCost('motorcycle', 2, 200).total, 86.4);
  assert.equal(N.claimCost('car', 0, 2000).total, 1188);
});
