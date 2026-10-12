/* Malaysian parcel tracking: courier list, tracking-number format detection and official tracking links.
   Formats are the patterns couriers print on consignment notes; several overlap (a 12-digit number can be
   J&T or FedEx), so detect() returns ranked candidates, never a single certain answer. Links open each
   courier's own tracking page; where a courier ignores the number in the URL, the UI has already copied it.
   Verified 12 October 2026. */
(function (root) {
  'use strict';

  var FACTS = { verified: '2026-10-12' };

  // score: 3 = prefix unique to this courier, 2 = usual format, 1 = also used by others.
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
      format: ['Digits printed on the consignment note', 'Digit pada nota konsainan'], example: '',
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

  // Universal tracker for anything not recognised (international mail, marketplaces' own numbers).
  var UNIVERSAL = { id: 'any', name: '17TRACK', home: 'https://www.17track.net/en', track: 'https://t.17track.net/en#nums={n}' };

  var byId = {};
  COURIERS.forEach(function (c) { byId[c.id] = c; });

  function normalize(s) { return String(s == null ? '' : s).toUpperCase().replace(/[\s\-_.\/]+/g, ''); }
  function isValid(n) { return /^[A-Z0-9]{8,30}$/.test(n); }

  // Ranked candidates: highest score first, then catalogue order (most-used couriers first).
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

  var api = { FACTS: FACTS, COURIERS: COURIERS, UNIVERSAL: UNIVERSAL, byId: byId,
    normalize: normalize, isValid: isValid, detect: detect, trackUrl: trackUrl };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBTracking = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
