/* Invoice, quotation and receipt maths for Malaysian businesses. All money is handled in whole sen (integers) so
   totals never drift; each line's tax is rounded to the sen, half up. Optional cash rounding to the nearest 5 sen
   follows Bank Negara Malaysia's rounding mechanism (applies to the total bill, cash payments only). Amounts in
   words in English and Bahasa Melayu ("Ringgit Malaysia ... sahaja"). Tax rates live in FACTS and are verified. */
(function (root) {
  'use strict';
  var FACTS = {
    verified: '2026-10-25',
    // Tax codes for invoice lines: SST service tax 8% (6% for listed services) and sales tax 5% / 10%.
    taxes: { none: 0, st8: 8, st6: 6, sales10: 10, sales5: 5 },
    terms: [0, 7, 14, 30, 60]
  };

  var sen = function (rm) { var n = Number(String(rm == null ? '' : rm).replace(/,/g, '')); return isFinite(n) ? Math.round(n * 100) : 0; };
  // Half-up rounding of a sen amount that may carry fractions (e.g. tax 8% of 1,234 sen = 98.72 sen → 99).
  var rnd = function (x) { return Math.sign(x) * Math.floor(Math.abs(x) + 0.5 + 1e-9); };

  // One line: qty × price, less a line discount (%), plus tax at its code's rate.
  function line(it) {
    var qty = Number(it.qty), price = sen(it.price), disc = Math.min(100, Math.max(0, Number(it.discount) || 0));
    if (!isFinite(qty)) qty = 0;
    var gross = rnd(qty * price), net = gross - rnd(gross * disc / 100), rate = FACTS.taxes[it.tax] || 0;
    return { gross: gross, discount: gross - net, net: net, rate: rate, tax: rnd(net * rate / 100) };
  }

  // Whole document. o: { items, discount (whole-bill, RM or "10%"), shipping (RM), paid (RM), cashRounding (bool) }.
  // The whole-bill discount is spread over the lines in proportion before tax, so tax stays correct.
  function totals(o) {
    o = o || {};
    var lines = (o.items || []).map(line), sub = lines.reduce(function (s, l) { return s + l.net; }, 0);
    var d = String(o.discount == null ? '' : o.discount).trim(), billDisc = /%$/.test(d) ? rnd(sub * Math.min(100, Math.max(0, parseFloat(d) || 0)) / 100) : Math.min(sub, Math.max(0, sen(d)));
    var byRate = {}, tax = 0, left = billDisc;
    lines.forEach(function (l, i) {
      var share = i === lines.length - 1 ? left : (sub ? rnd(billDisc * l.net / sub) : 0);
      left -= share;
      var base = l.net - share, t = rnd(base * l.rate / 100);
      if (l.rate) { byRate[l.rate] = byRate[l.rate] || { base: 0, tax: 0 }; byRate[l.rate].base += base; byRate[l.rate].tax += t; }
      tax += t;
    });
    var shipping = Math.max(0, sen(o.shipping)), total = sub - billDisc + tax + shipping, rounding = 0;
    if (o.cashRounding) rounding = cash5(total) - total;
    var grand = total + rounding, paid = Math.min(grand, Math.max(0, sen(o.paid)));
    return { lines: lines, subtotal: sub, discount: billDisc, taxes: byRate, tax: tax, shipping: shipping, rounding: rounding, total: grand, paid: paid, due: grand - paid };
  }

  // BNM rounding mechanism: 1–2 sen down to 0, 3–4 sen up to 5, 6–7 sen down to 5, 8–9 sen up to 10.
  function cash5(s) { var r = ((s % 5) + 5) % 5; return r <= 2 ? s - r : s + (5 - r); }

  function money(s, cur) {
    var neg = s < 0, a = Math.abs(s), str = Math.floor(a / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + ('0' + a % 100).slice(-2);
    return (neg ? '-' : '') + (cur === undefined ? 'RM' : cur) + str;
  }

  // ---- amounts in words
  var EN = { ones: ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'], tens: ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'] };
  function en3(n) {
    var h = Math.floor(n / 100), r = n % 100, out = [];
    if (h) out.push(EN.ones[h] + ' hundred');
    if (r) out.push(r < 20 ? EN.ones[r] : EN.tens[Math.floor(r / 10)] + (r % 10 ? '-' + EN.ones[r % 10] : ''));
    return out.join(' and ');
  }
  function enWords(n) {
    if (!n) return 'zero';
    var units = ['', ' thousand', ' million', ' billion'], parts = [], i = 0;
    while (n > 0) { var c = n % 1000; if (c) parts.unshift(en3(c) + units[i]); n = Math.floor(n / 1000); i++; }
    return parts.join(' ');
  }
  var MS = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'lapan', 'sembilan'];
  function ms3(n) {
    var h = Math.floor(n / 100), r = n % 100, t = Math.floor(r / 10), o = r % 10, out = [];
    if (h) out.push(h === 1 ? 'seratus' : MS[h] + ' ratus');
    if (r === 10) out.push('sepuluh'); else if (r === 11) out.push('sebelas'); else if (t === 1) out.push(MS[o] + ' belas');
    else { if (t) out.push(MS[t] + ' puluh'); if (o) out.push(MS[o]); }
    return out.join(' ');
  }
  function msWords(n) {
    if (!n) return 'kosong';
    var units = ['', 'ribu', 'juta', 'bilion'], parts = [], i = 0;
    while (n > 0) { var c = n % 1000; if (c) parts.unshift(i === 1 && c === 1 ? 'seribu' : ms3(c) + (units[i] ? ' ' + units[i] : '')); n = Math.floor(n / 1000); i++; }
    return parts.join(' ');
  }
  function words(s, lang) {
    var rm = Math.floor(Math.abs(s) / 100), c = Math.abs(s) % 100, cap = function (t) { return t.charAt(0).toUpperCase() + t.slice(1); };
    if (lang === 'ms') return 'Ringgit Malaysia ' + cap(msWords(rm)) + (c ? ' dan sen ' + msWords(c) : '') + ' sahaja';
    return 'Ringgit Malaysia ' + cap(enWords(rm)) + (c ? ' and cents ' + enWords(c) : '') + ' only';
  }

  // Next document number: "INV-2026-0009" → "INV-2026-0010" (keeps the padding); no digits → appends "-2".
  function nextNumber(s) {
    s = String(s || '').trim();
    var m = s.match(/^(.*?)(\d+)(\D*)$/);
    if (!m) return (s || 'INV') + '-2';
    var n = String(Number(m[2]) + 1); while (n.length < m[2].length) n = '0' + n;
    return m[1] + n + m[3];
  }
  // Due date: ISO date + n days (ISO out).
  function dueDate(iso, days) {
    var d = new Date(String(iso) + 'T00:00:00Z');
    if (isNaN(d)) return '';
    d.setUTCDate(d.getUTCDate() + (Number(days) || 0));
    return d.toISOString().slice(0, 10);
  }

  // ---- document preview (shared by the page build and the browser, so both draw the same invoice)
  var L = {
    en: { invoice: 'INVOICE', quotation: 'QUOTATION', receipt: 'RECEIPT', no: 'No.', date: 'Date', due: 'Due date', valid: 'Valid until', to: 'Bill to', recv: 'Received from',
      reg: 'Reg. no.', sst: 'SST no.', tin: 'TIN', item: 'Description', qty: 'Qty', price: 'Unit price', disc: 'Disc.', amount: 'Amount', sub: 'Subtotal', billDisc: 'Discount',
      st8: 'Service tax 8%', st6: 'Service tax 6%', sales10: 'Sales tax 10%', sales5: 'Sales tax 5%', ship: 'Delivery', round: 'Rounding', total: 'Total', paid: 'Paid', bal: 'Balance due',
      words: 'Amount in words', notes: 'Notes', thanks: 'Received with thanks.', terms: function (d) { return d ? 'Payment due in ' + d + ' days' : 'Payment due on receipt'; } },
    ms: { invoice: 'INVOIS', quotation: 'SEBUT HARGA', receipt: 'RESIT', no: 'No.', date: 'Tarikh', due: 'Tarikh akhir bayaran', valid: 'Sah sehingga', to: 'Kepada', recv: 'Diterima daripada',
      reg: 'No. pendaftaran', sst: 'No. SST', tin: 'TIN', item: 'Perihal', qty: 'Kuantiti', price: 'Harga seunit', disc: 'Diskaun', amount: 'Jumlah', sub: 'Jumlah kecil', billDisc: 'Diskaun',
      st8: 'Cukai perkhidmatan 8%', st6: 'Cukai perkhidmatan 6%', sales10: 'Cukai jualan 10%', sales5: 'Cukai jualan 5%', ship: 'Penghantaran', round: 'Pelarasan bundar', total: 'Jumlah keseluruhan', paid: 'Dibayar', bal: 'Baki perlu dibayar',
      words: 'Jumlah dalam perkataan', notes: 'Catatan', thanks: 'Diterima dengan terima kasih.', terms: function (d) { return d ? 'Bayaran dalam ' + d + ' hari' : 'Bayaran semasa penerimaan'; } }
  };
  var esc = function (t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var br = function (t) { return esc(t).replace(/\n/g, '<br>'); };
  var taxKey = function (r) { return { 8: 'st8', 6: 'st6', 10: 'sales10', 5: 'sales5' }[r]; };
  function fmtDate(iso, lang) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return esc(iso);
    var mon = (lang === 'ms' ? 'Jan Feb Mac Apr Mei Jun Jul Ogo Sep Okt Nov Dis' : 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec').split(' ');
    return Number(m[3]) + ' ' + mon[Number(m[2]) - 1] + ' ' + m[1];
  }
  // d: { lang, doc, number, date, terms, cur, from: {name, reg, sst, tin, addr, contact, logo}, to: {...}, items, discount, shipping, paid, cashRounding, notes }
  function preview(d) {
    // Blank lines (no description and no price) are left off the document.
    d = Object.assign({}, d, { items: (d.items || []).filter(function (it) { return String(it.desc || '').trim() || sen(it.price); }) });
    var lang = d.lang === 'ms' ? 'ms' : 'en', T = L[lang], doc = L.en[d.doc] ? d.doc : 'invoice', cur = d.cur || 'RM', t = totals(d), anyDisc = t.lines.some(function (l) { return l.discount; });
    var m = function (v) { return money(v, cur); }, from = d.from || {}, to = d.to || {}, id = function (p) { return [p.reg ? T.reg + ' ' + esc(p.reg) : '', p.sst ? T.sst + ' ' + esc(p.sst) : '', p.tin ? T.tin + ' ' + esc(p.tin) : ''].filter(Boolean).join(' · '); };
    var rows = (d.items || []).map(function (it, i) {
      var l = t.lines[i];
      return '<tr><td>' + br(it.desc) + (l.rate ? ' <small>(' + T[taxKey(l.rate)] + ')</small>' : '') + '</td><td class="n">' + esc(it.qty) + '</td><td class="n">' + m(sen(it.price)) + '</td>' + (anyDisc ? '<td class="n">' + (Number(it.discount) ? esc(it.discount) + '%' : '–') + '</td>' : '') + '<td class="n">' + m(l.net) + '</td></tr>';
    }).join('');
    var sum = [[T.sub, t.subtotal]];
    if (t.discount) sum.push([T.billDisc, -t.discount]);
    Object.keys(t.taxes).sort(function (a, b) { return b - a; }).forEach(function (r) { sum.push([T[taxKey(Number(r))], t.taxes[r].tax]); });
    if (t.shipping) sum.push([T.ship, t.shipping]);
    if (t.rounding) sum.push([T.round, t.rounding]);
    var foot = '<tr class="tot"><th scope="row">' + T.total + '</th><td>' + m(t.total) + '</td></tr>';
    if (doc === 'invoice' && t.paid) foot += '<tr><th scope="row">' + T.paid + '</th><td>' + m(-t.paid) + '</td></tr><tr class="tot"><th scope="row">' + T.bal + '</th><td>' + m(t.due) + '</td></tr>';
    var dueLabel = doc === 'quotation' ? T.valid : T.due, showDue = doc !== 'receipt';
    return '<div class="inv-doc" lang="' + lang + '">' +
      '<header class="inv-head"><div class="inv-from">' + (from.logo ? '<img class="inv-logo" src="' + esc(from.logo) + '" alt="">' : '') + '<strong>' + esc(from.name) + '</strong>' + (id(from) ? '<span>' + id(from) + '</span>' : '') + '<span>' + br(from.addr) + '</span><span>' + br(from.contact) + '</span></div>' +
      '<div class="inv-meta"><h3>' + T[doc] + '</h3><dl><dt>' + T.no + '</dt><dd>' + esc(d.number) + '</dd><dt>' + T.date + '</dt><dd>' + fmtDate(d.date, lang) + '</dd>' + (showDue ? '<dt>' + dueLabel + '</dt><dd>' + fmtDate(dueDate(d.date, d.terms), lang) + '</dd>' : '') + '</dl></div></header>' +
      (to.name || to.addr || to.reg || to.contact ? '<section class="inv-to"><small>' + (doc === 'receipt' ? T.recv : T.to) + '</small><strong>' + esc(to.name) + '</strong>' + (id(to) ? '<span>' + id(to) + '</span>' : '') + '<span>' + br(to.addr) + '</span><span>' + br(to.contact) + '</span></section>' : '') +
      '<table class="inv-items"><thead><tr><th scope="col">' + T.item + '</th><th scope="col" class="n">' + T.qty + '</th><th scope="col" class="n">' + T.price + '</th>' + (anyDisc ? '<th scope="col" class="n">' + T.disc + '</th>' : '') + '<th scope="col" class="n">' + T.amount + '</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<table class="inv-sum"><tbody>' + sum.map(function (r) { return '<tr><th scope="row">' + r[0] + '</th><td>' + m(r[1]) + '</td></tr>'; }).join('') + foot + '</tbody></table>' +
      (cur === 'RM' ? '<p class="inv-words"><small>' + T.words + '</small>' + esc(words(doc === 'invoice' && t.paid ? t.due : t.total, lang)) + '</p>' : '') +
      (doc === 'receipt' ? '<p class="inv-words">' + T.thanks + '</p>' : '') +
      (d.notes ? '<p class="inv-notes"><small>' + T.notes + '</small>' + br(d.notes) + '</p>' : '') +
      (showDue && doc === 'invoice' ? '<p class="inv-terms">' + T.terms(Number(d.terms) || 0) + '</p>' : '') + '</div>';
  }

  var api = { FACTS: FACTS, L: L, preview: preview, fmtDate: fmtDate, sen: sen, line: line, totals: totals, cash5: cash5, money: money, words: words, enWords: enWords, msWords: msWords, nextNumber: nextNumber, dueDate: dueDate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBInvoice = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
