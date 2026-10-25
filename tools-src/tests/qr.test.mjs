// QR code generator: payload formats (ZXing barcode contents), matrix size, SVG and colour checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Q = require('../../assets/js/qr-core.js');
const ctx = {}; vm.runInNewContext(fs.readFileSync(new URL('../..' + Q.FACTS.vendor, import.meta.url), 'utf8'), ctx);

test('payloads: Wi-Fi escaping, WhatsApp and phone numbers with Malaysian 60, vCard, email, SMS, geo', () => {
  assert.equal(Q.payload('wifi', { ssid: 'Rumah;Ali', password: 'p@ss:1"2', security: 'WPA' }), 'WIFI:T:WPA;S:Rumah\\;Ali;P:p@ss\\:1\\"2;;');
  assert.equal(Q.payload('wifi', { ssid: 'Cafe', security: 'nopass', hidden: true }), 'WIFI:T:nopass;S:Cafe;H:true;;');
  assert.equal(Q.payload('whatsapp', { phone: '012-345 6789', message: 'Hai, saya nak order' }), 'https://wa.me/60123456789?text=Hai%2C%20saya%20nak%20order');
  assert.equal(Q.payload('phone', { phone: '+65 9123 4567' }), 'tel:+6591234567');
  assert.equal(Q.payload('sms', { phone: '0123456789', message: 'OK' }), 'SMSTO:+60123456789:OK');
  assert.equal(Q.payload('email', { email: 'a@b.my', subject: 'Hi there' }), 'mailto:a@b.my?subject=Hi%20there');
  assert.equal(Q.payload('geo', { lat: '3.1579', lng: '101.7116' }), 'geo:3.1579,101.7116');
  assert.equal(Q.payload('geo', { lat: '95', lng: '1' }), '');
  assert.equal(Q.payload('url', { url: 'tool.thebukitbesi.com' }), 'https://tool.thebukitbesi.com');
  const v = Q.payload('vcard', { first: 'Siti', last: 'Aminah', org: 'Kedai, Kuih', phone: '0123456789' }).split('\r\n');
  assert.deepEqual(v.slice(0, 5), ['BEGIN:VCARD', 'VERSION:3.0', 'N:Aminah;Siti;;;', 'FN:Siti Aminah', 'ORG:Kedai\\, Kuih']);
  assert.ok(v.includes('TEL;TYPE=CELL:+60123456789') && v.at(-1) === 'END:VCARD');
  assert.equal(Q.payload('wifi', {}), '');
});

test('matrix: version grows with length and error correction; overflow is reported', () => {
  const m = Q.matrix(ctx.qrcode, 'https://tool.thebukitbesi.com/', 'M');
  assert.equal(m.length, 29); assert.equal(Q.version(m), 3);
  assert.ok(Q.version(Q.matrix(ctx.qrcode, 'https://tool.thebukitbesi.com/', 'H')) > 3);
  assert.equal(Q.version(Q.matrix(ctx.qrcode, 'x'.repeat(2953), 'L')), 40);
  assert.throws(() => Q.matrix(ctx.qrcode, 'x'.repeat(2954), 'L'), /overflow/);
  assert.ok(Q.matrix(ctx.qrcode, 'Selamat datang 欢迎 வணக்கம்', 'M').length >= 21);
});

test('svg keeps a 4-module quiet zone; logo clears the centre; colour checks', () => {
  const m = Q.matrix(ctx.qrcode, 'hello', 'H'), s = Q.svg(m, { bg: '#ffffff' });
  assert.ok(s.includes('viewBox="0 0 ' + (m.length + 8) + ' ' + (m.length + 8) + '"'));
  assert.ok(Q.svg(m, { style: 'dots', bg: '#fff' }).includes('<circle'));
  assert.ok(Q.svg(m, { logo: { href: 'data:image/png;base64,AA' }, bg: '#ffffff' }).includes('<image'));
  assert.deepEqual(Q.colourIssues('#000000', '#ffffff'), []);
  assert.deepEqual(Q.colourIssues('#ffffff', '#000000'), ['inverted']);
  assert.ok(Q.colourIssues('#999999', '#ffffff').includes('contrast'));
  assert.equal(Math.round(Q.contrast('#000000', '#ffffff')), 21);
  assert.equal(Q.printCm(100), 10); assert.equal(Q.printCm(5), 2);
});

test('function patterns: finders, timing lines and alignment squares stay square', () => {
  const n = 45; // version 7: alignment centres at 6, 22, 38
  assert.ok(Q.structural(0, 0, n) && Q.structural(6, 20, n) && Q.structural(20, 6, n));
  assert.ok(Q.structural(22, 22, n) && Q.structural(38, 38, n) && Q.structural(24, 40, n) && Q.structural(22, 38, n));
  assert.ok(!Q.structural(12, 12, n) && !Q.structural(30, 14, n));
  assert.ok(!Q.structural(10, 10, 21)); // version 1 has no alignment pattern
});
