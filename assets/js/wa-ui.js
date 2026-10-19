/* WhatsApp Link Generator UI. The link, preview, QR code and button code update as you type. The QR library loads on
   first change; the number and message are kept only in this browser (localStorage), never in the URL or a server. */
(function () {
  'use strict';
  var W = window.TBBWa;
  var form = document.getElementById('waForm');
  if (!W || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'tbb-walink', lib = null, timer = 0, current = '';
  var NOTES = {
    empty: 'No number: the link opens WhatsApp and lets the person choose who to send the message to.',
    letters: 'A phone number can only contain digits, spaces, dashes, brackets and +.',
    short: 'This number looks too short. Include the full number with the area or mobile prefix.',
    long: 'This number is too long: international numbers have at most 15 digits.',
    trunk: 'The 0 after the country code was removed, as WhatsApp requires.',
    myLandline: 'This looks like a Malaysian landline (not 01…). It only works if that number has WhatsApp Business.',
    myLength: 'Malaysian mobile numbers usually have 10 or 11 digits including the 0 (012-345 6789 or 011-2345 6789). Check the number.'
  };

  function loadQr() {
    if (!lib) lib = new Promise(function (ok, fail) {
      if (window.qrcode) return ok(window.qrcode);
      var s = document.createElement('script');
      s.src = W.VENDOR; s.onload = function () { ok(window.qrcode); }; s.onerror = fail;
      document.head.appendChild(s);
    });
    return lib;
  }

  function run() {
    var n = W.normalize($('waPhone').value, $('waCc').value), msg = $('waMsg').value, notes = [];
    var digits = n.ok ? n.digits : '';
    if (!n.ok) notes.push(NOTES[n.error]);
    else n.warn.forEach(function (w) { notes.push(NOTES[w]); });
    current = W.link(digits, msg);
    $('waLink').value = current;
    $('waTest').href = current;
    $('waNote').textContent = notes.join(' ');
    $('waNote').hidden = !notes.length;
    $('waNote').className = 'help wa-note' + (n.ok || n.error === 'empty' ? '' : ' error');
    $('waNum').textContent = n.ok ? n.e164 : 'Any contact';
    $('waBubble').innerHTML = msg.trim() ? W.formatHtml(msg) : '<span class="wa-empty">Your message preview</span>';
    $('waCount').textContent = Array.from(msg).length + ' characters · link ' + current.length + ' characters';
    code();
    loadQr().then(function (q) {
      $('waQr').innerHTML = W.qrSvg(W.qrMatrix(q, current), 'QR code for ' + current);
    }, function () { $('waQr').innerHTML = '<p class="help">The QR code could not load. Check your connection.</p>'; });
    try { localStorage.setItem(KEY, JSON.stringify({ cc: $('waCc').value, p: $('waPhone').value, m: msg, l: $('waLabel').value })); } catch (e) { /* storage blocked */ }
  }
  function code() { $('waCode').value = W.snippet(current, $('waLabel').value.trim() || 'Chat on WhatsApp', form.elements.kind.value); }
  function schedule() { clearTimeout(timer); timer = setTimeout(run, 120); }

  function wrap(mark) {
    var t = $('waMsg'), a = t.selectionStart, b = t.selectionEnd, v = t.value, sel = v.slice(a, b) || 'text';
    if (mark === '- ') { t.setRangeText(sel.split('\n').map(function (l) { return '- ' + l; }).join('\n'), a, b, 'end'); }
    else t.setRangeText(mark + sel + mark, a, b, 'select');
    t.focus();
    run();
  }
  function copy(text, btn, label) {
    var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = label; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
  }
  function download(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  function png() {
    loadQr().then(function (q) {
      var m = W.qrMatrix(q, current), scale = 12, size = (m.length + 8) * scale, c = document.createElement('canvas'), g = c.getContext('2d');
      c.width = c.height = size;
      g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.fillStyle = '#000';
      m.forEach(function (row, r) { row.forEach(function (on, k) { if (on) g.fillRect((k + 4) * scale, (r + 4) * scale, scale, scale); }); });
      c.toBlob(function (b) { download(b, 'whatsapp-qr.png'); }, 'image/png');
    });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
  form.addEventListener('input', function (e) { if (e.target.name === 'kind') code(); else schedule(); });
  form.addEventListener('change', function (e) { if (e.target.id === 'waCc' || e.target.name === 'kind') run(); });
  form.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-wrap')) wrap(b.getAttribute('data-wrap'));
    else if (b.hasAttribute('data-tpl')) { $('waMsg').value = W.TEMPLATES[+b.getAttribute('data-tpl')][1]; run(); $('waMsg').focus(); }
    else if (b.id === 'waCopy') copy(current, b, 'Copy link');
    else if (b.id === 'waCopyCode') copy($('waCode').value, b, 'Copy code');
    else if (b.id === 'waPng') png();
    else if (b.id === 'waSvg') download(new Blob([$('waQr').innerHTML], { type: 'image/svg+xml' }), 'whatsapp-qr.svg');
  });
  // Pasting an existing wa.me or api.whatsapp.com link into the number box fills both fields.
  $('waPhone').addEventListener('paste', function (e) {
    var t = (e.clipboardData || window.clipboardData).getData('text'), p = W.parseLink(t);
    if (!p) return;
    e.preventDefault();
    $('waPhone').value = p.digits ? '+' + p.digits : '';
    if (p.text) $('waMsg').value = p.text;
    run();
  });

  try {
    var s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s) { $('waCc').value = s.cc || '60'; $('waPhone').value = s.p || ''; $('waMsg').value = s.m || ''; $('waLabel').value = s.l || ''; run(); }
  } catch (e) { /* storage blocked */ }
  ['pointerdown', 'focusin'].forEach(function (ev) { form.addEventListener(ev, function () { loadQr().catch(function () {}); }, { once: true, passive: true }); });
})();
