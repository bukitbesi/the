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

  // ---- civil service pension calculator
  const pc = require('../assets/js/pencen-core.js');
  const PDEF = { birth: '1966-06-15', appointed: '1993-07-01', retire: '', salary: '6000', allowances: '800', gcrDays: '180', gender: 'm' };
  const ADEF = { salary: '5000', months: '360', retired: '2020-05-01', jusa: false, pkkp: '' };
  renderers.pencen = lang => {
    const L = lang === 'ms' ? 1 : 0, k = L ? 'ms' : 'en', P = pc, F = P.FACTS, m = P.money;
    const v = P.view(PDEF, k), a = P.viewAdjusted(ADEF, k);
    const tr = list => list.map(x => `<tr><th scope="row">${esc(x[0])}</th><td>${esc(x[1])}</td></tr>`).join('\n');
    const grid = v.grid.map(x => `<div><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join('');
    const table = [120, 180, 240, 300, 360].map(n => { const p = P.pension(4000, n); return `<tr><th scope="row">${n} (${n / 12} ${L ? 'tahun' : 'years'})</th><td>${(p.share * 100).toFixed(2).replace(/\.?0+$/, '')}%</td><td>${m(p.pension)}</td><td>${m(P.gratuity(4000, n))}</td></tr>`; }).join('\n');
    const sspa = [3000, 5000, 8000].map(sal => { const x = P.adjusted({ salary: sal, months: 360, retired: '2020-01-01' }); return `<tr><th scope="row">${m(sal)}</th><td>${m(x.steps[0].after)}</td><td>${m(x.steps[1].after)}</td><td>${m(x.original)} → ${m(x.pension)}</td></tr>`; }).join('\n');
    const ex = { p1: P.pension(5440.60, 386).pension, g1: P.gratuity(5440.60, 386), p2: P.pension(2203.56, 255).pension, g2: P.gratuity(2203.56, 255) };
    const opt2 = P.retiree({ birth: '1980-03-10', appointed: '2005-01-01', retire: '2026-01-01', salary: 5000, gcrDays: 180 });
    return {
      HEAD_EXTRA: CSS, P_BIG: esc(v.big), P_SUB: esc(v.sub), P_GRID: grid, P_ROWS: tr(v.rows), P_NOTE: esc(v.note),
      A_BIG: esc(a.big), A_SUB: esc(a.sub), A_ROWS: tr(a.rows), A_NOTE: esc(a.note),
      P_GENDER: opt('m', L ? 'Lelaki' : 'Male', true) + opt('f', L ? 'Perempuan' : 'Female'),
      P_GROUP: opt('sp', L ? 'Pelaksana atau Pengurusan & Profesional' : 'Support or Management & Professional', true) + opt('jusa', L ? 'Pengurusan Tertinggi (JUSA)' : 'Top Management (JUSA)'),
      P_TABLE: table, P_SSPA: sspa,
      P_EX1_PEN: m(ex.p1), P_EX1_GRAT: m(ex.g1), P_EX2_PEN: m(ex.p2), P_EX2_GRAT: m(ex.g2),
      P_DEF_PEN: m(v.r.pension), P_DEF_GRAT: m(v.r.gratuity), P_DEF_GCR: m(v.r.gcr), P_DEF_LUMP: m(v.r.lump),
      P_OPT_PEN: m(opt2.pension), P_OPT_GRAT: m(opt2.gratuity), P_OPT_START: P.date(opt2.pensionStarts, k),
      P_ADJ_PEN: m(a.a.pension), P_ADJ_ORIG: m(a.a.original),
      P_VERIFIED: longDate(F.verified, lang), P_VERIFIED_ISO: F.verified
    };
  };
  bundles['pencen.js'] = ['assets/js/pencen-core.js', 'assets/js/pencen-ui.js'];

  return { renderers, bundles };
}
