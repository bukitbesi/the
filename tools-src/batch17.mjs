// Batch 17 renderers and bundles (LPPSA civil service housing financing, UPU merit). Same hook pattern as 13–16.
export function batch17({ require, esc, longDate }) {
  const fs = require('node:fs'), path = require('node:path');
  const renderers = {}, bundles = {};
  const CSS = '<style>' + fs.readFileSync(path.join(path.dirname(require.resolve('../assets/js/lppsa-core.js')), '../../tools-src/css/batch17.css'), 'utf8').replace(/\/\*[^]*?\*\//g, '').replace(/\s*\n\s*/g, '').trim() + '</style>';
  const opt = (v, t, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${esc(t)}</option>`;
  const tr = list => list.map(x => `<tr><th scope="row">${esc(x[0])}</th><td>${esc(x[1])}</td></tr>`).join('\n');

  // ---- LPPSA housing financing
  const lp = require('../assets/js/lppsa-core.js');
  const LDEF = { basic: '4500', allowances: '1100', mandatory: '850', debts: '400', others: '', age: '32', scheme: 'pencen', retireAge: '60', second: false, firstUsed: '', price: '', amount: '' };
  renderers.lppsa = lang => {
    const L = lang === 'ms' ? 1 : 0, k = L ? 'ms' : 'en', P = lp, F = P.FACTS, m = P.money;
    const v = P.view(LDEF, k);
    const limits = F.limits.map(([n, x], i) => `<tr><th scope="row">${i ? m(F.limits[i - 1][0] + 1, 0) + ' – ' + m(n, 0) : (L ? 'Sehingga ' : 'Up to ') + m(n, 0)}</th><td>${m(x, 0)}</td></tr>`).join('\n') +
      `\n<tr><th scope="row">${L ? 'Lebih ' : 'Over '}${m(10000, 0)}</th><td>${m(F.top, 0)}</td></tr>`;
    const yrs = [20, 25, 30, 35, 40];
    const inst = [100000, 300000, 500000, 750000].map(a => `<tr><th scope="row">${m(a, 0)}</th>${yrs.map(y => `<td>${m(P.instalment(a, 4, y * 12))}</td>`).join('')}</tr>`).join('\n');
    const blend = [[L ? 'Pertama RM800,000' : 'First RM800,000', 800000, 0], [L ? 'Kedua RM750,000 (pertama RM250,000)' : 'Second RM750,000 (first RM250,000)', 750000, 250000],
      [L ? 'Kedua RM250,000 (pertama RM750,000)' : 'Second RM250,000 (first RM750,000)', 250000, 750000], [L ? 'Pertama RM1,000,000' : 'First RM1,000,000', 1000000, 0]]
      .map(([t, a, u]) => `<tr><th scope="row">${t}</th><td>${P.rate(a, u).toFixed(2)}%</td><td>${m(P.instalment(a, P.rate(a, u), u ? F.secondMonths : F.months))}</td></tr>`).join('\n');
    const ex = P.calculate({ basic: 3371, allowances: 950, mandatory: 21, debts: 772, others: 63, age: 35, scheme: 'pencen' });
    return {
      HEAD_EXTRA: CSS, L_BIG: esc(v.big), L_SUB: esc(v.sub), L_GRID: v.grid.map(x => `<div><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join(''), L_ROWS: tr(v.rows), L_NOTE: esc(v.note),
      L_SCHEME: opt('pencen', L ? 'Pencen' : 'Pension', true) + opt('kwsp', 'KWSP / EPF'),
      L_SECOND: opt('no', L ? 'Pertama' : 'First', true) + opt('yes', L ? 'Kedua (pertama masih aktif)' : 'Second (first still active)'),
      L_LIMITS: limits, L_INST: inst, L_BLEND: blend,
      L_DEF_MAX: m(v.r.max, 0), L_DEF_PAY: m(v.r.pay), L_DEF_TABLE: m(v.r.table, 0), L_DEF_NET: m(v.r.net),
      L_EX_ROOM: m(ex.room), L_EX_PAY: m(ex.pay), L_EX_MAX: m(ex.max, 0),
      L_100K: m(P.instalment(100000, 4, 420)), L_100K40: m(P.instalment(100000, 4, 480)),
      L_VERIFIED: longDate(F.verified, lang), L_VERIFIED_ISO: F.verified
    };
  };
  bundles['lppsa.js'] = ['assets/js/lppsa-core.js', 'assets/js/lppsa-ui.js'];

  // ---- UPU merit
  const mc = require('../assets/js/merit-core.js');
  const MDEF = { mode: 'spm', pkg: 'A', universal: ['A+', 'A', 'A+', 'A+'], package: ['A', 'A+', 'A', 'A-'], others: ['A+', '', '', ''], cgpa: '3.50', stam: 'Jayyid Jiddan', koko: '7' };
  renderers.merit = lang => {
    const L = lang === 'ms' ? 1 : 0, k = L ? 'ms' : 'en', M = mc, F = M.FACTS;
    const v = M.view(MDEF, k);
    const grades = (sel, blank) => (blank ? opt('', L ? '— tiada —' : '— none —', sel === '') : '') + Object.keys(F.spm).map(g => opt(g, g, g === sel)).join('');
    const sel = (name, label, value, blank) => `<div class="field"><label for="${name}">${esc(label)}</label><select class="input" id="${name}" name="${name}">${grades(value, blank)}</select></div>`;
    const pair = items => items.reduce((h, x, i) => h + (i % 2 ? '' : '<div class="field-row">') + x + (i % 2 ? '</div>' : ''), '');
    const uni = L ? ['Bahasa Melayu', 'Bahasa Inggeris', 'Matematik', 'Sejarah'] : ['Bahasa Melayu', 'English', 'Mathematics', 'History (Sejarah)'];
    const fields = pair(uni.map((t, i) => sel('u' + (i + 1), t, MDEF.universal[i], false)));
    const pkgF = pair([0, 1, 2, 3].map(i => sel('p' + (i + 1), (L ? 'Pakej ' : 'Package ') + (i + 1), MDEF.package[i], true)));
    const othF = pair([0, 1, 2, 3].map(i => sel('o' + (i + 1), (L ? 'Lain ' : 'Other ') + (i + 1), MDEF.others[i], true)));
    const pkgNames = L ? { A: 'STEM A (Fizik, Kimia, Biologi, Matematik Tambahan)', B: 'STEM B (2 sains tulen + Matematik Tambahan + elektif)', C: 'STEM C (elektif STEM gunaan atau MPV)', KSI: 'Sastera dan Kemanusiaan' }
      : { A: 'STEM A (Physics, Chemistry, Biology, Add Maths)', B: 'STEM B (2 pure sciences + Add Maths + elective)', C: 'STEM C (applied STEM electives or a vocational subject)', KSI: 'Arts and Humanities' };
    const gradeTable = Object.entries(F.spm).map(([g, n]) => `<tr><th scope="row">${g}</th><td>${n}</td></tr>`).join('\n');
    const stpmTable = Object.entries(F.stpm).map(([g, n]) => `<tr><th scope="row">${g}</th><td>${n.toFixed(2)}</td></tr>`).join('\n');
    const cgTable = [4, 3.75, 3.5, 3.25, 3, 2.75, 2.5, 2].map(c => { const x = M.cgpa(c, 0); return `<tr><th scope="row">${c.toFixed(2)}</th><td>${x.academic.toFixed(2)}</td><td>${M.cgpa(c, 8).merit.toFixed(2)}</td><td>${M.cgpa(c, 10).merit.toFixed(2)}</td></tr>`; }).join('\n');
    const exC = M.spm({ pkg: 'C', universal: ['A', 'B', 'B+', 'A-'], package: ['A-'], others: ['A', 'A+'], koko: 9.5 });
    const exK = M.spm({ pkg: 'KSI', universal: ['A', 'B', 'A-', 'A+'], package: ['A-', 'A+'], others: ['B', 'B'], koko: 9.5 });
    return {
      HEAD_EXTRA: CSS, M_BIG: v.big, M_SUB: esc(v.sub), M_ROWS: tr(v.rows), M_NOTE: esc(v.note),
      M_MODE: opt('spm', L ? 'Lepasan SPM' : 'SPM leaver', true) + opt('cgpa', L ? 'STPM, Matrikulasi atau Asasi (PNGK)' : 'STPM, matriculation or asasi (CGPA)') + opt('stam', 'STAM'),
      M_PKG: F.packages.map(x => opt(x, pkgNames[x], x === 'A')).join(''), M_UNI: fields, M_PACK: pkgF, M_OTH: othF,
      M_STAM: Object.keys(F.stam).map(g => opt(g, `${g} (${F.stam[g].toFixed(2)})`, g === MDEF.stam)).join(''),
      M_GRADES_T: gradeTable, M_STPM_T: stpmTable, M_CG_T: cgTable,
      M_EXA: v.r.academic.toFixed(2), M_EXM: v.r.merit.toFixed(2), M_EXC: exC.merit.toFixed(2), M_EXCA: exC.academic.toFixed(2), M_EXK: exK.merit.toFixed(2), M_EXKA: exK.academic.toFixed(2),
      M_CG350: M.cgpa(3.5, 9).merit.toFixed(2), M_SESSION: F.session,
      M_VERIFIED: longDate(F.verified, lang), M_VERIFIED_ISO: F.verified
    };
  };
  bundles['merit.js'] = ['assets/js/merit-core.js', 'assets/js/merit-ui.js'];

  return { renderers, bundles };
}
