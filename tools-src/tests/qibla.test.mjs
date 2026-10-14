// Qibla: great-circle bearing to the Kaaba and distance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Q = require('../../assets/js/qibla-core.js');

test('Kuala Lumpur: 292.54 degrees (292° 32′), about 6,974 km', () => {
  const r = Q.calculate({ place: 'kl' });
  assert.equal(Math.round(r.bearing * 100) / 100, 292.54);
  assert.equal(r.dm, '292° 32′');
  assert.equal(Math.round(r.km), 6974);
  assert.equal(Q.point(r.bearing, 'en'), 'WNW');
});

test('Custom coordinates and known bearings elsewhere', () => {
  assert.equal(Math.round(Q.calculate({ place: 'custom', lat: 40.7128, lon: -74.006 }).bearing * 10) / 10, 58.5);
  assert.equal(Math.round(Q.calculate({ place: 'kk' }).bearing), 291);
  assert.equal(Q.calculate({ place: 'custom', lat: 95, lon: 0 }), null);
});
