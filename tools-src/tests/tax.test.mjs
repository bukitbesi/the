// Annual Malaysian income tax: rate bands, reliefs, rebates, zakat and the Budget 2027 proposal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../../assets/js/tax-core.js');
const S = require('../../assets/js/salary-core.js');

test('YA2026 bands match the published cumulative tax', () => {
  assert.equal(T.bandTax(35000, T.BANDS_2026).tax, 600);
  assert.equal(T.bandTax(50000, T.BANDS_2026).tax, 1500);
  assert.equal(T.bandTax(100000, T.BANDS_2026).tax, 9400);
  assert.equal(T.bandTax(2000000, T.BANDS_2026).tax, 528400);
});

test('YA2026 bands agree with the salary calculator', () => {
  // Above RM35,000 there is no rebate, so the two engines must give the same annual tax.
  for (const c of [47000, 83000, 250000, 700000]) {
    assert.equal(T.calculate({ employment: c + 9000 }).payable, S.annualTax(c, 'single'));
  }
});

test('Budget 2027 proposal: 18% and 24% bands, 30% above RM1 million, RM12,000 relief', () => {
  assert.equal(T.bandTax(100000, T.BANDS_2027).tax, 9100);
  assert.equal(T.bandTax(150000, T.BANDS_2027).tax, 21100);
  assert.equal(T.bandTax(2000000, T.BANDS_2027).tax, 547600);
  const r = T.calculate({ employment: 100000 }, 2027);
  assert.equal(r.chargeable, 88000);
  assert.equal(r.proposal, true);
});

test('Typical employee: RM60,000 with EPF and SOCSO relief', () => {
  const r = T.calculate({ employment: 60000, epf: 5280, socso: 400 });
  assert.equal(r.reliefTotal, 13350);
  assert.equal(r.chargeable, 46650);
  assert.equal(r.payable, 1299);
  assert.equal(r.marginalRate, 6);
});

test('RM400 rebate (RM800 with spouse) at RM35,000 or less', () => {
  assert.equal(T.calculate({ employment: 36000, epf: 3960 }).payable, 0);
  const r = T.calculate({ employment: 48000, epf: 4000, spouse: true });
  assert.equal(r.chargeable, 31000);
  assert.equal(r.grossTax, 480);
  assert.equal(r.rebate, 480);
  assert.equal(r.payable, 0);
});

test('Caps: reliefs, donations at 10% of income, zakat up to the tax, housing tiers', () => {
  const r = T.calculate({ employment: 80000, lifestyle: 9999, donations: 20000, zakat: 99999, housingLoan: 9000, housingTier: 'upper' });
  assert.equal(r.reliefs.find(x => x.id === 'lifestyle').amount, 2500);
  assert.equal(r.reliefs.find(x => x.id === 'housingLoan').amount, 5000);
  assert.equal(r.donations, 8000);
  assert.equal(r.payable, 0);
  assert.equal(T.calculate({ employment: 80000, spouseDisabled: true }).reliefs.some(x => x.id === 'spouseDisabled'), false);
});

test('Children and PCB balance', () => {
  const r = T.calculate({ employment: 120000, childUnder18: 2, child18Higher: 1, pcb: 10000 });
  assert.equal(r.reliefTotal, 9000 + 4000 + 8000);
  // 99,000 chargeable: 3,700 + 29,000 × 19% = 9,210; PCB 10,000 paid gives a 790 refund.
  assert.equal(r.payable, 9210);
  assert.equal(r.balance, -790);
});
