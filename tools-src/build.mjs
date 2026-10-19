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
import { statePages as solatStatePages, stateMap, solatStates } from './solat-states.mjs';
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
const solatCore = require('../assets/js/solat-core.js');
const solatData = JSON.parse(read('solat-data.json'));
const nesteggCore = require('../assets/js/nestegg-core.js');
const leaveCore = require('../assets/js/leave-core.js');
const terminationCore = require('../assets/js/termination-core.js');
const roadtaxCore = require('../assets/js/roadtax-core.js');
const sstCore = require('../assets/js/sst-core.js');
const bursaCore = require('../assets/js/bursa-core.js');
const tenancyCore = require('../assets/js/tenancy-core.js');
const eisCore = require('../assets/js/eis-core.js');
const maskahwinCore = require('../assets/js/maskahwin-core.js');
const hajiCore = require('../assets/js/haji-core.js');
const strCore = require('../assets/js/str-core.js');
const sspaCore = require('../assets/js/sspa-core.js');
const rahnuCore = require('../assets/js/rahnu-core.js');
const umurCore = require('../assets/js/umur-core.js');
const bersalinCore = require('../assets/js/bersalin-core.js');
const solarCore = require('../assets/js/solar-core.js');
const lesenCore = require('../assets/js/lesen-core.js');
const faraidCore = require('../assets/js/faraid-core.js');
const fxCore = require('../assets/js/fx-core.js');
const kaloriCore = require('../assets/js/kalori-core.js');
const kasutCore = require('../assets/js/kasut-core.js');
const samanCore = require('../assets/js/saman-core.js');
const taksiranCore = require('../assets/js/taksiran-core.js');
const evCore = require('../assets/js/ev-core.js');
const cartoonCore = require('../assets/js/cartoon-core.js');
const aiCore = require('../assets/js/ai-core.js');
const tracking = require('../assets/js/tracking-core.js');
const cssCore = require('../assets/js/css-core.js');
const jsCore = require('../assets/js/js-core.js');
const htmlCore = require('../assets/js/html-core.js');
const purgeCore = require('../assets/js/purge-core.js');
const exifCore = require('../assets/js/exif-core.js');
const robotsCore = require('../assets/js/robots-core.js');
const notesCore = require('../assets/js/notepad-core.js');
const wordsCore = require('../assets/js/words-core.js');
const jsonCore = require('../assets/js/json-core.js');
const caseCore = require('../assets/js/case-core.js');
const contrastCore = require('../assets/js/contrast-core.js');
const waCore = require('../assets/js/wa-core.js');
const privacyCore = require('../assets/js/privacy-core.js');
const schemaCore = require('../assets/js/schema-core.js');
const qrVm = {};
vm.runInNewContext(fs.readFileSync(path.join(root, waCore.VENDOR.slice(1)), 'utf8'), qrVm);
const imgCore = require('../assets/js/imgconv-core.js');
const photoCore = require('../assets/js/photo-core.js');
const stickerCore = require('../assets/js/sticker-core.js');
const pdfCore = require('../assets/js/pdf-core.js');
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
// Waktu solat state pages are generated from JAKIM's zones (tools-src/solat-states.mjs).
pages.push(...solatStatePages('2026-10-18', new Date(Date.parse(JSON.parse(read('gold-data.json')).fetchedAt) + 8 * 3600e3).toISOString().slice(0, 10)));
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
    SHARE_H: 'Share this calculator', SHARE_RESULT: 'Share result', COPY: 'Copy link', COPIED: 'Link copied', MORE: 'More options',
    SEARCH: 'Search tools', SEARCH_PH: 'Search tools, e.g. zakat, JSON, WebP', MENU: 'Menu', CLOSE: 'Close',
    TRUST_1: 'Free, no sign-up', TRUST_2: 'Rates checked against official Malaysian sources', TRUST_3: 'Installs as an app and works offline'
  },
  ms: {
    SKIP: 'Langkau ke kandungan utama', NAV: 'Laman', DARK: 'Mod gelap', INSTALL: 'Pasang aplikasi',
    FOOTER_BLURB: 'Alat dalam talian percuma dan kalkulator Malaysia untuk pembangun, penulis blog dan urusan harian.',
    POPULAR: 'Alat popular', CATEGORIES: 'Kategori', RESOURCES: 'Sumber', ABOUT: 'Tentang kami', CONTACT: 'Hubungi',
    PRIVACY: 'Dasar privasi', TERMS: 'Terma penggunaan', RIGHTS: 'Hak cipta terpelihara.', TAGLINE: 'Alat percuma untuk komuniti pencipta',
    UPDATE: 'Kemas kini', OPEN_ANYWAY: 'Buka juga', DISMISS: 'Tutup', AD: 'Iklan', ALL_TOOLS: 'Semua alat', OG_LOCALE: 'ms_MY',
    SHARE_H: 'Kongsi kalkulator ini', SHARE_RESULT: 'Kongsi keputusan', COPY: 'Salin pautan', COPIED: 'Pautan disalin', MORE: 'Pilihan lain',
    SEARCH: 'Cari alat', SEARCH_PH: 'Cari alat, cth. zakat, KWSP, cukai', MENU: 'Menu', CLOSE: 'Tutup',
    TRUST_1: 'Percuma, tanpa daftar', TRUST_2: 'Kadar disemak dengan sumber rasmi Malaysia', TRUST_3: 'Boleh dipasang sebagai aplikasi dan berfungsi luar talian'
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

// ---- Google Tag Manager (GA4 and other tags are set up inside GTM, never as extra snippets). Consent Mode v2:
// denied by default for the EEA, UK and Switzerland, granted elsewhere. gtm.js (~100 KB) loads on the visitor's first
// scroll, tap, key or mouse move, or once the page has been idle 3.5 s after load, so it never competes with LCP,
// INP or the page's own scripts; visits shorter than that with no interaction are not counted.
const gtmId = /^GTM-[A-Z0-9]+$/.test(site.gtm || '') ? site.gtm : '';
const EEA = 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO GB CH'.split(' ');
const gtmHead = !gtmId ? '' : `<script>
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
gtag("consent","default",{ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",analytics_storage:"denied",wait_for_update:500,region:${JSON.stringify(EEA)}});
gtag("consent","default",{ad_storage:"granted",ad_user_data:"granted",ad_personalization:"granted",analytics_storage:"granted"});
(function(w,d){
  var done=false,ev=["scroll","pointerdown","keydown","touchstart","mousemove"];
  function load(){
    if(done)return;done=true;
    ev.forEach(function(e){removeEventListener(e,load)});
    w.dataLayer.push({"gtm.start":Date.now(),event:"gtm.js"});
    var s=d.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtm.js?id=${gtmId}";d.head.appendChild(s);
  }
  ev.forEach(function(e){addEventListener(e,load,{passive:true})});
  addEventListener("load",function(){setTimeout(function(){(w.requestIdleCallback||setTimeout)(load)},3500)});
})(window,document);
</script>`;
const gtmBody = !gtmId ? '' : `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript>`;

// ---- shared fragments: header navigation, mobile menu, footer widgets
const CAT_SHORT = {
  en: { calc: 'Calculators', dev: 'Developer', seo: 'SEO', content: 'Content', design: 'Design', ai: 'AI', util: 'Utilities' },
  ms: { calc: 'Kalkulator', dev: 'Pembangun', seo: 'SEO', content: 'Kandungan', design: 'Reka bentuk', ai: 'AI', util: 'Utiliti' }
};
const CAT_ICON = {
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2m4 0h2M8 16h2m4 0h2"/>',
  dev: '<path d="m8 8-4 4 4 4m8-8 4 4-4 4M14 5l-4 14"/>',
  seo: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5M8.5 11.5l2 2 3-4"/>',
  content: '<path d="M5 4h14M5 9h14M5 14h9M5 19h6"/>',
  design: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="9.5" r="1.5"/>',
  ai: '<path d="M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6"/>',
  util: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'
};
const catSvg = c => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CAT_ICON[c] || CAT_ICON.util}</svg>`;
const catHref = (c, home) => home ? '#tools' : `/?cat=${c}#tools`;
const localTools = tools.filter(t => t.url.startsWith(site.origin + '/'));
const popular = [...new Set([...tools.filter(t => t.badge === 'popular' || t.badge === 'hot'), ...localTools])].slice(0, 8);
const footerPopular = popular.map(t => `          <li><a href="${esc(local(t.url))}"><i class="dot t-${t.cat}" aria-hidden="true"></i>${esc(t.name)}</a></li>`).join('\n');
// On the home page category links filter in place; elsewhere they open the home page pre-filtered.
const footerCats = (lang, home) => liveCats.map(c =>
  `          <li><a href="${catHref(c, home)}" data-filter="${c}"><i class="dot t-${c}" aria-hidden="true"></i>${esc(catLabel(c, lang))}<small>${byCat(c).length}</small></a></li>`).join('\n');
const navCats = (lang, home, current) => liveCats.map(c =>
  `      <a href="${catHref(c, home)}" data-filter="${c}"${c === current ? ' class="on"' : ''}>${esc(CAT_SHORT[lang][c])}</a>`).join('\n');
const menuCats = (lang, home) => liveCats.map(c =>
  `        <li><a href="${catHref(c, home)}" data-filter="${c}"><span class="mi t-${c}">${catSvg(c)}</span>${esc(CAT_SHORT[lang][c])}<small>${byCat(c).length}</small></a></li>`).join('\n');
const menuPopular = popular.slice(0, 6).map(t => `        <li><a href="${esc(local(t.url))}">${esc(t.name)}</a></li>`).join('\n');
const SOCIAL = [
  ['X', 'https://x.com/' + site.twitter.replace('@', ''), '<path d="M4 4l16 16M20 4 4 20" />'],
  ['Instagram', 'https://instagram.com/bukitbesi', '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>'],
  ['LinkedIn', 'https://www.linkedin.com/in/bukitbesi/', '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>']
];
const footerSocial = SOCIAL.map(([n, u, d]) => `          <a class="hbtn" href="${u}" rel="me noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">${d}</svg><span class="sr-only">${n}</span></a>`).join('\n');
const faqHtml = faq => faq.map(f => `      <details><summary>${esc(f.q)}</summary><p>${f.html || esc(f.a)}</p></details>`).join('\n');
const faqSchema = (faq, id, pageId) => ({
  '@type': 'FAQPage', '@id': id, isPartOf: { '@id': pageId },
  mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
});
const organization = {
  '@type': 'Organization', '@id': site.mainSite + '/#org', name: site.brand, url: site.mainSite + '/',
  logo: { '@type': 'ImageObject', url: abs(site.logo.local512), width: 512, height: 512 },
  sameAs: [`https://x.com/${site.twitter.replace('@', '')}`],
  publishingPrinciples: site.origin + '/about/#method'
};
const byline = p => p.body.replace(/(<p class="meta"><span>[\s\S]*?<\/span>)/, `$1<span>${p.lang === 'ms' ? 'Oleh' : 'By'} <a href="${site.author.path}" rel="author">${site.author.name}</a></span>`);
// The named person who builds and verifies the calculators (E-E-A-T); tool pages credit them as author.
const person = {
  '@type': 'Person', '@id': site.mainSite + '/p/about.html#person', name: site.author.name, alternateName: site.author.alternateName, url: site.mainSite + '/p/about.html', jobTitle: site.author.jobTitle,
  worksFor: { '@id': site.mainSite + '/#org' }, sameAs: [site.origin + site.author.path, 'https://www.linkedin.com/in/bukitbesi/', 'https://x.com/bukitbesiblog', 'https://instagram.com/bukitbesi'],
  knowsAbout: ['Malaysian personal finance calculators', 'Malaysian tax and payroll rules', 'Islamic inheritance (faraid) and zakat calculation', 'Web development']
};
organization.founder = { '@id': person['@id'] };
const website = {
  '@type': 'WebSite', '@id': site.origin + '/#website', url: site.origin + '/', name: site.brand + ' Tools',
  alternateName: ['Bukit Besi Tools', 'The Bukit Besi free online tools'],
  inLanguage: ['en', 'ms'], publisher: { '@id': site.mainSite + '/#org' }
};
const ldJson = graph => JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');

function render(map) {
  const shared = {
    BRAND: site.brand, ORIGIN: site.origin, MAIN_SITE: site.mainSite, YEAR: date.getUTCFullYear(),
    LOGO_72: site.logo.local72, LOGO_192: site.logo.local192,
    OG_IMAGE: abs(site.ogImage.url), OG_W: site.ogImage.width, OG_H: site.ogImage.height, OG_ALT: esc(site.ogImage.alt),
    TWITTER_CARD: site.ogImage.width / site.ogImage.height >= 1.5 ? 'summary_large_image' : 'summary',
    TWITTER: site.twitter, BASE_CSS: read('css/base.css').trim(), FOOTER_POPULAR: footerPopular, AD_LOADER: adLoader, GTM_HEAD: gtmHead, GTM_BODY: gtmBody,
    ROBOTS: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1', HEAD_EXTRA: '', PAGE_SCRIPTS: ''
  };
  const lang = map.LANG;
  const all = { ...shared, ...Object.fromEntries(Object.entries(T[lang]).map(([k, v]) => ['T_' + k, v])),
    FOOTER_CATS: footerCats(lang, map.CANONICAL === site.origin + '/'), MENU_CATS: menuCats(lang, map.CANONICAL === site.origin + '/'), MENU_POPULAR: menuPopular,
    FOOTER_SOCIAL: footerSocial, NAV: navCats(lang, map.CANONICAL === site.origin + '/', map.CAT), HEADER_CTA: '', AD_TOP: adUnit('top', lang), AD_MIDDLE: adUnit('middle', lang), AD_BOTTOM: adUnit('bottom', lang),
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
    dateModified: site.dateModified, author: { '@id': site.mainSite + '/#org' },
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
// ---- JSON formatter: sample output, warnings and the error table come from the page's parser and repair pass.
const JF_SAMPLE = '{"shop":"Kedai Kopi Bukit Besi","open":true,"orderId":12345678901234567890,"items":[{"name":"Kopi O","price":2.50,"qty":2},{"name":"Roti Canai","price":1.80,"qty":3}],"address":{"town":"Dungun","state":"Terengganu"},"notes":null}';
const JF_ERRORS = [
  ['Trailing comma', '{"name": "Ali", "age": 30,}'],
  ['Single quotes', "{'name': 'Ali'}"],
  ['Unquoted property name', '{name: "Ali"}'],
  ['Missing comma', '{"name": "Ali" "age": 30}'],
  ['Python True or None', '{"active": True, "phone": None}'],
  ['Comment', '{"age": 30 // years\n}'],
  ['Line break inside a string', '{"note": "line one\nline two"}'],
  ['Number with a leading dot or zero', '{"price": .5, "code": 007}'],
  ['NaN or undefined', '{"score": NaN}'],
  ['Unclosed bracket', '{"tags": ["a", "b"'],
  ['Two objects without an array', '{"id": 1}\n{"id": 2}']
];
function jsonMap() {
  const J = jsonCore, V = J.views, p = J.parse(JF_SAMPLE), out = J.stringify(p.ast);
  const err = J.parse('{"name": "Ali", "age": 30,}').error;
  return {
    JF_IN: esc(JF_SAMPLE), JF_OUT: esc(out), JF_VERIFIED: J.FACTS.verified, JF_BIG: String(Number('12345678901234567890')),
    JF_STATUS: V.statusHtml(J.stats(p.ast), J.bytes(JF_SAMPLE), J.bytes(out)), JF_WARN: V.warnHtml(p.warnings),
    JF_ERR_EXAMPLE: `in {"name": "Ali", "age": 30,} it reports line ${err.line}, column ${err.col}: ${err.msg}`,
    JF_ERRORS: JF_ERRORS.map(([what, bad]) => {
      const e = J.parse(bad).error, r = J.repair(bad);
      if (!e || !r.ok) throw new Error('JSON error example is not an error or cannot be fixed: ' + bad);
      return `        <tr><th scope="row">${what}</th><td><code>${esc(bad).replace(/\n/g, '<br>')}</code></td><td>Line ${e.line}, column ${e.col}: ${esc(e.msg)}</td><td><code>${esc(J.stringify(r.ast, { indent: '' }))}</code></td></tr>`;
    }).join('\n')
  };
}

// ---- Case converter: buttons, the developer table and every example come from the page's core.
const CC_SAMPLE = 'how to calculate EPF contribution in malaysia: a step-by-step guide for 2026';
const CC_USES = { sentence: 'Body text, Google-style headings', title: 'Headlines, book and article titles', upper: 'Labels, warnings', lower: 'Tags, email addresses', each: 'Names, product titles', alt: 'Memes', inverse: 'Fixing text typed with Caps Lock on', camel: 'JavaScript and Java variables', pascal: 'Class and component names', snake: 'Python, database columns', constant: 'Constants, environment variables', kebab: 'CSS classes, file names', train: 'HTTP headers', dot: 'Config keys', path: 'Folder paths, routes', slug: 'Web page URLs' };
function caseMap() {
  const C = caseCore, ex = 'User profile ID';
  const btns = g => C.CASES.filter(c => c.group === g).map(c => `<button type="button" class="btn ghost sm" data-case="${c.key}">${esc(c.label)}</button>`).join('');
  return {
    CC_SAMPLE: esc(CC_SAMPLE), CC_TITLE: esc(C.title(CC_SAMPLE)), CC_VERIFIED: C.FACTS.verified, CC_COUNT: C.views.countsText(C.counts(CC_SAMPLE)),
    CC_TEXT_BTNS: btns('text'), CC_DEV_BTNS: btns('dev'), CC_DEV_ROWS: C.views.devRows(CC_SAMPLE),
    CC_TITLE_EXAMPLE: `"${C.title('the lord of the rings')}" and "${C.title(CC_SAMPLE)}".`, CC_SLUG_EXAMPLE: C.slug('Kuih Raya & Café Menu 2026!'),
    CC_SMALL: C.SMALL.join(', '), CC_EXAMPLE_IN: ex,
    CC_EXAMPLES: C.CASES.map(c => `        <tr><th scope="row">${esc(c.label)}</th><td><code>${esc(C.convert(ex, c.key))}</code></td><td>${CC_USES[c.key]}</td></tr>`).join('\n')
  };
}

// ---- Color contrast checker: the first result, fixes, colour-blind rows and every table come from the page's core.
const CT_FG = '#2b6cb0', CT_BG = '#ffffff', CT_PALETTE = ['#1a1a2e', '#ffffff', '#5b4bd5', '#08807c', '#f0ad28'];
function contrastMap() {
  const C = contrastCore, V = C.views, r = C.check(CT_FG, CT_BG);
  const fix = (c, o, t) => C.suggest(C.parse(c), C.parse(o), t);
  const btn = (which, s, label, level) => `<button type="button" class="btn ghost sm ct-fix" data-set="${which}" data-hex="${s.hex}"><i class="ct-chip" style="background:${s.hex}"></i>${label} ${s.hex} · ${C.show(s.ratio)}:1 ${level}</button>`;
  const fixes = [[4.5, 'AA'], [7, 'AAA']].filter(([t]) => r.ratio < t)
    .flatMap(([t, l]) => [['fg', fix(CT_FG, CT_BG, t), 'Text'], ['bg', fix(CT_BG, CT_FG, t), 'Background']].filter(x => x[1]).map(([w, f, n]) => btn(w, f, n, l))).join('');
  const yes = ok => `<td class="${ok ? 'rb-yes' : 'rb-no'}">${ok ? 'Pass' : 'Fail'}</td>`;
  const greys = ['#000000', '#333333', '#595959', '#666666', '#757575', '#767676', '#777777', '#808080', '#949494', '#999999', '#aaaaaa'];
  const grey = C.check('#767676', '#fff');
  return {
    CT_FG, CT_BG, CT_VERIFIED: C.FACTS.verified, CT_RESULT: V.resultHtml(r), CT_FIXES: fixes, CT_CVD: V.cvdRows(r),
    CT_PALETTE: CT_PALETTE.join('\n'), CT_MATRIX: V.matrixHtml(C.matrix(CT_PALETTE)),
    CT_RULES: C.LEVELS.map(l => `        <tr><th scope="row">${esc(l.label.replace(/^AAA? /, ''))}</th><td>${l.key.startsWith('aaa') ? 'AAA' : 'AA'}</td><td>${l.min}:1</td><td>${l.sc}</td></tr>`).join('\n'),
    CT_GREY_ROWS: greys.map(g => { const x = C.check(g, '#fff'); return `        <tr><th scope="row"><i class="ct-chip" style="background:${g}"></i>${g}</th><td>${x.text}:1</td>${yes(x.pass.aaNormal)}${yes(x.pass.aaLarge)}${yes(x.pass.aaaNormal)}</tr>`; }).join('\n'),
    CT_GREY: `#767676 at ${grey.text}:1 is the lightest grey that passes AA for normal text on white, and #595959 (${C.check('#595959', '#fff').text}:1) is the lightest for AAA.`,
    CT_777: C.check('#777777', '#fff').text, CT_BRAND_FIX: `${fix('#5b9bd5', '#ffffff', 4.5).hex} (${C.show(fix('#5b9bd5', '#ffffff', 4.5).ratio)}:1)`
  };
}

// ---- WhatsApp link generator: link, preview, QR code (from the same vendored encoder the page loads) and tables.
const WA_MSG = "Hi, I'm interested in your product. Is it still available?";
function waMap() {
  const W = waCore, n = W.normalize('012-345 6789', '60'), url = W.link(n.digits, WA_MSG);
  const fmt = [['Bold', '*text*'], ['Italic', '_text_'], ['Strikethrough', '~text~'], ['Monospace', '```text```'], ['Inline code', '`text`'], ['Bulleted list', '- text'], ['Quote', '> text']];
  const nums = [['012-345 6789', ''], ['011-2345 6789', '011 numbers have one more digit'], ['+60 12-345 6789', ''], ['+60 012-345 6789', 'Extra 0 after +60 removed'], ['0060 12 345 6789', '00 international prefix removed'], ['03-2345 6789', 'Landline: needs WhatsApp Business']];
  return {
    WA_VERIFIED: W.FACTS.verified, WA_MSG: esc(WA_MSG), WA_LINK: esc(url), WA_SAMPLE_LINK: 'wa.me/' + n.digits,
    WA_COUNTRIES: W.COUNTRIES.map(c => `<option value="${c[2]}"${c[0] === 'MY' ? ' selected' : ''}>${esc(c[1])} (+${c[2]})</option>`).join(''),
    WA_TEMPLATES: W.TEMPLATES.map((t, i) => `<button type="button" class="btn ghost sm" data-tpl="${i}"${/^(Pertanyaan|Tempahan)$/.test(t[0]) ? ' lang="ms"' : ''}>${esc(t[0])}</button>`).join(''),
    WA_BUBBLE: W.formatHtml(WA_MSG), WA_COUNT: `${Array.from(WA_MSG).length} characters · link ${url.length} characters`,
    WA_QR: W.qrSvg(W.qrMatrix(qrVm.qrcode, url), 'QR code for ' + url), WA_CODE: esc(W.snippet(url, 'Chat on WhatsApp')),
    WA_EXAMPLE: W.link('60123456789', 'Hi, is this available?'),
    WA_FORMAT_ROWS: [['Chat with a number', W.link('60123456789', '')], ['Number and message', W.link('60123456789', 'Hi, is this available?')], ['Message only (choose contact)', W.link('', 'Check out this tool')]]
      .map(([a, b]) => `        <tr><th scope="row">${a}</th><td><code>${esc(b)}</code></td></tr>`).join('\n'),
    WA_NUMBER_ROWS: nums.map(([a, note]) => { const x = W.normalize(a, '60'); return `        <tr><th scope="row">${esc(a)}</th><td><code>${x.digits}</code></td><td>${note || 'Leading 0 replaced by 60'}</td></tr>`; }).join('\n'),
    WA_FMT_ROWS: fmt.map(([a, b]) => `        <tr><th scope="row">${a}</th><td><code>${esc(b)}</code></td><td>${W.formatHtml(b)}</td></tr>`).join('\n')
  };
}

// ---- Privacy policy generator: the default policy and the PDPA checklist come from the page's core.
const PP_FRAMEWORK = [
  ['Brief information on the company and its data protection practice', 'intro'], ['Collection and processing of personal data', 'sources'],
  ['Description of the personal data collected', 'data'], ['Purposes of collection', 'purposes'], ['Sources of personal data', 'sources'],
  ['Disclosure to third parties', 'disclosure'], ['Transfer of personal data overseas', 'transfer'], ['Security measures', 'security'],
  ['Retention of personal data', 'retention'], ['Access and correction of personal data', 'rights'], ['Consequences of failing to supply personal data', 'obligatory'],
  ['Marketing and promotional activities', 'purposes'], ["Data subject's obligations", 'obligatory'], ['Contact for enquiries', 'contact']
];
function privacyMap() {
  const P = privacyCore, d = P.DEFAULTS, docs = P.generate(d), titles = Object.fromEntries(P.TEXT.en.sections.map(s => [s[0], s[1]]));
  if (PP_FRAMEWORK.some(([, id]) => !titles[id])) throw new Error('PDPA framework row points at a missing section');
  return {
    PP_VERIFIED: P.FACTS.verified, PP_SITE: esc(d.site), PP_URL: esc(d.url), PP_OWNER: esc(d.owner), PP_EMAIL: esc(d.email), PP_DATE: d.date,
    PP_PREVIEW: P.html(docs, 3), PP_ISSUES: '<li>Replace the example name, owner or email with your own before publishing.</li>',
    PP_FRAMEWORK: PP_FRAMEWORK.map(([item, id], i) => `        <tr><th scope="row">${i + 1}. ${esc(item)}</th><td>${esc(titles[id])}</td></tr>`).join('\n')
  };
}

// ---- Schema markup generator: type buttons, the first form, its JSON-LD and the requirements table come from the core.
function schemaMap() {
  const S = schemaCore, first = 'article', r = S.generate(first, S.defaults(first));
  const label = (t, k) => (S.TYPES[t].fields.find(f => f[0] === k) || [k, k])[1].replace(/ \(.*\)$/, '');
  const PROPS = { article: [[], 'headline, image, datePublished, dateModified, author'], product: [['name', 'offers, review or aggregateRating'], 'image, description, brand'],
    local: [['name', 'address'], 'telephone, url, image, openingHoursSpecification, geo, priceRange'], organization: [[], 'name, url, logo, sameAs'],
    event: [['name', 'startDate', 'location (with address)'], 'description, endDate, image, organizer, offers, eventStatus'], recipe: [['name', 'image'], 'author, prepTime, cookTime, recipeIngredient, recipeInstructions, recipeYield'],
    video: [['name', 'thumbnailUrl', 'uploadDate'], 'description, duration, contentUrl or embedUrl, creator'], software: [['name', 'offers.price', 'aggregateRating or review'], 'applicationCategory, operatingSystem'],
    breadcrumb: [['itemListElement (position, name, item)'], ''], website: [['name', 'url'], 'alternateName'], faq: [['mainEntity (Question, acceptedAnswer)'], '']
  };
  if (Object.keys(PROPS).join() !== Object.keys(S.TYPES).join()) throw new Error('schema requirement table out of step with TYPES');
  const vid = S.generate('video', S.defaults('video'));
  return {
    SC_VERIFIED: S.FACTS.verified, SC_COUNT: Object.keys(S.TYPES).length, SC_LABEL: esc(S.TYPES[first].label), SC_RICH: esc(S.TYPES[first].rich),
    SC_TYPE_BTNS: Object.entries(S.TYPES).map(([k, t]) => `<button type="button" class="btn ghost sm" data-type="${k}" aria-pressed="${k === first}">${esc(t.label)}</button>`).join(''),
    SC_FIELDS: S.views.formHtml(first), SC_CHECKS: S.views.checksHtml(r), SC_OUT: esc(S.scriptTag(r.text)), SC_EXAMPLE: esc(S.scriptTag(vid.text)),
    SC_TYPE_ROWS: Object.entries(PROPS).map(([k, [req, rec]]) => `        <tr><th scope="row">${esc(S.TYPES[k].label)}</th><td>${req.length ? req.map(x => `<code>${esc(x)}</code>`).join(', ') : 'None'}</td><td>${esc(rec) || '–'}</td><td>${esc(S.TYPES[k].rich)}</td></tr>`).join('\n')
  };
}

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
// ---- Waktu solat (prayer times), BM + EN. JAKIM's timetables live in assets/solat/<year>/<ZONE>.json (solat-fetch.mjs);
// the pages bake in the day of the latest daily data run (Malaysia time), and the script takes over with the live clock.
const solatDay = new Date(Date.parse(goldData.fetchedAt) + 8 * 3600e3).toISOString().slice(0, 10);
const solatYears = new Map();
const solatTimes = (zone, iso) => {
  const key = zone + iso.slice(0, 4), file = path.join(root, 'assets/solat', iso.slice(0, 4), zone + '.json');
  if (!solatYears.has(key)) solatYears.set(key, fs.existsSync(file) ? solatCore.decodeYear(fs.readFileSync(file, 'utf8')) : null);
  const t = solatCore.day(solatYears.get(key), iso);
  if (!t) throw new Error(`No prayer times for ${zone} on ${iso}: run node tools-src/solat-fetch.mjs`);
  return t;
};
// The calculator and month table shared by /waktu-solat/ and the state pages: `zone` is shown first, `zones` are listed.
function solatCalc(lang, zone, zones) {
  const { L, tr } = b3(lang), S = solatCore, H = hijriCore, day = solatDay, t = solatTimes(zone, day), tm = m => S.time(m, !!L);
  const option = code => `<option value="${code}"${code === zone ? ' selected' : ''}>${code} · ${esc(S.zone(code).areas)}</option>`;
  const states = [...new Set(zones.map(code => code.slice(0, 3)))];
  const options = states.length === 1 ? zones.map(option).join('')
    : states.map(k => `<optgroup label="${S.STATES[k]}">${zones.filter(code => code.startsWith(k)).map(option).join('')}</optgroup>`).join('');
  const month = S.month(solatYears.get(zone + day.slice(0, 4)), day).map(([iso, x]) =>
    `<tr${iso === day ? ' class="now"' : ''}><th scope="row">${H.formatGregorian(iso, lang).replace(/ \d{4}$/, '')}</th>${[0, 1, 2, 4, 5, 6, 7].map(i => `<td>${S.hhmm(x[i])}</td>`).join('')}</tr>`).join('\n');
  const head = (L ? ['Tarikh', 'Imsak', 'Subuh', 'Syuruk', 'Zohor', 'Asar', 'Maghrib', 'Isyak'] : ['Date', 'Imsak', 'Subuh', 'Syuruk', 'Zohor', 'Asar', 'Maghrib', 'Isyak']).map(h => `<th scope="col">${h}</th>`).join('');
  const z = S.zone(zone);
  return {
    T_CALC: `  <div class="calc">
    <form class="box" id="solatForm" novalidate aria-labelledby="sl-h">
      <h2 id="sl-h">${L ? 'Zon anda' : 'Your zone'}</h2>
      <div class="field"><label for="zone">${L ? 'Zon JAKIM' : 'JAKIM zone'}</label><select class="input" id="zone" name="zone">${options}</select></div>
      <div class="field"><label class="check"><input type="checkbox" id="h24" name="h24" value="1"${L ? ' checked' : ''}><span>${L ? 'Format 24 jam' : '24-hour clock'}</span></label></div>
      <div class="field"><button type="button" class="btn sm" id="sLocate">${L ? 'Guna lokasi saya' : 'Use my location'}</button></div>
      <p class="help" id="sMsg" aria-live="polite">${L ? 'Lokasi anda dipadankan dengan zon dalam peranti dan tidak dihantar ke mana-mana.' : 'Your location is matched to a zone on your device and never sent.'}</p>
    </form>

    <section class="box" aria-labelledby="sl-result-h">
      <h2 id="sl-result-h">${L ? 'Hari ini' : 'Today'}</h2>
      <p class="help" id="sZone">${zone} · ${esc(z.areas)}, ${z.state}</p>
      <p class="help" id="sDate">${H.formatGregorian(day, lang, true)} · ${H.formatHijri(H.toHijri(day), lang)}</p>
      <div class="net">
        <p id="sNow">${L ? 'Waktu solat pertama hari ini' : "Today's first prayer"}</p>
        <output id="sNext" for="zone">${S.name(1, lang).split(' (')[0]} ${tm(t[1])}</output>
        <p id="sCount">${L ? 'Zon JAKIM' : 'JAKIM zone'} ${zone}</p>
      </div>
      <p class="sr-only" id="sLive" aria-live="polite"></p>
      <p class="help" id="sMsg2" aria-live="polite"></p>
      <table class="rows">
        <caption>${L ? 'Waktu hari ini' : "Today's times"}</caption>
        <tbody id="sToday">
${S.KEYS.map((k, i) => tr(S.name(i, lang), tm(t[i]))).join('\n')}
        </tbody>
      </table>
      <div class="tool-actions"><button type="button" class="btn ghost sm" id="solatPrint">${L ? 'Cetak atau simpan PDF' : 'Print or save as PDF'}</button></div>
    </section>
  </div>`,
    T_MONTH: `  <h2 id="month-h">${L ? 'Jadual waktu solat' : 'Prayer timetable for'} <span id="sMonthName">${H.GMONTHS[lang][+day.slice(5, 7) - 1]} ${day.slice(0, 4)}</span></h2>
  <div class="tool-actions"><button type="button" class="btn ghost sm" id="mPrev">${L ? 'Bulan sebelum' : 'Previous month'}</button><button type="button" class="btn ghost sm" id="mNext">${L ? 'Bulan seterusnya' : 'Next month'}</button></div>
  <p class="help" id="sMonthMsg" aria-live="polite"></p>
  <div class="table-wrap" tabindex="0" role="region" aria-labelledby="month-h">
    <table class="data">
      <thead><tr>${head}</tr></thead>
      <tbody id="sMonth">
${month}
      </tbody>
    </table>
  </div>`
  };
}
const solatShared = lang => ({ S_VERIFIED: longDate(solatData.fetchedAt.slice(0, 10), lang), S_VERIFIED_ISO: solatData.fetchedAt.slice(0, 10) });
function solatMap(lang) {
  const { L } = b3(lang), S = solatCore, H = hijriCore, day = solatDay, z = S.FACTS.defaultZone, t = solatTimes(z, day);
  const tm = m => S.time(m, !!L), five = S.PRAYERS;
  const listed = x => five.map(i => `${S.name(i, lang).split(' (')[0]} ${tm(x[i])}`).join(', ');
  const all = S.ZONES.map(([code, areas]) => { const x = solatTimes(code, day);
    return `<tr><th scope="row">${code}<small>${esc(areas)}, ${S.STATES[code.slice(0, 3)]}</small></th>${five.map(i => `<td>${tm(x[i])}</td>`).join('')}</tr>`; }).join('\n');
  const mag = code => solatTimes(code, day)[6];
  const byMaghrib = S.ZONES.map(x => [x[0], mag(x[0])]).sort((a, b) => a[1] - b[1]);
  const first = byMaghrib[0], last = byMaghrib[byMaghrib.length - 1];
  const zl = code => `${code} (${S.zone(code).areas.split(', ').slice(0, 2).join(', ')})`;
  const check = solatData.check || {};
  const stateLinks = solatStates.map(o => `    <a href="${L ? o.bm : o.en}">${L ? 'Waktu Solat ' + o.name.ms : 'Prayer Times ' + o.name.en}<small>${o.zones.length} ${L ? 'zon' : o.zones.length > 1 ? 'zones' : 'zone'}</small></a>`).join('\n');
  return {
    ...solatCalc(lang, z, S.ZONES.map(x => x[0])), ...solatShared(lang),
    S_DAY: H.formatGregorian(day, lang), S_DAY_ISO: day,
    S_KL: listed(t), S_KL_SUBUH: tm(t[1]), S_KL_MAGHRIB: tm(t[6]), S_KL_IMSAK: tm(t[0]), S_KL_SYURUK: tm(t[2]), S_KL_ZOHOR: tm(t[4]),
    S_SGR: listed(solatTimes('SGR01', day)),
    S_KK_MAGHRIB: tm(mag('SBH07')), S_KUCHING_MAGHRIB: tm(mag('SWK08')),
    S_FIRST: zl(first[0]), S_FIRST_T: tm(first[1]), S_LAST: zl(last[0]), S_LAST_T: tm(last[1]), S_SPREAD: S.duration(last[1] - first[1], lang),
    S_ALL: all, S_STATES: stateLinks,
    S_CHECK_DAYS: (check.days || 0).toLocaleString('en'), S_CHECK_DIFF: check.differences ?? 0
  };
}
const solatStateMap = (lang, p) => ({
  ...solatShared(lang),
  ...stateMap(lang, p, { day: solatDay, times: solatTimes, esc, longDate, calc: solatCalc,
    year: (solatTimes(p.solatState.main, solatDay), solatYears.get(p.solatState.main + solatDay.slice(0, 4))) })
});
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
// ---- batch 6: SST, Bursa share fees, tenancy stamp duty, EIS
function sstMap(lang) {
  const { L, m, nf, tr, opt } = b3(lang), S = sstCore, r = S.calculate({ amount: 100, rate: 8 });
  const lines = [tr(L ? 'Harga sebelum cukai' : 'Price before tax', m(r.base)), tr('SST (8%)', m(r.tax)), tr(L ? 'Jumlah termasuk cukai' : 'Total including tax', m(r.total), 'total'), tr(L ? 'Bahagian cukai dalam jumlah' : 'Tax share of the total', nf(r.taxShare, 2) + '%')].join('\n');
  const rates = [[8, L ? 'Cukai perkhidmatan am (kebanyakan perkhidmatan bercukai, termasuk perkhidmatan kewangan berasaskan fi)' : 'General service tax (most taxable services, including fee-based financial services)'],
    [6, L ? 'Makanan dan minuman, telekomunikasi, letak kenderaan, logistik, pembinaan, sewaan dan pajakan (mulai 1 Januari 2026), kesihatan swasta untuk bukan warganegara, pendidikan swasta yang bercukai' : 'Food and beverage, telecommunications, parking, logistics, construction, rental and leasing (from 1 January 2026), private healthcare for non-citizens, taxable private education'],
    [10, L ? 'Cukai jualan, kadar asas (barang tidak penting dan premium)' : 'Sales tax, standard rate (non-essential and premium goods)'], [5, L ? 'Cukai jualan, kadar dikurangkan (barang tersenarai)' : 'Sales tax, reduced rate (listed goods)'], [0, L ? 'Barang keperluan asas dikecualikan' : 'Exempt essential goods']]
    .map(([v, d]) => `<tr><th scope="row">${v}%</th><td>${d}</td></tr>`).join('\n');
  const grid = [10, 50, 100, 500, 1000, 5000].map(a => `<tr><th scope="row">${m(a)}</th>${[6, 8, 10].map(rt => `<td>${m(S.calculate({ amount: a, rate: rt }).total)}</td>`).join('')}${[6, 8].map(rt => `<td>${m(S.calculate({ amount: a, rate: rt, mode: 'remove' }).base)}</td>`).join('')}</tr>`).join('\n');
  const th = S.FACTS.thresholds.map(([k, v]) => `<tr><th scope="row">${{ services: L ? 'Kebanyakan perkhidmatan' : 'Most services', manufacturer: L ? 'Pengilang barang bercukai' : 'Manufacturer of taxable goods', fnb: L ? 'Makanan dan minuman' : 'Food and beverage', rental: L ? 'Sewaan dan pajakan' : 'Rental and leasing', financial: L ? 'Perkhidmatan kewangan' : 'Financial services', construction: L ? 'Pembinaan' : 'Construction', healthcare: L ? 'Kesihatan swasta' : 'Private healthcare' }[k]}</th><td>${m(v)}</td></tr>`).join('\n');
  const rest = S.calculate({ amount: 100, rate: 6, charge: 10 });
  return {
    S_MODE_OPTIONS: [opt('add', 'Add SST to a price', 'Tambah SST pada harga', true), opt('remove', 'Remove SST from a total', 'Keluarkan SST daripada jumlah')].join(''),
    S_RATE_OPTIONS: [opt('8', '8% service tax (general)', '8% cukai perkhidmatan (am)', true), opt('6', '6% service tax (F&B, telco, rental and others)', '6% cukai perkhidmatan (F&B, telko, sewaan dan lain-lain)'), opt('10', '10% sales tax', '10% cukai jualan'), opt('5', '5% sales tax', '5% cukai jualan')].join(''),
    S_TOTAL: m(r.total), S_SUB: L ? 'SST RM 8.00 pada 8%' : 'SST RM 8.00 at 8%', S_LINES: lines, S_RATES: rates, S_GRID: grid, S_THRESH: th, S_REST: m(rest.total),
    S_REMOVE: m(S.calculate({ amount: 108, rate: 8, mode: 'remove' }).base),
    S_VERIFIED: longDate(S.FACTS.verified, lang), S_VERIFIED_ISO: S.FACTS.verified
  };
}
const BURSA_EXAMPLE = { qty: 1000, buy: 2, sell: 2.3, brokerPct: 0.08, brokerMin: 8, asset: 'shares', dividend: 0 };
function bursaMap(lang) {
  const { L, m, nf, tr, opt } = b3(lang), B = bursaCore, r = B.calculate(BURSA_EXAMPLE);
  const lines = [tr(L ? 'Nilai belian' : 'Buy value', m(r.buyValue)), tr(L ? 'Brokeraj belian' : 'Buy brokerage', '+ ' + m(r.buyFees.brokerage)), tr(L ? 'Fi penjelasan belian' : 'Buy clearing fee', '+ ' + m(r.buyFees.clearing)), tr(L ? 'Duti setem belian' : 'Buy stamp duty', '+ ' + m(r.buyFees.stamp)),
    tr(L ? 'Kos belian' : 'Total buy cost', m(r.cost), 'total'), tr(L ? 'Nilai jualan' : 'Sell value', m(r.sellValue)), tr(L ? 'Brokeraj jualan' : 'Sell brokerage', '− ' + m(r.sellFees.brokerage)), tr(L ? 'Fi penjelasan jualan' : 'Sell clearing fee', '− ' + m(r.sellFees.clearing)),
    tr(L ? 'Duti setem jualan' : 'Sell stamp duty', '− ' + m(r.sellFees.stamp)), tr(L ? 'Hasil jualan bersih' : 'Net sale proceeds', m(r.proceeds), 'total'), tr(L ? 'Untung bersih' : 'Net profit', m(r.profit), 'total'), tr(L ? 'Pulangan' : 'Return', nf(r.ret, 2) + '%'),
    tr(L ? 'Jumlah caj' : 'Total charges', m(r.feesTotal)), tr(L ? 'Harga pulang modal' : 'Break-even price', 'RM' + r.breakEven.toFixed(3))].join('\n');
  const grid = [1000, 5000, 10000, 50000, 100000, 1000000].map(v => { const f = B.fees(v, 0.0008, 8, false); return `<tr><th scope="row">${m(v)}</th><td>${m(f.brokerage)}</td><td>${m(f.clearing)}</td><td>${m(f.stamp)}</td><td>${m(f.total)}</td><td>${nf(f.total / v * 100, 3)}%</td></tr>`; }).join('\n');
  const big = B.fees(2000000, 0.0008, 8, false);
  return {
    B_QTY: BURSA_EXAMPLE.qty, B_BUY: BURSA_EXAMPLE.buy, B_SELL: BURSA_EXAMPLE.sell, B_PCT: BURSA_EXAMPLE.brokerPct, B_MIN: BURSA_EXAMPLE.brokerMin,
    B_ASSET_OPTIONS: [opt('shares', 'Ordinary shares (no SST on fees)', 'Saham biasa (tiada SST atas caj)', true), opt('etf', 'ETF, REIT or warrant (8% SST on brokerage and clearing)', 'ETF, REIT atau waran (SST 8% atas brokeraj dan penjelasan)')].join(''),
    B_PROFIT: m(r.profit), B_RET: nf(r.ret, 2), B_FEES: m(r.feesTotal), B_BE: 'RM' + r.breakEven.toFixed(3), B_BUYFEES: m(r.buyFees.total), B_SELLFEES: m(r.sellFees.total),
    B_SUB: L ? `Pulangan ${nf(r.ret, 2)}% · caj ${m(r.feesTotal)}` : `Return ${nf(r.ret, 2)}% · charges ${m(r.feesTotal)}`, B_LINES: lines, B_GRID: grid, B_BIG_STAMP: m(big.stamp), B_BIG_CLEAR: m(big.clearing),
    B_VERIFIED: longDate(B.FACTS.verified, lang), B_VERIFIED_ISO: B.FACTS.verified
  };
}
const TEN_EXAMPLE = { rent: 1500, months: 24, copies: 1, price: 350000, costs: 2400, vacancy: 1 };
function tenancyMap(lang) {
  const { L, m, nf, tr } = b3(lang), T = tenancyCore, r = T.calculate(TEN_EXAMPLE);
  const lines = [tr(L ? 'Sewa setahun' : 'Yearly rent', m(r.annual)), tr(L ? 'Unit RM250 (dibundar naik)' : 'Units of RM250 (rounded up)', r.units), tr(L ? 'Kadar setiap RM250' : 'Rate per RM250', 'RM' + r.rate), tr(L ? 'Duti setem perjanjian' : 'Agreement stamp duty', m(r.duty)),
    tr(L ? 'Salinan (1 × RM10)' : 'Copies (1 × RM10)', m(r.copyDuty)), tr(L ? 'Jumlah duti setem' : 'Total stamp duty', m(r.total), 'total'), tr(L ? 'Di bawah peraturan lama (dulu)' : 'Under the old rule (before)', m(r.old)),
    tr(L ? 'Pulangan kasar' : 'Gross rental yield', nf(r.grossYield, 2) + '%'), tr(L ? 'Pendapatan sewa bersih setahun' : 'Net rental income a year', m(r.netIncome)), tr(L ? 'Pulangan bersih' : 'Net rental yield', nf(r.netYield, 2) + '%', 'total')].join('\n');
  const grid = [500, 1000, 1500, 2000, 3000, 5000].map(rent => `<tr><th scope="row">${m(rent)}</th>${[12, 24, 48, 72].map(mo => `<td>${m(T.stampDuty(rent, mo).duty)}</td>`).join('')}</tr>`).join('\n');
  const bands = T.FACTS.bands.map(([mo, rate], i) => `<tr><th scope="row">${[L ? 'Hingga 1 tahun' : 'Up to 1 year', L ? 'Lebih 1 hingga 3 tahun' : 'Over 1 to 3 years', L ? 'Lebih 3 hingga 5 tahun' : 'Over 3 to 5 years', L ? 'Lebih 5 tahun atau tidak tetap' : 'Over 5 years or indefinite'][i]}</th><td>RM${rate}</td></tr>`).join('\n');
  return {
    T_RENT: TEN_EXAMPLE.rent, T_MONTHS: TEN_EXAMPLE.months, T_COPIES: TEN_EXAMPLE.copies, T_PRICE: TEN_EXAMPLE.price, T_COSTS: TEN_EXAMPLE.costs, T_VACANCY: TEN_EXAMPLE.vacancy,
    T_TOTAL: m(r.total), T_DUTY: m(r.duty), T_OLD: m(r.old), T_GROSS: nf(r.grossYield, 2), T_NET: nf(r.netYield, 2),
    T_SUB: L ? `${r.units} × RM${r.rate} + 1 salinan · tempoh ${r.months} bulan` : `${r.units} × RM${r.rate} + 1 copy · ${r.months}-month term`, T_LINES: lines, T_GRID: grid, T_BANDS: bands,
    T_2000: m(T.stampDuty(2000, 12).duty), T_1800: m(T.stampDuty(1800, 12).duty),
    T_VERIFIED: longDate(T.FACTS.verified, lang), T_VERIFIED_ISO: T.FACTS.verified
  };
}
const EIS_EXAMPLE = { wage: 3000, months: 6, newJob: 0, lossAfter: 'yes', far: 'no' };
function eisMap(lang) {
  const { L, m, tr, opt } = b3(lang), E = eisCore, r = E.calculate(EIS_EXAMPLE), mo = n => L ? `Bulan ${n}` : `Month ${n}`;
  const lines = [tr(L ? 'Gaji andaian (siling RM6,000)' : 'Assumed wage (RM6,000 ceiling)', m(r.wage)), tr(L ? 'Tempoh elaun' : 'Allowance period', L ? '6 bulan' : '6 months'), tr(L ? 'Jumlah Elaun Mencari Pekerjaan' : 'Total Job Search Allowance', m(r.total), 'total'), tr(L ? 'Yuran latihan maksimum' : 'Maximum training fee', m(r.trainingCap))].join('\n');
  const sched = r.schedule.map(x => tr(`${mo(x.month)} (${x.rate}%)`, m(x.amount))).join('\n');
  const grid = [1700, 2000, 3000, 4000, 5000, 6000].map(w => { const x = E.calculate({ wage: w, months: 6 }); return `<tr><th scope="row">${m(w)}</th><td>${m(x.schedule[0].amount)}</td><td>${m(E.calculate({ wage: w, months: 3 }).total)}</td><td>${m(x.total)}</td></tr>`; }).join('\n');
  const era = E.calculate({ wage: 3000, months: 6, newJob: 2 }), era5 = E.calculate({ wage: 5000, months: 6, newJob: 2 });
  const monthOpts = [3, 4, 5, 6].map(n => opt(String(n), `${n} months`, `${n} bulan`, n === 6)).join('');
  const jobOpts = [opt('0', 'Not yet / no', 'Belum / tidak', true), ...[1, 2, 3, 4, 5].map(n => opt(String(n), `After month ${n}`, `Selepas bulan ${n}`))].join('');
  return {
    E_WAGE: EIS_EXAMPLE.wage, E_MONTH_OPTIONS: monthOpts, E_JOB_OPTIONS: jobOpts,
    E_LOSS_OPTIONS: [opt('yes', 'On or after 1 October 2026', 'Pada atau selepas 1 Oktober 2026', true), opt('no', 'Before 1 October 2026', 'Sebelum 1 Oktober 2026')].join(''),
    E_FAR_OPTIONS: [opt('no', 'No', 'Tidak', true), opt('yes', 'Yes, over 100 km from home', 'Ya, lebih 100 km dari rumah')].join(''),
    E_TOTAL: m(r.total), E_FIRST: m(r.schedule[0].amount), E_SUB: L ? `6 bulan · bulan pertama ${m(r.schedule[0].amount)}` : `6 months · first month ${m(r.schedule[0].amount)}`,
    E_LINES: lines, E_SCHED: sched, E_GRID: grid, E_ERA: m(era.era), E_ERA_REC: m(era.received), E_ERA5: m(era5.era), E_MAX: m(E.calculate({ wage: 6000, months: 6 }).total),
    E_VERIFIED: longDate(E.FACTS.verified, lang), E_VERIFIED_ISO: E.FACTS.verified
  };
}
// ---- batch 7: mas kahwin by state, in gold and dinar, wedding cost planner. Gold is today's price (daily rebuild).
const MK_EXAMPLE = { state: 'selangor', bride: 'dara', kind: 'cash', qty: 300, paid: 'tunai', hantaran: 10000, gifts: 3000, guests: 500, perHead: 15, other: 8000, fees: '', months: 12 };
const MK_ORDER = ['johor', 'kedah', 'kelantan', 'melaka', 'ns', 'pahang', 'penang', 'perak', 'perlis', 'sabah', 'sarawak', 'selangor', 'terengganu', 'wp'];
const MK_NOTES = {
  johor: ['The often-quoted figure dates from 1935; sources dispute whether it is a minimum or a ceiling. Not confirmed by the state office.', 'Angka yang sering dipetik bermula 1935; sumber berbeza sama ada ia minimum atau had maksimum. Belum disahkan pejabat negeri.'],
  kedah: ['The enactment only requires the agreed value to be recorded. Published rates conflict.', 'Enakmen hanya mewajibkan nilai dipersetujui dicatat. Kadar yang diterbitkan bercanggah.'],
  kelantan: ['The 2002 enactment sets no minimum (academic source). Not confirmed by the state office.', 'Enakmen 2002 tidak menetapkan minimum (sumber akademik). Belum disahkan pejabat negeri.'],
  melaka: ['Minimum, raised from RM40 by MAIM.', 'Minimum, dinaikkan daripada RM40 oleh MAIM.'],
  ns: ['Rates on the JHEAINS marriage application form; effective date not published.', 'Kadar dalam borang permohonan perkahwinan JHEAINS; tarikh kuat kuasa tidak diterbitkan.'],
  pahang: ['Minimum, raised from RM22.50 (used since 1900) with the Sultan\'s consent; the ceiling depends on the couple\'s means.', 'Minimum, dinaikkan daripada RM22.50 (sejak 1900) dengan perkenan Sultan; had atas ikut kemampuan pasangan.'],
  penang: ['Published figures conflict; the Penang Mufti says Islam sets no minimum or maximum.', 'Angka yang diterbitkan bercanggah; Mufti Pulau Pinang menyatakan Islam tidak menetapkan minimum atau maksimum.'],
  perak: ['Published figures conflict; no official source found.', 'Angka yang diterbitkan bercanggah; tiada sumber rasmi ditemui.'],
  perlis: ['Fatwa (2014): syarak sets no minimum or maximum; hantaran and kenduri are not obligatory.', 'Fatwa (2014): syarak tidak menetapkan minimum atau maksimum; hantaran dan kenduri tidak wajib.'],
  sabah: ['Published figures conflict; the 2004 enactment requires the value to be recorded.', 'Angka yang diterbitkan bercanggah; Enakmen 2004 mewajibkan nilai dicatat.'],
  sarawak: ['Published figures conflict; no official source found.', 'Angka yang diterbitkan bercanggah; tiada sumber rasmi ditemui.'],
  selangor: ['Minimum, no maximum, for anak dara and janda; cash wang hantaran from the groom counts as mas kahwin.', 'Minimum tanpa had maksimum, untuk anak dara dan janda; wang hantaran tunai daripada lelaki dikira mas kahwin.'],
  terengganu: ['No fixed rate: agreed between the two families\' wali (JHEAT, March 2024).', 'Tiada kadar tetap: dipersetujui wali kedua-dua keluarga (JHEAT, Mac 2024).'],
  wp: ['Minimum for Kuala Lumpur, Putrajaya and Labuan; no separate janda rate published.', 'Minimum bagi Kuala Lumpur, Putrajaya dan Labuan; tiada kadar janda berasingan diterbitkan.']
};
const mkGram = () => { const p = goldCore.pureGram(goldData); return p ? Math.round(p.rm * 100) / 100 : 0; };
function maskahwinMap(lang) {
  const { L, m, nf, tr, opt } = b3(lang), M = maskahwinCore, F = M.FACTS, gram = mkGram(), r = M.calculate({ ...MK_EXAMPLE, gram });
  const head = { min: L ? 'Mas kahwin minimum' : 'Minimum mas kahwin', rate: L ? 'Kadar mas kahwin' : 'Mas kahwin rate', none: L ? 'Tiada kadar negeri' : 'No state rate', unconfirmed: L ? 'Belum disahkan secara rasmi' : 'Not officially confirmed' };
  const fees = { officiant: L ? 'Jurunikah' : 'Officiant (jurunikah)', registration: L ? 'Pendaftaran' : 'Registration', witnesses: L ? 'Dua saksi' : 'Two witnesses', cards: L ? 'Kad nikah' : 'Nikah cards' };
  const status = s => s.status === 'none' ? (L ? 'Tiada kadar' : 'No rate') : s.status === 'unconfirmed' ? (L ? 'Belum disahkan' : 'Not confirmed') : null;
  const states = MK_ORDER.map(k => {
    const s = F.states[k], a = M.rate(k, 'dara'), b = M.rate(k, 'janda'), st = status(s);
    const since = s.since ? (s.announced ? (L ? 'Diumumkan ' : 'Announced ') : '') + longDate(s.since, lang) : '–';
    const g = a.amount && gram ? nf(M.inGold(a.amount, gram).g999, 3) + ' g' : '–';
    return `<tr><th scope="row">${s.name}</th><td>${st || m(a.amount)}</td><td>${st || m(b.amount)}</td><td>${since}</td><td>${g}</td><td>${MK_NOTES[k][L]}</td></tr>`;
  }).join('\n');
  const feeRows = ['selangor', 'wp', 'penang'].map(k => { const s = F.states[k]; return `<tr><th scope="row">${s.name}</th><td>${s.fees.map(([f, v]) => `${fees[f]} ${m(v)}`).join(', ')}</td><td>${m(M.rate(k).feeTotal)}</td></tr>`; }).join('\n');
  const goldRows = [100, 200, 300, 500, 1000, 3000].map(a => { const g = M.inGold(a, gram); return `<tr><th scope="row">${m(a)}</th><td>${nf(g.g999, 3)} g</td><td>${nf(g.g916, 3)} g</td><td>${nf(g.dinar, 3)}</td></tr>`; }).join('\n');
  const planLabel = { mahar: L ? 'Mas kahwin' : 'Mas kahwin', hantaran: 'Wang hantaran', gifts: L ? 'Cincin dan barang hantaran' : 'Rings and hantaran gifts', other: L ? 'Pelamin, pakaian, foto dan lain-lain' : 'Dais, attire, photos and other', fees: (L ? 'Fi nikah dan pendaftaran' : 'Nikah and registration fees') + (L ? ' (kadar rasmi negeri)' : ' (official state rate)') };
  const plan = r.plan.map(([k, v]) => tr(k === 'catering' ? (L ? `Kenduri (${nf(r.guests, 0)} tetamu)` : `Reception (${nf(r.guests, 0)} guests)`) : planLabel[k], m(v)))
    .concat([tr(L ? 'Jumlah kos perkahwinan' : 'Total wedding cost', m(r.total), 'total'), tr(L ? `Simpan sebulan (${r.months} bulan)` : `Save a month (${r.months} months)`, m(r.monthly))]).join('\n');
  const lines = [tr(L ? 'Mas kahwin anda' : 'Your mas kahwin', m(r.mahar)), tr(L ? 'Semakan' : 'Check', L ? 'Memenuhi kadar negeri' : 'Meets the state rate', 'total'), tr(L ? 'Cara bayar' : 'Payment', L ? 'Dibayar tunai' : 'Paid in cash'),
    tr(L ? 'Dalam emas 999' : 'In 999 gold', nf(r.gold.g999, 3) + ' g'), tr(L ? 'Dalam emas 916' : 'In 916 gold', nf(r.gold.g916, 3) + ' g'), tr(L ? 'Dalam dinar emas (4.25 g, 917)' : 'In gold dinars (4.25 g, 917)', nf(r.gold.dinar, 3))].join('\n');
  const stateOpts = MK_ORDER.map(k => opt(k, F.states[k].name, F.states[k].name, k === 'selangor')).join('');
  const g300 = M.inGold(300, gram), g100 = M.inGold(100, gram);
  return {
    MK_GRAM: gram, MK_GRAM_TXT: m(gram), MK_GOLD_DATE: longDate(goldDate, lang), MK_GOLD_ISO: goldDate,
    MK_STATE_OPTIONS: stateOpts, MK_BRIDE_OPTIONS: [opt('dara', 'Anak dara (never married)', 'Anak dara', true), opt('janda', 'Janda (previously married)', 'Janda')].join(''),
    MK_KIND_OPTIONS: [opt('cash', 'Cash (RM)', 'Tunai (RM)', true), opt('gold999', 'Gold 999, grams', 'Emas 999, gram'), opt('gold916', 'Gold 916, grams', 'Emas 916, gram'), opt('dinar', 'Gold dinar, coins', 'Dinar emas, keping')].join(''),
    MK_PAID_OPTIONS: [opt('tunai', 'Cash, at the akad', 'Tunai, semasa akad', true), opt('hutang', 'Deferred (hutang)', 'Hutang (ditangguh)')].join(''),
    MK_QTY: MK_EXAMPLE.qty, MK_HANTARAN: MK_EXAMPLE.hantaran, MK_GIFTS: MK_EXAMPLE.gifts, MK_GUESTS: MK_EXAMPLE.guests, MK_PERHEAD: MK_EXAMPLE.perHead, MK_OTHER: MK_EXAMPLE.other, MK_MONTHS: MK_EXAMPLE.months,
    MK_HEAD: head[r.status], MK_RATE: m(r.amount), MK_SUB: L ? `Selangor · berkuat kuasa ${longDate('2010-01-01', lang)} · dahulu ${m(80)}` : `Selangor · in force ${longDate('2010-01-01', lang)} · was ${m(80)}`,
    MK_LINES: lines, MK_PLAN: plan, MK_TOTAL: m(r.total), MK_MONTHLY: m(r.monthly), MK_STATES: states, MK_FEES: feeRows, MK_GOLDTABLE: goldRows,
    MK_DINAR_RM: m(g300.dinarRm), MK_300_G: nf(g300.g999, 3), MK_300_916: nf(g300.g916, 3), MK_300_DINAR: nf(g300.dinar, 3), MK_100_G: nf(g100.g999, 3),
    MK_VERIFIED: longDate(F.verified, lang), MK_VERIFIED_ISO: F.verified
  };
}
// ---- batch 8: hajj cost and Tabung Haji, STR and SARA, SSPA salary, Ar-Rahnu
const HAJI_EXAMPLE = { cat: 'M40', people: 1, balance: 3000, monthly: 300, rate: 3.5, registered: 'yes' };
const monthName = (ym, lang) => new Date(ym + '-01T00:00:00Z').toLocaleDateString(lang === 'ms' ? 'ms-MY' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
function hajiMap(lang) {
  const { L, m, nf, tr, opt } = b3(lang), H = hajiCore, F = H.FACTS, r = H.calculate(HAJI_EXAMPLE);
  const when = (x, ym) => x.months === 0 ? (L ? 'Sudah dicapai' : 'Already reached') : `${x.months} ${L ? 'bulan' : 'months'} (${monthName(ym, lang)})`;
  const cost = [tr(L ? 'Kos sebenar haji Muassasah' : 'Actual Muassasah hajj cost', m(r.cost)), tr(L ? 'Bantuan Kewangan Haji' : 'Hajj financial assistance', '− ' + m(r.subsidy)), tr(L ? 'Anda bayar' : 'You pay', m(r.pay), 'total')].join('\n');
  const save = [tr(L ? 'Baki Tabung Haji sekarang' : 'Tabung Haji balance now', m(r.balance)), tr(L ? 'Simpanan sebulan' : 'Monthly saving', m(r.monthly)),
    tr(L ? 'Capai RM15,000 (layak tawaran)' : 'Reach RM15,000 (offer threshold)', when(r.toOffer, r.offerMonth), 'total'), tr(L ? `Capai bayaran haji ${m(r.pay)}` : `Reach the hajj payment ${m(r.pay)}`, when(r.toPay, r.payMonth)),
    tr(L ? 'Hibah hingga RM15,000' : 'Hibah until RM15,000', m(r.toOffer.hibah)), tr(L ? 'Tarikh akhir 31 Disember 2028' : 'Deadline 31 December 2028', L ? `Simpan ${m(r.needDeadline)} sebulan untuk capai` : `Save ${m(r.needDeadline)} a month to make it`),
    tr(L ? 'Baki selepas 5 tahun' : 'Balance after 5 years', m(r.fiveYears.balance)), tr(L ? 'Hibah dalam 5 tahun' : 'Hibah over 5 years', m(r.fiveYears.hibah))].join('\n');
  const rates = ['B40', 'M40', 'T20'].map(c => { const x = H.calculate({ cat: c }); return `<tr><th scope="row">${c}</th><td>${m(x.pay)}</td><td>${m(x.subsidy)}${x.gov ? (L ? ' (termasuk RM1,000 kerajaan)' : ' (incl. RM1,000 government)') : ''}</td><td>${x.share}%</td><td>${m(x.cost)}</td></tr>`; }).join('\n');
  const hibah = F.hibah.slice().reverse().map(([y, v]) => `<tr><th scope="row">${y}</th><td>${v.toFixed(2)}%</td><td>${m(H.grow(10000, 0, v, 12).hibah)}</td></tr>`).join('\n');
  const left = H.monthsLeft(F.verified);
  const plan = [0, 3000, 5000, 10000].map(b => `<tr><th scope="row">${m(b)}</th>${[12, 24, left, 36, 60].map(n => `<td>${m(H.monthlyFor(b, F.threshold, n, 3.5))}</td>`).join('')}</tr>`).join('\n');
  const z = H.monthsTo(0, 500, 3.5, F.threshold);
  return {
    H_CAT_OPTIONS: [opt('B40', 'B40, first hajj', 'B40, haji pertama'), opt('M40', 'M40, first hajj', 'M40, haji pertama', true), opt('T20', 'T20 (no subsidy)', 'T20 (tiada bantuan)')].join(''),
    H_REG_OPTIONS: [opt('yes', 'Yes, before 11 September 2026', 'Ya, sebelum 11 September 2026', true), opt('no', 'No, new depositor', 'Tidak, pendeposit baharu')].join(''),
    H_PEOPLE: HAJI_EXAMPLE.people, H_BALANCE: HAJI_EXAMPLE.balance, H_MONTHLY: HAJI_EXAMPLE.monthly, H_RATE: HAJI_EXAMPLE.rate,
    H_PAY: m(r.pay), H_SUB: L ? `M40 · bantuan ${m(r.subsidy)} (${100 - r.share}%) · kos sebenar ${m(r.cost)}` : `M40 · subsidy ${m(r.subsidy)} (${100 - r.share}%) · actual cost ${m(r.cost)}`,
    H_COST: cost, H_SAVE: save, H_RATES: rates, H_HIBAH: hibah, H_PLAN: plan, H_LEFT: left,
    H_500_MONTHS: z.months, H_500_HIBAH: m(z.hibah), H_NEED: m(r.needDeadline), H_TOOFFER: r.toOffer.months, H_OFFER_MONTH: monthName(r.offerMonth, lang),
    H_NEED0: m(H.monthlyFor(0, F.threshold, left, 3.5)), H_HIB10K: m(H.grow(10000, 0, 3.5, 12).hibah),
    H_VERIFIED: longDate(F.verified, lang), H_VERIFIED_ISO: F.verified
  };
}
const STR_EXAMPLE = { cat: 'household', income: 2000, children: 3, ekasih: 'no', age: 30, oku: 'no' };
function strMap(lang) {
  const { L, m, tr, opt } = b3(lang), S = strCore, F = S.FACTS, r = S.calculate(STR_EXAMPLE);
  const lines = [tr(L ? 'STR 2026 (tunai)' : 'STR 2026 (cash)', m(r.str)), tr(L ? 'SARA 2026 (barang asas, MyKad)' : 'SARA 2026 (basic goods, MyKad)', m(r.sara)),
    tr(L ? 'Jumlah setahun' : 'Total a year', `${m(r.total)} (${L ? 'kira-kira' : 'about'} ${m(r.total / 12)} ${L ? 'sebulan' : 'a month'})`, 'total'),
    tr(L ? 'Berbanding STR tunai 2025' : 'Compared with 2025 STR cash', '− ' + m(300)), tr(L ? 'SARA untuk Semua (setiap dewasa 18+)' : 'SARA untuk Semua (every adult 18+)', m(F.sus))].join('\n');
  const kids = L ? ['Tiada anak', '1 hingga 2 anak', '3 hingga 4 anak', '5 anak atau lebih'] : ['No children', '1 to 2 children', '3 to 4 children', '5 or more children'];
  const rates = kids.map((k, i) => `<tr><th scope="row">${k}</th><td>${m(F.household.low[i])}</td><td>${m(F.household.mid[i])}</td><td>${m(F.household2025.low[i])} / ${m(F.household2025.mid[i])}</td></tr>`).join('\n');
  const both = kids.map((k, i) => `<tr><th scope="row">${k}</th><td>${m(F.household.low[i] + F.sara.household)}</td><td>${m(F.household.low[i] + F.sara.ekasih)}</td><td>${m(F.household.mid[i] + F.sara.household)}</td></tr>`).join('\n');
  const phases = F.phases.map(([n, d, rg]) => `<tr><th scope="row">${L ? 'Fasa' : 'Phase'} ${n}</th><td>${d ? longDate(d, lang) : (L ? `Belum diumumkan (permohonan ditutup ${longDate(F.phase4.closed, lang)})` : `Not announced yet (applications closed ${longDate(F.phase4.closed, lang)})`)}</td><td>${rg ? `${m(rg[0])} – ${m(rg[1])}` : (L ? 'Baki kadar tahunan' : 'Rest of the yearly rate')}</td></tr>`).join('\n');
  return {
    S_CAT_OPTIONS: [opt('household', 'Household (married or single parent)', 'Isi rumah (berkahwin atau ibu/bapa tunggal)', true), opt('single', 'Single, 21 to 59', 'Bujang, 21 hingga 59 tahun'), opt('senior', 'Senior citizen 60+ without a spouse', 'Warga emas 60+ tiada pasangan')].join(''),
    S_EKASIH_OPTIONS: [opt('no', 'No', 'Tidak', true), opt('yes', 'Yes (poor or hardcore poor)', 'Ya (miskin atau miskin tegar)')].join(''),
    S_OKU_OPTIONS: [opt('no', 'No', 'Tidak', true), opt('yes', 'Yes (from age 19)', 'Ya (dari umur 19)')].join(''),
    S_INCOME: STR_EXAMPLE.income, S_CHILDREN: STR_EXAMPLE.children, S_AGE: STR_EXAMPLE.age,
    S_TOTAL: m(r.total), S_SUB: L ? 'Pendapatan RM2,500 ke bawah · 3 anak' : 'Income up to RM2,500 · 3 children', S_LINES: lines, S_RATES: rates, S_BOTH: both, S_PHASES: phases,
    S_MAX: m(F.household.low[3] + F.sara.ekasih), S_EX_STR: m(r.str), S_EX_SARA: m(r.sara),
    S_VERIFIED: longDate(F.verified, lang), S_VERIFIED_ISO: F.verified
  };
}
const SSPA_EXAMPLE = { basic: 2000, group: 'pelaksana', kgt: 0, mode: 'salary' };
function sspaMap(lang) {
  const { L, m, nf, tr, opt } = b3(lang), P = sspaCore, F = P.FACTS, r = P.calculate(SSPA_EXAMPLE);
  const lines = [tr(L ? 'Gaji pokok 30 November 2024' : 'Basic salary on 30 November 2024', m(r.base)), tr(L ? 'Fasa 1, 1 Dis 2024 (minimum RM240)' : 'Phase 1, 1 Dec 2024 (RM240 minimum)', '+ ' + m(r.p1)), tr(L ? 'Selepas fasa 1' : 'After phase 1', m(r.s1)),
    tr(L ? 'Fasa 2, 1 Jan 2026 (7%)' : 'Phase 2, 1 Jan 2026 (7%)', '+ ' + m(r.p2)), tr(L ? 'Gaji pokok baharu' : 'New basic salary', m(r.s2), 'total'), tr(L ? 'Kenaikan SSPA sebulan' : 'SSPA rise a month', m(r.rise)), tr(L ? 'Kenaikan setahun' : 'Rise a year', m(r.yearly))].join('\n');
  const grid = [1500, 2000, 2500, 3000, 4000, 5000, 7000, 10000].map(b => { const x = P.calculate({ basic: b }), k = P.calculate({ basic: b, group: 'kpt' }); return `<tr><th scope="row">${m(b)}</th><td>${m(x.s1)}</td><td>${m(x.s2)}</td><td>${m(x.rise)} (${nf(x.risePct, 2)}%)</td><td>${m(k.s2)}</td></tr>`; }).join('\n');
  const groups = [['pelaksana', L ? 'Pelaksana (Gred 1 hingga 8)' : 'Pelaksana (Gred 1 to 8)'], ['pp', L ? 'Pengurusan dan Profesional (Gred 9 ke atas)' : 'Management and Professional (Gred 9 and up)'], ['kpt', L ? 'Pengurusan Tertinggi (Gred Utama, Gred Khas)' : 'Top Management (Gred Utama, Gred Khas)']]
    .map(([g, n]) => { const [a, b] = F.rates[g]; return `<tr><th scope="row">${n}</th><td>${nf(a * 100, 0)}%${g !== 'kpt' ? (L ? ' (minimum RM240)' : ' (RM240 minimum)') : ''}</td><td>${nf(b * 100, 0)}%</td><td>${nf(((1 + a) * (1 + b) - 1) * 100, 2)}%</td></tr>`; }).join('\n');
  const grades = F.grades.map(([o, n]) => `<tr><th scope="row">${o}</th><td>${n}</td></tr>`).join('\n');
  const pp = P.calculate({ basic: 4000, group: 'pp' }), pen = P.calculate({ basic: 2000, mode: 'pension' }), kgt = P.calculate({ basic: 2000, kgt: 100 });
  return {
    P_GROUP_OPTIONS: [opt('pelaksana', 'Pelaksana (Gred 1 to 8, old 19 to 40)', 'Pelaksana (Gred 1 hingga 8, lama 19 hingga 40)', true), opt('pp', 'Management and Professional (Gred 9 and up, old 41+)', 'Pengurusan dan Profesional (Gred 9 ke atas, lama 41+)'), opt('kpt', 'Top Management (JUSA, Gred Utama, Gred Khas)', 'Pengurusan Tertinggi (JUSA, Gred Utama, Gred Khas)')].join(''),
    P_MODE_OPTIONS: [opt('salary', 'Serving officer (salary)', 'Penjawat awam (gaji)', true), opt('pension', 'Pensioner (pension)', 'Pesara (pencen)')].join(''),
    P_BASIC: SSPA_EXAMPLE.basic, P_KGT: 0,
    P_NEW: m(r.s2), P_SUB: L ? `+${m(r.rise)} sebulan (${nf(r.risePct, 2)}%)` : `+${m(r.rise)} a month (${nf(r.risePct, 2)}%)`, P_LINES: lines, P_GRID: grid, P_GROUPS: groups, P_GRADES: grades,
    P_EX_S1: m(r.s1), P_EX_S2: m(r.s2), P_PP_S1: m(pp.s1), P_PP_S2: m(pp.s2), P_PEN_S2: m(pen.s2), P_KGT_S2: m(kgt.s2),
    P_VERIFIED: longDate(F.verified, lang), P_VERIFIED_ISO: F.verified
  };
}
const RAHNU_EXAMPLE = { grams: 10, karat: '916', months: 6, want: '', provider: 'muamalat' };
function rahnuMap(lang) {
  const { L, m, nf, tr, opt } = b3(lang), R = rahnuCore, F = R.FACTS, gram = mkGram(), r = R.calculate({ ...RAHNU_EXAMPLE, gram }), q = r.pick;
  const basis = x => x.kind === 'rate' ? `${x.ceiling ? (L ? 'Hingga ' : 'Up to ') : ''}${nf(x.rate)}% ${L ? 'setahun atas pembiayaan' : 'a year on the financing'}` : `RM${x.fee.toFixed(2)} ${L ? 'setiap RM100 nilai emas sebulan' : 'per RM100 of gold value a month'}`;
  const lines = [tr(L ? 'Nilai emas (marhun)' : 'Gold value (marhun)', m(r.marhun)), tr(L ? `Pembiayaan (${q.mof}% nilai emas)` : `Financing (${q.mof}% of gold value)`, m(q.financing)), tr(L ? 'Caj sebulan' : 'Charge a month', m(q.monthly)),
    tr(L ? `Jumlah caj ${r.months} bulan` : `Total charge for ${r.months} months`, m(q.charge)), tr(L ? 'Jumlah tebus' : 'Total to redeem', m(q.repay), 'total'), tr(L ? 'Kadar setahun atas pembiayaan' : 'Yearly rate on the financing', nf(q.apr) + '%'),
    tr(L ? 'Had kedai pajak gadai (2% sebulan)' : 'Pawnshop cap (2% a month)', m(r.pawn)), tr(L ? 'Caj terendah' : 'Lowest charge', `${r.best.name} · ${m(r.best.charge)}`)].join('\n');
  const compare = r.list.map(x => `<tr><th scope="row">${x.name}</th><td>${basis(x)}</td><td>${m(x.financing)}</td><td>${m(x.monthly)}</td><td>${m(x.charge)}</td><td>${nf(x.apr)}%</td></tr>`).join('\n');
  const providers = F.providers.map(p => `<tr><th scope="row">${p.name}</th><td>${p.kind === 'rate' ? (L ? 'Tawarruq, kadar keuntungan' : 'Tawarruq, profit rate') : (L ? 'Upah simpan' : 'Safekeeping fee')}</td><td>${basis(p)}</td><td>${p.mof}%</td><td>${p.tenure} ${L ? 'bulan' : 'months'}</td></tr>`).join('\n');
  const grams = [1, 5, 10, 20, 50].map(g => { const x = R.calculate({ grams: g, karat: '916', gram, months: 6 }); return `<tr><th scope="row">${g} g</th><td>${m(x.marhun)}</td><td>${m(x.list[0].financing)}</td><td>${m(x.list[0].charge)}</td><td>${m(x.list[2].charge)}</td></tr>`; }).join('\n');
  return {
    R_GRAM: gram, R_PRICE: gram, R_GRAM_TXT: m(gram), R_GOLD_DATE: longDate(goldDate, lang), R_GOLD_ISO: goldDate, R_GRAMS: RAHNU_EXAMPLE.grams, R_MONTHS: RAHNU_EXAMPLE.months,
    R_KARAT_OPTIONS: ['999', '916', '875', '835', '750'].map(k => opt(k, `${k} (${{ 999: 24, 916: 22, 875: 21, 835: 20, 750: 18 }[k]}K)`, `${k} (${{ 999: 24, 916: 22, 875: 21, 835: 20, 750: 18 }[k]}K)`, k === '916')).join(''),
    R_PROVIDER_OPTIONS: F.providers.map(p => opt(p.id, p.name, p.name, p.id === 'muamalat')).join(''),
    R_FIN: m(q.financing), R_SUB: `${q.name} · ${basis(q)}`, R_LINES: lines, R_COMPARE: compare, R_PROVIDERS: providers, R_GRAMS_TABLE: grams,
    R_MARHUN: m(r.marhun), R_MUA_CHARGE: m(r.list[0].charge), R_TEKUN_CHARGE: m(r.list[2].charge), R_CARE_CHARGE: m(r.list[3].charge), R_PAWN: m(r.pawn), R_PURE_916: m(gram * 0.916),
    R_VERIFIED: longDate(F.verified, lang), R_VERIFIED_ISO: F.verified
  };
}
// ---- batch 9: age, due date and maternity leave, Solar ATAP, driving licence cost. Dates follow goldDate (daily rebuild).
const longDay = (iso, lang) => new Date(iso + 'T00:00:00Z').toLocaleDateString(lang === 'ms' ? 'ms-MY' : 'en-GB', { weekday: 'short', timeZone: 'UTC' }) + ', ' + longDate(iso, lang);
const UMUR_DOB = '1990-05-01';
function umurMap(lang) {
  const { L, nf, tr } = b3(lang), U = umurCore, F = U.FACTS, on = goldDate, r = U.calculate({ dob: UMUR_DOB, today: on, hijri: hijriCore });
  const DAYS = L ? ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const fd = iso => longDate(iso, lang);
  const names = L ? { mykad: 'MyKad pertama', moto: 'Lesen L motosikal (B2)', car: 'Lesen L kereta (D)', adult: 'Mengundi, umur dewasa, produk rokok', alcohol: 'Beli minuman keras', epf50: 'KWSP: keluar Akaun Sejahtera (sekali, 50 hingga 54)', epf55: 'KWSP: Akaun 55', senior: 'Umur bersara minimum dan warga emas' }
    : { mykad: 'First MyKad', moto: 'Motorcycle learner licence (B2)', car: 'Car learner licence (D)', adult: 'Vote, age of majority, tobacco products', alcohol: 'Buy alcohol', epf50: 'EPF: Akaun Sejahtera withdrawal (once, 50 to 54)', epf55: 'EPF: Akaun 55', senior: 'Minimum retirement age and senior citizen' };
  const nextV = L ? `${fd(r.next)} (${nf(r.nextDays, 0)} hari lagi, umur ${r.nextAge})` : `${fd(r.next)} (in ${nf(r.nextDays, 0)} days, turning ${r.nextAge})`;
  const lines = [tr(L ? 'Jumlah hari' : 'Total days', nf(r.totalDays, 0)), tr(L ? 'Jumlah minggu' : 'Total weeks', nf(r.weeks, 0)), tr(L ? 'Jumlah bulan' : 'Total months', nf(r.totalMonths, 0)),
    tr(L ? 'Hari jadi seterusnya' : 'Next birthday', nextV, 'total'), tr(L ? 'Umur ikut Hijrah' : 'Age in Hijri years', L ? `${r.hijri.y} tahun ${r.hijri.m} bulan` : `${r.hijri.y} years ${r.hijri.m} months`),
    tr(L ? 'Tarikh lahir Hijrah' : 'Hijri date of birth', hijriCore.formatHijri(r.hijri.birth, lang)), tr(L ? 'Hari jadi Hijrah seterusnya' : 'Next Hijri birthday', fd(r.hijri.next))].join('\n');
  const miles = r.milestones.map(x => tr(`${names[x.key]} (${x.age})`, x.reached ? `${L ? 'Sudah' : 'Reached'} · ${fd(x.date)}` : fd(x.date))).join('\n');
  const law = [[12, L ? 'MyKad pertama (MyKid sebelum itu); percuma dalam 30 hari selepas hari jadi ke-12' : 'First MyKad (MyKid before that); free within 30 days of the 12th birthday', L ? 'JPN' : 'National Registration Department'],
    [16, L ? 'Lesen L motosikal (B2)' : 'Motorcycle learner licence (B2)', 'JPJ'], [17, L ? 'Lesen L kereta (D)' : 'Car learner licence (D)', 'JPJ'],
    [18, L ? 'Mengundi (didaftar automatik), bertanding Dewan Rakyat, umur dewasa, tukar MyKad, beli rokok dan vape' : 'Vote (registered automatically), stand for the Dewan Rakyat, age of majority, replace MyKad, buy tobacco and vape', L ? 'Perlembagaan (Akta A1603), Akta Umur Dewasa 1971, Akta 852' : 'Federal Constitution (Act A1603), Age of Majority Act 1971, Act 852'],
    [21, L ? 'Beli minuman keras' : 'Buy alcohol', L ? 'Peraturan Makanan (Pindaan) 2016' : 'Food (Amendment) Regulations 2016'],
    [50, L ? 'Keluar Akaun Sejahtera KWSP, sekali antara 50 dan 54' : 'EPF Akaun Sejahtera withdrawal, once between 50 and 54', 'KWSP'], [55, L ? 'Semua akaun KWSP digabung ke Akaun 55, boleh dikeluarkan' : 'All EPF accounts merge into Akaun 55, withdrawable', 'KWSP'],
    [60, L ? 'Umur bersara minimum, warga emas, Akaun Emas KWSP, kad Rapid Emas 50%' : 'Minimum retirement age, senior citizen, EPF Akaun Emas, Rapid Emas 50% card', L ? 'Akta Umur Persaraan Minimum 2012' : 'Minimum Retirement Age Act 2012']]
    .map(([a, w, s]) => `<tr><th scope="row">${a}</th><td>${w}</td><td>${s}</td></tr>`).join('\n');
  return {
    U_DOB: UMUR_DOB, U_ON: on, U_ON_TXT: fd(on), U_AGE: L ? `${r.years} tahun` : `${r.years} years`, U_SUB: L ? `${r.months} bulan ${r.days} hari · lahir hari ${DAYS[r.weekday]}` : `${r.months} months ${r.days} days · born on a ${DAYS[r.weekday]}`,
    U_LINES: lines, U_MILES: miles, U_LAW: law, U_YEARS: r.years, U_DAYS: nf(r.totalDays, 0), U_HIJRI: r.hijri.y,
    U_VERIFIED: longDate(F.verified, lang), U_VERIFIED_ISO: F.verified
  };
}
function bersalinMap(lang) {
  const { L, m, tr, opt } = b3(lang), B = bersalinCore, F = B.FACTS, lmp = B.add(goldDate, -140), r = B.calculate({ lmp, today: goldDate }), fd = iso => longDay(iso, lang);
  const names = L ? { t2: 'Mula trimester kedua (14 minggu)', t3: 'Mula trimester ketiga (28 minggu)', early: 'Cukup bulan awal (37 minggu)', full: 'Cukup bulan penuh (39 minggu)', edd: 'Jangkaan bersalin (40 minggu)', late: 'Lewat (41 minggu)', post: 'Lepas tempoh (42 minggu)' }
    : { t2: 'Second trimester starts (14 weeks)', t3: 'Third trimester starts (28 weeks)', early: 'Early term (37 weeks)', full: 'Full term (39 weeks)', edd: 'Due date (40 weeks)', late: 'Late term (41 weeks)', post: 'Post-term (42 weeks)' };
  const dates = [tr(L ? 'Anggaran persenyawaan' : 'Estimated conception', fd(r.conception))].concat(r.dates.map(x => tr(names[x.key], fd(x.date), x.key === 'edd' ? 'total' : ''))).join('\n');
  const leave = [tr(L ? 'Cuti bersalin bermula' : 'Maternity leave starts', fd(r.leave.start)), tr(L ? 'Hari terakhir cuti (98 hari)' : 'Last day of leave (98 days)', fd(r.leave.end)), tr(L ? 'Kembali bekerja' : 'Back to work', fd(r.leave.back), 'total'),
    tr(L ? 'Paling awal boleh mula (30 hari sebelum)' : 'Earliest start (30 days before)', fd(r.leave.earliest)), tr(L ? 'Cuti paterniti suami (7 hari)' : "Husband's paternity leave (7 days)", `${fd(r.paternity.start)} – ${fd(r.paternity.end)}`)].join('\n');
  const ex = B.calculate({ lmp: '2026-01-01' }), ex30 = B.calculate({ lmp: '2026-01-01', before: 30 });
  const grid = ['2026-01-01', '2026-03-01', '2026-05-01', '2026-07-01', '2026-09-01', '2026-11-01'].map(d => { const x = B.calculate({ lmp: d }); return `<tr><th scope="row">${longDate(d, lang)}</th><td>${longDate(x.edd, lang)}</td><td>${longDate(x.leave.end, lang)}</td><td>${longDate(x.leave.back, lang)}</td></tr>`; }).join('\n');
  const rules = [[L ? 'Swasta (Akta Kerja 1955) dan Sabah, Sarawak' : 'Private sector (Employment Act 1955), Sabah and Sarawak', L ? '98 hari berturut-turut' : '98 consecutive days', L ? '7 hari (selepas 12 bulan bekerja, hingga 5 kelahiran)' : '7 days (after 12 months, up to 5 births)'],
    [L ? 'Penjawat awam (semasa)' : 'Civil service (current)', L ? '60 hingga 90 hari setiap kelahiran, hingga 360 hari' : '60 to 90 days a birth, up to 360 days', L ? '7 hari, hingga 5 kali' : '7 days, up to 5 times'],
    [L ? 'Penjawat awam (Belanjawan 2027, belum berkuat kuasa)' : 'Civil service (Budget 2027, not yet in force)', L ? '98 hari setiap kelahiran, hingga 490 hari' : '98 days a birth, up to 490 days', L ? 'Tiada perubahan diumumkan' : 'No change announced']]
    .map(([a, b, c]) => `<tr><th scope="row">${a}</th><td>${b}</td><td>${c}</td></tr>`).join('\n');
  return {
    B_LMP: lmp, B_CYCLE: 28, B_RATE: '', B_EDD: fd(r.edd), B_SUB: L ? `Kini ${r.ga.weeks} minggu ${r.ga.days} hari · trimester ${r.trimester}` : `Now ${r.ga.weeks} weeks ${r.ga.days} ${r.ga.days === 1 ? 'day' : 'days'} · trimester ${r.trimester}`,
    B_SECTOR_OPTIONS: [opt('private', 'Private sector, Sabah or Sarawak (98 days)', 'Swasta, Sabah atau Sarawak (98 hari)', true), opt('civil', 'Civil servant', 'Penjawat awam')].join(''),
    B_BEFORE_OPTIONS: [0, 7, 14, 30].map(n => opt(String(n), n ? `${n} days before the due date` : 'On the due date', n ? `${n} hari sebelum jangkaan` : 'Pada tarikh jangkaan', n === 0)).join(''),
    B_CIVIL_OPTIONS: [opt('90', '90 days', '90 hari', true), opt('60', '60 days', '60 hari')].join(''),
    B_DATES: dates, B_LEAVE: leave, B_GRID: grid, B_RULES: rules,
    B_EX_EDD: longDate(ex.edd, lang), B_EX_END: longDate(ex.leave.end, lang), B_EX30_START: longDate(ex30.leave.start, lang), B_EX30_END: longDate(ex30.leave.end, lang),
    B_VERIFIED: longDate(F.verified, lang), B_VERIFIED_ISO: F.verified
  };
}
const SOLAR_EXAMPLE = { usage: 600, kwp: 6, kwac: 5, phase: 'single', yield: 1200, selfuse: 60, costKwp: 3000, suria: 'yes', afa: 0 };
function solarMap(lang) {
  const { L, m, nf, tr, opt } = b3(lang), S = solarCore, F = S.FACTS, level = tnbCore.protectionOn(goldDate), r = S.calculate({ ...SOLAR_EXAMPLE, tnb: tnbCore, protection: level });
  const kwh = n => nf(n, 0) + ' kWh';
  const energy = [tr(L ? 'Tenaga dijana sebulan' : 'Energy generated a month', kwh(r.gen)), tr(L ? 'Digunakan sendiri' : 'Used yourself', kwh(r.self)), tr(L ? 'Dieksport ke grid' : 'Exported to the grid', kwh(r.exported)),
    tr(L ? 'Diimport dari TNB' : 'Imported from TNB', kwh(r.imports)), tr(L ? 'Eksport dikreditkan (27.03 sen)' : 'Exports credited (27.03 sen)', kwh(r.credited))].join('\n');
  const money = [tr(L ? 'Bil tanpa solar' : 'Bill without solar', m(r.without)), tr(L ? 'Bil dengan solar' : 'Bill with solar', m(r.with)), tr(L ? 'Jimat setahun' : 'Saving a year', m(r.yearly), 'total'), tr(L ? 'Kos sistem' : 'System cost', m(r.cost)),
    tr(L ? 'Rebat SuRIA Home' : 'SuRIA Home rebate', '− ' + m(r.rebate)), tr(L ? 'Kos bersih' : 'Net cost', m(r.net)), tr(L ? 'Tempoh pulang modal' : 'Payback period', `${nf(r.payback, 1)} ${L ? 'tahun' : 'years'}`, 'total'), tr(L ? 'Jimat dalam 10 tahun ATAP' : 'Saving over the 10-year ATAP term', m(r.tenureSaving))].join('\n');
  const grid = [[300, 3, 3], [500, 5, 5], [600, 6, 5], [800, 8, 5], [1000, 10, 10], [1200, 12, 12]].map(([u, p, ac]) => { const x = S.calculate({ ...SOLAR_EXAMPLE, usage: u, kwp: p, kwac: ac, phase: ac > 5 ? 'three' : 'single', tnb: tnbCore, protection: level }); return `<tr><th scope="row">${kwh(u)}</th><td>${p} kWp</td><td>${m(x.without)}</td><td>${m(x.with)}</td><td>${m(x.saving)}</td><td>${x.payback ? nf(x.payback, 1) : '–'}</td></tr>`; }).join('\n');
  const self = [30, 45, 60, 75, 90].map(sc => { const x = S.calculate({ ...SOLAR_EXAMPLE, selfuse: sc, tnb: tnbCore, protection: level }); return `<tr><th scope="row">${sc}%</th><td>${kwh(x.imports)}</td><td>${kwh(x.credited)}</td><td>${kwh(x.forfeited)}</td><td>${m(x.saving)}</td></tr>`; }).join('\n');
  return {
    O_USAGE: SOLAR_EXAMPLE.usage, O_KWP: SOLAR_EXAMPLE.kwp, O_KWAC: SOLAR_EXAMPLE.kwac, O_YIELD: SOLAR_EXAMPLE.yield, O_SELF: SOLAR_EXAMPLE.selfuse, O_COST: SOLAR_EXAMPLE.costKwp, O_AFA: SOLAR_EXAMPLE.afa,
    O_PHASE_OPTIONS: [opt('single', 'Single phase (up to 5 kW)', 'Satu fasa (hingga 5 kW)', true), opt('three', 'Three phase (up to 15 kW)', 'Tiga fasa (hingga 15 kW)')].join(''),
    O_SURIA_OPTIONS: [opt('yes', 'Yes, running 1 Jun to 31 Dec 2026', 'Ya, beroperasi 1 Jun hingga 31 Dis 2026', true), opt('no', 'No', 'Tidak')].join(''),
    O_SAVE: m(r.saving), O_SUB: L ? `Pulang modal kira-kira ${nf(r.payback, 1)} tahun` : `Payback about ${nf(r.payback, 1)} years`, O_ENERGY: energy, O_MONEY: money, O_GRID: grid, O_SELFTABLE: self,
    O_WITHOUT: m(r.without), O_WITH: m(r.with), O_YEARLY: m(r.yearly), O_PAYBACK: nf(r.payback, 1), O_LEVEL: level,
    O_VERIFIED: longDate(F.verified, lang), O_VERIFIED_ISO: F.verified
  };
}
const LESEN_EXAMPLE = { cls: 'D', period: 3, ldlCount: 1, school: 0, years: 5, card: 'no', freeCard: 'no', idp: 'no' };
function lesenMap(lang) {
  const { L, m, tr, opt } = b3(lang), C = lesenCore, F = C.FACTS, r = C.calculate(LESEN_EXAMPLE);
  const lines = [tr(L ? 'Lesen L (LDL), 3 bulan' : "Learner's licence (LDL), 3 months", m(r.ldl)), tr(L ? 'Lesen P (PDL), 2 tahun' : 'Probationary licence (PDL), 2 years', m(r.pdl)), tr(L ? 'Jumlah yuran JPJ' : 'Total JPJ fees', m(r.jpj)), tr(L ? 'Jumlah untuk dapat lesen' : 'Total to get the licence', m(r.newTotal), 'total')].join('\n');
  const renew = [tr(L ? `Lesen CDL, 5 tahun (${m(30)} setahun)` : `CDL, 5 years (${m(30)} a year)`, m(r.renewal)), tr(L ? 'Jumlah pembaharuan' : 'Total renewal', m(r.renewTotal), 'total')].join('\n');
  const names = { B2: L ? 'B2 (motosikal hingga 250cc)' : 'B2 (motorcycle up to 250cc)', B: L ? 'B (motosikal melebihi 250cc)' : 'B (motorcycle above 250cc)', D: L ? 'D (kereta manual)' : 'D (manual car)', DA: L ? 'DA (kereta automatik)' : 'DA (automatic car)' };
  const fees = Object.entries(F.classes).map(([k, c]) => `<tr><th scope="row">${names[k]}</th><td>${m(c.ldl[3])}${c.ldl[3] !== c.ldl[6] ? ` / ${m(c.ldl[6])}` : ''}</td><td>${m(c.pdl)}</td><td>${m(c.cdl)}</td><td>${c.age}</td></tr>`).join('\n');
  const yrs = Object.entries(F.classes).filter(([k]) => k !== 'B').map(([k, c]) => `<tr><th scope="row">${names[k]}</th>${[1, 2, 3, 5, 10].map(y => `<td>${m(c.cdl * y)}</td>`).join('')}</tr>`).join('\n');
  return {
    N_CLS_OPTIONS: Object.keys(F.classes).map(k => opt(k, names[k], names[k], k === 'D')).join(''),
    N_PERIOD_OPTIONS: [opt('3', '3 months', '3 bulan', true), opt('6', '6 months', '6 bulan')].join(''),
    N_YN: [opt('no', 'No', 'Tidak', true), opt('yes', 'Yes', 'Ya')].join(''),
    N_FREE_OPTIONS: [opt('no', 'No', 'Tidak', true), opt('yes', 'Yes: 60+, OKU (JKM) or Class A/A1', 'Ya: 60+, OKU (JKM) atau Kelas A/A1')].join(''),
    N_LDLCOUNT: 1, N_YEARS: 5, N_NEW: m(r.newTotal), N_SUB: L ? `Yuran JPJ ${m(r.jpj)} · umur minimum 17` : `JPJ fees ${m(r.jpj)} · minimum age 17`, N_LINES: lines, N_RENEW: renew, N_FEES: fees, N_YEARS_TABLE: yrs,
    N_VERIFIED: longDate(F.verified, lang), N_VERIFIED_ISO: F.verified
  };
}
// ---- batch 10: faraid, currency converter, calories, shoe size (moved from the blog; see bloggerFrom).
const FARAID_EXAMPLE = { estate: 300000, sepencarian: 0, funeral: 5000, debts: 10000, wasiat: 0, residue: 'baitulmal', wife: 1, son: 1, daughter: 2, mother: 1 };
const fracTxt = x => `${x.n}/${x.d}`;
function faraidMap(lang) {
  const { L, m, opt } = b3(lang), R = faraidCore, LB = R.LABELS[L ? 'ms' : 'en'], r = R.calculate(FARAID_EXAMPLE), mo = r.money;
  const tr = (a, b, c) => `<tr${c ? ` class="${c}"` : ''}><th scope="row">${a}</th><td>${b}</td></tr>`;
  const persons = n => n > 1 ? (L ? ` (${n} orang)` : ` (${n} persons)`) : '';
  const field = (k, max, val, id, hidden) => `<div class="field"${id ? ` id="${id}"` : ''}${hidden ? ' hidden' : ''}><label for="${k}">${LB[k]}</label><div class="input"><input id="${k}" name="${k}" type="number" inputmode="numeric" min="0" max="${max}" step="1" value="${val || 0}"></div></div>`;
  const max = Object.fromEntries(R.HEIRS);
  const rowOf = keys => keys.map(k => k === 'husband' ? field(k, 1, 0, 'fHusband', true) : k === 'wife' ? field(k, 4, FARAID_EXAMPLE.wife, 'fWife') : field(k, max[k], FARAID_EXAMPLE[k])).reduce((a, x, i) => (i % 2 ? a[a.length - 1].push(x) : a.push([x]), a), []).map(p => `<div class="field-row">${p.join('')}</div>`).join('\n');
  const groups = [[L ? 'Pasangan dan anak' : 'Spouse and children', ['husband', 'wife', 'son', 'daughter', 'grandson', 'granddaughter']],
    [L ? 'Ibu bapa, datuk dan nenek' : 'Parents and grandparents', ['father', 'mother', 'grandfather', 'grandmotherF', 'grandmotherM']],
    [L ? 'Adik-beradik' : 'Brothers and sisters', ['brother', 'sister', 'brotherF', 'sisterF', 'brotherM', 'sisterM']]];
  const heirsHtml = groups.map(([t, ks]) => `<h3>${t}</h3>\n${rowOf(ks)}`).join('\n') +
    `\n<details class="more"><summary>${L ? 'Saudara lain (anak saudara, bapa saudara, sepupu)' : 'Other relatives (nephews, uncles, cousins)'}</summary>\n${rowOf(['nephew', 'nephewF', 'uncle', 'uncleF', 'cousin', 'cousinF'])}\n</details>`;
  const moneyRows = [tr(L ? 'Jumlah harta' : 'Total estate', m(mo.gross)), tr(L ? 'Kos pengurusan jenazah' : 'Funeral costs', '− ' + m(mo.funeral)), tr(L ? 'Hutang' : 'Debts', '− ' + m(mo.debts)), tr(L ? 'Harta bersih untuk faraid' : 'Net estate for faraid', m(mo.net), 'total')].join('\n');
  const shareRows = r.list.filter(x => x.count).map(x => tr(`${LB[x.key]}${persons(x.count)} · ${fracTxt(x.share)}`, `${m(x.each)}${x.count > 1 ? (L ? ' seorang' : ' each') : ''} · ${x.saham}/${r.D}`)).join('\n');
  // Fixed shares reference table.
  const ref = (L ? [
    ['Suami', '1/2 jika tiada anak atau cucu; 1/4 jika ada'], ['Isteri (seorang atau lebih, dikongsi)', '1/4 jika tiada anak atau cucu; 1/8 jika ada'], ['Bapa', '1/6 jika ada anak lelaki; 1/6 + baki jika hanya anak perempuan; baki jika tiada anak'],
    ['Ibu', '1/6 jika ada anak atau 2+ adik-beradik; 1/3 jika tidak; 1/3 baki dalam Umariyyatain'], ['Anak perempuan', '1/2 seorang; 2/3 dua atau lebih; asabah 2:1 bersama anak lelaki'], ['Anak lelaki', 'Asabah: baki, 2 bahagian bagi setiap 1 bahagian anak perempuan'],
    ['Cucu perempuan (dari anak lelaki)', '1/2 atau 2/3 jika tiada anak; 1/6 bersama seorang anak perempuan'], ['Nenek', '1/6, dikongsi jika dua'], ['Saudara seibu', '1/6 seorang; 1/3 dua atau lebih, lelaki sama dengan perempuan'],
    ['Saudara perempuan seibu sebapa', '1/2 atau 2/3; asabah bersama saudara lelaki atau anak perempuan']
  ] : [
    ['Husband', '1/2 with no child or grandchild; 1/4 with one'], ['Wife (one or more, shared)', '1/4 with no child or grandchild; 1/8 with one'], ['Father', '1/6 with a son; 1/6 + residue with only daughters; residue with no child'],
    ['Mother', '1/6 with a child or 2+ siblings; 1/3 otherwise; 1/3 of the remainder in the Umariyyatain'], ['Daughter', '1/2 alone; 2/3 for two or more; residuary 2:1 with a son'], ['Son', 'Residuary: the remainder, 2 parts for each 1 part of a daughter'],
    ["Son's daughter", '1/2 or 2/3 with no child; 1/6 with one daughter'], ['Grandmother', '1/6, shared if two'], ['Uterine siblings', '1/6 for one; 1/3 for two or more, male equal to female'],
    ['Full sister', '1/2 or 2/3; residuary with a brother or with daughters']
  ]).map(([a, b]) => `<tr><th scope="row">${a}</th><td>${b}</td></tr>`).join('\n');
  // Worked cases from the engine.
  const cases = [
    [{ husband: 1, mother: 1, daughter: 2, son: 1 }], [{ wife: 1, father: 1, mother: 1, daughter: 2 }], [{ husband: 1, sister: 2 }], [{ husband: 1, father: 1, mother: 1 }], [{ wife: 1 }], [{ husband: 1, mother: 1, brotherM: 2, brother: 2 }]
  ].map(([c]) => { const x = R.solve(c); const who = x.list.map(y => `${LB[y.key]}${y.count > 1 ? ' ×' + y.count : ''} ${fracTxt(y.share)}`).join(', ') + (x.baitulmal.n ? `, Baitulmal ${fracTxt(x.baitulmal)}` : ''); return `<tr><th scope="row">${x.list.map(y => LB[y.key] + (y.count > 1 ? ' ×' + y.count : '')).join(' + ')}</th><td>${who}</td><td>${x.asal}${x.awl ? ' → ' + x.awlBase : ''}</td></tr>`; }).join('\n');
  const son = r.list.find(x => x.key === 'son'), dau = r.list.find(x => x.key === 'daughter'), wife = r.list.find(x => x.key === 'wife'), mother = r.list.find(x => x.key === 'mother');
  return {
    F_HEIRS: heirsHtml, F_ESTATE: FARAID_EXAMPLE.estate, F_FUNERAL: FARAID_EXAMPLE.funeral, F_DEBTS: FARAID_EXAMPLE.debts,
    F_DECEASED_OPTIONS: [opt('male', 'Man (leaves a wife or wives)', 'Lelaki (meninggalkan isteri)', true), opt('female', 'Woman (leaves a husband)', 'Perempuan (meninggalkan suami)')].join(''),
    F_RESIDUE_OPTIONS: [opt('baitulmal', 'Baitulmal (Malaysian practice)', 'Baitulmal (amalan Malaysia)', true), opt('radd', 'Radd to heirs (Perlis fatwa)', 'Radd kepada waris (fatwa Perlis)')].join(''),
    F_NET: m(mo.net), F_SUB: L ? `Asal masalah ${r.asal} · ${r.D} bahagian` : `Base ${r.asal} · ${r.D} parts`, F_MONEY: moneyRows, F_SHARES: shareRows, F_REF: ref, F_CASES: cases,
    F_EX_SON: m(son.each), F_EX_DAU: m(dau.each), F_EX_WIFE: m(wife.each), F_EX_MOTHER: m(mother.each), F_EX_NET: m(mo.net),
    F_VERIFIED: longDate(R.FACTS.verified, lang), F_VERIFIED_ISO: R.FACTS.verified
  };
}
// Currency: BNM noon rates from tools-src/fx-data.json (daily workflow); until the first run, USD from the gold snapshot.
const fxData = fs.existsSync(path.join(root, 'tools-src/fx-data.json')) ? JSON.parse(read('fx-data.json'))
  : { date: (goldData.fx && goldData.fx.date) || goldDate, source: 'BNM', session: '1200', rates: goldData.fx ? { USD: { unit: 1, mid: goldData.fx.usdMyr } } : {} };
const FX_NAMES = { MYR: ['Malaysian ringgit', 'Ringgit Malaysia'], USD: ['US dollar', 'Dolar AS'], EUR: ['Euro', 'Euro'], GBP: ['British pound', 'Paun British'], SGD: ['Singapore dollar', 'Dolar Singapura'],
  JPY: ['Japanese yen', 'Yen Jepun'], CNY: ['Chinese yuan', 'Yuan China'], THB: ['Thai baht', 'Baht Thailand'], IDR: ['Indonesian rupiah', 'Rupiah Indonesia'], AUD: ['Australian dollar', 'Dolar Australia'],
  SAR: ['Saudi riyal', 'Riyal Saudi'], AED: ['UAE dirham', 'Dirham UAE'], HKD: ['Hong Kong dollar', 'Dolar Hong Kong'], KRW: ['South Korean won', 'Won Korea Selatan'], TWD: ['Taiwan dollar', 'Dolar Taiwan'],
  INR: ['Indian rupee', 'Rupee India'], PHP: ['Philippine peso', 'Peso Filipina'], BND: ['Brunei dollar', 'Dolar Brunei'], CAD: ['Canadian dollar', 'Dolar Kanada'], CHF: ['Swiss franc', 'Franc Swiss'],
  NZD: ['New Zealand dollar', 'Dolar New Zealand'], VND: ['Vietnamese dong', 'Dong Vietnam'], KHR: ['Cambodian riel', 'Riel Kemboja'], MMK: ['Myanmar kyat', 'Kyat Myanmar'], PKR: ['Pakistani rupee', 'Rupee Pakistan'],
  NPR: ['Nepalese rupee', 'Rupee Nepal'], EGP: ['Egyptian pound', 'Paun Mesir'], BDT: ['Bangladeshi taka', 'Taka Bangladesh'] };
const FX_ORDER = ['USD', 'SGD', 'EUR', 'GBP', 'JPY', 'CNY', 'THB', 'IDR', 'AUD', 'SAR', 'AED', 'HKD', 'KRW', 'TWD', 'INR', 'PHP', 'BND', 'CAD', 'CHF', 'NZD', 'VND', 'KHR', 'MMK', 'PKR', 'NPR', 'EGP', 'BDT'];
const attr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
function fxMap(lang) {
  const { L, m, nf, tr } = b3(lang), X = fxCore, s = fxData, codes = FX_ORDER.filter(c => s.rates[c]);
  const name = c => (FX_NAMES[c] || [c, c])[L];
  const dec = n => { const a = Math.abs(n); return a >= 100 ? 2 : a >= 1 ? 4 : 6; };
  const opts = sel => ['MYR'].concat(codes).map(c => `<option value="${c}"${c === sel ? ' selected' : ''}>${c} · ${name(c)}</option>`).join('');
  const r = X.convert(s, 100, 'USD', 'MYR');
  const lines = r ? [tr(L ? 'Kadar tengah BNM' : 'BNM middle rate', `1 USD = ${nf(r.rate, dec(r.rate))} MYR`), tr(L ? 'Songsang' : 'Inverse', `1 MYR = ${nf(r.inverse, dec(r.inverse))} USD`)].join('\n') : '';
  const table = codes.map(c => { const per = X.perUnit(s, c), u = s.rates[c].unit; return `<tr><th scope="row">${c} <small>${name(c)}</small></th><td>${m(per * u)}${u > 1 ? ` / ${u}` : ''}</td><td>${nf(100 / per, dec(100 / per))}</td></tr>`; }).join('\n');
  const names = Object.fromEntries(['MYR'].concat(codes).map(c => [c, name(c)]));
  const usd = X.perUnit(s, 'USD'), sgd = X.perUnit(s, 'SGD');
  return {
    X_RATES: attr(JSON.stringify({ date: s.date, source: s.source, rates: s.rates })), X_NAMES: attr(JSON.stringify(names)), X_FROM_OPTIONS: opts('USD'), X_TO_OPTIONS: opts('MYR'), X_AMOUNT: 100,
    X_RESULT: r ? `${nf(r.result, 2)} MYR` : '–', X_SUB: name('MYR'), X_LINES: lines, X_TABLE: table, X_COUNT: codes.length,
    X_DATE: longDate(s.date || goldDate, lang), X_DATE_ISO: s.date || goldDate, X_SOURCE: s.source === 'ECB' ? (L ? 'Bank Pusat Eropah (sandaran)' : 'European Central Bank (backup)') : 'Bank Negara Malaysia',
    X_USD: usd ? nf(usd, 4) : '–', X_USD100: usd ? m(usd * 100) : '–', X_SGD: sgd ? nf(sgd, 4) : '–', X_RM100_USD: usd ? nf(100 / usd, 2) : '–',
    X_VERIFIED: longDate(X.FACTS.verified, lang), X_VERIFIED_ISO: X.FACTS.verified
  };
}
const KALORI_EXAMPLE = { sex: 'male', age: 30, weight: 70, height: 170, activity: 'moderate', goal: 'maintain' };
function kaloriMap(lang) {
  const { L, nf, tr, opt } = b3(lang), K = kaloriCore, F = K.FACTS, r = K.calculate(KALORI_EXAMPLE), kc = n => nf(n, 0) + ' kcal';
  const act = L ? { sedentary: 'Tidak aktif', light: 'Aktif ringan', moderate: 'Aktif sederhana', active: 'Sangat aktif', extra: 'Amat aktif' } : { sedentary: 'Sedentary', light: 'Lightly active', moderate: 'Moderately active', active: 'Very active', extra: 'Extra active' };
  const actHelp = L ? { sedentary: 'kerja pejabat, tiada senaman', light: 'senaman 1 hingga 3 hari seminggu', moderate: 'senaman 3 hingga 5 hari', active: 'senaman 6 hingga 7 hari', extra: 'kerja fizikal dan latihan' } : { sedentary: 'desk job, no exercise', light: 'exercise 1 to 3 days a week', moderate: 'exercise 3 to 5 days', active: 'exercise 6 to 7 days', extra: 'physical job plus training' };
  const lines = [tr(L ? 'Kadar metabolisme asas (BMR)' : 'Basal metabolic rate (BMR)', kc(r.bmr)), tr(L ? 'Keperluan harian (kekal berat)' : 'Daily need (keep weight)', kc(r.tdee)), tr(L ? 'Sasaran kalori sehari' : 'Daily calorie target', kc(r.target), 'total'),
    tr(L ? 'Karbohidrat (55%)' : 'Carbohydrate (55%)', nf(r.carb, 0) + ' g'), tr(L ? 'Protein (15%)' : 'Protein (15%)', nf(r.protein, 0) + ' g'), tr(L ? 'Lemak (30%)' : 'Fat (30%)', nf(r.fat, 0) + ' g'),
    tr('BMI', `${nf(r.bmi, 1)} (${L ? 'berlebihan berat badan' : 'overweight'})`), tr(L ? 'Berat sihat untuk tinggi anda' : 'Healthy weight for your height', `${nf(r.healthy[0], 1)}–${nf(r.healthy[1], 1)} kg`)].join('\n');
  const levels = r.levels.map(x => tr(`${act[x.key]} (× ${x.factor})`, kc(x.kcal), x.key === 'moderate' ? 'total' : '')).join('\n');
  const rni = F.rni.pal.map((p, i) => `<tr><th scope="row">${p.toFixed(1)}</th><td>${kc(F.rni.male[i])}</td><td>${kc(F.rni.female[i])}</td></tr>`).join('\n');
  const goals = [['lose05', L ? 'Turun 0.5 kg seminggu' : 'Lose 0.5 kg a week'], ['lose025', L ? 'Turun 0.25 kg seminggu' : 'Lose 0.25 kg a week'], ['maintain', L ? 'Kekal berat' : 'Keep weight'], ['gain025', L ? 'Naik 0.25 kg seminggu' : 'Gain 0.25 kg a week']]
    .map(([g, n]) => { const x = K.calculate({ ...KALORI_EXAMPLE, goal: g }), y = K.calculate({ sex: 'female', age: 30, weight: 60, height: 158, activity: 'moderate', goal: g }); return `<tr><th scope="row">${n}</th><td>${kc(x.target)}</td><td>${kc(y.target)}</td></tr>`; }).join('\n');
  const f = K.calculate({ sex: 'female', age: 30, weight: 60, height: 158, activity: 'sedentary' });
  return {
    K_SEX_OPTIONS: [opt('male', 'Male', 'Lelaki', true), opt('female', 'Female', 'Perempuan')].join(''),
    K_ACT_OPTIONS: F.activity.map(([k]) => opt(k, `${act[k]}: ${actHelp[k]}`, `${act[k]}: ${actHelp[k]}`, k === 'moderate')).join(''),
    K_GOAL_OPTIONS: [['maintain', 'Keep my weight', 'Kekalkan berat'], ['lose025', 'Lose 0.25 kg a week', 'Turun 0.25 kg seminggu'], ['lose05', 'Lose 0.5 kg a week', 'Turun 0.5 kg seminggu'], ['lose1', 'Lose 1 kg a week', 'Turun 1 kg seminggu'], ['gain025', 'Gain 0.25 kg a week', 'Naik 0.25 kg seminggu'], ['gain05', 'Gain 0.5 kg a week', 'Naik 0.5 kg seminggu']]
      .map(([v, e, b]) => opt(v, e, b, v === 'maintain')).join(''),
    K_AGE: KALORI_EXAMPLE.age, K_WEIGHT: KALORI_EXAMPLE.weight, K_HEIGHT: KALORI_EXAMPLE.height,
    K_TARGET: kc(r.target), K_SUB: L ? `BMR ${kc(r.bmr)} · keperluan harian ${kc(r.tdee)}` : `BMR ${kc(r.bmr)} · daily need ${kc(r.tdee)}`, K_LINES: lines, K_LEVELS: levels, K_RNI: rni, K_GOALS: goals,
    K_EX_BMR: kc(r.bmr), K_EX_TDEE: kc(r.tdee), K_EX_LOSE: kc(K.calculate({ ...KALORI_EXAMPLE, goal: 'lose05' }).target), K_F_BMR: kc(f.bmr), K_F_TDEE: kc(f.tdee),
    K_VERIFIED: longDate(F.verified, lang), K_VERIFIED_ISO: F.verified
  };
}
function kasutMap(lang) {
  const { L, nf, tr, opt } = b3(lang), S = kasutCore, F = S.FACTS, r = S.fromFoot(26);
  const lines = [tr('UK', nf(r.uk, 1)), tr('EU', nf(r.eu, 1)), tr(L ? 'US lelaki' : 'US men', nf(r.usM, 1)), tr(L ? 'US wanita' : 'US women', nf(r.usW, 1)), tr('Mondopoint (mm)', String(r.mm)), tr(L ? 'Panjang kaki' : 'Foot length', '26 cm', 'total')].join('\n');
  const adult = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(uk => { const foot = S.toFoot('uk', uk), x = S.fromFoot(foot); return `<tr><th scope="row">${uk}</th><td>${nf(x.eu, 1)}</td><td>${uk + F.usMen}</td><td>${uk + F.usWomen}</td><td>${nf(foot, 1)}</td></tr>`; }).join('\n');
  const kids = [0, 2, 4, 6, 8, 10, 11, 12, 13].map(uk => { const foot = S.toFoot('ukKids', uk), x = S.fromFoot(foot); return `<tr><th scope="row">${uk}</th><td>${nf(x.eu, 1)}</td><td>${nf(foot, 1)}</td></tr>`; }).join('\n');
  const brands = [['Nike', '9', '42.5'], ['ASICS', '9', '42.5'], ['Vans', '9', '42'], ['adidas', '8.5', '42'], ['New Balance', '8.5', '42']].map(([b, us, eu]) => `<tr><th scope="row">${b}</th><td>${us}</td><td>${eu}</td></tr>`).join('\n');
  return {
    S_MODE_OPTIONS: [opt('foot', 'From my foot length', 'Dari panjang kaki', true), opt('size', 'From a size I know', 'Dari saiz yang saya tahu')].join(''),
    S_SYSTEM_OPTIONS: [opt('uk', 'UK', 'UK', true), opt('eu', 'EU', 'EU'), opt('usM', 'US men', 'US lelaki'), opt('usW', 'US women', 'US wanita'), opt('ukKids', 'UK kids', 'UK kanak-kanak'), opt('mm', 'Mondopoint (mm)', 'Mondopoint (mm)')].join(''),
    S_FOOT: 26, S_SIZE: 8, S_UK: 'UK ' + nf(r.uk, 1), S_SUB: L ? `EU ${nf(r.eu, 1)} · US lelaki ${nf(r.usM, 1)} · kaki 26 cm` : `EU ${nf(r.eu, 1)} · US men ${nf(r.usM, 1)} · foot 26 cm`,
    S_LINES: lines, S_ADULT: adult, S_KIDS: kids, S_BRANDS: brands,
    S_VERIFIED: longDate(F.verified, lang), S_VERIFIED_ISO: F.verified
  };
}
// Gzip size rendered into the page, so the tools' stats lines never grow (and reflow) after load.
const kbText = n => n < 1024 ? n + ' B' : (n / 1024).toFixed(n < 10240 ? 2 : 1) + ' KB';
const gzText = t => ' · ' + kbText(zlib.gzipSync(Buffer.from(t)).length) + ' gzipped';
// ---- batch 11: traffic summons, EV vs petrol, assessment tax.
function samanMap(lang) {
  const { L, m, tr } = b3(lang), S = samanCore, F = S.FACTS, r = S.calculate({ today: goldDate }), d = iso => longDate(iso, lang);
  const tier = { early: L ? 'Bayar hingga {d} (50%)' : 'Pay by {d} (50% off)', mid: L ? 'Bayar hingga {d} (kira-kira ⅓ kurang)' : 'Pay by {d} (about ⅓ off)', full: L ? 'Bayar hingga {d} (penuh)' : 'Pay by {d} (full)' };
  const lines = [tr(L ? 'Kompaun pada notis' : 'Compound on the notice', m(r.amount))]
    .concat(r.tiers.map(t => tr(tier[t.key].replace('{d}', d(t.last)), m(t.pay), t.key === r.tier ? 'total' : '')))
    .concat([tr((L ? 'Mulai ' : 'From ') + d(r.courtFrom), L ? 'Mahkamah atau senarai hitam' : 'Court or blacklist'), tr(L ? 'Jimat jika bayar sekarang' : 'You save by paying now', m(r.save))]).join('\n');
  const table = [300, 250, 200, 150, 100].map(a => { const x = S.calculate({ amount: a, notice: '2026-10-01', pay: '2026-10-01' }); return `<tr><th scope="row">${m(a)}</th>${x.tiers.map(t => `<td>${m(t.pay)}</td>`).join('')}<td>${L ? 'Tiada kompaun' : 'No compound'}</td></tr>`; }).join('\n');
  const ex = S.calculate({ amount: 300, notice: '2026-10-01', pay: '2026-10-01' });
  return {
    M_AMOUNT: r.amount, M_NOTICE: r.notice, M_PAY: m(r.payable), M_SUB: L ? `Hari ke-1 · kadar ini hingga ${d(r.lastDay)} (${r.daysLeft} hari lagi)` : `Day 1 · this rate until ${d(r.lastDay)} (${r.daysLeft} days left)`,
    M_LINES: lines, M_TABLE: table, M_EX_1: d(ex.tiers[0].last), M_EX_2: d(ex.tiers[1].last), M_EX_3: d(ex.tiers[2].last), M_EX_COURT: d(ex.courtFrom),
    M_VERIFIED: longDate(F.verified, lang), M_VERIFIED_ISO: F.verified
  };
}
const TAKSIRAN_EXAMPLE = { council: 'dbkl', type: 'residential', mode: 'rent', rent: 1500 };
const TAKSIRAN_COUNCILS = { dbkl: ['DBKL (Kuala Lumpur)', 'DBKL (Kuala Lumpur)'], mbpj: ['MBPJ (Petaling Jaya)', 'MBPJ (Petaling Jaya)'], mbpp: ['MBPP (Penang Island)', 'MBPP (Pulau Pinang)'], custom: ['Other council (enter its rate)', 'Majlis lain (masukkan kadar)'] };
const TAKSIRAN_TYPES = {
  en: { residential: 'Residential', commercial: 'Commercial', landed: 'Landed house', strata: 'Apartment or condominium', lowcost: 'Low-cost high-rise', serviced: 'Serviced apartment', landedLow: 'Low-cost or low-medium-cost landed', flatLow: 'Low-cost or middle-class flat', industrial: 'Industrial' },
  ms: { residential: 'Kediaman', commercial: 'Komersial', landed: 'Rumah bertanah', strata: 'Pangsapuri atau kondominium', lowcost: 'Rumah pangsa kos rendah', serviced: 'Pangsapuri servis', landedLow: 'Rumah bertanah kos rendah atau sederhana rendah', flatLow: 'Rumah pangsa kos rendah atau kelas pertengahan', industrial: 'Perindustrian' }
};
function taksiranMap(lang) {
  const { L, m, nf, tr, opt } = b3(lang), X = taksiranCore, F = X.FACTS, N = TAKSIRAN_TYPES[lang], r = X.calculate(TAKSIRAN_EXAMPLE);
  const cname = k => TAKSIRAN_COUNCILS[k][L];
  const lines = [tr(L ? 'Nilai tahunan' : 'Annual value', m(r.annual)), tr(L ? 'Kadar' : 'Rate', nf(r.rate) + '%'), tr(L ? 'Cukai setahun' : 'Tax a year', m(r.tax), 'total'),
    tr(L ? `Bayaran penggal 1 (hingga ${F.dueMs[0]})` : `Half 1 (due ${F.due[0]})`, m(r.half)), tr(L ? `Bayaran penggal 2 (hingga ${F.dueMs[1]})` : `Half 2 (due ${F.due[1]})`, m(r.half)), tr(L ? 'Purata sebulan' : 'Average a month', m(r.monthly))].join('\n');
  const compare = X.compare(1500).map(x => `<tr data-rate="${x.rate}"><th scope="row">${cname(x.council)}</th><td>${N[x.type]} (${nf(x.rate)}%)</td><td>${m(x.tax)}</td></tr>`).join('\n');
  const grid = [800, 1200, 1500, 2000, 3000, 5000].map(rent => `<tr><th scope="row">${m(rent)}</th><td>${m(rent * 12)}</td>${[['dbkl', 'residential'], ['mbpj', 'landed'], ['mbpj', 'strata'], ['mbpp', 'landed'], ['mbpp', 'strata']].map(([c, t]) => `<td>${m(X.calculate({ council: c, type: t, rent }).tax)}</td>`).join('')}</tr>`).join('\n');
  const ex = X.calculate({ council: 'mbpj', type: 'landed', mode: 'annual', annual: 9900 }), cap = X.calculate({ council: 'mbpj', type: 'landed', rent: 1500, oldTax: 400 });
  return {
    T_TYPES: attr(JSON.stringify(N)), T_COUNCIL_OPTIONS: Object.keys(TAKSIRAN_COUNCILS).map(k => `<option value="${k}"${k === 'dbkl' ? ' selected' : ''}>${cname(k)}</option>`).join(''),
    T_TYPE_OPTIONS: Object.entries(X.COUNCILS.dbkl.types).map(([k, v]) => `<option value="${k}"${k === 'residential' ? ' selected' : ''}>${N[k]} (${nf(v)}%)</option>`).join(''),
    T_MODE_OPTIONS: [opt('rent', 'Monthly rent (estimate)', 'Sewa sebulan (anggaran)', true), opt('annual', 'Annual value on my bill', 'Nilai tahunan pada bil saya')].join(''),
    T_RENT: 1500, T_ANNUAL: 18000, T_RATE: 5, T_TAX: m(r.pay), T_SUB: L ? `${m(r.half)} setiap penggal · ${nf(r.rate)}% daripada nilai tahunan` : `${m(r.half)} each half · ${nf(r.rate)}% of annual value`,
    T_LINES: lines, T_COMPARE: compare, T_COMPARE_RENT: m(1500), T_GRID: grid,
    T_EX: m(ex.tax), T_EX_HALF: m(ex.half), T_CAP_NEW: m(cap.tax), T_CAP_PAY: m(cap.capped),
    T_VERIFIED: longDate(F.verified, lang), T_VERIFIED_ISO: F.verified
  };
}
const EV_EXAMPLE = { km: 1500, evUse: 14.2, homeShare: 80, houseKwh: 400, publicRate: 1.4, petrolUse: 4.9, budi: 'yes' };
const EV_SPECS = { qve: [52.5, 370], emas7: [49.5, 345], atto3: [49.92, 345], dolphin: [44.92, 340], modely: [57.5, 466] };
function evMap(lang) {
  const { L, m, nf, tr, opt } = b3(lang), E = evCore, market = fuelLatest.prices.ron95, level = tnbCore.protectionOn(goldDate);
  const calc = x => E.calculate({ ...EV_EXAMPLE, protection: level, marketPrice: market, ...x }, tnbCore);
  const r = calc({}), n = calc({ budi: 'no' }), allHome = calc({ homeShare: 100 }), allPub = calc({ homeShare: 0 });
  const lines = [tr(L ? 'Tenaga sebulan' : 'Energy a month', nf(r.evKwh, 0) + ' kWh'), tr(L ? `Cas di rumah (${nf(r.homeKwh, 0)} kWj, kenaikan bil TNB)` : `Home charging (${nf(r.homeKwh, 0)} kWh, rise in TNB bill)`, m(r.home)),
    tr(L ? `Cas awam (${nf(r.publicKwh, 0)} kWj)` : `Public charging (${nf(r.publicKwh, 0)} kWh)`, m(r.pub)), tr(L ? 'Kos EV sebulan' : 'EV cost a month', m(r.ev), 'total'),
    tr(L ? `Petrol (${nf(r.litres, 1)} liter)` : `Petrol (${nf(r.litres, 1)} litres)`, m(r.petrol), 'total'), tr(L ? 'Beza setahun' : 'Difference a year', m(Math.abs(r.yearly))),
    tr(L ? 'Kos setiap 100 km (EV / petrol)' : 'Cost per 100 km (EV / petrol)', `${m(r.evPerKm)} / ${m(r.petrolPerKm)}`)].join('\n');
  const grid = [500, 1000, 1500, 2000, 3000].map(km => { const h = calc({ km, homeShare: 100 }), p = calc({ km, homeShare: 0 }), b = calc({ km }), u = calc({ km, budi: 'no' });
    return `<tr><th scope="row">${nf(km, 0)} km</th><td>${m(h.ev)}</td><td>${m(p.ev)}</td><td>${m(b.petrol)}</td><td>${m(u.petrol)}</td></tr>`; }).join('\n');
  const models = E.EVS.map(([k, name, use]) => `<tr><th scope="row">${name}</th><td>${nf(EV_SPECS[k][0])} kWh</td><td>${EV_SPECS[k][1]} km</td><td>${nf(use, 1)}</td><td>${m(calc({ evUse: use, homeShare: 100 }).ev)}</td></tr>`).join('\n')
    + '\n' + E.CARS.map(([k, name, use]) => `<tr><th scope="row">${name}</th><td>–</td><td>–</td><td>${nf(use, 2)} L</td><td>${m(calc({ petrolUse: use }).petrol)}</td></tr>`).join('\n');
  const evOpts = E.EVS.map(([k, name, use]) => `<option value="${use}"${use === 14.2 ? ' selected' : ''}>${name} (${nf(use, 1)} kWh/100 km)</option>`).join('') + `<option value="custom">${L ? 'Lain-lain (masukkan sendiri)' : 'Other (enter your own)'}</option>`;
  const carOpts = E.CARS.map(([k, name, use]) => `<option value="${use}"${use === 4.9 ? ' selected' : ''}>${name} (${nf(use, 2)} L/100 km)</option>`).join('') + `<option value="custom">${L ? 'Lain-lain (masukkan sendiri)' : 'Other (enter your own)'}</option>`;
  const s = v => (v >= 0 ? '' : '−') + m(Math.abs(v));
  return {
    E_MARKET: market, E_PROTECTION: level, E_EV_OPTIONS: evOpts, E_CAR_OPTIONS: carOpts,
    E_BUDI_OPTIONS: [opt('yes', 'Yes, BUDI95 RM1.99 (up to 300 litres)', 'Ya, BUDI95 RM1.99 (hingga 300 liter)', true), opt('no', `No, unsubsidised RM${market.toFixed(2)}`, `Tidak, tanpa subsidi RM${market.toFixed(2)}`)].join(''),
    E_HEAD: r.save >= 0 ? (L ? 'EV lebih murah' : 'EV is cheaper') : (L ? 'EV lebih mahal' : 'EV costs more'), E_SAVE: m(Math.abs(r.save)),
    E_SUB: L ? `EV ${m(r.ev)} · petrol ${m(r.petrol)} sebulan` : `EV ${m(r.ev)} · petrol ${m(r.petrol)} a month`, E_LINES: lines, E_GRID: grid, E_MODELS: models,
    E_RON95: m(market), E_FUEL_DATE: longDate(fuelLatest.date, lang), E_FUEL_ISO: fuelLatest.date, E_LEVEL: nf(level, 0),
    E_EX_EV: m(r.ev), E_EX_HOME: m(r.home), E_EX_SEN: nf(r.homeSen, 0), E_EX_PUB: m(r.pub), E_EX_PETROL: m(r.petrol), E_EX_SAVE: s(r.save), E_EX_PETROL_U: m(n.petrol), E_EX_SAVE_U: s(n.save), E_EX_YEAR_U: m(n.yearly),
    E_EX_ALLHOME: m(allHome.ev), E_EX_PAYBACK: nf(calc({ budi: 'no', evExtra: 20000 }).payback || 0, 1), E_EX_ALLPUB: m(allPub.ev),
    E_VERIFIED: longDate(E.FACTS.verified, lang), E_VERIFIED_ISO: E.FACTS.verified
  };
}
// ---- batch 12: AI and image tools (moved from the blog; see bloggerFrom).
const CARTOON_NAMES = {
  classic: ['Classic cartoon', 'Kartun klasik', 'Flat colours, clean black outlines', 'Warna rata, garis hitam kemas'],
  comic: ['Comic book', 'Komik', 'Bold colours, thick ink lines', 'Warna terang, garis dakwat tebal'],
  anime: ['Soft anime', 'Anime lembut', 'Smooth skin tones, thin lines, more shades', 'Rona kulit lembut, garis halus, lebih banyak warna'],
  pop: ['Pop art', 'Pop art', 'Four bright colour levels, poster look', 'Empat tahap warna terang, gaya poster'],
  paint: ['Painting', 'Lukisan cat', 'Brush-like smoothing, no outlines', 'Licin seperti berus, tanpa garis'],
  sketch: ['Pencil sketch', 'Lakaran pensel', 'Grey pencil drawing', 'Lukisan pensel kelabu']
};
function cartoonMap(lang) {
  const L = lang === 'ms' ? 1 : 0, C = cartoonCore, S = C.STYLES.classic;
  const chips = Object.keys(C.STYLES).map(k => `<label><input type="radio" name="style" value="${k}"${k === 'classic' ? ' checked' : ''}> ${CARTOON_NAMES[k][L]}</label>`).join('');
  const table = Object.entries(C.STYLES).map(([k, s]) => `<tr><th scope="row">${CARTOON_NAMES[k][L]}</th><td>${CARTOON_NAMES[k][2 + L]}</td><td>${s.mode === 'sketch' ? '–' : s.mode === 'posterize' ? (L ? 'Poster' : 'Posterize') : s.colors}</td><td>${s.line ? (L ? 'Ya' : 'Yes') : (L ? 'Tiada' : 'None')}</td></tr>`).join('\n');
  return { C_CHIPS: chips, C_COLORS: S.colors, C_SMOOTH: S.smooth, C_LINE: S.line, C_LINE_PCT: Math.round(S.line * 100) + '%', C_THICK: S.thick, C_TABLE: table, C_MAX: C.FACTS.maxSide,
    C_VERIFIED: longDate(C.FACTS.verified, lang), C_VERIFIED_ISO: C.FACTS.verified };
}
const AI_LABELS = {
  modes: { standard: ['Standard', 'Biasa'], fluent: ['Fluent', 'Lancar'], formal: ['Formal', 'Formal'], simple: ['Simple', 'Mudah'], shorten: ['Shorten', 'Ringkaskan'], expand: ['Expand', 'Kembangkan'], academic: ['Academic', 'Akademik'], creative: ['Creative', 'Kreatif'], grammar: ['Grammar and word check', 'Semak tatabahasa dan kata'] },
  langs: { same: ['Same as the text', 'Sama seperti teks'], ms: ['Bahasa Melayu', 'Bahasa Melayu'], en: ['English', 'English'] },
  sizes: { short: ['Short (2–3 sentences)', 'Pendek (2–3 ayat)'], medium: ['Medium (5–7 sentences)', 'Sederhana (5–7 ayat)'], long: ['Detailed (10–12 sentences)', 'Terperinci (10–12 ayat)'] },
  formats: { bullets: ['Bullet points', 'Poin'], paragraph: ['Paragraph', 'Perenggan'], keypoints: ['Key points + takeaway', 'Poin utama + kesimpulan'] },
  tones: { casual: ['Casual', 'Santai'], funny: ['Funny', 'Kelakar'], inspiring: ['Inspiring', 'Inspirasi'], sales: ['Selling / promo', 'Jualan / promosi'], grateful: ['Grateful (Alhamdulillah)', 'Syukur (Alhamdulillah)'], romantic: ['Romantic', 'Romantik'], professional: ['Professional', 'Profesional'] },
  capLangs: { ms: ['Bahasa Melayu', 'Bahasa Melayu'], en: ['English', 'English'], manglish: ['Manglish', 'Manglish'], rojak: ['Rojak (BM + English)', 'Rojak (BM + English)'] },
  occasions: { none: ['Any post', 'Sebarang hantaran'], raya: ['Hari Raya Aidilfitri', 'Hari Raya Aidilfitri'], haji: ['Hari Raya Aidiladha', 'Hari Raya Aidiladha'], ramadan: ['Ramadan', 'Ramadan'], merdeka: ['Merdeka / Malaysia Day', 'Merdeka / Hari Malaysia'], cny: ['Chinese New Year', 'Tahun Baru Cina'], deepavali: ['Deepavali', 'Deepavali'], newyear: ['New Year', 'Tahun Baru'], birthday: ['Birthday', 'Hari jadi'], wedding: ['Wedding / engagement', 'Perkahwinan / pertunangan'], graduation: ['Graduation', 'Konvokesyen'], travel: ['Travel', 'Percutian'], food: ['Food', 'Makanan'] },
  styles: { none: ['No style', 'Tiada gaya'], photo: ['Photo', 'Foto'], cinematic: ['Cinematic', 'Sinematik'], anime: ['Anime', 'Anime'], toon3d: ['3D cartoon', 'Kartun 3D'], watercolour: ['Watercolour', 'Cat air'], oil: ['Oil painting', 'Cat minyak'], batik: ['Batik', 'Batik'], pixel: ['Pixel art', 'Seni piksel'], lineart: ['Line art', 'Lukisan garis'], poster: ['Flat poster', 'Poster rata'] }
};
const aiOpts = (map, L, sel) => Object.entries(map).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${v[L]}</option>`).join('');
const aiChips = (map, name, L, sel) => Object.entries(map).map(([k, v]) => `<label><input type="radio" name="${name}" value="${k}"${k === sel ? ' checked' : ''}> ${v[L]}</label>`).join('');
const diffHtml = parts => parts.map(p => p.t === 'same' ? esc(p.w) : `<${p.t === 'add' ? 'ins' : 'del'}>${esc(p.w)}</${p.t === 'add' ? 'ins' : 'del'}>`).join('');
const PARA_EX = {
  ms: ['Saya ingin memaklumkan bahawa mesyuarat yang dijadualkan pada hari esok terpaksa dibatalkan disebabkan oleh beberapa masalah teknikal yang tidak dapat dielakkan.', 'Dimaklumkan bahawa mesyuarat yang dijadualkan esok terpaksa dibatalkan kerana beberapa masalah teknikal yang tidak dapat dielakkan.'],
  en: ['I am writing to let you know that the meeting that was scheduled for tomorrow has had to be cancelled because of some technical problems that could not be avoided.', "Please note that tomorrow's scheduled meeting has been cancelled due to unavoidable technical problems."]
};
function paraMap(lang) {
  const L = lang === 'ms' ? 1 : 0, A = aiCore, [inp, out] = PARA_EX[lang], d = A.diff(inp, out);
  return { A_COUNT: new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY').format(inp.length), A_API: esc(site.visionApi || ''), A_MODES: aiChips(AI_LABELS.modes, 'mode', L, 'standard'), A_LANGS: aiOpts(AI_LABELS.langs, L, 'same'), A_IN: esc(inp), A_OUT: diffHtml(d), A_SOURCE: attr(inp),
    A_STATS: L ? `${A.count(inp).words} → ${A.count(out).words} patah perkataan · ${Math.round((1 - A.similarity(inp, out)) * 100)}% perkataan diubah` : `${A.count(inp).words} → ${A.count(out).words} words · ${Math.round((1 - A.similarity(inp, out)) * 100)}% of words changed`,
    A_LIMIT: new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY').format(A.FACTS.limits.paraphrase), A_VERIFIED: longDate(A.FACTS.verified, lang), A_VERIFIED_ISO: A.FACTS.verified };
}
const SUM_EX = {
  ms: ['- Membaca 20 minit sehari membina kosa kata dan tumpuan.', '- Pilih bahan yang anda minati supaya tabiat itu kekal.', '- Catat satu idea penting selepas setiap bacaan.', 'Kesimpulan: tabiat kecil yang konsisten lebih berkesan daripada membaca banyak sekali-sekala.'],
  en: ['- Reading for 20 minutes a day builds vocabulary and focus.', '- Choose material you enjoy so the habit lasts.', '- Note one key idea after each reading session.', 'Takeaway: a small, steady habit beats reading a lot once in a while.']
};
function sumMap(lang) {
  const L = lang === 'ms' ? 1 : 0, A = aiCore, ex = SUM_EX[lang];
  const html = '<ul>' + ex.filter(l => l.startsWith('- ')).map(l => `<li>${esc(l.slice(2))}</li>`).join('') + '</ul><p>' + esc(ex[ex.length - 1]) + '</p>';
  return { A_API: esc(site.visionApi || ''), A_SIZES: aiOpts(AI_LABELS.sizes, L, 'medium'), A_FORMATS: aiOpts(AI_LABELS.formats, L, 'keypoints'), A_LANGS: aiOpts(AI_LABELS.langs, L, 'same'), A_OUT: html,
    A_LIMIT: new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY').format(A.FACTS.limits.summarize), A_VERIFIED: longDate(A.FACTS.verified, lang), A_VERIFIED_ISO: A.FACTS.verified };
}
const CAP_EX = {
  ms: ['Pagi tak lengkap tanpa nasi lemak 🍛☀️', 'Sambal pedas, telur goreng, kopi panas. Hari ini dah menang 😋', 'Rezeki pagi: sepinggan nasi lemak dan hati yang tenang. Alhamdulillah 🤲', 'Siapa team sambal lebih? Angkat tangan 🙋‍♂️🌶️', 'Diet start esok. Hari ini nasi lemak dulu 😅'],
  en: ['No morning is complete without nasi lemak 🍛☀️', 'Spicy sambal, fried egg, hot kopi. Today is already a win 😋', 'Simple breakfast, happy heart 💛', 'Team extra sambal, where you at? 🙋‍♂️🌶️', 'Diet starts tomorrow. Today is for nasi lemak 😅']
};
const CAP_TAGS = '#nasilemak #sarapan #makanmalaysia #kualalumpur #malaysianfood';
const CAP_IDEAS = {
  ms: ['Nasi lemak untuk sarapan di gerai tepi jalan', 'Kedai kek baru buka, promosi 20% minggu ini', 'Balik kampung beraya bersama keluarga', 'Hari konvokesyen, tamat ijazah sarjana muda', 'Percutian di Langkawi bersama kawan'],
  en: ['Nasi lemak breakfast at a roadside stall', 'New cake shop opening, 20% off this week', 'Going back to my hometown for Raya with family', 'Graduation day, finished my degree', 'Holiday in Langkawi with friends']
};
function capMap(lang) {
  const L = lang === 'ms' ? 1 : 0, A = aiCore, lim = A.LIMITS.instagram, nf = new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY');
  const caps = CAP_EX[lang].map(c => `<li><p>${esc(c)}</p><div class="cap-meta"><small>${Array.from(c).length} / ${nf.format(lim.max)} ${L ? 'aksara' : 'characters'}</small><button type="button" class="btn ghost sm">${L ? 'Salin' : 'Copy'}</button><button type="button" class="btn ghost sm">${L ? 'Salin dengan hashtag' : 'Copy with hashtags'}</button></div></li>`).join('\n');
  const limits = Object.entries(A.LIMITS).map(([k, v]) => `<tr><th scope="row">${A.PLATFORMS[k]}</th><td>${nf.format(v.max)}</td><td>${k === 'instagram' || k === 'tiktok' ? v.tags : '–'}</td><td>${v.more ? (L ? 'kira-kira ' : 'about ') + v.more : '–'}</td></tr>`).join('\n');
  return { A_API: esc(site.visionApi || ''), A_PLATFORMS: Object.entries(A.PLATFORMS).map(([k, v]) => `<option value="${k}"${k === 'instagram' ? ' selected' : ''}>${v}</option>`).join(''),
    A_TONES: aiOpts(AI_LABELS.tones, L, 'casual'), A_CAPLANGS: aiOpts(AI_LABELS.capLangs, L, L ? 'ms' : 'en'), A_OCCASIONS: aiOpts(AI_LABELS.occasions, L, 'none'),
    A_EMOJI: [`<option value="yes" selected>${L ? 'Ya' : 'Yes'}</option>`, `<option value="no">${L ? 'Tidak' : 'No'}</option>`].join(''), A_TAGS: lim.tags, A_TAGMAX: lim.tags,
    A_IDEAS: CAP_IDEAS[lang].map(i => `<button type="button" data-idea="${attr(i)}">${esc(i)}</button>`).join(''), A_CAPS: caps, A_TAGLINE: CAP_TAGS, A_LIMITS: limits,
    A_LIMIT: nf.format(A.FACTS.limits.caption), A_VERIFIED: longDate(A.FACTS.verified, lang), A_VERIFIED_ISO: A.FACTS.verified };
}
const GEN_IDEAS = {
  ms: ['Kucing oren makan durian di jeti Pulau Pinang', 'Rumah kampung kayu waktu subuh berkabus', 'Angkasawan makan nasi lemak di bulan', 'Pasar malam Kuala Lumpur bawah lampu neon', 'Burung kenyalang terbang atas hutan Borneo'],
  en: ['An orange cat eating durian on a Penang jetty', 'A wooden kampung house at a misty dawn', 'An astronaut eating nasi lemak on the moon', 'A Kuala Lumpur night market under neon lights', 'A hornbill flying over the Borneo rainforest']
};
function genMap(lang) {
  const L = lang === 'ms' ? 1 : 0, A = aiCore;
  const styles = Object.entries(A.IMAGE_STYLES).filter(([k]) => k !== 'none').map(([k, v]) => `<tr><th scope="row">${AI_LABELS.styles[k][L]}</th><td>${esc(v)}</td></tr>`).join('\n');
  return { A_API: esc(site.visionApi || ''), A_STYLES: aiChips(AI_LABELS.styles, 'style', L, 'none'), A_IDEAS: GEN_IDEAS[lang].map(i => `<button type="button" data-idea="${attr(i)}">${esc(i)}</button>`).join(''),
    A_STYLE_TABLE: styles, A_EX_PROMPT: esc(A.imagePrompt(GEN_IDEAS.en[0], 'watercolour')), A_LIMIT: new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY').format(A.FACTS.limits.image),
    A_VERIFIED: longDate(A.FACTS.verified, lang), A_VERIFIED_ISO: A.FACTS.verified };
}

// ---- EXIF editor and remover: the sample photo is read, edited and stripped by the same core the pages run.
const EXIF_SAMPLE = '/assets/img/exif-sample-bukit-besi.jpg';
const exifSample = new Uint8Array(fs.readFileSync(path.join(root, EXIF_SAMPLE)));
const exifInfo = exifCore.read(exifSample);
const exifStrip = exifCore.strip(exifSample);
const exifName = path.basename(EXIF_SAMPLE);
const exifShared = () => {
  const n = x => x.toLocaleString('en-US');
  return {
    EX_SAMPLE: EXIF_SAMPLE, EX_NAME: esc(exifName), EX_W: exifInfo.width, EX_H: exifInfo.height,
    EX_BEFORE: n(exifStrip.before), EX_AFTER: n(exifStrip.after), EX_PCT: Math.round((1 - exifStrip.after / exifStrip.before) * 1000) / 10,
    EX_FOUND: exifInfo.privacy.length, EX_LAT: exifInfo.exif.gps.lat, EX_LON: exifInfo.exif.gps.lon, EX_VERIFIED: longDate(exifCore.FACTS.verified, 'en'),
    EX_INFO: exifCore.views.fileInfo(exifName, exifInfo), EX_PRIVACY: exifCore.views.privacyList(exifInfo)
  };
};
function exifEditorMap() {
  const v = exifInfo.exif.values, r = exifInfo.rights, d = v.DateTimeOriginal.replace(/^(\d{4}):(\d{2}):(\d{2}) /, '$1-$2-$3T');
  return {
    ...exifShared(), EX_TABLES: exifCore.views.metaTables(exifInfo),
    EX_CREATOR: esc(r.creator), EX_CREDIT: esc(r.credit), EX_COPYRIGHT: esc(r.copyright), EX_WEB: esc(r.webStatement), EX_LICENSOR: esc(r.licensorUrl),
    EX_TITLE: esc(r.title), EX_DESC: esc(r.description), EX_KEYWORDS: esc(r.keywords),
    EX_MAKE: esc(v.Make), EX_MODEL: esc(v.Model), EX_LENS: esc(v.LensModel), EX_SOFTWARE: esc(v.Software), EX_DATE: d,
    EX_ALT: exifInfo.exif.gps.alt,
    EX_RIGHTS_ROWS: exifCore.RIGHTS.map(f => `        <tr><th scope="row">${esc(f.label)}</th><td><code>${esc(f.xmp)}</code></td><td>${esc(f.iim || '–')}</td><td>${esc(f.exif || '–')}</td><td>${esc(f.google)}</td></tr>`).join('\n')
  };
}
const EXIF_KINDS = [
  ['exif', 'JPEG APP1, PNG eXIf, WebP EXIF', 'Camera, settings, dates, GPS, serial numbers, thumbnail', 'Removed (orientation can be kept)'],
  ['xmp', 'JPEG APP1, PNG iTXt, WebP XMP', 'Creator, rights, keywords, editing software and history', 'Removed (credit can be kept)'],
  ['iptc', 'JPEG APP13', 'Photographer, caption, copyright, location names', 'Removed'],
  ['icc', 'JPEG APP2, PNG iCCP, WebP ICCP', 'How colours should be displayed', 'Kept (optional)'],
  ['comment', 'JPEG COM', 'Free text written by the camera or software', 'Removed'],
  ['text', 'PNG tEXt, zTXt, iTXt', 'Software name, AI generator prompts and settings', 'Removed'],
  ['c2pa', 'JPEG APP11, PNG caBX', 'Signed history of how the image was made or edited', 'Removed'],
  ['mpf', 'JPEG APP2', 'Index of extra images stored after the main one', 'Removed with them'],
  ['trailer', 'After the end-of-image marker', 'Motion-photo video, HDR gain map, hidden files', 'Removed (optional)']
];
function exifRemoverMap() {
  return {
    ...exifShared(), EX_RESULT: exifCore.views.resultCard(exifName, exifStrip, ''),
    EX_KIND_ROWS: EXIF_KINDS.map(k => `        <tr><th scope="row">${esc(exifCore.KIND_LABEL[k[0]])}</th><td>${esc(k[1])}</td><td>${esc(k[2])}</td><td>${esc(k[3])}</td></tr>`).join('\n')
  };
}

// ---- Robots.txt generator: the Blogger preset, its audit and the tester results are rendered by the page's core.
const ROBOTS_EXAMPLES = [
  ['User-agent: *\nAllow: /p\nDisallow: /', '/page'],
  ['User-agent: *\nAllow: /folder\nDisallow: /folder', '/folder/page'],
  ['User-agent: *\nAllow: /page\nDisallow: /*.htm', '/page.htm'],
  ['User-agent: *\nDisallow: /fish*', '/Fish.asp'],
  ['User-agent: *\nDisallow: /*.php$', '/index.php?lang=en'],
  ['User-agent: googlebot\nDisallow: /private/', '/private/a.jpg (Googlebot-Image)'],
  ['User-agent: *\nDisallow: /', '/robots.txt']
];
function robotsMap() {
  const R = robotsCore, V = R.views, cfg = R.fromPreset('blogger'), text = R.generate(cfg), url = '/search/label/SEO';
  const opt = (v, l, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(l)}</option>`;
  return {
    RB_BOTS: R.BOTS.length, RB_VERIFIED: longDate(R.FACTS.verified, 'en'),
    RB_PRESETS: Object.entries(R.PRESETS).map(([k, p]) => opt(k, p.label, k === 'blogger')).join(''),
    RB_SITE: esc(cfg.site), RB_ROWS: V.rowsHtml(R.rowsFromCfg(cfg)), RB_BOT_CHECKS: V.botChecks({}), RB_MAPS: esc(cfg.sitemaps.join('\n')),
    RB_OUT: esc(text), RB_AUDIT: V.auditHtml(R.audit(text, cfg.site).notes), RB_TEST_URL: url,
    RB_UAS: R.TESTERS.map(t => opt(t, t, t === 'Googlebot')).join(''),
    RB_VERDICT: V.verdictHtml(R.test(text, url, 'Googlebot'), 'Googlebot'), RB_ALL: V.allHtml(text, url),
    RB_BOT_ROWS: R.BOTS.map(b => `        <tr><th scope="row"><code>${esc(b.token)}</code></th><td>${esc(b.owner)}</td><td>${esc(R.PURPOSE[b.purpose])}</td><td>${esc(b.note)}</td></tr>`).join('\n'),
    RB_EXAMPLES: ROBOTS_EXAMPLES.map(([rules, u]) => {
      const m = /^(\S+)(?: \((.+)\))?$/.exec(u), r = R.test(rules, m[1], m[2] || 'Googlebot');
      return `        <tr><td><code>${esc(rules).replace(/\n/g, '<br>')}</code></td><td><code>${esc(u)}</code></td><td>${r.allowed ? 'Allowed' : 'Blocked'}${r.rule ? ` (${esc(V.ruleText(r.rule))})` : r.reason === 'robots' ? ' (always)' : ''}</td></tr>`;
    }).join('\n')
  };
}

// ---- Online notepad: the welcome note, its preview and counts come from the page's core.
const NOTE_WELCOME = `# Welcome to your notepad

Start typing anywhere: every change is **saved in this browser** and nothing is uploaded.

## Try it
- [x] Write a note
- [ ] Switch to *Preview* to see Markdown
- [ ] Press Ctrl+S to take a snapshot
- [ ] Copy a **Share link** and open it on your phone

> Tip: select all and type to make this your own note.
`;
const NOTE_MD = ['# Heading', '**bold** and *italic*', '~~deleted~~', '- [ ] task\n- [x] done', '1. first\n2. second', '> quote', '`code`', '[link](https://tool.thebukitbesi.com/)'];
// ---- Word counter: the sample text's counts, readability, density and limits are filled in at build time.
const WC_SAMPLE = `A word counter does more than count words. It tells you how long your text takes to read, whether your sentences are easy to follow and which words you repeat too often.

Paste an article, an essay or a social media post here. Every number updates as you type, and nothing leaves your browser.

Short sentences help readers. Long sentences that pile clause upon clause, with commas everywhere and no clear point, make readers tired and make your readability score fall.`;
function wordsMap() {
  const W = wordsCore, V = W.views, a = W.analyze(WC_SAMPLE);
  const bands = [['90 to 100', 'Very easy'], ['80 to 89', 'Easy'], ['70 to 79', 'Fairly easy'], ['60 to 69', 'Plain English'], ['50 to 59', 'Fairly difficult'], ['30 to 49', 'Difficult'], ['0 to 29', 'Very difficult']];
  return {
    WC_TEXT: esc(WC_SAMPLE), WC_WORDS: a.words, WC_CHARS: a.chars.toLocaleString('en-US'), WC_READ: a.reading, WC_VERIFIED: W.FACTS.verified,
    WC_STATS: V.statsHtml(a), WC_READABILITY: V.readHtml(a), WC_DENSITY: V.densityRows(W.density(WC_SAMPLE, 1)), WC_LIMITS: V.limitRows(W.limits(WC_SAMPLE, a)),
    WC_BANDS: bands.map(b => `        <tr><td>${b[0]}</td><td>${b[1]}</td></tr>`).join('\n'),
    WC_LIMIT_ROWS: W.LIMITS.map(l => `        <tr><th scope="row">${esc(l.label)}</th><td>${l.max.toLocaleString('en-US')}${l.note ? ' (' + esc(l.note) + ')' : ''}</td></tr>`).join('\n')
  };
}

function notepadMap() {
  const N = notesCore, s = N.stats(NOTE_WELCOME), n = { text: NOTE_WELCOME };
  return {
    NP_TEXT: esc(NOTE_WELCOME), NP_PREVIEW: N.html(NOTE_WELCOME, { shift: 2 }), NP_TITLE: esc(N.title(n)), NP_WORDS: s.words, NP_READ: s.reading,
    NP_STATS: N.summary(s),
    NP_LIST: `<li><button type="button" class="np-note on" aria-current="true"><strong>${esc(N.title(n))}</strong><small>Welcome · ${s.words} words</small></button></li>`,
    NP_TRANSFORMS: Object.entries(N.TRANSFORMS).map(([k, t]) => `<button type="button" class="btn ghost sm" data-tf="${k}">${esc(t.label)}</button>`).join(''),
    NP_MD_ROWS: NOTE_MD.map(m => `        <tr><td><code>${esc(m).replace(/\n/g, '<br>')}</code></td><td class="np-md">${N.html(m, { shift: 2 })}</td></tr>`).join('\n')
  };
}

// ---- Image converter: format chips, icon sizes and the format table come from the page's core.
function imgconvMap() {
  const I = imgCore;
  return {
    IC_WEBP_JPEG: I.FACTS.webpVsJpeg, IC_WEBP_PNG: I.FACTS.webpVsPng,
    IC_FORMATS: Object.entries(I.FORMATS).map(([k, f]) => `<label class="ic-chip"><input type="radio" name="fmt" value="${k}"${k === 'webp' ? ' checked' : ''}> ${f.label}</label>`).join(''),
    IC_ICO: I.ICO_SIZES.map(s => `<label class="check"><input type="checkbox" name="ico" value="${s}"${s <= 48 ? ' checked' : ''}> <span>${s}</span></label>`).join(''),
    IC_FORMAT_ROWS: Object.values(I.FORMATS).map(f => `        <tr><th scope="row">${f.label}</th><td>${f.lossy ? 'Lossy' : 'Lossless'}${f.label === 'WebP' || f.label === 'AVIF' ? ' or lossless' : ''}</td><td>${f.alpha ? 'Yes' : 'No'}</td><td>${esc(f.use)}</td><td>${esc(f.support)}</td></tr>`).join('\n')
  };
}

// ---- Photo editor: sliders, filters, ratios, canvases and the reference tables come from the page's core.
const BLENDS = [['source-over', 'Normal'], ['multiply', 'Multiply'], ['screen', 'Screen'], ['overlay', 'Overlay'], ['darken', 'Darken'], ['lighten', 'Lighten'],
  ['color-dodge', 'Colour dodge'], ['color-burn', 'Colour burn'], ['hard-light', 'Hard light'], ['soft-light', 'Soft light'], ['difference', 'Difference'],
  ['exclusion', 'Exclusion'], ['hue', 'Hue'], ['saturation', 'Saturation'], ['color', 'Colour'], ['luminosity', 'Luminosity']];
const gcd = (a, b) => b ? gcd(b, a % b) : a;
function photoMap() {
  const P = photoCore, filters = Object.entries(P.FILTERS);
  return {
    PE_ADJ: P.ADJUST.length, PE_FILTERS: filters.length - 1,
    PE_SLIDERS: P.ADJUST.map(a => `<label class="pe-slider"><span>${esc(a.label)} <output data-adj-out="${a.key}">0</output></span><input type="range" data-adj="${a.key}" min="${a.min}" max="${a.max}" value="0"></label>`).join(''),
    PE_FILTER_BTNS: filters.map(([k, f]) => `<button type="button" class="pe-filter" data-filter="${k}" aria-pressed="${k === 'none'}"><canvas width="72" height="72" aria-hidden="true"></canvas><span>${esc(f.label)}</span></button>`).join(''),
    PE_RATIOS: P.CROPS.map(([l, v], i) => `<label class="ic-chip"><input type="radio" name="ratio" value="${v}"${i === 0 ? ' checked' : ''}> ${esc(l)}</label>`).join(''),
    PE_CANVASES: P.CANVASES.map(([l, w, h]) => `<option value="${w}x${h}">${esc(l)} (${w} × ${h})</option>`).join(''),
    PE_BLENDS: BLENDS.map(([v, l]) => `<option value="${v}">${l}</option>`).join(''),
    PE_ADJ_ROWS: P.ADJUST.map(a => `        <tr><th scope="row">${esc(a.label)}</th><td>${a.min} to ${a.max}</td><td>${esc(a.desc)}</td></tr>`).join('\n') + '\n' +
      `        <tr><th scope="row">Filters</th><td>${filters.length - 1} presets</td><td>${esc(filters.slice(1).map(([, f]) => f.label).join(', '))}</td></tr>`,
    PE_SIZE_ROWS: P.CANVASES.map(([l, w, h]) => { const g = gcd(w, h); return `        <tr><th scope="row">${esc(l)}</th><td>${w} × ${h} px</td><td>${w / g}:${h / g}</td></tr>`; }).join('\n')
  };
}

// ---- WhatsApp sticker maker: the rules table is WhatsApp's README figures held in the page's core.
function stickerMap() {
  const T = stickerCore.SPEC, kb = n => n / 1024 + ' KB';
  const rows = [
    ['Sticker size', `Exactly ${T.size} × ${T.size} px`, 'Always exported at that size'],
    ['Format', 'WebP (iOS also accepts PNG for still stickers)', 'WebP; PNG only where the browser cannot write WebP'],
    ['File size', `At most ${kb(T.maxBytes)} per still sticker (500 KB animated)`, 'Highest WebP quality that fits under 100 KB'],
    ['Stickers per pack', `${T.minPack} to ${T.maxPack}`, 'Checked before the pack downloads'],
    ['Tray icon', `${T.tray} × ${T.tray} px, at most ${kb(T.trayMaxBytes)}`, 'Made from the sticker you choose, as PNG'],
    ['Emoji tags', `Up to ${T.maxEmoji} per sticker`, 'Extra emoji are ignored'],
    ['Accessibility text', `Up to ${T.maxAlt} characters for still stickers`, 'Saved in contents.json'],
    ['Mixing', 'A pack is all still or all animated', 'Still stickers only']
  ];
  return {
    ST_SIZE: T.size, ST_MIN: T.minPack, ST_MAX: T.maxPack, ST_TRAY: T.tray, ST_ALT: T.maxAlt, ST_VERIFIED: longDate(T.verified, 'en'),
    ST_RULE_ROWS: rows.map(r => `        <tr><th scope="row">${r[0]}</th><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('\n')
  };
}

// ---- PDF converter: tabs, page sizes and the reference tables come from the page's core.
function pdfMap() {
  const P = pdfCore, mm = pt => Math.round(pt / 72 * 25.4);
  const sizes = Object.entries(P.PAGES).filter(([k]) => k !== 'fit');
  return {
    PDF_MODES: P.MODES.length,
    PDF_TABS: P.MODES.map((m, i) => `<button type="button" role="tab" data-tab="${m.key}" id="pdTab-${m.key}" aria-controls="pdPanel-${m.key}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${esc(m.label)}</button>`).join(''),
    PDF_SIZES: Object.entries(P.PAGES).map(([k, p]) => `<option value="${k}"${k === 'a4' ? ' selected' : ''}>${esc(p.label)}</option>`).join(''),
    PDF_SIZE_ROWS: sizes.map(([, p]) => `        <tr><th scope="row">${esc(p.label)}</th><td>${mm(p.w)} × ${mm(p.h)}</td><td>${p.w} × ${p.h}</td></tr>`).join('\n'),
    PDF_MODE_ROWS: P.MODES.map(m => `        <tr><th scope="row">${esc(m.label)}</th><td>${esc(m.result)}</td><td>${esc(m.text)}</td><td>${esc(m.note)}</td></tr>`).join('\n')
  };
}
const RENDERERS = { schema: schemaMap, privacy: privacyMap, wa: waMap, contrast: contrastMap, solat: solatMap, solatState: solatStateMap, case: caseMap, json: jsonMap, words: wordsMap, pdf: pdfMap, sticker: stickerMap, photo: photoMap, imgconv: imgconvMap, notepad: notepadMap, robots: robotsMap, exifEditor: exifEditorMap, exifRemover: exifRemoverMap, purge: purgeMap, html: htmlMap, js: jsMap, cgpaPercent: cgpaPercentMap, cgpa: cgpaMap, tax: taxMap, epf: epfMap, loan: loanMap, car: carMap, asb: asbMap, prorate: prorateMap, ot: otMap, land: landMap, personal: personalMap, rpgt: rpgtMap, bmi: bmiMap, zakat: zakatMap, gold: goldMap, goldprice: goldPriceMap, prompt: promptMap, img2prompt: imgMap, fuel: fuelMap, ncd: ncdMap, iddah: iddahMap, hijri: hijriMap, tnb: tnbMap, ptptn: ptptnMap, fidyah: fidyahMap, debt: debtMap, refi: refiMap, rentbuy: rentbuyMap, fd: fdMap, employer: employerMap, margin: marginMap, roas: roasMap, freelance: freelanceMap, workdays: workdaysMap, retire: retireMap, sspn: sspnMap, unittrust: unittrustMap, edu: eduMap, water: waterMap, qibla: qiblaMap, nestegg: nesteggMap, leave: leaveMap, termination: terminationMap, roadtax: roadtaxMap, sst: sstMap, bursa: bursaMap, tenancy: tenancyMap, eis: eisMap, maskahwin: maskahwinMap, haji: hajiMap, str: strMap, sspa: sspaMap, rahnu: rahnuMap, umur: umurMap, bersalin: bersalinMap, solar: solarMap, lesen: lesenMap, faraid: faraidMap, fx: fxMap, kalori: kaloriMap, kasut: kasutMap, saman: samanMap, taksiran: taksiranMap, ev: evMap, cartoon: cartoonMap, paraphrase: paraMap, summary: sumMap, caption: capMap, imagegen: genMap, track: trackMap, near: nearMap, css: cssMap };

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

// Page hero images carry Google's image licence properties; the same rights are embedded in the file as IPTC.
const heroImage = img => ({
  '@type': 'ImageObject', '@id': abs(img.url) + '#image', url: abs(img.url), contentUrl: abs(img.url), width: img.width, height: img.height,
  caption: img.caption, description: img.alt, creditText: site.brand, creator: { '@id': site.mainSite + '/#org' },
  copyrightNotice: `© ${img.year} ${site.brand}`, license: site.origin + '/terms/#images', acquireLicensePage: site.origin + '/contact/'
});

// ---- content pages
const outputs = new Map([['/', homeHtml]]);
for (const p of pages) {
  // The gold price pages change every day with the price.
  if (p.render === 'goldprice' && goldDate) p.dateModified = goldDate;
  // The mas kahwin pages quote today's gold value.
  if (['maskahwin', 'rahnu', 'umur', 'bersalin', 'solar', 'saman'].includes(p.render) || (p.render === 'fx' && fxData.date > p.dateModified) && goldDate > p.dateModified) p.dateModified = goldDate;
  if (p.render === 'ev' && [fuelLatest.date, goldDate].sort().pop() > p.dateModified) p.dateModified = [fuelLatest.date, goldDate].sort().pop();
  // The fuel pages change every week with the prices.
  if (p.render === 'fuel' && fuelLatest.date > p.dateModified) p.dateModified = fuelLatest.date;
  // The Hijri pages show "today" and the next Islamic dates; they move with the daily gold rebuild (deterministic per commit).
  // The prayer time pages show today's times.
  if (p.render === 'solat' || p.render === 'solatState') p.dateModified = solatDay;
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
  const graph = [organization, person, website, {
    '@type': p.schemaType || 'WebPage', '@id': pageId, url, name: p.title, description: p.description,
    inLanguage: p.lang === 'ms' ? 'ms-MY' : 'en-MY', isPartOf: { '@id': site.origin + '/#website' },
    breadcrumb: { '@id': url + '#breadcrumb' }, datePublished: p.datePublished, dateModified: p.dateModified,
    author: { '@id': p.policy ? site.mainSite + '/#org' : person['@id'] }, publisher: { '@id': site.mainSite + '/#org' },
    primaryImageOfPage: p.image ? heroImage(p.image) : { '@type': 'ImageObject', url: abs(site.ogImage.url), width: site.ogImage.width, height: site.ogImage.height },
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
    publisher: { '@id': site.mainSite + '/#org' }, dateModified: p.dateModified
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
    CAT: p.cat, HEADER_CTA: switcher.replace(/class="btn ghost sm"/g, 'class="btn ghost sm lang"'),
    // Tool pages get a share bar after the article and a "Share result" button beside the calculator's actions.
    MAIN: p.app ? byline(p).replace('{{AD_BOTTOM}}', shareBlock(p, url) + '\n{{AD_BOTTOM}}').replace('<div class="tool-actions">', '<div class="tool-actions">' + shareResult(p.lang)) : p.body,
    FAQ_HTML: faqHtml(p.faq || []), DATE_ISO: p.dateModified, DATE_TEXT: longDate(p.dateModified, p.lang),
    PAGE_SCRIPTS: (p.scripts || []).map(s => `<script src="${s}" defer></script>`).join('\n') + (p.app ? '\n' + shareScript : ''),
    ...(p.robots ? { ROBOTS: p.robots } : {}),
    ...(p.image ? { OG_IMAGE: abs(p.image.url), OG_W: p.image.width, OG_H: p.image.height, OG_ALT: esc(p.image.alt) } : {}),
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
  'site.js': ['assets/js/site-ui.js'],
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
  'solat.js': ['assets/js/hijri-core.js', 'assets/js/solat-core.js', 'assets/js/solat-ui.js'],
  'retirement-savings.js': ['assets/js/nestegg-core.js', 'assets/js/nestegg-ui.js'],
  'annual-leave.js': ['assets/js/leave-core.js', 'assets/js/leave-ui.js'],
  'termination-benefits.js': ['assets/js/termination-core.js', 'assets/js/termination-ui.js'],
  'road-tax.js': ['assets/js/roadtax-core.js', 'assets/js/roadtax-ui.js'],
  'sst.js': ['assets/js/sst-core.js', 'assets/js/sst-ui.js'],
  'bursa-fees.js': ['assets/js/bursa-core.js', 'assets/js/bursa-ui.js'],
  'tenancy-stamp-duty.js': ['assets/js/tenancy-core.js', 'assets/js/tenancy-ui.js'],
  'eis.js': ['assets/js/eis-core.js', 'assets/js/eis-ui.js'],
  'maskahwin.js': ['assets/js/maskahwin-core.js', 'assets/js/maskahwin-ui.js'],
  'haji.js': ['assets/js/haji-core.js', 'assets/js/haji-ui.js'],
  'str.js': ['assets/js/str-core.js', 'assets/js/str-ui.js'],
  'sspa.js': ['assets/js/sspa-core.js', 'assets/js/sspa-ui.js'],
  'rahnu.js': ['assets/js/rahnu-core.js', 'assets/js/rahnu-ui.js'],
  'umur.js': ['assets/js/hijri-core.js', 'assets/js/umur-core.js', 'assets/js/umur-ui.js'],
  'bersalin.js': ['assets/js/bersalin-core.js', 'assets/js/bersalin-ui.js'],
  'solar.js': ['assets/js/tnb-core.js', 'assets/js/solar-core.js', 'assets/js/solar-ui.js'],
  'lesen.js': ['assets/js/lesen-core.js', 'assets/js/lesen-ui.js'],
  'faraid.js': ['assets/js/faraid-core.js', 'assets/js/faraid-ui.js'],
  'fx.js': ['assets/js/fx-core.js', 'assets/js/fx-ui.js'],
  'kalori.js': ['assets/js/kalori-core.js', 'assets/js/kalori-ui.js'],
  'kasut.js': ['assets/js/kasut-core.js', 'assets/js/kasut-ui.js'],
  'saman.js': ['assets/js/saman-core.js', 'assets/js/saman-ui.js'],
  'taksiran.js': ['assets/js/taksiran-core.js', 'assets/js/taksiran-ui.js'],
  'ev.js': ['assets/js/tnb-core.js', 'assets/js/ev-core.js', 'assets/js/ev-ui.js'],
  'cartoon.js': ['assets/js/cartoon-core.js', 'assets/js/cartoon-ui.js'],
  'paraphrase.js': ['assets/js/ai-core.js', 'assets/js/ai-kit.js', 'assets/js/paraphrase-ui.js'],
  'summary.js': ['assets/js/ai-core.js', 'assets/js/ai-kit.js', 'assets/js/summary-ui.js'],
  'caption.js': ['assets/js/ai-core.js', 'assets/js/ai-kit.js', 'assets/js/caption-ui.js'],
  'imagegen.js': ['assets/js/ai-core.js', 'assets/js/ai-kit.js', 'assets/js/imagegen-ui.js'],
  'tracking.js': ['assets/js/tracking-core.js', 'assets/js/tracking-ui.js'],
  'near.js': ['assets/js/tracking-core.js', 'assets/js/near-ui.js'],
  'css-minifier.js': ['assets/js/css-core.js', 'assets/js/css-ui.js'],
  'js-minifier.js': ['assets/js/js-core.js', 'assets/js/js-ui.js'],
  'js-minifier-worker.js': ['assets/js/js-core.js', 'assets/js/js-worker.js'],
  'html-beautifier.js': ['assets/js/html-core.js', 'assets/js/html-ui.js'],
  'html-beautifier-worker.js': ['assets/js/html-core.js', 'assets/js/html-worker.js'],
  'unused-css.js': ['assets/js/css-core.js', 'assets/js/purge-core.js', 'assets/js/purge-ui.js'],
  'exif-editor.js': ['assets/js/exif-core.js', 'assets/js/exif-editor-ui.js'],
  'exif-remover.js': ['assets/js/exif-core.js', 'assets/js/exif-remover-ui.js'],
  'robots-txt.js': ['assets/js/robots-core.js', 'assets/js/robots-ui.js'],
  'schema-markup.js': ['assets/js/schema-core.js', 'assets/js/schema-ui.js'],
  'privacy-policy.js': ['assets/js/zip-core.js', 'assets/js/docx-core.js', 'assets/js/notepad-core.js', 'assets/js/privacy-core.js', 'assets/js/privacy-ui.js'],
  'whatsapp-link.js': ['assets/js/wa-core.js', 'assets/js/wa-ui.js'],
  'color-contrast.js': ['assets/js/contrast-core.js', 'assets/js/contrast-ui.js'],
  'case-converter.js': ['assets/js/case-core.js', 'assets/js/case-ui.js'],
  'json-formatter.js': ['assets/js/json-core.js', 'assets/js/json-ui.js'],
  'word-counter.js': ['assets/js/zip-core.js', 'assets/js/words-core.js', 'assets/js/words-ui.js'],
  'online-notepad.js': ['assets/js/zip-core.js', 'assets/js/docx-core.js', 'assets/js/notepad-core.js', 'assets/js/notepad-ui.js'],
  'image-converter.js': ['assets/js/zip-core.js', 'assets/js/exif-core.js', 'assets/js/imgconv-core.js', 'assets/js/imgconv-ui.js'],
  'photo-editor.js': ['assets/js/photo-core.js', 'assets/js/photo-ui.js'],
  'whatsapp-sticker-maker.js': ['assets/js/zip-core.js', 'assets/js/imgconv-core.js', 'assets/js/sticker-core.js', 'assets/js/sticker-ui.js'],
  'pdf-converter.js': ['assets/js/zip-core.js', 'assets/js/docx-core.js', 'assets/js/pdf-core.js', 'assets/js/pdf-ui.js']
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
// State prayer time pages are reached from /waktu-solat/, not as app shortcuts.
const appPages = pages.filter(p => p.app && !p.solatState);
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
// ---- search index for the header search: every catalogued tool plus the Malay pages, with each page's title as
// extra keywords. Fetched only when a visitor opens search, so it never touches first paint.
const searchIndex = tools.map(t => {
  const pg = pageByPath.get(local(t.url));
  return { n: t.name, d: t.desc, u: local(t.url), c: t.cat, l: pg ? pg.lang : 'en', b: t.badge || '', k: pg ? pg.title : '' };
}).concat(pages.filter(p => p.app && p.lang === 'ms' && !p.solatState).map(p => ({ n: p.app.name, d: p.description, u: p.path, c: p.cat || 'calc', l: 'ms', b: '', k: p.title })));
const catNames = Object.fromEntries(liveCats.map(c => [c, [CAT_SHORT.en[c], CAT_SHORT.ms[c]]]));
const searchItems = searchIndex.filter((t, i) => searchIndex.findIndex(x => x.u === t.u) === i);
fs.writeFileSync(path.join(pub, 'search-index.json'), JSON.stringify({ cats: catNames, items: searchItems }));

const manifestJSON = JSON.stringify(manifest, null, 2) + '\n';
fs.writeFileSync(path.join(pub, 'manifest.webmanifest'), manifestJSON);

const pagePaths = ['/', ...pages.map(p => p.path)];
const precache = [...new Set([
  ...pagePaths, '/offline.html', '/manifest.webmanifest', '/assets/PWA/pwa.min.js', '/search-index.json',
  ...Object.keys(bundles).map(n => '/assets/js/' + n),
  site.logo.local72, '/assets/favicon-image/favicon.ico',
  '/assets/favicon-image/apple-touch-icon.png', '/assets/favicon-image/favicon-96x96.png',
  site.logo.local192, ...manifest.icons.map(icon => icon.src)
])];
// ---- static files: copied as-is so docs/ is self-contained
const copy = (from, to = from) => fs.cpSync(path.join(root, from), path.join(pub, to), { recursive: true });
// Vendor libraries carry their version in the file name; a clean copy drops superseded versions.
fs.rmSync(path.join(pub, 'assets/vendor'), { recursive: true, force: true });
// Prayer time years roll over; a clean copy drops years no longer in the source.
fs.rmSync(path.join(pub, 'assets/solat'), { recursive: true, force: true });
['CNAME', '404.html', 'offline.html', 'assets/favicon-image', 'assets/PWA/pwa.min.js', 'assets/PWA/icons', 'assets/PWA/screenshots', 'assets/vendor', 'assets/img', 'assets/solat'].forEach(f => copy(f));
// Large libraries are cached by the worker on first use instead of on install, so they work offline afterwards
// without making every visitor download them.
const lazy = fs.readdirSync(path.join(root, 'assets/vendor')).filter(f => f.endsWith('.js')).map(f => '/assets/vendor/' + f)
  .concat(fs.readdirSync(path.join(root, 'assets/vendor'), { withFileTypes: true }).filter(d => d.isDirectory())
    .flatMap(d => fs.readdirSync(path.join(root, 'assets/vendor', d.name)).filter(f => f.endsWith('.mjs')).map(f => '/assets/vendor/' + d.name + '/' + f)))
  // A visitor's prayer time zone is kept after first use, so the app shows the times offline.
  .concat(fs.readdirSync(path.join(root, 'assets/solat')).flatMap(y => fs.readdirSync(path.join(root, 'assets/solat', y)).map(f => `/assets/solat/${y}/${f}`)));
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
