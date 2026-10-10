// Builds the public page and crawl files from the same validated tool catalog.
// Usage (from repo root):  node tools-src/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { icons, renderIcon } from './icons.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, '..');
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');
const site = JSON.parse(read('site.json'));
const catalog = JSON.parse(read('tools.json'));
const tools = catalog.filter(t => t.live === true);
let html = read('template.html');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cats = Object.keys(site.categories);
const byCat = c => tools.filter(t => t.cat === c);
const date = new Date(site.dateModified + 'T00:00:00Z');
const dateText = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const abs = u => (/^https?:/.test(u) ? u : site.origin + u);
// FAQ copy may say {count}; keep visible text, schema and llms.txt in sync with the catalog.
site.faq = site.faq.map(f => ({ q: f.q, a: f.a.replaceAll('{count}', tools.length) }));

// ---- validate
const problems = [];
catalog.forEach(t => {
  if (!site.categories[t.cat]) problems.push(`unknown category "${t.cat}" on ${t.name}`);
  if (!/^https:\/\//.test(t.url)) problems.push(`non-absolute url on ${t.name}: ${t.url}`);
  if (typeof t.live !== 'boolean') problems.push(`missing live status on ${t.name}`);
  if (t.live && !Object.hasOwn(icons, t.icon)) problems.push(`missing SVG icon on ${t.name}`);
});
if (new Set(catalog.map(t => t.url)).size !== catalog.length) problems.push('duplicate tool URLs');
if (!tools.length) problems.push('no live tools to publish');
if (new Set(tools.map(t => t.icon)).size !== tools.length) problems.push('published tools must have their own icon');
if (new URL(site.origin).origin !== site.origin) problems.push('origin must be an origin without a trailing slash');
if (fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim() !== new URL(site.origin).hostname) problems.push('CNAME and canonical host differ');
if (!/^[0-9a-f]{32}$/.test(site.indexNowKey || '')) problems.push('indexNowKey must be 32 lowercase hex characters');
if (!/^\d{4}-\d{2}-\d{2}$/.test(site.dateModified) || Number.isNaN(date.getTime())) problems.push('invalid modification date');
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

// ---- HTML fragments
const chips = [`      <button type="button" class="chip" data-filter="all" aria-pressed="true">All<small>${tools.length}</small></button>`]
  .concat(cats.filter(c => byCat(c).length).map(c =>
    `      <button type="button" class="chip" data-filter="${c}" aria-pressed="false">${esc(site.categories[c].label)}<small>${byCat(c).length}</small></button>`)).join('\n');

const cards = tools.map(t => {
  const tag = t.badge ? `<span class="tag ${t.badge}">${t.badge}</span>` : '';
  return `      <li class="card" data-cat="${t.cat}"><span class="ic t-${t.cat}" data-icon="${t.icon}" aria-hidden="true">${renderIcon(t.icon)}</span>${tag}<h3><a class="card-link" href="${esc(t.url)}">${esc(t.name)}</a></h3><p>${esc(t.desc)}</p><span class="go" aria-hidden="true">Use tool &rarr;</span></li>`;
}).join('\n');

const categoryBlocks = cats.filter(c => byCat(c).length).map(c => {
  const n = byCat(c).length;
  return `      <article class="panel"><h3>${esc(site.categories[c].label)} (${n})</h3><p>${esc(site.categories[c].blurb)}</p><p>${byCat(c).map(t => esc(t.name)).join(', ')}.</p><a class="more" href="#tools" data-filter="${c}">Show ${esc(site.categories[c].label.toLowerCase())}</a></article>`;
}).join('\n');

const faqHtml = site.faq.map(f =>
  `      <details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n');

const popular = tools.filter(t => t.live && (t.badge === 'popular' || t.badge === 'hot')).slice(0, 5);
const footerPopular = popular.map(t => `          <li><a href="${esc(t.url)}">${esc(t.name)}</a></li>`).join('\n');
const footerCats = cats.filter(c => byCat(c).length).map(c =>
  `          <li><a href="#tools" data-filter="${c}">${esc(site.categories[c].label)}</a></li>`).join('\n');

// ---- JSON-LD
const title = 'Free Online Tools, AI & Calculators';
const description = `${tools.length} free online tools for code, SEO, writing, images and AI, plus Malaysian calculators, currency conversion and speed tests. Explore the full collection.`;
const CATEGORY_TOPICS = cats.filter(c => byCat(c).length).map(c => ({ '@type': 'Thing', name: site.categories[c].label, description: site.categories[c].blurb }));
const graph = [
  {
    '@type': 'Organization', '@id': site.mainSite + '/#organization', name: site.brand, url: site.mainSite + '/',
    logo: { '@type': 'ImageObject', url: abs(site.logo.local512), width: 512, height: 512 },
    sameAs: [`https://x.com/${site.twitter.replace('@', '')}`]
  },
  {
    '@type': 'WebSite', '@id': site.origin + '/#website', url: site.origin + '/', name: site.brand + ' Tools',
    alternateName: ['Bukit Besi Tools', 'The Bukit Besi free online tools'],
    description, inLanguage: 'en', publisher: { '@id': site.mainSite + '/#organization' }
  },
  {
    '@type': 'CollectionPage', '@id': site.origin + '/#webpage', url: site.origin + '/', name: title + ' | ' + site.brand,
    description, inLanguage: 'en', isAccessibleForFree: true,
    isPartOf: { '@id': site.origin + '/#website' },     primaryImageOfPage: { '@type': 'ImageObject', url: abs(site.ogImage.url), width: site.ogImage.width, height: site.ogImage.height },
    dateModified: site.dateModified, author: { '@id': site.mainSite + '/#organization' },
    audience: { '@type': 'Audience', audienceType: 'Developers, bloggers, content creators and Malaysian users' },
    about: CATEGORY_TOPICS,
    mainEntity: { '@id': site.origin + '/#toollist' }
  },
  {
    '@type': 'ItemList', '@id': site.origin + '/#toollist', name: `${site.brand} free online tools`, numberOfItems: tools.length,
    itemListElement: tools.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, description: t.desc, url: t.url }))
  },
  {
    '@type': 'FAQPage', '@id': site.origin + '/#faq', isPartOf: { '@id': site.origin + '/#webpage' },
    mainEntity: site.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
  }
];
const jsonld = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');

// ---- fill template
const map = {
  TITLE: esc(title + ' | ' + site.brand), DESCRIPTION: esc(description),
  COUNT: tools.length, CAT_COUNT: cats.filter(c => byCat(c).length).length, BRAND: site.brand, ORIGIN: site.origin,
  MAIN_SITE: site.mainSite, DATE_ISO: site.dateModified, DATE_TEXT: dateText, YEAR: date.getUTCFullYear(),
  LOGO_72: site.logo.local72, LOGO_192: site.logo.local192,
  OG_IMAGE: abs(site.ogImage.url), OG_W: site.ogImage.width, OG_H: site.ogImage.height, OG_ALT: site.ogImage.alt,
  // summary_large_image needs a ~2:1 image; fall back to "summary" for square logos
  TWITTER_CARD: site.ogImage.width / site.ogImage.height >= 1.5 ? 'summary_large_image' : 'summary',
  TWITTER: site.twitter, CHIPS: chips, CARDS: cards, CATEGORY_BLOCKS: categoryBlocks, FAQ_HTML: faqHtml,
  FOOTER_POPULAR: footerPopular, FOOTER_CATS: footerCats, JSONLD: jsonld
};
html = html.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => {
  if (!(k in map)) { console.error('Unknown placeholder ' + m); process.exit(1); }
  return map[k];
});
fs.writeFileSync(path.join(root, 'tool.html'), html);

// ---- llms.txt (plain-text summary for LLM crawlers; llmstxt.org format)
const llms = [
  `# ${site.brand} Tools`,
  '',
  `> ${description}`,
  '',
  `This is a directory linking to tools on ${site.mainSite}/, not an on-page tool runner. Only published tools are listed. Last updated ${site.dateModified}.`,
  '',
  '## Directory',
  '',
  `- [Free online tools](${site.origin}/): Canonical directory with tool descriptions, categories and usage guidance.`,
  '',
  ...cats.filter(c => byCat(c).length).flatMap(c => [
    `## ${site.categories[c].label}`, '',
    ...byCat(c).map(t => `- [${t.name}](${t.url}): ${t.desc}`), ''
  ]),
  '## Optional',
  '',
  `- [About ${site.brand}](${site.mainSite}/p/about.html): Information about the publisher.`,
  `- [Contact](${site.mainSite}/p/contact.html): Suggest a tool or report a problem.`,
  `- [Privacy policy](${site.mainSite}/p/privacy-policy.html): Publisher privacy information.`,
  ''
].join('\n');
fs.writeFileSync(path.join(root, 'llms.txt'), llms);

// ---- sitemap.xml (only this host's URLs; sitemaps cannot list other hostnames)
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${esc(site.origin)}/</loc>
    <lastmod>${site.dateModified}</lastmod>
  </url>
</urlset>
`;
fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap);

// Let crawlers fetch the 404 page so they can see its noindex directive.
const robots = `# Public directory: search and AI crawlers may access the site.\nUser-agent: *\nAllow: /\n\nSitemap: ${site.origin}/sitemap.xml\n`;
fs.writeFileSync(path.join(root, 'robots.txt'), robots);
// IndexNow ownership file (Bing, Yandex, Seznam, Naver). The key is public by design.
fs.writeFileSync(path.join(root, site.indexNowKey + '.txt'), site.indexNowKey + '\n');

// ---- Installable PWA. Stable app ID and root worker scope match the custom host.
const manifest = {
  id: '/', name: site.brand + ' Tools', short_name: 'Bukit Besi Tools',
  description: 'Free online tool directory for code, content, design, AI and Malaysian calculators.',
  lang: 'en', dir: 'ltr', start_url: '/', scope: '/', display: 'standalone',
  display_override: ['standalone', 'minimal-ui'],
  theme_color: '#0a0a0f', background_color: '#0a0a0f',
  categories: ['utilities', 'productivity'], prefer_related_applications: false,
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
    { name: 'Tool categories', url: '/#categories', description: 'Find a category' }
  ]
};
const manifestJSON = JSON.stringify(manifest, null, 2) + '\n';
fs.writeFileSync(path.join(root, 'manifest.webmanifest'), manifestJSON);
// Keep the old source manifest valid for anyone still referencing it.
fs.writeFileSync(path.join(root, 'src/manifest.json'), manifestJSON);
const precache = [...new Set([
  '/', '/offline.html', '/manifest.webmanifest', '/assets/PWA/pwa.min.js',
  site.logo.local72, '/assets/favicon-image/favicon.ico',
  '/assets/favicon-image/apple-touch-icon.png', '/assets/favicon-image/favicon-96x96.png',
  site.logo.local192, ...manifest.icons.map(icon => icon.src)
])];
const workerTemplate = fs.readFileSync(path.join(root, 'assets/PWA/sw.js'), 'utf8');
const hash = createHash('sha256').update(html).update(workerTemplate).update(manifestJSON);
for (const resource of precache.filter(url => url !== '/')) hash.update(fs.readFileSync(path.join(root, resource)));
const revision = hash.digest('hex').slice(0, 16);
const worker = workerTemplate.replace('__CACHE_VERSION__', revision).replace('__PRECACHE_JSON__', JSON.stringify(precache));
fs.writeFileSync(path.join(root, 'sw.js'), worker);
console.log(`Built tool.html (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB), crawl files, manifest and sw.js (${revision})`);
console.log(`${tools.length} published tools; ${catalog.length - tools.length} unpublished records retained in tools.json`);
