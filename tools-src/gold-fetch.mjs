// Daily gold snapshot for the gold price pages (run by .github/workflows/gold-daily.yml, or by hand).
// Fetches BNM Kijang Emas (latest and this and last month's history), the USD/MYR rate and spot gold, and writes
// tools-src/gold-data.json, which build.mjs renders into the HTML so search engines see today's price.
// Usage (from repo root): node tools-src/gold-fetch.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const G = require('../assets/js/gold-core.js');
const FX = require('../assets/js/fx-core.js');
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'gold-data.json');
const fxFile = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fx-data.json');
const BNM = { Accept: 'application/vnd.BNM.API.v1+json', 'User-Agent': 'BukitBesiGold/1.0 (+https://tool.thebukitbesi.com/harga-emas-hari-ini/)' };

async function getJson(url, headers = {}) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
    if (!res.ok) { console.warn(`${url}: HTTP ${res.status}`); return null; }
    return await res.json();
  } catch (e) { console.warn(`${url}: ${e.message}`); return null; }
}

const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
const now = new Date();
const months = [0, 1].map(back => { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1)); return [d.getUTCFullYear(), d.getUTCMonth() + 1]; });
const [allFx, allFxBackup, kijangJson, fxJson, fxBackup, spotJson, ...monthJson] = await Promise.all([
  getJson('https://api.bnm.gov.my/public/exchange-rate?session=1200&quote=rm', BNM),
  getJson('https://api.frankfurter.app/latest?from=MYR'),
  getJson('https://api.bnm.gov.my/public/kijang-emas', BNM),
  getJson('https://api.bnm.gov.my/public/exchange-rate/USD', BNM),
  getJson('https://api.frankfurter.app/latest?from=USD&to=MYR'),
  getJson('https://api.gold-api.com/price/XAU'),
  ...months.map(([y, m]) => getJson(`https://api.bnm.gov.my/public/kijang-emas/year/${y}/month/${m}`, BNM))
]);

// All BNM noon rates for the currency converter (ECB backup); keep the old file when neither answers.
const fxSnap = FX.parseBnm(allFx) || FX.parseFrankfurter(allFxBackup);
if (fxSnap) { fs.writeFileSync(fxFile, JSON.stringify({ fetchedAt: now.toISOString(), ...fxSnap }, null, 2) + '\n'); console.log(`FX: ${fxSnap.source} ${fxSnap.date}, ${Object.keys(fxSnap.rates).length} currencies`); }
else console.warn('FX: no rate source answered; keeping the old fx-data.json.');

const kijang = G.parseKijang(kijangJson) || old.kijang || null;
const snap = {
  fetchedAt: now.toISOString(),
  spot: G.parseSpot(spotJson) || null,
  fx: G.parseBnmFx(fxJson) || G.parseFrankfurter(fxBackup) || old.fx || null,
  kijang,
  history: G.mergeHistory(old.history, [].concat(...monthJson.map(G.parseKijangHistory), kijang ? [{ date: kijang.date, buy: kijang.oneOz.buy, sell: kijang.oneOz.sell }] : []))
};
if (!kijang && !snap.spot) { console.error('No gold price source answered; keeping the old file.'); process.exit(0); }
// Yesterday's (or the last run's) pure-gold price, for the day's change on the page.
const before = G.pureGram(old), today = now.toISOString().slice(0, 10);
snap.prev = old.fetchedAt && old.fetchedAt.slice(0, 10) !== today && before ? { date: old.fetchedAt.slice(0, 10), pure: before.rm } : old.prev || null;
fs.writeFileSync(file, JSON.stringify(snap, null, 2) + '\n');
console.log(`Gold: kijang ${kijang ? kijang.date + ' sell ' + kijang.oneOz.sell : 'none'}, spot ${snap.spot ? snap.spot.usdOz : 'none'}, fx ${snap.fx ? snap.fx.usdMyr : 'none'}, history ${snap.history.length} days`);
