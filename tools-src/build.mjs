// Builds every public page and crawl file from one layout, the tool catalog and tools-src/pages/*.html.
// Usage (from repo root):  node tools-src/build.mjs
// Output: docs/ is the complete public site (GitHub Pages serves main /docs as-is; no Actions needed):
// index.html, <page>/index.html, assets, crawl files, manifest, sw.js, CNAME and ads.txt (when configured).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { icons, renderIcon } from './icons.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, '..');
const pub = path.join(root, 'docs');
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');
const require = createRequire(import.meta.url);
const salary = require('../assets/js/salary-core.js');
const grades = require('../assets/js/grade-core.js');
const taxes = require('../assets/js/tax-core.js');
const epfCore = require('../assets/js/epf-core.js');
const loanCore = require('../assets/js/loan-core.js');
const carCore = require('../assets/js/carloan-core.js');
const asbCore = require('../assets/js/asb-core.js');
const prorateCore = require('../assets/js/prorate-core.js');
const otCore = require('../assets/js/ot-core.js');
const landCore = require('../assets/js/land-core.js');
const plCore = require('../assets/js/personal-core.js');
const rpgtCore = require('../assets/js/rpgt-core.js');
const bmiCore = require('../assets/js/bmi-core.js');
const zakatCore = require('../assets/js/zakat-core.js');
const goldCore = require('../assets/js/gold-core.js');
const promptCore = require('../assets/js/prompt-core.js');
const goldData = JSON.parse(read('gold-data.json'));
const fuelCore = require('../assets/js/fuel-core.js');
const fuelData = JSON.parse(read('fuel-data.json'));
const ncdCore = require('../assets/js/ncd-core.js');
const hijriCore = require('../assets/js/hijri-core.js');
const iddahCore = require('../assets/js/iddah-core.js');
const tnbCore = require('../assets/js/tnb-core.js');
const ptptnCore = require('../assets/js/ptptn-core.js');
const fidyahCore = require('../assets/js/fidyah-core.js');
const debtCore = require('../assets/js/debt-core.js');
const refiCore = require('../assets/js/refi-core.js');
const rentbuyCore = require('../assets/js/rentbuy-core.js');
const fdCore = require('../assets/js/fd-core.js');
const employerCore = require('../assets/js/employer-core.js');
const marginCore = require('../assets/js/margin-core.js');
const roasCore = require('../assets/js/roas-core.js');
const freelanceCore = require('../assets/js/freelance-core.js');
const workdaysCore = require('../assets/js/workdays-core.js');
const retireCore = require('../assets/js/retire-core.js');
const sspnCore = require('../assets/js/sspn-core.js');
const unittrustCore = require('../assets/js/unittrust-core.js');
const eduCore = require('../assets/js/edu-core.js');
const waterCore = require('../assets/js/water-core.js');
const qiblaCore = require('../assets/js/qibla-core.js');
const nesteggCore = require('../assets/js/nestegg-core.js');
const leaveCore = require('../assets/js/leave-core.js');
const terminationCore = require('../assets/js/termination-core.js');
const roadtaxCore = require('../assets/js/roadtax-core.js');
const tracking = require('../assets/js/tracking-core.js');
const cssCore = require('../assets/js/css-core.js');
const jsCore = require('../assets/js/js-core.js');
const htmlCore = require('../assets/js/html-core.js');
const purgeCore = require('../assets/js/purge-core.js');
const site = JSON.parse(read('site.json'));
const catalog = JSON.parse(read('tools.json'));
const tools = catalog.filter(t => t.live === true);
const layout = read('layout.html');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cats = Object.keys(site.categories);
const byCat = c => tools.filter(t => t.cat === c);
const liveCats = cats.filter(c => byCat(c).length);
const longDate = (iso, lang) => new Date(iso + 'T00:00:00Z').toLocaleDateString(lang === 'ms' ? 'ms-MY' : 'en-GB',
  { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const date = new Date(site.dateModified + 'T00:00:00Z');
const abs = u => (/^https?:/.test(u) ? u : site.origin + u);
const local = u => u.startsWith(site.origin + '/') ? u.slice(site.origin.length) : u;
site.faq = site.faq.map(f => ({ q: f.q, a: f.a.replaceAll('{count}', tools.length) }));

// ---- pages: tools-src/pages/*.html start with a JSON front-matter comment.
const pages = fs.readdirSync(path.join(dir, 'pages')).filter(f => f.endsWith('.html')).sort().map(file => {
  const src = read('pages/' + file);
  const m = src.match(/^<!--page\n([\s\S]*?)\n-->\n/);
  if (!m) throw new Error(`Missing front matter in pages/${file}`);
  return { file, ...JSON.parse(m[1]), body: src.slice(m[0].length) };
});
const pageByPath = new Map(pages.map(p => [p.path, p]));

// ---- validate inputs
const problems = [];
// "bloggerFrom": one old Blogger URL, or a list of URLs and [url, "#hash"] pairs (a merged tool opens in the right mode).
const redirectsOf = p => [].concat(p.bloggerFrom || []).map(r => Array.isArray(r) ? { from: r[0], hash: r[1] || '', path: p.path } : { from: r, hash: '', path: p.path });
catalog.forEach(t => {
  if (!site.categories[t.cat]) problems.push(`unknown category "${t.cat}" on ${t.name}`);
  if (!/^https:\/\//.test(t.url)) problems.push(`non-absolute url on ${t.name}: ${t.url}`);
  if (typeof t.live !== 'boolean') problems.push(`missing live status on ${t.name}`);
  if (t.live && !Object.hasOwn(icons, t.icon)) problems.push(`missing SVG icon on ${t.name}`);
  if (t.live && t.url.startsWith(site.origin) && !pageByPath.has(local(t.url))) problems.push(`no page source for ${t.url}`);
});
pages.forEach(p => {
  if (!/^\/[a-z0-9-]+\/$/.test(p.path)) problems.push(`page path must look like /slug/: ${p.path}`);
  if (!['en', 'ms'].includes(p.lang)) problems.push(`unsupported language on ${p.path}`);
  for (const alt of Object.values(p.alternates || {})) {
    const other = pageByPath.get(alt);
    if (!other || !Object.values(other.alternates || {}).includes(p.path)) problems.push(`hreflang pair must be reciprocal: ${p.path} <-> ${alt}`);
  }
  if (p.description.length > 160) problems.push(`description over 160 characters on ${p.path}`);
  for (const r of redirectsOf(p)) {
    if (!new RegExp('^' + site.mainSite.replace(/\./g, '\\.') + '/[a-z0-9/_.-]+\\.html$').test(r.from)) problems.push(`bloggerFrom must be a ${site.mainSite} .html URL on ${p.path}`);
    if (r.hash && !/^#[a-z0-9=&-]+$/i.test(r.hash)) problems.push(`bloggerFrom hash must look like #key=value on ${p.path}`);
  }
});
if (new Set(catalog.map(t => t.url)).size !== catalog.length) problems.push('duplicate tool URLs');
const froms = pages.flatMap(redirectsOf).map(r => r.from);
if (new Set(froms).size !== froms.length) problems.push('two pages share one bloggerFrom URL');
if (!tools.length) problems.push('no live tools to publish');
if (new Set(tools.map(t => t.icon)).size !== tools.length) problems.push('published tools must have their own icon');
if (new URL(site.origin).origin !== site.origin) problems.push('origin must be an origin without a trailing slash');
if (fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim() !== new URL(site.origin).hostname) problems.push('CNAME and canonical host differ');
if (!/^[0-9a-f]{32}$/.test(site.indexNowKey || '')) problems.push('indexNowKey must be 32 lowercase hex characters');
if (site.corsProxy && !/^https:\/\/[^\s"<>]+=$/.test(site.corsProxy)) problems.push('corsProxy must be empty or an https URL ending in "=" (for example https://name.workers.dev/?url=)');
const ads = site.adsense || { client: '', slots: {} };
if (ads.client) {
  if (!/^ca-pub-\d{16}$/.test(ads.client)) problems.push('adsense.client must look like ca-pub-0000000000000000');
  for (const k of ['top', 'middle', 'bottom']) if (!/^\d{8,12}$/.test(ads.slots[k] || '')) problems.push(`adsense.slots.${k} must be a numeric ad unit ID`);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(site.dateModified) || Number.isNaN(date.getTime())) problems.push('invalid modification date');
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

// ---- interface text
const T = {
  en: {
    SKIP: 'Skip to main content', NAV: 'Site', DARK: 'Dark mode', INSTALL: 'Install app',
    FOOTER_BLURB: 'Free online tools and Malaysian calculators for developers, bloggers and everyday tasks.',
    POPULAR: 'Popular tools', CATEGORIES: 'Categories', RESOURCES: 'Resources', ABOUT: 'About', CONTACT: 'Contact',
    PRIVACY: 'Privacy policy', TERMS: 'Terms of use', RIGHTS: 'All rights reserved.', TAGLINE: 'Free tools for the creator community',
    UPDATE: 'Update', OPEN_ANYWAY: 'Open tool anyway', DISMISS: 'Dismiss', AD: 'Advertisement', ALL_TOOLS: 'All tools', OG_LOCALE: 'en_US',
    SHARE_H: 'Share this calculator', SHARE_RESULT: 'Share result', COPY: 'Copy link', COPIED: 'Link copied', MORE: 'More options'
  },
  ms: {
    SKIP: 'Langkau ke kandungan utama', NAV: 'Laman', DARK: 'Mod gelap', INSTALL: 'Pasang aplikasi',
    FOOTER_BLURB: 'Alat dalam talian percuma dan kalkulator Malaysia untuk pembangun, penulis blog dan urusan harian.',
    POPULAR: 'Alat popular', CATEGORIES: 'Kategori', RESOURCES: 'Sumber', ABOUT: 'Tentang kami', CONTACT: 'Hubungi',
    PRIVACY: 'Dasar privasi', TERMS: 'Terma penggunaan', RIGHTS: 'Hak cipta terpelihara.', TAGLINE: 'Alat percuma untuk komuniti pencipta',
    UPDATE: 'Kemas kini', OPEN_ANYWAY: 'Buka juga', DISMISS: 'Tutup', AD: 'Iklan', ALL_TOOLS: 'Semua alat', OG_LOCALE: 'ms_MY',
    SHARE_H: 'Kongsi kalkulator ini', SHARE_RESULT: 'Kongsi keputusan', COPY: 'Salin pautan', COPIED: 'Pautan disalin', MORE: 'Pilihan lain'
  }
};
const CAT_MS = { dev: 'Alat Pembangun', seo: 'Alat SEO', content: 'Alat Kandungan', design: 'Alat Reka Bentuk', ai: 'Alat AI', util: 'Utiliti', calc: 'Kalkulator' };
const catLabel = (c, lang) => lang === 'ms' ? CAT_MS[c] || site.categories[c].label : site.categories[c].label;

// ---- AdSense: three manual responsive units. The library loads on the visitor's first
// scroll, tap, key or mouse move, so it never competes with LCP or the first input.
const adUnit = (key, lang) => !ads.client ? '' : `<div class="ad"><p class="ad-label">${T[lang].AD}</p><ins class="adsbygoogle" data-ad-client="${ads.client}" data-ad-slot="${ads.slots[key]}" data-ad-format="auto" data-full-width-responsive="true"></ins></div>`;
const adLoader = !ads.client ? '' : `<script>
(function(){
  var slots=document.querySelectorAll("ins.adsbygoogle"),done=false,ev=["scroll","pointerdown","keydown","touchstart","mousemove"];
  if(!slots.length)return;
  function load(){
    if(done)return;done=true;
    ev.forEach(function(e){removeEventListener(e,load)});
    var s=document.createElement("script");
    s.async=true;s.crossOrigin="anonymous";
    s.src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.client}";
    document.head.appendChild(s);
    for(var i=0;i<slots.length;i++)(window.adsbygoogle=window.adsbygoogle||[]).push({});
  }
  ev.forEach(function(e){addEventListener(e,load,{passive:true})});
})();
</script>`;

// ---- shared fragments
const localTools = tools.filter(t => t.url.startsWith(site.origin + '/'));
const footerPopular = [...new Set([...localTools, ...tools.filter(t => t.badge === 'popular' || t.badge === 'hot')])].slice(0, 6)
  .map(t => `          <li><a href="${esc(local(t.url))}">${esc(t.name)}</a></li>`).join('\n');
// On the home page category links filter in place; elsewhere they open the home page pre-filtered.
const footerCats = (lang, home) => liveCats.map(c =>
  `          <li><a href="${home ? '' : `/?cat=${c}`}#tools" data-filter="${c}">${esc(catLabel(c, lang))}</a></li>`).join('\n');
const faqHtml = faq => faq.map(f => `      <details><summary>${esc(f.q)}</summary><p>${f.html || esc(f.a)}</p></details>`).join('\n');
const faqSchema = (faq, id, pageId) => ({
  '@type': 'FAQPage', '@id': id, isPartOf: { '@id': pageId },
  mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
});
const organization = {
  '@type': 'Organization', '@id': site.mainSite + '/#organization', name: site.brand, url: site.mainSite + '/',
  logo: { '@type': 'ImageObject', url: abs(site.logo.local512), width: 512, height: 512 },
  sameAs: [`https://x.com/${site.twitter.replace('@', '')}`]
};
const website = {
  '@type': 'WebSite', '@id': site.origin + '/#website', url: site.origin + '/', name: site.brand + ' Tools',
  alternateName: ['Bukit Besi Tools', 'The Bukit Besi free online tools'],
  inLanguage: ['en', 'ms'], publisher: { '@id': site.mainSite + '/#organization' }
};
const ldJson = graph => JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');

function render(map) {
  const shared = {
    BRAND: site.brand, ORIGIN: site.origin, MAIN_SITE: site.mainSite, YEAR: date.getUTCFullYear(),
    LOGO_72: site.logo.local72, LOGO_192: site.logo.local192,
    OG_IMAGE: abs(site.ogImage.url), OG_W: site.ogImage.width, OG_H: site.ogImage.height, OG_ALT: esc(site.ogImage.alt),
    TWITTER_CARD: site.ogImage.width / site.ogImage.height >= 1.5 ? 'summary_large_image' : 'summary',
    TWITTER: site.twitter, BASE_CSS: read('css/base.css').trim(), FOOTER_POPULAR: footerPopular, AD_LOADER: adLoader,
    ROBOTS: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1', HEAD_EXTRA: '', PAGE_SCRIPTS: ''
  };
  const lang = map.LANG;
  const all = { ...shared, ...Object.fromEntries(Object.entries(T[lang]).map(([k, v]) => ['T_' + k, v])),
    FOOTER_CATS: footerCats(lang, map.CANONICAL === site.origin + '/'), AD_TOP: adUnit('top', lang), AD_MIDDLE: adUnit('middle', lang), AD_BOTTOM: adUnit('bottom', lang),
    OG_LOCALE: T[lang].OG_LOCALE, ...map };
  // Two passes: MAIN may itself contain placeholders.
  let html = layout.replace('{{MAIN}}', all.MAIN);
  html = html.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => {
    if (!(k in all)) { console.error('Unknown placeholder ' + m + ' in ' + all.CANONICAL); process.exit(1); }
    return all[k];
  });
  return html;
}

// ---- home page
const homeTitle = 'Free Online Tools, AI & Calculators';
const homeDescription = `${tools.length} free online tools for code, SEO, writing, images and AI, plus Malaysian salary, zakat and BMI calculators. No signup needed.`;
const chips = [`      <button type="button" class="chip" data-filter="all" aria-pressed="true">All<small>${tools.length}</small></button>`]
  .concat(liveCats.map(c =>
    `      <button type="button" class="chip" data-filter="${c}" aria-pressed="false">${esc(site.categories[c].label)}<small>${byCat(c).length}</small></button>`)).join('\n');
const cards = tools.map(t => {
  const tag = t.badge ? `<span class="tag ${t.badge}">${t.badge}</span>` : '';
  return `      <li class="card" data-cat="${t.cat}"><span class="ic t-${t.cat}" data-icon="${t.icon}" aria-hidden="true">${renderIcon(t.icon)}</span>${tag}<h3><a class="card-link" href="${esc(local(t.url))}">${esc(t.name)}</a></h3><p>${esc(t.desc)}</p><span class="go" aria-hidden="true">Use tool &rarr;</span></li>`;
}).join('\n');
const categoryBlocks = liveCats.map(c => `      <article class="panel"><h3>${esc(site.categories[c].label)} (${byCat(c).length})</h3><p>${esc(site.categories[c].blurb)}</p><p>${byCat(c).map(t => esc(t.name)).join(', ')}.</p><a class="more" href="#tools" data-filter="${c}">Show ${esc(site.categories[c].label.toLowerCase())}</a></article>`).join('\n');
const homeGraph = [
  organization, { ...website, description: homeDescription },
  {
    '@type': 'CollectionPage', '@id': site.origin + '/#webpage', url: site.origin + '/', name: homeTitle + ' | ' + site.brand,
    description: homeDescription, inLanguage: 'en', isAccessibleForFree: true,
    isPartOf: { '@id': site.origin + '/#website' },
    primaryImageOfPage: { '@type': 'ImageObject', url: abs(site.ogImage.url), width: site.ogImage.width, height: site.ogImage.height },
    dateModified: site.dateModified, author: { '@id': site.mainSite + '/#organization' },
    audience: { '@type': 'Audience', audienceType: 'Developers, bloggers, content creators and Malaysian users' },
    about: liveCats.map(c => ({ '@type': 'Thing', name: site.categories[c].label, description: site.categories[c].blurb })),
    mainEntity: { '@id': site.origin + '/#toollist' }
  },
  {
    '@type': 'ItemList', '@id': site.origin + '/#toollist', name: `${site.brand} free online tools`, numberOfItems: tools.length,
    itemListElement: tools.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, description: t.desc, url: t.url }))
  },
  faqSchema(site.faq, site.origin + '/#faq', site.origin + '/#webpage')
];
const homeHtml = render({
  LANG: 'en', TITLE: esc(homeTitle + ' | ' + site.brand), DESCRIPTION: esc(homeDescription), CANONICAL: site.origin + '/',
  HREFLANG: `<link rel="alternate" hreflang="en" href="${site.origin}/">\n<link rel="alternate" hreflang="x-default" href="${site.origin}/">`,
  JSONLD: ldJson(homeGraph), PAGE_CSS: read('css/home.css').trim(), HEAD_EXTRA: '<noscript><style>.chips{display:none}</style></noscript>',
  NAV: ['tools', 'categories', 'why', 'faq'].map((id, i) => `      <a href="#${id}">${['Tools', 'Categories', 'Why use it', 'FAQ'][i]}</a>`).join('\n'),
  HEADER_CTA: '    <a href="#tools" class="btn sm">Explore tools</a>',
  MAIN: read('home.html'), COUNT: tools.length, CAT_COUNT: liveCats.length, DATE_ISO: site.dateModified,
  DATE_TEXT: longDate(site.dateModified, 'en'), CHIPS: chips, CARDS: cards, CATEGORY_BLOCKS: categoryBlocks, FAQ_HTML: faqHtml(site.faq),
  PAGE_SCRIPTS: `<script>
(function(){
  var chips=document.querySelectorAll(".chip"),items=document.querySelectorAll("#toolsGrid>li"),st=document.getElementById("filterStatus");
  function apply(f){
    var n=0,i;
    for(i=0;i<items.length;i++){var show=f==="all"||items[i].getAttribute("data-cat")===f;items[i].hidden=!show;if(show)n++}
    for(i=0;i<chips.length;i++)chips[i].setAttribute("aria-pressed",chips[i].getAttribute("data-filter")===f?"true":"false");
    st.textContent=n+" tools shown";
  }
  document.addEventListener("click",function(e){
    var t=e.target.closest&&e.target.closest("[data-filter]");
    if(t)apply(t.getAttribute("data-filter"));
  });
  // Footer and other pages link to /#tools with a category; apply it on arrival.
  var q=/[?&]cat=([a-z]+)/.exec(location.search);
  if(q&&document.querySelector('.chip[data-filter="'+q[1]+'"]'))apply(q[1]);
})();
</script>`
});
fs.rmSync(pub, { recursive: true, force: true });
fs.mkdirSync(pub, { recursive: true });
fs.writeFileSync(path.join(pub, 'index.html'), homeHtml);

// ---- salary calculator helpers (build-time rendering keeps first paint complete and crawlable)
const money = (n, lang) => new Intl.NumberFormat(lang === 'ms' ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR' }).format(n);
const SALARY_DEFAULT = 5000;
function salaryMap(lang) {
  const r = salary.calculate({ salary: SALARY_DEFAULT });
  const L = lang === 'ms'
    ? { gross: 'Gaji kasar', epf: 'KWSP', perkeso: 'PERKESO + SIP + LINDUNG', pcb: 'PCB', net: 'Gaji bersih', cost: 'Kos majikan' }
    : { gross: 'Gross salary', epf: 'EPF', perkeso: 'SOCSO + EIS + LINDUNG', pcb: 'PCB', net: 'Take-home pay', cost: 'Employer cost' };
  const rows = [1700, 2500, 3000, 3500, 4000, 5000, 6000, 8000, 10000, 15000, 20000].map(w => {
    const x = salary.calculate({ salary: w });
    const p = x.perkeso.socsoEmployee + x.perkeso.eisEmployee + x.perkeso.lindung;
    return `        <tr><th scope="row">${money(w, lang)}</th><td>${money(x.epf.employee, lang)}</td><td>${money(p, lang)}</td><td>${money(x.pcb.net, lang)}</td><td><strong>${money(x.net, lang)}</strong></td><td>${money(x.employerCost, lang)}</td></tr>`;
  }).join('\n');
  return {
    S_DEFAULT: SALARY_DEFAULT,
    S_NET: money(r.net, lang), S_NET_YEAR: money(r.annual.net, lang), S_GROSS: money(r.input.salary, lang),
    S_EPF: money(r.epf.employee, lang), S_SOCSO: money(r.perkeso.socsoEmployee, lang), S_EIS: money(r.perkeso.eisEmployee, lang),
    S_LINDUNG: money(r.perkeso.lindung, lang), S_PCB: money(r.pcb.net, lang), S_ZAKAT: money(0, lang), S_DED: money(r.deductions, lang),
    S_EPF_ER: money(r.epf.employer, lang), S_SOCSO_ER: money(r.perkeso.socsoEmployer, lang), S_EIS_ER: money(r.perkeso.eisEmployer, lang),
    S_COST: money(r.employerCost, lang), S_TAX_YEAR: money(r.annual.tax, lang), S_EPF_YEAR: money(r.annual.epfTotal, lang),
    S_TABLE: `<div class="table-wrap" tabindex="0" role="region" aria-labelledby="examples-h">
    <table class="data">
      <thead><tr><th scope="col">${L.gross}</th><th scope="col">${L.epf}</th><th scope="col">${L.perkeso}</th><th scope="col">${L.pcb}</th><th scope="col">${L.net}</th><th scope="col">${L.cost}</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
    </div>`,
    S_NOTE: r.pcb.monthly
      ? (lang === 'ms' ? `Anggaran pendapatan bercukai ${money(r.pcb.chargeable, lang)} setahun; kadar cukai tertinggi ${Math.round(r.pcb.rate * 100)}%.`
        : `Estimated chargeable income ${money(r.pcb.chargeable, lang)} a year; top tax rate ${Math.round(r.pcb.rate * 100)}%.`) : '',
    S_VERIFIED: longDate(salary.RULES.verified, lang), S_VERIFIED_ISO: salary.RULES.verified,
    S_YEAR: salary.RULES.taxYear
  };
}

// ---- grade tools (CGPA converter and calculator), rendered at build time like the salary pages
const pct = n => `${Number(n.toFixed(2))}%`;
const CGPA_DEFAULT = 8.2;
const PERCENT_DEFAULT = 75;
const COLUMN_PRESETS = ['cbse', 'anna', 'vtu', 'gtu', 'mu'];
function cgpaPercentMap() {
  const r = grades.toPercent(CGPA_DEFAULT, 'generic95');
  const rows = [];
  for (let c = 100; c >= 50; c--) {
    const v = c / 10;
    rows.push(`        <tr><th scope="row">${v.toFixed(1)}</th>${COLUMN_PRESETS.map(id => `<td>${pct(grades.toPercent(v, id).percent)}</td>`).join('')}</tr>`);
  }
  const formulaOf = id => grades.FORMULAS[grades.PRESETS.find(p => p.id === id).formula].label;
  return {
    G_DEFAULT: CGPA_DEFAULT, G_PERCENT: pct(r.percent), G_FORMULA: `${r.formula} = ${pct(r.percent)}`,
    G_PERCENT_DEFAULT: PERCENT_DEFAULT, G_REVERSE: grades.toCgpa(PERCENT_DEFAULT, 'generic95').cgpa.toFixed(2).replace(/0$/, ''),
    G_OPTIONS: grades.PRESETS.map(p => `<option value="${p.id}"${p.id === 'generic95' ? ' selected' : ''}>${esc(p.name)}</option>`).join(''),
    G_COMPARE: grades.PRESETS.filter(p => !['generic95', 'generic10', 'proportional', 'custom'].includes(p.id)).map(p =>
      `<tr data-preset="${p.id}"><th scope="row">${esc(p.name)}</th><td>${pct(grades.toPercent(CGPA_DEFAULT, p.id).percent)}</td><td>${esc(grades.FORMULAS[p.formula].label)}</td></tr>`).join('\n'),
    G_TABLE_HEAD: `<tr><th scope="col">CGPA</th>${COLUMN_PRESETS.map(id => `<th scope="col">${esc(formulaOf(id))}</th>`).join('')}</tr>`,
    G_TABLE: rows.join('\n'),
    G_EX_CBSE: pct(grades.toPercent(CGPA_DEFAULT, 'cbse').percent), G_EX_VTU: pct(grades.toPercent(CGPA_DEFAULT, 'vtu').percent),
    G_EX_ANNA: pct(grades.toPercent(CGPA_DEFAULT, 'anna').percent)
  };
}
const SEM_EXAMPLE = [[8.2, 20], [7.9, 22], [8.6, 21], [8.4, 20]];
const COURSE_EXAMPLE = [['O', 4], ['A+', 3], ['A', 3], ['B+', 3], ['A', 2]];
function cgpaMap() {
  const sem = grades.cgpaFromSemesters(SEM_EXAMPLE.map(([sgpa, credits]) => ({ sgpa, credits })));
  const course = grades.gpaFromCourses(COURSE_EXAMPLE.map(([grade, credits]) => ({ grade, credits })), 'india10');
  const gradeOptions = (scale, chosen) => '<option value="">Grade</option>' + grades.SCALES[scale].grades.map(([g, pts]) =>
    `<option value="${esc(g)}"${g === chosen ? ' selected' : ''}>${esc(g)} (${pts.toFixed(scale === 'my4' ? 2 : 0)})</option>`).join('');
  const del = n => `<td><button type="button" class="row-del" aria-label="Remove row ${n}">×</button></td>`;
  const scaleTable = scale => grades.SCALES[scale].grades.map(([g, pts]) => `<tr><th scope="row">${esc(g)}</th><td>${pts.toFixed(2)}</td></tr>`).join('');
  return {
    C_SEM_ROWS: SEM_EXAMPLE.map(([sgpa, credits], i) => `<tr><td>${i + 1}</td><td><input type="number" inputmode="decimal" min="0" max="10" step="0.01" value="${sgpa}" aria-label="SGPA semester ${i + 1}"></td><td><input type="number" inputmode="decimal" min="0" step="0.5" value="${credits}" aria-label="Credits semester ${i + 1}"></td>${del(i + 1)}</tr>`).join('\n'),
    C_SEM_CGPA: sem.cgpa.toFixed(2), C_SEM_DETAIL: `${sem.semesters} semesters, ${sem.credits} credits (credit-weighted)`,
    C_SEM_LINK: `/cgpa-to-percentage/#cgpa=${sem.cgpa.toFixed(2)}&amp;u=generic95`,
    C_COURSE_ROWS: COURSE_EXAMPLE.map(([g, credits], i) => `<tr><td>${i + 1}</td><td><select aria-label="Grade course ${i + 1}">${gradeOptions('india10', g)}</select></td><td><input type="number" inputmode="decimal" min="0" step="0.5" value="${credits}" aria-label="Credits course ${i + 1}"></td>${del(i + 1)}</tr>`).join('\n'),
    C_GPA: course.gpa.toFixed(2), C_CREDITS: course.credits, C_POINTS: course.qualityPoints.toFixed(2),
    C_SCALE_INDIA: scaleTable('india10'), C_SCALE_MY: scaleTable('my4')
  };
}
// ---- annual income tax (EN + BM): relief form, results and tables generated from tax-core.js
const TAX_LABELS = {
  self: ['Individual (automatic)', 'Individu (automatik)'],
  disabled: ['Disabled individual (OKU)', 'Individu kurang upaya (OKU)'],
  spouse: ['Spouse with no income, or joint assessment', 'Pasangan tiada pendapatan, atau taksiran bersama'],
  spouseDisabled: ['Spouse is disabled (OKU)', 'Pasangan OKU'],
  childUnder18: ['Children under 18', 'Anak bawah 18 tahun'],
  child18School: ['Children 18+ in A-level, matriculation or similar', 'Anak 18 tahun ke atas di A-Level, matrikulasi atau setara'],
  child18Higher: ['Children 18+ studying for a diploma or degree', 'Anak 18 tahun ke atas belajar diploma atau ijazah'],
  childDisabled: ['Disabled children', 'Anak OKU'],
  parentsMedical: ['Parents: medical, dental and care', 'Ibu bapa: perubatan, pergigian dan penjagaan'],
  medical: ['Medical for self, spouse and children', 'Perubatan diri, pasangan dan anak'],
  equipment: ['Support equipment for a disabled family member', 'Peralatan sokongan ahli keluarga OKU'],
  education: ['Your own education fees', 'Yuran pendidikan sendiri'],
  lifestyle: ['Lifestyle: books, computer, phone, internet', 'Gaya hidup: buku, komputer, telefon, internet'],
  sports: ['Sports equipment, facilities and fees', 'Peralatan, fasiliti dan yuran sukan'],
  breastfeeding: ['Breastfeeding equipment', 'Peralatan penyusuan ibu'],
  childcare: ['Childcare centre or kindergarten fees', 'Yuran taska atau tadika'],
  sspn: ['SSPN net savings', 'Simpanan bersih SSPN'],
  epf: ['EPF (your share)', 'KWSP (bahagian anda)'],
  lifeInsurance: ['Life insurance or family takaful', 'Insurans nyawa atau takaful keluarga'],
  prs: ['PRS and deferred annuity', 'PRS dan anuiti tertangguh'],
  eduMedInsurance: ['Education or medical insurance', 'Insurans pendidikan atau perubatan'],
  socso: ['SOCSO and EIS', 'PERKESO dan SIP'],
  evCharging: ['EV charging or food-waste composter', 'Pengecasan EV atau mesin kompos sisa makanan'],
  housingLoan: ['First-home loan interest', 'Faedah pinjaman rumah pertama']
};
const TAX_HELP = {
  medical: ['Serious illness, fertility treatment, vaccination, dental, check-ups and children\'s learning-disability support.', 'Penyakit serius, rawatan kesuburan, vaksinasi, pergigian, pemeriksaan dan sokongan kesukaran pembelajaran anak.'],
  education: ['Includes up to RM2,000 for upskilling courses.', 'Termasuk sehingga RM2,000 untuk kursus peningkatan kemahiran.'],
  epf: ['Enter what was deducted from your pay; relief is capped at RM4,000.', 'Masukkan jumlah yang dipotong daripada gaji; pelepasan dihadkan RM4,000.'],
  housingLoan: ['Sale and purchase agreement signed 2025–2027. RM7,000 for homes up to RM500,000; RM5,000 up to RM750,000.', 'Perjanjian jual beli ditandatangani 2025–2027. RM7,000 untuk rumah sehingga RM500,000; RM5,000 sehingga RM750,000.']
};
const TAX_GROUPS = [
  [['Family', 'Keluarga'], ['disabled', 'spouse', 'spouseDisabled', 'childUnder18', 'child18School', 'child18Higher', 'childDisabled'], false],
  [['Savings and insurance', 'Simpanan dan insurans'], ['epf', 'socso', 'lifeInsurance', 'eduMedInsurance', 'prs', 'sspn'], true],
  [['Medical', 'Perubatan'], ['medical', 'parentsMedical', 'equipment'], false],
  [['Lifestyle, education and home', 'Gaya hidup, pendidikan dan rumah'], ['lifestyle', 'sports', 'education', 'childcare', 'breastfeeding', 'evCharging', 'housingLoan'], false]
];
const TAX_EXAMPLE = { employment: 60000, epf: 6600, socso: 350 };
function taxMap(lang) {
  const L = lang === 'ms' ? 1 : 0;
  const rm = n => money(n, lang);
  const relief = Object.fromEntries(taxes.RELIEFS.map(r => [r.id, r]));
  const field = id => {
    const r = relief[id], label = esc(TAX_LABELS[id][L]), help = TAX_HELP[id] ? `<p class="help" id="h-${id}">${esc(TAX_HELP[id][L])}</p>` : '';
    const describedby = TAX_HELP[id] ? ` aria-describedby="h-${id}"` : '';
    if (r.flag) return `<div class="field"><label class="check"><input type="checkbox" name="${id}" data-name="${label}"> <span>${label} <small>(${rm(r.limit)})</small></span></label></div>`;
    if (r.per) return `<div class="field"><label for="f-${id}">${label} <small>(${rm(r.per)} ${L ? 'seorang' : 'each'})</small></label><div class="input"><input id="f-${id}" name="${id}" data-name="${label}" type="number" inputmode="numeric" min="0" max="20" step="1" value="${TAX_EXAMPLE[id] ?? ''}" placeholder="0"></div></div>`;
    const tier = id === 'housingLoan' ? `<select class="input" name="housingTier" aria-label="${L ? 'Harga rumah' : 'Home price'}"><option value="lower" selected>${L ? 'Sehingga RM500,000' : 'Up to RM500,000'}</option><option value="upper">RM500,001–RM750,000</option></select>` : '';
    return `<div class="field"><label for="f-${id}">${label} <small>(${L ? 'had' : 'max'} ${rm(r.limit)})</small></label><div class="input"><span aria-hidden="true">RM</span><input id="f-${id}" name="${id}" data-name="${label}" type="number" inputmode="decimal" min="0" step="1" value="${TAX_EXAMPLE[id] ?? ''}" placeholder="0"${describedby}></div>${help}${tier}</div>`;
  };
  const groups = TAX_GROUPS.map(([title, ids, open]) => `<details class="more-opts"${open ? ' open' : ''}><summary>${esc(title[L])}</summary>${ids.map(field).join('')}</details>`).join('\n');
  const r = taxes.calculate(TAX_EXAMPLE, 2026), p = taxes.calculate(TAX_EXAMPLE, 2027);
  const bandRows = () => {
    const edges = [...new Set([...taxes.BANDS_2026, ...taxes.BANDS_2027].flatMap(b => [b[0], b[1]]))].sort((a, b) => a - b);
    const rateAt = (bands, x) => bands.find(b => x > b[0] && x <= b[1])[2];
    return edges.slice(0, -1).map((lo, i) => {
      const hi = edges[i + 1], mid = lo + 1;
      const a = rateAt(taxes.BANDS_2026, mid), b = rateAt(taxes.BANDS_2027, mid);
      const range = hi === Infinity ? `${L ? 'Melebihi' : 'Above'} ${lo.toLocaleString('en')}` : `${(lo ? lo + 1 : 0).toLocaleString('en')} – ${hi.toLocaleString('en')}`;
      return `<tr><th scope="row">${range}</th><td>${Math.round(a * 100)}%</td><td>${a !== b ? '<strong>' : ''}${Math.round(b * 100)}%${a !== b ? '</strong>' : ''}</td></tr>`;
    }).join('\n');
  };
  const examples = [36000, 48000, 60000, 84000, 120000, 180000, 240000, 360000].map(inc => {
    const x = { employment: inc, epf: inc * 0.11, socso: 350 };
    const a = taxes.calculate(x, 2026), b = taxes.calculate(x, 2027);
    return `<tr><th scope="row">${rm(inc)}</th><td>${rm(a.payable)}</td><td>${a.effectiveRate}%</td><td>${rm(b.payable)}</td><td>${rm(a.payable - b.payable)}</td></tr>`;
  }).join('\n');
  const reliefTable = [['self', 9000], ...taxes.RELIEFS.map(x => [x.id, x.limit || x.per])].map(([id, lim]) =>
    `<tr><th scope="row">${esc(TAX_LABELS[id][L])}</th><td>${rm(lim)}${relief[id] && relief[id].per ? (L ? ' seorang' : ' each') : ''}</td></tr>`).join('\n');
  return {
    X_FIELDS: groups, X_SELF: esc(TAX_LABELS.self[L]),
    X_EMPLOYMENT: TAX_EXAMPLE.employment,
    X_PAYABLE: rm(r.payable), X_MONTHLY: rm(r.monthly), X_INCOME: rm(r.income), X_RELIEFS: rm(r.reliefTotal),
    X_DONATIONS: rm(r.donations), X_CHARGEABLE: rm(r.chargeable), X_GROSS: rm(r.grossTax), X_REBATE: rm(r.rebate), X_ZAKAT: rm(r.zakat),
    X_RATES: `${r.effectiveRate}% · ${r.marginalRate}%`, X_PROPOSAL: rm(p.payable),
    X_COMPARE: L ? `Jimat ${rm(r.payable - p.payable)} di bawah cadangan Bajet 2027 (TT2027).` : `You would pay ${rm(r.payable - p.payable)} less under the Budget 2027 proposal (YA2027).`,
    X_RELIEF_ROWS: r.reliefs.map(x => `<tr><th scope="row">${esc(TAX_LABELS[x.id][L])}</th><td>${rm(x.amount)}</td></tr>`).join(''),
    X_BANDS: bandRows(), X_EXAMPLES: examples, X_RELIEF_TABLE: reliefTable,
    X_EX_TAX: rm(r.payable), X_EX_PROPOSAL: rm(p.payable), X_EX_SAVE: rm(r.payable - p.payable)
  };
}
// ---- EPF (KWSP) savings projection, EN + BM
const EPF_EXAMPLE = { age: 30, retireAge: 60, salary: 4000, raise: 3, persaraan: 37500, sejahtera: 7500, fleksibel: 5000, ownRate: 11, topUp: 0, inflation: 2.5, dividend: epfCore.FACTS.average10 };
function epfMap(lang) {
  const L = lang === 'ms' ? 1 : 0;
  const rm0 = n => new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(n);
  const r = epfCore.project(EPF_EXAMPLE);
  const F = epfCore.FACTS;
  const tier = {
    below: [`Below the RM390,000 Basic Savings level by ${rm0(r.gapToBasic)}.`, `Di bawah Simpanan Asas RM390,000. Kurang ${rm0(r.gapToBasic)}.`],
    basic: ['Reaches the Basic level (RM390,000).', 'Mencapai tahap Asas (RM390,000).'],
    adequate: ['Reaches the Adequate level (RM650,000).', 'Mencapai tahap Mencukupi (RM650,000).'],
    enhanced: ['Reaches the Enhanced level (RM1.3 million).', 'Mencapai tahap Dipertingkat (RM1.3 juta).']
  }[r.tier][L];
  const years = r.years.map(y => `<tr><th scope="row">${y.age}</th><td>${rm0(y.salary)}</td><td>${rm0(y.employee + y.employer + y.topUp)}</td><td>${rm0(y.dividend)}</td><td>${rm0(y.balance)}</td></tr>`).join('\n');
  const history = epfCore.DIVIDENDS.slice().reverse().map(([y, c, sh]) => `<tr><th scope="row">${y}</th><td>${c.toFixed(2)}%</td><td>${sh == null ? '–' : sh.toFixed(2) + '%'}</td></tr>`).join('\n');
  const examples = [2000, 3000, 4000, 5000, 7000, 10000].map(sal => {
    const x = epfCore.project({ age: 25, retireAge: 60, salary: sal, raise: 3, dividend: F.average10 });
    const y = epfCore.project({ age: 25, retireAge: 55, salary: sal, raise: 3, dividend: F.average10 });
    return `<tr><th scope="row">${rm0(sal)}</th><td>${rm0(y.final)}</td><td>${rm0(x.final)}</td><td>${rm0(x.monthlyFor20Years)}</td></tr>`;
  }).join('\n');
  const preset = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  return {
    E_AGE: EPF_EXAMPLE.age, E_SALARY: EPF_EXAMPLE.salary, E_RAISE: EPF_EXAMPLE.raise,
    E_PERSARAAN: EPF_EXAMPLE.persaraan, E_SEJAHTERA: EPF_EXAMPLE.sejahtera, E_FLEKSIBEL: EPF_EXAMPLE.fleksibel,
    E_DIV_OPTIONS: [
      preset(F.average10, `10-year average, 2016–2025 (${F.average10}%)`, `Purata 10 tahun, 2016–2025 (${F.average10}%)`, true),
      preset(F.latest, `Latest: ${F.latestYear} dividend (${F.latest}%)`, `Terkini: dividen ${F.latestYear} (${F.latest}%)`),
      preset(5, 'Conservative (5.00%)', 'Konservatif (5.00%)'),
      preset('custom', 'Custom rate', 'Kadar sendiri')
    ].join(''),
    E_FINAL: rm0(r.final), E_REAL: rm0(r.real), E_RETIRE: r.retireAge, E_MONTHLY: rm0(r.monthlyFor20Years), E_REAL_MONTHLY: rm0(r.realMonthlyFor20Years), E_INFLATION: EPF_EXAMPLE.inflation,
    E_P: rm0(r.accounts.persaraan), E_S: rm0(r.accounts.sejahtera), E_F: rm0(r.accounts.fleksibel),
    E_START: rm0(r.start), E_EMPLOYEE: rm0(r.totals.employee), E_EMPLOYER: rm0(r.totals.employer), E_TOPUP: rm0(r.totals.topUp),
    E_DIVIDEND: rm0(r.totals.dividend), E_FIRSTDIV: money(r.firstYearDividend, lang), E_TIER: tier,
    E_BAR: (Math.min(100, r.real / F.ria.enhanced * 100)).toFixed(1) + '%',
    E_YEARS: years, E_HISTORY: history, E_EXAMPLES: examples,
    E_LATEST: F.latest.toFixed(2) + '%', E_LATEST_YEAR: F.latestYear, E_AVG: F.average10 + '%',
    E_VERIFIED: longDate(F.verified, lang), E_VERIFIED_ISO: F.verified
  };
}
// ---- Home loan (pinjaman perumahan), EN + BM
const LOAN_EXAMPLE = { price: 500000, downPct: 10, rate: loanCore.FACTS.defaultRate, years: 35, firstHome: 'none' };
function loanMap(lang) {
  const L = lang === 'ms' ? 1 : 0;
  const rm0 = n => new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(n);
  const r = loanCore.calculate(LOAN_EXAMPLE), c = r.costs, F = loanCore.FACTS;
  const pct = n => n.toFixed(2) + '%';
  const schedule = r.schedule.map(y => `<tr><th scope="row">${y.year}</th><td>${rm0(y.principal)}</td><td>${rm0(y.interest)}</td><td>${rm0(y.balance)}</td></tr>`).join('\n');
  const instalments = [200000, 300000, 400000, 500000, 600000, 800000, 1000000].map(loan =>
    `<tr><th scope="row">${rm0(loan)}</th>${[25, 30, 35].map(y => `<td>${money(loanCore.instalment(loan, F.defaultRate, y), lang)}</td>`).join('')}</tr>`).join('\n');
  const costRows = [300000, 500000, 700000, 1000000].map(price => {
    const loan = price * 0.9, now = loanCore.exemption('current', price, loan), next = loanCore.exemption('budget2027', price, loan);
    return `<tr><th scope="row">${rm0(price)}</th><td>${rm0(loanCore.stampDutyTransfer(price))}</td><td>${rm0(loanCore.stampDutyLoan(loan))}</td><td>${rm0(loanCore.legalFee(price) + loanCore.legalFee(loan))}</td><td>${rm0(now.mot + now.loan)}</td><td>${rm0(next.mot + next.loan)}</td></tr>`;
  }).join('\n');
  const opt = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  return {
    L_PRICE: LOAN_EXAMPLE.price, L_DOWN: LOAN_EXAMPLE.downPct, L_RATE: LOAN_EXAMPLE.rate, L_TENURE: LOAN_EXAMPLE.years,
    L_FIRST_OPTIONS: [
      opt('none', 'No (or not eligible)', 'Tidak (atau tidak layak)', true),
      opt('current', 'Yes, up to RM500,000 (current, SPA by 2027)', 'Ya, sehingga RM500,000 (semasa, SPA hingga 2027)'),
      opt('budget2027', 'Yes, up to RM750,000 (Budget 2027 proposal, SPA 2027–2030)', 'Ya, sehingga RM750,000 (cadangan Bajet 2027, SPA 2027–2030)')
    ].join(''),
    L_PAY: money(r.instalment, lang), L_LOAN: rm0(r.loan), L_TERM: r.years, L_INTEREST: rm0(r.interest), L_TOTAL: rm0(r.totalPaid),
    L_UP25: money(r.rateUp25, lang), L_UP50: money(r.rateUp50, lang),
    LC_DOWN: rm0(c.downPayment), LC_MOT: rm0(c.stampTransfer), LC_LOAN_DUTY: rm0(c.stampLoan), LC_LEGAL_SPA: rm0(c.legalSpa),
    LC_LEGAL_LOAN: rm0(c.legalLoan), LC_SST: rm0(c.sst), LC_TOTAL: rm0(c.total), LC_EXEMPT: rm0(c.exempted),
    L_SCHEDULE: schedule, L_INSTALMENTS: instalments, L_COST_ROWS: costRows,
    L_OPR: pct(F.opr), L_DEFAULT_RATE: pct(F.defaultRate), L_OPR_SINCE: longDate(F.oprSince, lang),
    L_VERIFIED: longDate(F.verified, lang), L_VERIFIED_ISO: F.verified
  };
}
// ---- Car loan (hire purchase), EN + BM
const CAR_EXAMPLE = { price: 100000, downPct: 10, years: 9, method: 'eir', rate: carCore.FACTS.defaultRate, cc: 1497, body: 'saloon', ncd: 0 };
function carMap(lang) {
  const L = lang === 'ms' ? 1 : 0;
  const rm0 = n => new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(n);
  const F = carCore.FACTS, r = carCore.calculate(CAR_EXAMPLE);
  const flat = carCore.calculate({ ...CAR_EXAMPLE, method: 'flat', rate: F.defaultFlat, settleAfter: 48 });
  const pct = n => n.toFixed(2) + '%';
  const schedule = r.schedule.map(y => `<tr><th scope="row">${y.year}</th><td>${rm0(y.principal)}</td><td>${rm0(y.interest)}</td><td>${rm0(y.balance)}</td></tr>`).join('\n');
  const instalments = [30000, 50000, 70000, 90000, 120000, 150000].map(loan =>
    `<tr><th scope="row">${rm0(loan)}</th>${[5, 7, 9].map(y => `<td>${money(carCore.eirInstalment(loan, F.defaultRate, y), lang)}</td>`).join('')}</tr>`).join('\n');
  const convert = [2.0, 2.5, 3.0, 3.5, 4.0].map(fr =>
    `<tr><th scope="row">${pct(fr)}</th>${[5, 7, 9].map(y => `<td>${pct(carCore.flatToEir(fr, y))}</td>`).join('')}</tr>`).join('\n');
  const opt = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  return {
    K_PRICE: CAR_EXAMPLE.price, K_DOWN: CAR_EXAMPLE.downPct, K_YEARS: CAR_EXAMPLE.years, K_RATE: CAR_EXAMPLE.rate,
    K_METHOD_OPTIONS: [
      opt('eir', 'Reducing balance, EIR (new rules from 1 June 2026)', 'Baki berkurangan, EIR (peraturan baharu mulai 1 Jun 2026)', true),
      opt('flat', 'Flat rate (Rule of 78, older agreements)', 'Kadar rata (Rule of 78, perjanjian lama)')
    ].join(''),
    K_RATE_LABEL: L ? 'Kadar faedah efektif (EIR) setahun' : 'Effective interest rate (EIR) a year',
    K_PAY: money(r.monthly, lang), K_LOAN: rm0(r.loan), K_TERM: r.years, K_OTHER: L ? `Bersamaan kadar rata ${pct(r.flat)}` : `Equal to a ${pct(r.flat)} flat rate`,
    K_INTEREST: rm0(r.interest), K_TOTAL: rm0(r.totalPaid), K_DOWN_RM: rm0(r.downPayment), K_EIR: pct(r.eir), K_FLAT: pct(r.flat),
    K_SCHEDULE: schedule, K_INSTALMENTS: instalments, K_CONVERT: convert, K_DEFAULT_RATE: pct(F.defaultRate),
    K_FLAT_PAY: money(flat.monthly, lang), K_FLAT_EIR: pct(flat.eir), K_FLAT_INTEREST: rm0(flat.interest),
    K_R78_PAY: rm0(flat.settlement.amount), K_R78_EXTRA: rm0(flat.settlement.extraVsReducing), K_R78_SAVED: rm0(flat.settlement.saved),
    K_VERIFIED: longDate(F.verified, lang), K_VERIFIED_ISO: F.verified,
    K_CC: CAR_EXAMPLE.cc,
    K_BODY_OPTIONS: [
      opt('saloon', 'Saloon (sedan, hatchback)', 'Salun (sedan, hatchback)', true),
      opt('nonSaloon', 'Non-saloon (SUV, MPV, pickup)', 'Bukan salun (SUV, MPV, pikap)')
    ].join(''),
    K_NCD_OPTIONS: carCore.NCD.map((n, i) => opt(n, i ? `${n}% (${i} claim-free year${i > 1 ? 's' : ''}${i === 5 ? ' or more' : ''})` : '0% (new driver or recent claim)',
      i ? `${n}% (${i} tahun tanpa tuntutan${i === 5 ? ' atau lebih' : ''})` : '0% (pemandu baharu atau baru membuat tuntutan)', i === 0)).join(''),
    K_ROAD: money(r.running.roadTax, lang), K_INS: money(r.running.insurance.total, lang), K_ALL: money(r.running.monthly, lang),
    K_ROAD_TABLE: [[998, 'Perodua Axia / Bezza 1.0'], [1329, 'Perodua Myvi 1.3'], [1497, 'Honda City / Civic 1.5'], [1798, '1.8-litre'],
      [1998, '2.0-litre'], [2487, 'Toyota Camry 2.5'], [2994, '3.0-litre'], [3456, '3.5-litre']].map(([cc, eg]) =>
      `<tr><th scope="row">${cc.toLocaleString('en-MY')} cc <small>${esc(eg)}</small></th><td>${money(carCore.roadTax(cc, 'saloon'), lang)}</td><td>${money(carCore.roadTax(cc, 'nonSaloon'), lang)}</td><td>${money(carCore.roadTax(cc, 'saloon', 'east'), lang)}</td></tr>`).join('\n'),
    K_EV_TABLE: [[50, ''], [70, ''], [100, ''], [150, 'BYD Atto 3, Proton e.MAS 7 (160 kW)'], [160, ''], [208, 'Tesla Model 3 RWD'], [225, ''], [250, ''], [310, '']].map(([kw, eg]) =>
      `<tr><th scope="row">${kw} kW${eg ? ` <small>${esc(eg)}</small>` : ''}</th><td>${money(carCore.evRoadTax(kw), lang)}</td></tr>`).join('\n'),
    K_FUEL_OPTIONS: [opt('ice', 'Petrol or hybrid', 'Petrol atau hibrid', true), opt('ev', 'Electric (EV)', 'Elektrik (EV)')].join(''),
    K_REGION_OPTIONS: [opt('peninsular', 'Peninsular Malaysia', 'Semenanjung Malaysia', true), opt('east', 'Sabah or Sarawak', 'Sabah atau Sarawak')].join(''),
    K_INS_TABLE: [50000, 80000, 100000, 150000, 200000].map(si => `<tr><th scope="row">${rm0(si)}</th>${[0, 25, 55].map(n => `<td>${rm0(carCore.insurance(si, 1497, n).total)}</td>`).join('')}</tr>`).join('\n'),
    K_RUN_VERIFIED: longDate(F.runningVerified, lang)
  };
}
// ---- ASB dividend (Amanah Saham Bumiputera), EN + BM
const ASB_EXAMPLE = { start: 10000, monthly: 200, timing: 'late', rate: asbCore.FACTS.latest, years: 10 };
const ASB_FIN = { amount: 50000, rate: asbCore.FACTS.defaultFinancingRate, years: asbCore.FACTS.defaultFinancingYears };
function asbMap(lang) {
  const L = lang === 'ms' ? 1 : 0;
  const rm0 = n => new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(n);
  const F = asbCore.FACTS, r = asbCore.project(ASB_EXAMPLE), x = asbCore.financing({ ...ASB_FIN, divRate: F.latest });
  const pct = n => n.toFixed(2) + '%';
  const opt = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  const months = L ? ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sen = n => n == null ? '–' : n.toFixed(2) + (L ? ' sen' : ' sen');
  return {
    A_START: ASB_EXAMPLE.start, A_MONTHLY: ASB_EXAMPLE.monthly, A_YEARS: ASB_EXAMPLE.years, A_RATE: F.latest,
    A_TIMING_OPTIONS: [
      opt('late', 'After the 1st (from next month)', 'Selepas 1hb (bulan berikutnya)', true),
      opt('early', 'On the 1st (same month)', 'Pada 1hb (bulan yang sama)')
    ].join(''),
    A_RATE_OPTIONS: [
      opt(F.latest, `${F.latestYear}: ${pct(F.latest)}`, `${F.latestYear}: ${pct(F.latest)}`, true),
      opt(F.average5, `5-yr avg: ${pct(F.average5)}`, `Purata 5 thn: ${pct(F.average5)}`),
      opt(F.conservative, `Low: ${pct(F.conservative)}`, `Rendah: ${pct(F.conservative)}`),
      opt('custom', 'Custom', 'Sendiri')
    ].join(''),
    A_MONTH_INPUTS: months.map((m, i) => `<div class="field"><label for="m${i + 1}">${m}</label><div class="input"><span aria-hidden="true">RM</span><input id="m${i + 1}" name="m${i + 1}" type="number" inputmode="decimal" min="0" step="1" value=""></div></div>`).join('\n          '),
    A_PAY: money(r.firstDividend, lang), A_AVG: rm0(r.firstAverage), A_RATE_TXT: F.latest.toFixed(2),
    A_DEPOSITS: rm0(r.start + r.totalDeposits), A_DIVS: rm0(r.totalDividends), A_FINAL: rm0(r.final),
    A_SCHEDULE: r.rows.map(y => `<tr><th scope="row">${y.year}</th><td>${rm0(y.deposits)}</td><td>${rm0(y.dividend)}</td><td>${rm0(y.balance)}</td></tr>`).join('\n'),
    A_FIN_AMOUNT: ASB_FIN.amount, A_FIN_RATE: ASB_FIN.rate, A_FIN_YEARS: ASB_FIN.years,
    AF_PAY: money(x.monthly, lang), AF_INTEREST: rm0(x.interest), AF_DIV: rm0(x.yearlyDividend), AF_DIVS: rm0(x.dividends),
    AF_NET: (L ? 'Untung bersih ' : 'Net gain ') + rm0(x.net), AF_BREAK: pct(x.breakEven),
    A_HISTORY: asbCore.HISTORY.slice().reverse().map(([y, d, b, t, note]) => `<tr><th scope="row">${y}</th><td>${sen(d)}</td><td>${note === 'ehsan' ? `${sen(0.75)} + ${sen(0.75)} Ehsan<small>${L ? 'Ehsan bagi 30,000 unit pertama' : 'Ehsan on the first 30,000 units'}</small>` : sen(b)}</td><td><strong>${sen(t)}</strong></td></tr>`).join('\n'),
    A_EXAMPLES: [5000, 10000, 30000, 50000, 100000, 200000].map(b =>
      `<tr><th scope="row">${rm0(b)}</th><td>${money(asbCore.dividend(Array(12).fill(b), F.latest).amount, lang)}</td><td>${money(asbCore.dividend(Array(12).fill(b), F.average5).amount, lang)}</td><td>${money(asbCore.dividend(Array(12).fill(b), F.conservative).amount, lang)}</td></tr>`).join('\n'),
    A_GROWTH: [100, 200, 500, 1000].map(m => {
      const g = n => asbCore.project({ start: 0, monthly: m, rate: F.average5, years: n });
      return `<tr><th scope="row">${rm0(m)}</th>${[5, 10, 20].map(n => `<td>${rm0(g(n).final)}</td>`).join('')}</tr>`;
    }).join('\n'),
    A_LATEST: pct(F.latest), A_LATEST_SEN: F.latest.toFixed(2), A_LATEST_YEAR: F.latestYear, A_LATEST_DIV: F.latestDividend.toFixed(2), A_LATEST_BONUS: F.latestBonus.toFixed(2),
    A_AVG5: pct(F.average5), A_NEXT_YEAR: F.latestYear + 1,
    A_VERIFIED: longDate(F.verified, lang), A_VERIFIED_ISO: F.verified
  };
}
// ---- Prorated salary (gaji prorata), EN + BM
const PRORATE_EXAMPLE = { salary: 3000, case: 'join', month: '2026-10', date: '2026-10-16', unpaid: 0, workdays: 'mon-fri' };
function prorateMap(lang) {
  const L = lang === 'ms' ? 1 : 0;
  const F = prorateCore.FACTS, r = prorateCore.calculate(PRORATE_EXAMPLE);
  const opt = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  const method = k => ({ calendar: L ? 'Hari kalendar (seksyen 18A)' : 'Calendar days (section 18A)', working: L ? 'Hari bekerja' : 'Working days', fixed26: L ? '26 hari (kadar gaji biasa)' : '26 days (ordinary rate of pay)' })[k];
  const mrow = m => `<tr${m.key === 'calendar' ? ' class="total"' : ''}><th scope="row">${method(m.key)}<small>${m.days} / ${m.base} ${L ? 'hari' : 'days'} · ${money(m.daily, lang)} ${L ? 'sehari' : 'a day'}</small></th><td>${money(m.pay, lang)}</td></tr>`;
  const ex = (salary, days, base) => money(prorateCore.prorate(salary, days, base), lang);
  return {
    P_SALARY: PRORATE_EXAMPLE.salary, P_MONTH: PRORATE_EXAMPLE.month, P_DATE: PRORATE_EXAMPLE.date, P_UNPAID: PRORATE_EXAMPLE.unpaid,
    P_CASE_OPTIONS: [
      opt('join', 'Joined during the month', 'Mula bekerja pada pertengahan bulan', true),
      opt('leave', 'Last day during the month', 'Hari terakhir bekerja pada pertengahan bulan'),
      opt('full', 'Worked the whole month (unpaid leave only)', 'Bekerja sebulan penuh (cuti tanpa gaji sahaja)')
    ].join(''),
    P_WORKDAY_OPTIONS: [
      opt('mon-fri', 'Monday to Friday', 'Isnin hingga Jumaat', true),
      opt('mon-sat', 'Monday to Saturday', 'Isnin hingga Sabtu'),
      opt('sun-thu', 'Sunday to Thursday (Kedah, Kelantan, Terengganu)', 'Ahad hingga Khamis (Kedah, Kelantan, Terengganu)'),
      opt('half-sat', 'Monday to Friday + half-day Saturday', 'Isnin hingga Jumaat + separuh hari Sabtu')
    ].join(''),
    P_PAY: money(r.pay, lang), P_DAYS: r.days, P_BASE: r.calendarDays, P_PERIOD: r.label[L ? 'ms' : 'en'],
    P_METHODS: r.methods.map(mrow).join('\n'), P_DEDUCT: money(r.deduction, lang),
    P_EX_JOIN: ex(3000, 16, 31), P_EX_LEAVE: ex(4500, 10, 30), P_EX_UNPAID: money(prorateCore.prorate(6200, 2, 31) , lang), P_EX_UNPAID_PAY: ex(6200, 29, 31),
    P_TABLE: [2000, 3000, 4000, 5000, 8000].map(s => `<tr><th scope="row">${money(s, lang)}</th>${[28, 30, 31].map(b => `<td>${money(s / b, lang)}</td>`).join('')}<td>${money(s / 26, lang)}</td></tr>`).join('\n'),
    P_VERIFIED: longDate(F.verified, lang), P_VERIFIED_ISO: F.verified
  };
}
// ---- Overtime (kerja lebih masa), EN + BM
const OT_EXAMPLE = { wage: 2600, basis: 'monthly', hoursPerDay: 8, specified: 'no', normalOt: 10, restHalf: 0, restFull: 1, restOt: 0, holidayDays: 1, holidayOt: 0 };
function otMap(lang) {
  const L = lang === 'ms' ? 1 : 0, F = otCore.FACTS, r = otCore.calculate(OT_EXAMPLE);
  const m = n => money(n, lang);
  const opt = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  const totalLabel = L ? 'Jumlah bayaran lebih masa' : 'Total overtime pay';
  const lines = r.lines.filter(l => l.qty || l.key === 'normal').map(l =>
    `<tr><th scope="row">${esc(otCore.LABELS[lang][l.key])}<small>${otCore.detail(l, lang, m)}</small></th><td>${m(l.amount)}</td></tr>`);
  lines.push(`<tr class="total"><th scope="row">${totalLabel}</th><td>${m(r.total)}</td></tr>`);
  const row = w => { const x = otCore.rates(w, 'monthly', 8); return `<tr><th scope="row">${m(w)}</th><td>${m(x.orp)}</td><td>${m(x.hrp)}</td><td>${m(x.hrp * 1.5)}</td><td>${m(x.hrp * 2)}</td><td>${m(x.hrp * 3)}</td></tr>`; };
  const ex = otCore.rates(F.minimumWage, 'monthly', 8);
  return {
    O_WAGE: OT_EXAMPLE.wage, O_HOURS: OT_EXAMPLE.hoursPerDay, O_NORMAL: OT_EXAMPLE.normalOt, O_REST_HALF: OT_EXAMPLE.restHalf, O_REST_FULL: OT_EXAMPLE.restFull,
    O_REST_OT: OT_EXAMPLE.restOt, O_PH: OT_EXAMPLE.holidayDays, O_PH_OT: OT_EXAMPLE.holidayOt,
    O_BASIS_OPTIONS: [opt('monthly', 'Monthly-rated', 'Gaji bulanan', true), opt('daily', 'Daily-rated', 'Gaji harian')].join(''),
    O_SPECIFIED_OPTIONS: [opt('no', 'No', 'Tidak', true), opt('yes', 'Yes', 'Ya')].join(''),
    O_WAGE_LABEL: L ? 'Gaji bulanan' : 'Monthly wages', O_TOTAL_LABEL: totalLabel,
    O_TOTAL: m(r.total), O_ORP: m(r.orp), O_HRP: m(r.hrp), O_OT: m(r.lines[0].rate), O_LINES: lines.join('\n'),
    O_TABLE: [1700, 2000, 2500, 3000, 3500, 4000].map(row).join('\n'),
    O_MIN_ORP: m(ex.orp), O_MIN_HRP: m(ex.hrp), O_MIN_OT: m(ex.hrp * 1.5),
    O_VERIFIED: longDate(F.verified, lang), O_VERIFIED_ISO: F.verified
  };
}
// ---- Land size converter (ukuran tanah), EN + BM
const LAND_EXAMPLE = { value: 1, unit: 'relung' };
function landMap(lang) {
  const L = lang === 'ms' ? 1 : 0, N = landCore.NAMES[lang], loc = L ? 'ms-MY' : 'en-MY';
  const fmt = n => new Intl.NumberFormat(loc, { maximumFractionDigits: n >= 1000 ? 0 : n >= 100 ? 2 : 4 }).format(n);
  const s = landCore.convert(LAND_EXAMPLE.value, LAND_EXAMPLE.unit), all = landCore.all(s), arp = landCore.toArp(s);
  const opt = (v, label, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${label}</option>`;
  const lower = t => L ? t.toLowerCase() : t.toLowerCase();
  const link = (u, v) => `<a href="#landForm" data-land="${u}:${v}">${fmt(v)} ${lower(N[u])}</a>`;
  const cheat = [['acre', 1], ['hectare', 1], ['relung', 1], ['orlong', 1], ['rood', 1], ['pole', 1], ['jemba', 1], ['sqm', 1000], ['sqft', 10000]].map(([u, v]) => {
    const a = landCore.all(landCore.convert(v, u));
    return `<tr><th scope="row">${link(u, v)}</th><td>${fmt(a.sqft)}</td><td>${fmt(a.sqm)}</td><td>${fmt(a.acre)}</td><td>${fmt(a.relung)}</td></tr>`;
  }).join('\n');
  const lots = [[20, 70], [22, 75], [24, 80], [40, 80], [50, 100], [60, 120]].map(([l, w]) => {
    const a = landCore.all(landCore.rect(l, w, 'ft'));
    return `<tr><th scope="row">${l} × ${w} ft</th><td>${fmt(a.sqft)}</td><td>${fmt(a.sqm)}</td><td>${fmt(a.acre)}</td></tr>`;
  }).join('\n');
  return {
    D_VALUE: LAND_EXAMPLE.value,
    D_UNIT_OPTIONS: landCore.ORDER.map(u => opt(u, N[u], u === LAND_EXAMPLE.unit)).join(''),
    D_MODE_OPTIONS: [opt('area', L ? 'Nilai dan unit' : 'A value and unit', true), opt('arp', L ? 'Ekar, rod dan pole (geran lama)' : 'Acres, roods and poles (old title)'), opt('rect', L ? 'Panjang × lebar lot' : 'Lot length × width')].join(''),
    D_SIDE_OPTIONS: [opt('ft', L ? 'kaki' : 'feet', true), opt('m', L ? 'meter' : 'metres')].join(''),
    D_MAIN: fmt(all.sqft) + ' sq ft', D_SUB: `${fmt(all.acre)} ${lower(N.acre)} · ${fmt(all.sqm)} m² · ${fmt(all.relung)} relung`,
    D_ROWS: landCore.ORDER.map(u => `<tr><th scope="row">${N[u]}</th><td id="lu-${u}">${fmt(all[u])}</td></tr>`).join('\n'),
    D_ARP: `${arp.a}a ${arp.r}r ${arp.p}p`, D_CHEAT: cheat, D_LOTS: lots,
    D_VERIFIED: longDate(landCore.FACTS.verified, lang), D_VERIFIED_ISO: landCore.FACTS.verified
  };
}
// ---- Personal loan (pinjaman peribadi), EN + BM
const PL_EXAMPLE = { amount: 30000, years: 5, method: 'flat', rate: plCore.FACTS.defaultFlat, stamp: 'deducted' };
function personalMap(lang) {
  const L = lang === 'ms' ? 1 : 0, F = plCore.FACTS, r = plCore.calculate(PL_EXAMPLE);
  const rm0 = n => new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(n);
  const pct = n => n.toFixed(2) + '%';
  const opt = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  const at = (amount, years, rate) => plCore.calculate({ amount, years, rate });
  return {
    Q_AMOUNT: PL_EXAMPLE.amount, Q_YEARS: PL_EXAMPLE.years, Q_RATE: PL_EXAMPLE.rate,
    Q_METHOD_OPTIONS: [opt('flat', 'Flat rate (most bank offers in 2026)', 'Kadar rata (kebanyakan tawaran bank 2026)', true), opt('eir', 'Reducing balance (EIR)', 'Baki berkurangan (EIR)')].join(''),
    Q_STAMP_OPTIONS: [opt('deducted', 'Deducted from the loan', 'Ditolak daripada pinjaman', true), opt('separate', 'Paid separately', 'Dibayar berasingan')].join(''),
    Q_RATE_LABEL: L ? 'Kadar rata (flat) setahun' : 'Flat rate a year',
    Q_PAY: money(r.monthly, lang), Q_AMT: rm0(r.amount), Q_TERM: r.years, Q_OTHER: L ? `Bersamaan EIR ${pct(r.eir)}` : `Equal to ${pct(r.eir)} EIR`,
    Q_INTEREST: rm0(r.interest), Q_EIR: pct(r.eir), Q_FLAT: pct(r.flat), Q_STAMP: money(r.stamp, lang), Q_RECEIVED: money(r.received, lang), Q_COST: rm0(r.cost),
    Q_SCHEDULE: r.schedule.map(y => `<tr><th scope="row">${y.year}</th><td>${rm0(y.principal)}</td><td>${rm0(y.interest)}</td><td>${rm0(y.balance)}</td></tr>`).join('\n'),
    Q_TABLE: [10000, 20000, 30000, 50000, 100000].map(a => `<tr><th scope="row">${rm0(a)}</th>${[3, 5, 7, 10].map(y => `<td>${money(at(a, y, F.defaultFlat).monthly, lang)}</td>`).join('')}</tr>`).join('\n'),
    Q_CONVERT: [4, 5, 6, 7, 8].map(fr => `<tr><th scope="row">${pct(fr)}</th>${[3, 5, 7, 10].map(y => `<td>${pct(at(10000, y, fr).eir)}</td>`).join('')}</tr>`).join('\n'),
    Q_DEFAULT: pct(F.defaultFlat), Q_BAN: longDate(F.flatBanFrom, lang),
    Q_VERIFIED: longDate(F.verified, lang), Q_VERIFIED_ISO: F.verified
  };
}
// ---- RPGT (cukai keuntungan harta tanah), EN + BM
const RPGT_EXAMPLE = { owner: 'citizen', acquired: '2023-03-01', disposed: '2026-06-01', purchase: 500000, acqCosts: 15000, enhance: 0, sale: 600000, saleCosts: 12000, residence: 'no' };
function rpgtMap(lang) {
  const L = lang === 'ms' ? 1 : 0, F = rpgtCore.FACTS, r = rpgtCore.calculate(RPGT_EXAMPLE);
  const m = n => money(n, lang);
  const opt = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  const yearText = r.year <= 3 ? (L ? 'Dalam 3 tahun' : 'Within 3 years') : (L ? `Tahun ke-${r.year}` : `Year ${r.year}`) + (r.year >= 6 ? (L ? ' dan seterusnya' : ' or later') : '');
  const owners = [['citizen', 'Citizen or PR', 'Warganegara atau PR'], ['foreigner', 'Non-citizen', 'Bukan warganegara'], ['company', 'Company', 'Syarikat']];
  const years = [[1, '1–3'], [4, '4'], [5, '5'], [6, L ? '6 dan seterusnya' : '6 and later']];
  const gainTax = (owner, year) => rpgtCore.calculate({ owner, acquired: '2020-01-01', disposed: `${2020 + year - 1}-06-01`, purchase: 400000, sale: 500000 }).tax;
  return {
    R_OWNER_OPTIONS: owners.map(([v, en, bm], i) => opt(v, en, bm, i === 0)).join(''),
    R_RES_OPTIONS: [opt('no', 'No', 'Tidak', true), opt('yes', 'Yes, use my once-in-a-lifetime exemption', 'Ya, guna pengecualian sekali seumur hidup')].join(''),
    R_ACQ: RPGT_EXAMPLE.acquired, R_DISP: RPGT_EXAMPLE.disposed, R_PURCHASE: RPGT_EXAMPLE.purchase, R_ACQ_COSTS: RPGT_EXAMPLE.acqCosts,
    R_ENHANCE: RPGT_EXAMPLE.enhance, R_SALE: RPGT_EXAMPLE.sale, R_SALE_COSTS: RPGT_EXAMPLE.saleCosts,
    R_TAX: m(r.tax), R_YEAR: `${yearText} · ${r.rate}%`, R_NET: m(r.net), R_COST: m(r.cost), R_GAIN: m(r.gain), R_EXEMPT: m(r.exemption),
    R_CHARGE: m(r.chargeable), R_RET_PCT: r.retentionPct, R_RET: m(r.retention), R_REFUND: m(Math.abs(r.refund)),
    R_REFUND_LABEL: r.refund >= 0 ? (L ? 'Baki tahanan dipulangkan' : 'Retention refunded to you') : (L ? 'Baki cukai perlu dibayar' : 'Tax still to pay'),
    R_RATES: years.map(([y, label]) => `<tr><th scope="row">${label}</th>${owners.map(([o]) => `<td>${rpgtCore.rateFor(o, y)}%</td>`).join('')}</tr>`).join('\n'),
    R_EXAMPLES: years.map(([y, label]) => `<tr><th scope="row">${label}</th>${owners.map(([o]) => `<td>${m(gainTax(o, y))}</td>`).join('')}</tr>`).join('\n'),
    R_VERIFIED: longDate(F.verified, lang), R_VERIFIED_ISO: F.verified
  };
}
// ---- BMI (Malaysian CPG cut-offs), EN + BM
const BMI_EXAMPLE = { unit: 'metric', cm: 165, kg: 65, waist: 85, sex: 'male' };
function bmiMap(lang) {
  const L = lang === 'ms' ? 1 : 0, N = bmiCore.LABELS[lang], r = bmiCore.calculate(BMI_EXAMPLE), w = r.waist;
  const nf = n => new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY', { maximumFractionDigits: 1 }).format(n);
  const opt = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  const change = r.direction === 'lose' ? (L ? `Turunkan ${nf(r.change)} kg untuk mencapai julat sihat.` : `Lose ${nf(r.change)} kg to reach the healthy range.`)
    : r.direction === 'gain' ? (L ? `Naikkan ${nf(r.change)} kg untuk mencapai julat sihat.` : `Gain ${nf(r.change)} kg to reach the healthy range.`)
    : (L ? 'Anda dalam julat berat sihat. Kekalkan.' : 'You are in the healthy weight range. Keep it up.');
  const heights = [150, 155, 160, 165, 170, 175, 180, 185].map(cm => {
    const x = bmiCore.range(cm), h2 = (cm / 100) ** 2;
    return `<tr><th scope="row">${cm} cm</th><td>${nf(x.low)}–${nf(x.high)} kg</td><td>${nf(23 * h2)} kg</td><td>${nf(x.over)} kg</td></tr>`;
  }).join('\n');
  const cats = [['under', '< 18.5', '< 18.5'], ['normal', '18.5–22.9', '18.5–24.9'], ['over', '23.0–27.4', '25.0–29.9'], ['obese1', '27.5–34.9', '30.0–34.9'], ['obese2', '35.0–39.9', '35.0–39.9'], ['obese3', '≥ 40.0', '≥ 40.0']]
    .map(([k, cpg, who]) => `<tr><th scope="row">${N[k]}</th><td>${cpg}</td><td>${who}</td></tr>`).join('\n');
  return {
    M_CM: BMI_EXAMPLE.cm, M_KG: BMI_EXAMPLE.kg, M_WAIST: BMI_EXAMPLE.waist,
    M_UNIT_OPTIONS: [opt('metric', 'Metric (cm, kg)', 'Metrik (cm, kg)', true), opt('imperial', 'Imperial (ft, in, lb)', 'Imperial (kaki, inci, paun)')].join(''),
    M_SEX_OPTIONS: [opt('male', 'Male', 'Lelaki', true), opt('female', 'Female', 'Perempuan')].join(''),
    M_BMI: nf(r.bmi), M_CAT: N[r.category], M_CAT_CLASS: 'bmi-' + r.category, M_GAUGE: r.gauge.toFixed(1) + '%', M_WHO: N[r.who],
    M_RANGE: `${nf(r.healthy.low)}–${nf(r.healthy.high)} kg`, M_CHANGE: change,
    M_WAIST_TEXT: `${w.atRisk ? (L ? 'Melebihi' : 'Above') : (L ? 'Bawah' : 'Below')} ${w.limit} cm`,
    M_RATIO: `${w.ratio.toFixed(2)} · ${N[w.ratioBand]}`,
    M_HEIGHTS: heights, M_CATS: cats,
    M_VERIFIED: longDate(bmiCore.FACTS.verified, lang), M_VERIFIED_ISO: bmiCore.FACTS.verified
  };
}
// ---- Zakat pendapatan and zakat emas/simpanan, EN + BM (one core)
const ZAKAT_EXAMPLE = { salary: 5000, period: 'monthly', other: 0, method: 'gross', adults: 1, others: 0, kids7: 0, kids6: 0, ipt: 0, tax: '' };
function zakatMap(lang) {
  const L = lang === 'ms' ? 1 : 0, F = zakatCore.FACTS, K = F.kifayah, m = n => money(n, lang);
  const r = zakatCore.income(ZAKAT_EXAMPLE), fam = zakatCore.income({ salary: 5000, method: 'net', adults: 1, others: 1, kids7: 1, kids6: 1 });
  const opt = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  const table = [3000, 3500, 4000, 5000, 6000, 8000, 10000].map(sal => {
    const a = zakatCore.income({ salary: sal }), b = zakatCore.income({ salary: sal, method: 'net' });
    return `<tr><th scope="row">${m(sal)}</th><td>${m(a.zakat)}</td><td>${m(a.monthly)}</td><td>${m(b.zakat)}</td></tr>`;
  }).join('\n');
  const kif = [['workingAdult', 'Working adult (including you)', 'Dewasa bekerja (termasuk anda)'], ['otherAdult', 'Non-working adult (e.g. spouse)', 'Dewasa tidak bekerja (cth. pasangan)'],
    ['child7', 'Child aged 7–17', 'Anak 7–17 tahun'], ['child6', 'Child aged 6 and under', 'Anak 6 tahun ke bawah'], ['ipt', 'Dependant in higher education', 'Tanggungan di IPT']]
    .map(([k, en, bm]) => `<tr><th scope="row">${L ? bm : en}</th><td>${m(K[k] / 12)}</td><td>${m(K[k])}</td></tr>`).join('\n');
  return {
    Z_SALARY: ZAKAT_EXAMPLE.salary, Z_NISAB_IN: F.nisab,
    Z_PERIOD_OPTIONS: [opt('monthly', 'A month', 'Sebulan', true), opt('yearly', 'A year', 'Setahun')].join(''),
    Z_METHOD_OPTIONS: [opt('gross', 'Gross (no deductions)', 'Tanpa tolakan (kasar)', true), opt('net', 'Net (had kifayah and EPF)', 'Dengan tolakan (had kifayah, KWSP)')].join(''),
    Z_YEAR: m(r.zakat), Z_MONTH: m(r.monthly), Z_INCOME: m(r.yearly), Z_DEDUCTED: m(r.deducted), Z_BASE: m(r.base), Z_NISAB: m(r.nisab),
    Z_STATUS: r.due ? (L ? 'Wajib zakat: pendapatan melebihi nisab.' : 'Zakat is due: your income is above the nisab.') : '',
    Z_TABLE: table, Z_KIFAYAH: kif,
    Z_FAM_DED: m(fam.deducted), Z_FAM_BASE: m(fam.base), Z_FAM_ZAKAT: m(fam.zakat), Z_FAM_MONTH: m(fam.monthly),
    Z_NISAB_MONTH: m(F.nisab / 12), Z_GOLD: m(F.goldPrice),
    Z_VERIFIED: longDate(F.verified, lang), Z_VERIFIED_ISO: F.verified
  };
}
const GOLD_EXAMPLE = { kept: 100, worn: 900, uruf: 800, savings: 50000 };
function goldMap(lang) {
  const L = lang === 'ms' ? 1 : 0, F = zakatCore.FACTS, m = n => money(n, lang);
  const r = zakatCore.gold(GOLD_EXAMPLE), x = r.lines;
  const g = n => new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY', { maximumFractionDigits: 2 }).format(n);
  const opt = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  const worn = [500, 800, 900, 1000, 1200, 1500].map(w => {
    const a = zakatCore.gold({ worn: w, uruf: 800 }).lines.worn;
    return `<tr><th scope="row">${g(w)} g</th><td>${g(a.excess)} g</td><td>${m(a.zakat)}</td></tr>`;
  }).join('\n');
  const kept = [50, 85, 100, 200, 500].map(k => {
    const a = zakatCore.gold({ kept: k }).lines.kept;
    return `<tr><th scope="row">${g(k)} g</th><td>${m(a.value)}</td><td>${a.due ? m(a.zakat) : (L ? 'Belum cukup nisab' : 'Below the nisab')}</td></tr>`;
  }).join('\n');
  return {
    G_PRICE: F.goldPrice, G_KEPT: GOLD_EXAMPLE.kept, G_WORN: GOLD_EXAMPLE.worn, G_URUF: GOLD_EXAMPLE.uruf, G_SAVINGS: GOLD_EXAMPLE.savings,
    G_STATE_OPTIONS: [opt('selangor', 'Selangor (800 g)', 'Selangor (800 g)', true), opt('wp', 'Federal Territories (800 g)', 'Wilayah Persekutuan (800 g)'),
      opt('kelantan', 'Kelantan (600 g)', 'Kelantan (600 g)'), opt('other', 'Other state: enter its uruf', 'Negeri lain: masukkan uruf')].join(''),
    G_TOTAL: m(r.total), G_NISAB: m(r.nisab), G_KEPT_Z: m(x.kept.zakat), G_KEPT_NOTE: `${g(x.kept.grams)} g × ${m(r.price)}`,
    G_WORN_Z: m(x.worn.zakat), G_WORN_NOTE: `${g(x.worn.grams)} g − ${g(x.worn.uruf)} g uruf = ${g(x.worn.excess)} g`, G_SAV_Z: m(x.savings.zakat),
    G_WORN_TABLE: worn, G_KEPT_TABLE: kept, G_PRICE_TXT: m(F.goldPrice),
    G_VERIFIED: longDate(F.verified, lang), G_VERIFIED_ISO: F.verified
  };
}
// ---- Gold price today (harga emas hari ini), EN + BM. Today's figures come from tools-src/gold-data.json, written by
// the Daily gold price workflow; the page then refreshes live from the Cloudflare Worker in site.goldApi.
const goldDate = (goldData.kijang && goldData.kijang.date) || (goldData.fetchedAt || '').slice(0, 10);
function goldPriceMap(lang) {
  const L = lang === 'ms' ? 1 : 0, G = goldCore, m = n => money(n, lang);
  const pure = G.pureGram(goldData), rows = pure ? G.table(pure.rm) : [], k = goldData.kijang, kg = G.kijangGram(k);
  const nf = (n, d = 2) => new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY', { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);
  const purityName = { 999: L ? 'Emas tulen' : 'Pure gold', 916: L ? 'Barang kemas biasa' : 'Common jewellery', 835: L ? 'Barang kemas' : 'Jewellery', 750: L ? 'Emas putih, barang kemas' : 'White gold, jewellery', 585: L ? 'Barang kemas ringan' : 'Light jewellery', 375: L ? 'Barang kemas murah' : 'Budget jewellery' };
  const table = rows.map(r => `<tr><th scope="row">${r.fineness} <small>${r.karat}K · ${purityName[r.fineness]}</small></th><td id="hp-${r.fineness}">${m(r.gram)}</td><td id="hp10-${r.fineness}">${m(r.tenGram)}</td></tr>`).join('\n');
  const coin = (label, x, id) => `<tr><th scope="row">${label}</th><td id="hk-${id}-s">${x ? m(x.sell) : '–'}</td><td id="hk-${id}-b">${x ? m(x.buy) : '–'}</td></tr>`;
  const ch = G.chart(goldData.history.slice(-60), 600, 160);
  const updated = goldData.fetchedAt ? new Date(goldData.fetchedAt).toLocaleString(L ? 'ms-MY' : 'en-GB', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const change = pure && goldData.prev && goldData.prev.pure ? (pure.rm - goldData.prev.pure) / goldData.prev.pure * 100 : null;
  const opt = (v, label, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${label}</option>`;
  // Snapshot for the page script, without the history.
  const snap = { fetchedAt: goldData.fetchedAt, spot: goldData.spot, fx: goldData.fx, kijang: goldData.kijang, prev: goldData.prev };
  return {
    H_PURE: pure ? m(pure.rm) : '–', H_916: rows.length ? m(rows[1].gram) : '–',
    H_BASIS: pure ? (pure.basis === 'spot' ? (L ? 'Harga spot antarabangsa, ditukar ke ringgit' : 'International spot price in ringgit') : (L ? 'Harga belian Kijang Emas Bank Negara' : "Bank Negara's Kijang Emas buying price")) : '',
    H_UPDATED: updated, H_DATE: longDate(goldDate, lang), H_DATE_ISO: goldDate,
    H_CHANGE: change === null ? '' : ` · ${change >= 0 ? '▲' : '▼'} ${nf(Math.abs(change))}% ${L ? 'berbanding semalam' : 'since yesterday'}`,
    H_CHANGE_CLASS: change === null ? '' : change >= 0 ? 'up' : 'down',
    H_TABLE: table,
    H_KIJANG: [coin('1 oz', k && k.oneOz, 'one'), coin('½ oz', k && k.halfOz, 'half'), coin('¼ oz', k && k.quarterOz, 'quarter')].join('\n'),
    H_KG_SELL: kg ? m(kg.sell) : '–', H_KG_BUY: kg ? m(kg.buy) : '–', H_KG_SPREAD: kg ? nf(kg.spread) + '%' : '–', H_KG_DATE: k ? longDate(k.date, lang) : '–',
    H_CHART: ch ? `<svg class="gold-chart" viewBox="0 0 600 160" preserveAspectRatio="none" role="img" aria-label="${L ? 'Harga jualan Kijang Emas segram' : 'Kijang Emas selling price per gram'}, ${longDate(ch.first, lang)}–${longDate(ch.last, lang)}"><polyline points="${ch.points}" /></svg>
      <p class="chart-legend"><span>${longDate(ch.first, lang)}</span><span>${L ? 'Rendah' : 'Low'} ${m(ch.min)} · ${L ? 'Tinggi' : 'High'} ${m(ch.max)} · ${ch.change >= 0 ? '+' : ''}${nf(ch.change)}%</span><span>${longDate(ch.last, lang)}</span></p>`
      : `<p class="note">${L ? 'Carta dipaparkan selepas beberapa hari harga dikumpul.' : 'The chart appears once a few days of prices are collected.'}</p>`,
    H_ZAKAT: pure ? (pure.rm * 0.999).toFixed(2) : '',
    H_PURITY_OPTIONS: G.PURITIES.map(([f, kk]) => opt(f, `${f} (${kk}K)`, f === 916)).join(''),
    H_API: esc(site.goldApi || ''), H_SNAPSHOT: JSON.stringify(snap).replace(/</g, '\\u003c'),
    H_JEWEL: pure ? m(G.jewellery({ weight: 10, fineness: 916, making: 30 }, pure.rm).fair) : '–',
    H_JMETAL: pure ? m(G.jewellery({ weight: 10, fineness: 916, making: 30 }, pure.rm).metal) : '–',
    H_JLABOUR: m(300),
    H_VERIFIED: longDate(G.FACTS.verified, lang), H_VERIFIED_ISO: G.FACTS.verified
  };
}
// ---- Parcel tracking (EN + BM): the tracker box, courier directory and number-format table come from
// tracking-core.js. Courier pages set "courier" in front matter to preset the tracker to that courier.
const TRACK_TEXT = {
  en: {
    h: c => c ? `Track a ${c.short} parcel` : 'Track a parcel', label: 'Tracking number', eg: 'e.g.',
    help: 'Find it in your order page, SMS or on the consignment note.', go: 'Track parcel', paste: 'Paste',
    recent: 'Recent on this device', clear: 'Clear list', result: 'Courier and tracking link',
    idle: c => c ? `Enter your ${c.short} tracking number to open ${c.short}'s official tracking page.` : 'Enter a number to see the matching courier. You can also choose a courier below.',
    copied: 'The number is copied. If the courier page opens empty, paste it into its search box.',
    status: 'Show status on this page', statusNote: 'Loads the free 17TRACK viewer, which sends this number to 17TRACK.',
    all: n => `All couriers (${n})`
  },
  ms: {
    h: c => c ? `Semak parcel ${c.short}` : 'Semak parcel', label: 'Nombor tracking', eg: 'cth.',
    help: 'Ada di halaman pesanan, SMS atau pada nota konsainan.', go: 'Semak parcel', paste: 'Tampal',
    recent: 'Terkini dalam peranti ini', clear: 'Kosongkan senarai', result: 'Kurier dan pautan tracking',
    idle: c => c ? `Masukkan nombor tracking ${c.short} untuk membuka laman tracking rasmi ${c.short}.` : 'Masukkan nombor untuk melihat kurier yang sepadan. Anda juga boleh memilih kurier di bawah.',
    copied: 'Nombor telah disalin. Jika laman kurier dibuka kosong, tampal ke dalam kotak cariannya.',
    status: 'Papar status di halaman ini', statusNote: 'Memuatkan paparan percuma 17TRACK, yang menghantar nombor ini kepada 17TRACK.',
    all: n => `Semua kurier (${n})`
  }
};
function trackMap(lang, p = {}) {
  const L = lang === 'ms' ? 1 : 0, t = TRACK_TEXT[lang];
  const preset = p.courier ? tracking.byId[p.courier] : null;
  if (p.courier && !preset) { console.error(`Unknown courier "${p.courier}" on ${p.path}`); process.exit(1); }
  const grid = tracking.COURIERS.map(c =>
    `<li><a class="courier" data-id="${c.id}" href="${esc(c.home)}" target="_blank" rel="noopener">${esc(c.name)}<small>${esc(c.format[L])}</small></a></li>`).join('\n');
  const level = s => [L ? 'Ditentukan oleh huruf awalan' : 'Set by the prefix', L ? 'Format biasa' : 'Usual format', L ? 'Dikongsi dengan kurier lain' : 'Shared with other couriers'][3 - s];
  const formats = tracking.COURIERS.map(c => {
    const best = c.tests.reduce((m, x) => Math.max(m, x[1]), 0);
    return `<tr><th scope="row"><a href="${esc(c.site)}" rel="noopener">${esc(c.name)}</a></th><td>${esc(c.format[L])}</td><td>${c.example ? `<code>${esc(c.example)}</code>` : '–'}</td><td>${best ? level(best) : (L ? 'Pilih kurier secara manual' : 'Choose the courier manually')}</td></tr>`;
  }).join('\n');
  const tool = `<div class="calc">
    <form class="box" id="trackForm" novalidate aria-labelledby="track-h"${preset ? ` data-courier="${preset.id}"` : ''}>
      <h2 id="track-h">${esc(t.h(preset))}</h2>
      <div class="field">
        <label for="trackNo">${t.label}</label>
        <div class="input"><input id="trackNo" name="n" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="40" placeholder="${t.eg} ${esc((preset && preset.example) || 'ER123456789MY')}" aria-describedby="trackHelp"></div>
        <p class="help" id="trackHelp">${t.help}</p>
      </div>
      <div class="track-actions">
        <button type="submit" class="btn">${t.go}</button>
        <button type="button" class="btn ghost" id="trackPaste" hidden>${t.paste}</button>
      </div>
      <div class="saved" id="savedBox" hidden>
        <p class="sub-h">${t.recent}</p>
        <ul class="saved-list" id="savedList"></ul>
        <button type="button" class="btn ghost sm" id="savedClear">${t.clear}</button>
      </div>
    </form>

    <section class="box" aria-labelledby="track-result-h">
      <h2 id="track-result-h">${t.result}</h2>
      <p class="note" id="trackMsg">${esc(t.idle(preset))}</p>
      <ul class="matches" id="trackMatches"></ul>
      <p class="sr-only" id="trackLive" aria-live="polite"></p>
      <p class="note" id="trackCopied" hidden>${t.copied}</p>
      <div class="status-wrap" id="statusWrap" hidden>
        <button type="button" class="btn ghost sm" id="statusBtn">${t.status}</button>
        <p class="help">${t.statusNote}</p>
        <div id="yqStatus" class="status-frame"></div>
      </div>
      <div class="tool-actions"></div>
    </section>
  </div>

  <section aria-labelledby="couriers-h">
    <h2 class="sub-h" id="couriers-h">${t.all(tracking.COURIERS.length)}</h2>
    <ul class="couriers" id="courierGrid">
${grid}
    </ul>
  </section>`;
  return {
    TR_TOOL: tool, TR_FORMATS: formats, TR_COUNT: tracking.COURIERS.length,
    TR_VERIFIED: longDate(tracking.FACTS.verified, lang), TR_VERIFIED_ISO: tracking.FACTS.verified
  };
}
// ---- "Near me" courier finder (EN + BM): location or area -> Google Maps search; no branch data to maintain
const NEAR_TEXT = {
  en: { h: c => `Find ${c} near you`, locate: 'Use my location', locHelp: 'Your browser asks first. Your location is not sent to this site.',
    area: 'Or search an area', eg: 'e.g. Bangi or 43000', search: 'Search this area', result: 'Branches on Google Maps',
    idle: 'Tap Use my location, or search an area. Links open Google Maps.', open: q => `Open ${q} near me in Google Maps`, track: c => `Track a ${c} parcel` },
  ms: { h: c => `Cari ${c} berhampiran anda`, locate: 'Guna lokasi saya', locHelp: 'Pelayar anda akan bertanya dahulu. Lokasi anda tidak dihantar ke laman ini.',
    area: 'Atau cari mengikut kawasan', eg: 'cth. Bangi atau 43000', search: 'Cari kawasan ini', result: 'Cawangan di Google Maps',
    idle: 'Tekan Guna lokasi saya, atau cari kawasan. Pautan membuka Google Maps.', open: q => `Buka ${q} berhampiran di Google Maps`, track: c => `Semak tracking ${c}` }
};
function nearMap(lang, p = {}) {
  const c = tracking.byId[p.courier], queries = tracking.MAPS[p.courier], t = NEAR_TEXT[lang];
  if (!c || !queries) { console.error(`Unknown near-me courier "${p.courier}" on ${p.path}`); process.exit(1); }
  return {
    NR_TOOL: `<div class="calc">
    <form class="box" id="nearForm" novalidate aria-labelledby="near-h" data-courier="${c.id}">
      <h2 id="near-h">${esc(t.h(c.short))}</h2>
      <button type="button" class="btn" id="nearLocate">${t.locate}</button>
      <p class="help">${t.locHelp}</p>
      <div class="field near-area">
        <label for="nearArea">${t.area}</label>
        <div class="input"><input id="nearArea" name="area" type="text" autocomplete="address-level2" maxlength="60" placeholder="${t.eg}"></div>
      </div>
      <button type="submit" class="btn ghost">${t.search}</button>
    </form>

    <section class="box" aria-labelledby="near-result-h">
      <h2 id="near-result-h">${t.result}</h2>
      <p class="note" id="nearMsg" aria-live="polite">${t.idle}</p>
      <ul class="near-links" id="nearLinks">
        <li><a class="btn ghost sm" href="${esc(tracking.mapsUrl(queries[0]))}" target="_blank" rel="noopener">${esc(t.open(queries[0]))}</a></li>
      </ul>
      <p class="note"><a href="${esc(p.trackPage)}">${esc(t.track(c.short))}</a></p>
    </section>
  </div>`
  };
}
// ---- CSS minifier: the sample result and every before/after example come from the shipped minifier
const CSS_RULES = [
  ['Comments and line breaks', '/* Header */\n.nav {\n  margin: 0;\n}'],
  ['Spaces around { } : ; , and combinators', '.nav > li , .nav a { color : red ; }'],
  ['Last semicolon in a rule', 'a{color:red;}'],
  ['Long hex colours', 'a{color:#FFFFFF;background:#3366ff}'],
  ['Leading and trailing zeros', 'a{margin:0.50em 1.0rem}'],
  ['Units on zero lengths', 'a{padding:0px 16px}'],
  ['Space before !important', 'a{color:red !important}'],
  ['Empty rules', '.unused{}\n.b{color:red}'],
  ['Licence comment (kept)', '/*! MIT */\n.b{color:red}'],
  ['calc() spacing (kept)', 'a{width:calc(100% - 2rem)}']
];
function cssMap() {
  const out = cssCore.minify(cssCore.SAMPLE).css, s = cssCore.saving(cssCore.SAMPLE, out);
  const n = x => x.toLocaleString('en-US');
  return {
    CSS_IN: esc(cssCore.SAMPLE), CSS_OUT: esc(out), CSS_BEFORE: n(s.before), CSS_AFTER: n(s.after), CSS_PCT: s.percent,
    CSS_STATS: `<strong>${s.before} B → ${s.after} B</strong> (${s.percent}% smaller)<span id="cssGz">${gzText(out)}</span>`,
    CSS_EXAMPLES: CSS_RULES.map(([rule, css]) =>
      `        <tr><th scope="row">${rule}</th><td><code>${esc(css).replace(/\n/g, '<br>')}</code></td><td><code>${esc(cssCore.minify(css).css)}</code></td></tr>`).join('\n')
  };
}
// ---- JavaScript minifier: sample output, examples and obfuscation sizes come from the vendored Terser
// and javascript-obfuscator the page loads, run here in a VM (fixed seed, so the numbers are reproducible).
const jsVm = { console, setTimeout, clearTimeout, setInterval, clearInterval };
jsVm.globalThis = jsVm;
jsVm.self = jsVm;
vm.createContext(jsVm);
for (const f of Object.values(jsCore.VENDOR)) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), jsVm);
const jsLibs = { terser: jsVm.Terser, obfuscator: jsVm.JavaScriptObfuscator };
const JS_RULES = [
  ['Comments and whitespace', '// Add two numbers\nfunction add(first, second) {\n  return first + second;\n}'],
  ['Local names shortened', 'function greet(userName) {\n  const message = "Hi " + userName;\n  return message;\n}'],
  ['Constants calculated in advance', 'var secondsPerDay = 60 * 60 * 24;'],
  ['Unreachable code removed', 'function f() {\n  if (false) { console.log("never"); }\n  return 1;\n}'],
  ['if/return shortened', 'function check(ok) {\n  if (!ok) {\n    return;\n  }\n  start();\n}'],
  ['debugger removed', 'function f(a) {\n  debugger;\n  return a * 2;\n}'],
  ['Licence comment kept', '/*! MyLib v1 | MIT */\nvar x = 1;']
];
const jsSample = await jsCore.run(jsLibs, jsCore.SAMPLE, {});
const jsExamples = await Promise.all(JS_RULES.map(([, code]) => jsCore.run(jsLibs, code, {})));
const jsObf = {};
for (const level of ['low', 'medium', 'high']) jsObf[level] = jsCore.bytes((await jsCore.run(jsLibs, jsCore.SAMPLE, { mode: 'obfuscate', level, seed: 1 })).code);
if (jsSample.error || jsExamples.some(r => r.error)) { console.error('JavaScript minifier examples failed'); process.exit(1); }
function jsMap() {
  const s = jsCore.saving(jsCore.SAMPLE, jsSample.code), n = x => x.toLocaleString('en-US');
  const code = c => `<code>${esc(c).replace(/\n/g, '<br>')}</code>`;
  return {
    JS_IN: esc(jsCore.SAMPLE), JS_OUT: esc(jsSample.code), JS_BEFORE: n(s.before), JS_AFTER: n(s.after), JS_PCT: s.percent,
    JS_STATS: `<strong>${s.before} B → ${s.after} B</strong> (${s.percent}% smaller)<span id="jsGz">${gzText(jsSample.code)}</span>`,
    JS_OBF_LOW: n(jsObf.low), JS_OBF_MEDIUM: n(jsObf.medium), JS_OBF_HIGH: n(jsObf.high),
    JS_EXAMPLES: JS_RULES.map(([rule, src], i) => `        <tr><th scope="row">${rule}</th><td>${code(src)}</td><td>${code(jsExamples[i].code)}</td></tr>`).join('\n')
  };
}
// ---- HTML beautifier: the sample result, its check and the preset sizes come from the vendored libraries.
const htmlVm = { console, setTimeout, clearTimeout };
htmlVm.globalThis = htmlVm;
htmlVm.self = htmlVm;
vm.createContext(htmlVm);
for (const f of Object.values(htmlCore.VENDOR)) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), htmlVm);
const htmlLibs = { minifier: htmlVm.HTMLMinifier, beautifier: htmlVm.jsBeautify };
const htmlSample = await htmlCore.run(htmlLibs, htmlCore.SAMPLE, {});
const htmlPresetSize = {};
for (const preset of Object.keys(htmlCore.PRESETS)) {
  const r = await htmlCore.run(htmlLibs, htmlCore.SAMPLE, { mode: 'minify', preset });
  if (r.error) { console.error(`HTML minifier preset ${preset} failed: ${r.error.message}`); process.exit(1); }
  htmlPresetSize[preset] = htmlCore.bytes(r.code);
}
if (htmlSample.error) { console.error('HTML beautifier sample failed'); process.exit(1); }
const HTML_LABELS = {
  collapseWhitespace: 'Collapse whitespace', conservativeCollapse: 'Keep one space where there was whitespace',
  preserveLineBreaks: 'Keep a line break where there was one', removeComments: 'Remove comments (keeps <!--! licence --> comments)',
  keepConditional: 'Keep conditional comments (<!--[if …]>)', minifyCSS: 'Minify inline CSS', minifyJS: 'Minify inline JavaScript',
  removeRedundantAttributes: 'Remove default attributes (method="get", type="text")', removeScriptTypeAttributes: 'Remove type="text/javascript"',
  removeStyleLinkTypeAttributes: 'Remove type="text/css"', collapseBooleanAttributes: 'Shorten boolean attributes (disabled="disabled" to disabled)',
  useShortDoctype: 'Use <!doctype html>', removeEmptyAttributes: 'Remove empty class, id and style attributes',
  removeAttributeQuotes: 'Remove attribute quotes where allowed', removeOptionalTags: 'Remove optional tags (</p>, </li>, <head>)',
  sortAttributes: 'Sort attributes (better gzip)', sortClassName: 'Sort class names (better gzip)',
  decodeEntities: 'Use characters instead of entities where safe', keepClosingSlash: 'Keep closing slashes (<br/>) for XML',
  caseSensitive: 'Keep tag and attribute case (XML)', protectTemplates: 'Protect template tags and CDATA'
};
if (htmlCore.MINIFY_KEYS.some(k => !HTML_LABELS[k])) { console.error('Missing HTML minifier option label'); process.exit(1); }
function htmlMap() {
  const s = htmlCore.saving(htmlCore.SAMPLE, htmlSample.code), n = x => x.toLocaleString('en-US');
  const issues = htmlCore.check(htmlCore.SAMPLE), sum = htmlCore.summarize(issues), safe = htmlCore.PRESETS.safe;
  return {
    HTML_IN: esc(htmlCore.SAMPLE), HTML_OUT: esc(htmlSample.code), HTML_BEFORE: n(s.before),
    HTML_STATS: `<strong>${s.before} B → ${s.after} B</strong> (${s.saved >= 0 ? s.percent + '% smaller' : Math.abs(s.percent) + '% larger'})<span id="htmlGz">${gzText(htmlSample.code)}</span>`,
    HTML_SAFE: n(htmlPresetSize.safe), HTML_MAX: n(htmlPresetSize.max), HTML_XML: n(htmlPresetSize.xml), HTML_EMAIL: n(htmlPresetSize.email),
    HTML_ISSUE_SUM: esc(sum.text), HTML_ISSUE_STATE: sum.state, HTML_ISSUE_LIST: htmlCore.issuesHtml(issues),
    HTML_MIN_CHECKS: htmlCore.MINIFY_KEYS.map(k => `          <label class="check"><input type="checkbox" name="${k}"${safe[k] ? ' checked' : ''}> <span>${esc(HTML_LABELS[k])}</span></label>`).join('\n')
  };
}
// ---- Unused CSS remover: the sample is cleaned with the shipped core. Keyword matching runs without a DOM and,
// for this sample, keeps exactly what the page's exact mode keeps (the browser tests check both).
function purgeMap() {
  const r = purgeCore.purge([{ name: 'Stylesheet 1', css: purgeCore.SAMPLE_CSS }],
    { match: purgeCore.keywordMatcher(purgeCore.keywords([purgeCore.SAMPLE_HTML])), safePresets: ['state'] });
  const out = cssCore.minify(r.files[0].css).css, s = cssCore.saving(purgeCore.SAMPLE_CSS, out), rep = purgeCore.reportHtml(r.report);
  const box = (kind, name, text) => `            <div class="src" data-name="${name}"><div class="src-head"><label for="src-${kind}-0">${name}</label><button type="button" class="link-btn src-del" aria-label="Remove ${name}">Remove</button></div><textarea class="code code-sm" id="src-${kind}-0" spellcheck="false" autocomplete="off" autocapitalize="off">${esc(text)}</textarea></div>`;
  return {
    PURGE_CSS_SRC: box('css', 'Stylesheet 1', purgeCore.SAMPLE_CSS), PURGE_HTML_SRC: box('html', 'Page 1', purgeCore.SAMPLE_HTML),
    PURGE_OUT: esc(out), PURGE_STATS: purgeCore.statsHtml(purgeCore.SAMPLE_CSS, out, r.report, 1, gzText(out)), PURGE_PCT: s.percent,
    PURGE_REMOVED: r.report.selectorsRemoved, PURGE_REPORT_SUM: esc(rep.summary), PURGE_REPORT_BODY: rep.body,
    PURGE_PROXY: esc(site.corsProxy || ''),
    PURGE_URL_HELP: site.corsProxy ? 'Sites that block other sites from reading them are loaded through a read-only proxy.'
      : 'Many sites, including Blogger blogs, block other sites from reading them. If a page is blocked, use the capture below.'
  };
}
// ---- AI Prompt Generator and Image to Prompt, EN + BM (one core). Prompt terms stay in English on both pages.
const PROMPT_EXAMPLE = { mode: 'image', platform: 'midjourney', aspect: '4:5', subject: 'a cat wearing a tiny songkok', setting: 'a neon-lit Kuala Lumpur street at night', lighting: 'neon glow', shot: 'close-up portrait', lens: '85mm portrait lens', mood: 'whimsical', negative: 'blurry, text, watermark' };
const VIDEO_EXAMPLE = { mode: 'video', platform: 'veo', subject: 'a chef tossing noodles in a flaming wok', setting: 'a busy hawker stall at night', motion: 'slow dolly in', shot: 'medium shot', lighting: 'neon glow', sound: 'sizzling wok, crowd chatter', dialogue: 'Siap!', negative: 'blurry' };
// What a vision model returns for a typical upload: the page's example before a picture is chosen.
const IMG_EXAMPLE = { mode: 'image', platform: 'midjourney', aspect: '3:2', subject: 'a red vintage scooter', setting: 'a quiet street lined with old shophouses', style: 'photo', lighting: 'warm afternoon sunlight', shot: 'eye-level side view', mood: 'nostalgic', color: 'red, cream and teal', details: 'potted plants by the doors, long shadows on the pavement' };
const PROMPT_UI = {
  en: { any: 'Any', words: n => `${n} words`, tokens: n => `~${n} tokens`, copy: 'Copy', copyNeg: 'Copy negative', save: '☆ Save', neg: 'Negative prompt:',
    groups: { style: 'Style', lighting: 'Lighting', shot: 'Framing', lens: 'Lens', mood: 'Mood', color: 'Colour', quality: 'Finish', motion: 'Camera movement', pace: 'Speed' } },
  ms: { any: 'Bebas', words: n => `${n} patah perkataan`, tokens: n => `~${n} token`, copy: 'Salin', copyNeg: 'Salin negatif', save: '☆ Simpan', neg: 'Prompt negatif:',
    groups: { style: 'Gaya', lighting: 'Pencahayaan', shot: 'Sudut kamera', lens: 'Lensa', mood: 'Suasana', color: 'Warna', quality: 'Kemasan', motion: 'Pergerakan kamera', pace: 'Kelajuan' } }
};
const ONLY = { lens: 'image', quality: 'image', motion: 'video', pace: 'video' };
function promptCards(state, lang) {
  const U = PROMPT_UI[lang], s = promptCore.normalize(state), all = promptCore.buildAll(s, lang);
  const card = r => `        <article class="pcard">
          <h3>${esc(r.label)}<small id="pm-${r.kind}">${s.platform === 'sd' ? U.tokens(r.tokens) : U.words(r.words)}</small></h3>
          <p class="pc-text" id="pt-${r.kind}">${esc(r.prompt)}</p>
          <p class="pc-neg" id="pn-${r.kind}"${r.negative ? '' : ' hidden'}><strong>${U.neg}</strong> <span id="pnt-${r.kind}">${esc(r.negative)}</span></p>
          <div class="pc-actions"><button type="button" class="btn sm" data-copy="${r.kind}">${U.copy}</button><button type="button" class="btn ghost sm" data-copy="${r.kind}-neg" id="pcn-${r.kind}"${r.negative ? '' : ' hidden'}>${U.copyNeg}</button><button type="button" class="btn ghost sm" data-save="${r.kind}">${U.save}</button></div>
        </article>`;
  return {
    P_CARDS: all.map(card).join('\n'), P_PLATFORM: esc(promptCore.PLATFORMS[s.mode][s.platform].name),
    P_NOTES: all[0].notes.map(n => `<li>${esc(n)}</li>`).join(''), P_NOTES_HIDDEN: all[0].notes.length ? '' : ' hidden'
  };
}
const platformOptions = (mode, sel) => Object.entries(promptCore.PLATFORMS[mode]).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(v.name)}</option>`).join('');
const aspectOptions = sel => promptCore.ASPECTS.map(a => `<option value="${a}"${a === sel ? ' selected' : ''}>${a}</option>`).join('');
function chipGroups(state, lang) {
  const U = PROMPT_UI[lang];
  return Object.keys(promptCore.GROUPS).map(g => {
    const only = ONLY[g], hidden = only && only !== state.mode;
    const chips = ['', ...promptCore.GROUPS[g]].map(v => `<label><input type="radio" name="${g}" value="${esc(v)}"${(state[g] || '') === v ? ' checked' : ''}>${v ? esc(v) : U.any}</label>`).join('');
    return `      <fieldset class="field-group"${only ? ` data-only="${only}"` : ''}${hidden ? ' hidden' : ''}><legend>${U.groups[g]}</legend><div class="chipset" data-group="${g}">${chips}</div></fieldset>`;
  }).join('\n');
}
function promptExamples(lang) {
  const rows = [[PROMPT_EXAMPLE, 'midjourney'], [PROMPT_EXAMPLE, 'sd'], [PROMPT_EXAMPLE, 'dalle'], [PROMPT_EXAMPLE, 'flux'], [VIDEO_EXAMPLE, 'veo'], [VIDEO_EXAMPLE, 'runway'], [VIDEO_EXAMPLE, 'kling']];
  return rows.map(([ex, platform]) => {
    const r = promptCore.build({ ...ex, platform }, 'main', lang);
    return `<tr><th scope="row">${esc(r.platform)}</th><td>${esc(r.prompt)}${r.negative ? `<small>${PROMPT_UI[lang].neg} ${esc(r.negative)}</small>` : ''}</td></tr>`;
  }).join('\n');
}
function promptMap(lang) {
  const s = promptCore.normalize(PROMPT_EXAMPLE), mj = promptCore.build(s, 'main', lang);
  return {
    ...promptCards(s, lang), P_CHIPS: chipGroups(s, lang), P_PLATFORM_OPTIONS: platformOptions('image', s.platform), P_ASPECT_OPTIONS: aspectOptions(s.aspect),
    P_SUBJECT: esc(s.subject), P_SETTING: esc(s.setting), P_NEGATIVE: esc(s.negative), P_EXAMPLES: promptExamples(lang), P_MJ: esc(mj.prompt),
    P_VEO: esc(promptCore.build(VIDEO_EXAMPLE, 'main', lang).prompt), P_HASH: promptCore.toHash(s),
    P_VERIFIED: longDate(promptCore.FACTS.verified, lang), P_VERIFIED_ISO: promptCore.FACTS.verified
  };
}
function imgMap(lang) {
  const s = promptCore.normalize(IMG_EXAMPLE);
  return {
    ...promptCards(s, lang), P_PLATFORM_OPTIONS: platformOptions('image', s.platform), P_ASPECT_OPTIONS: aspectOptions(s.aspect),
    ...Object.fromEntries(['subject', 'action', 'setting', 'style', 'lighting', 'shot', 'mood', 'color', 'details'].map(k => ['I_' + k.toUpperCase(), esc(s[k])])),
    P_HASH: promptCore.toHash(s), I_API: esc(site.visionApi || ''), P_MJ: esc(promptCore.build(s, 'main', lang).prompt),
    P_VERIFIED: longDate(promptCore.FACTS.verified, lang), P_VERIFIED_ISO: promptCore.FACTS.verified
  };
}
// ---- Fuel cost (kalkulator minyak), EN + BM: this week's prices come from tools-src/fuel-data.json (data.gov.my).
const fuelLatest = fuelCore.latest(fuelData.history);
const FUEL_EXAMPLE = { distance: 350, consumption: 7, unit: 'l100', roundTrip: 'no', passengers: 1, toll: 0, fuel: 'ron95_budi95' };
function fuelMap(lang) {
  const L = lang === 'ms' ? 1 : 0, P = fuelLatest.prices, N = fuelCore.LABELS[lang], m = n => money(n, lang);
  const nf = (n, d = 2) => new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY', { maximumFractionDigits: d }).format(n);
  const sen = n => nf(n * 100, 1) + ' sen';
  const rm = n => money(n, lang);
  const opt = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  const fuels = fuelCore.FUELS.filter(k => P[k]);
  const r = fuelCore.trip({ ...FUEL_EXAMPLE, price: P.ron95_budi95 });
  const lines = [[L ? 'Jarak' : 'Distance', nf(r.km, 1) + ' km'], [L ? 'Minyak diperlukan' : 'Fuel needed', nf(r.litres) + ' L'], [L ? 'Kos minyak' : 'Fuel cost', m(r.fuel)],
    [L ? 'Kos sekilometer' : 'Cost per km', sen(r.perKm)]].map(([a, b]) => `<tr><th scope="row">${a}</th><td>${b}</td></tr>`);
  lines.push(`<tr class="total"><th scope="row">${L ? 'Jumlah kos perjalanan' : 'Total trip cost'}</th><td>${m(r.total)}</td></tr>`);
  const end = d => new Date(Date.parse(d) + 6 * 864e5).toISOString().slice(0, 10);
  const week = d => { const e = end(d); return d.slice(0, 7) === e.slice(0, 7) ? `${+d.slice(8)}–${longDate(e, lang)}` : `${longDate(d, lang)} – ${longDate(e, lang)}`; };
  const change = c => !c ? (L ? 'Tiada perubahan' : 'No change') : (c > 0 ? '▲ ' : '▼ ') + nf(Math.abs(c) * 100, 0) + ' sen';
  const prices = fuels.map(k => `<tr><th scope="row">${esc(N[k])}</th><td><strong>${rm(P[k])}</strong></td><td>${change(fuelLatest.change[k])}</td></tr>`).join('\n');
  const hist = fuelData.history.slice(-8).reverse().map(h => `<tr><th scope="row">${longDate(h.date, lang)}</th>${['ron95_budi95', 'ron95', 'ron97', 'diesel', 'diesel_eastmsia'].map(k => `<td>${h[k] ? rm(h[k]) : '–'}</td>`).join('')}</tr>`).join('\n');
  const cols = ['ron95_budi95', 'ron95', 'ron97', 'diesel'];
  const perKm = [5, 6, 7, 8, 10, 12].map(c => `<tr><th scope="row">${c} L/100 km <small>${nf(100 / c, 1)} km/L</small></th>${cols.map(k => `<td>${sen(c / 100 * P[k])}</td>`).join('')}</tr>`).join('\n');
  const dist = [50, 100, 200, 350, 500, 1000].map(d => `<tr><th scope="row">${nf(d, 0)} km</th>${cols.map(k => `<td>${m(fuelCore.trip({ distance: d, consumption: 7, price: P[k] }).fuel)}</td>`).join('')}</tr>`).join('\n');
  const mo = fuelCore.monthly(2000 * 7 / 100, 'ron95_budi95', P), big = fuelCore.monthly(5000 * 7 / 100, 'ron95_budi95', P);
  const r97 = fuelCore.trip({ ...FUEL_EXAMPLE, price: P.ron97 }), r95 = fuelCore.trip({ ...FUEL_EXAMPLE, price: P.ron95 }), rd = fuelCore.trip({ ...FUEL_EXAMPLE, price: P.diesel });
  return {
    F_DISTANCE: FUEL_EXAMPLE.distance, F_CONS: FUEL_EXAMPLE.consumption, F_PRICE: P.ron95_budi95.toFixed(2), F_QUOTA: fuelCore.FACTS.budiQuota,
    F_FUEL_OPTIONS: fuels.map((k, i) => `<option value="${k}" data-price="${P[k].toFixed(2)}"${i === 0 ? ' selected' : ''}>${esc(N[k])} – ${rm(P[k])}</option>`).join(''),
    F_UNIT_OPTIONS: [opt('l100', 'L/100 km', 'L/100 km', true), opt('kml', 'km/L', 'km/L')].join(''),
    F_RT_OPTIONS: [opt('no', 'One way', 'Sehala', true), opt('yes', 'Return trip', 'Pergi balik')].join(''),
    F_HEAD: L ? 'Kos minyak perjalanan' : 'Fuel cost for the trip',
    F_TOTAL: m(r.total), F_SUB: L ? `${nf(r.litres)} liter · ${sen(r.perKm)}/km · ${m(r.perPerson)} seorang` : `${nf(r.litres)} litres · ${sen(r.perKm)}/km · ${m(r.perPerson)} per person`,
    F_LINES: lines.join('\n'), F_PRICES: prices, F_HISTORY: hist, F_PERKM: perKm, F_DIST: dist,
    F_WEEK: week(fuelLatest.date), F_WEEK_ISO: fuelLatest.date,
    F_BUDI95: rm(P.ron95_budi95), F_RON95: rm(P.ron95), F_RON97: rm(P.ron97), F_DIESEL: rm(P.diesel), F_DIESEL_EAST: rm(P.diesel_eastmsia || 0), F_DIESEL_BUDI: rm(P.diesel_budi || 0),
    F_EX_BUDI: m(r.fuel), F_EX_RON95: m(r95.fuel), F_EX_RON97: m(r97.fuel), F_EX_DIESEL: m(rd.fuel), F_EX_LITRES: nf(r.litres), F_EX_PERKM: sen(r.perKm), F_EX_PERKM97: sen(r97.perKm),
    F_MO_COST: m(mo.cost), F_MO_LITRES: nf(mo.litres, 0), F_BIG_COST: m(big.cost), F_BIG_LITRES: nf(big.litres, 0), F_BIG_OVER: nf(big.over, 0), F_BIG_SAVING: m(big.saving),
    F_GAP: m(P.ron95 - P.ron95_budi95),
    F_VERIFIED: longDate(fuelCore.FACTS.verified, lang), F_VERIFIED_ISO: fuelCore.FACTS.verified
  };
}
// ---- NCD (no claim discount), EN + BM
const NCD_EXAMPLE = { type: 'car', years: 5, gross: 2000, repair: 2000, sumInsured: 70000, cc: 1500 };
function ncdMap(lang) {
  const L = lang === 'ms' ? 1 : 0, m = n => money(n, lang), S = ncdCore.SCALE;
  const pc = n => `${Number(n.toFixed(2))}%`;
  const opt = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  const yrs = y => y >= 5 ? (L ? '5 tahun atau lebih' : '5 years or more') : L ? `${y} tahun` : `${y} ${y === 1 ? 'year' : 'years'}`;
  const r = ncdCore.calculate(NCD_EXAMPLE), p = r.premium;
  const lines = [[L ? 'Premium kasar (sebelum NCD)' : 'Gross premium (before NCD)', m(p.gross)], [`${L ? 'Diskaun NCD' : 'NCD discount'} (${pc(r.ncd)})`, '− ' + m(p.discount)],
    [L ? 'Premium selepas NCD' : 'Premium after NCD', m(p.net)], ['SST 8%', m(p.sst)], [L ? 'Duti setem' : 'Stamp duty', m(p.stamp)]]
    .map(([a, b]) => `<tr><th scope="row">${a}</th><td>${b}</td></tr>`);
  lines.push(`<tr class="total"><th scope="row">${L ? 'Jumlah dibayar' : 'Total to pay'}</th><td>${m(p.total)}</td></tr>`);
  const ladder = r.ladder.map(l => `<tr${l.years === r.years ? ' class="total"' : ''}><th scope="row">${yrs(l.years)}</th><td>${pc(l.ncd)}</td><td>${m(l.total)}</td></tr>`).join('\n');
  const claim = r.claim.rows.map(x => `<tr><th scope="row">${x.renewal}</th><td>${pc(x.keep)}</td><td>${pc(x.after)}</td><td>${m(x.extra)}</td></tr>`).join('\n');
  const scale = [0, 1, 2, 3, 4, 5].map(y => `<tr><th scope="row">${yrs(y)}</th><td>${pc(S.car[y])}</td><td>${pc(S.motorcycle[y])}</td><td>${pc(S.commercial[y])}</td></tr>`).join('\n');
  const prem = [800, 1500, 2000, 3000, 4000].map(g => `<tr><th scope="row">${m(g)}</th>${[0, 25, 30, 38.33, 45, 55].map(n => `<td>${m(ncdCore.premium(g, n).total)}</td>`).join('')}</tr>`).join('\n');
  const est = carCore.insurance(NCD_EXAMPLE.sumInsured, NCD_EXAMPLE.cc, 0).gross;
  const claims = [1000, 2000, 3000, 4000].map(g => { const c = ncdCore.claimCost('car', 5, g); const c3 = ncdCore.claimCost('car', 3, g); return `<tr><th scope="row">${m(g)}</th><td>${m(c3.total)}</td><td>${m(c.total)}</td></tr>`; }).join('\n');
  const advice = r.repair > r.claim.total
    ? (L ? `Tuntut insurans: kos baiki ${m(r.repair)} melebihi ${m(r.claim.total)} premium tambahan akibat kehilangan NCD.` : `Claim: the ${m(r.repair)} repair costs more than the ${m(r.claim.total)} extra premium from losing your NCD.`)
    : (L ? `Bayar sendiri: kos baiki ${m(r.repair)} lebih rendah daripada ${m(r.claim.total)} premium tambahan akibat kehilangan NCD.` : `Pay it yourself: the ${m(r.repair)} repair costs less than the ${m(r.claim.total)} extra premium from losing your NCD.`);
  const c3 = ncdCore.claimCost('car', 3, 2000), moto = ncdCore.calculate({ type: 'motorcycle', years: 5, gross: 300 });
  return {
    N_TYPE_OPTIONS: [opt('car', 'Car', 'Kereta', true), opt('motorcycle', 'Motorcycle', 'Motosikal'), opt('commercial', 'Commercial', 'Komersial')].join(''),
    N_YEARS_OPTIONS: [0, 1, 2, 3, 4, 5].map(y => `<option value="${y}"${y === NCD_EXAMPLE.years ? ' selected' : ''}>${y === 5 ? (L ? '5+ tahun' : '5+ years') : yrs(y)}</option>`).join(''),
    N_BASIS_OPTIONS: [opt('gross', 'I know my premium before NCD', 'Saya tahu premium sebelum NCD', true), opt('estimate', 'Estimate from sum insured and cc', 'Anggar dari nilai dilindungi dan cc')].join(''),
    N_GROSS: NCD_EXAMPLE.gross, N_REPAIR: NCD_EXAMPLE.repair, N_SUM: NCD_EXAMPLE.sumInsured, N_CC: NCD_EXAMPLE.cc, N_EST_GROSS: m(est),
    N_RATE: pc(r.ncd), N_TOTAL: m(p.total), N_SAVE: m(p.discount), N_LINES: lines.join('\n'), N_LADDER: ladder, N_CLAIM: claim, N_CLAIM_TOTAL: m(r.claim.total),
    N_SUB: L ? `Anda jimat ${m(p.discount)} · NCD tahun depan ${pc(r.next)} jika tiada tuntutan` : `You save ${m(p.discount)} · next year ${pc(r.next)} if you make no claim`,
    N_ADVICE: advice, N_SCALE: scale, N_PREM: prem, N_CLAIMS: claims, N_C3: m(c3.total), N_MOTO: m(moto.premium.total), N_MOTO_SAVE: m(moto.premium.discount),
    N_VERIFIED: longDate(ncdCore.FACTS.verified, lang), N_VERIFIED_ISO: ncdCore.FACTS.verified
  };
}
// ---- Iddah and ihdad, BM + EN (dates on Malaysia's takwim from hijri-core.js)
const IDDAH_EXAMPLE = { event: 'divorce', date: '2026-10-14', consummated: 'yes', talak: 'rajie', state: 'haid', lastPeriod: '2026-10-01', cycle: 28, due: '' };
function iddahMap(lang) {
  const L = lang === 'ms' ? 1 : 0, r = iddahCore.calculate(IDDAH_EXAMPLE);
  const opt = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  const hj = iso => hijriCore.formatHijri(hijriCore.toHijri(iso), lang), gd = (iso, w) => hijriCore.formatGregorian(iso, lang, w);
  const both = iso => `${gd(iso)}<small>${hj(iso)}</small>`;
  const dayN = n => L ? `${n} hari` : `${n} ${n === 1 ? 'day' : 'days'}`;
  const lines = [[L ? 'Jenis iddah' : 'Type of iddah', L ? "Tiga kali suci (quru')" : "Three periods of purity (quru')"], [L ? 'Mula' : 'Starts', both(r.start)],
    ...r.periods.map((p, i) => [L ? `Haid ke-${i + 1} selepas talak` : `Period ${i + 1} after the talak`, both(p)])].map(([a, b]) => `<tr><th scope="row">${a}</th><td>${b}</td></tr>`);
  lines.push(`<tr class="total"><th scope="row">${L ? 'Tamat' : 'Ends'}</th><td>${both(r.end)}</td></tr>`,
    `<tr><th scope="row">${L ? 'Tempoh' : 'Length'}</th><td>${dayN(r.days)}</td></tr>`,
    `<tr><th scope="row">${L ? 'Boleh rujuk hingga' : 'Rujuk possible until'}</th><td>${both(r.end)}</td></tr>`,
    `<tr><th scope="row">${L ? 'Ihdad (berkabung)' : 'Ihdad (mourning)'}</th><td>${L ? 'Tidak wajib' : 'Not required'}</td></tr>`);
  const d = IDDAH_EXAMPLE.date, w = iddahCore.calculate({ event: 'death', date: d }), t = iddahCore.calculate({ event: 'divorce', date: d, state: 'nohaid' });
  const ex = [
    [L ? 'Cerai, masih haid (kitaran 28 hari)' : 'Divorce, still menstruating (28-day cycle)', r],
    [L ? 'Cerai, tiada haid (putus haid / belum haid)' : 'Divorce, not menstruating (menopause / never)', t],
    [L ? 'Kematian suami' : "Husband's death", w],
    [L ? 'Cerai sebelum bersetubuh' : 'Divorce before consummation', iddahCore.calculate({ event: 'divorce', date: d, consummated: 'no' })]
  ].map(([a, x]) => `<tr><th scope="row">${a}</th><td>${x.kind === 'none' ? (L ? 'Tiada iddah' : 'No iddah') : `${gd(x.end)}<small>${hj(x.end)}</small>`}</td><td>${dayN(x.days)}</td></tr>`).join('\n');
  const wafat = ['2026-11-01', '2027-01-15', '2027-03-10', '2027-06-06'].map(s => { const x = iddahCore.calculate({ event: 'death', date: s }); return `<tr><th scope="row">${gd(s)}<small>${hj(s)}</small></th><td>${gd(x.end)}<small>${hj(x.end)}</small></td><td>${dayN(x.days)}</td></tr>`; }).join('\n');
  return {
    I_EVENT_OPTIONS: [opt('divorce', 'Divorce (talak, khuluk or fasakh)', 'Perceraian (talak, khuluk atau fasakh)', true), opt('death', "Husband's death", 'Kematian suami')].join(''),
    I_CONS_OPTIONS: [opt('yes', 'Yes', 'Ya', true), opt('no', 'No', 'Tidak')].join(''),
    I_TALAK_OPTIONS: [opt('rajie', "Talak raj'i (first or second, revocable)", "Talak raj'i (kali pertama atau kedua)", true), opt('bain', 'Talak bain (third talak, khuluk or fasakh)', 'Talak bain (talak tiga, khuluk atau fasakh)')].join(''),
    I_STATE_OPTIONS: [opt('haid', 'Still menstruating', 'Masih haid', true), opt('nohaid', 'Not menstruating (menopause, never, or medical)', 'Tiada haid (putus haid, belum haid atau sebab perubatan)'), opt('pregnant', 'Pregnant', 'Hamil')].join(''),
    I_DATE: IDDAH_EXAMPLE.date, I_LAST: IDDAH_EXAMPLE.lastPeriod, I_CYCLE: IDDAH_EXAMPLE.cycle,
    I_END: gd(r.end, true), I_END_HIJRI: hj(r.end), I_SUB: `${L ? "Tiga kali suci (quru')" : "Three periods of purity (quru')"} · ${dayN(r.days)}`, I_LINES: lines.join('\n'),
    I_EXAMPLES: ex, I_WAFAT: wafat, I_EX_DATE: gd(d), I_EX_DATE_H: hj(d), I_EX_END: gd(r.end), I_EX_DAYS: r.days,
    I_W_END: gd(w.end), I_W_END_H: hj(w.end), I_W_DAYS: w.days, I_T_END: gd(t.end), I_T_DAYS: t.days,
    I_VERIFIED: longDate(iddahCore.FACTS.verified, lang), I_VERIFIED_ISO: iddahCore.FACTS.verified
  };
}
// ---- Hijri ⇄ Gregorian (Malaysia's takwim), BM + EN. "Today" is baked as the page date; the script refreshes it.
function hijriMap(lang, p) {
  const L = lang === 'ms' ? 1 : 0, H = hijriCore, day = p.dateModified, h = H.toHijri(day);
  const hj = (x) => H.formatHijri(x, lang), gd = (iso, w) => H.formatGregorian(iso, lang, w);
  const lines = [[L ? 'Tarikh Hijrah' : 'Hijri date', hj(h), 'total'], [L ? 'Tarikh Masihi' : 'Gregorian date', gd(day)], [L ? 'Hari' : 'Day', H.DAYS[lang][H.weekday(day)]],
    [L ? 'Bilangan hari bulan ini' : 'Days in this Hijri month', h.length], [L ? 'Dari hari ini' : 'From today', L ? 'Hari ini' : 'Today']]
    .map(([a, b, c]) => `<tr${c ? ` class="${c}"` : ''}><th scope="row">${a}</th><td>${b}</td></tr>`).join('\n');
  const rel = n => n === 0 ? (L ? 'Hari ini' : 'Today') : L ? `${n} hari lagi` : `in ${n} ${n === 1 ? 'day' : 'days'}`;
  const sighted = L ? 'tertakluk rukyah' : 'subject to moon sighting';
  const upcoming = H.upcoming(day, 8).map(e => `<tr><th scope="row">${H.EVENT_NAMES[lang][e.key]}${e.sighted ? `<small>${sighted}</small>` : ''}</th><td>${e.d} ${H.MONTHS[lang][e.m - 1]} ${e.y}</td><td>${gd(e.date, true)}</td><td>${rel(H.daysBetween(day, e.date))}</td></tr>`).join('\n');
  const year = y => H.yearTable(y).map(x => `<tr><th scope="row">${H.MONTHS[lang][x.m - 1]} ${y}</th><td>${gd(x.start, true)}</td><td>${gd(x.end)}</td><td>${x.length}</td></tr>`).join('\n');
  const events = y => H.events(y).map(e => `<tr><th scope="row">${H.EVENT_NAMES[lang][e.key]}</th><td>${e.d} ${H.MONTHS[lang][e.m - 1]} ${y}</td><td>${gd(e.date, true)}</td></tr>`).join('\n');
  const next = k => H.upcoming(day, 40).find(e => e.key === k);
  const nx = k => { const e = next(k); return { date: gd(e.date, true), y: e.y }; };
  const fitr = nx('syawal'), ram = nx('ramadan'), adha = nx('adha'), muh = nx('muharram'), maulid = nx('maulid');
  return {
    H_TODAY_H: hj(h), H_TODAY_G: gd(day, true), H_GDATE: day, H_HD: h.d, H_HY: h.y, H_DAY_ISO: day,
    H_MONTH_OPTIONS: H.MONTHS[lang].map((n, i) => `<option value="${i + 1}"${i + 1 === h.m ? ' selected' : ''}>${n}</option>`).join(''),
    H_OUT: hj(h), H_OUT_SUB: `${H.DAYS[lang][H.weekday(day)]} · ${gd(day)}`, H_LINES: lines, H_UPCOMING: upcoming,
    H_Y1: h.y, H_Y2: h.y + 1, H_YEAR1: year(h.y), H_YEAR2: year(h.y + 1), H_EVENTS1: events(h.y), H_EVENTS2: events(h.y + 1),
    H_FITR: fitr.date, H_FITR_Y: fitr.y, H_RAMADAN: ram.date, H_RAMADAN_Y: ram.y, H_ADHA: adha.date, H_ADHA_Y: adha.y,
    H_MUHARRAM: muh.date, H_MUHARRAM_Y: muh.y, H_MAULID: maulid.date, H_MAULID_Y: maulid.y,
    H_FIRST: gd(H.range().first), H_LAST: gd(H.range().last),
    H_VERIFIED: longDate(H.FACTS.verified, lang), H_VERIFIED_ISO: H.FACTS.verified
  };
}
// ---- TNB electricity bill (RP4), BM + EN. The protection level baked in follows the page date.
const TNB_EXAMPLE = { kwh: 300, afa: 0 };
function tnbMap(lang, p) {
  // The protection level follows the latest data date, so the page flips back to 600 kWh with the daily rebuild in January.
  const L = lang === 'ms' ? 1 : 0, m = n => money(n, lang), F = tnbCore.FACTS, level = tnbCore.protectionOn([p.dateModified, goldDate].sort().pop());
  const nf = (n, d = 2) => new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY', { maximumFractionDigits: d }).format(n);
  const opt = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  const r = tnbCore.calculate({ ...TNB_EXAMPLE, protection: level });
  const lines = [[L ? 'Caj tenaga (27.03 sen)' : 'Energy charge (27.03 sen)', m(r.energy)], [L ? 'Caj kapasiti (4.55 sen)' : 'Capacity charge (4.55 sen)', m(r.capacity)],
    [L ? 'Caj rangkaian (12.85 sen)' : 'Network charge (12.85 sen)', m(r.network)], [`${L ? 'Rebat EEI' : 'EEI rebate'} (${nf(r.eeiRate, 1)} sen)`, '− ' + m(r.eei)]]
    .map(([a, b]) => `<tr><th scope="row">${a}</th><td>${b}</td></tr>`);
  lines.push(`<tr class="total"><th scope="row">${L ? 'Jumlah bil' : 'Total bill'}</th><td>${m(r.total)}</td></tr>`);
  const table = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1500].map(k => {
    const a = tnbCore.calculate({ kwh: k, protection: 600 }), b = tnbCore.calculate({ kwh: k, protection: 800 });
    return `<tr><th scope="row">${k} kWh</th><td>${nf(tnbCore.eeiRate(k), 1)} sen</td><td>${m(b.total)}</td><td>${m(a.total)}</td></tr>`;
  }).join('\n');
  const eei = tnbCore.EEI.map((x, i) => `<tr><th scope="row">${i ? tnbCore.EEI[i - 1][0] + 1 : 1}–${x[0]} kWh</th><td>${nf(x[1], 1)} sen</td><td>${m(x[0] * x[1] / 100)}</td></tr>`).join('\n');
  const ex = k => tnbCore.calculate({ kwh: k, protection: 600 }).total, exA = (k, afa, lv) => tnbCore.calculate({ kwh: k, afa, protection: lv }).total;
  return {
    T_KWH: TNB_EXAMPLE.kwh, T_AFA: TNB_EXAMPLE.afa,
    T_PROT_OPTIONS: [opt(800, 'Up to 800 kWh (Sep–Dec 2026)', 'Hingga 800 kWj (Sep–Dis 2026)', level === 800), opt(600, 'Up to 600 kWh (standard)', 'Hingga 600 kWj (biasa)', level === 600)].join(''),
    T_MODE_OPTIONS: [opt('kwh', 'I know my kWh', 'Saya tahu kWj saya', true), opt('appliance', 'Estimate from appliances', 'Anggar dari peralatan')].join(''),
    T_TOTAL: m(r.total), T_SUB: L ? `${nf(r.perKwh, 1)} sen/kWj purata · dilindungi: tiada AFA, caj peruncitan dan SST` : `${nf(r.perKwh, 1)} sen/kWh on average · protected: no AFA, retail charge or SST`,
    T_LINES: lines.join('\n'), T_TABLE: table, T_EEI: eei, T_LEVEL: level,
    T_200: m(ex(200)), T_300: m(ex(300)), T_600: m(ex(600)), T_1000: m(ex(1000)), T_800P: m(exA(800, 3, 800)), T_800N: m(exA(800, 3, 600)),
    T_VERIFIED: longDate(F.verified, lang), T_VERIFIED_ISO: F.verified
  };
}
// ---- PTPTN repayment (ujrah), BM + EN
const PTPTN_EXAMPLE = { amount: 30000, years: 15, paid: 0, income: 0 };
function ptptnMap(lang) {
  const L = lang === 'ms' ? 1 : 0, m = n => money(n, lang), r = ptptnCore.calculate(PTPTN_EXAMPLE);
  const lines = [[L ? 'Pinjaman (prinsipal)' : 'Loan (principal)', m(r.principal)], [L ? 'Ujrah 1% setahun' : 'Ujrah 1% a year', m(r.ujrah)], [L ? 'Jumlah dibayar' : 'Total repaid', m(r.total)]]
    .map(([a, b]) => `<tr><th scope="row">${a}</th><td>${b}</td></tr>`);
  lines.push(`<tr class="total"><th scope="row">${L ? 'Ansuran bulanan' : 'Monthly instalment'}</th><td>${m(r.monthly)}</td></tr>`);
  const settle = `<tr class="total"><th scope="row">${L ? 'Bayar penuh sekarang (baki prinsipal)' : 'Settle in full now (principal balance)'}</th><td>${m(r.settle)}</td></tr>\n<tr><th scope="row">${L ? 'Ujrah dijimatkan' : 'Ujrah saved'}</th><td>${m(r.saving)}</td></tr>`;
  const table = [10000, 20000, 30000, 40000, 50000, 70000, 100000].map(a => `<tr><th scope="row">${m(a)}</th>${[10, 15, 20].map(y => `<td>${m(ptptnCore.calculate({ amount: a, years: y }).monthly)}</td>`).join('')}</tr>`).join('\n');
  const s5 = ptptnCore.calculate({ amount: 30000, years: 15, paid: 60 });
  return {
    P_AMOUNT: PTPTN_EXAMPLE.amount, P_YEARS: PTPTN_EXAMPLE.years, P_MONTHLY: m(r.monthly), P_UJRAH: m(r.ujrah), P_TOTAL: m(r.total),
    P_SUB: L ? `${r.months} bulan · jumlah ${m(r.total)} · ujrah ${m(r.ujrah)}` : `${r.months} months · total ${m(r.total)} · ujrah ${m(r.ujrah)}`,
    P_LINES: lines.join('\n'), P_SETTLE: settle, P_TABLE: table, P_S5: m(s5.settle), P_S5_SAVE: m(s5.saving), P_20: m(ptptnCore.calculate({ amount: 30000, years: 20 }).monthly),
    P_VERIFIED: longDate(ptptnCore.FACTS.verified, lang), P_VERIFIED_ISO: ptptnCore.FACTS.verified
  };
}
// ---- Fidyah, BM + EN (2026 state rates)
const FIDYAH_EXAMPLE = { state: 'selangor', type: 0, days: 5, years: 1, reason: 'delay' };
function fidyahMap(lang) {
  const L = lang === 'ms' ? 1 : 0, m = n => money(n, lang), S = fidyahCore.STATES, r = fidyahCore.calculate(FIDYAH_EXAMPLE);
  const opt = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  const TY = L ? { local: 'Beras tempatan', import: 'Beras import / wangi', premium: 'Basmathi / premium', other: 'Beras lain' } : { local: 'Local rice', import: 'Imported / fragrant rice', premium: 'Basmathi / premium', other: 'Other rice' };
  const sel = S[FIDYAH_EXAMPLE.state];
  const lines = [[L ? 'Kadar sehari' : 'Rate per day', m(r.perDay)], [L ? 'Hari puasa' : 'Days of fasting', r.days], [L ? 'Fidyah sehari' : 'Fidyah per day', r.units],
    [L ? 'Jumlah fidyah (cupak)' : 'Total fidyah (cupak)', r.count], [L ? 'Puasa perlu diganti' : 'Fasts still to make up', r.qada]].map(([a, b]) => `<tr><th scope="row">${a}</th><td>${b}</td></tr>`);
  lines.push(`<tr class="total"><th scope="row">${L ? 'Jumlah fidyah' : 'Total fidyah'}</th><td>${m(r.total)}</td></tr>`);
  const rates = Object.values(S).map(s => `<tr><th scope="row">${s.name}</th><td>${s.rates.map((x, i) => s.types ? `${m(x)}<small>${TY[s.types[i]]}</small>` : m(x)).join(' ')}</td><td>${m(s.rates[0] * 30)}</td></tr>`).join('\n');
  return {
    FI_STATE_OPTIONS: Object.entries(S).map(([k, s]) => `<option value="${k}"${k === FIDYAH_EXAMPLE.state ? ' selected' : ''}>${s.name}</option>`).join(''),
    FI_TYPE_OPTIONS: sel.rates.map((x, i) => `<option value="${i}"${i === 0 ? ' selected' : ''}>${TY[sel.types[i]]} – ${m(x)}</option>`).join(''),
    FI_REASON_OPTIONS: [opt('delay', 'Did not make up the fast before the next Ramadan', 'Tidak qada sebelum Ramadan berikutnya', true), opt('child', 'Pregnant or nursing, fasted out for the baby', 'Hamil atau menyusu, tidak berpuasa kerana bimbang anak'), opt('unable', 'Unable to fast (old age, chronic illness)', 'Tidak mampu berpuasa (tua, sakit kronik)')].join(''),
    FI_DAYS: FIDYAH_EXAMPLE.days, FI_YEARS: FIDYAH_EXAMPLE.years, FI_TOTAL: m(r.total),
    FI_SUB: L ? `${r.count} cupak × ${m(r.perDay)} · masih perlu qada ${r.qada} hari` : `${r.count} cupak × ${m(r.perDay)} · still make up ${r.qada} days`,
    FI_LINES: lines.join('\n'), FI_RATES: rates,
    FI_EX2: m(fidyahCore.calculate({ days: 5, years: 2, state: 'selangor', type: 0 }).total), FI_WP30: m(fidyahCore.calculate({ days: 30, state: 'wp', reason: 'unable' }).total),
    FI_VERIFIED: longDate(fidyahCore.FACTS.verified, lang), FI_VERIFIED_ISO: fidyahCore.FACTS.verified
  };
}
// ---- Debt consolidation, BM + EN
const DEBT_EXAMPLE = { debts: [{ balance: 10000, rate: 18, payment: '' }, { balance: 5000, rate: 18, payment: '' }, { balance: '', rate: 18, payment: '' }], rate: 6, years: 5, method: 'flat' };
function debtMap(lang) {
  const L = lang === 'ms' ? 1 : 0, m = n => money(n, lang), r = debtCore.calculate(DEBT_EXAMPLE);
  const opt = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  const mo = n => L ? `${n} bulan` : `${n} months`;
  const rows = [[L ? 'Bayaran bulanan' : 'Monthly payment', m(r.nowMonthly), m(r.monthly)], [L ? 'Faedah' : 'Interest', m(r.nowInterest), m(r.loanInterest)],
    [L ? 'Duti setem 0.5%' : 'Stamp duty 0.5%', '–', m(r.stamp)], [L ? 'Tempoh' : 'Time to clear', mo(r.nowMonths), mo(r.months)], [L ? 'Kadar efektif (EIR)' : 'Effective rate (EIR)', '', r.eir + '%']]
    .map(([a, b, c]) => `<tr><th scope="row">${a}</th><td>${b}</td><td>${c}</td></tr>`).join('\n');
  const minTable = [3000, 5000, 10000, 20000, 30000].map(b => { const x = debtCore.payoff(b, 18, 0), y = debtCore.payoff(b, 15, 0); return `<tr><th scope="row">${m(b)}</th><td>${m(x.first)}</td><td>${mo(x.months)}</td><td>${m(x.interest)}</td><td>${m(y.interest)}</td></tr>`; }).join('\n');
  const p10 = debtCore.payoff(10000, 18, 0);
  return {
    D_B1: 10000, D_B2: 5000, D_RATE: DEBT_EXAMPLE.rate, D_YEARS: DEBT_EXAMPLE.years,
    D_METHOD_OPTIONS: [opt('flat', 'Flat rate (as banks quote)', 'Kadar rata (seperti iklan bank)', true), opt('eir', 'Effective rate (EIR)', 'Kadar efektif (EIR)')].join(''),
    D_HEAD: r.saving >= 0 ? (L ? 'Penjimatan' : 'You save') : (L ? 'Kos tambahan' : 'Extra cost'), D_SAVING: m(Math.abs(r.saving)),
    D_SUB: L ? `Bayaran bulanan ${m(r.monthly)} selama ${r.years} tahun` : `Monthly payment ${m(r.monthly)} for ${r.years} years`, D_LINES: rows, D_MIN: minTable,
    D_NOW_INT: m(r.nowInterest), D_NOW_MONTHS: r.nowMonths, D_LOAN_INT: m(r.loanInterest), D_MONTHLY: m(r.monthly), D_NOW_MONTHLY: m(r.nowMonthly), D_EIR: r.eir + '%', D_STAMP: m(r.stamp),
    D_P10_MONTHS: p10.months, D_P10_INT: m(p10.interest), D_P10_YEARS: (p10.months / 12).toFixed(1),
    D_VERIFIED: longDate(debtCore.FACTS.verified, lang), D_VERIFIED_ISO: debtCore.FACTS.verified
  };
}
// ---- Refinance (home loan), BM + EN
const REFI_EXAMPLE = { balance: 300000, rate: 4.5, yearsLeft: 25, newRate: 3.9, newYears: 25, cashOut: 0, lockPct: 0, valuation: 800, other: 1000, finance: 'cash' };
function refiMap(lang) {
  const L = lang === 'ms' ? 1 : 0, m = n => money(n, lang), r = refiCore.calculate(REFI_EXAMPLE);
  const opt = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  const tr = (a, b, c) => `<tr${c ? ` class="${c}"` : ''}><th scope="row">${a}</th><td>${b}</td></tr>`;
  const lines = [tr(L ? 'Ansuran sekarang' : 'Current instalment', m(r.oldInstalment)), tr(L ? 'Ansuran baharu (baki sama)' : 'New instalment (same balance)', m(r.sameInstalment)),
    tr(L ? 'Faedah dijimatkan' : 'Interest saved', m(r.interestSaved)), tr(L ? 'Kos refinance' : 'Refinancing costs', '− ' + m(r.costs)),
    tr(L ? 'Penjimatan bersih' : 'Net saving', m(r.netSaving), 'total'), tr(L ? 'Pulang modal' : 'Break-even', L ? `${r.breakEven} bulan` : `${r.breakEven} months`)].join('\n');
  const costs = [tr(L ? 'Duti setem 0.5%' : 'Stamp duty 0.5%', m(r.stamp)), tr(L ? 'Yuran guaman (SRO 2023)' : 'Legal fees (SRO 2023)', m(r.legal)), tr(L ? 'SST 8% atas yuran guaman' : '8% SST on legal fees', m(r.sst)),
    tr(L ? 'Penalti tempoh kunci' : 'Lock-in penalty', m(r.penalty)), tr(L ? 'Yuran penilaian' : 'Valuation fee', m(r.valuation)), tr(L ? 'Kos lain' : 'Other costs', m(r.other)), tr(L ? 'Jumlah kos' : 'Total costs', m(r.costs), 'total')].join('\n');
  const cut = [0.25, 0.5, 0.75, 1].map(d => { const x = refiCore.calculate({ ...REFI_EXAMPLE, newRate: 4.5 - d }); return `<tr><th scope="row">${(4.5 - d).toFixed(2)}%</th><td>${m(x.monthlySaving)}</td><td>${m(x.interestSaved)}</td><td>${m(x.netSaving)}</td><td>${x.breakEven} ${L ? 'bulan' : 'months'}</td></tr>`; }).join('\n');
  const cost = [200000, 300000, 500000, 800000].map(b => { const x = refiCore.calculate({ balance: b, rate: 4.5, yearsLeft: 25, newRate: 3.9, newYears: 25 }); return `<tr><th scope="row">${m(b)}</th><td>${m(x.stamp)}</td><td>${m(x.legal + x.sst)}</td><td>${m(x.stamp + x.legal + x.sst)}</td></tr>`; }).join('\n');
  return {
    R_BALANCE: REFI_EXAMPLE.balance, R_RATE: REFI_EXAMPLE.rate, R_LEFT: REFI_EXAMPLE.yearsLeft, R_NEW_RATE: REFI_EXAMPLE.newRate, R_NEW_YEARS: REFI_EXAMPLE.newYears,
    R_VALUATION: REFI_EXAMPLE.valuation, R_OTHER: REFI_EXAMPLE.other,
    R_FINANCE_OPTIONS: [opt('cash', 'Pay costs in cash', 'Bayar kos secara tunai', true), opt('loan', 'Add costs to the new loan', 'Masukkan kos ke dalam pinjaman baharu')].join(''),
    R_HEAD: L ? 'Penjimatan bersih' : 'Net saving', R_NET: m(r.netSaving), R_SAVE: m(r.monthlySaving), R_SAVED: m(r.interestSaved), R_COSTS: m(r.costs), R_BE: r.breakEven,
    R_OLD: m(r.oldInstalment), R_NEW: m(r.sameInstalment),
    R_SUB: L ? `Jimat ${m(r.monthlySaving)} sebulan · pulang modal ${r.breakEven} bulan` : `Save ${m(r.monthlySaving)} a month · break-even ${r.breakEven} months`,
    R_LINES: lines, R_COST_LINES: costs, R_CUT: cut, R_COST_TABLE: cost, R_OPR: refiCore.FACTS.opr,
    R_VERIFIED: longDate(refiCore.FACTS.verified, lang), R_VERIFIED_ISO: refiCore.FACTS.verified
  };
}
// ---- Rent vs buy, BM + EN
const RB_EXAMPLE = { price: 500000, downPct: 10, rate: 4.2, years: 35, firstHome: 'none', upkeep: 1, growth: 3, sellCost: 3, rent: 1800, rentRise: 3, invest: 5, horizon: 10 };
function rentbuyMap(lang) {
  const L = lang === 'ms' ? 1 : 0, m = n => money(n, lang), r = rentbuyCore.calculate(RB_EXAMPLE);
  const rm0 = n => new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(n);
  const opt = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  const tr = (a, b, c) => `<tr${c ? ` class="${c}"` : ''}><th scope="row">${a}</th><td>${b}</td></tr>`;
  const lines = [tr(L ? 'Kekayaan pembeli' : "Buyer's wealth", rm0(r.buyer)), tr(L ? 'Kekayaan penyewa' : "Renter's wealth", rm0(r.renter)), tr(L ? 'Kos permulaan membeli' : 'Up-front cost of buying', rm0(r.upfront)),
    tr(L ? 'Ansuran bulanan' : 'Monthly instalment', m(r.instalment)), tr(L ? 'Kos memiliki bulan pertama' : 'First-month cost of owning', m(r.firstMonthOwn)),
    tr(L ? 'Membeli mula untung' : 'Buying pulls ahead', r.breakEven ? (L ? 'Tahun ' : 'Year ') + r.breakEven : (L ? 'Tidak dalam tempoh ini' : 'Not within this period'), 'total')].join('\n');
  const years = r.rows.map(x => `<tr><th scope="row">${x.year}</th><td>${rm0(x.buyer)}</td><td>${rm0(x.renter)}</td></tr>`).join('\n');
  const grid = [0, 2, 3, 5].map(g => `<tr><th scope="row">${g}%</th>${[5, 10, 20].map(h => { const x = rentbuyCore.calculate({ ...RB_EXAMPLE, growth: g, horizon: h }); return `<td>${x.better === 'buy' ? (L ? 'Beli' : 'Buy') : (L ? 'Sewa' : 'Rent')} ${rm0(Math.abs(x.difference))}</td>`; }).join('')}</tr>`).join('\n');
  const c = r.costs;
  return {
    B_PRICE: RB_EXAMPLE.price, B_DOWN: RB_EXAMPLE.downPct, B_RATE: RB_EXAMPLE.rate, B_YEARS: RB_EXAMPLE.years, B_UPKEEP: RB_EXAMPLE.upkeep, B_GROWTH: RB_EXAMPLE.growth,
    B_SELL: RB_EXAMPLE.sellCost, B_RENT: RB_EXAMPLE.rent, B_RISE: RB_EXAMPLE.rentRise, B_INVEST: RB_EXAMPLE.invest, B_HORIZON: RB_EXAMPLE.horizon,
    B_FIRST_OPTIONS: [opt('none', 'No', 'Tidak', true), opt('current', 'Yes, up to RM500,000 (to 2027)', 'Ya, hingga RM500,000 (hingga 2027)')].join(''),
    B_HEAD: r.better === 'buy' ? (L ? 'Membeli lebih untung' : 'Buying comes out ahead') : (L ? 'Menyewa lebih untung' : 'Renting comes out ahead'), B_DIFF: rm0(Math.abs(r.difference)),
    B_SUB: L ? `Selepas ${r.horizon} tahun: beli ${rm0(r.buyer)}, sewa ${rm0(r.renter)}` : `After ${r.horizon} years: buy ${rm0(r.buyer)}, rent ${rm0(r.renter)}`,
    B_LINES: lines, B_YEARS_ROWS: years, B_GRID: grid, B_BUYER: rm0(r.buyer), B_RENTER: rm0(r.renter), B_UPFRONT: rm0(r.upfront), B_INST: m(r.instalment), B_BE: r.breakEven,
    B_STAMP: rm0(c.stampTransfer + c.stampLoan), B_LEGAL: rm0(c.legalSpa + c.legalLoan + c.sst),
    B_VERIFIED: longDate(rentbuyCore.FACTS.verified, lang), B_VERIFIED_ISO: rentbuyCore.FACTS.verified
  };
}
// ---- Fixed deposit, BM + EN
const FD_EXAMPLE = { amount: 10000, rate: 3.8, months: 12, renew: 1 };
function fdMap(lang) {
  const L = lang === 'ms' ? 1 : 0, m = n => money(n, lang), F = fdCore.FACTS, r = fdCore.calculate(FD_EXAMPLE);
  const nf = (n, d = 2) => new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY', { maximumFractionDigits: d }).format(n);
  const tr = (a, b, c) => `<tr${c ? ` class="${c}"` : ''}><th scope="row">${a}</th><td>${b}</td></tr>`;
  const lines = [tr(L ? 'Jumlah semasa matang' : 'Amount at maturity', m(r.maturity), 'total'), tr(L ? 'Faedah sebulan (jika dibayar bulanan)' : 'Interest a month (if paid monthly)', m(r.monthly)),
    tr(L ? 'Pulangan selepas inflasi' : 'Return after inflation', nf(r.real) + '%')].join('\n');
  const mo = n => L ? `${n} bulan` : `${n} ${n === 1 ? 'month' : 'months'}`;
  const table = [2.5, 3, 3.5, 3.8, 4, 4.5].map(rt => `<tr><th scope="row">${nf(rt)}%</th>${[1, 3, 6, 12].map(n => `<td>${m(fdCore.interest(10000, rt, n))}</td>`).join('')}</tr>`).join('\n');
  const grow = [10000, 50000, 100000, 250000].map(a => `<tr><th scope="row">${m(a)}</th>${[1, 3, 5].map(y => `<td>${m(fdCore.calculate({ amount: a, rate: 3.8, months: 12, renew: y }).total)}</td>`).join('')}</tr>`).join('\n');
  return {
    D_AMOUNT: FD_EXAMPLE.amount, D_RATE: FD_EXAMPLE.rate, D_INFLATION: F.inflation,
    D_MONTH_OPTIONS: [1, 3, 6, 9, 12, 15, 18, 24, 36, 48, 60].map(n => `<option value="${n}"${n === 12 ? ' selected' : ''}>${mo(n)}</option>`).join(''),
    D_INTEREST: m(r.interest), D_MATURITY: m(r.maturity), D_MONTHLY: m(r.monthly),
    D_SUB: L ? `${r.months} bulan pada ${nf(r.rate)}% setahun · matang ${m(r.maturity)}` : `${r.months} months at ${nf(r.rate)}% a year · matures at ${m(r.maturity)}`,
    D_LINES: lines, D_TABLE: table, D_GROW: grow, D_5Y: m(fdCore.calculate({ ...FD_EXAMPLE, renew: 5 }).total), D_6M: m(fdCore.interest(10000, 3.8, 6)),
    D_PIDM: m(F.pidm), D_OPR: nf(F.opr), D_INFL: nf(F.inflation, 1),
    D_VERIFIED: longDate(F.verified, lang), D_VERIFIED_ISO: F.verified
  };
}
// ---- Employer cost, BM + EN
const EMP_EXAMPLE = { salary: 3000, allowances: 0, hrd: 'full', foreign: 'no', age60: 'no', bonus: 0 };
function employerMap(lang) {
  const L = lang === 'ms' ? 1 : 0, m = n => money(n, lang), r = employerCore.calculate(EMP_EXAMPLE);
  const nf = (n, d = 2) => new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY', { maximumFractionDigits: d }).format(n);
  const opt = (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`;
  const tr = (a, b, c) => `<tr${c ? ` class="${c}"` : ''}><th scope="row">${a}</th><td>${b}</td></tr>`;
  const lines = [tr(L ? 'Gaji dan elaun tetap' : 'Wages and fixed allowances', m(r.wages)), tr(`${L ? 'KWSP majikan' : 'Employer EPF'} (${nf(r.epfRate * 100)}%)`, m(r.epf)),
    tr(L ? 'PERKESO majikan' : 'Employer SOCSO', m(r.socso)), tr(L ? 'SIP (EIS) majikan' : 'Employer EIS', m(r.eis)), tr(`${L ? 'Levi HRD Corp' : 'HRD Corp levy'} (1%)`, m(r.hrd)),
    tr(L ? 'Kos sebulan' : 'Cost a month', m(r.monthly), 'total'), tr(L ? 'Kos setahun' : 'Cost a year', m(r.yearly), 'total')].join('\n');
  const emp = [tr(L ? 'KWSP pekerja' : 'Employee EPF', '− ' + m(r.employeeEpf)), tr(L ? 'PERKESO pekerja' : 'Employee SOCSO', '− ' + m(r.employeeSocso)),
    tr(L ? 'SIP pekerja' : 'Employee EIS', '− ' + m(r.employeeEis)), tr(L ? 'Gaji sebelum PCB' : 'Pay before PCB', m(r.takeHomeBeforeTax), 'total')].join('\n');
  const table = [1700, 2500, 3000, 4000, 5000, 6000, 8000, 10000].map(s => { const x = employerCore.calculate({ salary: s, hrd: 'full' }), y = employerCore.calculate({ salary: s }); return `<tr><th scope="row">${m(s)}</th><td>${m(x.epf)}</td><td>${m(x.socso + x.eis)}</td><td>${m(y.monthly)}</td><td>${m(x.monthly)}</td><td>${m(x.yearly)}</td></tr>`; }).join('\n');
  const f = employerCore.calculate({ salary: 3000, foreign: 'yes' }), b = employerCore.calculate({ salary: 3000, hrd: 'full', bonus: 1 });
  return {
    E_SALARY: EMP_EXAMPLE.salary,
    E_HRD_OPTIONS: [opt('full', '1% (10 or more Malaysian employees)', '1% (10 atau lebih pekerja Malaysia)', true), opt('half', '0.5% (5 to 9, registered voluntarily)', '0.5% (5 hingga 9, daftar sukarela)'), opt('none', 'Not registered / not covered', 'Tidak berdaftar / tidak diliputi')].join(''),
    E_FOREIGN_OPTIONS: [opt('no', 'Malaysian', 'Warganegara Malaysia', true), opt('yes', 'Foreign worker', 'Pekerja asing')].join(''),
    E_AGE_OPTIONS: [opt('no', 'Below 60', 'Bawah 60 tahun', true), opt('yes', '60 and above', '60 tahun ke atas')].join(''),
    E_TOTAL: m(r.monthly), E_ONTOP: m(r.onTop), E_PCT: nf(r.onTopPct, 1), E_YEARLY: m(r.yearly),
    E_SUB: L ? `${m(r.onTop)} (${nf(r.onTopPct, 1)}%) di atas gaji · ${m(r.yearly)} setahun` : `${m(r.onTop)} (${nf(r.onTopPct, 1)}%) on top of pay · ${m(r.yearly)} a year`,
    E_LINES: lines, E_EMPLOYEE: emp, E_TABLE: table, E_FOREIGN: m(f.monthly), E_BONUS_YEARLY: m(b.yearly), E_BONUS_EPF: m(b.bonusEpf),
    E_VERIFIED: longDate(employerCore.FACTS.verified, lang), E_VERIFIED_ISO: employerCore.FACTS.verified
  };
}
// ---- batch 3: profit margin, ROAS, freelance rate, working days, retirement age
const b3 = lang => {
  const L = lang === 'ms' ? 1 : 0;
  return {
    L, m: n => money(n, lang),
    nf: (n, d = 2) => new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY', { maximumFractionDigits: d }).format(n),
    tr: (a, b, c) => `<tr${c ? ` class="${c}"` : ''}><th scope="row">${a}</th><td>${b}</td></tr>`,
    opt: (v, en, bm, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? bm : en}</option>`
  };
};
const MARGIN_EXAMPLE = { price: 100, cost: 60, feePct: 10, fixedFee: 0, shipping: 0, ads: 0, target: 40, qty: 100 };
function marginMap(lang) {
  const { L, m, nf, tr } = b3(lang), r = marginCore.calculate(MARGIN_EXAMPLE);
  const lines = [tr(L ? 'Harga jual' : 'Selling price', m(r.price)), tr(L ? 'Kos barang' : 'Product cost', '− ' + m(r.cost)), tr(L ? 'Fi platform dan bayaran' : 'Platform and payment fees', '− ' + m(r.fees)),
    tr(L ? 'Untung seunit' : 'Profit per unit', m(r.profit), 'total'), tr(L ? 'Margin untung' : 'Profit margin', nf(r.margin, 1) + '%'), tr('Markup', nf(r.markup, 1) + '%'),
    tr(L ? 'Harga pulang modal' : 'Break-even price', m(r.breakEven)), tr(L ? `Harga untuk margin ${nf(r.targetPct, 1)}%` : `Price for a ${nf(r.targetPct, 1)}% margin`, m(r.targetPrice)),
    tr(L ? `Untung untuk ${r.qty} unit` : `Profit on ${r.qty} units`, m(r.monthly), 'total')].join('\n');
  const conv = [5, 10, 15, 20, 25, 30, 35, 40, 50, 60].map(p => `<tr><th scope="row">${p}%</th><td>${nf(marginCore.markupFromMargin(p / 100) * 100, 1)}%</td><td>${nf(marginCore.marginFromMarkup(p / 100) * 100, 1)}%</td></tr>`).join('\n');
  const price = [0, 5, 10, 15, 20].map(fee => `<tr><th scope="row">${fee}%</th>${[20, 30, 40, 50].map(t => `<td>${m(marginCore.priceFor(60, fee / 100, 0, t / 100))}</td>`).join('')}</tr>`).join('\n');
  const s = marginCore.calculate({ price: 50, cost: 20, feePct: 12, fixedFee: 1, shipping: 3, ads: 5 });
  return {
    M_PRICE: r.price, M_COST: r.cost, M_FEE: MARGIN_EXAMPLE.feePct, M_TARGET: r.targetPct, M_QTY: r.qty,
    M_PROFIT: m(r.profit), M_MARGIN: nf(r.margin, 1), M_MARKUP: nf(r.markup, 1), M_BE: m(r.breakEven), M_TPRICE: m(r.targetPrice),
    M_SUB: `Margin ${nf(r.margin, 1)}% · markup ${nf(r.markup, 1)}%`, M_LINES: lines, M_CONV: conv, M_PRICES: price,
    M_SHOP_PROFIT: m(s.profit), M_SHOP_MARGIN: nf(s.margin, 1), M_SHOP_BE: m(s.breakEven),
    M_VERIFIED: longDate(marginCore.FACTS.verified, lang), M_VERIFIED_ISO: marginCore.FACTS.verified
  };
}
const ROAS_EXAMPLE = { spend: 1000, revenue: 4000, margin: 40, orders: 50, tax: 'no' };
function roasMap(lang) {
  const { L, m, nf, tr, opt } = b3(lang), r = roasCore.calculate(ROAS_EXAMPLE), x2 = n => new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + '×';
  const lines = [tr(L ? 'Belanja iklan' : 'Ad spend', m(r.baseSpend)), tr(L ? 'Jualan daripada iklan' : 'Sales from ads', m(r.revenue)),
    tr(L ? `Untung kasar (${nf(r.marginPct, 1)}%)` : `Gross profit (${nf(r.marginPct, 1)}%)`, m(r.gross)), tr(L ? 'Untung selepas iklan' : 'Profit after ads', m(r.profit), 'total'),
    tr('ROI', nf(r.roi, 1) + '%'), tr(L ? 'ROAS pulang modal' : 'Break-even ROAS', x2(r.breakEven)), tr(L ? 'Jualan pulang modal' : 'Break-even sales', m(r.breakEvenRevenue)),
    tr(L ? 'ACoS (iklan ÷ jualan)' : 'ACoS (ad spend ÷ sales)', nf(r.acos, 1) + '%'), tr(L ? 'Kos setiap pesanan (CPA)' : 'Cost per order (CPA)', m(r.cpa)),
    tr(L ? 'Nilai purata pesanan' : 'Average order value', m(r.aov)), tr(L ? 'CPA maksimum pulang modal' : 'Break-even CPA', m(r.maxCpa))].join('\n');
  const be = [10, 15, 20, 25, 30, 40, 50, 60, 70].map(p => `<tr><th scope="row">${p}%</th><td>${x2(roasCore.breakEven(p))}</td><td>${nf(100 / roasCore.breakEven(p), 1)}%</td></tr>`).join('\n');
  const grid = [2, 3, 4, 5, 6].map(ro => `<tr><th scope="row">${x2(ro)}</th>${[20, 30, 40, 50].map(mg => { const x = roasCore.calculate({ spend: 1000, revenue: 1000 * ro, margin: mg }); return `<td>${m(x.profit)}</td>`; }).join('')}</tr>`).join('\n');
  const t = roasCore.calculate({ ...ROAS_EXAMPLE, tax: 'yes' });
  return {
    R_SPEND: r.baseSpend, R_REVENUE: r.revenue, R_MARGIN: r.marginPct, R_ORDERS: r.orders,
    R_TAX_OPTIONS: [opt('no', 'Not on my invoice', 'Tiada dalam invois', true), opt('yes', 'Add 8% service tax', 'Tambah cukai perkhidmatan 8%')].join(''),
    R_ROAS: x2(r.roas), R_ROI: nf(r.roi, 1), R_PROFIT: m(r.profit), R_BE: x2(r.breakEven), R_CPA: m(r.cpa), R_MAXCPA: m(r.maxCpa),
    R_SUB: L ? `ROI ${nf(r.roi, 1)}% · untung ${m(r.profit)}` : `ROI ${nf(r.roi, 1)}% · profit ${m(r.profit)}`, R_LINES: lines, R_BETABLE: be, R_GRID: grid,
    R_TAX_ROAS: x2(t.roas), R_TAX_PROFIT: m(t.profit), R_TAX_ROI: nf(t.roi, 1),
    R_VERIFIED: longDate(roasCore.FACTS.verified, lang), R_VERIFIED_ISO: roasCore.FACTS.verified
  };
}
const FL_EXAMPLE = { target: 5000, expenses: 500, epf: 11, socso: 0, relief: 0, hours: 30, weeksOff: 6 };
function freelanceMap(lang) {
  const { L, m, nf, tr } = b3(lang), r = freelanceCore.calculate(FL_EXAMPLE);
  const lines = [tr(L ? 'Pendapatan bersih setahun' : 'Take-home a year', m(r.target)), tr(L ? 'Kos perniagaan' : 'Business expenses', '+ ' + m(r.expenses)),
    tr(L ? 'KWSP (i-Saraan / sukarela)' : 'EPF (i-Saraan / voluntary)', '+ ' + m(r.epf)), tr(L ? 'Cukai pendapatan' : 'Income tax', '+ ' + m(r.tax)),
    tr(L ? 'Jualan diperlukan setahun' : 'Revenue needed a year', m(r.revenue), 'total'), tr(L ? 'Invois sebulan' : 'Billing a month', m(r.monthly)),
    tr(L ? 'Jam boleh caj setahun' : 'Billable hours a year', nf(r.billable, 0)), tr(L ? 'Kadar sejam' : 'Hourly rate', m(r.hourly), 'total'), tr(L ? 'Kadar sehari (8 jam)' : 'Day rate (8 hours)', m(r.daily))].join('\n');
  const table = [2000, 3000, 4000, 5000, 6000, 8000, 10000].map(t => { const x = freelanceCore.calculate({ ...FL_EXAMPLE, target: t }); return `<tr><th scope="row">${m(t)}</th><td>${m(x.monthly)}</td><td>${m(x.tax)}</td><td><strong>${m(x.hourly)}</strong></td><td>${m(x.daily)}</td></tr>`; }).join('\n');
  const hrs = [20, 25, 30, 35, 40].map(h => { const x = freelanceCore.calculate({ ...FL_EXAMPLE, hours: h }); return `<tr><th scope="row">${h}</th><td>${nf(x.billable, 0)}</td><td>${m(x.hourly)}</td><td>${m(x.daily)}</td></tr>`; }).join('\n');
  const low = freelanceCore.calculate({ target: 3000, expenses: 300, epf: 0, hours: 25, weeksOff: 4 });
  return {
    F_TARGET: FL_EXAMPLE.target, F_EXPENSES: FL_EXAMPLE.expenses, F_EPF: FL_EXAMPLE.epf, F_HOURS: FL_EXAMPLE.hours, F_WEEKS: FL_EXAMPLE.weeksOff,
    F_HOURLY: m(r.hourly), F_DAILY: m(r.daily), F_MONTHLY: m(r.monthly), F_REVENUE: m(r.revenue), F_TAX: m(r.tax), F_EPFV: m(r.epf), F_BILLABLE: nf(r.billable, 0),
    F_SUB: L ? `${m(r.daily)} sehari · ${m(r.monthly)} sebulan` : `${m(r.daily)} a day · ${m(r.monthly)} a month`, F_LINES: lines, F_TABLE: table, F_HOURS_TABLE: hrs,
    F_LOW_HOURLY: m(low.hourly), F_LOW_REVENUE: m(low.revenue),
    F_VERIFIED: longDate(freelanceCore.FACTS.verified, lang), F_VERIFIED_ISO: freelanceCore.FACTS.verified
  };
}
const WD_EXAMPLE = { state: 'selangor', from: '2027-01-01', to: '2027-12-31', leave: 0, start: '2026-10-14', add: 14 };
function workdaysMap(lang) {
  const { L, nf, tr } = b3(lang), W = workdaysCore, loc = L ? 'ms-MY' : 'en-GB';
  const dl = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const ds = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const mn = i => new Date(Date.UTC(2026, i, 1)).toLocaleDateString(loc, { month: 'long', timeZone: 'UTC' });
  const r = W.count(WD_EXAMPLE), d = W.addWorkdays(WD_EXAMPLE.state, WD_EXAMPLE.start, WD_EXAMPLE.add), sn = W.name(WD_EXAMPLE.state, lang), we = W.weekendDays(WD_EXAMPLE.state);
  const lines = [tr(L ? 'Jumlah hari' : 'Calendar days', nf(r.days, 0)), tr(L ? 'Hujung minggu' : 'Weekend days', '− ' + nf(r.weekend, 0)), tr(L ? 'Cuti umum (hari bekerja)' : 'Public holidays on workdays', '− ' + nf(r.holidays, 0)),
    tr(L ? 'Cuti umum pada hujung minggu' : 'Public holidays on a weekend', nf(r.holidaysOnWeekend, 0)), tr(L ? 'Hari bekerja' : 'Working days', nf(r.workdays, 0), 'total')].join('\n');
  const dead = [tr(L ? 'Tarikh mula' : 'Start date', dl(WD_EXAMPLE.start)), tr(L ? 'Tambah hari bekerja' : 'Working days added', WD_EXAMPLE.add), tr(L ? 'Hujung minggu dan cuti dilangkau' : 'Weekend and holiday days skipped', d.skipped), tr(L ? 'Tarikh akhir' : 'End date', dl(d.date), 'total')].join('\n');
  const hol = W.holidays(WD_EXAMPLE.state, 2027).map(h => { const w = we.includes(new Date(h.date + 'T00:00:00Z').getUTCDay()); return tr(ds(h.date), (L ? h.ms : h.en) + (w ? ` (${L ? 'hujung minggu' : 'weekend'})` : '')); }).join('\n');
  const months = W.months(WD_EXAMPLE.state, 2027).map((x, i) => `<tr><th scope="row">${mn(i)}</th><td>${x.days}</td><td>${x.weekend}</td><td>${x.holidays}</td><td>${x.workdays}</td></tr>`).join('\n');
  const states = W.STATES.map(([k]) => { const a = W.count({ state: k, from: '2026-01-01', to: '2026-12-31' }), b = W.count({ state: k, from: '2027-01-01', to: '2027-12-31' }); return `<tr><th scope="row">${W.name(k, lang)}</th><td>${W.weekendDays(k)[0] === 5 ? (L ? 'Jumaat–Sabtu' : 'Fri–Sat') : (L ? 'Sabtu–Ahad' : 'Sat–Sun')}</td><td>${a.workdays}</td><td>${b.workdays}</td><td>${W.holidays(k, 2027).length}</td></tr>`; }).join('\n');
  const opts = W.STATES.map(([k]) => `<option value="${k}"${k === WD_EXAMPLE.state ? ' selected' : ''}>${W.name(k, lang)}</option>`).join('');
  const c = k => W.count({ state: k, from: '2027-01-01', to: '2027-12-31' }).workdays, nov = W.count({ state: 'selangor', from: '2026-11-01', to: '2026-11-30' }), dec = W.count({ state: 'selangor', from: '2026-12-01', to: '2026-12-31' });
  return {
    W_STATE_OPTIONS: opts, W_FROM: WD_EXAMPLE.from, W_TO: WD_EXAMPLE.to, W_START: WD_EXAMPLE.start, W_ADD: WD_EXAMPLE.add,
    W_DAYS: nf(r.workdays, 0), W_SUB: L ? `daripada ${r.days} hari: ${r.weekend} hujung minggu, ${r.holidays} cuti umum` : `of ${r.days} days: ${r.weekend} weekend, ${r.holidays} public holidays`,
    W_LINES: lines, W_DEADLINE: dead, W_HOL: hol, W_MONTHS: months, W_STATES: states, W_END: dl(d.date),
    W_HOL_H: L ? `Cuti umum ${sn} 2027` : `Public holidays in ${sn} 2027`, W_MON_H: L ? `Hari bekerja sebulan, ${sn} 2027` : `Working days a month, ${sn} 2027`,
    W_SEL27: c('selangor'), W_SEL26: W.count({ state: 'selangor', from: '2026-01-01', to: '2026-12-31' }).workdays, W_KL27: c('kl'), W_JOH27: c('johor'), W_KEL27: c('kelantan'), W_TRG27: c('terengganu'), W_KDH27: c('kedah'), W_PNG27: c('penang'), W_SBH27: c('sabah'), W_SWK27: c('sarawak'),
    W_NOV26: nov.workdays, W_DEC26: dec.workdays, W_HOL27: W.holidays('selangor', 2027).length,
    W_VERIFIED: longDate(W.FACTS.verified, lang), W_VERIFIED_ISO: W.FACTS.verified
  };
}
const RT_EXAMPLE = { dob: '1990-05-15', sector: 'private', age: 60, start: '2015-01-01', salary: 4000 };
function retireMap(lang) {
  const { L, m, nf, tr, opt } = b3(lang), loc = L ? 'ms-MY' : 'en-GB', R = retireCore;
  const dl = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`, ymd = x => L ? `${x.years} tahun ${x.months} bulan ${x.days} hari` : `${pl(x.years, 'year')} ${pl(x.months, 'month')} ${pl(x.days, 'day')}`;
  const r = R.calculate(RT_EXAMPLE);
  const ms = { 50: L ? 'KWSP umur 50 (keluar Akaun Sejahtera)' : 'EPF age 50 (Akaun Sejahtera withdrawal)', 55: L ? 'KWSP umur 55 (Akaun 55, keluar penuh)' : 'EPF age 55 (Akaun 55, full withdrawal)', 60: L ? 'KWSP umur 60 (Akaun Emas)' : 'EPF age 60 (Akaun Emas)', 75: L ? 'Umur 75 (caruman KWSP wajib tamat)' : 'Age 75 (mandatory EPF contributions end)' };
  const lines = [tr(L ? 'Umur sekarang' : 'Age now', ymd(r.ageNow)), tr(L ? 'Umur bersara' : 'Retirement age', r.age), tr(L ? 'Tarikh bersara' : 'Retirement date', dl(r.date), 'total'), tr(L ? 'Masa lagi' : 'Time left', ymd(r.left)),
    ...r.milestones.map(x => tr(ms[x.age], dl(x.date)))].join('\n');
  const yr = [1966, 1970, 1975, 1980, 1985, 1990, 1995, 2000].map(y => `<tr><th scope="row">${y}</th><td>${y + 50}</td><td>${y + 55}</td><td>${y + 60}</td><td>${y + 75}</td></tr>`).join('\n');
  const pen = [[120, 3000], [240, 4000], [300, 4000], [360, 5000], [420, 6000]].map(([mo, s]) => { const x = R.calculate({ dob: '1980-01-01', sector: 'gov', start: R.birthday([1980, 1, 1], 60 - mo / 12), salary: s }); return `<tr><th scope="row">${mo} (${mo / 12} ${L ? 'tahun' : 'years'})</th><td>${m(s)}</td><td>${nf(x.pensionPct, 1)}%</td><td>${m(x.pension)}</td><td>${m(x.gratuity)}</td></tr>`; }).join('\n');
  const g = R.calculate({ dob: '1975-03-01', sector: 'gov', start: '2000-07-01', salary: 5000 }), o = R.calculate({ dob: '1980-01-10', sector: 'gov', age: 50, start: '2005-01-10', salary: 4000 });
  return {
    RT_DOB: RT_EXAMPLE.dob, RT_AGE: RT_EXAMPLE.age, RT_START: RT_EXAMPLE.start, RT_SALARY: RT_EXAMPLE.salary,
    RT_SECTOR_OPTIONS: [opt('private', 'Private sector', 'Sektor swasta', true), opt('gov', 'Civil servant (pensionable)', 'Penjawat awam (berpencen)')].join(''),
    RT_DATE: dl(r.date), RT_SUB: L ? `${ymd(r.left)} lagi · umur ${r.age}` : `${ymd(r.left)} to go · age ${r.age}`, RT_LEFT: ymd(r.left), RT_LINES: lines, RT_YEARS: yr, RT_PENSION: pen,
    RT_G_MONTHS: g.service.totalMonths, RT_G_PENSION: m(g.pension), RT_G_GRAT: m(g.gratuity), RT_O_PENSION: m(o.pension), RT_O_GRAT: m(o.gratuity),
    RT_TODAY: longDate(R.FACTS.verified, lang),
    RT_VERIFIED: longDate(R.FACTS.verified, lang), RT_VERIFIED_ISO: R.FACTS.verified
  };
}
// ---- batch 4: SSPN, unit trust, education cost, water bill
const SSPN_EXAMPLE = { balance: 0, monthly: 200, lump: 0, years: 18, rate: 4.1, income: 60000 };
function sspnMap(lang) {
  const { L, m, nf, tr } = b3(lang), r = sspnCore.calculate(SSPN_EXAMPLE), yr = y => L ? `Tahun ${y}` : `Year ${y}`;
  const lines = [tr(L ? 'Jumlah simpanan' : 'Total deposits', m(r.deposits)), tr(L ? 'Jumlah dividen' : 'Total dividends', m(r.dividends)), tr(L ? 'Baki akhir' : 'Final balance', m(r.balance), 'total'),
    tr(L ? 'Simpanan tahun ini' : 'Deposits this year', m(r.yearDeposit)), tr(L ? 'Pelepasan cukai (had RM8,000)' : 'Tax relief (RM8,000 cap)', m(r.relief)), tr(L ? 'Cukai dijimat setahun' : 'Tax saved a year', m(r.taxSaved), 'total'),
    tr(L ? 'Baki had pelepasan belum guna' : 'Relief cap left unused', m(r.unused))].join('\n');
  const rowsT = r.rows.map(x => `<tr><th scope="row">${yr(x.year)}</th><td>${m(x.deposits)}</td><td>${m(x.dividends)}</td><td>${m(x.balance)}</td></tr>`).join('\n');
  const grid = [50, 100, 200, 300, 500, 667].map(mo => `<tr><th scope="row">${m(mo)}</th>${[5, 10, 15, 18].map(y => `<td>${m(sspnCore.calculate({ monthly: mo, years: y, rate: 4.1 }).balance)}</td>`).join('')}</tr>`).join('\n');
  const tax = [30000, 50000, 70000, 100000, 150000].map(ci => `<tr><th scope="row">${m(ci)}</th>${[2400, 6000, 8000].map(d => `<td>${m(sspnCore.taxSaved(ci, d))}</td>`).join('')}</tr>`).join('\n');
  const divs = sspnCore.FACTS.dividends.map(([y, d]) => `<tr><th scope="row">${y}</th><td>${nf(d, 2)}%</td></tr>`).join('\n');
  const mx = sspnCore.calculate({ monthly: 667, years: 1, rate: 4.1, income: 60000 }), hi = sspnCore.calculate({ monthly: 667, years: 1, rate: 4.1, income: 120000 });
  return {
    S_MONTHLY: SSPN_EXAMPLE.monthly, S_YEARS: SSPN_EXAMPLE.years, S_RATE: SSPN_EXAMPLE.rate, S_INCOME: SSPN_EXAMPLE.income,
    S_BALANCE: m(r.balance), S_DEPOSITS: m(r.deposits), S_DIVIDENDS: m(r.dividends), S_SAVED: m(r.taxSaved), S_RELIEF: m(r.relief),
    S_SUB: L ? `${m(r.deposits)} simpanan + ${m(r.dividends)} dividen` : `${m(r.deposits)} deposits + ${m(r.dividends)} dividends`,
    S_LINES: lines, S_ROWS: rowsT, S_GRID: grid, S_TAX: tax, S_DIVS: divs, S_MAX_SAVED: m(sspnCore.taxSaved(60000, 8000)), S_HI_SAVED: m(sspnCore.taxSaved(120000, 8000)),
    S_ONE_YEAR: m(sspnCore.calculate({ monthly: 200, years: 1, rate: 4.1 }).balance),
    S_VERIFIED: longDate(sspnCore.FACTS.verified, lang), S_VERIFIED_ISO: sspnCore.FACTS.verified
  };
}
const UT_EXAMPLE = { lump: 10000, monthly: 300, years: 10, gross: 7, charge: 3, fee: 1.6 };
function unittrustMap(lang) {
  const { L, m, nf, tr } = b3(lang), r = unittrustCore.calculate(UT_EXAMPLE), yr = y => L ? `Tahun ${y}` : `Year ${y}`;
  const lines = [tr(L ? 'Jumlah dilabur' : 'Total invested', m(r.paid)), tr(L ? 'Caj jualan' : 'Sales charges', '− ' + m(r.charges)), tr(L ? 'Yuran tahunan' : 'Yearly fees', '− ' + m(r.fees)),
    tr(L ? 'Nilai akhir' : 'Final value', m(r.value), 'total'), tr(L ? 'Untung' : 'Profit', m(r.profit)), tr(L ? 'Pulangan bersih setahun' : 'Net return a year', nf(r.net, 2) + '%'),
    tr(L ? 'Melalui KWSP i-Invest (caj 0.5%)' : 'Through EPF i-Invest (0.5% charge)', m(r.iInvest)), tr(L ? 'Tanpa caj dan yuran' : 'With no charges or fees', m(r.noCost)), tr(L ? 'Kos caj dan yuran' : 'Cost of charges and fees', m(r.costOfFees), 'total')].join('\n');
  const rowsT = r.rows.map(x => `<tr><th scope="row">${yr(x.year)}</th><td>${m(x.paid)}</td><td>${m(x.value)}</td><td>${m(x.value - x.paid)}</td></tr>`).join('\n');
  const grid = [0, 0.5, 1, 2, 3, 5, 5.5].map(c => { const x = unittrustCore.calculate({ ...UT_EXAMPLE, charge: c }); return `<tr><th scope="row">${nf(c, 1)}%</th><td>${m(x.charges)}</td><td>${m(x.value)}</td><td>${nf(x.net, 2)}%</td></tr>`; }).join('\n');
  const fees = [0.5, 1, 1.5, 1.6, 1.85, 2].map(fe => { const x = unittrustCore.calculate({ ...UT_EXAMPLE, fee: fe }); return `<tr><th scope="row">${nf(fe, 2)}%</th><td>${m(x.fees)}</td><td>${m(x.value)}</td><td>${nf(x.net, 2)}%</td></tr>`; }).join('\n');
  const lump = unittrustCore.calculate({ lump: 10000, years: 1, gross: 7, charge: 5 });
  return {
    U_LUMP: UT_EXAMPLE.lump, U_MONTHLY: UT_EXAMPLE.monthly, U_YEARS: UT_EXAMPLE.years, U_GROSS: UT_EXAMPLE.gross, U_CHARGE: UT_EXAMPLE.charge, U_FEE: UT_EXAMPLE.fee,
    U_VALUE: m(r.value), U_PAID: m(r.paid), U_NET: nf(r.net, 2), U_CHARGES: m(r.charges), U_FEES: m(r.fees), U_IINVEST: m(r.iInvest), U_NOCOST: m(r.noCost), U_COST: m(r.costOfFees),
    U_SUB: L ? `${m(r.paid)} dilabur · pulangan bersih ${nf(r.net, 2)}% setahun` : `${m(r.paid)} invested · net return ${nf(r.net, 2)}% a year`,
    U_LINES: lines, U_ROWS: rowsT, U_GRID: grid, U_FEETABLE: fees, U_LUMP5: m(10000 - 10000 / 1.05), U_LUMP5_VALUE: m(lump.value),
    U_VERIFIED: longDate(unittrustCore.FACTS.verified, lang), U_VERIFIED_ISO: unittrustCore.FACTS.verified
  };
}
const EDU_EXAMPLE = { age: 5, start: 18, study: 4, cost: 25000, inflation: 5, ret: 4.1, saved: 5000 };
function eduMap(lang) {
  const { L, m, tr } = b3(lang), r = eduCore.calculate(EDU_EXAMPLE);
  const lines = [tr(L ? 'Tahun sebelum masuk universiti' : 'Years until university', r.years), tr(L ? 'Kos pada harga hari ini' : 'Cost at today\'s prices', m(r.today)), tr(L ? 'Kos pada harga masa depan' : 'Cost at future prices', m(r.total)),
    tr(L ? 'Perlu ada pada hari pertama' : 'Needed on day one', m(r.need)), tr(L ? 'Simpanan sedia ada (bertambah)' : 'Existing savings (grown)', '− ' + m(r.grown)), tr(L ? 'Kekurangan' : 'Shortfall', m(r.gap)), tr(L ? 'Simpan sebulan' : 'Save a month', m(r.monthly), 'total')].join('\n');
  const yrs = r.list.map(x => tr(L ? `Tahun ${x.year} (umur ${x.age})` : `Year ${x.year} (age ${x.age})`, m(x.cost))).join('\n');
  const byAge = [0, 3, 5, 7, 10, 12, 15].map(a => { const x = eduCore.calculate({ ...EDU_EXAMPLE, age: a, saved: 0 }); return `<tr><th scope="row">${a}</th><td>${x.years}</td><td>${m(x.total)}</td><td><strong>${m(x.monthly)}</strong></td></tr>`; }).join('\n');
  const byCost = [10000, 15000, 25000, 40000, 60000].map(c => { const x = eduCore.calculate({ ...EDU_EXAMPLE, cost: c, saved: 0 }); return `<tr><th scope="row">${m(c)}</th><td>${m(c * 4)}</td><td>${m(x.total)}</td><td>${m(x.monthly)}</td></tr>`; }).join('\n');
  const z = eduCore.calculate({ ...EDU_EXAMPLE, age: 0, saved: 0 }), t = eduCore.calculate({ ...EDU_EXAMPLE, age: 12, saved: 0 }), n = eduCore.calculate({ ...EDU_EXAMPLE, inflation: 0, ret: 0, saved: 0 });
  return {
    D_AGE: EDU_EXAMPLE.age, D_START: EDU_EXAMPLE.start, D_STUDY: EDU_EXAMPLE.study, D_COST: EDU_EXAMPLE.cost, D_INFL: EDU_EXAMPLE.inflation, D_RET: EDU_EXAMPLE.ret, D_SAVED: EDU_EXAMPLE.saved,
    D_MONTHLY: m(r.monthly), D_TOTAL: m(r.total), D_FIRST: m(r.list[0].cost), D_NEED: m(r.need),
    D_SUB: L ? `Jumlah ${m(r.total)} untuk ${r.study} tahun dari umur ${r.startAge}` : `Total ${m(r.total)} for ${r.study} years from age ${r.startAge}`,
    D_LINES: lines, D_YEARS: yrs, D_BYAGE: byAge, D_BYCOST: byCost, D_BIRTH: m(z.monthly), D_TWELVE: m(t.monthly), D_FLAT: m(n.monthly),
    D_VERIFIED: longDate(eduCore.FACTS.verified, lang), D_VERIFIED_ISO: eduCore.FACTS.verified
  };
}
const WATER_EXAMPLE = { state: 'selangor', m3: 30 };
function waterMap(lang) {
  const { L, m, nf, tr } = b3(lang), W = waterCore, r = W.calculate(WATER_EXAMPLE), n = W.name(r.state, lang);
  const band = L ? ['0–20 m³', '20–35 m³', 'Melebihi 35 m³'] : ['0–20 m³', '20–35 m³', 'Above 35 m³'];
  const lines = [...r.lines.map((l, i) => l.m3 || i === 0 ? tr(`${band[i]}: ${nf(l.m3)} m³ × ${m(l.rate)}`, m(l.amount)) : '').filter(Boolean),
    tr(L ? 'Caj penggunaan' : 'Usage charge', m(r.usage)), tr(L ? 'Bil sebulan' : 'Bill a month', m(r.total), 'total'), tr(L ? 'Purata setiap m³' : 'Average per m³', m(r.perM3)), tr(L ? 'Liter sehari' : 'Litres a day', nf(r.daily, 0))].join('\n');
  const opts = W.STATES.map(s => `<option value="${s[0]}"${s[0] === r.state ? ' selected' : ''}>${W.name(s[0], lang)}</option>`).join('');
  const tariffs = W.STATES.map(s => `<tr><th scope="row">${W.name(s[0], lang)}</th><td>${s[2]}</td><td>${m(s[4][0])}</td><td>${m(s[4][1])}</td><td>${m(s[4][2])}</td><td>${m(s[5])}</td><td>${longDate(s[3], lang)}</td></tr>`).join('\n');
  const bills = W.STATES.map(s => `<tr><th scope="row">${W.name(s[0], lang)}</th>${[10, 20, 30, 35, 50].map(q => `<td>${m(W.calculate({ state: s[0], m3: q }).total)}</td>`).join('')}</tr>`).join('\n');
  const b = (k, q) => m(W.calculate({ state: k, m3: q }).total);
  return {
    W_STATE_OPTIONS: opts, W_M3: WATER_EXAMPLE.m3, W_BILL: m(r.total), W_SUB: L ? `${nf(r.m3)} m³ di ${n} · ${r.operator}` : `${nf(r.m3)} m³ in ${n} · ${r.operator}`,
    W_LINES: lines, W_TARIFFS: tariffs, W_BILLS: bills,
    W_SEL20: b('selangor', 20), W_SEL50: b('selangor', 50), W_JOH30: b('johor', 30), W_PNG35: b('penang', 35), W_PNG30: b('penang', 30), W_MLK30: b('melaka', 30), W_KDH30: b('kedah', 30), W_KEL30: b('kelantan', 30), W_TRG30: b('terengganu', 30),
    W_VERIFIED: longDate(W.FACTS.verified, lang), W_VERIFIED_ISO: W.FACTS.verified
  };
}
// ---- batch 5: qibla, retirement savings, annual leave, termination benefits
function qiblaMap(lang) {
  const { L, nf, tr } = b3(lang), Q = qiblaCore, r = Q.calculate({ place: 'kl' });
  const opts = Q.PLACES.map(p => `<option value="${p[0]}"${p[0] === 'kl' ? ' selected' : ''}>${p[1]}</option>`).join('') + `<option value="custom">${L ? 'Koordinat sendiri' : 'My own coordinates'}</option>`;
  const lines = [tr(L ? 'Arah kiblat (darjah)' : 'Qibla bearing (degrees)', nf(r.bearing, 2) + '°', 'total'), tr(L ? 'Dari arah barat' : 'From due west', L ? `${nf(r.fromWest, 2)}° ke utara dari barat` : `${nf(r.fromWest, 2)}° north of west`),
    tr(L ? 'Mata angin' : 'Compass point', Q.point(r.bearing, lang)), tr(L ? 'Jarak ke Kaabah' : 'Distance to the Kaaba', nf(r.km, 0) + ' km'), tr(L ? 'Koordinat' : 'Coordinates', `${nf(r.lat, 4)}, ${nf(r.lon, 4)}`)].join('\n');
  const table = Q.PLACES.map(p => { const x = Q.calculate({ place: p[0] }); return `<tr><th scope="row">${p[1]}</th><td>${x.dm}</td><td>${nf(x.bearing, 2)}°</td><td>${nf(x.km, 0)} km</td></tr>`; }).join('\n');
  const b = k => Q.calculate({ place: k });
  return {
    Q_PLACE_OPTIONS: opts, Q_LAT: r.lat, Q_LON: r.lon, Q_DM: r.dm, Q_DEG: nf(r.bearing, 2), Q_KM: nf(r.km, 0), Q_ROT: r.bearing.toFixed(2), Q_WEST: nf(r.fromWest, 2),
    Q_SUB: L ? `${nf(r.bearing, 2)}° dari utara benar · ${Q.point(r.bearing, 'ms')} · ${nf(r.km, 0)} km ke Kaabah` : `${nf(r.bearing, 2)}° from true north · ${Q.point(r.bearing, 'en')} · ${nf(r.km, 0)} km to the Kaaba`,
    Q_LINES: lines, Q_TABLE: table, Q_JB: b('jb').dm, Q_KK: b('kk').dm, Q_KUCHING: b('kuching').dm, Q_PENANG: b('georgetown').dm, Q_KB: b('kotabharu').dm,
    Q_VERIFIED: longDate(Q.FACTS.verified, lang), Q_VERIFIED_ISO: Q.FACTS.verified
  };
}
const NEST_EXAMPLE = { age: 35, retire: 60, until: 85, expense: 3000, inflation: 2.5, pre: 5, post: 4, saved: 80000, monthly: 1000 };
function nesteggMap(lang) {
  const { L, m, nf, tr } = b3(lang), N = nesteggCore, r = N.calculate(NEST_EXAMPLE);
  const lines = [tr(L ? 'Tahun sebelum bersara' : 'Years until retirement', r.years), tr(L ? 'Perbelanjaan sebulan semasa bersara' : 'Monthly expenses at retirement', m(r.first)), tr(L ? 'Simpanan diperlukan semasa bersara' : 'Savings needed at retirement', m(r.need), 'total'),
    tr(L ? 'Diperlukan (nilai hari ini)' : 'Needed (in today\'s money)', m(r.needToday)), tr(L ? 'Simpanan dijangka semasa bersara' : 'Projected savings at retirement', m(r.projected)), tr(L ? 'Kekurangan' : 'Shortfall', m(r.gap)),
    tr(L ? 'Simpanan tambahan sebulan' : 'Extra saving a month', m(r.extra), 'total'), tr(L ? 'Wang bertahan hingga' : 'Money lasts until', (L ? 'Umur ' : 'Age ') + nf(r.runsOutAge, 1))].join('\n');
  const byExp = [2000, 3000, 4000, 5000, 8000].map(e => { const x = N.calculate({ ...NEST_EXAMPLE, expense: e }); return `<tr><th scope="row">${m(e)}</th><td>${m(x.first)}</td><td>${m(x.need)}</td><td>${m(x.needToday)}</td></tr>`; }).join('\n');
  const lasts = [1500, 2000, 3000, 4000].map(e => `<tr><th scope="row">${m(e)}</th>${[N.FACTS.basic, N.FACTS.adequate, N.FACTS.enhanced].map(bal => { const d = N.drawdown(bal, e, 0.025, 0.04, 50 * 12); return `<td>${d.runsOut === null ? (L ? 'Melepasi 110' : 'Past 110') : nf(60 + d.runsOut / 12, 1)}</td>`; }).join('')}</tr>`).join('\n');
  const phase = N.FACTS.basicPhase.map(([y, v]) => `<tr><th scope="row">${y}</th><td>${m(v)}</td></tr>`).join('\n');
  return {
    N_AGE: NEST_EXAMPLE.age, N_RETIRE: NEST_EXAMPLE.retire, N_UNTIL: NEST_EXAMPLE.until, N_EXPENSE: NEST_EXAMPLE.expense, N_INFL: NEST_EXAMPLE.inflation, N_PRE: NEST_EXAMPLE.pre, N_POST: NEST_EXAMPLE.post, N_SAVED: NEST_EXAMPLE.saved, N_MONTHLY: NEST_EXAMPLE.monthly,
    N_NEED: m(r.need), N_PROJ: m(r.projected), N_GAP: m(r.gap), N_EXTRA: m(r.extra), N_FIRST: m(r.first), N_TODAY: m(r.needToday), N_RUNS: nf(r.runsOutAge, 1),
    N_SUB: L ? `Dijangka ${m(r.projected)}: kurang ${m(r.gap)}` : `Projected ${m(r.projected)}: short by ${m(r.gap)}`,
    N_LINES: lines, N_BYEXP: byExp, N_LASTS: lasts, N_PHASE: phase,
    N_BASIC_LASTS: nf(60 + N.drawdown(390000, 2000, 0.025, 0.04, 600).runsOut / 12, 1),
    N_VERIFIED: longDate(N.FACTS.verified, lang), N_VERIFIED_ISO: N.FACTS.verified
  };
}
const LEAVE_EXAMPLE = { start: '2022-03-01', end: '2026-06-30', leaving: 'yes', taken: 3, wage: 3900 };
function leaveMap(lang) {
  const { L, m, tr, opt } = b3(lang), Lv = leaveCore, r = Lv.calculate(LEAVE_EXAMPLE), d = n => L ? `${n} hari` : `${n} days`, ym = mo => L ? `${Math.floor(mo / 12)} tahun ${mo % 12} bulan` : `${Math.floor(mo / 12)} years ${mo % 12} months`;
  const lines = [tr(L ? 'Tempoh perkhidmatan' : 'Length of service', ym(r.months)), tr(L ? 'Cuti tahunan penuh' : 'Full annual leave', d(r.full)), tr(L ? 'Bulan dikira tahun ini' : 'Months counted this year', r.counted),
    tr(L ? 'Cuti tahunan layak' : 'Annual leave earned', d(r.earned), 'total'), tr(L ? 'Sudah diambil' : 'Already taken', d(r.taken)), tr(L ? 'Baki' : 'Balance', d(r.balance), 'total'),
    tr(L ? 'Kadar gaji harian (gaji ÷ 26)' : 'Daily rate (wage ÷ 26)', m(r.orp)), tr(L ? 'Bayaran cuti tidak diambil' : 'Pay for unused leave', m(r.payout), 'total')].join('\n');
  const other = [tr(L ? 'Cuti sakit setahun' : 'Sick leave a year', d(r.sick)), tr(L ? 'Cuti hospital setahun' : 'Hospitalisation leave a year', d(r.hospital)), tr(L ? 'Cuti bersalin' : 'Maternity leave', d(r.maternity)), tr(L ? 'Cuti paterniti' : 'Paternity leave', d(r.paternity))].join('\n');
  const tiers = [[L ? 'Bawah 2 tahun' : 'Under 2 years', 0], [L ? '2 hingga bawah 5 tahun' : '2 to under 5 years', 1], [L ? '5 tahun atau lebih' : '5 years or more', 2]].map(([n, t]) => `<tr><th scope="row">${n}</th><td>${d(Lv.FACTS.annual[t])}</td><td>${d(Lv.FACTS.sick[t])}</td><td>${d(Lv.FACTS.hospital)}</td></tr>`).join('\n');
  const pro = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(mo => `<tr><th scope="row">${mo}</th>${[1, 3, 6].map(y => `<td>${Lv.annual(y, mo)}</td>`).join('')}</tr>`).join('\n');
  return {
    L_START: LEAVE_EXAMPLE.start, L_END: LEAVE_EXAMPLE.end, L_TAKEN: LEAVE_EXAMPLE.taken, L_WAGE: LEAVE_EXAMPLE.wage,
    L_LEAVING_OPTIONS: [opt('yes', 'Yes, this is my last day', 'Ya, ini hari terakhir saya', true), opt('no', 'No, still working (this year\'s leave)', 'Tidak, masih bekerja (cuti tahun ini)')].join(''),
    L_DAYS: d(r.earned), L_SUB: L ? `daripada ${r.full} hari setahun (2 hingga 5 tahun berkhidmat)` : `of ${r.full} days a year (2 to 5 years of service)`, L_PAY: m(r.payout),
    L_LINES: lines, L_OTHER: other, L_TIERS: tiers, L_PRO: pro, L_JOIN: Lv.calculate({ start: '2026-04-01', end: '2026-10-14' }).earned,
    L_VERIFIED: longDate(Lv.FACTS.verified, lang), L_VERIFIED_ISO: Lv.FACTS.verified
  };
}
const TERM_EXAMPLE = { start: '2019-01-01', end: '2026-06-30', wage: 3500, reason: 'retrench', manual: 'no', contract: 0 };
function terminationMap(lang) {
  const { L, m, nf, tr, opt } = b3(lang), Tm = terminationCore, r = Tm.calculate(TERM_EXAMPLE), w = n => L ? `${n} minggu` : `${n} weeks`, ym = mo => L ? `${Math.floor(mo / 12)} tahun ${mo % 12} bulan` : `${Math.floor(mo / 12)} years ${mo % 12} months`;
  const lines = [tr(L ? 'Tempoh perkhidmatan' : 'Length of service', ym(r.months)), tr(L ? 'Tempoh notis' : 'Notice period', w(r.notice)), tr(L ? 'Gaji ganti notis' : 'Pay in lieu of notice', m(r.inLieu), 'total'),
    tr(L ? 'Hari gaji setahun' : 'Days\' wages a year', r.daysPerYear), tr(L ? 'Tahun dikira (ke bulan terdekat)' : 'Years counted (to the nearest month)', nf(r.rounded / 12, 2)), tr(L ? 'Hari faedah' : 'Benefit days', nf(r.benefitDays, 2)),
    tr(L ? 'Kadar gaji harian (gaji ÷ 26)' : 'Daily rate (wage ÷ 26)', m(r.orp)), tr(L ? 'Faedah penamatan minimum' : 'Minimum termination benefit', m(r.benefit), 'total')].join('\n');
  const byYears = [1, 2, 3, 5, 7, 10, 15, 20].map(y => { const x = Tm.calculate({ start: `${2026 - y}-07-01`, end: '2026-06-30', wage: 3000 }); return `<tr><th scope="row">${y}</th><td>${w(x.notice)}</td><td>${x.daysPerYear}</td><td>${nf(x.benefitDays, 0)}</td><td>${m(x.benefit)}</td></tr>`; }).join('\n');
  return {
    T_START: TERM_EXAMPLE.start, T_END: TERM_EXAMPLE.end, T_WAGE: TERM_EXAMPLE.wage,
    T_REASON_OPTIONS: [opt('retrench', 'Retrenchment or lay-off', 'Pemberhentian (retrenchment)', true), opt('terminate', 'Terminated by the employer', 'Ditamatkan oleh majikan'), opt('resign', 'I resigned', 'Saya meletak jawatan')].join(''),
    T_MANUAL_OPTIONS: [opt('no', 'No', 'Tidak', true), opt('yes', 'Yes (manual or supervising manual work)', 'Ya (kerja manual atau menyelia kerja manual)')].join(''),
    T_BENEFIT: m(r.benefit), T_NOTICE: r.notice, T_LIEU: m(r.inLieu), T_DAYS: nf(r.benefitDays, 0), T_ORP: m(r.orp),
    T_SUB: L ? `Notis ${r.notice} minggu · ${m(r.inLieu)} gaji ganti notis` : `${r.notice} weeks' notice · ${m(r.inLieu)} in lieu`, T_LINES: lines, T_BYYEARS: byYears,
    T_THREE: m(Tm.calculate({ start: '2023-01-01', end: '2025-12-31', wage: 2600 }).benefit),
    T_VERIFIED: longDate(Tm.FACTS.verified, lang), T_VERIFIED_ISO: Tm.FACTS.verified
  };
}
// ---- road tax (LKM)
const ROAD_EXAMPLE = { type: 'car', region: 'peninsular', body: 'saloon', owner: 'individual', cc: 1496, kw: 150, watts: 5000, months: 12 };
const ROAD_MODELS = [['Perodua Myvi 1.5', 'car', 1496, 'saloon'], ['Honda City 1.5', 'car', 1498, 'saloon'], ['Proton X50 1.5T', 'car', 1477, 'saloon'], ['Proton X70 1.8T', 'car', 1799, 'saloon'],
  ['Honda CR-V 1.5T', 'car', 1498, 'nonSaloon'], ['Toyota Camry 2.5', 'car', 2487, 'saloon'], ['Toyota Hilux 2.4', 'car', 2393, 'nonSaloon'],
  ['BYD Atto 3', 'ev', 150], ['Tesla Model 3 RWD', 'ev', 208], ['Tesla Model Y RWD', 'ev', 220], ['BMW iX xDrive50', 'ev', 385], ['Lotus Eletre R', 'ev', 675]];
function roadtaxMap(lang) {
  const { L, m, nf, tr, opt } = b3(lang), R = roadtaxCore, r = R.calculate(ROAD_EXAMPLE), t = o => R.calculate(o).tax;
  const fmt = (b, prev) => b[2] ? (L ? `RM${nf(b[1])} + RM${b[2].toFixed(2)}/cc melebihi ${nf(prev, 0)} cc` : `RM${nf(b[1])} + RM${b[2].toFixed(2)}/cc above ${nf(prev, 0)} cc`) : m(b[1]);
  const band = (bands, i) => { const prev = i ? bands[i - 1][0] : 0; return { prev, label: bands[i][0] === Infinity ? (L ? `Melebihi ${nf(prev, 0)}` : `Above ${nf(prev, 0)}`) : `${nf(prev + 1, 0)}–${nf(bands[i][0], 0)}` }; };
  const pen = R.CAR.saloon.map((b, i) => { const { prev, label } = band(R.CAR.saloon, i); return `<tr><th scope="row">${label}</th><td>${fmt(b, prev)}</td><td>${fmt(R.CAR.nonSaloon[i], prev)}</td><td>${fmt(R.CAR.companySaloon[i], prev)}</td></tr>`; }).join('\n');
  const east = R.CAR.eastSaloon.map((b, i) => { const { prev, label } = band(R.CAR.eastSaloon, i); return `<tr><th scope="row">${label}</th><td>${fmt(b, prev)}</td><td>${fmt(R.CAR.eastNonSaloon[i], prev)}</td></tr>`; }).join('\n');
  const evT = R.EV.slice(1).map((b, i) => { const lo = i ? R.EV[i][0] : 0; return `<tr><th scope="row">${'ABCDEFGHIJ'[i]}</th><td>${nf(lo, 0)}–${nf(b[0], 0)} kW</td><td>${m(b[1])}</td><td>${b[3] ? m(b[3]) : '—'}</td><td>${m(R.ev(b[0]).tax)}</td></tr>`; }).join('\n') +
    `\n<tr><th scope="row">K</th><td>${L ? 'Melebihi' : 'Above'} 1,010 kW</td><td>${m(R.EV_TOP)}</td><td>—</td><td>${m(R.EV_TOP)}</td></tr>`;
  const moto = R.MOTO.map((b, i) => { const prev = i ? R.MOTO[i - 1][0] : 0, label = b[0] === Infinity ? (L ? `Melebihi ${prev}` : `Above ${prev}`) : `${prev + 1}–${b[0]}`; return `<tr><th scope="row">${label} cc</th><td>${b[1] === null ? (L ? 'Bercanggah (RM100 atau RM180)' : 'Conflicting (RM100 or RM180)') : m(b[1])}</td><td>${m(b[2])}</td></tr>`; }).join('\n');
  const emoto = R.EMOTO.map((b, i) => { const prev = i ? R.EMOTO[i - 1][0] : 0, label = b[0] === Infinity ? (L ? `Melebihi ${nf(prev, 0)} W` : `Above ${nf(prev, 0)} W`) : `${nf(prev ? prev + 1 : 0, 0)}–${nf(b[0], 0)} W`; return `<tr><th scope="row">${label}</th><td>${m(b[1])}</td></tr>`; }).join('\n');
  const models = ROAD_MODELS.map(([n, ty, v, body]) => { const x = ty === 'ev' ? t({ type: 'ev', kw: v }) : t({ cc: v, body }); const desc = ty === 'ev' ? `${v} kW` : `${nf(v, 0)} cc, ${body === 'saloon' ? 'saloon' : (L ? 'bukan saloon' : 'non-saloon')}`; return `<tr><th scope="row">${n}</th><td>${desc}</td><td>${m(x)}</td><td>${m(x / 2)}</td></tr>`; }).join('\n');
  const comp = R.FACTS.compound.map(([d, c], i) => `<tr><th scope="row">${i ? R.FACTS.compound[i - 1][0] + 1 : 1}–${d} ${L ? 'hari' : 'days'}</th><td>${m(c)}</td></tr>`).join('\n');
  const lines = [tr(L ? 'Jalur' : 'Band', '1,401–1,600 cc'), tr(L ? 'Kiraan' : 'Calculation', L ? 'RM90 tetap' : 'RM90 flat'), tr(L ? '12 bulan' : '12 months', m(r.annual), 'total'), tr(L ? '6 bulan' : '6 months', m(r.half)), tr(L ? 'Purata sebulan' : 'Average a month', m(r.monthly))].join('\n');
  return {
    RT_TYPE_OPTIONS: [opt('car', 'Car (petrol, diesel or hybrid)', 'Kereta (petrol, diesel atau hibrid)', true), opt('ev', 'Electric car', 'Kereta elektrik'), opt('moto', 'Motorcycle', 'Motosikal'), opt('emoto', 'Electric motorcycle', 'Motosikal elektrik')].join(''),
    RT_REGION_OPTIONS: [opt('peninsular', 'Peninsular Malaysia', 'Semenanjung Malaysia', true), opt('east', 'Sabah and Sarawak', 'Sabah dan Sarawak'), opt('labuan', 'Labuan', 'Labuan'), opt('langkawi', 'Langkawi or Pangkor', 'Langkawi atau Pangkor')].join(''),
    RT_BODY_OPTIONS: [opt('saloon', 'Saloon (as on your VOC)', 'Saloon (ikut geran)', true), opt('nonSaloon', 'Non-saloon (MPV, SUV, pickup)', 'Bukan saloon (MPV, SUV, pikap)')].join(''),
    RT_OWNER_OPTIONS: [opt('individual', 'Individual', 'Individu', true), opt('company', 'Company', 'Syarikat')].join(''),
    RT_MONTHS_OPTIONS: [opt('12', '12 months', '12 bulan', true), opt('6', '6 months', '6 bulan')].join(''),
    RT_CC: ROAD_EXAMPLE.cc, RT_KW: ROAD_EXAMPLE.kw, RT_W: ROAD_EXAMPLE.watts,
    RT_TAX: m(r.tax), RT_SUB: L ? '12 bulan · Kereta persendirian saloon · Semenanjung' : '12 months · Car private saloon · Peninsular', RT_LINES: lines,
    RT_PEN: pen, RT_EAST: east, RT_EVT: evT, RT_MOTO: moto, RT_EMOTO: emoto, RT_MODELS: models, RT_COMPOUND: comp,
    RT_1800: m(t({ cc: 1798 })), RT_2000: m(t({ cc: 1998 })), RT_2000NS: m(t({ cc: 1998, body: 'nonSaloon' })), RT_CAMRY: m(t({ cc: 2487 })), RT_CAMRY_CO: m(t({ cc: 2487, owner: 'company' })),
    RT_ATTO: m(t({ type: 'ev', kw: 150 })), RT_M3: m(t({ type: 'ev', kw: 208 })), RT_EAST15: m(t({ cc: 1496, region: 'east' })), RT_LABUAN15: m(t({ cc: 1496, region: 'labuan' })), RT_LANGKAWI15: m(t({ cc: 1496, region: 'langkawi' })),
    RT_VERIFIED: longDate(R.FACTS.verified, lang), RT_VERIFIED_ISO: R.FACTS.verified
  };
}
// Gzip size rendered into the page, so the tools' stats lines never grow (and reflow) after load.
const kbText = n => n < 1024 ? n + ' B' : (n / 1024).toFixed(n < 10240 ? 2 : 1) + ' KB';
const gzText = t => ' · ' + kbText(zlib.gzipSync(Buffer.from(t)).length) + ' gzipped';
const RENDERERS = { purge: purgeMap, html: htmlMap, js: jsMap, cgpaPercent: cgpaPercentMap, cgpa: cgpaMap, tax: taxMap, epf: epfMap, loan: loanMap, car: carMap, asb: asbMap, prorate: prorateMap, ot: otMap, land: landMap, personal: personalMap, rpgt: rpgtMap, bmi: bmiMap, zakat: zakatMap, gold: goldMap, goldprice: goldPriceMap, prompt: promptMap, img2prompt: imgMap, fuel: fuelMap, ncd: ncdMap, iddah: iddahMap, hijri: hijriMap, tnb: tnbMap, ptptn: ptptnMap, fidyah: fidyahMap, debt: debtMap, refi: refiMap, rentbuy: rentbuyMap, fd: fdMap, employer: employerMap, margin: marginMap, roas: roasMap, freelance: freelanceMap, workdays: workdaysMap, retire: retireMap, sspn: sspnMap, unittrust: unittrustMap, edu: eduMap, water: waterMap, qibla: qiblaMap, nestegg: nesteggMap, leave: leaveMap, termination: terminationMap, roadtax: roadtaxMap, track: trackMap, near: nearMap, css: cssMap };

// ---- Share: plain links to each network (no third-party scripts), copy link, and the device share sheet
// where supported. "Share result" shares the current URL, whose hash holds the calculator inputs.
const SHARE_ICONS = {
  whatsapp: 'M3 21l1.7-5A8.5 8.5 0 1 1 8 19.4Z M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8c-1.2-.5-2.2-1.5-2.7-2.7l.8-1-1-2Z',
  telegram: 'M21 4 3 11l6 2 2 6 3-4 5 4Z M9 13l12-9',
  facebook: 'M15 3h-2a4 4 0 0 0-4 4v3H7v4h2v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2Z',
  x: 'M4 4l16 16M20 4 4 20',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  more: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13'
};
const shareIcon = k => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${SHARE_ICONS[k]}"/></svg>`;
function shareBlock(p, url) {
  const t = T[p.lang], u = encodeURIComponent(url), msg = encodeURIComponent(p.title);
  const nets = [
    ['whatsapp', 'WhatsApp', `https://wa.me/?text=${msg}%20${u}`],
    ['telegram', 'Telegram', `https://t.me/share/url?url=${u}&text=${msg}`],
    ['facebook', 'Facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`],
    ['x', 'X', `https://x.com/intent/post?url=${u}&text=${msg}`]
  ];
  return `<section class="container share" aria-labelledby="share-h">
  <h2 id="share-h">${esc(p.shareTitle || t.SHARE_H)}</h2>
  <div class="share-row">
${nets.map(([k, name, href]) => `    <a class="btn ghost sm share-${k}" href="${esc(href)}" target="_blank" rel="noopener nofollow">${shareIcon(k)}${name}</a>`).join('\n')}
    <button type="button" class="btn ghost sm" data-share="copy" data-url="${url}" data-done="${t.COPIED}">${shareIcon('link')}${t.COPY}</button>
    <button type="button" class="btn ghost sm" data-share="native" data-url="${url}" hidden>${shareIcon('more')}${t.MORE}</button>
  </div>
</section>`;
}
const shareResult = lang => `<button type="button" class="btn sm" data-share="result" data-done="${T[lang].COPIED}">${shareIcon('more')}${T[lang].SHARE_RESULT}</button>`;
const shareScript = `<script>
(function(){
  var native=!!navigator.share;
  document.querySelectorAll('[data-share="native"]').forEach(function(b){b.hidden=!native});
  function done(b){var t=b.lastChild,old=t.nodeValue;t.nodeValue=b.getAttribute("data-done");setTimeout(function(){t.nodeValue=old},2000)}
  function copy(b,u){if(navigator.clipboard)navigator.clipboard.writeText(u).then(function(){done(b)},function(){})}
  document.addEventListener("click",function(e){
    var b=e.target.closest("[data-share]");if(!b)return;
    var kind=b.getAttribute("data-share"),u=kind==="result"?location.href:b.getAttribute("data-url");
    if(kind!=="copy"&&native){navigator.share({title:document.title,url:u}).catch(function(){});return}
    copy(b,u);
  });
})();
</script>`;

// ---- content pages
const outputs = new Map([['/', homeHtml]]);
for (const p of pages) {
  // The gold price pages change every day with the price.
  if (p.render === 'goldprice' && goldDate) p.dateModified = goldDate;
  // The fuel pages change every week with the prices.
  if (p.render === 'fuel' && fuelLatest.date > p.dateModified) p.dateModified = fuelLatest.date;
  // The Hijri pages show "today" and the next Islamic dates; they move with the daily gold rebuild (deterministic per commit).
  if (p.render === 'hijri') p.dateModified = [p.dateModified, goldDate, fuelLatest.date].filter(Boolean).sort().pop();
  // Renderer values can appear in FAQ answers as {{KEY}} (plain text), so schema and page quote the same figures.
  const rendered = p.render ? RENDERERS[p.render](p.lang, p) : {};
  const fill = t => t.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => k in rendered ? String(rendered[k]) : m);
  if (p.faq) p.faq = p.faq.map(f => ({ ...f, q: fill(f.q), a: fill(f.a) }));
  const url = site.origin + p.path;
  const pageId = url + '#webpage';
  const alternates = Object.entries(p.alternates || {});
  const hreflang = [[p.lang === 'ms' ? 'ms-MY' : 'en-MY', p.path], ...alternates.map(([l, u]) => [l === 'ms' ? 'ms-MY' : 'en-MY', u])];
  const xDefault = p.lang === 'en' ? p.path : (p.alternates && p.alternates.en) || p.path;
  const crumbs = p.breadcrumb.map(([name, href], i) => ({ '@type': 'ListItem', position: i + 1, name, ...(href ? { item: abs(href) } : {}) }));
  const graph = [organization, website, {
    '@type': 'WebPage', '@id': pageId, url, name: p.title, description: p.description,
    inLanguage: p.lang === 'ms' ? 'ms-MY' : 'en-MY', isPartOf: { '@id': site.origin + '/#website' },
    breadcrumb: { '@id': url + '#breadcrumb' }, datePublished: p.datePublished, dateModified: p.dateModified,
    author: { '@id': site.mainSite + '/#organization' }, publisher: { '@id': site.mainSite + '/#organization' },
    primaryImageOfPage: { '@type': 'ImageObject', url: abs(site.ogImage.url), width: site.ogImage.width, height: site.ogImage.height },
    ...(p.about ? { about: p.about.map(name => ({ '@type': 'Thing', name })) } : {}),
    ...(p.citations ? { citation: p.citations.map(c => ({ '@type': 'CreativeWork', name: c[0], url: c[1] })) } : {}),
    ...(p.app ? { mainEntity: { '@id': url + '#app' } } : {})
  }, {
    '@type': 'BreadcrumbList', '@id': url + '#breadcrumb', itemListElement: crumbs
  }];
  if (p.app) graph.push({
    '@type': 'WebApplication', '@id': url + '#app', name: p.app.name, url, description: p.description,
    applicationCategory: p.app.category, operatingSystem: 'Any', browserRequirements: 'Requires JavaScript',
    inLanguage: p.lang === 'ms' ? 'ms-MY' : 'en-MY', isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'MYR' }, featureList: p.app.features,
    publisher: { '@id': site.mainSite + '/#organization' }, dateModified: p.dateModified
  });
  if (p.faq && p.faq.length) graph.push(faqSchema(p.faq, url + '#faq', pageId));

  // Visible text starts the accessible name (WCAG 2.5.3); the rest is for screen readers.
  const switcher = alternates.map(([l, u]) => `    <a href="${u}" class="btn ghost sm" hreflang="${l}" lang="${l}">${l === 'ms' ? 'BM<span class="sr-only"> – Baca dalam Bahasa Melayu</span>' : 'EN<span class="sr-only"> – Read in English</span>'}</a>`).join('\n');
  const map = {
    // Tool titles carry the keyword phrase; Google shows the site name separately, so only short policy titles get the brand.
    LANG: p.lang, TITLE: esc(p.policy ? p.title + ' | ' + site.brand + ' Tools' : p.title), DESCRIPTION: esc(p.description), CANONICAL: url,
    HREFLANG: [...hreflang.map(([l, u]) => `<link rel="alternate" hreflang="${l}" href="${site.origin + u}">`),
      `<link rel="alternate" hreflang="x-default" href="${site.origin + xDefault}">`].join('\n'),
    JSONLD: ldJson(graph), PAGE_CSS: read('css/page.css').trim(),
    NAV: `      <a href="/">${T[p.lang].ALL_TOOLS}</a>\n      <a href="/?cat=${p.cat || 'calc'}#tools">${catLabel(p.cat || 'calc', p.lang)}</a>`,
    HEADER_CTA: switcher || `    <a href="/" class="btn sm">${T[p.lang].ALL_TOOLS}</a>`,
    // Tool pages get a share bar after the article and a "Share result" button beside the calculator's actions.
    MAIN: p.app ? p.body.replace('{{AD_BOTTOM}}', shareBlock(p, url) + '\n{{AD_BOTTOM}}').replace('<div class="tool-actions">', '<div class="tool-actions">' + shareResult(p.lang)) : p.body,
    FAQ_HTML: faqHtml(p.faq || []), DATE_ISO: p.dateModified, DATE_TEXT: longDate(p.dateModified, p.lang),
    PAGE_SCRIPTS: (p.scripts || []).map(s => `<script src="${s}" defer></script>`).join('\n') + (p.app ? '\n' + shareScript : ''),
    ...(p.robots ? { ROBOTS: p.robots } : {}),
    ...(p.salary ? salaryMap(p.lang) : {}),
    ...rendered
  };
  const html = render(map);
  fs.mkdirSync(path.join(pub, p.path), { recursive: true });
  fs.writeFileSync(path.join(pub, p.path, 'index.html'), html);
  outputs.set(p.path, html);
}

// ---- page scripts: concatenate sources into one deferred, cacheable file per tool
fs.mkdirSync(path.join(pub, 'assets/js'), { recursive: true });
const bundles = {
  'salary.js': ['assets/js/salary-core.js', 'assets/js/salary-ui.js'],
  'cgpa-percent.js': ['assets/js/grade-core.js', 'assets/js/cgpa-percent-ui.js'],
  'cgpa.js': ['assets/js/grade-core.js', 'assets/js/cgpa-ui.js'],
  'tax.js': ['assets/js/tax-core.js', 'assets/js/tax-ui.js'],
  'epf.js': ['assets/js/salary-core.js', 'assets/js/epf-core.js', 'assets/js/epf-ui.js'],
  'loan.js': ['assets/js/loan-core.js', 'assets/js/loan-ui.js'],
  'carloan.js': ['assets/js/carloan-core.js', 'assets/js/carloan-ui.js'],
  'asb.js': ['assets/js/asb-core.js', 'assets/js/asb-ui.js'],
  'prorate.js': ['assets/js/prorate-core.js', 'assets/js/prorate-ui.js'],
  'overtime.js': ['assets/js/ot-core.js', 'assets/js/ot-ui.js'],
  'land.js': ['assets/js/land-core.js', 'assets/js/land-ui.js'],
  'personal-loan.js': ['assets/js/carloan-core.js', 'assets/js/personal-core.js', 'assets/js/personal-ui.js'],
  'rpgt.js': ['assets/js/rpgt-core.js', 'assets/js/rpgt-ui.js'],
  'bmi.js': ['assets/js/bmi-core.js', 'assets/js/bmi-ui.js'],
  'zakat.js': ['assets/js/zakat-core.js', 'assets/js/zakat-ui.js'],
  'zakat-emas.js': ['assets/js/zakat-core.js', 'assets/js/gold-ui.js'],
  'harga-emas.js': ['assets/js/gold-core.js', 'assets/js/goldprice-ui.js'],
  'prompt-generator.js': ['assets/js/prompt-core.js', 'assets/js/prompt-cards.js', 'assets/js/prompt-ui.js'],
  'image-to-prompt.js': ['assets/js/prompt-core.js', 'assets/js/prompt-cards.js', 'assets/js/img2prompt-ui.js'],
  'fuel.js': ['assets/js/fuel-core.js', 'assets/js/fuel-ui.js'],
  'ncd.js': ['assets/js/carloan-core.js', 'assets/js/ncd-core.js', 'assets/js/ncd-ui.js'],
  'iddah.js': ['assets/js/hijri-core.js', 'assets/js/iddah-core.js', 'assets/js/iddah-ui.js'],
  'hijri.js': ['assets/js/hijri-core.js', 'assets/js/hijri-ui.js'],
  'tnb.js': ['assets/js/tnb-core.js', 'assets/js/tnb-ui.js'],
  'ptptn.js': ['assets/js/ptptn-core.js', 'assets/js/ptptn-ui.js'],
  'fidyah.js': ['assets/js/fidyah-core.js', 'assets/js/fidyah-ui.js'],
  'debt.js': ['assets/js/carloan-core.js', 'assets/js/debt-core.js', 'assets/js/debt-ui.js'],
  'refinance.js': ['assets/js/loan-core.js', 'assets/js/refi-core.js', 'assets/js/refi-ui.js'],
  'rent-vs-buy.js': ['assets/js/loan-core.js', 'assets/js/rentbuy-core.js', 'assets/js/rentbuy-ui.js'],
  'fixed-deposit.js': ['assets/js/fd-core.js', 'assets/js/fd-ui.js'],
  'employer-cost.js': ['assets/js/salary-core.js', 'assets/js/employer-core.js', 'assets/js/employer-ui.js'],
  'profit-margin.js': ['assets/js/margin-core.js', 'assets/js/margin-ui.js'],
  'roas.js': ['assets/js/roas-core.js', 'assets/js/roas-ui.js'],
  'freelance-rate.js': ['assets/js/salary-core.js', 'assets/js/freelance-core.js', 'assets/js/freelance-ui.js'],
  'working-days.js': ['assets/js/workdays-core.js', 'assets/js/workdays-ui.js'],
  'retirement-age.js': ['assets/js/retire-core.js', 'assets/js/retire-ui.js'],
  'sspn.js': ['assets/js/salary-core.js', 'assets/js/sspn-core.js', 'assets/js/sspn-ui.js'],
  'unit-trust.js': ['assets/js/unittrust-core.js', 'assets/js/unittrust-ui.js'],
  'education-cost.js': ['assets/js/edu-core.js', 'assets/js/edu-ui.js'],
  'water-bill.js': ['assets/js/water-core.js', 'assets/js/water-ui.js'],
  'qibla.js': ['assets/js/qibla-core.js', 'assets/js/qibla-ui.js'],
  'retirement-savings.js': ['assets/js/nestegg-core.js', 'assets/js/nestegg-ui.js'],
  'annual-leave.js': ['assets/js/leave-core.js', 'assets/js/leave-ui.js'],
  'termination-benefits.js': ['assets/js/termination-core.js', 'assets/js/termination-ui.js'],
  'road-tax.js': ['assets/js/roadtax-core.js', 'assets/js/roadtax-ui.js'],
  'tracking.js': ['assets/js/tracking-core.js', 'assets/js/tracking-ui.js'],
  'near.js': ['assets/js/tracking-core.js', 'assets/js/near-ui.js'],
  'css-minifier.js': ['assets/js/css-core.js', 'assets/js/css-ui.js'],
  'js-minifier.js': ['assets/js/js-core.js', 'assets/js/js-ui.js'],
  'js-minifier-worker.js': ['assets/js/js-core.js', 'assets/js/js-worker.js'],
  'html-beautifier.js': ['assets/js/html-core.js', 'assets/js/html-ui.js'],
  'html-beautifier-worker.js': ['assets/js/html-core.js', 'assets/js/html-worker.js'],
  'unused-css.js': ['assets/js/css-core.js', 'assets/js/purge-core.js', 'assets/js/purge-ui.js']
};
for (const [name, files] of Object.entries(bundles)) {
  // Minified with the vendored Terser (the same build the JavaScript Minifier page runs); validate.mjs compiles the result.
  const source = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
  const out = await jsLibs.terser.minify(source, { ecma: 2015, compress: { passes: 2 }, mangle: true, format: { comments: false } });
  fs.writeFileSync(path.join(pub, 'assets/js', name), out.code + '\n');
}

// ---- llms.txt (plain-text summary for LLM crawlers; llmstxt.org format)
const hosted = pages.filter(p => p.llms);
const llms = [
  `# ${site.brand} Tools`,
  '',
  `> ${homeDescription}`,
  '',
  `This site hosts its own calculators and a directory of free tools, most of which run on ${site.mainSite}/. Tools on this site run in the browser and do not send inputs to this site. Last updated ${site.dateModified}.`,
  '',
  '## Tools and calculators on this site',
  '',
  ...hosted.map(p => `- [${p.title}](${site.origin + p.path}): ${p.llms}`),
  '',
  '## Directory',
  '',
  `- [Free online tools](${site.origin}/): Canonical directory with tool descriptions, categories and usage guidance.`,
  '',
  ...liveCats.flatMap(c => [
    `## ${site.categories[c].label}`, '',
    ...byCat(c).map(t => `- [${t.name}](${t.url}): ${t.desc}`), ''
  ]),
  '## Optional',
  '',
  `- [About ${site.brand}](${site.mainSite}/p/about.html): Information about the publisher.`,
  `- [Contact](${site.mainSite}/p/contact.html): Suggest a tool or report a problem.`,
  ...pages.filter(p => p.policy).map(p => `- [${p.title}](${site.origin + p.path}): ${p.description}`),
  ''
].join('\n');
fs.writeFileSync(path.join(pub, 'llms.txt'), llms);

// ---- sitemap.xml with hreflang pairs (only this host's URLs)
const sitemapPages = [{ path: '/', dateModified: site.dateModified, alternates: {} }, ...pages.filter(p => p.sitemap !== false)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemapPages.map(p => {
  const alts = Object.keys(p.alternates || {}).length
    ? [[p.lang, p.path], ...Object.entries(p.alternates)].map(([l, u]) => `\n    <xhtml:link rel="alternate" hreflang="${l === 'ms' ? 'ms-MY' : 'en-MY'}" href="${site.origin + u}"/>`).join('') +
      `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${site.origin + (p.lang === 'en' ? p.path : p.alternates.en || p.path)}"/>`
    : '';
  return `  <url>\n    <loc>${esc(site.origin + p.path)}</loc>\n    <lastmod>${p.dateModified}</lastmod>${alts}\n  </url>`;
}).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(pub, 'sitemap.xml'), sitemap);

// Let crawlers fetch the 404 page so they can see its noindex directive.
const robots = `# Public site: search and AI crawlers may access everything.\nUser-agent: *\nAllow: /\n\nSitemap: ${site.origin}/sitemap.xml\n`;
fs.writeFileSync(path.join(pub, 'robots.txt'), robots);
// ads.txt authorises the publisher on this host as well as the root domain.
const adsTxt = path.join(pub, 'ads.txt');
if (ads.client) fs.writeFileSync(adsTxt, `google.com, ${ads.client.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);
else fs.rmSync(adsTxt, { force: true });
// IndexNow ownership file (Bing, Yandex, Seznam, Naver). The key is public by design.
fs.writeFileSync(path.join(pub, site.indexNowKey + '.txt'), site.indexNowKey + '\n');

// ---- Installable PWA. Stable app ID and root worker scope match the custom host.
const appPages = pages.filter(p => p.app);
const manifest = {
  id: '/', name: site.brand + ' Tools', short_name: 'Bukit Besi Tools',
  description: 'Free online tools and Malaysian calculators for code, content, design, AI and payroll.',
  lang: 'en', dir: 'ltr', start_url: '/', scope: '/', display: 'standalone',
  display_override: ['standalone', 'minimal-ui'],
  theme_color: '#ffffff', background_color: '#ffffff',
  categories: ['utilities', 'productivity', 'finance'], prefer_related_applications: false,
  icons: [
    { src: '/assets/PWA/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/assets/PWA/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/assets/PWA/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ],
  screenshots: [
    { src: '/assets/PWA/screenshots/wide.jpg', sizes: '1280x800', type: 'image/jpeg', form_factor: 'wide', label: 'Tool directory on desktop' },
    { src: '/assets/PWA/screenshots/narrow.jpg', sizes: '824x1830', type: 'image/jpeg', form_factor: 'narrow', label: 'Tool directory on mobile' }
  ],
  shortcuts: [
    { name: 'Browse tools', url: '/#tools', description: 'Browse all published tools' },
    ...appPages.filter(p => p.lang === 'en').map(p => ({ name: p.app.name, url: p.path, description: p.description.slice(0, 100) }))
  ]
};
const manifestJSON = JSON.stringify(manifest, null, 2) + '\n';
fs.writeFileSync(path.join(pub, 'manifest.webmanifest'), manifestJSON);

const pagePaths = ['/', ...pages.map(p => p.path)];
const precache = [...new Set([
  ...pagePaths, '/offline.html', '/manifest.webmanifest', '/assets/PWA/pwa.min.js',
  ...Object.keys(bundles).map(n => '/assets/js/' + n),
  site.logo.local72, '/assets/favicon-image/favicon.ico',
  '/assets/favicon-image/apple-touch-icon.png', '/assets/favicon-image/favicon-96x96.png',
  site.logo.local192, ...manifest.icons.map(icon => icon.src)
])];
// ---- static files: copied as-is so docs/ is self-contained
const copy = (from, to = from) => fs.cpSync(path.join(root, from), path.join(pub, to), { recursive: true });
// Vendor libraries carry their version in the file name; a clean copy drops superseded versions.
fs.rmSync(path.join(pub, 'assets/vendor'), { recursive: true, force: true });
['CNAME', '404.html', 'offline.html', 'assets/favicon-image', 'assets/PWA/pwa.min.js', 'assets/PWA/icons', 'assets/PWA/screenshots', 'assets/vendor'].forEach(f => copy(f));
// Large libraries are cached by the worker on first use instead of on install, so they work offline afterwards
// without making every visitor download them.
const lazy = fs.readdirSync(path.join(root, 'assets/vendor')).filter(f => f.endsWith('.js')).map(f => '/assets/vendor/' + f);
fs.rmSync(path.join(pub, 'assets/favicon-image/favicon'), { force: true });
// Serve files exactly as built; Jekyll processing is unnecessary and slower.
fs.writeFileSync(path.join(pub, '.nojekyll'), '');
const fileFor = url => path.join(pub, url);
const workerTemplate = fs.readFileSync(path.join(root, 'assets/PWA/sw.js'), 'utf8');
const hash = createHash('sha256').update(workerTemplate).update(manifestJSON);
for (const html of outputs.values()) hash.update(html);
for (const resource of [...precache.filter(url => !pagePaths.includes(url)), ...lazy]) hash.update(fs.readFileSync(fileFor(resource)));
const revision = hash.digest('hex').slice(0, 16);
const worker = workerTemplate.replace('__CACHE_VERSION__', revision).replace('__PRECACHE_JSON__', JSON.stringify(precache))
  .replace('__PAGES_JSON__', JSON.stringify(pagePaths)).replace('__LAZY_JSON__', JSON.stringify(lazy));
fs.writeFileSync(path.join(pub, 'sw.js'), worker);

// ---- Blogger redirects: one generated block for the blog theme, from "bloggerFrom" in page front matter.
// Pasting the whole block again after each move replaces every earlier redirect at once.
const moved = pages.flatMap(redirectsOf).sort((a, b) => a.from.localeCompare(b.from));
const redirectXml = `<!-- TBB tool redirects START: generated by tools-src/build.mjs. Replace everything from START to END. -->
<b:switch var='data:blog.canonicalUrl'>
${moved.map(r => `<b:case value='${r.from}'/>
<meta content='0; url=${site.origin + r.path + r.hash}' http-equiv='refresh'/>
<script>location.replace("${site.origin + r.path + r.hash}");</script>`).join('\n')}
</b:switch>
<!-- TBB tool redirects END -->
`;
fs.writeFileSync(path.join(root, 'documentation/blogger-redirects.xml'), redirectXml);
console.log(`Built docs/: home (${(Buffer.byteLength(homeHtml) / 1024).toFixed(1)} KB), ${pages.length} pages, crawl files, manifest and sw.js (${revision})`);
console.log(`${tools.length} published tools; ${catalog.length - tools.length} unpublished records retained in tools.json`);
