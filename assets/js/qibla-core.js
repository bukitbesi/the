/* Qibla direction from anywhere: the initial great-circle bearing from true north to the Kaaba (21.4225 N,
   39.8262 E) and the distance by the haversine formula (mean Earth radius 6,371 km), with towns across Malaysia.
   Istiwa' a'zam (the sun over the Kaaba) falls on 27-28 May and 15-16 July each year. Verified 14 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-14', kaaba: [21.4225, 39.8262], radius: 6371 };
  // [key, name, lat, lon]
  var PLACES = [
    ['kl', 'Kuala Lumpur', 3.1390, 101.6869], ['putrajaya', 'Putrajaya', 2.9264, 101.6964], ['shahalam', 'Shah Alam', 3.0733, 101.5185],
    ['jb', 'Johor Bahru', 1.4927, 103.7414], ['alorsetar', 'Alor Setar', 6.1248, 100.3678], ['kotabharu', 'Kota Bharu', 6.1254, 102.2381],
    ['melaka', 'Melaka', 2.1896, 102.2501], ['seremban', 'Seremban', 2.7258, 101.9424], ['kuantan', 'Kuantan', 3.8077, 103.3260],
    ['georgetown', 'George Town', 5.4141, 100.3288], ['ipoh', 'Ipoh', 4.5975, 101.0901], ['kangar', 'Kangar', 6.4414, 100.1986],
    ['kt', 'Kuala Terengganu', 5.3296, 103.1370], ['kk', 'Kota Kinabalu', 5.9804, 116.0735], ['sandakan', 'Sandakan', 5.8394, 118.1172],
    ['kuching', 'Kuching', 1.5535, 110.3593], ['miri', 'Miri', 4.3995, 113.9914], ['labuan', 'Labuan', 5.2831, 115.2308]
  ];
  var rad = Math.PI / 180;

  function bearing(lat, lon) {
    var p1 = lat * rad, p2 = FACTS.kaaba[0] * rad, dl = (FACTS.kaaba[1] - lon) * rad;
    var y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (Math.atan2(y, x) / rad + 360) % 360;
  }
  function distance(lat, lon) {
    var p1 = lat * rad, p2 = FACTS.kaaba[0] * rad, dp = p2 - p1, dl = (FACTS.kaaba[1] - lon) * rad;
    var a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * FACTS.radius * Math.asin(Math.sqrt(a));
  }
  // 16-point compass name for a bearing.
  var POINTS = { en: ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'],
    ms: ['U', 'UTL', 'TL', 'TTL', 'T', 'TMG', 'Tg', 'STg', 'S', 'SBD', 'BD', 'BBD', 'B', 'BBL', 'BL', 'UBL'] };
  var point = function (b, lang) { return POINTS[lang === 'ms' ? 'ms' : 'en'][Math.round(b / 22.5) % 16]; };
  // Degrees and minutes, e.g. 292° 31'.
  var dm = function (b) { var d = Math.floor(b), m = Math.round((b - d) * 60); if (m === 60) { d++; m = 0; } return d + '° ' + (m < 10 ? '0' : '') + m + '′'; };

  function calculate(input) {
    var place = null;
    for (var i = 0; i < PLACES.length; i++) if (PLACES[i][0] === input.place) place = PLACES[i];
    var lat = Number(input.lat), lon = Number(input.lon);
    if (place && input.place !== 'custom') { lat = place[2]; lon = place[3]; }
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    var b = bearing(lat, lon);
    return { lat: lat, lon: lon, bearing: b, fromWest: b - 270, dm: dm(b), km: distance(lat, lon), place: place && input.place !== 'custom' ? place[1] : null };
  }

  var api = { FACTS: FACTS, PLACES: PLACES, calculate: calculate, bearing: bearing, distance: distance, point: point, dm: dm };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBQibla = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
