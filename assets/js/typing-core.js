/* Typing speed test (ujian menaip) maths and texts, English and Bahasa Melayu. A "word" is 5 characters including
   spaces, the standard used by typing tests and examiners. Gross WPM = characters typed ÷ 5 ÷ minutes; net WPM =
   gross WPM − uncorrected errors ÷ minutes; accuracy = correct keystrokes ÷ all keystrokes. Texts are original. */
(function (root) {
  'use strict';
  // Benchmarks: Dhakal et al., CHI 2018 (168,960 people, desktop keyboards); Palin et al., MobileHCI 2019 (37,370 people,
  // phones); JPA service exam for Pembantu Setiausaha Pejabat N1 (type a transcript at 20 words a minute, at most 4% errors).
  var FACTS = { verified: '2026-10-25', wordChars: 5, durations: [15, 30, 60, 120],
    desktopAvg: 51.56, desktopErr: 1.167, mobileAvg: 36.2, mobileErr: 2.3, jpaN1: { wpm: 20, maxErr: 4 }, jpaN5: { wpm: 20, maxErr: 4 } };

  // Common words, roughly by frequency; used for the "common words" mode.
  var WORDS = {
    en: ('the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or ' +
      'an will my one all would there their what so up out if about who get which go me when make can like time no just him ' +
      'know take people into year your good some could them see other than then now look only come its over think also back ' +
      'after use two how our work first well way even new want because any these give day most us is was are been has had ' +
      'were said did made find here thing many where right still life long great little world own old same tell need feel ' +
      'high last home hand part place small number off always next keep under name house close start city earth few line ' +
      'school food water money family friend week every help talk turn move live play run read write learn open walk light ' +
      'early late fast slow happy simple clear ready plan idea story price phone market rain sun river road car bus train').split(' '),
    ms: ('yang dan di itu dengan untuk tidak ini dari dalam akan pada juga saya ke kita ada mereka boleh oleh telah lebih ' +
      'sudah kami baru satu orang tahun hari banyak besar kerana masa atau semua jika sangat hanya setiap kepada bagi antara ' +
      'dapat perlu buat kerja rumah negara anak air makan minum pergi datang lihat tahu mahu cuba baik sama lain dua tiga ' +
      'kecil baru lama jauh dekat cepat lambat pagi petang malam esok semalam kawan keluarga sekolah kedai jalan kereta bas ' +
      'kereta api bandar kampung hujan panas sejuk harga wang beli jual bayar simpan pasar ikan ayam nasi roti kopi teh gula ' +
      'garam buku baca tulis belajar guru murid kelas soalan jawapan masalah cara mudah susah betul salah faham fikir rasa ' +
      'suka gembira sihat sakit tidur bangun mandi pakai baju kasut tangan kaki mata kepala hati jiwa kuat lemah terang gelap').split(' ')
  };
  WORDS.ms = WORDS.ms.filter(function (w) { return w !== 'api'; });

  // Original short passages (everyday Malaysian topics), used for the "sentences" mode.
  var PASSAGES = {
    en: [
      'The morning rain stopped just before seven, so the road to the market was busy again. Stalls opened one by one, and the smell of fresh roti canai filled the air.',
      'Saving a little money every month is easier when you decide the amount first and spend what is left. Small habits, repeated for years, build real security.',
      'Our school library opens at eight and closes at five. Students can borrow three books for two weeks, and the quiet corner is perfect for revision before exams.',
      'The train was late by ten minutes, but nobody complained. A family shared their kuih with the passengers nearby, and the wait felt shorter than it was.',
      'Good typing is about rhythm, not rushing. Keep your fingers on the home row, look at the screen instead of the keyboard, and let accuracy come before speed.',
      'Fuel prices, road tax and parking all add up. Before buying a car, list every monthly cost and compare it with taking the bus or sharing a ride with friends.',
      'The river behind the village is clean again after years of hard work. Children swim there on weekends, and the old fishermen say the fish have returned.',
      'A short walk after dinner helps you sleep better. Leave your phone at home, breathe slowly, and notice the sounds of the evening around your street.'
    ],
    ms: [
      'Hujan pagi berhenti sebelum pukul tujuh, jadi jalan ke pasar kembali sibuk. Gerai dibuka satu demi satu, dan bau roti canai segar memenuhi udara.',
      'Menyimpan sedikit wang setiap bulan lebih mudah jika anda menetapkan jumlahnya dahulu dan berbelanja dengan baki. Tabiat kecil yang diulang bertahun lamanya membina keselamatan sebenar.',
      'Perpustakaan sekolah kami dibuka pada pukul lapan dan ditutup pada pukul lima. Murid boleh meminjam tiga buah buku selama dua minggu untuk ulang kaji sebelum peperiksaan.',
      'Kereta api lewat sepuluh minit, tetapi tiada sesiapa yang merungut. Sebuah keluarga berkongsi kuih dengan penumpang berdekatan, dan masa menunggu terasa lebih singkat.',
      'Menaip dengan baik bergantung kepada rentak, bukan tergesa-gesa. Letakkan jari pada baris asas, pandang skrin dan bukan papan kekunci, serta utamakan ketepatan sebelum kelajuan.',
      'Harga minyak, cukai jalan dan bayaran letak kereta semuanya bertambah. Sebelum membeli kereta, senaraikan setiap kos bulanan dan bandingkan dengan menaiki bas.',
      'Sungai di belakang kampung kembali bersih selepas bertahun-tahun usaha gigih. Kanak-kanak berenang di situ pada hujung minggu, dan nelayan tua berkata ikan sudah kembali.',
      'Berjalan sebentar selepas makan malam membantu anda tidur dengan lebih nyenyak. Tinggalkan telefon di rumah, bernafas perlahan dan dengar bunyi petang di sekeliling.'
    ]
  };

  // Small seeded generator so a given seed always gives the same text (build-time render, shared links).
  function rng(seed) {
    var s = (seed >>> 0) || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  // Test text: mode 'words' (common words), 'sentences' (passages) or 'numbers' (words with numbers mixed in).
  // Long enough for the fastest typists: about 220 WPM for the chosen duration, plus a margin.
  function generate(o) {
    o = o || {};
    var lang = o.lang === 'ms' ? 'ms' : 'en', mode = o.mode || 'words', secs = Number(o.secs) || 60, r = rng(o.seed || 1);
    var need = Math.max(300, Math.ceil(220 * 5 * secs / 60)), out = '';
    if (mode === 'sentences') {
      var order = PASSAGES[lang].map(function (p, i) { return [r(), i]; }).sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; });
      for (var k = 0; out.length < need; k++) out += (out ? ' ' : '') + PASSAGES[lang][order[k % order.length]];
      return out;
    }
    var list = WORDS[lang], words = [], prev = '';
    while (words.join(' ').length < need) {
      var w = list[Math.floor(r() * list.length)];
      if (w === prev) continue;
      if (mode === 'numbers' && r() < 0.18) w = String(Math.floor(r() * (r() < 0.5 ? 100 : 10000)));
      words.push(w); prev = w;
    }
    return words.join(' ');
  }

  // Compares what was typed with the target. Returns per-character states and the scores.
  // keystrokes / mistakes: every key pressed and every wrong key pressed (including ones later corrected).
  function score(o) {
    var target = String(o.target || ''), typed = String(o.typed || ''), ms = Math.max(1, Number(o.ms) || 0), min = ms / 60000;
    var correct = 0, errors = 0, n = Math.min(typed.length, target.length);
    for (var i = 0; i < n; i++) { if (typed[i] === target[i]) correct++; else errors++; }
    errors += Math.max(0, typed.length - target.length);
    var gross = typed.length / FACTS.wordChars / min, net = Math.max(0, gross - errors / min);
    var keys = Number(o.keystrokes) || typed.length, wrong = Number(o.mistakes);
    if (!isFinite(wrong)) wrong = errors;
    return {
      chars: typed.length, correct: correct, errors: errors, seconds: ms / 1000,
      gross: gross, net: net, cpm: correct / min,
      accuracy: keys ? Math.max(0, (keys - wrong) / keys) : 1
    };
  }

  // Rough guide bands for net WPM (no official scale exists).
  var BANDS = [[0, 'beginner'], [25, 'learning'], [40, 'average'], [60, 'fast'], [80, 'very fast'], [100, 'expert']];
  function band(net) { var b = BANDS[0][1]; BANDS.forEach(function (x) { if (net >= x[0]) b = x[1]; }); return b; }

  // Keys most often mistyped: expected character → count, top n.
  function weakKeys(misses, n) {
    return Object.keys(misses || {}).map(function (k) { return [k, misses[k]]; }).sort(function (a, b) { return b[1] - a[1] || (a[0] < b[0] ? -1 : 1); }).slice(0, n || 5);
  }

  var api = { FACTS: FACTS, WORDS: WORDS, PASSAGES: PASSAGES, rng: rng, generate: generate, score: score, BANDS: BANDS, band: band, weakKeys: weakKeys };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBTyping = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
