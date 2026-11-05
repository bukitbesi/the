// Batch 18 renderers and bundles (list to paragraph, duplicate line remover, line sorter, unit converter, IP lookup).
// Same hook pattern as 13–17: each renderer fills the first result, tables and FAQ figures from the tested cores.
export function batch18({ require, esc, longDate }) {
  const fs = require('node:fs'), path = require('node:path');
  const renderers = {}, bundles = {};
  const here = path.dirname(require.resolve('../assets/js/lines-core.js'));
  const CSS = '<style>' + fs.readFileSync(path.join(here, '../../tools-src/css/batch18.css'), 'utf8').replace(/\/\*[^]*?\*\//g, '').replace(/\s*\n\s*/g, '').trim() + '</style>';
  const opt = (v, t, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(t)}</option>`;
  const tr = list => list.map(x => `<tr><th scope="row">${esc(x[0])}</th><td>${esc(x[1])}</td></tr>`).join('\n');
  const pre = s => `<code>${esc(s).replace(/\n/g, '<br>')}</code>`;

  // ---- the three line tools
  const L = require('../assets/js/lines-core.js');
  const base = (tool, sample) => {
    const r = L.run(tool, sample), s = L.stats(sample);
    return { HEAD_EXTRA: CSS, LN_IN: esc(sample), LN_OUT: esc(r.text), LN_SUMMARY: esc(r.summary),
      LN_STATS: esc(L.plural(s.lines, 'line', 'lines') + ' · ' + L.plural(s.words, 'word', 'words') + ' · ' + L.plural(s.chars, 'character', 'characters')),
      LN_VERIFIED: longDate(L.FACTS.verified, 'en'), LN_VERIFIED_ISO: L.FACTS.verified };
  };

  const LIST = '- Nasi lemak\n- Roti canai\n- Char kuey teow\n- Satay\n- Teh tarik';
  renderers.lineslist = () => {
    const abc = 'Apples\nBananas\nCherries';
    const seps = [['Comma', { sep: 'comma' }], ['Comma with "and" (Oxford comma)', { sep: 'and' }], ['Comma with "and", no Oxford comma', { sep: 'and', oxford: false }],
      ['Comma with "or"', { sep: 'or' }], ['Semicolon', { sep: 'semicolon' }], ['Pipe', { sep: 'pipe' }], ['Single quotes, comma (SQL IN list)', { sep: 'comma', quote: "'" }],
      ['Double quotes, comma (CSV)', { sep: 'comma', quote: '"' }], ['Space', { sep: 'space' }]];
    const steps = '1. Open MySejahtera\n2. Tap Profile\n3. Choose Language';
    const bullets = [['Dash (Markdown)', 'dash'], ['Bullet •', 'bullet'], ['Numbers 1.', 'number'], ['Numbers 1)', 'paren'], ['Letters a.', 'letter'], ['Checklist - [ ]', 'check'], ['HTML <ul>', 'ul'], ['None', 'none']];
    const para = 'Bring your MyKad, two passport photos and the RM20 fee.';
    return {
      ...base('list', LIST),
      LN_SEP_ROWS: seps.map(([t, o]) => `<tr><th scope="row">${esc(t)}</th><td>${pre(L.listToParagraph(abc, o).text)}</td></tr>`).join('\n'),
      LN_STEPS_IN: pre(steps), LN_STEPS_OUT: esc(L.listToParagraph(steps, { sep: 'sentence' }).text),
      LN_BULLET_ROWS: bullets.map(([t, b]) => `<tr><th scope="row">${esc(t)}</th><td>${pre(L.paragraphToList('red, green and blue', { bullet: b }).text)}</td></tr>`).join('\n'),
      LN_PARA: esc(para), LN_PARA_OUT: pre(L.paragraphToList(para, { dropEnd: true }).text),
      LN_ABC_AND: esc(L.listToParagraph(abc, { sep: 'and' }).text), LN_ABC_NOOX: esc(L.listToParagraph(abc, { sep: 'and', oxford: false }).text),
      LN_ABC_SQL: esc(L.listToParagraph(abc, { sep: 'comma', quote: "'" }).text), LN_DAN: esc(L.listToParagraph('epal\npisang\nceri', { sep: 'and', lang: 'ms' }).text)
    };
  };

  const EMAILS = 'ali@example.com\nsiti@example.com\nAli@example.com\nchong@example.com\nsiti@example.com\n\nraju@example.com\nsiti@example.com';
  renderers.linesdedupe = () => {
    const modes = [['Remove duplicates (default)', {}], ['Ignore upper and lower case', { ignoreCase: true }], ['Ignore case, keep the last copy', { ignoreCase: true, keep: 'last' }],
      ['Unique lines only (drop every repeated line)', { ignoreCase: true, mode: 'unique' }], ['Duplicates only (one copy of each)', { ignoreCase: true, mode: 'dupes' }]];
    const pdf = 'Applicants must bring\ntheir MyKad and a copy\nof the offer letter.\n\nForms are avail-\nable at the counter.';
    const brk = [['Remove all line breaks (one line)', 'join'], ['Remove line breaks, keep paragraphs', 'paragraphs'], ['Keep paragraphs and rejoin hyphenated words', 'hyphens'],
      ['Collapse several blank lines into one', 'collapse'], ['Remove empty lines', 'empty'], ['One sentence per line', 'sentences'], ['Add <br> at each line break (HTML)', 'br'], ['Lines to comma-separated', 'comma']];
    const d0 = L.dedupe(EMAILS), d1 = L.dedupe(EMAILS, { ignoreCase: true, removeEmpty: true });
    return {
      ...base('dedupe', EMAILS),
      LN_MODE_ROWS: modes.map(([t, o]) => `<tr><th scope="row">${esc(t)}</th><td>${pre(L.dedupe(EMAILS, { removeEmpty: true, ...o }).text)}</td></tr>`).join('\n'),
      LN_PDF: pre(pdf), LN_BRK_ROWS: brk.map(([t, m]) => `<tr><th scope="row">${esc(t)}</th><td>${pre(L.breaks(pdf, m))}</td></tr>`).join('\n'),
      LN_D0_REMOVED: d0.removed, LN_D0_TOTAL: d0.total, LN_D1_REMOVED: d1.removed, LN_D1_KEPT: d1.lines,
      LN_JOIN_EX: esc(L.breaks('first line\nsecond line', 'join')), LN_HYPH_EX: esc(L.breaks('avail-\nable', 'hyphens'))
    };
  };

  const SORT = 'Item 10\nitem 2\nBanana\napple\nItem 1\nCherry';
  renderers.linessort = () => {
    const orders = [['A to Z, natural (default)', {}], ['Z to A', { order: 'za' }], ['A to Z, plain text order (10 before 2)', { natural: false }], ['Case-sensitive (capitals first)', { caseSensitive: true }],
      ['Shortest to longest', { order: 'len' }], ['Reverse the current order', { order: 'reverse' }]];
    const money = 'RM1,200 rent\nRM 85 phone\nRM 1,050.50 car\nRM-5 refund';
    const names = 'Siti Aminah\nAhmad Zaki\nLim Wei';
    const csv = 'Ali,32\nBala,25\nChong,41';
    return {
      ...base('sort', SORT),
      LN_ORDER_ROWS: orders.map(([t, o]) => `<tr><th scope="row">${esc(t)}</th><td>${pre(L.sort(SORT, o).text)}</td></tr>`).join('\n'),
      LN_MONEY_IN: pre(money), LN_MONEY_OUT: pre(L.sort(money, { order: 'num' }).text),
      LN_NAMES_IN: pre(names), LN_NAMES_OUT: pre(L.sort(names, { by: 'last' }).text),
      LN_CSV_IN: pre(csv), LN_CSV_OUT: pre(L.sort(csv, { by: 'col', col: 2, order: 'num' }).text),
      LN_NAT: esc(L.sort('file10.txt\nfile2.txt\nfile1.txt').text.replace(/\n/g, ', ')), LN_PLAIN: esc(L.sort('file10.txt\nfile2.txt\nfile1.txt', { natural: false }).text.replace(/\n/g, ', '))
    };
  };
  bundles['lines.js'] = ['assets/js/lines-core.js', 'assets/js/lines-ui.js'];

  // ---- unit converter
  const U = require('../assets/js/unit-core.js');
  const UDEF = { cat: 'length', from: 'ft', to: 'cm', value: '5.5' };
  const QUICK = {
    length: [['in', 'cm'], ['ft', 'cm'], ['ft', 'm'], ['m', 'ft'], ['km', 'mi'], ['mi', 'km'], ['yd', 'm'], ['nmi', 'km']],
    mass: [['kg', 'lb'], ['lb', 'kg'], ['kati', 'kg'], ['kg', 'kati'], ['tahil', 'g'], ['pikul', 'kg'], ['oz', 'g'], ['st', 'kg']],
    volume: [['gal', 'l'], ['impgal', 'l'], ['gantang', 'l'], ['cupak', 'l'], ['cup', 'ml'], ['mcup', 'ml'], ['tbsp', 'ml'], ['tsp', 'ml'], ['floz', 'ml'], ['bbl', 'l']],
    area: [['ft2', 'm2'], ['m2', 'ft2'], ['ac', 'ha'], ['ha', 'ac'], ['ac', 'ft2'], ['km2', 'mi2']],
    temperature: [['c', 'f', 0], ['c', 'f', 30], ['c', 'f', 37], ['c', 'f', 100], ['f', 'c', 98.6], ['c', 'k', 25]],
    speed: [['kmh', 'mph', 110], ['kmh', 'mph', 90], ['mph', 'kmh', 60], ['kn', 'kmh'], ['ms', 'kmh']],
    time: [['h', 'min'], ['d', 'h'], ['wk', 'h'], ['yr', 'd'], ['h', 's']],
    data: [['GB', 'MB'], ['GiB', 'MiB'], ['TB', 'GiB'], ['Mbit', 'MB', 100], ['Mbit', 'MB', 500], ['Gbit', 'MB']],
    pressure: [['psi', 'bar', 32], ['psi', 'kpa', 35], ['bar', 'psi'], ['atm', 'psi'], ['kgcm2', 'psi'], ['mmhg', 'kpa', 120]],
    energy: [['kwh', 'kj'], ['kcal', 'kj'], ['kwh', 'btu'], ['kj', 'kcal'], ['btu', 'kj']],
    power: [['hp', 'kw'], ['kw', 'hp'], ['ps', 'kw'], ['btuh', 'w', 9000], ['btuh', 'w', 12000]],
    fuel: [['l100', 'kml', 8], ['kml', 'l100', 15], ['mpg', 'l100', 30], ['kml', 'mpg', 12], ['mpguk', 'kml', 40]]
  };
  renderers.unit = lang => {
    const ms = lang === 'ms', k = ms ? 'ms' : 'en', v = U.view(UDEF, k);
    const f = (n, s) => U.format(n, s || 6, k), c = (val, cat, a, b) => U.convert(val, cat, a, b);
    const uopt = (cat, sel) => U.CATS[cat].units.map(u => opt(u[0], U.name(u, k) + ' (' + u[4] + ')', u[0] === sel)).join('');
    const quick = U.ORDER.map(cat => {
      const C = U.CATS[cat], rows = QUICK[cat].map(([a, b, val = 1]) => {
        const A = U.unit(cat, a), B = U.unit(cat, b);
        return `<tr><th scope="row"><a href="#uForm" data-u="${cat} ${a} ${b} ${val}">${esc(f(val, 8))} ${esc(A[4])} ${ms ? 'ke' : 'to'} ${esc(B[4])}</a></th><td>${esc(f(c(val, cat, a, b), 6))} ${esc(B[4])}</td></tr>`;
      }).join('\n');
      return `<h3 id="q-${cat}">${esc(C[k])}</h3>\n<div class="table-wrap" tabindex="0" role="region" aria-labelledby="q-${cat}"><table class="data u-q"><thead><tr><th scope="col">${ms ? 'Tukar' : 'Convert'}</th><th scope="col">${ms ? 'Jawapan' : 'Answer'}</th></tr></thead><tbody>\n${rows}\n</tbody></table></div>`;
    }).join('\n');
    const kati = [0.5, 1, 2, 5, 10, 100].map(n => `<tr><th scope="row">${f(n)} kati</th><td>${f(c(n, 'mass', 'kati', 'kg'), 6)} kg</td><td>${f(c(n, 'mass', 'kati', 'g'), 6)} g</td><td>${f(c(n, 'mass', 'kati', 'lb'), 6)} lb</td></tr>`).join('\n');
    const kg2kati = [1, 2, 5, 10].map(n => `${f(n)} kg = ${f(c(n, 'mass', 'kg', 'kati'), 4)} kati`).join(', ');
    const trad = [['Tahil', ms ? '1/16 kati' : '1/16 kati', f(c(1, 'mass', 'tahil', 'g'), 6) + ' g'], ['Kati', ms ? '16 tahil = 1⅓ paun' : '16 tahil = 1⅓ lb', f(c(1, 'mass', 'kati', 'g'), 6) + ' g'],
      ['Pikul', ms ? '100 kati' : '100 kati', f(c(1, 'mass', 'pikul', 'kg'), 6) + ' kg'], ['Cupak', ms ? '¼ gantang' : '¼ gantang', f(c(1, 'volume', 'cupak', 'l'), 6) + ' L'],
      ['Gantang', ms ? '1 gelen imperial' : '1 imperial gallon', f(c(1, 'volume', 'gantang', 'l'), 6) + ' L']]
      .map(r => `<tr><th scope="row">${r[0]}</th><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('\n');
    return {
      HEAD_EXTRA: CSS,
      U_CAT: U.ORDER.map(cat => opt(cat, U.CATS[cat][k], cat === UDEF.cat)).join(''),
      U_FROM: uopt(UDEF.cat, v.from), U_TO: uopt(UDEF.cat, v.to), U_VALUE: UDEF.value,
      U_BIG: esc(v.big), U_SUB: esc(v.sub), U_RULE: esc(v.rule), U_ROWS: tr(v.rows),
      U_QUICK: quick, U_KATI: kati, U_KG2KATI: esc(kg2kati), U_TRAD: trad, U_CAT_COUNT: U.ORDER.length,
      U_UNIT_COUNT: U.ORDER.reduce((n, cat) => n + U.CATS[cat].units.length, 0),
      U_KATI_G: f(c(1, 'mass', 'kati', 'g'), 5), U_KATI_KG: f(c(1, 'mass', 'kati', 'kg'), 5), U_KG_KATI: f(c(1, 'mass', 'kg', 'kati'), 4), U_TAHIL_G: f(c(1, 'mass', 'tahil', 'g'), 4),
      U_PIKUL_KG: f(c(1, 'mass', 'pikul', 'kg'), 4), U_GANTANG_L: f(c(1, 'volume', 'gantang', 'l'), 6), U_CUPAK_L: f(c(1, 'volume', 'cupak', 'l'), 4),
      U_55FT: f(c(5.5, 'length', 'ft', 'cm'), 6), U_170CM: (() => { const inch = c(170, 'length', 'cm', 'in'); return Math.floor(inch / 12) + ' ft ' + f(inch % 12, 3) + ' in'; })(),
      U_110KMH: f(c(110, 'speed', 'kmh', 'mph'), 4), U_32PSI: f(c(32, 'pressure', 'psi', 'bar'), 3), U_32PSI_KPA: f(c(32, 'pressure', 'psi', 'kpa'), 4),
      U_HP: f(c(1, 'power', 'hp', 'kw'), 4), U_PS: f(c(1, 'power', 'ps', 'kw'), 4), U_TB_GIB: f(c(1, 'data', 'TB', 'GiB'), 5), U_100MBIT: f(c(100, 'data', 'Mbit', 'MB'), 4),
      U_8L100: f(c(8, 'fuel', 'l100', 'kml'), 4), U_30C: f(c(30, 'temperature', 'c', 'f'), 4), U_GAL: f(c(1, 'volume', 'gal', 'l'), 6), U_IMPGAL: f(c(1, 'volume', 'impgal', 'l'), 6),
      U_1BTU9000: f(c(9000, 'power', 'btuh', 'w'), 4), U_ACRE_M2: f(c(1, 'area', 'ac', 'm2'), 8), U_KG_LB: f(c(1, 'mass', 'kg', 'lb'), 6),
      U_VERIFIED: longDate(U.FACTS.verified, lang), U_VERIFIED_ISO: U.FACTS.verified
    };
  };
  bundles['unit.js'] = ['assets/js/unit-core.js', 'assets/js/unit-ui.js'];

  // ---- IP lookup. The first paint shows 8.8.8.8 with its real ARIN record (saved 5 November 2026, also the test
  // fixture) so the table has its final height before the visitor's own lookup replaces it.
  const I = require('../assets/js/ip-core.js');
  const fixture = name => JSON.parse(fs.readFileSync(path.join(here, '../../tools-src/tests/fixtures/rdap-' + name + '.json'), 'utf8'));
  renderers.ip = lang => {
    const ms = lang === 'ms', k = ms ? 'ms' : 'en';
    const g = I.info('8.8.8.8', k), tm = I.parseRdap(fixture('tm'));
    const special = I.SPECIAL.filter(x => !['ietf', 'relay6to4', 'discard', 'nat64', 'teredo', '6to4', 'bench'].includes(x[1]) || x[0] === '198.18.0.0/15')
      .map(x => `<tr><th scope="row"><code>${x[0]}</code></th><td>${esc(I.TYPES[x[1]][ms ? 1 : 0])}</td><td>${x[2]}</td></tr>`).join('\n');
    const ex = I.info('175.139.0.1', k);
    return {
      HEAD_EXTRA: CSS, I_FOR: '8.8.8.8', I_ROWS: tr(I.rows(g, I.parseRdap(fixture('arin')), ['dns.google'], k)),
      I_SPECIAL: special, I_TM_ROWS: tr(I.rows(ex, tm, null, k).slice(0, 9)),
      I_DEC: g.decimal, I_BIN: g.binary, I_REV: g.reverse, I_V6REV: I.info('2001:db8::1').reverse,
      I_TM_ORG: esc(tm.org), I_TM_CIDR: tm.cidr, I_TM_ABUSE: tm.abuse,
      I_VERIFIED: longDate(I.FACTS.verified, lang), I_VERIFIED_ISO: I.FACTS.verified
    };
  };
  bundles['ip.js'] = ['assets/js/ip-core.js', 'assets/js/ip-ui.js'];

  return { renderers, bundles };
}
