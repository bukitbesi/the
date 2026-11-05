/* IP lookup UI (EN + BM). Your IP comes from this site's own Cloudflare edge (/cdn-cgi/trace, same origin). Owner,
   network and abuse contact come from the regional internet registry through rdap.org (RDAP, RFC 9083); domains and
   reverse DNS from Cloudflare DNS-over-HTTPS, with Google's as fallback. No API keys, nothing stored. */
(function () {
  'use strict';
  var I = window.TBBIp;
  var form = document.getElementById('ipForm');
  if (!I || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var ms = document.documentElement.lang === 'ms', lang = ms ? 'ms' : 'en';
  var T = ms ? {
    detecting: 'Mengesan…', noTrace: 'Alamat IP anda tidak dapat dikesan di sini. Cuba muat semula halaman.', from: 'Dari', via: 'pusat data Cloudflare',
    looking: 'Menyemak…', bad: 'Masukkan alamat IPv4, IPv6 atau nama domain yang sah.', noDns: 'Domain ini tiada rekod A atau AAAA.', dns: 'Domain ini menghala ke',
    rdapFail: 'Daftar IP tidak menjawab; maklumat tempatan sahaja ditunjukkan.', notPublic: 'Alamat bukan awam: tiada rekod daftar Internet.', done: 'Semakan selesai untuk', copied: 'Disalin'
  } : {
    detecting: 'Detecting…', noTrace: 'Your IP address could not be detected here. Try reloading the page.', from: 'From', via: 'Cloudflare data centre',
    looking: 'Looking up…', bad: 'Enter a valid IPv4 or IPv6 address or a domain name.', noDns: 'This domain has no A or AAAA record.', dns: 'This domain points to',
    rdapFail: 'The IP registry did not answer; showing local details only.', notPublic: 'Not a public address: there is no internet registry record.', done: 'Lookup complete for', copied: 'Copied'
  };
  var mine = '', seq = 0;

  function getJson(url) {
    return fetch(url, { headers: { Accept: 'application/rdap+json, application/json' } }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function dns(name, type) {
    var q = '?name=' + encodeURIComponent(name) + '&type=' + type;
    return getJson('https://cloudflare-dns.com/dns-query' + q + '&ct=application/dns-json')
      .catch(function () { return getJson('https://dns.google/resolve' + q); })
      .then(function (j) { return I.parseDns(j, type); }, function () { return null; });
  }
  function rows(list) {
    var body = $('ipRows');
    body.textContent = '';
    list.forEach(function (x) { var tr = body.insertRow(), th = document.createElement('th'); th.scope = 'row'; th.textContent = x[0]; tr.appendChild(th); tr.insertCell().textContent = x[1]; });
  }
  function status() { $('ipStatus').textContent = Array.prototype.filter.call(arguments, Boolean).join(' '); }

  function lookupIp(ip, id, note) {
    var info = I.info(ip, lang);
    $('ipFor').textContent = info.address;
    rows(I.rows(info, null, null, lang));
    if (!info.type.public) { status(note, T.notPublic); $('ipLive').textContent = T.done + ' ' + info.address; return Promise.resolve(null); }
    status(note, T.looking);
    var reg = getJson('https://rdap.org/ip/' + encodeURIComponent(info.address)).then(I.parseRdap, function () { return null; });
    return Promise.all([reg, dns(info.reverse, 'PTR')]).then(function (r) {
      if (id !== seq) return null;
      rows(I.rows(info, r[0], r[1], lang));
      status(note, r[0] ? '' : T.rdapFail);
      $('ipLive').textContent = T.done + ' ' + info.address;
      return r[0];
    });
  }

  function lookup(value, write) {
    var q = I.query(value), id = ++seq;
    if (!q) { status(T.bad); $('ipLive').textContent = T.bad; return; }
    if (write) history.replaceState(null, '', q.value === mine ? location.pathname : '#q=' + encodeURIComponent(q.value));
    if (q.kind === 'ip') { lookupIp(q.value, id, ''); return; }
    status(T.looking);
    Promise.all([dns(q.value, 'A'), dns(q.value, 'AAAA')]).then(function (r) {
      if (id !== seq) return;
      var all = (r[0] || []).concat(r[1] || []);
      if (!all.length) { status(T.noDns); $('ipLive').textContent = T.noDns; return; }
      lookupIp(all[0], id, T.dns + ' ' + all.join(', ') + '.');
    });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); lookup($('ipQ').value, true); });
  $('ipMineBtn').addEventListener('click', function () { if (mine) { $('ipQ').value = mine; lookup(mine, true); } });
  $('ipCopy').addEventListener('click', function () {
    var b = this, o = b.textContent;
    if (mine && navigator.clipboard) navigator.clipboard.writeText(mine).then(function () { b.textContent = T.copied; setTimeout(function () { b.textContent = o; }, 1500); });
  });
  $('ipPrint').addEventListener('click', function () { window.print(); });

  var fromHash = '';
  try { fromHash = decodeURIComponent((location.hash.match(/[#&]q=([^&]+)/) || [])[1] || ''); } catch (e) { /* malformed hash */ }
  if (fromHash) { $('ipQ').value = fromHash; lookup(fromHash, false); }

  $('ipMine').textContent = T.detecting;
  fetch('/cdn-cgi/trace', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
    var tr = I.parseTrace(t);
    if (!tr) throw new Error('no trace');
    mine = tr.ip;
    var info = I.info(tr.ip, lang);
    $('ipMine').textContent = info.address;
    $('ipMineSub').textContent = 'IPv' + info.version + (tr.country ? ' · ' + T.from + ' ' + I.countryName(tr.country, lang) : '') + (tr.colo ? ' · ' + T.via + ' ' + tr.colo : '');
    $('ipCopy').disabled = false; $('ipMineBtn').disabled = false;
    if (!fromHash) { $('ipQ').value = info.address; return lookupIp(info.address, ++seq, ''); }
    return null;
  }).then(function (reg) {
    if (reg && reg.org) $('ipMineSub').textContent += ' · ' + reg.org;
  }).catch(function () { $('ipMine').textContent = '–'; $('ipMineSub').textContent = T.noTrace; });
})();
