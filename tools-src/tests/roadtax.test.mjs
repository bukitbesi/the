// Road tax: cars by cc, body, owner and region; EVs by kW; motorcycles; 6-month renewal; unconfirmed rates.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../../assets/js/roadtax-core.js');
const t = o => R.calculate(o).tax;

test('Private cars, Peninsular: Myvi 1,496 cc RM90; Camry 2,487 cc RM867; 1,998 cc non-saloon RM439.20', () => {
  assert.equal(t({ cc: 1496 }), 90);
  assert.equal(t({ cc: 2487 }), 867);
  assert.equal(t({ cc: 1798 }), 279.2);
  assert.equal(t({ cc: 1998, body: 'nonSaloon' }), 439.2);
  assert.equal(t({ cc: 1498, body: 'nonSaloon' }), 120);
  assert.equal(t({ cc: 3500 }), 4380);
  assert.equal(t({ cc: 1496, months: 6 }), 45);
});

test('Company saloon: Camry 2.5 RM2,221 (UMW Toyota list); company non-saloon as private', () => {
  assert.equal(t({ cc: 2487, owner: 'company' }), 2221);
  assert.equal(t({ cc: 1998, owner: 'company' }), 758);
  assert.equal(t({ cc: 1998, owner: 'company', body: 'nonSaloon' }), 439.2);
  assert.equal(R.calculate({ cc: 1496, owner: 'company', region: 'east' }).reason, 'companyEast');
});

test('Sabah and Sarawak, Labuan (50% of East), Langkawi and Pangkor (50% of Peninsular above 1,000 cc)', () => {
  assert.equal(t({ cc: 1496, region: 'east' }), 72);
  assert.equal(t({ cc: 1496, region: 'east', body: 'nonSaloon' }), 60);
  assert.equal(t({ cc: 1496, region: 'labuan' }), 36);
  assert.equal(t({ cc: 1496, region: 'langkawi' }), 45);
  assert.equal(t({ cc: 1496, region: 'langkawi', months: 6 }), 22.5);
  assert.equal(t({ cc: 998, region: 'langkawi' }), 20);
});

test('EVs by motor kW: Atto 3 RM160, Model 3 RM280, Model Y RM305, iX RM965, Eletre R RM4,890, top RM20,000', () => {
  assert.equal(t({ type: 'ev', kw: 150 }), 160);
  assert.equal(t({ type: 'ev', kw: 208 }), 280);
  assert.equal(t({ type: 'ev', kw: 220 }), 305);
  assert.equal(t({ type: 'ev', kw: 385 }), 965);
  assert.equal(t({ type: 'ev', kw: 675 }), 4890);
  assert.equal(t({ type: 'ev', kw: 45 }), 20);
  assert.equal(t({ type: 'ev', kw: 105 }), 80);
  assert.equal(t({ type: 'ev', kw: 1200 }), 20000);
  assert.equal(R.calculate({ type: 'ev', kw: 150, region: 'east' }).reason, 'evRegion');
});

test('Motorcycles: 150 cc RM2, 200 cc RM30 (RM9 East), 251-500 cc unconfirmed; e-motorcycles by watts', () => {
  assert.equal(t({ type: 'moto', cc: 150 }), 2);
  assert.equal(t({ type: 'moto', cc: 200 }), 30);
  assert.equal(t({ type: 'moto', cc: 200, region: 'east' }), 9);
  assert.equal(t({ type: 'moto', cc: 1000 }), 350);
  assert.equal(R.calculate({ type: 'moto', cc: 400 }).reason, 'moto500');
  assert.equal(t({ type: 'moto', cc: 400, region: 'east' }), 30);
  assert.equal(t({ type: 'emoto', watts: 5000 }), 2);
  assert.equal(t({ type: 'emoto', watts: 30000 }), 40);
});
