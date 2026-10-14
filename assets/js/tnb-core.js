/* TNB domestic electricity bill (Peninsular Malaysia) under the RP4 tariff from 1 July 2025: energy 27.03 sen/kWh (up to
   1,500 kWh), capacity 4.55 sen and network 12.85 sen per kWh, minus the Energy Efficiency Incentive (EEI) for use up to
   1,000 kWh (the band's rate × all kWh); AFA (monthly fuel adjustment), the RM10 retail charge and 8% SST (on the kWh
   above the protection level) apply only above the protection level: 600 kWh, raised to 800 kWh for September to
   December 2026; KWTBB 1.6% above 300 kWh. Verified 14 October 2026. */
(function (root) {
  'use strict';

  var FACTS = {
    verified: '2026-10-14', from: '2025-07-01', maxKwh: 1500,
    energy: 27.03, capacity: 4.55, network: 12.85, retail: 10, kwtbb: 0.016, kwtbbFrom: 300, sst: 0.08,
    protection: 600, extended: { kwh: 800, from: '2026-09-01', until: '2026-12-31' }
  };
  // [upper kWh, EEI sen per kWh] — the rate of the band applies to the whole month's use.
  var EEI = [[200, 25], [250, 24.5], [300, 22.5], [350, 21], [400, 17], [450, 14.5], [500, 12], [550, 10.5], [600, 9],
    [650, 7.5], [700, 5.5], [750, 4.5], [800, 4], [850, 2.5], [900, 1], [1000, 0.5]];

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, d) { v = Number(v); return v !== '' && isFinite(v) ? v : (d || 0); };

  function eeiRate(kwh) {
    for (var i = 0; i < EEI.length; i++) if (kwh <= EEI[i][0]) return EEI[i][1];
    return 0;
  }
  // Protection level in force on an ISO date.
  function protectionOn(iso) {
    var x = FACTS.extended;
    return iso >= x.from && iso <= x.until ? x.kwh : FACTS.protection;
  }

  function calculate(input) {
    var kwh = Math.min(FACTS.maxKwh, Math.max(0, Math.round(num(input.kwh))));
    var level = num(input.protection, FACTS.protection) >= FACTS.extended.kwh ? FACTS.extended.kwh : FACTS.protection;
    var afaRate = num(input.afa), over = kwh > level;
    var energy = cents(kwh * FACTS.energy / 100), capacity = cents(kwh * FACTS.capacity / 100), network = cents(kwh * FACTS.network / 100);
    var rate = eeiRate(kwh), eei = cents(kwh * rate / 100);
    var afa = over ? cents(kwh * afaRate / 100) : 0, retail = over && kwh ? FACTS.retail : 0;
    var usage = cents(energy + capacity + network - eei + afa);
    var kwtbb = kwh > FACTS.kwtbbFrom ? cents(usage * FACTS.kwtbb) : 0;
    var sst = over ? cents((usage + retail) * (kwh - level) / kwh * FACTS.sst) : 0;
    var total = cents(usage + retail + kwtbb + sst);
    return { kwh: kwh, level: level, energy: energy, capacity: capacity, network: network, eeiRate: rate, eei: eei, afaRate: afaRate,
      afa: afa, retail: retail, kwtbb: kwtbb, sst: sst, total: total, perKwh: kwh ? total / kwh * 100 : 0, protected: !over };
  }

  // Monthly kWh from appliance watts × hours a day × days.
  function applianceKwh(watts, hours, days) { return num(watts) * num(hours) * num(days, 30) / 1000; }

  var api = { FACTS: FACTS, EEI: EEI, eeiRate: eeiRate, protectionOn: protectionOn, calculate: calculate, applianceKwh: applianceKwh };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBTnb = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
