// Prayer times for every JAKIM zone (run by .github/workflows/solat-monthly.yml, or by hand).
// Downloads this year's and next year's timetable for all 60 zones from JAKIM e-Solat (the official source), checks
// this month against the waktusolat.app mirror of JAKIM, and writes assets/solat/<year>/<ZONE>.json plus
// tools-src/solat-data.json. A zone-year is replaced only by a complete year; a failed fetch keeps the old file.
// Usage (from repo root): node tools-src/solat-fetch.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const S = require('../assets/js/solat-core.js');
const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, '..', 'assets/solat');
const metaFile = path.join(dir, 'solat-data.json');
const UA = { 'User-Agent': 'BukitBesiSolat/1.0 (+https://tool.thebukitbesi.com/waktu-solat/)' };
const MONTHS = { Jan: 1, Feb: 2, Mac: 3, Mar: 3, Apr: 4, Mei: 5, May: 5, Jun: 6, Jul: 7, Ogos: 8, Aug: 8, Sep: 9, Okt: 10, Oct: 10, Nov: 11, Dis: 12, Dec: 12 };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJson(url, init = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { ...init, headers: { ...UA, ...(init.headers || {}) }, signal: AbortSignal.timeout(30000) });
      if (res.ok) return await res.json();
      console.warn(`${url}: HTTP ${res.status}`);
    } catch (e) { console.warn(`${url}: ${e.message}`); }
    await sleep(2000 * (attempt + 1));
  }
  return null;
}
const hm = s => { const m = /^(\d\d):(\d\d)/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : NaN; };
// JAKIM dates look like 01-Okt-2026 or 01-Ogos-2026 (Malay month abbreviations).
const jakimIso = s => { const m = /^(\d\d)-([A-Za-z]+)-(\d{4})$/.exec(s || ''); return m && MONTHS[m[2]] ? `${m[3]}-${String(MONTHS[m[2]]).padStart(2, '0')}-${m[1]}` : null; };

async function jakimYear(zone, year) {
  const body = new URLSearchParams({ datestart: `${year}-01-01`, dateend: `${year}-12-31` });
  const j = await getJson(`https://www.e-solat.gov.my/index.php?r=esolatApi/TakwimSolat&period=duration&zone=${zone}`,
    { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (!j || !Array.isArray(j.prayerTime)) return null;
  const days = new Map();
  for (const d of j.prayerTime) {
    const iso = jakimIso(d.date), t = [d.imsak, d.fajr, d.syuruk, d.dhuha, d.dhuhr, d.asr, d.maghrib, d.isha].map(hm);
    if (iso && iso.startsWith(year + '-') && t.every(Number.isFinite)) { const x = tidy(zone, iso, t); if (x) days.set(iso, x); }
  }
  return days;
}
// Fix JAKIM's typos (see tidy() in solat-core.js) and log them; a day still out of order fails the zone-year.
function tidy(zone, iso, t) {
  for (const note of S.tidy(t)) console.warn(`${zone} ${iso}: ${note}`);
  return S.ordered(t) ? t : (console.warn(`${zone} ${iso}: times out of order, ${t.map(S.hhmm).join(' ')}`), null);
}
// The mirror gives Unix seconds; Malaysia is UTC+8 all year.
async function mirrorMonth(zone, year, month) {
  const j = await getJson(`https://api.waktusolat.app/v2/solat/${zone}?year=${year}&month=${month}`);
  if (!j || !Array.isArray(j.prayers)) return null;
  const days = new Map();
  for (const d of j.prayers) {
    const t = ['imsak', 'fajr', 'syuruk', 'dhuha', 'dhuhr', 'asr', 'maghrib', 'isha'].map(k => { const x = new Date((d[k] + 8 * 3600) * 1000); return x.getUTCHours() * 60 + x.getUTCMinutes(); });
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`, x = tidy(zone, iso, t);
    if (x) days.set(iso, x);
  }
  return days;
}
async function mirrorYear(zone, year) {
  const days = new Map();
  for (let m = 1; m <= 12; m++) { const x = await mirrorMonth(zone, year, m); if (!x) return null; x.forEach((v, k) => days.set(k, v)); }
  return days;
}
const complete = (days, year) => days && days.size === S.daysInYear(year);

const old = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
const now = new Date(Date.now() + 8 * 3600e3), year = now.getUTCFullYear(), month = now.getUTCMonth() + 1;
const result = { fetchedAt: new Date().toISOString(), source: 'JAKIM e-Solat', years: {}, check: null };
for (const y of [year, year + 1]) {
  let ok = 0, mirror = 0;
  for (const [zone] of S.ZONES) {
    let days = await jakimYear(zone, y), from = 'jakim';
    // Only the current year is on the mirror; it is a copy of JAKIM's timetable.
    if (!complete(days, y) && y === year) { days = await mirrorYear(zone, y); from = 'mirror'; }
    if (!complete(days, y)) { console.warn(`${zone} ${y}: incomplete, keeping the old file`); continue; }
    const times = [...days.keys()].sort().map(k => days.get(k));
    fs.mkdirSync(path.join(out, String(y)), { recursive: true });
    fs.writeFileSync(path.join(out, String(y), zone + '.json'), S.encodeYear(zone, y, times));
    ok++; if (from === 'mirror') mirror++;
    await sleep(300);
  }
  result.years[y] = { zones: ok, fromMirror: mirror };
  console.log(`${y}: ${ok}/${S.ZONES.length} zones (${mirror} from the mirror)`);
}
// Cross-check this month, every zone, every time, against the second source.
let compared = 0, diffs = [];
for (const [zone] of S.ZONES) {
  const file = path.join(out, String(year), zone + '.json');
  if (!fs.existsSync(file)) continue;
  const data = S.decodeYear(fs.readFileSync(file, 'utf8')), m = await mirrorMonth(zone, year, month);
  if (!m) continue;
  for (const [iso, t] of m) {
    const ours = S.day(data, iso);
    if (!ours) continue;
    compared++;
    t.forEach((v, i) => { if (Math.abs(v - ours[i]) > 1) diffs.push(`${zone} ${iso} ${S.KEYS[i]}: JAKIM ${S.hhmm(ours[i])}, mirror ${S.hhmm(v)}`); });
  }
  await sleep(150);
}
result.check = { month: `${year}-${String(month).padStart(2, '0')}`, against: 'waktusolat.app (JAKIM mirror)', days: compared, differences: diffs.length };
if (diffs.length) console.warn(diffs.slice(0, 20).join('\n'));
if (!Object.values(result.years).some(y => y.zones)) { console.error('No zone fetched; keeping the old data.'); process.exit(0); }
// Keep a successful earlier year count when this run could not reach a source for that year.
for (const [y, v] of Object.entries(old.years || {})) if (result.years[y] && !result.years[y].zones) result.years[y] = v;
fs.writeFileSync(metaFile, JSON.stringify(result, null, 2) + '\n');
console.log(`Cross-check ${result.check.month}: ${compared} zone-days, ${diffs.length} differences over 1 minute`);
