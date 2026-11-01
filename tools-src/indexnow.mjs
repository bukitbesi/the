#!/usr/bin/env node
// Tells IndexNow (Bing, Yandex, Seznam, Naver; Bing also feeds ChatGPT search and Copilot) which tool pages changed
// in a deploy. Only pages whose HTML changed are sent, as the IndexNow guidance asks; resending unchanged URLs on
// every deploy wastes the crawl budget Bing gives the site. Google doesn't use IndexNow; it reads the sitemap.
//
// Usage: node tools-src/indexnow.mjs <from-sha> <to-sha>   pages changed in docs/ between two commits
//        node tools-src/indexnow.mjs --all                 every URL in the sitemap (after a key change or big rebuild)
// Env:   DRY_RUN=1   list the URLs without sending
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(fs.readFileSync(path.join(root, 'tools-src/site.json'), 'utf8'));

export function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

// docs/foo/index.html → origin/foo/, docs/index.html → origin/, docs/llms.txt → origin/llms.txt.
// Only URLs that are in the sitemap (or llms.txt) are kept, so 404/offline pages and assets are never sent.
export function changedUrls(files, origin, listed) {
  const allowed = new Set([...listed, origin + '/llms.txt']);
  const urls = files
    .filter((f) => f.startsWith('docs/'))
    .map((f) => f.slice(5))
    .map((f) => origin + '/' + (f === 'index.html' ? '' : f.endsWith('/index.html') ? f.slice(0, -10) : f))
    .filter((u) => allowed.has(u));
  return [...new Set(urls)].sort();
}

async function main() {
  const args = process.argv.slice(2);
  const origin = site.origin.replace(/\/$/, '');
  const key = site.indexNowKey;
  const listed = sitemapUrls(fs.readFileSync(path.join(root, 'docs/sitemap.xml'), 'utf8'));

  let urls;
  if (args[0] === '--all') {
    urls = [...listed, origin + '/llms.txt'];
  } else if (args.length === 2) {
    const files = execFileSync('git', ['diff', '--name-only', `${args[0]}..${args[1]}`, '--', 'docs'], { cwd: root, encoding: 'utf8' })
      .split('\n').filter(Boolean);
    urls = changedUrls(files, origin, listed);
  } else {
    throw new Error('Usage: node tools-src/indexnow.mjs <from-sha> <to-sha> | --all');
  }

  console.log(`${urls.length} URL(s) to submit`);
  urls.forEach((u) => console.log('  ' + u));
  if (!urls.length) return;
  if (process.env.DRY_RUN === '1') { console.log('DRY_RUN: not sending.'); return; }

  // IndexNow checks the key file before accepting anything; after a key change the new file must be live first.
  const keyLocation = `${origin}/${key}.txt`;
  let live = '';
  for (let i = 0; i < 10 && live !== key; i++) {
    if (i) await new Promise((r) => setTimeout(r, 30e3));
    live = await fetch(`${keyLocation}?v=${Date.now()}`).then((r) => (r.ok ? r.text() : '')).then((t) => t.trim()).catch(() => '');
  }
  if (live !== key) throw new Error(`${keyLocation} does not serve the key yet; IndexNow would reject the submission.`);

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(origin).hostname, key, keyLocation, urlList: urls.slice(0, 10000) }),
  });
  const meaning = { 200: 'accepted', 202: 'accepted, key check pending', 400: 'bad request', 403: 'key not valid for this host',
    422: 'URLs do not belong to the host', 429: 'too many requests' }[res.status] || 'unexpected';
  console.log(`IndexNow HTTP ${res.status} (${meaning})`);
  if (res.status !== 200 && res.status !== 202) throw new Error(`IndexNow refused the submission: HTTP ${res.status} ${await res.text()}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(`::error::${e.message}`); process.exit(1); });
}
