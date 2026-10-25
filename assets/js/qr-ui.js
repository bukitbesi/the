/* QR code generator UI (BM + EN). Builds the payload with TBBQr, draws it as SVG live while typing, and downloads
   PNG (any size) or SVG. The QR library (qrcode-generator, 22 KB) loads on the first edit; the default code is drawn
   at build time. The hash keeps the type, link/text and design, never Wi-Fi passwords or contact details. */
(function () {
  'use strict';
  var Q = window.TBBQr;
  var form = document.getElementById('qrForm');
  if (!Q || !form) return;
  var ms = document.documentElement.lang === 'ms', $ = function (id) { return document.getElementById(id); }, f = function (n) { return form.elements[n]; };
  var L = ms ? { empty: 'Isi maklumat di atas untuk menjana kod QR.', overflow: 'Terlalu panjang untuk kod QR. Pendekkan teks atau pilih pembetulan ralat lebih rendah.', info: function (v, n, ec, len) { return 'Versi ' + v + ' · ' + n + ' × ' + n + ' modul · pembetulan ' + ec + ' (' + Q.FACTS.ec[ec] + '%) · ' + len + ' aksara'; }, inverted: 'Warna terbalik (terang atas gelap) tidak dapat dibaca oleh sesetengah pengimbas.', contrast: 'Kontras warna rendah: gelapkan warna kod atau cerahkan latar.', logo: 'Logo dipasang: pembetulan ralat ditetapkan kepada H (30%).', copied: 'Disalin ✓', fail: 'Gagal memuatkan penjana QR. Semak sambungan dan cuba lagi.', file: 'kod-qr' }
    : { empty: 'Fill in the details above to make a QR code.', overflow: 'Too long for a QR code. Shorten the text or choose a lower error correction.', info: function (v, n, ec, len) { return 'Version ' + v + ' · ' + n + ' × ' + n + ' modules · error correction ' + ec + ' (' + Q.FACTS.ec[ec] + '%) · ' + len + ' characters'; }, inverted: 'Inverted colours (light on dark) cannot be read by some scanners.', contrast: 'Low colour contrast: darken the code or lighten the background.', logo: 'Logo added: error correction set to H (30%).', copied: 'Copied ✓', fail: 'The QR generator could not load. Check your connection and try again.', file: 'qr-code' };
  var lib = null, loading = null, logo = null, svgText = $('qrOut').innerHTML, queued = false;
  var type = function () { var r = form.querySelector('input[name=type]:checked'); return r ? r.value : 'url'; };
  var val = function (n) { var el = f(n); return el ? (el.type === 'checkbox' ? el.checked : el.value) : ''; };

  function load() {
    if (lib) return Promise.resolve(lib);
    if (!loading) loading = new Promise(function (ok, fail) {
      if (window.qrcode) return ok(window.qrcode);
      var s = document.createElement('script'); s.src = Q.FACTS.vendor; s.onload = function () { ok(window.qrcode); }; s.onerror = fail; document.head.appendChild(s);
    }).then(function (q) { lib = q; return q; }, function (e) { loading = null; $('qrMsg').textContent = L.fail; throw e; });
    return loading;
  }

  function fields() {
    switch (type()) {
      case 'url': return { url: val('url') };
      case 'text': return { text: val('text') };
      case 'wifi': return { ssid: val('ssid'), password: val('password'), security: val('security'), hidden: val('hidden') };
      case 'whatsapp': return { phone: val('wphone'), message: val('wmessage') };
      case 'vcard': return { first: val('first'), last: val('last'), org: val('org'), title: val('title'), phone: val('vphone'), email: val('vemail'), web: val('web'), address: val('address') };
      case 'email': return { email: val('email'), subject: val('subject'), body: val('body') };
      case 'sms': return { phone: val('sphone'), message: val('smessage') };
      case 'phone': return { phone: val('pphone') };
      case 'geo': return { lat: val('lat'), lng: val('lng') };
    }
    return {};
  }
  function ec() { return logo ? 'H' : val('ec'); }
  function design() { return { fg: val('fg'), bg: val('transparent') ? '' : val('bg'), style: val('style'), logo: logo ? { href: logo, size: 0.22 } : null }; }

  function draw() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; load().then(render, function () {}); }); }
  function render() {
    var text = Q.payload(type(), fields()), warn = [];
    $('qrText').textContent = text.length > 160 ? text.slice(0, 160) + '…' : text;
    if (!text) { $('qrMsg').textContent = L.empty; setButtons(false); return; }
    var m;
    try { m = Q.matrix(lib, text, ec()); } catch (e) { $('qrMsg').textContent = L.overflow; setButtons(false); return; }
    var d = design();
    svgText = Q.svg(m, { fg: d.fg, bg: d.bg, style: d.style, logo: d.logo, label: 'QR code: ' + text.slice(0, 80) });
    $('qrOut').innerHTML = svgText;
    $('qrOut').classList.toggle('qr-clear', !d.bg);
    $('qrInfo').textContent = L.info(Q.version(m), m.length, ec(), text.length);
    Q.colourIssues(d.fg, d.bg).forEach(function (k) { warn.push(L[k]); });
    if (logo) warn.push(L.logo);
    $('qrMsg').textContent = warn.join(' ');
    $('qrLive').textContent = $('qrInfo').textContent;
    setButtons(true);
  }
  function setButtons(on) { ['qrPng', 'qrSvg', 'qrCopy'].forEach(function (id) { $(id).disabled = !on; }); }

  function panels() { var t = type(); Array.prototype.forEach.call(form.querySelectorAll('[data-for]'), function (el) { el.hidden = el.getAttribute('data-for') !== t; }); }
  var KEEP = ['type', 'url', 'text', 'fg', 'bg', 'style', 'ec'];
  function hash() {
    var parts = [];
    KEEP.forEach(function (n) {
      var v = n === 'type' ? type() : val(n), el = n === 'type' ? form.querySelector('input[name=type][checked]') : f(n);
      var def = n === 'type' ? (el ? el.value : 'url') : el.tagName === 'SELECT' ? (el.querySelector('option[selected]') || el.options[0]).value : el.defaultValue;
      if (n === 'text' && type() !== 'text') return; if (n === 'url' && type() !== 'url') return;
      if (String(v) !== def) parts.push(n + '=' + encodeURIComponent(v));
    });
    if (val('transparent')) parts.push('transparent=1');
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
  }
  function fromHash() {
    if (location.hash.length < 2) return false;
    location.hash.slice(1).split('&').forEach(function (p) {
      var i = p.indexOf('='), k = p.slice(0, i), v = decodeURIComponent(p.slice(i + 1));
      if (k === 'type') { var r = form.querySelector('input[name=type][value="' + v + '"]'); if (r) r.checked = true; }
      else if (k === 'transparent') f('transparent').checked = v === '1';
      else if (KEEP.indexOf(k) >= 0 && f(k)) f(k).value = v;
    });
    return true;
  }

  // ---- downloads
  function save(blob, ext) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = L.file + '-' + type() + '.' + ext; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); }
  function png(cb) {
    var px = Number(val('size')) || 1024, img = new Image(), url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
    img.onload = function () {
      var c = document.createElement('canvas'); c.width = c.height = px;
      var x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, px, px); URL.revokeObjectURL(url);
      c.toBlob(cb, 'image/png');
    };
    img.src = url;
  }
  $('qrPng').addEventListener('click', function () { png(function (b) { save(b, 'png'); }); });
  $('qrSvg').addEventListener('click', function () { save(new Blob([svgText], { type: 'image/svg+xml' }), 'svg'); });
  $('qrCopy').addEventListener('click', function () {
    var b = $('qrCopy'), t = b.textContent, ok = function () { b.textContent = L.copied; setTimeout(function () { b.textContent = t; }, 1500); };
    if (!navigator.clipboard || !window.ClipboardItem) return;
    png(function (blob) { navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(ok, function () {}); });
  });
  $('qrPrint').addEventListener('click', function () { window.print(); });
  f('logo').addEventListener('change', function () {
    var file = this.files[0]; if (!file) { logo = null; return draw(); }
    var rd = new FileReader();
    // Logo is shrunk to 256 px so the SVG stays small.
    rd.onload = function () { var im = new Image(); im.onload = function () { var c = document.createElement('canvas'), s = Math.min(1, 256 / Math.max(im.width, im.height)); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); logo = c.toDataURL('image/png'); f('ec').disabled = true; draw(); }; im.src = rd.result; };
    rd.readAsDataURL(file);
  });
  $('qrNoLogo').addEventListener('click', function () { logo = null; f('logo').value = ''; f('ec').disabled = false; draw(); });

  form.addEventListener('input', function (e) { if (e.target.name !== 'logo') { hash(); draw(); } });
  form.addEventListener('change', function (e) { if (e.target.name === 'type') panels(); if (e.target.name !== 'logo') { hash(); draw(); } });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('focusin', function () { load().catch(function () {}); }, { once: true });

  panels();
  if (fromHash()) { panels(); draw(); }
})();
