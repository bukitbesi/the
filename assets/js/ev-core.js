/* EV vs petrol running cost in Malaysia. Home charging is priced as the change in the household TNB bill (TBBTnb,
   RP4 domestic tariff: energy, capacity and network charges, loss of the Energy Efficiency Incentive, KWTBB, SST above
   the protection level); there is no EV-specific domestic tariff. Public charging is not regulated (MITI, July 2026):
   operators set their own per-kWh prices, so the rate is a user input (published examples: AC about RM1.00-1.15,
   DC RM1.30-1.80). Petrol uses the weekly Ministry of Finance prices (BUDI95 RON95 RM1.99 up to the monthly quota of
   300 litres, the unsubsidised price above it). Consumption presets are battery capacity ÷ WLTP range for EVs and
   manufacturer claims for petrol cars; real-world use is usually higher. Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-15', budiPrice: 1.99, quota: 300 };
  var EVS = [['qve', 'Perodua QV-E', 14.2], ['emas7', 'Proton e.MAS 7', 14.3], ['atto3', 'BYD Atto 3', 14.5], ['dolphin', 'BYD Dolphin', 13.2], ['modely', 'Tesla Model Y RWD', 12.6]];
  var CARS = [['axia', 'Perodua Axia 1.0', 3.95], ['bezza', 'Perodua Bezza', 4.4], ['saga', 'Proton Saga 1.5 CVT (2026)', 4.9], ['x50', 'Proton X50 1.5T', 6.4]];
  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, d) { v = Number(v); return v !== '' && isFinite(v) && v >= 0 ? v : (d || 0); };

  function calculate(input, T) {
    T = T || root.TBBTnb;
    var km = num(input.km), evUse = num(input.evUse, 14.2), share = Math.min(100, num(input.homeShare, 80)) / 100;
    var house = num(input.houseKwh), rate = num(input.publicRate), level = num(input.protection, T.FACTS.protection);
    var evKwh = km * evUse / 100, homeKwh = evKwh * share, publicKwh = evKwh - homeKwh;
    var max = T.FACTS.maxKwh, over = house + homeKwh > max;
    var before = T.calculate({ kwh: Math.min(max, house), protection: level }), after = T.calculate({ kwh: Math.min(max, house + homeKwh), protection: level });
    var home = cents(after.total - before.total), pub = cents(publicKwh * rate), ev = cents(home + pub);
    var litres = km * num(input.petrolUse, 4.9) / 100, market = num(input.marketPrice), budi = input.budi !== 'no';
    var subsidised = budi ? Math.min(litres, FACTS.quota) : 0;
    var petrol = cents(subsidised * FACTS.budiPrice + (litres - subsidised) * market);
    var save = cents(petrol - ev), extra = num(input.evExtra);
    return {
      km: km, evKwh: evKwh, homeKwh: homeKwh, publicKwh: publicKwh, home: home, pub: pub, ev: ev, before: before.total, after: after.total, over: over,
      homeSen: homeKwh ? home / homeKwh * 100 : 0, litres: litres, subsidised: subsidised, petrol: petrol, save: save, yearly: cents(save * 12),
      evPerKm: km ? ev / km * 100 : 0, petrolPerKm: km ? petrol / km * 100 : 0, payback: extra > 0 && save > 0 ? extra / (save * 12) : null, extra: extra
    };
  }

  var api = { FACTS: FACTS, EVS: EVS, CARS: CARS, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBEv = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
