// Freelance rate: revenue needed for a take-home target after expenses, EPF and income tax, per billable hour.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const F = require('../../assets/js/freelance-core.js');

test('RM5,000 a month take-home, RM500 expenses, 11% EPF, 30 h a week, 6 weeks off: RM55.04 an hour', () => {
  const r = F.calculate({ target: 5000, expenses: 500, epf: 11, hours: 30, weeksOff: 6 });
  assert.equal(r.billable, 1380);
  assert.equal(r.tax, 2265.77);
  assert.equal(r.revenue, 75961.54);
  assert.equal(r.hourly, 55.04);
  assert.equal(r.daily, 440.36);
  const back = F.fromProfit(r.profit, 0.11, 0, 0);
  assert.equal(back.net, 60000);
});

test('Below RM35,000 chargeable the RM400 rebate clears the tax', () => {
  const r = F.calculate({ target: 3000, expenses: 300, epf: 0, hours: 25, weeksOff: 4 });
  assert.equal(r.tax, 0);
  assert.equal(r.revenue, 39600);
  assert.equal(r.hourly, 33);
});
