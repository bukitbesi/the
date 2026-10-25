/* Invoice, quotation and receipt maker UI (BM + EN). Everything stays in the browser: the A4 preview is drawn by
   TBBInvoice.preview (the same code the page build uses), the draft auto-saves to this device only, and "Save PDF"
   uses the browser's print dialog. The URL hash keeps only the document type, language and currency. */
(function () {
  'use strict';
  var I = window.TBBInvoice;
  var form = document.getElementById('invForm');
  if (!I || !form) return;
  var ms = document.documentElement.lang === 'ms', $ = function (id) { return document.getElementById(id); }, f = function (n) { return form.elements[n]; };
  var T = ms ? { saved: 'Draf disimpan pada peranti ini', copied: 'Disalin ✓', cleared: 'Borang dikosongkan', newDoc: function (n) { return 'Dokumen baharu: ' + n; }, remove: 'Buang baris', item: 'Perkara', big: 'Logo terlalu besar (maks 2 MB).' }
    : { saved: 'Draft saved on this device', copied: 'Copied ✓', cleared: 'Form cleared', newDoc: function (n) { return 'New document: ' + n; }, remove: 'Remove line', item: 'Item', big: 'Logo too large (max 2 MB).' };
  var KEY = 'tbb-invoice-draft', logo = '', timer = 0, body = $('invItems');
  var FIELDS = ['doc', 'dlang', 'cur', 'number', 'date', 'terms', 'fromName', 'fromReg', 'fromSst', 'fromTin', 'fromAddr', 'fromContact', 'toName', 'toReg', 'toAddr', 'toContact', 'discount', 'shipping', 'paid', 'notes'];

  function rows() {
    return Array.prototype.map.call(body.querySelectorAll('tr'), function (tr) {
      var g = function (c) { return tr.querySelector('[data-k="' + c + '"]').value; };
      return { desc: g('desc'), qty: g('qty'), price: g('price'), discount: g('discount'), tax: g('tax') };
    });
  }
  function data() {
    var v = function (n) { return f(n).value; };
    return {
      lang: v('dlang'), doc: v('doc'), number: v('number'), date: v('date'), terms: v('terms'), cur: v('cur'),
      from: { name: v('fromName'), reg: v('fromReg'), sst: v('fromSst'), tin: v('fromTin'), addr: v('fromAddr'), contact: v('fromContact'), logo: logo },
      to: { name: v('toName'), reg: v('toReg'), addr: v('toAddr'), contact: v('toContact') },
      items: rows(), discount: v('discount'), shipping: v('shipping'), paid: v('paid'), cashRounding: f('cash').checked, notes: v('notes')
    };
  }
  function render() {
    var d = data(), t = I.totals(d);
    $('invPreview').innerHTML = I.preview(d);
    $('invTotal').textContent = I.money(d.doc === 'invoice' && t.paid ? t.due : t.total, d.cur);
    $('invSub').textContent = I.money(t.subtotal, d.cur) + ' + ' + I.money(t.tax, d.cur) + (ms ? ' cukai' : ' tax') + (t.shipping ? ' + ' + I.money(t.shipping, d.cur) : '');
    $('invLive').textContent = $('invTotal').textContent;
    $('invPaidF').hidden = d.doc !== 'invoice';
    $('invTermsF').hidden = d.doc === 'receipt';
  }
  function flush() {
    clearTimeout(timer); timer = 0;
    try { localStorage.setItem(KEY, JSON.stringify(data())); $('invSaved').textContent = T.saved; } catch (e) { /* storage off or full */ }
  }
  function save(now) { clearTimeout(timer); if (now) flush(); else timer = setTimeout(flush, 400); }
  window.addEventListener('pagehide', function () { if (timer) flush(); });
  function load() {
    var d; try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    if (!d) return false;
    var map = { doc: d.doc, dlang: d.lang, cur: d.cur, number: d.number, date: d.date, terms: d.terms, discount: d.discount, shipping: d.shipping, paid: d.paid, notes: d.notes };
    ['name', 'reg', 'sst', 'tin', 'addr', 'contact'].forEach(function (k) { var K = k.charAt(0).toUpperCase() + k.slice(1); if (d.from) map['from' + K] = d.from[k]; if (d.to && f('to' + K)) map['to' + K] = d.to[k]; });
    Object.keys(map).forEach(function (k) { if (map[k] !== undefined && f(k)) f(k).value = map[k]; });
    f('cash').checked = !!d.cashRounding;
    logo = (d.from && d.from.logo) || '';
    if (d.items && d.items.length) { body.textContent = ''; d.items.forEach(addRow); }
    return true;
  }

  function addRow(it) {
    it = it || { desc: '', qty: '1', price: '', discount: '', tax: f('deftax').value };
    var tpl = $('invRowTpl').content.firstElementChild.cloneNode(true);
    ['desc', 'qty', 'price', 'discount', 'tax'].forEach(function (k) { var el = tpl.querySelector('[data-k="' + k + '"]'); if (it[k] !== undefined && it[k] !== null) el.value = it[k]; });
    body.appendChild(tpl);
    return tpl;
  }
  body.addEventListener('click', function (e) {
    var b = e.target.closest('.inv-del'); if (!b) return;
    if (body.rows.length > 1) b.closest('tr').remove(); else b.closest('tr').querySelectorAll('input').forEach(function (i) { i.value = i.getAttribute('data-k') === 'qty' ? '1' : ''; });
    render(); save();
  });
  $('invAdd').addEventListener('click', function () { var r = addRow(); r.querySelector('[data-k="desc"]').focus(); render(); save(); });

  f('logo').addEventListener('change', function () {
    var file = this.files[0]; if (!file) return;
    if (file.size > 2e6) { $('invSaved').textContent = T.big; return; }
    var rd = new FileReader();
    rd.onload = function () { var im = new Image(); im.onload = function () { var c = document.createElement('canvas'), s = Math.min(1, 320 / Math.max(im.width, im.height)); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); logo = c.toDataURL('image/png'); render(); save(); }; im.src = rd.result; };
    rd.readAsDataURL(file);
  });
  $('invNoLogo').addEventListener('click', function () { logo = ''; f('logo').value = ''; render(); save(); });

  // Printing (button or Ctrl+P) copies the preview to a top-level box so only the document prints, with no blank pages.
  function beforePrint() {
    render();
    var box = $('invPrintBox') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'invPrintBox' }));
    box.innerHTML = $('invPreview').innerHTML; document.documentElement.classList.add('inv-print');
  }
  window.addEventListener('beforeprint', beforePrint);
  window.addEventListener('afterprint', function () { document.documentElement.classList.remove('inv-print'); });
  $('invPrint').addEventListener('click', function () { beforePrint(); window.print(); });
  // New document: next number, today's date, empty items and payments; business details stay.
  $('invNew').addEventListener('click', function () {
    f('number').value = I.nextNumber(f('number').value); f('date').value = new Date().toISOString().slice(0, 10);
    ['toName', 'toReg', 'toAddr', 'toContact', 'discount', 'shipping', 'paid'].forEach(function (n) { f(n).value = ''; });
    body.textContent = ''; addRow(); render(); save(true); $('invSaved').textContent = T.newDoc(f('number').value);
  });
  $('invClear').addEventListener('click', function () {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    FIELDS.forEach(function (n) { var el = f(n); if (el.tagName !== 'SELECT') el.value = ''; });
    f('date').value = new Date().toISOString().slice(0, 10); f('number').value = 'INV-' + new Date().getFullYear() + '-0001';
    logo = ''; body.textContent = ''; addRow(); render(); $('invSaved').textContent = T.cleared;
  });
  // Plain-text summary for WhatsApp or email.
  $('invText').addEventListener('click', function () {
    var d = data(), t = I.totals(d), lab = I.L[d.lang === 'ms' ? 'ms' : 'en'];
    var lines = [lab[d.doc] + ' ' + d.number + ' · ' + I.fmtDate(d.date, d.lang), d.from.name, ''];
    d.items.forEach(function (it, i) { if (it.desc || Number(it.price)) lines.push('• ' + it.desc + ' × ' + it.qty + ' = ' + I.money(t.lines[i].net, d.cur)); });
    lines.push('', lab.total + ': ' + I.money(t.total, d.cur));
    if (d.doc === 'invoice' && t.paid) lines.push(lab.bal + ': ' + I.money(t.due, d.cur));
    if (d.notes) lines.push('', d.notes);
    var b = $('invText'), l = b.textContent, ok = function () { b.textContent = T.copied; setTimeout(function () { b.textContent = l; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(lines.join('\n')).then(ok, ok); else ok();
  });

  function hash() {
    var parts = [];
    ['doc', 'dlang', 'cur'].forEach(function (n) { var el = f(n), def = (el.querySelector('option[selected]') || el.options[0]).value; if (el.value !== def) parts.push(n + '=' + el.value); });
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
  }
  form.addEventListener('input', function (e) { if (e.target.name !== 'logo') { render(); save(); } });
  form.addEventListener('change', function (e) { if (e.target.name === 'doc' || e.target.name === 'dlang' || e.target.name === 'cur') hash(); if (e.target.name !== 'logo') { render(); save(); } });
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  // A saved draft wins over the sample; the hash can still switch document type or language.
  var had = load();
  if (location.hash.length > 1) location.hash.slice(1).split('&').forEach(function (p) { var kv = p.split('='), el = f(kv[0]); if (el && el.querySelector('option[value="' + kv[1] + '"]')) el.value = kv[1]; });
  if (!had) f('date').value = new Date().toISOString().slice(0, 10);
  render();
})();
