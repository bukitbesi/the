/* IP address lookup core: strict IPv4/IPv6 parsing, RFC 5952 compression, IANA special-purpose classification,
   number formats, reverse DNS names, and parsers for the registry RDAP record and Cloudflare's /cdn-cgi/trace.
   No network code here: the UI fetches, this file explains. UMD: module.exports in Node, window.TBBIp in the browser. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-11-05' };

  function parse4(s) {
    var m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
    if (!m) return null;
    var b = [];
    for (var i = 1; i < 5; i++) {
      // Leading zeros are refused: some systems read 010 as octal 8, so the address would be ambiguous.
      if (m[i].length > 1 && m[i][0] === '0') return null;
      var n = +m[i];
      if (n > 255) return null;
      b.push(n);
    }
    return b;
  }

  function parse6(s) {
    if (!/^[0-9a-f:.]+$/i.test(s) || s.indexOf(':') < 0) return null;
    var tail = [], dot = s.lastIndexOf(':');
    if (s.indexOf('.') >= 0) {
      var v4 = parse4(s.slice(dot + 1));
      if (!v4) return null;
      tail = [v4[0] << 8 | v4[1], v4[2] << 8 | v4[3]];
      // "::ffff:1.2.3.4" → "::ffff"; "::1.2.3.4" → "::"
      s = s[dot - 1] === ':' ? s.slice(0, dot + 1) : s.slice(0, dot);
    }
    var halves = s.split('::');
    if (halves.length > 2) return null;
    var grp = function (h) { return h === '' ? [] : h.split(':'); };
    var a = grp(halves[0]), b = halves.length === 2 ? grp(halves[1]) : [];
    var words = [];
    var bad = false, push = function (arr) { arr.forEach(function (x) { if (!/^[0-9a-f]{1,4}$/i.test(x)) bad = true; words.push(parseInt(x, 16)); }); };
    var need = 8 - tail.length;
    if (halves.length === 2) {
      if (a.length + b.length > need - 1) return null;
      push(a); for (var i = a.length + b.length; i < need; i++) words.push(0); push(b);
    } else {
      if (a.length !== need) return null;
      push(a);
    }
    if (bad) return null;
    return words.concat(tail);
  }

  // Returns { v: 4, b: [4 bytes] } or { v: 6, w: [8 words] }, or null. Accepts [brackets] and a %zone suffix.
  function parse(input) {
    var s = String(input == null ? '' : input).trim().replace(/^\[|\](?::\d+)?$/g, '').replace(/%[\w.-]+$/, '');
    var b = parse4(s);
    if (b) return { v: 4, b: b };
    var w = parse6(s);
    return w ? { v: 6, w: w } : null;
  }

  function big(ip) {
    var n = BigInt(0);
    if (ip.v === 4) ip.b.forEach(function (x) { n = (n << BigInt(8)) | BigInt(x); });
    else ip.w.forEach(function (x) { n = (n << BigInt(16)) | BigInt(x); });
    return n;
  }

  function str4(b) { return b.join('.'); }
  // RFC 5952: lowercase, no leading zeros, the longest run (2+) of zero words as "::" (first on a tie);
  // IPv4-mapped addresses keep the dotted tail.
  function str6(w) {
    if (w.slice(0, 5).every(function (x) { return !x; }) && w[5] === 0xffff) return '::ffff:' + [w[6] >> 8, w[6] & 255, w[7] >> 8, w[7] & 255].join('.');
    var best = -1, len = 0;
    for (var i = 0; i < 8;) {
      if (w[i]) { i++; continue; }
      var j = i; while (j < 8 && !w[j]) j++;
      if (j - i > len && j - i > 1) { best = i; len = j - i; }
      i = j;
    }
    var h = w.map(function (x) { return x.toString(16); });
    if (best < 0) return h.join(':');
    return h.slice(0, best).join(':') + '::' + h.slice(best + len).join(':');
  }
  function toString(ip) { return ip.v === 4 ? str4(ip.b) : str6(ip.w); }
  function expanded(ip) { return ip.v === 4 ? str4(ip.b) : ip.w.map(function (x) { return ('000' + x.toString(16)).slice(-4); }).join(':'); }

  // IANA IPv4 and IPv6 Special-Purpose Address Registries (plus multicast, RFC 5771 / RFC 4291). Most specific wins.
  var SPECIAL = [
    ['0.0.0.0/8', 'this', 'RFC 791'], ['0.0.0.0/32', 'unspecified', 'RFC 1122'], ['10.0.0.0/8', 'private', 'RFC 1918'],
    ['100.64.0.0/10', 'cgnat', 'RFC 6598'], ['127.0.0.0/8', 'loopback', 'RFC 1122'], ['169.254.0.0/16', 'linklocal', 'RFC 3927'],
    ['172.16.0.0/12', 'private', 'RFC 1918'], ['192.0.0.0/24', 'ietf', 'RFC 6890'], ['192.0.2.0/24', 'doc', 'RFC 5737'],
    ['192.88.99.0/24', 'relay6to4', 'RFC 7526'], ['192.168.0.0/16', 'private', 'RFC 1918'], ['198.18.0.0/15', 'bench', 'RFC 2544'],
    ['198.51.100.0/24', 'doc', 'RFC 5737'], ['203.0.113.0/24', 'doc', 'RFC 5737'], ['224.0.0.0/4', 'multicast', 'RFC 5771'],
    ['240.0.0.0/4', 'reserved', 'RFC 1112'], ['255.255.255.255/32', 'broadcast', 'RFC 919'],
    ['::/128', 'unspecified', 'RFC 4291'], ['::1/128', 'loopback', 'RFC 4291'], ['::ffff:0:0/96', 'mapped', 'RFC 4291'],
    ['64:ff9b::/96', 'nat64', 'RFC 6052'], ['64:ff9b:1::/48', 'nat64', 'RFC 8215'], ['100::/64', 'discard', 'RFC 6666'],
    ['2001::/23', 'ietf', 'RFC 2928'], ['2001::/32', 'teredo', 'RFC 4380'], ['2001:2::/48', 'bench', 'RFC 5180'],
    ['2001:db8::/32', 'doc', 'RFC 3849'], ['2002::/16', '6to4', 'RFC 3056'], ['3fff::/20', 'doc', 'RFC 9637'],
    ['fc00::/7', 'ula', 'RFC 4193'], ['fe80::/10', 'linklocal', 'RFC 4291'], ['ff00::/8', 'multicast', 'RFC 4291']
  ];
  var TYPES = {
    public: ['Public (globally routable)', 'Awam (boleh dihala di Internet)'],
    this: ['"This network" (not routable)', '"Rangkaian ini" (tidak boleh dihala)'],
    unspecified: ['Unspecified address', 'Alamat tidak ditentukan'],
    private: ['Private network (RFC 1918)', 'Rangkaian peribadi (RFC 1918)'],
    cgnat: ['Carrier-grade NAT (shared by your ISP)', 'NAT gred pembawa (dikongsi oleh ISP)'],
    loopback: ['Loopback (this device)', 'Loopback (peranti ini)'],
    linklocal: ['Link-local (same network segment only)', 'Pautan setempat (segmen rangkaian sama sahaja)'],
    ietf: ['IETF protocol assignment', 'Peruntukan protokol IETF'],
    doc: ['Documentation and examples only', 'Untuk dokumentasi dan contoh sahaja'],
    relay6to4: ['Deprecated 6to4 relay anycast', '6to4 relay anycast (dimansuhkan)'],
    bench: ['Benchmark testing', 'Ujian penanda aras'],
    multicast: ['Multicast', 'Multicast'],
    reserved: ['Reserved for future use', 'Dikhaskan untuk kegunaan masa depan'],
    broadcast: ['Limited broadcast', 'Siaran terhad'],
    mapped: ['IPv4-mapped IPv6 address', 'Alamat IPv6 dipetakan IPv4'],
    nat64: ['IPv4/IPv6 translation (NAT64)', 'Terjemahan IPv4/IPv6 (NAT64)'],
    discard: ['Discard-only', 'Buang sahaja'],
    teredo: ['Teredo tunnel', 'Terowong Teredo'],
    '6to4': ['6to4 tunnel', 'Terowong 6to4'],
    ula: ['Unique local (private IPv6)', 'Setempat unik (IPv6 peribadi)'],
    global6: ['Public (global unicast)', 'Awam (unicast global)'],
    unassigned6: ['Not in the global unicast range', 'Di luar julat unicast global']
  };
  var NETS = SPECIAL.map(function (x) { var p = x[0].split('/'); var ip = parse(p[0]); return { ip: ip, len: +p[1], key: x[1], rfc: x[2], cidr: x[0] }; });

  function inNet(ip, net) {
    if (ip.v !== net.ip.v) return false;
    var bits = BigInt(ip.v === 4 ? 32 : 128), shift = bits - BigInt(net.len);
    return (big(ip) >> shift) === (big(net.ip) >> shift);
  }

  function classify(ip, lang) {
    var hit = null;
    NETS.forEach(function (n) { if (inNet(ip, n) && (!hit || n.len > hit.len)) hit = n; });
    var key = hit ? hit.key : ip.v === 4 ? 'public' : (ip.w[0] & 0xe000) === 0x2000 ? 'global6' : 'unassigned6';
    var pub = key === 'public' || key === 'global6';
    return { key: key, label: TYPES[key][lang === 'ms' ? 1 : 0], rfc: hit ? hit.rfc : ip.v === 4 ? '' : 'RFC 4291', block: hit ? hit.cidr : '', public: pub };
  }

  function reverseName(ip) {
    if (ip.v === 4) return ip.b.slice().reverse().join('.') + '.in-addr.arpa';
    return expanded(ip).replace(/:/g, '').split('').reverse().join('.') + '.ip6.arpa';
  }

  // Legacy classful class of an IPv4 address (still asked about in exams; routing has been classless since 1993).
  function v4class(b) { return b[0] < 128 ? 'A' : b[0] < 192 ? 'B' : b[0] < 224 ? 'C' : b[0] < 240 ? 'D' : 'E'; }

  function info(input, lang) {
    var ip = typeof input === 'string' ? parse(input) : input;
    if (!ip) return null;
    var n = big(ip), c = classify(ip, lang);
    var out = { version: ip.v, address: toString(ip), expanded: expanded(ip), decimal: n.toString(), hex: '0x' + n.toString(16).padStart(ip.v === 4 ? 8 : 32, '0'),
      type: c, reverse: reverseName(ip) };
    if (ip.v === 4) {
      out.binary = ip.b.map(function (x) { return ('0000000' + x.toString(2)).slice(-8); }).join('.');
      out.mapped = '::ffff:' + str4(ip.b);
      out.cls = v4class(ip.b);
    } else if (c.key === 'mapped') {
      out.embedded = [ip.w[6] >> 8, ip.w[6] & 255, ip.w[7] >> 8, ip.w[7] & 255].join('.');
    }
    return out;
  }

  // ---- registry (RDAP, RFC 9083) record
  function vcard(e, field) {
    var v = e && e.vcardArray && e.vcardArray[1];
    if (!v) return '';
    for (var i = 0; i < v.length; i++) if (v[i][0] === field) return Array.isArray(v[i][3]) ? v[i][3].filter(Boolean).join(', ') : String(v[i][3] || '');
    return '';
  }
  function walk(list, fn) { (list || []).forEach(function (e) { fn(e); walk(e.entities, fn); }); }
  var REGISTRY = { 'whois.apnic.net': 'APNIC', 'whois.arin.net': 'ARIN', 'whois.ripe.net': 'RIPE NCC', 'whois.lacnic.net': 'LACNIC', 'whois.afrinic.net': 'AFRINIC' };

  function parseRdap(j) {
    if (!j || j.objectClassName !== 'ip network') return null;
    var org = '', abuse = '', orgCountry = '';
    walk(j.entities, function (e) {
      var roles = e.roles || [];
      if (!org && roles.indexOf('registrant') >= 0) { org = vcard(e, 'fn'); var adr = e.vcardArray && e.vcardArray[1].filter(function (x) { return x[0] === 'adr'; })[0]; orgCountry = adr && adr[1] && adr[1].cc || ''; }
      if (!abuse && roles.indexOf('abuse') >= 0) abuse = vcard(e, 'email');
    });
    var ev = function (a) { var e = (j.events || []).filter(function (x) { return x.eventAction === a; })[0]; return e ? String(e.eventDate).slice(0, 10) : ''; };
    var cidr = (j.cidr0_cidrs || []).map(function (c) { return (c.v4prefix || c.v6prefix) + '/' + c.length; }).join(', ');
    var desc = '';
    (j.remarks || []).forEach(function (r) { if (!desc && /desc/i.test(r.title || '') && r.description) desc = r.description.join(' '); });
    var host = String(j.port43 || '').toLowerCase();
    return { name: j.name || '', handle: j.handle || '', start: j.startAddress || '', end: j.endAddress || '', cidr: cidr, type: j.type || '',
      country: (j.country || orgCountry || '').toUpperCase(), org: org || desc, description: desc, abuse: abuse,
      registry: REGISTRY[host] || host.replace(/^whois\./, '').toUpperCase(), registered: ev('registration'), updated: ev('last changed') };
  }

  // Cloudflare's /cdn-cgi/trace: "key=value" lines; ip, loc (ISO country) and colo (nearest data centre, IATA code).
  function parseTrace(text) {
    var o = {};
    String(text || '').split('\n').forEach(function (l) { var i = l.indexOf('='); if (i > 0) o[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
    return o.ip && parse(o.ip) ? { ip: o.ip, country: (o.loc || '').toUpperCase(), colo: o.colo || '', http: o.http || '', tls: o.tls || '' } : null;
  }

  // What the visitor typed: an IP, a domain (or URL), or nothing usable.
  function query(input) {
    var s = String(input == null ? '' : input).trim();
    if (!s) return null;
    var ip = parse(s);
    if (ip) return { kind: 'ip', value: toString(ip) };
    var host = s;
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s) || /[/?#]/.test(s)) { try { host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : 'http://' + s).hostname; } catch (e) { return null; } }
    host = host.replace(/^\[|\]$/g, '');
    ip = parse(host);
    if (ip) return { kind: 'ip', value: toString(ip) };
    try { host = new URL('http://' + host).hostname; } catch (e) { return null; }
    host = host.replace(/\.$/, '').toLowerCase();
    return /^(?=.{1,253}$)(?:(?!-)[a-z0-9-]{1,63}(?<!-)\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/.test(host) ? { kind: 'domain', value: host } : null;
  }

  // DNS-over-HTTPS JSON (Cloudflare or Google): the answers of one record type, without the trailing dot.
  function parseDns(j, type) {
    var t = { A: 1, AAAA: 28, PTR: 12 }[type];
    if (!j || j.Status !== 0 || !j.Answer) return [];
    return j.Answer.filter(function (a) { return a.type === t; }).map(function (a) { return String(a.data).replace(/\.$/, ''); });
  }

  function countryName(cc, lang) {
    if (!/^[A-Z]{2}$/.test(cc || '')) return cc || '';
    try { return new Intl.DisplayNames([lang === 'ms' ? 'ms' : 'en'], { type: 'region' }).of(cc) + ' (' + cc + ')'; } catch (e) { return cc; }
  }

  // Rows for the result table (label, value). r = registry record or null, ptr = reverse DNS names or null.
  function rows(i, r, ptr, lang) {
    var ms = lang === 'ms', out = [];
    var L = ms ? ['Versi', 'Jenis', 'Pemilik rangkaian (ISP / organisasi)', 'Negara berdaftar', 'Julat alamat', 'Blok CIDR', 'Nama rangkaian', 'Daftar wilayah (RIR)', 'E-mel aduan salah guna', 'Didaftar', 'Dikemas kini', 'DNS songsang (PTR)', 'Bentuk penuh', 'Perpuluhan', 'Heksadesimal', 'Perduaan', 'IPv6 dipetakan', 'Kelas (lama)', 'Nama DNS songsang']
      : ['Version', 'Type', 'Network owner (ISP / organisation)', 'Registered country', 'Address range', 'CIDR block', 'Network name', 'Regional registry (RIR)', 'Abuse contact email', 'Registered', 'Last updated', 'Reverse DNS (PTR)', 'Full form', 'Decimal', 'Hexadecimal', 'Binary', 'IPv4-mapped IPv6', 'Class (legacy)', 'Reverse DNS name'];
    out.push([L[0], 'IPv' + i.version]);
    out.push([L[1], TYPES[i.type.key][ms ? 1 : 0] + (i.type.block ? ' · ' + i.type.block + ' (' + i.type.rfc + ')' : '')]);
    if (r) {
      if (r.org) out.push([L[2], r.org]);
      if (r.country) out.push([L[3], countryName(r.country, lang)]);
      if (r.start) out.push([L[4], r.start + ' – ' + r.end]);
      if (r.cidr) out.push([L[5], r.cidr]);
      if (r.name) out.push([L[6], r.name]);
      if (r.registry) out.push([L[7], r.registry]);
      if (r.abuse) out.push([L[8], r.abuse]);
      if (r.registered) out.push([L[9], r.registered]);
      if (r.updated) out.push([L[10], r.updated]);
    }
    if (ptr) out.push([L[11], ptr.length ? ptr.join(', ') : (ms ? 'Tiada rekod' : 'No record')]);
    if (i.version === 6) out.push([L[12], i.expanded]);
    out.push([L[13], i.decimal]);
    out.push([L[14], i.hex]);
    if (i.binary) out.push([L[15], i.binary]);
    if (i.mapped) out.push([L[16], i.mapped]);
    if (i.cls) out.push([L[17], i.cls]);
    out.push([L[18], i.reverse]);
    return out;
  }

  var api = { FACTS: FACTS, SPECIAL: SPECIAL, TYPES: TYPES, parse: parse, toString: toString, expanded: expanded, classify: classify, info: info,
    reverseName: reverseName, parseRdap: parseRdap, parseTrace: parseTrace, parseDns: parseDns, query: query, countryName: countryName, rows: rows };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBIp = api;
})(this);
