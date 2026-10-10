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
console.log('Rendered social card and PWA screenshots.');
