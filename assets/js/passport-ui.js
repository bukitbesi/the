/* Passport photo maker UI (BM + EN). The photo stays in the browser: TBBBgAI cuts the person out (MODNet), the head is
   found in the matte (TBBBgRemove.headBox) and placed in the chosen photo size, then the visitor fine-tunes zoom and
   position against the guides. Exports a single JPG (hitting a KB window when the authority sets one) or a print sheet
   for 4R or A4 with cut lines. Settings (not the photo) live in the URL hash. */
(function () {
  'use strict';
  var B = window.TBBBgRemove, AI = window.TBBBgAI;
  var form = document.getElementById('pfForm');
  if (!B || !form) return;
  var ms = document.documentElement.lang === 'ms', $ = function (id) { return document.getElementById(id); }, f = function (n) { return form.elements[n]; };
  var T = ms ? {
    loading: function (p, mb) { return 'Memuat turun model AI… ' + p + '%' + (mb ? ' daripada ' + mb + ' MB' : '') + ' (sekali sahaja)'; },
    working: 'Mengesan wajah dan membuang latar…', ready: 'Siap. Laraskan zum dan kedudukan supaya kepala berada di antara garis panduan.',
    bad: 'Fail ini bukan gambar yang boleh dibaca. Cuba JPG, PNG atau WebP.', fail: 'Model AI gagal dimuatkan (semak sambungan). Latar asal dikekalkan; laraskan kedudukan sendiri.',
    size: function (kb, q, w, h, ok, r) { return 'Fail: ' + kb + ' KB · JPG ' + w + ' × ' + h + ' px · kualiti ' + q + '%' + (r ? (ok ? ' · dalam had ' + r[0] + '–' + r[1] + ' KB ✓' : ' · di luar had ' + r[0] + '–' + r[1] + ' KB') : ''); },
    sheet: function (n, p) { return n + ' keping pada ' + p; }, nosheet: 'Saiz ini untuk muat naik digital sahaja.', file: 'gambar-passport', paper: { r4: 'kertas 4R', a4: 'kertas A4' }
  } : {
    loading: function (p, mb) { return 'Downloading the AI model… ' + p + '%' + (mb ? ' of ' + mb + ' MB' : '') + ' (one time only)'; },
    working: 'Finding the face and removing the background…', ready: 'Ready. Adjust zoom and position so the head sits between the guides.',
    bad: 'This file is not a picture the browser can read. Try JPG, PNG or WebP.', fail: 'The AI model could not load (check your connection). The original background is kept; position it yourself.',
    size: function (kb, q, w, h, ok, r) { return 'File: ' + kb + ' KB · JPG ' + w + ' × ' + h + ' px · quality ' + q + '%' + (r ? (ok ? ' · within ' + r[0] + '–' + r[1] + ' KB ✓' : ' · outside ' + r[0] + '–' + r[1] + ' KB') : ''); },
    sheet: function (n, p) { return n + ' photos on ' + p; }, nosheet: 'This size is for digital upload only.', file: 'passport-photo', paper: { r4: '4R paper', a4: 'A4 paper' }
  };
  var PAPER = { r4: { mm: [101.6, 152.4], margin: 0 }, a4: { mm: [210, 297], margin: 5 } };
  var src = null, cut = null, head = null, job = 0, queued = false;
  var out = $('pfOut'), guide = $('pfGuide');
  var radio = function (n) { var r = form.querySelector('input[name=' + n + ']:checked'); return r ? r.value : ''; };
  var status = function (t) { $('pfStatus').textContent = t; };
  var P = function () { return B.PASSPORT[f('preset').value] || B.PASSPORT.my; };
  // Head size and crown margin: the authority's range when published, otherwise the ICAO-style 70% (portrait) or 60% (square).
  function headFrac(p) { return p.head ? (p.head[0] + p.head[1]) / 2 : p.px[0] === p.px[1] ? 0.6 : 0.7; }
  function topFrac(p) { return (1 - headFrac(p)) * 0.4; }

  function syncOutputs() {
    $('o_zoom').textContent = f('zoom').value + '%';
    $('o_bright').textContent = (f('bright').value > 0 ? '+' : '') + f('bright').value;
    $('w_color').hidden = radio('bg') !== 'color';
    var p = P(); $('pfSheetBox').hidden = !p.mm; $('pfNoSheet').hidden = !!p.mm;
    $('pfSpec').textContent = (p.mm ? p.mm.map(function (v) { return String(v).replace('.', ms ? ',' : '.'); }).join(' × ') + ' mm · ' : '') + p.px.join(' × ') + ' px' + (p.kb ? ' · ' + p.kb.join('–') + ' KB' : '');
  }

  var DEF = { preset: 'my', bg: '#ffffff', zoom: '100', x: '0', y: '0', bright: '0', paper: 'r4', color: '#dbe9f6' };
  function value(k) { return k === 'bg' ? radio('bg') : f(k).value; }
  function hash() {
    var parts = [];
    ['preset', 'bg', 'color', 'paper'].forEach(function (k) { if (String(value(k)) !== DEF[k]) parts.push(k + '=' + encodeURIComponent(value(k))); });
    if (!f('cut').checked) parts.push('cut=0');
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
  }
  function fromHash() {
    if (location.hash.length < 2) return;
    location.hash.slice(1).split('&').forEach(function (p) {
      var i = p.indexOf('='), k = p.slice(0, i), v = decodeURIComponent(p.slice(i + 1));
      if (k === 'bg') { var r = form.querySelector('input[name=bg][value="' + v + '"]'); if (r) r.checked = true; }
      else if (k === 'cut') f('cut').checked = v !== '0';
      else if (DEF[k] !== undefined && f(k) && (f(k).tagName !== 'SELECT' || f(k).querySelector('option[value="' + v + '"]'))) f(k).value = v;
    });
  }

  // ---- the photo frame
  function draw() { if (queued || !src) return; queued = true; requestAnimationFrame(function () { queued = false; paint(out, 1); paintGuides(); }); }
  function paint(c, k) {
    var p = P(), w = Math.round(p.px[0] * k), h = Math.round(p.px[1] * k), x = c.getContext('2d');
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    x.fillStyle = radio('bg') === 'color' ? f('color').value : radio('bg') || '#ffffff';
    x.fillRect(0, 0, w, h);
    var img = f('cut').checked && cut ? cut : src, pl, z = Number(f('zoom').value) / 100;
    if (head) pl = B.placeHead(head, w, h, topFrac(p), headFrac(p));
    else { var s0 = Math.max(w / src.width, h / src.height); pl = { scale: s0, x: (w - src.width * s0) / 2, y: (h - src.height * s0) / 2 }; }
    // Zoom around the frame centre, then shift by the sliders (percent of the frame).
    var s = pl.scale * z, ox = w / 2 - (w / 2 - pl.x) * z + Number(f('x').value) / 100 * w, oy = h / 2 - (h / 2 - pl.y) * z + Number(f('y').value) / 100 * h;
    var b = Number(f('bright').value);
    x.filter = b ? 'brightness(' + (100 + b) + '%)' : 'none';
    x.drawImage(img, ox, oy, src.width * s, src.height * s);
    x.filter = 'none';
  }
  function paintGuides() {
    var p = P(), w = out.width, h = out.height, x = guide.getContext('2d');
    guide.width = w; guide.height = h;
    if (!f('guides').checked) return;
    x.lineWidth = Math.max(1, w / 300); x.setLineDash([w / 40, w / 60]); x.strokeStyle = 'rgba(220,30,60,.85)';
    var line = function (y) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); };
    x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.stroke();
    var top = topFrac(p) * h; line(top);
    if (p.head) { line(top + p.head[0] * h); line(top + p.head[1] * h); }
    else line(top + headFrac(p) * h);
  }

  // ---- load and cut out
  function load(file) {
    if (!file || !/^image\//.test(file.type)) { status(T.bad); return; }
    var url = URL.createObjectURL(file), img = new Image(), id = ++job;
    img.onload = function () {
      var d = B.fit(img.naturalWidth, img.naturalHeight, 1600), c = document.createElement('canvas');
      c.width = d.w; c.height = d.h; c.getContext('2d').drawImage(img, 0, 0, d.w, d.h);
      URL.revokeObjectURL(url);
      src = c; cut = null; head = null;
      $('pfStageWrap').hidden = false; $('pfEmpty').hidden = true; $('pfDropText').hidden = true;
      var prev = $('pfPreview'); prev.src = c.toDataURL('image/jpeg', 0.7); prev.hidden = false;
      ['zoom', 'x', 'y', 'bright'].forEach(function (k) { f(k).value = DEF[k]; }); syncOutputs();
      draw();
      if (!AI) return ready(false);
      status(T.working); $('pfProg').hidden = false; $('pfResult').setAttribute('aria-busy', 'true');
      AI.run(c, 'person', function (p, mb) { if (id === job) { status(T.loading(p, mb)); $('pfProg').value = p; } }).then(function (m) {
        if (id !== job) return;
        var w = c.width, h = c.height, mt = B.refine(m, w, h, { cut: 50, feather: 1 }), k = document.createElement('canvas');
        k.width = w; k.height = h;
        var data = c.getContext('2d').getImageData(0, 0, w, h);
        k.getContext('2d').putImageData(new ImageData(B.composite(data.data, mt, w, h, { type: 'transparent' }), w, h), 0, 0);
        cut = k; head = B.headBox(mt, w, h); ready(true);
      }, function () { if (id === job) ready(false); });
    };
    img.onerror = function () { status(T.bad); URL.revokeObjectURL(url); };
    img.src = url;
  }
  function ready(ok) {
    $('pfProg').hidden = true; $('pfResult').removeAttribute('aria-busy');
    $('pfDownload').disabled = false; $('pfSheet').disabled = false;
    status(ok ? T.ready : T.fail); $('pfLive').textContent = ok ? T.ready : T.fail;
    draw();
  }
  $('pfFile').addEventListener('change', function () { load(this.files[0]); });
  var drop = $('pfDrop');
  ['dragenter', 'dragover'].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (ev) { if (ev.dataTransfer.files[0]) load(ev.dataTransfer.files[0]); });
  window.addEventListener('paste', function (ev) {
    var items = (ev.clipboardData || {}).items || [];
    for (var i = 0; i < items.length; i++) if (items[i].type.indexOf('image/') === 0) { load(items[i].getAsFile()); break; }
  });

  // ---- drag the photo inside the frame
  var dragFrom = null;
  out.addEventListener('pointerdown', function (ev) { if (!src) return; ev.preventDefault(); out.setPointerCapture(ev.pointerId); dragFrom = { x: ev.clientX, y: ev.clientY, fx: Number(f('x').value), fy: Number(f('y').value) }; });
  out.addEventListener('pointermove', function (ev) {
    if (!dragFrom) return;
    var r = out.getBoundingClientRect(), clamp = function (v) { return Math.max(-50, Math.min(50, Math.round(v * 2) / 2)); };
    f('x').value = clamp(dragFrom.fx + (ev.clientX - dragFrom.x) / r.width * 100); f('y').value = clamp(dragFrom.fy + (ev.clientY - dragFrom.y) / r.height * 100);
    draw();
  });
  ['pointerup', 'pointercancel'].forEach(function (e) { out.addEventListener(e, function () { dragFrom = null; }); });

  // ---- exports
  function save(canvas, q, suffix) {
    canvas.toBlob(function (b) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = T.file + '-' + f('preset').value + suffix + '.jpg';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, 'image/jpeg', q);
  }
  var bytes = function (c, q) { return (c.toDataURL('image/jpeg', q).length - 23) * 0.75; };
  $('pfDownload').addEventListener('click', function () {
    var p = P(), c = document.createElement('canvas'); paint(c, 1);
    var r = p.kb ? B.targetQuality(function (q) { return bytes(c, q); }, p.kb[0], p.kb[1]) : { q: 0.92, kb: bytes(c, 0.92) / 1024, ok: true };
    var msg = T.size(Math.round(r.kb), Math.round(r.q * 100), c.width, c.height, r.ok, p.kb);
    $('pfSize').textContent = msg; $('pfLive').textContent = msg;
    save(c, r.q, '');
  });
  $('pfSheet').addEventListener('click', function () {
    var p = P(), pa = PAPER[f('paper').value]; if (!p.mm) return;
    var g = B.sheet(p.mm[0], p.mm[1], pa.mm[0], pa.mm[1], 0, pa.margin), px = B.printPixels(p.mm[0], p.mm[1], 300), paper = B.printPixels(g.paperW, g.paperH, 300);
    var c = document.createElement('canvas'), x = c.getContext('2d'), one = document.createElement('canvas');
    c.width = paper.w; c.height = paper.h; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    paint(one, px.w / p.px[0]);
    var ox = Math.round((paper.w - g.cols * px.w) / 2), oy = Math.round((paper.h - g.rows * px.h) / 2);
    x.strokeStyle = '#bbb'; x.lineWidth = 1;
    for (var r = 0; r < g.rows; r++) for (var k = 0; k < g.cols; k++) { var X = ox + k * px.w, Y = oy + r * px.h; x.drawImage(one, X, Y, px.w, px.h); x.strokeRect(X + 0.5, Y + 0.5, px.w - 1, px.h - 1); }
    var msg = T.sheet(g.count, T.paper[f('paper').value]);
    $('pfSize').textContent = msg; $('pfLive').textContent = msg;
    save(c, 0.95, '-' + f('paper').value);
  });
  $('pfReset').addEventListener('click', function () { ['zoom', 'x', 'y', 'bright'].forEach(function (k) { f(k).value = DEF[k]; }); syncOutputs(); draw(); });

  form.addEventListener('change', function () { syncOutputs(); hash(); draw(); });
  form.addEventListener('input', function (ev) { if (ev.target.type === 'range' || ev.target.type === 'color') { syncOutputs(); draw(); } });
  form.addEventListener('submit', function (ev) { ev.preventDefault(); });
  fromHash(); syncOutputs();
})();
