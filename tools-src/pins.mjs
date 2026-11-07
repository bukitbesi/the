// Renders one 1000x1500 Pinterest pin per tool page into assets/pins/<slug>.jpg (with IPTC rights, like the hero
// images). Only missing pins are drawn; pass --force to redraw all. Run after adding a tool, then build.mjs, which
// adds the new pins to the category feeds in docs/pinterest/.
// Usage: node tools-src/pins.mjs [--force]   (PLAYWRIGHT_MODULE may point to a playwright install)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { icons, renderIcon } from './icons.mjs';
import { PIN, pinItems, pinHtml } from './pinterest.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, '..');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const exif = require('../assets/js/exif-core.js');
const site = JSON.parse(fs.readFileSync(path.join(dir, 'site.json'), 'utf8'));
const tools = JSON.parse(fs.readFileSync(path.join(dir, 'tools.json'), 'utf8')).filter(t => t.live);
const pages = fs.readdirSync(path.join(dir, 'pages')).filter(f => f.endsWith('.html')).map(f => {
  const m = fs.readFileSync(path.join(dir, 'pages', f), 'utf8').match(/^<!--page\n([\s\S]*?)\n-->\n/);
  return m ? JSON.parse(m[1]) : null;
}).filter(Boolean);
const logo = 'data:image/webp;base64,' + fs.readFileSync(path.join(root, site.logo.local512)).toString('base64');
const host = new URL(site.origin).hostname;
const force = process.argv.includes('--force');
// Icons for pages with no catalog card of their own (the courier tracking and near-me pages are utilities).
const FALLBACK = { calc: 'salary-calculator-malaysia', util: 'parcel-tracking-malaysia', content: 'word-counter', dev: 'json-formatter', seo: 'seo-meta-analyzer-tool', design: 'image-converter', ai: 'ai-prompt-generator' };

const items = pinItems(pages, tools, site.origin).filter(i => force || !fs.existsSync(path.join(root, i.image)));
fs.mkdirSync(path.join(root, PIN.dir), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: PIN.width, height: PIN.height }, deviceScaleFactor: 1 });
for (const i of items) {
  const key = Object.hasOwn(icons, i.icon) ? i.icon : FALLBACK[i.cat];
  await page.setContent(pinHtml(i, { label: site.categories[i.cat].label, iconSvg: renderIcon(key), logo, host }), { waitUntil: 'load' });
  const shot = new Uint8Array(await page.screenshot({ type: 'jpeg', quality: 78 }));
  const copyright = `© ${(i.published || '2026').slice(0, 4)} ${site.brand}. All rights reserved.`;
  const rights = { creator: site.brand, credit: site.brand + ' Tools', copyright, webStatement: site.origin + '/terms/#images', licensorUrl: site.origin + '/contact/', title: i.name, description: i.description };
  fs.writeFileSync(path.join(root, i.image), exif.write(shot, { rights, exif: { Artist: site.brand, Copyright: copyright, ImageDescription: i.name + ': ' + i.description } }));
}
await browser.close();
console.log(`Rendered ${items.length} pin image${items.length === 1 ? '' : 's'} into ${PIN.dir}/.`);
