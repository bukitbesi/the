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
    UPDATE: 'Update', OPEN_ANYWAY: 'Open tool anyway', DISMISS: 'Dismiss', AD: 'Advertisement', ALL_TOOLS: 'All tools', OG_LOCALE: 'en_US'
  },
  ms: {
    SKIP: 'Langkau ke kandungan utama', NAV: 'Laman', DARK: 'Mod gelap', INSTALL: 'Pasang aplikasi',
    FOOTER_BLURB: 'Alat dalam talian percuma dan kalkulator Malaysia untuk pembangun, penulis blog dan urusan harian.',
    POPULAR: 'Alat popular', CATEGORIES: 'Kategori', RESOURCES: 'Sumber', ABOUT: 'Tentang kami', CONTACT: 'Hubungi',
    PRIVACY: 'Dasar privasi', TERMS: 'Terma penggunaan', RIGHTS: 'Hak cipta terpelihara.', TAGLINE: 'Alat percuma untuk komuniti pencipta',
    UPDATE: 'Kemas kini', OPEN_ANYWAY: 'Buka juga', DISMISS: 'Tutup', AD: 'Iklan', ALL_TOOLS: 'Semua alat', OG_LOCALE: 'ms_MY'
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
    NAV: `      <a href="/">${T[p.lang].ALL_TOOLS}</a>\n      <a href="/?cat=calc#tools">${catLabel('calc', p.lang)}</a>`,
    HEADER_CTA: switcher || `    <a href="/" class="btn sm">${T[p.lang].ALL_TOOLS}</a>`,
    MAIN: p.body, FAQ_HTML: faqHtml(p.faq || []), DATE_ISO: p.dateModified, DATE_TEXT: longDate(p.dateModified, p.lang),
    PAGE_SCRIPTS: (p.scripts || []).map(s => `<script src="${s}" defer></script>`).join('\n'),
    ...(p.robots ? { ROBOTS: p.robots } : {}),
    ...(p.salary ? salaryMap(p.lang) : {})
  };
  const html = render(map);
  fs.mkdirSync(path.join(pub, p.path), { recursive: true });
  fs.writeFileSync(path.join(pub, p.path, 'index.html'), html);
  outputs.set(p.path, html);
}

// ---- page scripts: concatenate sources into one deferred, cacheable file per tool
fs.mkdirSync(path.join(pub, 'assets/js'), { recursive: true });
const bundles = { 'salary.js': ['assets/js/salary-core.js', 'assets/js/salary-ui.js'] };
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
  `This site hosts its own calculators and a directory of free tools, most of which run on ${site.mainSite}/. Calculators on this site run in the browser and do not send inputs anywhere. Last updated ${site.dateModified}.`,
  '',
  '## Calculators on this site',
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
