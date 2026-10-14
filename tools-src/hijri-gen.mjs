// Regenerates FACTS.lengths in assets/js/hijri-core.js: Malaysia's takwim month lengths for 1400–1500H from the
// MABIMS imkanur rukyah criteria, computed with astronomy-engine (MIT) for Malaysia's western horizon (Langkawi).
// From Ramadan 1443H: moon altitude ≥ 3° and elongation ≥ 6.4° at sunset; before: altitude ≥ 2° and
// (elongation ≥ 3° or age ≥ 8 h). Airless topocentric altitude, topocentric elongation; this reproduces JAKIM's
// published takwim dates (see tools-src/tests/hijri.test.mjs).
// Usage (from repo root): npm i --no-save astronomy-engine@2.1.19 && node tools-src/hijri-gen.mjs
import * as A from 'astronomy-engine';

const obs = new A.Observer(6.335, 99.73, 10);
const DAY = 864e5, MYT = 8 * 3600e3;
const isNew = (y, m) => y > 1443 || (y === 1443 && m >= 9);

// Is the crescent visible by the criteria at sunset on the Malaysian calendar day that starts at `midnight`?
function visible(midnight, y, m) {
  const sunset = A.SearchRiseSet('Sun', obs, -1, new A.AstroTime(new Date(midnight.getTime() + 6 * 3600e3)), 1);
  if (!sunset) return false;
  let conj = A.SearchMoonPhase(0, sunset.AddDays(-40), 45);
  for (let next; (next = A.SearchMoonPhase(0, conj.AddDays(1), 40)).ut <= sunset.ut;) conj = next;
  const age = (sunset.ut - conj.ut) * 24;
  if (age < 0 || age > 72) return false;
  const moon = A.Equator('Moon', sunset, obs, true, true), sun = A.Equator('Sun', sunset, obs, true, true);
  const alt = A.Horizon(sunset, obs, moon.ra, moon.dec, null).altitude, elong = A.AngleBetween(moon.vec, sun.vec);
  return isNew(y, m) ? alt >= 3 && elong >= 6.4 : alt >= 2 && (elong >= 3 || age >= 8);
}

let y = 1400, m = 1, prev = null, hex = '', bits = 0;
// 1 Muharram 1400 was 21 November 1979; start looking a few evenings before.
for (let d = new Date(Date.UTC(1979, 10, 15) - MYT); y <= 1500;) {
  if (!visible(d, y, m)) { d = new Date(d.getTime() + DAY); continue; }
  const start = new Date(d.getTime() + DAY);
  if (prev) {
    if (Math.round((start - prev) / DAY) === 30) bits |= 1 << (m - 1);
    if (++m > 12) { hex += bits.toString(16).padStart(3, '0'); bits = 0; m = 1; y++; }
  } else console.log('1 Muharram 1400 =', new Date(start.getTime() + MYT).toISOString().slice(0, 10));
  prev = start;
  d = new Date(start.getTime() + 26 * DAY);
}
console.log(hex);
