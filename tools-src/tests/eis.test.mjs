// EIS: job search allowance by month, RM6,000 ceiling, early re-employment allowance 50% (25% before 1 Oct 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('../../assets/js/eis-core.js');

test('RM3,000 wage for 6 months: 2,400, 1,500, 1,200, 1,200, 900, 900 = RM8,100', () => {
  const r = E.calculate({ wage: 3000, months: 6 });
  assert.deepEqual(r.schedule.map(x => x.amount), [2400, 1500, 1200, 1200, 900, 900]);
  assert.equal(r.total, 8100);
  assert.equal(E.calculate({ wage: 3000, months: 3 }).total, 5100);
});

test('Re-employed after month 2: RM2,100 (50% of RM4,200) from 1 Oct 2026, RM1,050 before; RM5,000 gives RM3,500', () => {
  const r = E.calculate({ wage: 3000, months: 6, newJob: 2 });
  assert.equal(r.era, 2100);
  assert.equal(r.received, 6000);
  assert.equal(E.calculate({ wage: 3000, months: 6, newJob: 2, lossAfter: 'no' }).era, 1050);
  assert.equal(E.calculate({ wage: 5000, months: 6, newJob: 2 }).era, 3500);
  assert.equal(E.calculate({ wage: 9000, months: 6 }).wage, 6000);
  assert.equal(E.calculate({ wage: 3000, months: 6, far: 'yes' }).mobility, 1000);
});
