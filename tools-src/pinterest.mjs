// Pinterest: one RSS 2.0 feed per category (one feed = one board), one 1000x1500 pin image per tool page.
// Pinterest reads <title>, <description> and the image from <enclosure>/<media:content>, publishes the oldest item
// first, up to 200 pins a day, and only for links on the claimed domain (help.pinterest.com, "Auto-publish Pins
// from your RSS feed"). Pure functions: build.mjs writes the feeds, pins.mjs renders the images, tests cover both.
export const PIN = { width: 1000, height: 1500, dir: 'assets/pins' };

// Board names: what to call each board on Pinterest (the feed's channel title says the same).
export const BOARDS = {
  dev: 'Free Developer Tools', seo: 'Free SEO Tools', content: 'Free Writing and Text Tools', design: 'Free Design and Image Tools',
  ai: 'Free AI Tools', util: 'Free Online Utilities', calc: 'Malaysia Calculators (Kalkulator Malaysia)'
};
// The category chip on BM pins.
export const CAT_MS = { dev: 'Alat Pembangun', seo: 'Alat SEO', content: 'Alat Teks', design: 'Alat Reka Bentuk', ai: 'Alat AI', util: 'Utiliti', calc: 'Kalkulator' };

const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clip = (s, n) => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };
// Dates in the front matter are Malaysian calendar days; 9am MYT keeps them on the same day in every time zone used.
const rfc822 = d => new Date(d + 'T09:00:00+08:00').toUTCString();
export const slugOf = p => p.path.replace(/^\/|\/$/g, '');
export const imagePath = p => `/${PIN.dir}/${slugOf(p)}.jpg`;

// Every tool page (EN and BM) that should become a pin, with its board and icon.
export function pinItems(pages, tools, origin) {
  const byPath = new Map(tools.filter(t => t.url.startsWith(origin)).map(t => [t.url.slice(origin.length), t]));
  return pages.filter(p => p.app && !p.solatState).map(p => {
    const tool = byPath.get(p.path) || Object.values(p.alternates || {}).map(u => byPath.get(u)).find(Boolean);
    return {
      path: p.path, lang: p.lang === 'ms' ? 'ms' : 'en', cat: p.cat || 'calc', name: p.app.name, description: p.description,
      // Pins are never re-fetched, so features quoting a rate or ringgit amount stay off the image.
      features: (p.app.features || []).filter(f => !f.includes('{{') && !/\d%|RM\s?\d/.test(f)).slice(0, 4), icon: tool ? tool.icon : '',
      published: p.datePublished, modified: p.dateModified || p.datePublished, image: imagePath(p)
    };
  });
}

// One feed. sizes: Map of image path → bytes (items without an image are left out, so a feed never points at a
// missing file). Deterministic: no "now" timestamps, so rebuilding without changes leaves docs/ untouched.
export function feed(cat, items, { origin, brand, label, blurb, sizes }) {
  const list = items.filter(i => i.cat === cat && sizes.has(i.image))
    .sort((a, b) => b.published.localeCompare(a.published) || a.path.localeCompare(b.path));
  const last = list.reduce((d, i) => (i.modified > d ? i.modified : d), '2026-01-01');
  const body = list.map(i => {
    const url = origin + i.path, link = `${url}?utm_source=pinterest&utm_medium=social&utm_campaign=${cat}`;
    const img = origin + i.image;
    return `    <item>
      <title>${xml(clip(i.name, 100))}</title>
      <link>${xml(link)}</link>
      <description>${xml(clip(i.description, 500))}</description>
      <guid isPermaLink="true">${xml(url)}</guid>
      <pubDate>${rfc822(i.published)}</pubDate>
      <category>${xml(label)}</category>
      <enclosure url="${xml(img)}" length="${sizes.get(i.image)}" type="image/jpeg"/>
      <media:content url="${xml(img)}" medium="image" type="image/jpeg" width="${PIN.width}" height="${PIN.height}"/>
    </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(brand + ' Tools: ' + label)}</title>
    <link>${xml(origin + '/?cat=' + cat + '#tools')}</link>
    <atom:link href="${xml(origin + '/pinterest-' + cat + '.xml')}" rel="self" type="application/rss+xml"/>
    <description>${xml(blurb)}</description>
    <language>en-MY</language>
    <lastBuildDate>${rfc822(last)}</lastBuildDate>
${body}
  </channel>
</rss>
`;
}

// The pin itself: a 2:3 card with the tool's icon, name, one-line promise and three features.
const ACCENT = { dev: '#7c6cff', seo: '#22c55e', content: '#f59e0b', design: '#ec4899', ai: '#06b6d4', util: '#3b82f6', calc: '#ef4444' };
export function pinHtml(item, { label, iconSvg, logo, host }) {
  const ms = item.lang === 'ms', a = ACCENT[item.cat] || ACCENT.util, h = s => xml(s);
  const feats = item.features.map(f => `<li><span>✓</span>${h(clip(f, 64))}</li>`).join('');
  return `<!DOCTYPE html><html lang="${item.lang}"><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:${PIN.width}px;height:${PIN.height}px;overflow:hidden;font-family:Inter,system-ui,"Segoe UI",Roboto,Arial,sans-serif;color:#f4f4f8;
background:radial-gradient(900px 700px at 100% 0,${a}66,transparent 70%),radial-gradient(800px 600px at 0 100%,${a}33,transparent 70%),#0b0b12;
padding:72px 72px 64px;display:flex;flex-direction:column}
.top{display:flex;align-items:center;gap:20px;font-size:34px;font-weight:800}
.top img{width:84px;height:84px;border-radius:22px}
.chip{align-self:flex-start;margin-top:56px;padding:12px 26px;border-radius:99px;background:${a};color:#fff;font-size:30px;font-weight:800;letter-spacing:.02em}
.icon{margin-top:48px;width:180px;height:180px;border-radius:44px;background:rgba(255,255,255,.08);border:2px solid ${a};display:grid;place-items:center;color:#fff}
.icon svg{width:112px;height:112px}
h1{margin-top:52px;font-size:${item.name.length > 34 ? 76 : 96}px;line-height:1.05;font-weight:900;letter-spacing:-.02em}
ul{list-style:none;margin-top:48px;display:grid;gap:22px}
li{display:flex;gap:18px;font-size:38px;line-height:1.25;font-weight:600;color:#ececf4}
li span{color:${a};font-weight:900}
.cta{margin-top:auto;display:flex;justify-content:space-between;align-items:center}
.btn{padding:24px 40px;border-radius:24px;background:#fff;color:#0b0b12;font-size:38px;font-weight:900}
.host{font-size:30px;font-weight:700;color:#b9b9cc;text-align:right;line-height:1.35}
</style></head><body>
<div class="top"><img src="${logo}" alt="">The Bukit Besi Tools</div>
<div class="chip">${h(ms ? CAT_MS[item.cat] || label : label)}</div>
<div class="icon">${iconSvg}</div>
<h1>${h(item.name)}</h1>
<ul>${feats}</ul>
<div class="cta"><div class="btn">${ms ? 'Guna percuma →' : 'Use it free →'}</div><div class="host">${h(host)}<br>${ms ? 'Tanpa daftar' : 'No sign-up'}</div></div>
</body></html>`;
}
