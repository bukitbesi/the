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
var form = document.getElementById('trackForm');
if (!K || !form) return;
var ms = document.documentElement.lang === 'ms';
var $ = function (id) { return document.getElementById(id); };
var input = $('trackNo'), out = $('trackMatches'), msg = $('trackMsg'), live = $('trackLive');
var STORE = 'tbb-parcels', MAX = 10;
var preset = K.byId[form.getAttribute('data-courier')] || null;
var current = '', yqState = '';
var T = ms ? {
invalid: 'Masukkan nombor tracking 8–30 huruf atau digit.',
found: function (n, c) { return 'Nombor ' + n + ' sepadan dengan format ' + c + '.'; },
unknown: function (n) { return 'Format ' + n + ' tidak dikenali. Pilih kurier anda di bawah atau guna 17TRACK.'; },
level: { 3: 'Padanan tepat', 2: 'Kemungkinan besar', 1: 'Mungkin', 0: 'Kurier dipilih' },
preset: function (n, c) { return 'Semak ' + n + ' di laman rasmi ' + c + '.'; },
other: function (n, a, b) { return n + ' kelihatan seperti nombor ' + a + ', bukan ' + b + '. Semak di ' + a + ' dahulu.'; },
statusFail: 'Paparan status tidak dapat dimuatkan. Guna pautan kurier di atas.',
track: function (c) { return 'Semak di ' + c; },
any: 'Semak di 17TRACK (semua kurier)',
copied: 'Nombor disalin. Tampal jika laman kurier memintanya.',
remove: function (n) { return 'Buang ' + n; },
again: function (n) { return 'Semak semula ' + n; }
} : {
invalid: 'Enter a tracking number of 8–30 letters or digits.',
found: function (n, c) { return n + ' matches the ' + c + ' format.'; },
unknown: function (n) { return 'The format of ' + n + ' is not recognised. Choose your courier below or use 17TRACK.'; },
level: { 3: 'Exact match', 2: 'Likely', 1: 'Possible', 0: 'Selected courier' },
preset: function (n, c) { return 'Track ' + n + ' on ' + c + "'s official page."; },
other: function (n, a, b) { return n + ' matches the ' + a + ' format, not ' + b + '. Try ' + a + ' first.'; },
statusFail: 'The status viewer could not load. Use the courier link above.',
track: function (c) { return 'Track on ' + c; },
any: 'Track on 17TRACK (all couriers)',
copied: 'Number copied. Paste it if the courier page asks.',
remove: function (n) { return 'Remove ' + n; },
again: function (n) { return 'Track ' + n + ' again'; }
};
function load() { try { var v = JSON.parse(localStorage.getItem(STORE) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function save(list) { try { localStorage.setItem(STORE, JSON.stringify(list.slice(0, MAX))); } catch (e) {  } }
function link(cls, href, text, n) {
var a = document.createElement('a');
a.className = cls; a.href = href; a.target = '_blank'; a.rel = 'noopener';
a.textContent = text; a.setAttribute('data-copy', n);
return a;
}
function show(raw, remember) {
var n = K.normalize(raw);
out.textContent = '';
if (!K.isValid(n)) {
msg.textContent = T.invalid; msg.className = 'error'; live.textContent = T.invalid;
input.setAttribute('aria-invalid', 'true');
$('statusWrap').hidden = true; current = '';
return;
}
input.removeAttribute('aria-invalid');
input.value = n;
var matches = K.detect(n), note = '';
if (preset) {
var at = -1;
matches.forEach(function (m, i) { if (m.id === preset.id) at = i; });
if (at > 0) matches.unshift(matches.splice(at, 1)[0]);
else if (at < 0 && matches.length && matches[0].score === 3) { note = T.other(n, matches[0].courier.short, preset.short); matches.push({ id: preset.id, courier: preset, score: 0 }); }
else if (at < 0) { note = T.preset(n, preset.short); matches.unshift({ id: preset.id, courier: preset, score: 0 }); }
}
matches.forEach(function (m) {
var li = document.createElement('li'), head = document.createElement('p'), tag = document.createElement('span');
li.className = 'match s' + m.score;
tag.className = 'lvl'; tag.textContent = T.level[m.score];
head.appendChild(document.createTextNode(m.courier.name + ' '));
head.appendChild(tag);
li.appendChild(head);
li.appendChild(link('btn sm', K.trackUrl(m.courier, n), T.track(m.courier.short), n));
out.appendChild(li);
});
var any = document.createElement('li');
any.className = 'match any';
any.appendChild(link('btn ghost sm', K.trackUrl('any', n), T.any, n));
out.appendChild(any);
msg.className = 'note';
msg.textContent = note || (matches.length ? T.found(n, matches[0].courier.short) : T.unknown(n));
current = n;
$('statusWrap').hidden = false;
if (yqState === 'shown') { $('yqStatus').textContent = ''; yqState = 'ready'; }
live.textContent = msg.textContent;
document.querySelectorAll('#courierGrid a[data-id]').forEach(function (a) {
a.href = K.trackUrl(a.getAttribute('data-id'), n);
a.setAttribute('data-copy', n);
});
history.replaceState(null, '', '#n=' + encodeURIComponent(n));
if (remember) {
var list = load().filter(function (x) { return x.n !== n; });
list.unshift({ n: n, c: matches.length ? matches[0].id : '', t: Date.now() });
save(list);
renderSaved();
}
}
function renderSaved() {
var list = load(), ul = $('savedList');
$('savedBox').hidden = !list.length;
ul.textContent = '';
list.forEach(function (x) {
var li = document.createElement('li'), again = document.createElement('button'), del = document.createElement('button');
var c = K.byId[x.c];
again.type = 'button'; again.className = 'saved-n'; again.setAttribute('data-n', x.n);
again.setAttribute('aria-label', T.again(x.n));
again.textContent = x.n;
if (c) { var s = document.createElement('small'); s.textContent = c.short; again.appendChild(s); }
del.type = 'button'; del.className = 'row-del'; del.setAttribute('data-del', x.n);
del.setAttribute('aria-label', T.remove(x.n)); del.textContent = '×';
li.appendChild(again); li.appendChild(del);
ul.appendChild(li);
});
}
var narrow = window.matchMedia ? matchMedia('(max-width: 899px)') : { matches: false };
function showStatus() {
var box = $('yqStatus');
function fail() { yqState = ''; box.textContent = T.statusFail; }
function run() {
try {
window.YQV5.trackSingle({ YQ_ContainerId: 'yqStatus', YQ_Height: 560, YQ_Fc: '0', YQ_Lang: 'en', YQ_Num: current });
yqState = 'shown';
} catch (e) { fail(); }
}
if (!current) return;
if (window.YQV5) { run(); return; }
if (yqState === 'loading') return;
yqState = 'loading';
var s = document.createElement('script');
s.src = 'https://www.17track.net/externalcall.js'; s.async = true;
s.onload = function () { if (window.YQV5) run(); else fail(); };
s.onerror = fail;
document.head.appendChild(s);
}
form.addEventListener('submit', function (e) {
e.preventDefault(); show(input.value, true);
if (narrow.matches) $('track-result-h').scrollIntoView({ block: 'start', behavior: 'smooth' });
});
$('trackPaste').hidden = !(navigator.clipboard && navigator.clipboard.readText);
$('trackPaste').addEventListener('click', function () {
navigator.clipboard.readText().then(function (t) { input.value = t; show(t, true); }, function () { input.focus(); });
});
document.addEventListener('click', function (e) {
var t = e.target.closest && e.target.closest('[data-copy],[data-n],[data-del],#savedClear,#statusBtn');
if (!t) return;
if (t.hasAttribute('data-copy')) {
if (navigator.clipboard) navigator.clipboard.writeText(t.getAttribute('data-copy')).then(function () { live.textContent = T.copied; $('trackCopied').hidden = false; }, function () {});
} else if (t.id === 'statusBtn') {
showStatus();
} else if (t.hasAttribute('data-n')) {
input.value = t.getAttribute('data-n'); show(input.value, false); input.scrollIntoView({ block: 'center' });
} else if (t.hasAttribute('data-del')) {
save(load().filter(function (x) { return x.n !== t.getAttribute('data-del'); })); renderSaved();
} else {
save([]); renderSaved();
}
});
renderSaved();
function fromHash() {
var h = /[#&]n=([^&]+)/.exec(location.hash);
if (h && K.normalize(decodeURIComponent(h[1])) !== input.value) { input.value = decodeURIComponent(h[1]); show(input.value, false); }
}
addEventListener('hashchange', fromHash);
fromHash();
})();
