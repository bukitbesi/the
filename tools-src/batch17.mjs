// Batch 17 renderers and bundles (LPPSA civil service housing financing). Same hook pattern as 13–16.
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

  return { renderers, bundles };
}
