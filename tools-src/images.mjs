// Renders the 1200x630 social card and the PWA install screenshots with Chromium.
// Run after build.mjs (it serves docs/) whenever the brand, tool count or layout changes.
// Usage: node tools-src/images.mjs   (PLAYWRIGHT_MODULE may point to a playwright install)
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, '..');
const require = createRequire(import.meta.url);
const playwrightPath = process.env.PLAYWRIGHT_MODULE ||
  path.join(execSync('npm root -g').toString().trim(), 'playwright');
const { chromium } = require(playwrightPath);
const site = JSON.parse(fs.readFileSync(path.join(dir, 'site.json'), 'utf8'));
const tools = JSON.parse(fs.readFileSync(path.join(dir, 'tools.json'), 'utf8')).filter(t => t.live);
const logo = 'data:image/webp;base64,' + fs.readFileSync(path.join(root, site.logo.local512)).toString('base64');
const host = new URL(site.origin).hostname;
const exif = require('../assets/js/exif-core.js');
const labels = Object.keys(site.categories).filter(c => tools.some(t => t.cat === c)).map(c => site.categories[c].label);

const card = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;font-family:system-ui,"Segoe UI",Roboto,Arial,sans-serif;color:#f0f0f5;
background:radial-gradient(700px 480px at 92% -10%,rgba(108,92,231,.45),transparent 70%),radial-gradient(560px 420px at -5% 110%,rgba(0,206,201,.25),transparent 70%),#0a0a0f;
padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between}
.top{display:flex;align-items:center;gap:18px;font-size:30px;font-weight:800}
.top img{width:72px;height:72px;border-radius:18px}
h1{font-size:76px;line-height:1.05;font-weight:900;letter-spacing:-.03em;max-width:980px}
h1 span{background:linear-gradient(135deg,#a29bfe,#00cec9);-webkit-background-clip:text;color:transparent}
.pills{display:flex;flex-wrap:wrap;gap:10px;max-width:1060px}
.pills b{padding:8px 18px;border-radius:99px;border:1px solid rgba(162,155,254,.45);background:rgba(108,92,231,.18);color:#d4d0ff;font-size:22px;font-weight:600}
.foot{display:flex;justify-content:space-between;align-items:center;font-size:26px;color:#b3b3c8}
.foot strong{color:#2ee6e0}
</style></head><body>
<div class="top"><img src="${logo}" alt=""><span>${site.brand}</span></div>
<h1>${tools.length} Free Online Tools for <span>Developers &amp; Creators</span></h1>
<div class="pills">${labels.map(l => `<b>${l}</b>`).join('')}</div>
<div class="foot"><span>No signup &middot; Works in your browser</span><strong>${host}</strong></div>
</body></html>`;


// Tool hero images: also the pages' og:image. Each carries the IPTC rights Google Images shows, written by the
// same EXIF editor core the page runs, so the picture demonstrates the tool.
const sample = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root, 'assets/img/exif-sample-bukit-besi.jpg')).toString('base64');
const heroCss = `*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;font-family:system-ui,"Segoe UI",Roboto,Arial,sans-serif;color:#f0f0f5;
background:radial-gradient(700px 480px at 95% -10%,rgba(108,92,231,.42),transparent 70%),radial-gradient(560px 420px at -5% 110%,rgba(0,206,201,.22),transparent 70%),#0a0a0f;padding:48px 56px}
h1{font-size:50px;line-height:1.08;font-weight:900;letter-spacing:-.02em;margin-bottom:26px}
h1 span{background:linear-gradient(135deg,#a29bfe,#00cec9);-webkit-background-clip:text;color:transparent}
.row{display:flex;gap:30px;align-items:flex-start}
.ph{position:relative;flex:none}
.ph img{display:block;width:480px;height:320px;object-fit:cover;border-radius:16px;border:1px solid rgba(255,255,255,.15)}
.tag{position:absolute;left:12px;bottom:12px;padding:6px 12px;border-radius:10px;background:rgba(10,10,15,.82);font-size:19px;font-weight:700}
ul{list-style:none;display:grid;gap:9px;flex:1}
li{display:flex;justify-content:space-between;gap:16px;padding:10px 16px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);font-size:21px}
li b{color:#d4d0ff;font-weight:700;white-space:nowrap}
li span{color:#c9c9d6;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
li.g{border-color:rgba(46,230,224,.5);background:rgba(0,206,201,.12)}
li.x span{text-decoration:line-through;color:#ff8a8a}
.foot{position:absolute;left:56px;right:56px;bottom:34px;display:flex;justify-content:space-between;font-size:22px;color:#b3b3c8}
.foot strong{color:#2ee6e0}`;
const heroes = [{
  file: 'assets/img/exif-editor-copyright-metadata.jpg',
  title: 'EXIF editor: copyright and credit that <span>Google Images shows</span>',
  tag: 'Edited, pixels unchanged',
  rows: [['g', 'Creator', 'The Bukit Besi'], ['g', 'Credit Line', 'The Bukit Besi Tools'], ['g', 'Copyright Notice', '© 2026 The Bukit Besi'],
    ['g', 'Web Statement of Rights', '/terms/#images'], ['g', 'Licensor URL', '/contact/'], ['', 'Camera', 'Canon EOS R6 · f/8 · 1/250 s'], ['', 'GPS', '4.7583, 103.1950']],
  foot: 'Free · JPEG, PNG and WebP · Nothing uploaded',
  description: 'EXIF editor showing the IPTC Creator, Credit Line, Copyright Notice and licence fields that Google Images displays'
}, {
  file: 'assets/img/exif-remover-before-after.jpg',
  title: 'EXIF remover: delete GPS and camera data <span>without losing quality</span>',
  tag: '16.3 KB → 10.6 KB, same pixels',
  rows: [['x', 'GPS location', '4.7583, 103.1950'], ['x', 'Date taken', '2026:08:31 07:42'], ['x', 'Camera serial', '083021004512'],
    ['x', 'Owner name', 'The Bukit Besi'], ['x', 'Thumbnail', '1,620 bytes'], ['x', 'XMP edit data', 'Lightroom'], ['g', 'Orientation and colour', 'Kept']],
  foot: 'Free · Batch to ZIP · Nothing uploaded',
  description: 'Before and after removing EXIF metadata: GPS, date, camera serial and thumbnail deleted while orientation and colour profile are kept'
}];
const heroHtml = x => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${heroCss}</style></head><body>
<h1>${x.title}</h1><div class="row"><div class="ph"><img src="${sample}" alt=""><span class="tag">${x.tag}</span></div>
<ul>${x.rows.map(r => `<li class="${r[0]}"><b>${r[1]}</b><span>${r[2]}</span></li>`).join('')}</ul></div>
<div class="foot"><span>${x.foot}</span><strong>${host}</strong></div></body></html>`;
const heroRights = x => ({
  creator: site.brand, credit: site.brand + ' Tools', copyright: `© ${new Date().getUTCFullYear()} ${site.brand}. All rights reserved.`,
  webStatement: site.origin + '/terms/#images', licensorUrl: site.origin + '/contact/', title: x.title.replace(/<[^>]+>/g, ''), description: x.description
});

// Serve the built page at the root, matching production paths for the screenshots.
const server = http.createServer((req, res) => {
  const name = new URL(req.url, 'http://x').pathname;
  const file = path.join('docs', name.endsWith('/') ? name + 'index.html' : name);
  const absolute = path.resolve(root, file);
  if (!absolute.startsWith(root + path.sep) || !fs.existsSync(absolute) || file === path.join('docs', 'sw.js')) { res.writeHead(404); return res.end(); }
  res.writeHead(200); res.end(fs.readFileSync(absolute));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();
try {
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await og.setContent(card, { waitUntil: 'load' });
  await og.screenshot({ path: path.join(root, site.ogImage.url), type: 'jpeg', quality: 86 });

  for (const x of heroes) {
    await og.setContent(heroHtml(x), { waitUntil: 'load' });
    const shot = new Uint8Array(await og.screenshot({ type: 'jpeg', quality: 84 }));
    fs.writeFileSync(path.join(root, x.file), exif.write(shot, { rights: heroRights(x), exif: { Artist: site.brand, Copyright: heroRights(x).copyright, ImageDescription: x.description } }));
  }

  fs.mkdirSync(path.join(root, 'assets/PWA/screenshots'), { recursive: true });
  const shots = [
    { file: 'wide.jpg', viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
    { file: 'narrow.jpg', viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 }
  ];
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: shot.viewport, deviceScaleFactor: shot.deviceScaleFactor });
    await page.goto(origin, { waitUntil: 'load' });
    await page.screenshot({ path: path.join(root, 'assets/PWA/screenshots', shot.file), type: 'jpeg', quality: 78 });
  }
} finally {
  await browser.close();
  server.close();
}
console.log('Rendered social card, tool hero images and PWA screenshots.');
