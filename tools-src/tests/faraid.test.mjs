// Faraid (Shafi'i): fixed shares, asabah, hajb, 'awl, Umariyyatain, musytarakah, Baitulmal or radd (Perlis).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../../assets/js/faraid-core.js');
const fr = (r, k) => { const x = r.list.find(y => y.key === k); return x.share.n + '/' + x.share.d; };
const per = (r, k) => { const x = r.list.find(y => y.key === k); return x.per.n + '/' + x.per.d; };

test('Husband + mother + 2 daughters + son: 1/4, 1/6, son 7/24, each daughter 7/48 (base 48)', () => {
  const r = R.solve({ husband: 1, mother: 1, daughter: 2, son: 1 });
  assert.equal(fr(r, 'husband'), '1/4'); assert.equal(fr(r, 'mother'), '1/6'); assert.equal(fr(r, 'son'), '7/24'); assert.equal(per(r, 'daughter'), '7/48');
  assert.equal(r.D, 48);
});

test("'Awl: wife + father + mother + 2 daughters to 27 (wife 1/9); husband + 2 full sisters to 7", () => {
  const a = R.solve({ wife: 1, father: 1, mother: 1, daughter: 2 });
  assert.equal(a.awl, true); assert.equal(a.awlBase, 27); assert.equal(fr(a, 'wife'), '1/9'); assert.equal(per(a, 'daughter'), '8/27'); assert.equal(fr(a, 'father'), '4/27');
  const b = R.solve({ husband: 1, sister: 2 });
  assert.equal(b.awlBase, 7); assert.equal(fr(b, 'husband'), '3/7'); assert.equal(per(b, 'sister'), '2/7');
});

test('Umariyyatain, musytarakah and takmilah', () => {
  const h = R.solve({ husband: 1, father: 1, mother: 1 });
  assert.equal(fr(h, 'mother'), '1/6'); assert.equal(fr(h, 'father'), '1/3');
  const w = R.solve({ wife: 1, father: 1, mother: 1 });
  assert.equal(fr(w, 'mother'), '1/4'); assert.equal(fr(w, 'father'), '1/2');
  const m = R.solve({ husband: 1, mother: 1, brotherM: 2, brother: 2 });
  assert.equal(per(m, 'brother'), '1/12'); assert.equal(per(m, 'brotherM'), '1/12'); assert.equal(fr(m, 'husband'), '1/2');
  const t = R.solve({ daughter: 1, granddaughter: 2, uncle: 1 });
  assert.equal(fr(t, 'granddaughter'), '1/6'); assert.equal(fr(t, 'uncle'), '1/3');
});

test('Residue: wife alone gets 1/4 and Baitulmal 3/4; Perlis radd gives a daughter everything, never the spouse', () => {
  const w = R.solve({ wife: 1 });
  assert.equal(fr(w, 'wife'), '1/4'); assert.equal(w.baitulmal.n + '/' + w.baitulmal.d, '3/4');
  assert.equal(fr(R.solve({ daughter: 1, residue: 'radd' }), 'daughter'), '1/1');
  const s = R.solve({ husband: 1, daughter: 1, residue: 'radd' });
  assert.equal(fr(s, 'husband'), '1/4'); assert.equal(fr(s, 'daughter'), '3/4');
});

test('Exclusion: father excludes siblings (mother still 1/6); son excludes grandchildren; full sister with daughter excludes paternal brother', () => {
  const r = R.solve({ father: 1, mother: 1, brother: 2 });
  assert.equal(fr(r, 'mother'), '1/6'); assert.equal(fr(r, 'father'), '5/6'); assert.equal(r.list.find(x => x.key === 'brother').blocked, true);
  assert.equal(R.solve({ son: 1, grandson: 1 }).list.find(x => x.key === 'grandson').blocked, true);
  const s = R.solve({ daughter: 1, sister: 1, brotherF: 1 });
  assert.equal(fr(s, 'sister'), '1/2'); assert.equal(s.list.find(x => x.key === 'brotherF').blocked, true);
  assert.equal(R.solve({ grandfather: 1, brother: 1 }).special, 'grandfather');
});

test('Estate: RM300,000 less funeral RM5,000, debts RM15,000, wasiat capped at a third', () => {
  const r = R.calculate({ estate: 300000, funeral: 5000, debts: 15000, wasiat: 200000, wife: 1, son: 1, daughter: 1 });
  assert.equal(r.money.wasiatMax, 93333.33); assert.equal(r.money.wasiatCut, true); assert.equal(r.money.net, 186666.67);
  assert.equal(r.list.find(x => x.key === 'wife').amount, 23333.33);
  assert.equal(r.list.find(x => x.key === 'son').amount, 108888.89);
});
