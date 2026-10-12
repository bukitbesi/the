(function (root) {
'use strict';
var FACTS = { verified: '2026-10-12' };
var COURIERS = [
{ id: 'poslaju', name: 'Pos Laju (Pos Malaysia)', short: 'Pos Laju', site: 'https://www.pos.com.my/',
home: 'https://tracking.pos.com.my/', track: 'https://tracking.pos.com.my/tracking/{n}',
format: ['2–3 letters, 9 digits, ending in MY', '2–3 huruf, 9 digit, berakhir dengan MY'], example: 'ER123456789MY',
tests: [[/^[A-Z]{2,3}\d{9}MY$/, 3], [/^[A-Z]{2}\d{9}[A-Z]{2}$/, 2]] },
{ id: 'jnt', name: 'J&T Express', short: 'J&T', site: 'https://www.jtexpress.my/',
home: 'https://www.jtexpress.my/tracking', track: 'https://www.jtexpress.my/tracking/{n}',
format: ['12 digits', '12 digit'], example: '630012345678',
tests: [[/^\d{12}$/, 2]] },
{ id: 'spx', name: 'SPX Express (Shopee Xpress)', short: 'SPX', site: 'https://spx.com.my/',
home: 'https://spx.com.my/track', track: 'https://spx.com.my/track?{n}',
format: ['SPXMY + digits, or MY + 12–13 digits + a letter', 'SPXMY + digit, atau MY + 12–13 digit + satu huruf'], example: 'SPXMY012345678901',
tests: [[/^SPXMY\d{8,15}$/, 3], [/^MY\d{12,13}[A-Z]$/, 2]] },
{ id: 'ninjavan', name: 'Ninja Van', short: 'Ninja Van', site: 'https://www.ninjavan.co/en-my',
home: 'https://www.ninjavan.co/en-my/tracking', track: 'https://www.ninjavan.co/en-my/tracking?id={n}',
format: ['Starts with NV, NVMY or MYNJV', 'Bermula dengan NV, NVMY atau MYNJV'], example: 'NVMY23007000005122',
tests: [[/^(NV|NJV|MYNJV)[A-Z0-9]{8,20}$/, 3]] },
{ id: 'dhl', name: 'DHL eCommerce & DHL Express', short: 'DHL', site: 'https://www.dhl.com/my-en/home.html',
home: 'https://www.dhl.com/my-en/home/tracking.html', track: 'https://www.dhl.com/my-en/home/tracking.html?tracking-id={n}&submit=1',
format: ['MY + 3-letter hub code (eCommerce), or 10 digits (Express)', 'MY + kod hab 3 huruf (eCommerce), atau 10 digit (Express)'], example: 'MYCGU1234567890',
tests: [[/^MY(?!NJV|MP)[A-Z]{3}[A-Z0-9]{6,20}$/, 2], [/^\d{10}$/, 2], [/^(GM|LX|RX)\d{16,20}$/, 2]] },
{ id: 'gdex', name: 'GDEX', short: 'GDEX', site: 'https://gdexpress.com/',
home: 'https://gdexpress.com/tracking/', track: 'https://gdexpress.com/tracking/?consignmentno={n}',
format: ['Often MY + 11 digits', 'Selalunya MY + 11 digit'], example: 'MY12345678901',
tests: [[/^MY\d{11}$/, 1]] },
{ id: 'citylink', name: 'City-Link Express', short: 'City-Link', site: 'https://www.citylinkexpress.com/',
home: 'https://www.citylinkexpress.com/tracking-result/', track: 'https://www.citylinkexpress.com/tracking-result/?track0={n}',
format: ['Often 15 letters and digits', 'Selalunya 15 huruf dan digit'], example: '',
tests: [] },
{ id: 'flash', name: 'Flash Express', short: 'Flash', site: 'https://www.flashexpress.my/',
home: 'https://www.flashexpress.my/fle/tracking', track: 'https://www.flashexpress.my/fle/tracking?se={n}',
format: ['Letters and digits on the airway bill', 'Huruf dan digit pada bil udara'], example: '',
tests: [] },
{ id: 'lex', name: 'Lazada Logistics (LEX)', short: 'LEX', site: 'https://www.lazada.com.my/',
home: 'https://tracker.lel.asia/tracker', track: 'https://tracker.lel.asia/tracker?trackingNumber={n}&lang=en-MY',
format: ['Often starts with MYMP', 'Selalunya bermula dengan MYMP'], example: 'MYMPA012345678',
tests: [[/^MYMP[A-Z0-9]{6,20}$/, 2]] },
{ id: 'skynet', name: 'Skynet Express', short: 'Skynet', site: 'https://www.skynet.com.my/',
home: 'https://www.skynet.com.my/track', track: '',
format: ['Digits printed on the airway bill', 'Digit pada bil udara'], example: '',
tests: [] },
{ id: 'lineclear', name: 'Line Clear Express', short: 'Line Clear', site: 'https://www.lineclearexpress.com/',
home: 'https://www.lineclearexpress.com/', track: '',
format: ['Letters and digits on the consignment note', 'Huruf dan digit pada nota konsainan'], example: '',
tests: [] },
{ id: 'aramex', name: 'Aramex', short: 'Aramex', site: 'https://www.aramex.com/my/en',
home: 'https://www.aramex.com/my/en/track/results', track: 'https://www.aramex.com/my/en/track/results?ShipmentNumber={n}',
format: ['10–12 digits', '10–12 digit'], example: '',
tests: [[/^\d{11}$/, 1]] },
{ id: 'fedex', name: 'FedEx', short: 'FedEx', site: 'https://www.fedex.com/en-my/home.html',
home: 'https://www.fedex.com/en-my/tracking.html', track: 'https://www.fedex.com/fedextrack/?trknbr={n}',
format: ['12 or 15 digits', '12 atau 15 digit'], example: '771234567890',
tests: [[/^\d{12}$/, 1], [/^\d{15}$/, 2]] },
{ id: 'ups', name: 'UPS', short: 'UPS', site: 'https://www.ups.com/my/en/Home.page',
home: 'https://www.ups.com/track', track: 'https://www.ups.com/track?tracknum={n}',
format: ['1Z + 16 letters and digits', '1Z + 16 huruf dan digit'], example: '1Z999AA10123456784',
tests: [[/^1Z[A-Z0-9]{16}$/, 3]] }
];
var UNIVERSAL = { id: 'any', name: '17TRACK', home: 'https://www.17track.net/en', track: 'https://t.17track.net/en#nums={n}' };
var byId = {};
COURIERS.forEach(function (c) { byId[c.id] = c; });
function normalize(s) { return String(s == null ? '' : s).toUpperCase().replace(/[\s\-_.\/]+/g, ''); }
function isValid(n) { return /^[A-Z0-9]{8,30}$/.test(n); }
function detect(input) {
var n = normalize(input), out = [];
if (!isValid(n)) return out;
COURIERS.forEach(function (c, order) {
var best = 0;
c.tests.forEach(function (t) { if (t[0].test(n) && t[1] > best) best = t[1]; });
if (best) out.push({ id: c.id, courier: c, score: best, order: order });
});
out.sort(function (a, b) { return b.score - a.score || a.order - b.order; });
return out.map(function (m) { return { id: m.id, courier: m.courier, score: m.score }; });
}
function trackUrl(courierOrId, input) {
var c = typeof courierOrId === 'string' ? (courierOrId === 'any' ? UNIVERSAL : byId[courierOrId]) : courierOrId;
if (!c) return '';
var n = normalize(input);
return c.track && isValid(n) ? c.track.replace('{n}', encodeURIComponent(n)) : c.home;
}
var MAPS = {
jnt: ['J&T Express', 'J&T Express drop point'],
poslaju: ['Pos Malaysia', 'Pos Laju'],
ninjavan: ['Ninja Point', 'Ninja Van']
};
function mapsUrl(query, where) {
if (where && isFinite(where.lat) && isFinite(where.lng)) {
return 'https://www.google.com/maps/search/' + encodeURIComponent(query) + '/@' +
Number(where.lat).toFixed(2) + ',' + Number(where.lng).toFixed(2) + ',14z';
}
var area = where && typeof where === 'string' ? where.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query + (area ? ' ' + area : ' near me'));
}
var api = { FACTS: FACTS, COURIERS: COURIERS, UNIVERSAL: UNIVERSAL, MAPS: MAPS, byId: byId,
normalize: normalize, isValid: isValid, detect: detect, trackUrl: trackUrl, mapsUrl: mapsUrl };
if (typeof module === 'object' && module.exports) module.exports = api;
else root.TBBTracking = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
(function () {
'use strict';
var K = window.TBBTracking;
var form = document.getElementById('nearForm');
if (!K || !form) return;
var ms = document.documentElement.lang === 'ms';
var $ = function (id) { return document.getElementById(id); };
var queries = K.MAPS[form.getAttribute('data-courier')] || [];
if (!queries.length) return;
var msg = $('nearMsg'), out = $('nearLinks'), btn = $('nearLocate');
var T = ms ? {
finding: 'Mencari lokasi anda…',
ready: 'Sedia. Buka Google Maps untuk melihat cawangan berhampiran anda.',
area: function (a) { return 'Sedia. Buka Google Maps untuk melihat cawangan di ' + a + '.'; },
denied: 'Lokasi tidak dibenarkan. Taip kawasan atau poskod di bawah.',
failed: 'Lokasi tidak dapat dikesan. Taip kawasan atau poskod di bawah.',
empty: 'Taip kawasan, bandar atau poskod.',
open: function (q) { return 'Buka ' + q + ' di Google Maps'; },
also: function (q) { return 'Cuba juga: ' + q; }
} : {
finding: 'Finding your location…',
ready: 'Ready. Open Google Maps to see branches near you.',
area: function (a) { return 'Ready. Open Google Maps to see branches in ' + a + '.'; },
denied: 'Location permission was declined. Type an area or postcode below.',
failed: 'Your location could not be found. Type an area or postcode below.',
empty: 'Type an area, town or postcode.',
open: function (q) { return 'Open ' + q + ' in Google Maps'; },
also: function (q) { return 'Also try: ' + q; }
};
function show(where, text) {
out.textContent = '';
queries.forEach(function (q, i) {
var li = document.createElement('li'), a = document.createElement('a');
a.className = i ? 'btn ghost sm' : 'btn';
a.href = K.mapsUrl(q, where); a.target = '_blank'; a.rel = 'noopener';
a.textContent = i ? T.also(q) : T.open(q);
li.appendChild(a); out.appendChild(li);
});
msg.className = 'note'; msg.textContent = text;
out.hidden = false;
out.querySelector('a').focus();
}
if (!navigator.geolocation) btn.hidden = true;
btn.addEventListener('click', function () {
msg.className = 'note'; msg.textContent = T.finding; btn.disabled = true;
navigator.geolocation.getCurrentPosition(function (pos) {
btn.disabled = false;
show({ lat: pos.coords.latitude, lng: pos.coords.longitude }, T.ready);
}, function (err) {
btn.disabled = false;
msg.className = 'error'; msg.textContent = err && err.code === 1 ? T.denied : T.failed;
$('nearArea').focus();
}, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
});
form.addEventListener('submit', function (e) {
e.preventDefault();
var area = $('nearArea').value.replace(/\s+/g, ' ').trim();
if (!area) { msg.className = 'error'; msg.textContent = T.empty; $('nearArea').focus(); return; }
show(area, T.area(area));
});
})();
