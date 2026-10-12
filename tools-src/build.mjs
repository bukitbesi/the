// Builds every public page and crawl file from one layout, the tool catalog and tools-src/pages/*.html.
// Usage (from repo root):  node tools-src/build.mjs
// Output: docs/ is the complete public site (GitHub Pages serves main /docs as-is; no Actions needed):
// index.html, <page>/index.html, assets, crawl files, manifest, sw.js, CNAME and ads.txt (when configured).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
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
const tracking = require('../assets/js/tracking-core.js');
const cssCore = require('../assets/js/css-core.js');
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
});
if (new Set(catalog.map(t => t.url)).size !== catalog.length) problems.push('duplicate tool URLs');
if (!tools.length) problems.push('no live tools to publish');
if (new Set(tools.map(t => t.icon)).size !== tools.length) problems.push('published tools must have their own icon');
if (new URL(site.origin).origin !== site.origin) problems.push('origin must be an origin without a trailing slash');
if (fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim() !== new URL(site.origin).hostname) problems.push('CNAME and canonical host differ');
if (!/^[0-9a-f]{32}$/.test(site.indexNowKey || '')) problems.push('indexNowKey must be 32 lowercase hex characters');
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
const CAR_EXAMPLE = { price: 100000, downPct: 10, years: 9, method: 'eir', rate: carCore.FACTS.defaultRate };
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
    K_VERIFIED: longDate(F.verified, lang), K_VERIFIED_ISO: F.verified
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
    CSS_STATS: `<strong>${s.before} B → ${s.after} B</strong> (${s.percent}% smaller)<span id="cssGz"></span>`,
    CSS_EXAMPLES: CSS_RULES.map(([rule, css]) =>
      `        <tr><th scope="row">${rule}</th><td><code>${esc(css).replace(/\n/g, '<br>')}</code></td><td><code>${esc(cssCore.minify(css).css)}</code></td></tr>`).join('\n')
  };
}
const RENDERERS = { cgpaPercent: cgpaPercentMap, cgpa: cgpaMap, tax: taxMap, epf: epfMap, loan: loanMap, car: carMap, track: trackMap, near: nearMap, css: cssMap };

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
    ...(p.render ? RENDERERS[p.render](p.lang, p) : {})
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
  'tracking.js': ['assets/js/tracking-core.js', 'assets/js/tracking-ui.js'],
  'near.js': ['assets/js/tracking-core.js', 'assets/js/near-ui.js'],
  'css-minifier.js': ['assets/js/css-core.js', 'assets/js/css-ui.js']
};
for (const [name, files] of Object.entries(bundles)) {
  // Light minification: drop comments and indentation. Sources keep no '//' inside strings; validate.mjs compiles the result.
  const code = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//')).join('\n');
  fs.writeFileSync(path.join(pub, 'assets/js', name), code + '\n');
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
['CNAME', '404.html', 'offline.html', 'assets/favicon-image', 'assets/PWA/pwa.min.js', 'assets/PWA/icons', 'assets/PWA/screenshots'].forEach(f => copy(f));
fs.rmSync(path.join(pub, 'assets/favicon-image/favicon'), { force: true });
// Serve files exactly as built; Jekyll processing is unnecessary and slower.
fs.writeFileSync(path.join(pub, '.nojekyll'), '');
const fileFor = url => path.join(pub, url);
const workerTemplate = fs.readFileSync(path.join(root, 'assets/PWA/sw.js'), 'utf8');
const hash = createHash('sha256').update(workerTemplate).update(manifestJSON);
for (const html of outputs.values()) hash.update(html);
for (const resource of precache.filter(url => !pagePaths.includes(url))) hash.update(fs.readFileSync(fileFor(resource)));
const revision = hash.digest('hex').slice(0, 16);
const worker = workerTemplate.replace('__CACHE_VERSION__', revision).replace('__PRECACHE_JSON__', JSON.stringify(precache))
  .replace('__PAGES_JSON__', JSON.stringify(pagePaths));
fs.writeFileSync(path.join(pub, 'sw.js'), worker);
console.log(`Built docs/: home (${(Buffer.byteLength(homeHtml) / 1024).toFixed(1)} KB), ${pages.length} pages, crawl files, manifest and sw.js (${revision})`);
console.log(`${tools.length} published tools; ${catalog.length - tools.length} unpublished records retained in tools.json`);
