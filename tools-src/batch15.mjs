// Batch 15 renderers and bundles (invoice/quotation maker, LHDN e-invoice checker). Same hook pattern as batch13/14.
export function batch15({ require, esc, longDate }) {
  const fs = require('node:fs'), path = require('node:path');
  const renderers = {}, bundles = {};
  const CSS = '<style>' + fs.readFileSync(path.join(path.dirname(require.resolve('../assets/js/invoice-core.js')), '../../tools-src/css/batch15.css'), 'utf8').replace(/\/\*[^]*?\*\//g, '').replace(/\s*\n\s*/g, '').trim() + '</style>';
  const opt = (v, t, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${esc(t)}</option>`;

  // ---- invoice / quotation / receipt maker
  const inv = require('../assets/js/invoice-core.js');
  const SAMPLE = {
    en: { fromName: 'Example Design Studio', fromReg: '202601012345', fromSst: 'W10-1234-32000000', fromTin: '', fromAddr: '12 Jalan Contoh, 23200 Bukit Besi, Terengganu', fromContact: '012-345 6789 · hello@example.my',
      toName: 'Kedai Runcit Maju', toReg: '', toAddr: '8 Jalan Pasar, 20000 Kuala Terengganu', toContact: '', notes: 'Bank transfer: Maybank 1234 5678 9012 (Example Design Studio)\nPlease quote the invoice number.',
      items: [{ desc: 'Logo and shop sign design', qty: '3', price: '150', discount: '', tax: 'st8' }, { desc: 'A5 flyer printing (100 pcs)', qty: '2', price: '45.50', discount: '', tax: 'none' }] },
    ms: { fromName: 'Studio Rekaan Contoh', fromReg: '202601012345', fromSst: 'W10-1234-32000000', fromTin: '', fromAddr: '12 Jalan Contoh, 23200 Bukit Besi, Terengganu', fromContact: '012-345 6789 · hello@example.my',
      toName: 'Kedai Runcit Maju', toReg: '', toAddr: '8 Jalan Pasar, 20000 Kuala Terengganu', toContact: '', notes: 'Pindahan bank: Maybank 1234 5678 9012 (Studio Rekaan Contoh)\nSila nyatakan nombor invois.',
      items: [{ desc: 'Reka bentuk logo dan papan tanda kedai', qty: '3', price: '150', discount: '', tax: 'st8' }, { desc: 'Cetakan risalah A5 (100 keping)', qty: '2', price: '45.50', discount: '', tax: 'none' }] }
  };
  const TAXES = { en: [['none', 'No tax'], ['st8', 'Service tax 8%'], ['st6', 'Service tax 6%'], ['sales10', 'Sales tax 10%'], ['sales5', 'Sales tax 5%']],
    ms: [['none', 'Tiada cukai'], ['st8', 'Cukai perkhidmatan 8%'], ['st6', 'Cukai perkhidmatan 6%'], ['sales10', 'Cukai jualan 10%'], ['sales5', 'Cukai jualan 5%']] };
  renderers.invoice = lang => {
    const L = lang === 'ms' ? 1 : 0, S = SAMPLE[lang], k = L ? 'ms' : 'en', date = inv.FACTS.verified;
    const taxOpts = sel => TAXES[k].map(([v, t]) => opt(v, t, v === sel)).join('');
    const row = it => `<tr><td><input class="inv-in" data-k="desc" type="text" value="${esc(it.desc)}" aria-label="${L ? 'Perihal' : 'Description'}"></td><td data-l="${L ? 'Kuantiti' : 'Qty'}"><input class="inv-in n" data-k="qty" type="text" inputmode="decimal" value="${esc(it.qty)}" aria-label="${L ? 'Kuantiti' : 'Quantity'}"></td><td data-l="${L ? 'Harga (RM)' : 'Price (RM)'}"><input class="inv-in n" data-k="price" type="text" inputmode="decimal" value="${esc(it.price)}" aria-label="${L ? 'Harga seunit (RM)' : 'Unit price (RM)'}"></td><td data-l="${L ? 'Diskaun %' : 'Disc. %'}"><input class="inv-in n" data-k="discount" type="text" inputmode="decimal" value="${esc(it.discount)}" placeholder="0" aria-label="${L ? 'Diskaun %' : 'Discount %'}"></td><td data-l="${L ? 'Cukai' : 'Tax'}"><select class="inv-in" data-k="tax" aria-label="${L ? 'Cukai' : 'Tax'}">${taxOpts(it.tax)}</select></td><td><button type="button" class="inv-del" aria-label="${L ? 'Buang baris' : 'Remove line'}">×</button></td></tr>`;
    const doc = { lang: k, doc: 'invoice', number: 'INV-2026-0001', date, terms: '14', cur: 'RM', from: { name: S.fromName, reg: S.fromReg, sst: S.fromSst, addr: S.fromAddr, contact: S.fromContact }, to: { name: S.toName, addr: S.toAddr }, items: S.items, shipping: '20', notes: S.notes };
    const t = inv.totals(doc);
    const ex = inv.totals({ items: [{ qty: 3, price: '150', tax: 'st8' }, { qty: 2, price: '45.50', tax: 'none' }], shipping: '20' });
    const tbl = [['RM100.01–RM100.02', 'RM100.00'], ['RM100.03–RM100.04', 'RM100.05'], ['RM100.06–RM100.07', 'RM100.05'], ['RM100.08–RM100.09', 'RM100.10']].map(r => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td></tr>`).join('\n');
    const vals = Object.fromEntries(Object.entries(S).filter(([, v]) => typeof v === 'string').map(([key, v]) => ['I_V_' + key.toUpperCase(), esc(v)]));
    return {
      HEAD_EXTRA: CSS, ...vals, I_DATE: date, I_ROWS: S.items.map(row).join(''), I_ROW_TPL: row({ desc: '', qty: '1', price: '', discount: '', tax: 'none' }), I_TAX_OPTIONS: taxOpts('none'),
      I_DOC_OPTIONS: opt('invoice', L ? 'Invois' : 'Invoice', true) + opt('quotation', L ? 'Sebut harga' : 'Quotation') + opt('receipt', L ? 'Resit' : 'Receipt'),
      I_LANG_OPTIONS: opt('en', 'English', !L) + opt('ms', 'Bahasa Melayu', L),
      I_CUR_OPTIONS: ['RM', 'S$', 'US$', '€', '£'].map(c => opt(c, c, c === 'RM')).join(''),
      I_TERMS_OPTIONS: inv.FACTS.terms.map(d => opt(String(d), d ? (L ? `${d} hari` : `${d} days`) : (L ? 'Semasa terima' : 'On receipt'), d === 14)).join(''),
      I_PREVIEW: inv.preview(doc), I_TOTAL: inv.money(t.total), I_SUB: `${inv.money(t.subtotal)} + ${inv.money(t.tax)}${L ? ' cukai' : ' tax'} + ${inv.money(t.shipping)}`,
      I_EX_SUB: inv.money(ex.subtotal), I_EX_TAX: inv.money(ex.tax), I_EX_TOTAL: inv.money(ex.total), I_EX_WORDS: esc(inv.words(ex.total, k)), I_ROUND_TABLE: tbl,
      I_VERIFIED: longDate(date, lang), I_VERIFIED_ISO: date
    };
  };
  bundles['invoice.js'] = ['assets/js/invoice-core.js', 'assets/js/invoice-ui.js'];

  // ---- LHDN e-invoice checker
  const ei = require('../assets/js/einvoice-core.js');
  renderers.einvoice = lang => {
    const L = lang === 'ms' ? 1 : 0, k = L ? 'ms' : 'en', E = ei, F = E.FACTS, today = F.verified;
    const MON = (L ? 'Januari Februari Mac April Mei Jun Julai Ogos September Oktober November Disember' : 'January February March April May June July August September October November December').split(' ');
    const date = iso => { const [y, m, d] = iso.split('-'); return `${Number(d)} ${MON[Number(m) - 1]} ${y}`; };
    const def = { started: 'by2022', rev2022: '2500000', reached: '', group: false, commenced: '' }, r = E.describe(def, k, today);
    const ya = [['by2022', L ? 'Sebelum atau dalam 2022' : 'In 2022 or earlier'], ['2023', '2023'], ['2024', '2024'], ['2025', '2025'], ['2026+', L ? '2026 atau kemudian' : '2026 or later']].map(([v, t]) => opt(v, t, v === 'by2022')).join('');
    const reached = [['', L ? 'Tidak, belum pernah' : 'No, never'], ['YA2023-2025', L ? 'Ya, dalam YA2023 hingga YA2025' : 'Yes, in YA2023 to YA2025']].concat([2026, 2027, 2028, 2029, 2030].map(y => [String(y), (L ? 'Ya, dalam YA' : 'Yes, in YA') + y])).map(([v, t]) => opt(v, t, v === '')).join('');
    const names = L ? ['Lebih RM100 juta', 'Lebih RM25 juta hingga RM100 juta', 'Lebih RM5 juta hingga RM25 juta', 'RM3 juta hingga RM5 juta'] : ['Over RM100 million', 'Over RM25 million to RM100 million', 'Over RM5 million to RM25 million', 'RM3 million to RM5 million'];
    const phases = F.phases.map((p, i) => `<tr><th scope="row">${L ? 'Fasa' : 'Phase'} ${i + 1}</th><td>${names[i]}</td><td>${date(p[2])}</td><td>${date(p[3])}</td></tr>`).join('\n') +
      `\n<tr><th scope="row">${L ? 'Konsesi' : 'Concessionary'}</th><td>${L ? 'Bawah RM3 juta tetapi tidak layak dikecualikan, atau mencapai RM3 juta dalam YA2023 hingga YA2025' : 'Below RM3 million but not exempt, or reached RM3 million in YA2023 to YA2025'}</td><td>${date(F.concession)}</td><td>${date(F.relax2026)}</td></tr>` +
      `\n<tr><th scope="row">${L ? 'Dikecualikan' : 'Exempt'}</th><td>${L ? 'Bawah RM3 juta, tiada kaitan kumpulan RM3 juta ke atas' : 'Below RM3 million, no group link of RM3 million or more'}</td><td>${L ? 'Tiada (mula 1 Januari tahun kedua selepas YA mencapai RM3 juta)' : 'None (start 1 January of the second year after the YA that reaches RM3 million)'}</td><td>–</td></tr>`;
    const hist = [['RM150,000', L ? 'Cadangan asal' : 'Original plan'], ['RM500,000', L ? 'Jun 2025' : 'June 2025'], ['RM1 juta', L ? 'Disember 2025' : 'December 2025'], ['RM3 juta', L ? 'Mulai 1 September 2026 (semasa)' : 'From 1 September 2026 (current)']]
      .map(([a, b]) => `<tr><th scope="row">${L ? a : a.replace(' juta', ' million')}</th><td>${b}</td></tr>`).join('\n');
    return {
      HEAD_EXTRA: CSS, E_STARTED: ya, E_REACHED: reached, E_PHASES: phases, E_HISTORY: hist,
      E_CLASS: r.must ? 'warn' : 'ok', E_BADGE: esc(r.badge), E_DATE: esc(r.date), E_RELAX: esc(r.relax), E_WHY: esc(r.why), E_STEPS: r.steps.map(x => `<li>${esc(x)}</li>`).join(''),
      E_FAQ_DATE: longDate(F.faqDate, lang), E_VERIFIED: longDate(F.verified, lang), E_VERIFIED_ISO: F.verified
    };
  };
  bundles['einvoice.js'] = ['assets/js/einvoice-core.js', 'assets/js/einvoice-ui.js'];

  return { renderers, bundles };
}
