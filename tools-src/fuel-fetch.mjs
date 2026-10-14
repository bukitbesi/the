// Weekly fuel price snapshot for the fuel cost calculator (run by .github/workflows/fuel-weekly.yml, or by hand).
// Reads the Ministry of Finance's weekly retail prices from data.gov.my (CC BY 4.0) and writes tools-src/fuel-data.json,
// which build.mjs renders into the pages so search engines see this week's prices.
// Usage (from repo root): node tools-src/fuel-fetch.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const F = require('../assets/js/fuel-core.js');
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fuel-data.json');
const API = 'https://api.data.gov.my/data-catalogue?id=fuelprice&filter=level@series_type&sort=-date&limit=60';

const old = JSON.parse(fs.readFileSync(file, 'utf8'));
let json = null;
try {
  const res = await fetch(API, { headers: { 'User-Agent': 'BukitBesiFuel/1.0 (+https://tool.thebukitbesi.com/kalkulator-minyak/)' }, signal: AbortSignal.timeout(30000) });
  if (res.ok) json = await res.json(); else console.warn(`data.gov.my: HTTP ${res.status}`);
} catch (e) { console.warn(`data.gov.my: ${e.message}`); }
const fresh = F.parseApi(json);
if (!fresh.length) { console.error('No fuel prices from data.gov.my; keeping the old file.'); process.exit(0); }
const history = F.mergeHistory(old.history, fresh, 52);
const last = history[history.length - 1];
if (last.date === old.history[old.history.length - 1].date && JSON.stringify(history) === JSON.stringify(old.history)) {
  console.log(`Fuel: no new week (latest ${last.date}).`); process.exit(0);
}
fs.writeFileSync(file, JSON.stringify({ fetchedAt: new Date().toISOString(), source: old.source, history }, null, 1) + '\n');
console.log(`Fuel: ${last.date} RON95 ${last.ron95} BUDI95 ${last.ron95_budi95} RON97 ${last.ron97} diesel ${last.diesel}`);
