/* Malaysian road tax (LKM) for private vehicles. Cars by engine cc and JPJ body type (saloon / non-saloon, as on the
   VOC), owner (individual / company) and region (Peninsular; Sabah and Sarawak; Labuan at 50% of the Sabah and
   Sarawak rate and Langkawi or Pangkor at 50% of the Peninsular rate above 1,000 cc); electric cars by total motor kW
   (national schedule from 1 January 2026, groups A to K); motorcycles by cc; electric motorcycles by motor watts.
   Six-month renewal costs half. Rates not confirmed by two sources return null with a reason. Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-15', earlyMonths: 2, digitalFrom: '2023-02-10', evFrom: '2026-01-01', puspakomYears: 3,
    compound: [[15, 150], [30, 200], [60, 300]], fine: 2000 };

  // [upper cc, base RM, RM per cc above the previous band's upper limit]
  var CAR = {
    saloon: [[1000, 20, 0], [1200, 55, 0], [1400, 70, 0], [1600, 90, 0], [1800, 200, 0.4], [2000, 280, 0.5], [2500, 380, 1], [3000, 880, 2.5], [Infinity, 2130, 4.5]],
    nonSaloon: [[1000, 20, 0], [1200, 85, 0], [1400, 100, 0], [1600, 120, 0], [1800, 300, 0.3], [2000, 360, 0.4], [2500, 440, 0.8], [3000, 840, 1.6], [Infinity, 1640, 1.6]],
    companySaloon: [[1000, 20, 0], [1200, 110, 0], [1400, 140, 0], [1600, 180, 0], [1800, 400, 0.8], [2000, 560, 1], [2500, 760, 3], [3000, 2260, 7.5], [Infinity, 6010, 13.5]],
    eastSaloon: [[1000, 20, 0], [1200, 44, 0], [1400, 56, 0], [1600, 72, 0], [1800, 160, 0.32], [2000, 224, 0.25], [2500, 274, 0.5], [3000, 524, 1], [Infinity, 1024, 1.35]],
    eastNonSaloon: [[1000, 20, 0], [1200, 42.5, 0], [1400, 50, 0], [1600, 60, 0], [1800, 165, 0.17], [2000, 199, 0.22], [2500, 243, 0.44], [3000, 463, 0.88], [Infinity, 903, 1.2]]
  };
  // [upper kW, base RM, kW where charged 10 kW blocks start, RM per block]; above 1,010 kW a flat RM20,000.
  var EV = [[50, 20, 50, 0], [100, 20, 50, 10], [210, 80, 110, 20], [310, 305, 220, 30], [410, 615, 320, 50], [510, 1140, 420, 100],
    [610, 2165, 520, 150], [710, 3690, 620, 200], [810, 5715, 720, 250], [910, 8240, 820, 300], [1010, 11265, 920, 350]];
  var EV_TOP = 20000;
  // [upper cc, Peninsular RM, Sabah and Sarawak RM]; null = sources conflict.
  var MOTO = [[150, 2, 2], [200, 30, 9], [250, 50, 12], [500, null, 30], [800, 250, 40], [Infinity, 350, 42]];
  // Electric motorcycles: [upper watts, RM].
  var EMOTO = [[7500, 2], [10000, 9], [12500, 12], [25000, 30], [40000, 40], [Infinity, 42]];

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };

  function fromBands(bands, cc) {
    var prev = 0;
    for (var i = 0; i < bands.length; i++) {
      if (cc <= bands[i][0]) return { tax: cents(bands[i][1] + bands[i][2] * Math.max(0, cc - prev)), from: prev + 1, to: bands[i][0], base: bands[i][1], perCc: bands[i][2], over: Math.max(0, cc - prev), above: prev };
      prev = bands[i][0];
    }
    return null;
  }
  function ev(kw) {
    for (var i = 0; i < EV.length; i++) {
      var b = EV[i];
      if (kw <= b[0]) { var blocks = Math.max(0, Math.ceil((kw - b[2]) / 10 - 1e-9)); return { tax: b[1] + b[3] * blocks, group: 'ABCDEFGHIJ'.charAt(Math.max(0, i - 1)), base: b[1], blocks: blocks, perBlock: b[3] }; }
    }
    return { tax: EV_TOP, group: 'K', base: EV_TOP, blocks: 0, perBlock: 0 };
  }

  function calculate(input) {
    var type = input.type || 'car', region = input.region || 'peninsular', company = input.owner === 'company', body = input.body === 'nonSaloon' ? 'nonSaloon' : 'saloon';
    var months = Number(input.months) === 6 ? 6 : 12, r = { type: type, region: region, months: months, tax: null, reason: null };
    if (type === 'car') {
      var cc = Math.round(num(input.cc));
      if (!cc) return r;
      var east = region === 'east' || region === 'labuan', table;
      if (company && body === 'saloon' && region !== 'peninsular') { r.reason = 'companyEast'; return r; }
      table = east ? (body === 'nonSaloon' ? CAR.eastNonSaloon : CAR.eastSaloon) : company && body === 'saloon' ? CAR.companySaloon : CAR[body];
      var b = fromBands(table, cc), annual = b.tax;
      var island = (region === 'labuan' || region === 'langkawi') && cc > 1000;
      if (island) annual = cents(annual / 2);
      r.cc = cc; r.band = b; r.island = island; r.annual = annual;
    } else if (type === 'ev') {
      var kw = num(input.kw);
      if (!kw) return r;
      if (region !== 'peninsular') { r.reason = 'evRegion'; return r; }
      r.kw = kw; r.ev = ev(kw); r.annual = r.ev.tax;
    } else if (type === 'moto') {
      var mcc = Math.round(num(input.cc));
      if (!mcc) return r;
      if (region === 'labuan' || region === 'langkawi') { r.reason = 'motoIsland'; return r; }
      for (var i = 0; i < MOTO.length; i++) if (mcc <= MOTO[i][0]) { r.motoBand = [i ? MOTO[i - 1][0] + 1 : 1, MOTO[i][0]]; r.annual = MOTO[i][region === 'east' ? 2 : 1]; break; }
      r.cc = mcc;
      if (r.annual === null) { r.reason = 'moto500'; return r; }
    } else {
      var w = num(input.watts);
      if (!w) return r;
      if (region !== 'peninsular') { r.reason = 'emotoRegion'; return r; }
      for (var j = 0; j < EMOTO.length; j++) if (w <= EMOTO[j][0]) { r.emotoBand = [j ? EMOTO[j - 1][0] + 1 : 0, EMOTO[j][0]]; r.annual = EMOTO[j][1]; break; }
      r.watts = w;
    }
    r.half = cents(r.annual / 2);
    r.tax = months === 6 ? r.half : r.annual;
    r.monthly = cents(r.annual / 12);
    return r;
  }

  var api = { FACTS: FACTS, CAR: CAR, EV: EV, EV_TOP: EV_TOP, MOTO: MOTO, EMOTO: EMOTO, calculate: calculate, fromBands: fromBands, ev: ev };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBRoadTax = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
