// Parcel tracking: tracking-number normalisation, courier detection and official tracking links.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../../assets/js/tracking-core.js');
const top = n => (T.detect(n)[0] || {}).id;

test('Numbers are normalised before matching', () => {
  assert.equal(T.normalize(' er 123-456-789 my '), 'ER123456789MY');
  assert.equal(top('er123456789my'), 'poslaju');
  assert.deepEqual(T.detect('abc'), []);
  assert.deepEqual(T.detect(''), []);
  assert.deepEqual(T.detect('<script>alert(1)</script>'), []);
});

test('Distinctive prefixes identify one courier with high confidence', () => {
  const cases = { ER123456789MY: 'poslaju', EHE108177925MY: 'poslaju', SPXMY012345678901: 'spx', NVMY23007000005122: 'ninjavan',
    MYNJV70080168752: 'ninjavan', '1Z999AA10123456784': 'ups' };
  for (const [n, id] of Object.entries(cases)) {
    const m = T.detect(n);
    assert.equal(m[0].id, id, n);
    assert.equal(m[0].score, 3, n);
  }
});

test('Shared formats return every candidate, most likely first', () => {
  assert.deepEqual(T.detect('630012345678').map(m => m.id), ['jnt', 'fedex']);
  assert.equal(top('MY0123456789012A'), 'spx');
  assert.equal(top('MYCGU1234567890'), 'dhl');
  assert.equal(top('MYMPA012345678'), 'lex');
  assert.ok(!T.detect('MYMPA012345678').some(m => m.id === 'dhl'), 'Lazada prefix is not a DHL hub code');
  assert.ok(!T.detect('MYNJV70080168752').some(m => m.id === 'dhl'), 'Ninja Van prefix is not a DHL hub code');
  // International postal items (S10 format) are delivered by Pos Malaysia.
  assert.equal(top('LP123456789CN'), 'poslaju');
});

test('Every courier has a name, an https tracking page and its examples detect as itself', () => {
  const ids = new Set();
  for (const c of T.COURIERS) {
    assert.ok(!ids.has(c.id), 'unique id ' + c.id); ids.add(c.id);
    assert.ok(c.name && c.short && c.format.length === 2, c.id);
    for (const u of [c.site, c.home, c.track].filter(Boolean)) assert.match(u, /^https:\/\/[^\s]+$/, c.id);
    if (c.track) assert.ok(c.track.includes('{n}'), c.id);
    if (c.example && c.tests.length) assert.ok(T.detect(c.example).some(m => m.id === c.id), 'example detects ' + c.id);
  }
});

test('Tracking links carry the encoded number or fall back to the tracking page', () => {
  assert.equal(T.trackUrl('poslaju', 'er123456789my'), 'https://tracking.pos.com.my/tracking/ER123456789MY');
  assert.equal(T.trackUrl('skynet', '123456789012'), 'https://www.skynet.com.my/track');
  assert.equal(T.trackUrl('jnt', 'x'), 'https://www.jtexpress.my/tracking');
  assert.equal(T.trackUrl('any', 'LP123456789CN'), 'https://t.17track.net/en#nums=LP123456789CN');
  assert.equal(T.trackUrl('nope', 'LP123456789CN'), '');
});

test('Maps links: rounded coordinates, a typed area, or "near me"', () => {
  assert.equal(T.mapsUrl('J&T Express', { lat: 3.139003, lng: 101.686855 }), 'https://www.google.com/maps/search/J%26T%20Express/@3.14,101.69,14z');
  assert.equal(T.mapsUrl('Pos Malaysia', '  Bangi   43000 '), 'https://www.google.com/maps/search/?api=1&query=Pos%20Malaysia%20Bangi%2043000');
  assert.equal(T.mapsUrl('Ninja Point'), 'https://www.google.com/maps/search/?api=1&query=Ninja%20Point%20near%20me');
  assert.equal(T.mapsUrl('Ninja Point', ''), 'https://www.google.com/maps/search/?api=1&query=Ninja%20Point%20near%20me');
  assert.ok(T.mapsUrl('X', 'a'.repeat(200)).length < 140, 'typed area is capped');
  for (const [id, qs] of Object.entries(T.MAPS)) assert.ok(T.byId[id] && qs.length >= 1, id);
});
