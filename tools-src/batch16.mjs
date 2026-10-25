// Batch 16 renderers and bundles (MyKad number decoder, civil service pension calculator). Same hook pattern as 13–15.
export function batch16({ require, esc, longDate }) {
  const fs = require('node:fs'), path = require('node:path');
  const renderers = {}, bundles = {};
  const CSS = '<style>' + fs.readFileSync(path.join(path.dirname(require.resolve('../assets/js/ic-core.js')), '../../tools-src/css/batch16.css'), 'utf8').replace(/\/\*[^]*?\*\//g, '').replace(/\s*\n\s*/g, '').trim() + '</style>';
  const opt = (v, t, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${esc(t)}</option>`;

  // ---- MyKad number decoder
  const ic = require('../assets/js/ic-core.js');
  const SAMPLE = '900101-14-5679';
  renderers.ic = lang => {
    const L = lang === 'ms' ? 1 : 0, k = L ? 'ms' : 'en', C = ic, today = C.FACTS.verified;
    const MON = (L ? 'Januari Februari Mac April Mei Jun Julai Ogos September Oktober November Disember' : 'January February March April May June July August September October November December').split(' ');
    const DAY = L ? ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const long = iso => { const p = iso.split('-').map(Number); return `${DAY[new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()]}, ${p[2]} ${MON[p[1] - 1]} ${p[0]}`; };
    const r = C.decode(SAMPLE, k, today, '');
    const labels = L ? ['Tarikh lahir', 'Umur hari ini', 'Tempat lahir', 'Kod tempat lahir', 'Digit akhir', 'Nombor (bertopeng)'] : ['Date of birth', 'Age today', 'Place of birth', 'Place-of-birth code', 'Last digit', 'Number (masked)'];
    const vals = [long(r.birth), `${r.age}${L ? ' tahun' : ' years'}`, `${r.place.name} (${L ? 'Lahir di Malaysia' : 'Born in Malaysia'})`, String(r.pb).padStart(2, '0'), `${L ? 'Lelaki' : 'Male'} (${r.digits[11]})`, C.mask(r.digits)];
    const rows = labels.map((l, i) => `<tr><th scope="row">${l}</th><td>${esc(vals[i])}</td></tr>`).join('\n');
    const pad = c => String(c).padStart(2, '0');
    const states = Object.entries(C.STATES).map(([s, codes]) => `<tr><th scope="row">${esc(s)}</th><td>${codes.map(pad).join(', ')}</td></tr>`).join('\n') +
      `\n<tr><th scope="row">${L ? 'Negeri tidak diketahui' : 'State not known'}</th><td>82</td></tr>`;
    const abroad = Object.entries(C.ABROAD).filter(([c]) => c !== '82').map(([c, n]) => `<tr><th scope="row">${c}</th><td>${esc(n[L])}</td></tr>`).join('\n');
    return {
      HEAD_EXTRA: CSS, C_SAMPLE: SAMPLE, C_BIRTH: esc(long(r.birth)), C_SUB: esc(`${r.age}${L ? ' tahun' : ' years'} · ${r.place.name} · ${L ? 'Lelaki' : 'Male'}`), C_ROWS: rows,
      C_CENTURY: opt('', L ? 'Automatik (tarikh terkini yang mungkin)' : 'Automatic (most recent possible date)', true) + opt('19', '19xx') + opt('20', '20xx'),
      C_STATES: states, C_ABROAD: abroad, C_STATE_COUNT: Object.values(C.STATES).flat().length,
      C_VERIFIED: longDate(C.FACTS.verified, lang), C_VERIFIED_ISO: C.FACTS.verified
    };
  };
  bundles['ic.js'] = ['assets/js/ic-core.js', 'assets/js/ic-ui.js'];

  return { renderers, bundles };
}
