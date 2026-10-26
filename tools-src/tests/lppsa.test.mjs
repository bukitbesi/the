// LPPSA housing financing: LPPSA's own blended-rate examples (FAQ, 25 September 2026), the net-income limit table,
// the 60% / 80% / 20% affordability rules on LPPSA's payslip example, tenure caps and second financing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const L = require('../../assets/js/lppsa-core.js');

test('Blended rate: LPPSA situations 1–4 (4.03%, 4.17%, 4.50%, 4.13%)', () => {
  assert.equal(L.rate(800000, 0).toFixed(2), '4.03');
  assert.equal(L.rate(750000, 250000).toFixed(2), '4.17');
  assert.equal(L.rate(250000, 750000).toFixed(2), '4.50');
  assert.equal(L.rate(1000000, 0).toFixed(2), '4.13');
  assert.equal(L.rate(300000, 0), 4);
});

test('Limit table by net income, each row up to its figure', () => {
  assert.equal(L.limitFor(2000), 280000); assert.equal(L.limitFor(2500), 280000); assert.equal(L.limitFor(2500.01), 350000);
  assert.equal(L.limitFor(4300), 550000); assert.equal(L.limitFor(6000), 730000); assert.equal(L.limitFor(10000), 950000); assert.equal(L.limitFor(10001), 1000000);
  assert.equal(L.FACTS.limits.length, 16);
});

test('Instalment on a reducing balance: RM100,000 and RM300,000 over 35 years at 4%', () => {
  assert.equal(L.instalment(100000, 4, 420), 442.77);
  assert.equal(L.instalment(300000, 4, 420), 1328.32);
});

test("LPPSA's payslip example: RM4,321 gross, RM4,300 net income, limit RM550,000", () => {
  const r = L.calculate({ basic: 3371, allowances: 950, mandatory: 21, debts: 772, others: 63, age: 35, scheme: 'pencen' });
  assert.equal(r.net, 4300); assert.equal(r.takeHome, 3465); assert.equal(r.table, 550000);
  assert.deepEqual(r.rules, { share: 2592.6, debt: 2668, net: 2600.8 }); assert.equal(r.room, 2592.6);
  assert.equal(r.months, 420); assert.equal(r.max, 550000); assert.equal(r.binding, 'table'); assert.equal(r.pay, 2435.26);
});

test('Tenure: SPPM 480 months at 30 and under (until 31 December 2026), EPF scheme stops at retirement, pension at 90', () => {
  assert.equal(L.calculate({ basic: 4000, age: 28, scheme: 'pencen' }).months, 480);
  assert.equal(L.calculate({ basic: 4000, age: 28, scheme: 'pencen', today: '2027-01-02' }).months, 420);
  assert.equal(L.calculate({ basic: 4000, age: 28, scheme: 'kwsp', retireAge: 60 }).months, 384);
  assert.equal(L.calculate({ basic: 4000, age: 58, scheme: 'pencen' }).months, 384);
  assert.equal(L.calculate({ basic: 4000, age: 45, scheme: 'kwsp', retireAge: 60 }).months, 180);
});

test('Second financing: 90% margin, what is left of the limit, rate blended with the first', () => {
  const r = L.calculate({ basic: 9000, allowances: 1500, mandatory: 1500, age: 40, second: true, firstUsed: 600000, price: 400000 });
  assert.equal(r.net, 9000); assert.equal(r.table, 900000); assert.equal(r.limitLeft, 300000); assert.equal(r.months, 360);
  assert.equal(r.byPrice, 360000); assert.equal(r.max, 300000); assert.equal(r.rate.toFixed(2), '4.25');
});

test('Price and a requested amount cap the financing; affordability can bind', () => {
  const r = L.calculate({ basic: 5000, allowances: 1200, mandatory: 900, age: 35, scheme: 'pencen', price: 500000, amount: 450000 });
  assert.equal(r.max, 500000); assert.equal(r.amount, 450000); assert.equal(r.binding, 'price');
  const tight = L.calculate({ basic: 3000, allowances: 500, mandatory: 500, debts: 1200, age: 35 });
  assert.equal(tight.binding, 'pay'); assert.ok(tight.pay <= tight.room);
});
