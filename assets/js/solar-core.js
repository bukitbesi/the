/* Rooftop solar for homes under Solar ATAP (Peninsular Malaysia, from 1 January 2026; Energy Commission guideline
   GP/ST/No. 60/2025): self-consumed kWh are never imported, so they avoid the full tariff; exported kWh earn a credit at
   the energy charge (27.03 sen/kWh) only, up to the month's imported kWh and the maximum allowable quantity (kWac × 5
   hours × days), with no carry-over and no cash; capacity charge, network charge and AFA are not offset. Caps: 5 kW
   single phase and 15 kW three phase without a TNB connection check (RM1,000). SuRIA Home rebate RM600 per kWac, up to
   RM3,000, for systems in operation 1 June to 31 December 2026. Bills priced with TBBTnb (tnb-core.js). How the Energy
   Efficiency Incentive treats exports is not published, so the lower of the rebate on imported kWh and on net kWh is used. Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-15', from: '2026-01-01', maqHours: 5, days: 30, caps: { single: 5, three: 15 }, ccc: 1000,
    suria: { perKwac: 600, max: 3000, from: '2026-06-01', until: '2026-12-31' }, tenure: 10 };
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, d) { v = Number(v); return v !== '' && isFinite(v) && v >= 0 ? v : (d || 0); };

  function bills(T, usage, imports, credited, afa, level) {
    var F = T.FACTS, without = T.calculate({ kwh: usage, afa: afa, protection: level });
    var energy = cents(imports * F.energy / 100), capacity = cents(imports * F.capacity / 100), network = cents(imports * F.network / 100);
    var credit = cents(credited * F.energy / 100), net = Math.max(0, imports - credited), eei = Math.min(cents(net * T.eeiRate(net) / 100), cents(imports * T.eeiRate(imports) / 100));
    var over = imports > (level >= F.extended.kwh ? F.extended.kwh : F.protection), lvl = level >= F.extended.kwh ? F.extended.kwh : F.protection;
    var afaAmt = over ? cents(imports * afa / 100) : 0, retail = over && imports ? F.retail : 0;
    var usageAmt = cents(energy + capacity + network - credit - eei + afaAmt);
    var kwtbb = imports > F.kwtbbFrom ? cents(Math.max(0, usageAmt) * F.kwtbb) : 0;
    var sst = over ? cents(Math.max(0, usageAmt + retail) * (imports - lvl) / imports * F.sst) : 0;
    var total = Math.max(0, cents(usageAmt + retail + kwtbb + sst));
    return { without: without.total, with: total, lines: { energy: energy, capacity: capacity, network: network, credit: credit, eei: eei, afa: afaAmt, retail: retail, kwtbb: kwtbb, sst: sst } };
  }

  function calculate(input) {
    var T = input.tnb || root.TBBTnb;
    var usage = Math.min(T.FACTS.maxKwh, Math.round(num(input.usage))), kwp = num(input.kwp), kwac = num(input.kwac, kwp);
    var phase = input.phase === 'three' ? 'three' : 'single', yieldKwp = num(input.yield, 1200), share = Math.min(100, num(input.selfuse, 60)) / 100;
    var gen = kwp * yieldKwp / 12, self = Math.min(gen * share, usage), exported = gen - self, imports = usage - self;
    var maq = kwac * FACTS.maqHours * FACTS.days, credited = Math.min(exported, imports, maq);
    var b = bills(T, usage, Math.round(imports), Math.round(credited), num(input.afa), num(input.protection, T.FACTS.protection));
    var saving = cents(b.without - b.with), cost = cents(kwp * num(input.costKwp));
    var rebate = input.suria === 'yes' ? Math.min(FACTS.suria.max, cents(kwac * FACTS.suria.perKwac)) : 0;
    var net = Math.max(0, cost - rebate), yearly = cents(saving * 12);
    return { usage: usage, kwp: kwp, kwac: kwac, phase: phase, gen: Math.round(gen), self: Math.round(self), exported: Math.round(exported), imports: Math.round(imports),
      maq: Math.round(maq), credited: Math.round(credited), forfeited: Math.round(exported - credited), without: b.without, with: b.with, lines: b.lines,
      saving: saving, yearly: yearly, cost: cost, rebate: rebate, net: net, payback: yearly > 0 ? net / yearly : null, tenureSaving: cents(yearly * FACTS.tenure),
      overCap: kwac > FACTS.caps[phase], cap: FACTS.caps[phase] };
  }

  var api = { FACTS: FACTS, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBSolar = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
