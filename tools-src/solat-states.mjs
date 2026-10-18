// Waktu solat by state: one BM and one English page per state or federal territory, generated from JAKIM's zones.
// Each page carries its own data (the state's zones, today's times in each, the month for its main zone and the year's
// earliest and latest Subuh and Maghrib), and uses the same calculator script as /waktu-solat/.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../assets/js/solat-core.js');
const H = require('../assets/js/hijri-core.js');

// [bm slug, en slug, BM name, English name, zones (prefix or codes), main zone, main town, short name for titles]
const STATES = [
  ['johor', 'johor', 'Johor', 'Johor', 'JHR', 'JHR02', 'Johor Bahru'],
  ['kedah', 'kedah', 'Kedah', 'Kedah', 'KDH', 'KDH01', 'Alor Setar'],
  ['kelantan', 'kelantan', 'Kelantan', 'Kelantan', 'KTN', 'KTN01', 'Kota Bharu'],
  ['kuala-lumpur', 'kuala-lumpur', ['Kuala Lumpur dan Putrajaya', 'Kuala Lumpur'], ['Kuala Lumpur and Putrajaya', 'Kuala Lumpur'], ['WLY01'], 'WLY01', 'Kuala Lumpur'],
  ['labuan', 'labuan', 'Labuan', 'Labuan', ['WLY02'], 'WLY02', 'Labuan'],
  ['melaka', 'melaka', 'Melaka', 'Melaka', 'MLK', 'MLK01', 'Melaka'],
  ['negeri-sembilan', 'negeri-sembilan', 'Negeri Sembilan', 'Negeri Sembilan', 'NGS', 'NGS03', 'Seremban'],
  ['pahang', 'pahang', 'Pahang', 'Pahang', 'PHG', 'PHG02', 'Kuantan'],
  ['perak', 'perak', 'Perak', 'Perak', 'PRK', 'PRK02', 'Ipoh'],
  ['perlis', 'perlis', 'Perlis', 'Perlis', 'PLS', 'PLS01', 'Kangar'],
  ['pulau-pinang', 'penang', 'Pulau Pinang', 'Penang', 'PNG', 'PNG01', 'George Town'],
  ['sabah', 'sabah', 'Sabah', 'Sabah', 'SBH', 'SBH07', 'Kota Kinabalu'],
  ['sarawak', 'sarawak', 'Sarawak', 'Sarawak', 'SWK', 'SWK08', 'Kuching'],
  ['selangor', 'selangor', 'Selangor', 'Selangor', 'SGR', 'SGR01', 'Shah Alam'],
  ['terengganu', 'terengganu', 'Terengganu', 'Terengganu', 'TRG', 'TRG01', 'Kuala Terengganu']
].map(([bm, en, nameMs, nameEn, zones, main, town]) => {
  const pick = n => Array.isArray(n) ? n : [n, n];
  return {
    bm: '/waktu-solat-' + bm + '/', en: '/prayer-times-' + en + '/', main, town,
    name: { ms: pick(nameMs)[0], en: pick(nameEn)[0] }, short: { ms: pick(nameMs)[1], en: pick(nameEn)[1] },
    zones: Array.isArray(zones) ? zones : S.ZONES.filter(z => z[0].startsWith(zones)).map(z => z[0])
  };
});
export const solatStates = STATES;

const TEXT = {
  ms: st => ({
    title: `Waktu Solat ${st.short.ms} Hari Ini: Jadual Waktu Solat JAKIM`,
    description: `Waktu solat ${st.name.ms} hari ini bagi ${st.zones.length > 1 ? st.zones.length + ' zon' : 'zon'} JAKIM: Subuh, Zohor, Asar, Maghrib dan Isyak, kiraan detik ke waktu seterusnya dan jadual bulanan.`,
    crumbs: [['Alat', '/'], ['Waktu Solat', '/waktu-solat/'], [st.name.ms, null]],
    app: `Waktu Solat ${st.name.ms}`,
    features: ['Waktu solat setiap zon JAKIM ' + st.name.ms, 'Kiraan detik ke waktu solat seterusnya', 'Imsak, syuruk dan dhuha', 'Jadual bulanan untuk dicetak', 'Mengingati zon anda', 'Berfungsi luar talian selepas dipasang'],
    about: ['Waktu solat', st.name.ms, 'JAKIM'],
    citations: [['JAKIM e-Solat: waktu solat rasmi mengikut zon', 'https://www.e-solat.gov.my/'], ['Projek Waktu Solat: data waktu solat dan zon JAKIM', 'https://waktusolat.app/']],
    faq: [
      [`Pukul berapa waktu solat ${st.name.ms} hari ini?`, `Pada {{T_DAY}}, waktu solat zon {{T_MAIN}} ({{T_MAIN_AREAS}}) ialah: {{T_LIST}}. Imsak pukul {{T_IMSAK}} dan syuruk pukul {{T_SYURUK}}.`],
      [`Berapa zon waktu solat di ${st.name.ms}?`, '{{T_ZONES_TEXT}}'],
      [`Pukul berapa waktu berbuka puasa (Maghrib) di ${st.name.ms} hari ini?`, 'Pada {{T_DAY}}: {{T_MAGHRIBS}}. Waktu berbuka puasa ialah waktu Maghrib zon anda.'],
      [`Zon waktu solat mana untuk ${st.town}?`, `${st.town} dalam zon {{T_MAIN}}, yang meliputi {{T_MAIN_AREAS}}. Pilih zon lain dalam senarai jika anda berada di luar kawasan itu.`],
      [`Bilakah Subuh paling awal dan paling lewat di ${st.town} pada {{T_YEAR}}?`, 'Dalam jadual JAKIM {{T_YEAR}} bagi zon {{T_MAIN}}, Subuh paling awal pukul {{T_SUBUH_MIN}} ({{T_SUBUH_MIN_D}}) dan paling lewat pukul {{T_SUBUH_MAX}} ({{T_SUBUH_MAX_D}}). Maghrib paling awal pukul {{T_MAG_MIN}} ({{T_MAG_MIN_D}}) dan paling lewat pukul {{T_MAG_MAX}} ({{T_MAG_MAX_D}}).'],
      [`Pukul berapa imsak di ${st.name.ms}?`, '{{T_IMSAK_TEXT}}'],
      ['Dari mana waktu solat ini diambil?', 'Daripada jadual rasmi e-Solat JAKIM bagi setiap zon, disemak dengan salinan data JAKIM di waktusolat.app. Waktu dikemas kini setiap hari, dan jadual tahun hadapan ditambah apabila JAKIM menerbitkannya.']
    ]
  }),
  en: st => ({
    title: `Prayer Times ${st.short.en} Today: JAKIM Waktu Solat Timetable`,
    description: `Today's prayer times in ${st.name.en} for ${st.zones.length > 1 ? 'all ' + st.zones.length + ' JAKIM zones' : 'JAKIM zone ' + st.main}: Subuh, Zohor, Asar, Maghrib and Isyak, a countdown and the monthly timetable.`,
    crumbs: [['Tools', '/'], ['Prayer Times', '/prayer-times-malaysia/'], [st.name.en, null]],
    app: `Prayer Times ${st.name.en}`,
    features: ['Times for every JAKIM zone in ' + st.name.en, 'Live countdown to the next prayer', 'Imsak, syuruk and dhuha', 'Monthly timetable to print', 'Remembers your zone', 'Works offline once installed'],
    about: ['Prayer times', st.name.en, 'JAKIM'],
    citations: [['JAKIM e-Solat: official prayer times by zone', 'https://www.e-solat.gov.my/'], ['Waktu Solat Project: JAKIM prayer time data and zones', 'https://waktusolat.app/']],
    faq: [
      [`What are the prayer times in ${st.name.en} today?`, 'On {{T_DAY}}, zone {{T_MAIN}} ({{T_MAIN_AREAS}}) prays at: {{T_LIST}}. Imsak is {{T_IMSAK}} and syuruk (sunrise) {{T_SYURUK}}.'],
      [`How many prayer time zones does ${st.name.en} have?`, '{{T_ZONES_TEXT}}'],
      [`What time is Maghrib (iftar) in ${st.name.en} today?`, 'On {{T_DAY}}: {{T_MAGHRIBS}}. The fast is broken at Maghrib in your zone.'],
      [`Which prayer time zone is ${st.town} in?`, `${st.town} is in zone {{T_MAIN}}, which covers {{T_MAIN_AREAS}}. Choose another zone from the list if you are outside that area.`],
      [`When are the earliest and latest Subuh in ${st.town} in {{T_YEAR}}?`, "In JAKIM's {{T_YEAR}} timetable for zone {{T_MAIN}}, the earliest Subuh is {{T_SUBUH_MIN}} ({{T_SUBUH_MIN_D}}) and the latest {{T_SUBUH_MAX}} ({{T_SUBUH_MAX_D}}). The earliest Maghrib is {{T_MAG_MIN}} ({{T_MAG_MIN_D}}) and the latest {{T_MAG_MAX}} ({{T_MAG_MAX_D}})."],
      [`What time is imsak in ${st.name.en}?`, '{{T_IMSAK_TEXT}}'],
      ['Where do these prayer times come from?', "From JAKIM's official e-Solat timetable for each zone, checked against the waktusolat.app copy of JAKIM's data. Times update daily, and next year's timetable is added as soon as JAKIM publishes it."]
    ]
  })
};

const BODY = {
  ms: st => `<div class="page">
<div class="container">
  <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Alat</a></li><li><a href="/waktu-solat/">Waktu solat</a></li><li aria-current="page">${st.name.ms}</li></ol></nav>
  <h1>Waktu Solat ${st.name.ms} Hari Ini</h1>
  <p class="answer">Waktu solat ${st.town} hari ini, <time datetime="{{T_DAY_ISO}}">{{T_DAY}}</time>: <strong>{{T_LIST}}</strong> (zon JAKIM {{T_MAIN}}). {{T_ZONES_LEAD}}</p>
  <p class="meta"><span>Waktu JAKIM, disemak <time datetime="{{S_VERIFIED_ISO}}">{{S_VERIFIED}}</time></span><span>Zon anda kekal dalam peranti</span><a href="${st.en}" hreflang="en" lang="en">Read in English</a></p>
{{T_CALC}}
</div>
{{AD_TOP}}
<div class="container prose">
  <h2 id="zones-h">Waktu solat hari ini di setiap zon ${st.name.ms}</h2>
  <div class="table-wrap" tabindex="0" role="region" aria-labelledby="zones-h">
    <table class="data">
      <thead><tr><th scope="col">Zon</th><th scope="col">Imsak</th><th scope="col">Subuh</th><th scope="col">Syuruk</th><th scope="col">Zohor</th><th scope="col">Asar</th><th scope="col">Maghrib</th><th scope="col">Isyak</th></tr></thead>
      <tbody>
{{T_TABLE}}
      </tbody>
    </table>
  </div>
{{T_MONTH}}
  <h2 id="facts">Fakta waktu solat ${st.town} {{T_YEAR}}</h2>
  <ul>
    <li><strong>Subuh paling awal:</strong> {{T_SUBUH_MIN}} pada {{T_SUBUH_MIN_D}}; <strong>paling lewat:</strong> {{T_SUBUH_MAX}} pada {{T_SUBUH_MAX_D}}.</li>
    <li><strong>Maghrib paling awal:</strong> {{T_MAG_MIN}} pada {{T_MAG_MIN_D}}; <strong>paling lewat:</strong> {{T_MAG_MAX}} pada {{T_MAG_MAX_D}}.</li>
    <li><strong>Imsak:</strong> {{T_IMSAK_TEXT}}</li>
{{T_SPREAD}}
  </ul>
</div>
{{AD_MIDDLE}}
<div class="container prose">
  <h2 id="zone-list">Zon JAKIM di ${st.name.ms}</h2>
  <ul>
{{T_ZONE_LIST}}
  </ul>
  <h2 id="states">Waktu solat negeri lain</h2>
  <div class="related">
{{T_OTHERS}}
  </div>
  <h2 id="sources">Sumber</h2>
  <ul>
    <li><a href="https://www.e-solat.gov.my/" rel="noopener">JAKIM e-Solat: waktu solat rasmi mengikut zon</a></li>
    <li><a href="https://waktusolat.app/" rel="noopener">Projek Waktu Solat: data waktu solat dan zon JAKIM</a></li>
  </ul>
  <div class="callout"><p><strong>Nota:</strong> Waktu mengikut jadual rasmi JAKIM bagi setiap zon. Masjid mungkin melaungkan azan seminit dua kemudian. Untuk semua 60 zon di Malaysia, lihat <a href="/waktu-solat/">waktu solat hari ini</a>.</p></div>
</div>

<section class="container faq-wrap prose" id="faq" aria-labelledby="faq-h">
  <h2 id="faq-h">Soalan lazim</h2>
  <div class="faq">
{{FAQ_HTML}}
  </div>
</section>
{{AD_BOTTOM}}
<section class="container prose" aria-labelledby="related-h">
  <h2 id="related-h">Alat berkaitan</h2>
  <div class="related">
    <a href="/waktu-solat/">Waktu Solat Malaysia<small>Semua 60 zon JAKIM</small></a>
    <a href="/arah-kiblat/">Arah Kiblat<small>Darjah kiblat lokasi anda</small></a>
    <a href="/tukar-tarikh-hijrah/">Tukar Tarikh Hijrah<small>Takwim Islam Malaysia</small></a>
  </div>
</section>
`,
  en: st => `<div class="page">
<div class="container">
  <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Tools</a></li><li><a href="/prayer-times-malaysia/">Prayer times</a></li><li aria-current="page">${st.name.en}</li></ol></nav>
  <h1>Prayer Times ${st.name.en} Today</h1>
  <p class="answer">Prayer times in ${st.town} today, <time datetime="{{T_DAY_ISO}}">{{T_DAY}}</time>: <strong>{{T_LIST}}</strong> (JAKIM zone {{T_MAIN}}). {{T_ZONES_LEAD}}</p>
  <p class="meta"><span>JAKIM times, checked <time datetime="{{S_VERIFIED_ISO}}">{{S_VERIFIED}}</time></span><span>Your zone stays on your device</span><a href="${st.bm}" hreflang="ms" lang="ms">Baca dalam Bahasa Melayu</a></p>
{{T_CALC}}
</div>
{{AD_TOP}}
<div class="container prose">
  <h2 id="zones-h">Prayer times today in every ${st.name.en} zone</h2>
  <div class="table-wrap" tabindex="0" role="region" aria-labelledby="zones-h">
    <table class="data">
      <thead><tr><th scope="col">Zone</th><th scope="col">Imsak</th><th scope="col">Subuh</th><th scope="col">Syuruk</th><th scope="col">Zohor</th><th scope="col">Asar</th><th scope="col">Maghrib</th><th scope="col">Isyak</th></tr></thead>
      <tbody>
{{T_TABLE}}
      </tbody>
    </table>
  </div>
{{T_MONTH}}
  <h2 id="facts">${st.town} prayer time facts for {{T_YEAR}}</h2>
  <ul>
    <li><strong>Earliest Subuh:</strong> {{T_SUBUH_MIN}} on {{T_SUBUH_MIN_D}}; <strong>latest:</strong> {{T_SUBUH_MAX}} on {{T_SUBUH_MAX_D}}.</li>
    <li><strong>Earliest Maghrib:</strong> {{T_MAG_MIN}} on {{T_MAG_MIN_D}}; <strong>latest:</strong> {{T_MAG_MAX}} on {{T_MAG_MAX_D}}.</li>
    <li><strong>Imsak:</strong> {{T_IMSAK_TEXT}}</li>
{{T_SPREAD}}
  </ul>
</div>
{{AD_MIDDLE}}
<div class="container prose">
  <h2 id="zone-list">JAKIM zones in ${st.name.en}</h2>
  <ul>
{{T_ZONE_LIST}}
  </ul>
  <h2 id="states">Prayer times in other states</h2>
  <div class="related">
{{T_OTHERS}}
  </div>
  <h2 id="sources">Sources</h2>
  <ul>
    <li><a href="https://www.e-solat.gov.my/" rel="noopener">JAKIM e-Solat: official prayer times by zone</a></li>
    <li><a href="https://waktusolat.app/" rel="noopener">Waktu Solat Project: JAKIM prayer time data and zones</a></li>
  </ul>
  <div class="callout"><p><strong>Note:</strong> Times follow JAKIM's official timetable for each zone. Mosques may call the azan a minute or two later. For all 60 zones in Malaysia, see <a href="/prayer-times-malaysia/">prayer times Malaysia today</a>.</p></div>
</div>

<section class="container faq-wrap prose" id="faq" aria-labelledby="faq-h">
  <h2 id="faq-h">Frequently asked questions</h2>
  <div class="faq">
{{FAQ_HTML}}
  </div>
</section>
{{AD_BOTTOM}}
<section class="container prose" aria-labelledby="related-h">
  <h2 id="related-h">Related tools</h2>
  <div class="related">
    <a href="/prayer-times-malaysia/">Prayer Times Malaysia<small>All 60 JAKIM zones</small></a>
    <a href="/qibla-direction-malaysia/">Qibla Direction<small>Qibla bearing for your location</small></a>
    <a href="/hijri-date-converter/">Hijri Date Converter<small>Islamic dates on Malaysia's calendar</small></a>
  </div>
</section>
`
};

// Page records in the same shape as tools-src/pages/*.html front matter.
export function statePages(datePublished, day) {
  return STATES.flatMap(st => ['ms', 'en'].map(lang => {
    const t = TEXT[lang](st), other = lang === 'ms' ? 'en' : 'ms';
    return {
      file: `(generated) solat-states.mjs ${st.bm}`, path: lang === 'ms' ? st.bm : st.en, lang,
      alternates: { [other]: lang === 'ms' ? st.en : st.bm }, title: t.title, description: t.description,
      datePublished, dateModified: day, render: 'solatState', solatState: st, scripts: ['/assets/js/solat.js'],
      breadcrumb: t.crumbs, about: t.about, citations: t.citations,
      app: { name: t.app, category: 'LifestyleApplication', features: t.features },
      faq: t.faq.map(([q, a]) => ({ q, a })), body: BODY[lang](st)
    };
  }));
}

// Placeholder values for one state page. `times(zone, iso)` reads JAKIM's year files; `calc` renders the calculator.
export function stateMap(lang, p, { day, times, year, esc, calc, longDate }) {
  const st = p.solatState, L = lang === 'ms', h24 = L, tm = m => S.time(m, h24), five = S.PRAYERS;
  const areas = z => S.zone(z).areas, main = st.main, t = times(main, day);
  const list = x => five.map(i => `${S.name(i, lang).split(' (')[0]} ${tm(x[i])}`).join(', ');
  const d = iso => H.formatGregorian(iso, lang);
  const yearDays = year.t.map((x, i) => [S.addDays(year.year + '-01-01', i), x]);
  const ext = (i, f) => yearDays.reduce((a, b) => (f(b[1][i], a[1][i]) ? b : a));
  const sMin = ext(1, (a, b) => a < b), sMax = ext(1, (a, b) => a > b), mMin = ext(6, (a, b) => a < b), mMax = ext(6, (a, b) => a > b);
  const n = st.zones.length;
  const zonesText = n === 1
    ? (L ? `Satu zon, ${main}, meliputi ${areas(main)}.` : `One zone, ${main}, covering ${areas(main)}.`)
    : (L ? `${n} zon JAKIM: ` : `${n} JAKIM zones: `) + st.zones.map(z => `${z} (${areas(z)})`).join('; ') + '.';
  const mags = st.zones.map(z => [z, times(z, day)[6]]);
  const magSorted = mags.slice().sort((a, b) => a[1] - b[1]);
  const spread = n > 1 && magSorted[n - 1][1] > magSorted[0][1]
    ? `    <li>${L ? `<strong>Beza antara zon hari ini:</strong> Maghrib paling awal di ${magSorted[0][0]} (${tm(magSorted[0][1])}) dan paling lewat di ${magSorted[n - 1][0]} (${tm(magSorted[n - 1][1])}), beza ${S.duration(magSorted[n - 1][1] - magSorted[0][1], lang)}.`
      : `<strong>Difference between zones today:</strong> the earliest Maghrib is in ${magSorted[0][0]} (${tm(magSorted[0][1])}) and the latest in ${magSorted[n - 1][0]} (${tm(magSorted[n - 1][1])}), ${S.duration(magSorted[n - 1][1] - magSorted[0][1], lang)} apart.`}</li>`
    : '';
  const perlis = st.zones.every(z => times(z, day)[0] === times(z, day)[1]);
  const imsakText = perlis
    ? (L ? `Jadual JAKIM bagi Perlis menetapkan imsak pada minit yang sama dengan Subuh (hari ini ${tm(t[1])}), tidak 10 minit lebih awal seperti zon lain.` : `JAKIM's timetable for Perlis sets imsak at the same minute as Subuh (today ${tm(t[1])}), not 10 minutes earlier as in other zones.`)
    : (L ? `Hari ini imsak pukul ${tm(t[0])} di zon ${main}, ${t[1] - t[0]} minit sebelum Subuh (${tm(t[1])}). Imsak ialah peringatan berhenti bersahur; puasa bermula pada waktu Subuh.` : `Today imsak is ${tm(t[0])} in zone ${main}, ${t[1] - t[0]} minutes before Subuh (${tm(t[1])}). Imsak is a reminder to stop eating sahur; the fast begins at Subuh.`);
  const others = solatStates.filter(o => o !== st).map(o => `    <a href="${L ? o.bm : o.en}">${L ? 'Waktu Solat ' + o.name.ms : 'Prayer Times ' + o.name.en}<small>${o.zones.length} ${L ? 'zon' : o.zones.length > 1 ? 'zones' : 'zone'}</small></a>`).join('\n');
  return {
    T_DAY: d(day), T_DAY_ISO: day, T_YEAR: year.year, T_MAIN: main, T_MAIN_AREAS: areas(main), T_LIST: list(t), T_IMSAK: tm(t[0]), T_SYURUK: tm(t[2]),
    T_ZONES_TEXT: zonesText,
    T_ZONES_LEAD: n === 1 ? (L ? `Zon ${main} meliputi ${areas(main)}.` : `Zone ${main} covers ${areas(main)}.`)
      : (L ? `${st.name.ms} ada ${n} zon JAKIM; pilih zon anda untuk waktu tepat, kiraan detik dan jadual bulanan.` : `${st.name.en} has ${n} JAKIM zones; choose yours for exact times, a countdown and the monthly timetable.`),
    T_MAGHRIBS: mags.map(([z, m]) => `${z} ${tm(m)}`).join(', '),
    T_SUBUH_MIN: tm(sMin[1][1]), T_SUBUH_MIN_D: d(sMin[0]), T_SUBUH_MAX: tm(sMax[1][1]), T_SUBUH_MAX_D: d(sMax[0]),
    T_MAG_MIN: tm(mMin[1][6]), T_MAG_MIN_D: d(mMin[0]), T_MAG_MAX: tm(mMax[1][6]), T_MAG_MAX_D: d(mMax[0]),
    T_IMSAK_TEXT: imsakText, T_SPREAD: spread,
    T_TABLE: st.zones.map(z => { const x = times(z, day); return `<tr><th scope="row">${z}<small>${esc(areas(z))}</small></th>${[0, 1, 2, 4, 5, 6, 7].map(i => `<td>${tm(x[i])}</td>`).join('')}</tr>`; }).join('\n'),
    T_ZONE_LIST: st.zones.map(z => `    <li><strong>${z}:</strong> ${esc(areas(z))}</li>`).join('\n'),
    T_OTHERS: others, ...calc(lang, main, st.zones)
  };
}
