/* Working days in Malaysia by state, 2026 and 2027: weekends (Friday and Saturday in Kedah, Kelantan and Terengganu;
   Saturday and Sunday elsewhere, Johor since 1 January 2025) and federal and state public holidays with replacement
   days, from the Cabinet's HKA 2026/2027 lists, state announcements and python-holidays 0.106. Islamic dates are
   subject to the official moon sighting. Verified 14 October 2026. */
(function (root) {
  'use strict';
  var STATES = [
    ['johor', 'Johor'], ['kedah', 'Kedah'], ['kelantan', 'Kelantan'], ['melaka', 'Melaka'], ['nsembilan', 'Negeri Sembilan'],
    ['pahang', 'Pahang'], ['penang', 'Pulau Pinang'], ['perak', 'Perak'], ['perlis', 'Perlis'], ['selangor', 'Selangor'],
    ['terengganu', 'Terengganu'], ['sabah', 'Sabah'], ['sarawak', 'Sarawak'], ['kl', 'Kuala Lumpur'], ['labuan', 'Labuan'], ['putrajaya', 'Putrajaya']
  ];
  // Holidays: names [BM, EN]; days[year] = [MMDD, name index, bitmask of STATES].
  var H = {"names":[["Tahun Baharu","New Year's Day"],["Hari Keputeraan Yang di-Pertuan Besar Negeri Sembilan","Birthday of the Sultan of Negeri Sembilan"],["Israk dan Mikraj","Israk and Mikraj"],["Cuti Israk dan Mikraj","Israk and Mikraj (observed)"],["Hari Thaipusam","Thaipusam"],["Hari Wilayah Persekutuan","Federal Territory Day"],["Cuti Hari Thaipusam","Thaipusam (observed)"],["Cuti Hari Wilayah Persekutuan","Federal Territory Day (observed)"],["Tahun Baharu Cina","Chinese New Year"],["Tahun Baharu Cina (Hari Kedua)","Chinese New Year (Second Day)"],["Awal Ramadan","Beginning of Ramadan"],["Hari Pengisytiharan Tarikh Kemerdekaan","Declaration of Independence Day"],["Hari Ulang Tahun Pertabalan Sultan Terengganu","Anniversary of the Installation of the Sultan of Terengganu"],["Hari Nuzul Al-Quran","Nuzul Al-Quran Day"],["Cuti Hari Nuzul Al-Quran","Nuzul Al-Quran Day (observed)"],["Cuti Tambahan Hari Raya Aidilfitri (Kelantan)","Additional Hari Raya Aidilfitri holiday (Kelantan)"],["Cuti Tambahan Hari Raya Aidilfitri","Additional Hari Raya Aidilfitri holiday"],["Hari Raya Aidilfitri","Hari Raya Aidilfitri"],["Hari Raya Aidilfitri (Hari Kedua)","Hari Raya Aidilfitri (second day)"],["Cuti Hari Raya Aidilfitri","Hari Raya Aidilfitri (observed)"],["Cuti Hari Raya Aidilfitri (Hari Kedua)","Hari Raya Aidilfitri second day (observed)"],["Hari Keputeraan Sultan Johor","Birthday of the Sultan of Johor"],["Hari Raya Aidilfitri (Hari Ketiga)","Hari Raya Aidilfitri (third day)"],["Hari Jadi Yang di-Pertua Negeri Sabah","Birthday of the Governor of Sabah"],["Jumaat Agung","Good Friday"],["Hari Keputeraan Sultan Terengganu","Birthday of the Sultan of Terengganu"],["Hari Pekerja","Labour Day"],["Cuti Hari Pekerja","Labour Day (observed)"],["Hari Ulang Tahun Keputeraan Raja Perlis","Birthday of the Raja of Perlis"],["Cuti Hari Ulang Tahun Keputeraan Raja Perlis","Birthday of the Raja of Perlis (observed)"],["Hari Hol Sultan Pahang","Hol of the Sultan of Pahang"],["Hari Arafah","Day of Arafah"],["Hari Raya Aidiladha","Hari Raya Aidiladha"],["Hari Raya Aidiladha (Hari Kedua)","Hari Raya Aidiladha (second day)"],["Pesta Kaamatan","Pesta Kaamatan"],["Hari Wesak","Vesak Day"],["Hari Keputeraan Yang di-Pertuan Agong","Birthday of the Yang di-Pertuan Agong"],["Perayaan Hari Gawai Dayak","Dayak Festival Day"],["Cuti Hari Wesak","Vesak Day (observed)"],["Cuti Pesta Kaamatan","Pesta Kaamatan (observed)"],["Awal Muharam","Awal Muharram (Islamic New Year)"],["Hari Keputeraan Sultan Kedah","Birthday of the Sultan of Kedah"],["Hari Tapak Warisan Dunia George Town","George Town Heritage Day"],["Hari Jadi Yang di-Pertua Negeri Pulau Pinang","Birthday of the Governor of Penang"],["Hari Hol Almarhum Sultan Iskandar","Hol of the late Sultan Iskandar (Johor)"],["Hari Kemerdekaan Sarawak","Sarawak Independence Day"],["Hari Keputeraan Sultan Pahang","Birthday of the Sultan of Pahang"],["Hari Jadi Yang di-Pertua Negeri Melaka","Birthday of the Governor of Malacca"],["Maulidur Rasul","Maulidur Rasul (Prophet Muhammad's Birthday)"],["Hari Kebangsaan","National Day"],["Hari Malaysia","Malaysia Day"],["Hari Keputeraan Sultan Kelantan","Birthday of the Sultan of Kelantan"],["Hari Jadi Yang di-Pertua Negeri Sarawak","Birthday of the Governor of Sarawak"],["Hari Keputeraan Sultan Perak","Birthday of the Sultan of Perak"],["Hari Deepavali","Deepavali"],["Cuti Hari Deepavali","Deepavali (observed)"],["Hari Keputeraan Sultan Selangor","Birthday of the Sultan of Selangor"],["Malam Krismas","Christmas Eve"],["Hari Krismas","Christmas Day"],["Cuti Hari Krismas","Christmas Day (observed)"],["Cuti Tahun Baharu Cina","Chinese New Year (observed)"],["Cuti Tahun Baharu Cina (Hari Kedua)","Chinese New Year (Second Day) (observed)"],["Cuti Maulidur Rasul","Maulidur Rasul (observed)"]],"days":{"2026":[["0101",0,64248],["0114",1,16],["0117",2,1298],["0118",3,1024],["0201",4,41681],["0201",5,57344],["0202",6,41681],["0202",7,57344],["0217",8,65535],["0218",9,65535],["0219",10,3],["0220",11,8],["0304",12,1024],["0307",13,59364],["0308",14,1028],["0319",15,4],["0320",16,65535],["0321",17,65535],["0322",18,65535],["0323",19,1028],["0323",20,64496],["0323",21,1],["0323",22,8],["0324",20,9],["0330",23,2048],["0403",24,6144],["0426",25,1024],["0501",26,65535],["0503",27,2],["0517",28,256],["0518",29,256],["0522",30,32],["0526",31,1028],["0527",32,65535],["0528",33,1286],["0530",34,18432],["0531",35,65535],["0531",34,18432],["0601",36,65535],["0601",37,4096],["0602",38,60409],["0602",39,18432],["0602",37,4096],["0603",38,4096],["0617",40,65535],["0705",41,2],["0707",42,64],["0711",43,64],["0721",44,1],["0722",45,4096],["0731",46,32],["0824",47,8],["0825",48,65535],["0831",49,65535],["0916",50,65535],["0929",51,4],["0930",51,4],["1010",52,4096],["1106",53,128],["1108",54,61439],["1109",55,60409],["1211",56,512],["1224",57,2048],["1225",58,65535],["1227",59,2]],"2027":[["0101",0,64248],["0106",2,1298],["0114",1,16],["0122",4,41681],["0201",5,57344],["0206",8,65535],["0207",9,65535],["0208",10,3],["0208",60,1028],["0208",61,64504],["0209",61,1],["0220",11,8],["0224",13,59364],["0304",12,1024],["0310",17,65535],["0311",18,65535],["0312",22,8],["0323",21,1],["0326",24,6144],["0330",23,2048],["0426",25,1024],["0501",26,65535],["0502",27,1028],["0516",31,1028],["0517",32,65535],["0517",28,256],["0518",33,1286],["0520",35,65535],["0522",30,32],["0530",34,18432],["0531",34,18432],["0601",37,4096],["0602",37,4096],["0606",40,65535],["0607",36,65535],["0620",41,2],["0707",42,64],["0710",43,64],["0711",44,1],["0722",45,4096],["0730",46,32],["0815",48,65535],["0816",62,64505],["0824",47,8],["0831",49,65535],["0916",50,65535],["0929",51,4],["0930",51,4],["1009",52,4096],["1028",54,61439],["1105",53,128],["1211",56,512],["1224",57,2048],["1225",58,65535],["1226",59,4],["1226",2,1298],["1227",59,1024],["1227",3,272]]}};
  var FACTS = { verified: '2026-10-14', years: [2026, 2027], friSat: ['kedah', 'kelantan', 'terengganu'], johorSatSunFrom: '2025-01-01' };

  var name = function (s, lang) { var i = idx(s); return lang === 'en' && s === 'penang' ? 'Penang' : STATES[i][1]; };
  var DAY = 86400000;
  var idx = function (s) { for (var i = 0; i < STATES.length; i++) if (STATES[i][0] === s) return i; return 9; };
  var iso = function (t) { return new Date(t).toISOString().slice(0, 10); };
  var parse = function (s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? Date.UTC(+m[1], m[2] - 1, +m[3]) : NaN; };
  var weekendDays = function (state) { return FACTS.friSat.indexOf(state) >= 0 ? [5, 6] : [6, 0]; };

  // Holidays observed in a state and year: [{ date, ms, en }], one per date (several names joined).
  function holidays(state, year) {
    var bit = 1 << idx(state), list = [], by = {};
    (H.days[year] || []).forEach(function (r) {
      if (!(r[2] & bit)) return;
      var date = year + '-' + r[0].slice(0, 2) + '-' + r[0].slice(2), n = H.names[r[1]];
      if (by[date]) { by[date].ms += ' / ' + n[0]; by[date].en += ' / ' + n[1]; }
      else { by[date] = { date: date, ms: n[0], en: n[1] }; list.push(by[date]); }
    });
    return list;
  }

  function holidaySet(state, y1, y2) {
    var set = {};
    for (var y = y1; y <= y2; y++) holidays(state, y).forEach(function (h) { set[h.date] = h; });
    return set;
  }

  function covered(from, to) { return new Date(from).getUTCFullYear() >= FACTS.years[0] && new Date(to).getUTCFullYear() <= FACTS.years[FACTS.years.length - 1]; }

  // Count days between two dates inclusive.
  function count(input) {
    var state = input.state || 'selangor', a = parse(input.from), b = parse(input.to);
    if (isNaN(a) || isNaN(b)) return null;
    if (b < a) { var t = a; a = b; b = t; }
    var we = weekendDays(state), set = holidaySet(state, new Date(a).getUTCFullYear(), new Date(b).getUTCFullYear());
    var r = { state: state, from: iso(a), to: iso(b), days: 0, weekend: 0, holidays: 0, holidaysOnWeekend: 0, workdays: 0, list: [], covered: covered(a, b) };
    for (var d = a; d <= b; d += DAY) {
      var s = iso(d), w = we.indexOf(new Date(d).getUTCDay()) >= 0, h = set[s];
      r.days++;
      if (h) r.list.push({ date: s, ms: h.ms, en: h.en, weekend: w });
      if (w) { r.weekend++; if (h) r.holidaysOnWeekend++; }
      else if (h) r.holidays++;
      else r.workdays++;
    }
    var leave = Math.max(0, Math.floor(Number(input.leave) || 0));
    r.leave = Math.min(leave, r.workdays);
    r.afterLeave = r.workdays - r.leave;
    return r;
  }

  // The date n working days after start (start itself not counted); n = 0 returns the start.
  function addWorkdays(state, start, n) {
    var d = parse(start); n = Math.max(0, Math.floor(Number(n) || 0));
    if (isNaN(d)) return null;
    var we = weekendDays(state), y = new Date(d).getUTCFullYear(), set = holidaySet(state, y, y + 2), skipped = 0;
    while (n > 0) {
      d += DAY;
      var s = iso(d);
      if (we.indexOf(new Date(d).getUTCDay()) >= 0 || set[s]) { skipped++; continue; }
      n--;
    }
    return { date: iso(d), skipped: skipped, covered: covered(parse(start), d) };
  }

  // Working days per month in a year.
  function months(state, year) {
    var out = [];
    for (var m = 0; m < 12; m++) {
      var a = Date.UTC(year, m, 1), b = Date.UTC(year, m + 1, 0);
      out.push(count({ state: state, from: iso(a), to: iso(b) }));
    }
    return out;
  }

  var api = { FACTS: FACTS, STATES: STATES, name: name, holidays: holidays, count: count, addWorkdays: addWorkdays, months: months, weekendDays: weekendDays };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBWorkdays = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
