// Builds tool.html, llms.txt and sitemap.xml from tools.json + site.json + template.html.
// Usage (from repo root):  node tools-src/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, '..');
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');
const site = JSON.parse(read('site.json'));
const tools = JSON.parse(read('tools.json'));
let html = read('template.html');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cats = Object.keys(site.categories);
const byCat = c => tools.filter(t => t.cat === c);
const date = new Date(site.dateModified + 'T00:00:00Z');
const dateText = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const abs = u => (/^https?:/.test(u) ? u : site.origin + u);

// ---- validate
const problems = [];
tools.forEach(t => {
  if (!site.categories[t.cat]) problems.push(`unknown category "${t.cat}" on ${t.name}`);
  if (!/^https:\/\//.test(t.url)) problems.push(`non-absolute url on ${t.name}: ${t.url}`);
});
if (new Set(tools.map(t => t.url)).size !== tools.length) problems.push('duplicate tool URLs');
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

// ---- HTML fragments
const chips = [`      <button type="button" class="chip" data-filter="all" aria-pressed="true">All<small>${tools.length}</small></button>`]
  .concat(cats.filter(c => byCat(c).length).map(c =>
    `      <button type="button" class="chip" data-filter="${c}" aria-pressed="false">${esc(site.categories[c].label)}<small>${byCat(c).length}</small></button>`)).join('\n');

const cards = tools.map(t => {
  const tag = t.badge ? `<span class="tag ${t.badge}">${t.badge}</span>` : '';
  return `      <li class="card" data-cat="${t.cat}"><span class="ic t-${t.cat}" aria-hidden="true">${esc(t.icon)}</span>${tag}<h3><a class="card-link" href="${esc(t.url)}">${esc(t.name)}</a></h3><p>${esc(t.desc)}</p><span class="go" aria-hidden="true">Use tool &rarr;</span></li>`;
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
const title = 'Free Online Tools for Developers & Creators';
const description = `${tools.length} free online tools for developers and creators: minifiers, formatters, image converters, SEO and schema generators. No signup required.`;
const graph = [
  {
    '@type': 'Organization', '@id': site.mainSite + '/#organization', name: site.brand, url: site.mainSite + '/',
    logo: { '@type': 'ImageObject', url: abs(site.icon), width: 192, height: 192 },
    sameAs: [`https://x.com/${site.twitter.replace('@', '')}`]
  },
  {
    '@type': 'WebSite', '@id': site.origin + '/#website', url: site.origin + '/', name: site.brand + ' Tools',
    description, inLanguage: 'en', publisher: { '@id': site.mainSite + '/#organization' }
  },
  {
    '@type': 'CollectionPage', '@id': site.origin + '/#webpage', url: site.origin + '/', name: title + ' | ' + site.brand,
    description, inLanguage: 'en', isAccessibleForFree: true,
    isPartOf: { '@id': site.origin + '/#website' }, about: { '@id': site.mainSite + '/#organization' },
    primaryImageOfPage: { '@type': 'ImageObject', url: abs(site.ogImage.url), width: site.ogImage.width, height: site.ogImage.height },
    datePublished: '2026-10-06', dateModified: site.dateModified,
    mainEntity: { '@id': site.origin + '/#toollist' }
  },
  {
    '@type': 'ItemList', '@id': site.origin + '/#toollist', name: `${site.brand} free online tools`, numberOfItems: tools.length,
    itemListElement: tools.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, url: t.url }))
  },
  {
    '@type': 'FAQPage', '@id': site.origin + '/#faq', isPartOf: { '@id': site.origin + '/#webpage' },
    mainEntity: site.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
  }
];
const jsonld = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');

// ---- fill template
const map = {
  COUNT: tools.length, CAT_COUNT: cats.filter(c => byCat(c).length).length, BRAND: site.brand, ORIGIN: site.origin,
  MAIN_SITE: site.mainSite, DATE_ISO: site.dateModified, DATE_TEXT: dateText, YEAR: date.getUTCFullYear(),
  OG_IMAGE: abs(site.ogImage.url), OG_W: site.ogImage.width, OG_H: site.ogImage.height, OG_ALT: site.ogImage.alt,
  // summary_large_image needs a ~2:1 image; fall back to "summary" for square logos
  TWITTER_CARD: site.ogImage.width / site.ogImage.height >= 1.5 ? 'summary_large_image' : 'summary',
  TWITTER: site.twitter, CHIPS: chips, CARDS: cards, CATEGORY_BLOCKS: categoryBlocks, FAQ_HTML: faqHtml,
  FOOTER_POPULAR: footerPopular, FOOTER_CATS: footerCats, JSONLD: jsonld
};
html = html.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => {
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
  `Canonical page: ${site.origin}/ . Operated by ${site.brand} (${site.mainSite}/). Last updated ${site.dateModified}.`,
  '',
  ...cats.filter(c => byCat(c).length).flatMap(c => [
    `## ${site.categories[c].label}`, '',
    ...byCat(c).map(t => `- [${t.name}](${t.url}): ${t.desc}`), ''
  ]),
  '## About',
  '',
  ...site.faq.map(f => `- ${f.q} ${f.a}`),
  ''
].join('\n');
fs.writeFileSync(path.join(root, 'llms.txt'), llms);

// ---- sitemap.xml (only this host's URLs; sitemaps cannot list other hostnames)
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site.origin}/</loc>
    <lastmod>${site.dateModified}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap);

const dead = tools.filter(t => !t.live);
console.log(`Built tool.html (${(html.length / 1024).toFixed(1)} KB), llms.txt, sitemap.xml`);
console.log(`${tools.length} tools, ${tools.length - dead.length} marked live, ${dead.length} marked live:false`);
