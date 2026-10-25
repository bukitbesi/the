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
    const row = it => `<tr><td><input class="inv-in" data-k="desc" type="text" value="${esc(it.desc)}" aria-label="${L ? 'Perihal' : 'Description'}"></td><td><input class="inv-in n" data-k="qty" type="text" inputmode="decimal" value="${esc(it.qty)}" aria-label="${L ? 'Kuantiti' : 'Quantity'}"></td><td><input class="inv-in n" data-k="price" type="text" inputmode="decimal" value="${esc(it.price)}" aria-label="${L ? 'Harga seunit (RM)' : 'Unit price (RM)'}"></td><td><input class="inv-in n" data-k="discount" type="text" inputmode="decimal" value="${esc(it.discount)}" placeholder="0" aria-label="${L ? 'Diskaun %' : 'Discount %'}"></td><td><select class="inv-in" data-k="tax" aria-label="${L ? 'Cukai' : 'Tax'}">${taxOpts(it.tax)}</select></td><td><button type="button" class="inv-del" aria-label="${L ? 'Buang baris' : 'Remove line'}">×</button></td></tr>`;
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

  return { renderers, bundles };
}
