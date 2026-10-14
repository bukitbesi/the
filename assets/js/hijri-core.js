/* Hijri (Islamic) and Gregorian dates on Malaysia's official takwim. Month starts follow the MABIMS imkanur rukyah
   criteria JAKIM uses for the takwim: at sunset after the conjunction the moon must be at least 3° high with 6.4°
   elongation (from 1443H; before that 2° and 3°, or 8 hours' age), computed for Malaysia's western horizon by
   tools-src/hijri-gen.mjs. It reproduces every takwim date checked from 1443H (2022) to 1449H (2027). Ramadan, Syawal
   and Zulhijjah are still confirmed by moon sighting, so those can move by a day. Range 1400–1500H (1979–2077). */
(function (root) {
  'use strict';

  var FACTS = {
    verified: '2026-10-14', firstYear: 1400, lastYear: 1500,
    // Days since 1970-01-01 of 1 Muharram 1400 (21 November 1979).
    epoch: 3611,
    // Three hex digits per Hijri year: bit i set means month i+1 has 30 days, else 29.
    lengths: 'aa5a4b4978b72b6575d6ab52aa58ad15b2db9d55d2da5d4aa965569b53b2ba97526a554baa75569d55caba5b46a8d4ab95b2daad56aa59552b2574b797636cb595ca5532ab4db9ba374b69b52aa554baab55aad9ed2ea4d4aa9552eaad56ab55b4a69552ba574b69b656ad55d4aa554ad95d2dc6d96b2da5d2aa5a2b65b5b7476474a69552b95b2b65b5da9d92d25a534ab95bd5ab546a9'
  };

  var MONTHS = {
    ms: ['Muharam', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jamadilawal', 'Jamadilakhir', 'Rejab', 'Syaaban', 'Ramadan', 'Syawal', 'Zulkaedah', 'Zulhijah'],
    en: ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', 'Shaban', 'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah']
  };
  var GMONTHS = {
    ms: ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  };
  var DAYS = {
    ms: ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  };
  // Key dates of the year: [month, day, key]. Public holiday status differs by state; see the page.
  var EVENTS = [[1, 1, 'muharram'], [1, 10, 'asyura'], [3, 12, 'maulid'], [7, 27, 'israk'], [8, 15, 'nisfu'], [9, 1, 'ramadan'],
    [9, 17, 'nuzul'], [10, 1, 'syawal'], [12, 9, 'arafah'], [12, 10, 'adha']];
  var EVENT_NAMES = {
    ms: { muharram: 'Awal Muharam (Maal Hijrah)', asyura: 'Hari Asyura', maulid: 'Maulidur Rasul', israk: 'Israk dan Mikraj', nisfu: 'Nisfu Syaaban',
      ramadan: 'Awal Ramadan', nuzul: 'Nuzul al-Quran', syawal: 'Hari Raya Aidilfitri', arafah: 'Hari Arafah', adha: 'Hari Raya Aidiladha' },
    en: { muharram: 'Awal Muharram (Islamic New Year)', asyura: 'Day of Ashura', maulid: 'Maulidur Rasul (Prophet\'s Birthday)', israk: 'Isra and Miraj',
      nisfu: 'Nisfu Syaaban', ramadan: 'First day of Ramadan', nuzul: 'Nuzul al-Quran', syawal: 'Hari Raya Aidilfitri (Eid al-Fitr)', arafah: 'Day of Arafah',
      adha: 'Hari Raya Aidiladha (Eid al-Adha)' }
  };
  // Months whose start is announced after moon sighting (rukyah) by the Keeper of the Rulers' Seal.
  var SIGHTED = { 9: true, 10: true, 12: true };

  var starts = null;
  // Start day (days since 1970) of every month from 1 Muharram 1400, plus one sentinel after the last month.
  function table() {
    if (starts) return starts;
    starts = [FACTS.epoch];
    for (var y = 0; y <= FACTS.lastYear - FACTS.firstYear; y++) {
      var bits = parseInt(FACTS.lengths.substr(y * 3, 3), 16);
      for (var m = 0; m < 12; m++) starts.push(starts[starts.length - 1] + ((bits >> m) & 1 ? 30 : 29));
    }
    return starts;
  }

  var DAY = 86400000;
  function dayNumber(iso) {
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
    if (!p) return NaN;
    var t = Date.UTC(+p[1], +p[2] - 1, +p[3]), d = new Date(t);
    if (d.getUTCMonth() !== +p[2] - 1 || d.getUTCDate() !== +p[3]) return NaN;
    return Math.round(t / DAY);
  }
  function isoDate(n) { return new Date(n * DAY).toISOString().slice(0, 10); }
  function addDays(iso, n) { var d = dayNumber(iso); return isNaN(d) ? null : isoDate(d + n); }
  function daysBetween(a, b) { return dayNumber(b) - dayNumber(a); }
  function range() { var s = table(); return { first: isoDate(s[0]), last: isoDate(s[s.length - 1] - 1) }; }
  function monthIndex(y, m) { return (y - FACTS.firstYear) * 12 + (m - 1); }

  function monthLength(y, m) {
    var i = monthIndex(y, m), s = table();
    return m >= 1 && m <= 12 && i >= 0 && i < s.length - 1 ? s[i + 1] - s[i] : 0;
  }

  // Gregorian ISO date -> { y, m, d, length } or null outside the table.
  function toHijri(iso) {
    var n = dayNumber(iso), s = table();
    if (isNaN(n) || n < s[0] || n >= s[s.length - 1]) return null;
    var lo = 0, hi = s.length - 2;
    while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (s[mid] <= n) lo = mid; else hi = mid - 1; }
    return { y: FACTS.firstYear + Math.floor(lo / 12), m: lo % 12 + 1, d: n - s[lo] + 1, length: s[lo + 1] - s[lo] };
  }

  // Hijri date -> Gregorian ISO date, or null when the date does not exist on the takwim.
  function toGregorian(y, m, d) {
    y = Math.floor(Number(y)); m = Math.floor(Number(m)); d = Math.floor(Number(d));
    var len = monthLength(y, m);
    if (!len || !(d >= 1 && d <= len)) return null;
    return isoDate(table()[monthIndex(y, m)] + d - 1);
  }

  // Same day-of-month n Hijri months later (clamped to the month's last day), as an ISO date.
  function addMonths(iso, n) {
    var h = toHijri(iso);
    if (!h) return null;
    var i = monthIndex(h.y, h.m) + n, y = FACTS.firstYear + Math.floor(i / 12), m = i % 12 + 1;
    var len = monthLength(y, m);
    return len ? toGregorian(y, m, Math.min(h.d, len)) : null;
  }

  function weekday(iso) { return new Date(dayNumber(iso) * DAY).getUTCDay(); }
  function lang(l) { return l === 'en' ? 'en' : 'ms'; }
  function formatHijri(h, l) { return h ? h.d + ' ' + MONTHS[lang(l)][h.m - 1] + ' ' + h.y + (lang(l) === 'en' ? ' AH' : 'H') : ''; }
  function formatGregorian(iso, l, withDay) {
    var p = String(iso).split('-'), L = lang(l);
    return (withDay ? DAYS[L][weekday(iso)] + ', ' : '') + (+p[2]) + ' ' + GMONTHS[L][+p[1] - 1] + ' ' + p[0];
  }

  // Key dates for a Hijri year, in order.
  function events(y) {
    return EVENTS.map(function (e) {
      return { key: e[2], m: e[0], d: e[1], date: toGregorian(y, e[0], e[1]), sighted: !!SIGHTED[e[0]] };
    }).filter(function (e) { return e.date; });
  }
  // The next n key dates on or after an ISO date.
  function upcoming(iso, n) {
    var h = toHijri(iso), out = [];
    if (!h) return out;
    for (var y = h.y; y <= FACTS.lastYear && out.length < n; y++) {
      events(y).forEach(function (e) { if (e.date >= iso && out.length < n) out.push(Object.assign({ y: y }, e)); });
    }
    return out;
  }
  // The 12 months of a Hijri year with their first and last Gregorian days.
  function yearTable(y) {
    var out = [];
    for (var m = 1; m <= 12; m++) {
      var len = monthLength(y, m);
      if (len) out.push({ m: m, length: len, start: toGregorian(y, m, 1), end: toGregorian(y, m, len) });
    }
    return out;
  }

  var api = { FACTS: FACTS, MONTHS: MONTHS, GMONTHS: GMONTHS, DAYS: DAYS, EVENT_NAMES: EVENT_NAMES, SIGHTED: SIGHTED,
    toHijri: toHijri, toGregorian: toGregorian, addMonths: addMonths, addDays: addDays, daysBetween: daysBetween, monthLength: monthLength,
    weekday: weekday, formatHijri: formatHijri, formatGregorian: formatGregorian, events: events, upcoming: upcoming, yearTable: yearTable,
    range: range, dayNumber: dayNumber };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBHijri = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
