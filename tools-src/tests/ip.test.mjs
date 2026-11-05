// IP lookup core: strict parsing, RFC 5952 output, IANA special-purpose classification, number formats, reverse
// DNS names and the RDAP / trace parsers (fixtures are real registry answers saved on 5 November 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const I = require('../../assets/js/ip-core.js');
const fx = name => JSON.parse(fs.readFileSync(new URL('./fixtures/rdap-' + name + '.json', import.meta.url), 'utf8'));
const s = x => { const p = I.parse(x); return p && I.toString(p); };

test('IPv4 parsing is strict', () => {
  assert.equal(s('8.8.8.8'), '8.8.8.8');
  assert.equal(s(' 192.168.1.10 '), '192.168.1.10');
  for (const bad of ['256.1.1.1', '1.2.3', '1.2.3.4.5', '01.2.3.4', '1.2.3.-4', 'a.b.c.d', '', '1..2.3']) assert.equal(I.parse(bad), null, bad);
});

test('IPv6 parsing and RFC 5952 compression', () => {
  assert.equal(s('2001:0DB8:0000:0000:0000:0000:0000:0001'), '2001:db8::1');
  assert.equal(s('2001:4860:4860::8888'), '2001:4860:4860::8888');
  assert.equal(s('::'), '::');
  assert.equal(s('::1'), '::1');
  assert.equal(s('2001:db8:0:0:1:0:0:1'), '2001:db8::1:0:0:1');
  assert.equal(s('2001:db8:0:1:1:1:1:1'), '2001:db8:0:1:1:1:1:1');
  assert.equal(s('::ffff:1.2.3.4'), '::ffff:1.2.3.4');
  assert.equal(s('::ffff:0102:0304'), '::ffff:1.2.3.4');
  assert.equal(s('64:ff9b::192.0.2.33'), '64:ff9b::c000:221');
  assert.equal(s('[fe80::1%eth0]'), 'fe80::1');
  assert.equal(s('fe80::1%25en0'), 'fe80::1');
  for (const bad of ['1:2:3:4:5:6:7:8:9', '1::2::3', '12345::', 'g::1', ':1', '1:2:3:4:5:6:7', '::1.2.3']) assert.equal(I.parse(bad), null, bad);
  assert.equal(I.expanded(I.parse('2001:db8::1')), '2001:0db8:0000:0000:0000:0000:0000:0001');
});

test('IANA special-purpose classification, most specific block wins', () => {
  const k = x => I.classify(I.parse(x)).key;
  assert.deepEqual(['8.8.8.8', '10.1.2.3', '172.16.0.1', '172.32.0.1', '192.168.0.1', '100.64.1.1', '127.0.0.1', '169.254.10.10', '0.0.0.0', '0.1.2.3',
    '192.0.2.5', '198.51.100.1', '203.0.113.9', '198.19.0.1', '224.0.0.251', '240.0.0.1', '255.255.255.255', '192.0.0.1'].map(k),
  ['public', 'private', 'private', 'public', 'private', 'cgnat', 'loopback', 'linklocal', 'unspecified', 'this',
    'doc', 'doc', 'doc', 'bench', 'multicast', 'reserved', 'broadcast', 'ietf']);
  assert.deepEqual(['2001:4860:4860::8888', '::1', '::', 'fe80::1', 'fd12:3456::1', '2001:db8::1', '3fff::1', 'ff02::1', '::ffff:8.8.8.8', '2002::1', '2001:0::1', '64:ff9b::1', '4000::1'].map(k),
    ['global6', 'loopback', 'unspecified', 'linklocal', 'ula', 'doc', 'doc', 'multicast', 'mapped', '6to4', 'teredo', 'nat64', 'unassigned6']);
  assert.equal(I.classify(I.parse('8.8.8.8')).public, true);
  assert.equal(I.classify(I.parse('192.168.0.1'), 'ms').label, 'Rangkaian peribadi (RFC 1918)');
});

test('Number formats and reverse DNS names', () => {
  const a = I.info('8.8.8.8');
  assert.deepEqual([a.decimal, a.hex, a.binary, a.mapped, a.cls, a.reverse], ['134744072', '0x08080808', '00001000.00001000.00001000.00001000', '::ffff:8.8.8.8', 'A', '8.8.8.8.in-addr.arpa']);
  assert.equal(I.info('192.168.1.1').decimal, '3232235777');
  assert.equal(I.info('2001:db8::1').reverse, '1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa');
  assert.equal(I.info('2001:db8::1').hex, '0x20010db8000000000000000000000001');
  assert.equal(I.info('::ffff:175.139.0.1').embedded, '175.139.0.1');
  assert.equal(I.info('nonsense'), null);
});

test('RDAP records from APNIC and ARIN (nested entities)', () => {
  const tm = I.parseRdap(fx('tm'));
  assert.deepEqual([tm.org, tm.country, tm.cidr, tm.start, tm.end, tm.registry, tm.abuse, tm.name], ['TM TECHNOLOGY SERVICES SDN BHD', 'MY', '175.136.0.0/13', '175.136.0.0', '175.143.255.255', 'APNIC', 'abuse@tm.com.my', 'TTSSB-MY']);
  const g = I.parseRdap(fx('arin'));
  assert.deepEqual([g.org, g.cidr, g.registry, g.name], ['Google LLC', '8.8.8.0/24', 'ARIN', 'GOGL']);
  assert.ok(g.abuse.includes('@'));
  const v6 = I.parseRdap(fx('v6'));
  assert.deepEqual([v6.org, v6.cidr], ['Google LLC', '2001:4860::/32']);
  assert.equal(I.parseRdap({ objectClassName: 'domain' }), null);
  const rows = I.rows(I.info('175.139.0.1'), tm, ['example.tm.net.my'], 'en');
  assert.deepEqual(rows.slice(0, 4), [['Version', 'IPv4'], ['Type', 'Public (globally routable)'], ['Network owner (ISP / organisation)', 'TM TECHNOLOGY SERVICES SDN BHD'], ['Registered country', 'Malaysia (MY)']]);
  assert.ok(I.rows(I.info('10.0.0.1'), null, null, 'ms').some(r => r[0] === 'Jenis' && r[1].startsWith('Rangkaian peribadi')));
});

test('Cloudflare trace and the lookup box', () => {
  assert.deepEqual(I.parseTrace('fl=1\nh=tool.thebukitbesi.com\nip=175.139.0.1\nloc=MY\ncolo=KUL\nhttp=http/2\ntls=TLSv1.3\n'), { ip: '175.139.0.1', country: 'MY', colo: 'KUL', http: 'http/2', tls: 'TLSv1.3' });
  assert.equal(I.parseTrace('<html>error</html>'), null);
  assert.deepEqual(I.query(' 8.8.8.8 '), { kind: 'ip', value: '8.8.8.8' });
  assert.deepEqual(I.query('https://www.TheBukitBesi.com/p/x.html?y=1'), { kind: 'domain', value: 'www.thebukitbesi.com' });
  assert.deepEqual(I.query('mykad.gov.my.'), { kind: 'domain', value: 'mykad.gov.my' });
  assert.deepEqual(I.query('http://[2001:db8::1]:8080/'), { kind: 'ip', value: '2001:db8::1' });
  assert.deepEqual(I.query('kedai-runcit.my'), { kind: 'domain', value: 'kedai-runcit.my' });
  for (const bad of ['', 'localhost', 'hello world', '-bad.com', '999.1.1.1']) assert.equal(I.query(bad), null, bad);
});

test('DNS-over-HTTPS answers', () => {
  const j = { Status: 0, Answer: [{ type: 5, data: 'x.example.' }, { type: 1, data: '216.239.32.21' }, { type: 12, data: 'dns.google.' }] };
  assert.deepEqual(I.parseDns(j, 'A'), ['216.239.32.21']);
  assert.deepEqual(I.parseDns(j, 'PTR'), ['dns.google']);
  assert.deepEqual(I.parseDns({ Status: 3 }, 'A'), []);
});
