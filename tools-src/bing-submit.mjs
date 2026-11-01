#!/usr/bin/env node
// Sends newly published or updated Blogger posts and pages to Bing through the Bing Webmaster
// URL Submission API, so they're crawled within hours (Bing also feeds ChatGPT search, Copilot,
// DuckDuckGo and Yahoo). Blogger can't host an IndexNow key file, so this uses the Webmaster API.
//
// Env: BING_API_KEY  (Bing Webmaster Tools → Settings → API access → API Key; site must be verified)
//      WINDOW_HOURS  submit items updated within this many hours (default 7, the workflow runs every 6 h)
//      SUBMIT_ALL=1  submit every post and page (first run / after a big edit), capped by today's quota
//      DRY_RUN=1     list what would be sent without calling Bing
// Usage: node tools-src/bing-submit.mjs [feed.json …]   (local feed files, for testing)
// The tools site (tool.thebukitbesi.com) is static and uses IndexNow instead: tools-src/indexnow.mjs.
import { readFile } from 'node:fs/promises';

const SITE = 'https://www.thebukitbesi.com';
const API = 'https://ssl.bing.com/webmaster/api.svc/json';
// Strip whitespace, quotes and a pasted "apikey=" prefix, the usual copy-paste accidents.
const KEY = (process.env.BING_API_KEY || '').trim().replace(/^["']|["']$/g, '').replace(/^apikey=/i, '').trim();
// The tools site's public IndexNow keys (current and the one before): easy to confuse with the Webmaster API key,
// but Bing rejects them here.
const INDEXNOW_KEYS = [JSON.parse(await readFile(new URL('./site.json', import.meta.url), 'utf8')).indexNowKey,
  'a23a48e05a9411b3da9c72fc138a6206'];
const KEY_HELP = 'Use the Bing Webmaster *API* key (Bing Webmaster Tools → ⚙ Settings → API access → API Key), ' +
  'not an IndexNow key, generated while signed in to the Microsoft account that verified www.thebukitbesi.com.';
const WINDOW = Number(process.env.WINDOW_HOURS || 7) * 3600e3;
const ALL = process.env.SUBMIT_ALL === '1' || process.env.SUBMIT_ALL === 'true';
const DRY = process.env.DRY_RUN === '1' || !KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, tries = 3) {
  for (let i = 1; ; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'thebukitbesi-bing-submit', Accept: 'application/json' }, redirect: 'manual' });
    if (res.ok) return res.json();
    if (i >= tries) throw new Error(`${url} → HTTP ${res.status}`);
    await sleep(5000 * i);
  }
}

// Blogger's public JSON feeds, paged 150 at a time.
async function feedEntries(kind) {
  const out = [];
  for (let start = 1; start < 5000; start += 150) {
    const j = await fetchJson(`${SITE}/feeds/${kind}/default?alt=json&orderby=updated&max-results=150&start-index=${start}`);
    const entries = j.feed?.entry || [];
    out.push(...entries);
    if (entries.length < 150) break;
  }
  return out;
}

function toItems(entries) {
  return entries.map((e) => ({
    url: (e.link || []).find((l) => l.rel === 'alternate')?.href,
    updated: Date.parse(e.updated?.$t || e.published?.$t || 0),
  })).filter((x) => x.url && x.url.startsWith(SITE));
}

async function main() {
  let items;
  const files = process.argv.slice(2);
  if (files.length) items = toItems((await Promise.all(files.map(async (f) => JSON.parse(await readFile(f, 'utf8')).feed?.entry || []))).flat());
  else items = toItems([...(await feedEntries('posts')), ...(await feedEntries('pages'))]);

  const since = Date.now() - WINDOW;
  let urls = [...new Set(items.filter((x) => ALL || x.updated >= since).sort((a, b) => b.updated - a.updated).map((x) => x.url))];
  console.log(`${items.length} published posts/pages; ${urls.length} ${ALL ? 'in total' : `updated in the last ${WINDOW / 3600e3} h`}`);
  if (!urls.length) return;
  if (!ALL) urls.unshift(`${SITE}/`); // the homepage lists the new item, so it changed too

  if (KEY) {
    // Describe the key without revealing it, so a wrong paste is easy to spot in the log.
    const raw = process.env.BING_API_KEY || '';
    console.log(`Key check: ${KEY.length} characters, ${/^[0-9a-f]+$/i.test(KEY) ? 'letters/digits only' : 'contains other characters'}` +
      `${raw !== raw.trim() ? ', had extra spaces/newlines (removed)' : ''}.`);
    if (INDEXNOW_KEYS.includes(KEY.toLowerCase())) throw new Error(`BING_API_KEY is the tools site's IndexNow key, not a Bing Webmaster API key. ${KEY_HELP}`);
  }

  if (DRY) {
    console.log(KEY ? 'DRY_RUN: not sending.' : '::notice::BING_API_KEY not set, so nothing was sent. Add it as a repository secret to enable Bing submission.');
    urls.forEach((u) => console.log('  ' + u));
    return;
  }

  // Respect today's quota so a big SUBMIT_ALL never fails the whole batch.
  try {
    const q = await fetchJson(`${API}/GetUrlSubmissionQuota?siteUrl=${encodeURIComponent(SITE)}&apikey=${encodeURIComponent(KEY)}`);
    const daily = q.d?.DailyQuota;
    if (Number.isFinite(daily)) {
      console.log(`Bing quota today: ${daily} URL(s)`);
      if (daily <= 0) { console.log('::warning::Bing daily quota used up; try again tomorrow.'); return; }
      urls = urls.slice(0, daily);
    }
  } catch (e) {
    console.log(`Could not read quota (${e.message}); sending anyway.`);
  }

  for (let i = 0; i < urls.length; i += 500) {
    const batch = urls.slice(i, i + 500);
    const res = await fetch(`${API}/SubmitUrlbatch?apikey=${encodeURIComponent(KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ siteUrl: SITE, urlList: batch }),
    });
    const text = await res.text();
    if (/InvalidApiKey/i.test(text)) throw new Error(`Bing rejected the key (InvalidApiKey). ${KEY_HELP}`);
    if (!res.ok) throw new Error(`Bing SubmitUrlbatch HTTP ${res.status}: ${text.slice(0, 300)}`);
    console.log(`Submitted ${batch.length} URL(s) to Bing:`);
    batch.forEach((u) => console.log('  ' + u));
  }
}

main().catch((e) => {
  console.error(`::error::${e.message}`);
  process.exit(1);
});
