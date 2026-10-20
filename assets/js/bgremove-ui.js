/* Background remover UI (BM + EN). The photo stays in the browser: the AI matte comes from TBBBgAI (open model,
   downloaded once and cached), or from a flood fill for plain backgrounds. TBBBgRemove refines and composites it.
   The visitor can erase/restore with a brush, swap the background, crop to the subject and download PNG/JPG/WebP.
   Settings (not the photo) live in the URL hash. */
(function () {
  'use strict';
  var B = window.TBBBgRemove, AI = window.TBBBgAI;
  var form = document.getElementById('bgForm');
  if (!B || !form) return;
  var ms = document.documentElement.lang === 'ms', $ = function (id) { return document.getElementById(id); }, f = function (n) { return form.elements[n]; };
  var T = ms ? {
    loading: function (p, mb) { return 'Memuat turun model AI… ' + p + '%' + (mb ? ' daripada ' + mb + ' MB' : '') + ' (sekali sahaja)'; },
    working: 'Membuang latar…', done: function (s, w, h) { return 'Siap dalam ' + s.toFixed(1) + ' saat · ' + w + ' × ' + h + ' px. Foto tidak dimuat naik.'; },
    bad: 'Fail ini bukan gambar yang boleh dibaca. Cuba JPG, PNG atau WebP.', gpu: 'Mod Objek perlukan WebGPU (Chrome atau Edge terkini pada komputer). Gunakan mod Orang atau Latar polos.',
    fail: 'Model AI gagal dimuatkan (semak sambungan). Mod Latar polos digunakan buat masa ini.', empty: 'Tiada subjek dikesan. Cuba mod lain atau pulihkan dengan berus.', file: 'tanpa-latar', undo: 'Tiada lagi untuk dibuat asal.'
  } : {
    loading: function (p, mb) { return 'Downloading the AI model… ' + p + '%' + (mb ? ' of ' + mb + ' MB' : '') + ' (one time only)'; },
    working: 'Removing the background…', done: function (s, w, h) { return 'Done in ' + s.toFixed(1) + ' s · ' + w + ' × ' + h + ' px. Your photo was not uploaded.'; },
    bad: 'This file is not a picture the browser can read. Try JPG, PNG or WebP.', gpu: 'Object mode needs WebGPU (recent Chrome or Edge on a computer). Use People or Plain background mode.',
    fail: 'The AI model could not load (check your connection). Plain background mode is used for now.', empty: 'No subject found. Try another mode or restore it with the brush.', file: 'no-bg', undo: 'Nothing left to undo.'
  };
  var src = null, W = 0, H = 0, raw = null, matte = null, name = 'photo', job = 0, bgImg = null, undo = [], queued = false;
  var cin = $('bgIn'), cout = $('bgOut'), octx = cout.getContext('2d');
  var radio = function (n) { var r = form.querySelector('input[name=' + n + ']:checked'); return r ? r.value : ''; };
  var status = function (t) { $('bgStatus').textContent = t; };

  function syncOutputs() {
    ['cut', 'shift', 'feather', 'tol', 'size', 'blur'].forEach(function (k) { var o = $('o_' + k); if (o && f(k)) o.textContent = f(k).value + (k === 'shift' || k === 'feather' || k === 'size' || k === 'blur' ? ' px' : ''); });
    $('w_tol').hidden = radio('engine') !== 'plain';
    var bg = radio('bg');
    $('w_color').hidden = bg !== 'color'; $('w_blur').hidden = bg !== 'blur'; $('w_img').hidden = bg !== 'image';
    $('w_size').hidden = radio('brush') === 'off';
    cout.style.cursor = radio('brush') === 'off' ? '' : 'crosshair';
    cout.classList.toggle('bg-paint', radio('brush') !== 'off');
  }

  var DEF = { engine: 'person', bg: 'transparent', cut: '50', shift: '0', feather: '1', tol: '12', blur: '12', color: '#1e5aa8', fmt: 'png' };
  function value(k) { return k === 'engine' || k === 'bg' ? radio(k) : f(k).value; }
  function hash() {
    var parts = [];
    Object.keys(DEF).forEach(function (k) { if (String(value(k)) !== DEF[k]) parts.push(k + '=' + encodeURIComponent(value(k))); });
    if (f('crop').checked) parts.push('crop=1');
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
  }
  function fromHash() {
    if (location.hash.length < 2) return;
    location.hash.slice(1).split('&').forEach(function (p) {
      var i = p.indexOf('='), k = p.slice(0, i), v = decodeURIComponent(p.slice(i + 1));
      if (k === 'engine' || k === 'bg') { var r = form.querySelector('input[name=' + k + '][value="' + v + '"]'); if (r) r.checked = true; }
      else if (k === 'crop') f('crop').checked = v === '1';
      else if (DEF[k] !== undefined && f(k)) f(k).value = v;
    });
  }

  // ---- matte
  function compute() {
    if (!src) return;
    var id = ++job, engine = radio('engine'), t0 = performance.now();
    $('bgResult').setAttribute('aria-busy', 'true'); $('bgDownload').disabled = true; $('bgProg').hidden = engine === 'plain';
    var finish = function (m) {
      if (id !== job) return;
      raw = m; undo = []; $('bgProg').hidden = true; $('bgResult').removeAttribute('aria-busy');
      var b = B.bounds(raw, W, H);
      var msg = b ? T.done((performance.now() - t0) / 1000, W, H) : T.empty;
      status(msg); $('bgLive').textContent = msg; $('bgDownload').disabled = !b;
      draw();
    };
    if (engine === 'plain' || !AI) return setTimeout(function () { finish(B.floodMask(src.data, W, H, Number(f('tol').value))); }, 20);
    status(T.working);
    AI.run(cin, engine, function (p, mb) { if (id === job) { status(T.loading(p, mb)); $('bgProg').value = p; } }).then(finish, function (err) {
      if (id !== job) return;
      var r = form.querySelector('input[name=engine][value=plain]'); r.checked = true; syncOutputs(); hash();
      status(err && err.message === 'webgpu' ? T.gpu : T.fail);
      var m = B.floodMask(src.data, W, H, Number(f('tol').value)); raw = m; $('bgProg').hidden = true; $('bgResult').removeAttribute('aria-busy'); $('bgDownload').disabled = false; draw();
    });
  }

  // ---- composite onto the chosen background (drawn on the next frame so sliders stay smooth)
  function draw() { if (queued || !raw) return; queued = true; requestAnimationFrame(paint); }
  function paint() {
    queued = false;
    matte = B.refine(raw, W, H, { cut: f('cut').value, shift: f('shift').value, feather: f('feather').value });
    var bg = radio('bg');
    if (bg === 'image' && bgImg) {
      var cut = B.composite(src.data, matte, W, H, { type: 'transparent' }), tmp = document.createElement('canvas');
      tmp.width = W; tmp.height = H; tmp.getContext('2d').putImageData(new ImageData(cut, W, H), 0, 0);
      var s = Math.max(W / bgImg.width, H / bgImg.height);
      octx.clearRect(0, 0, W, H);
      octx.drawImage(bgImg, (W - bgImg.width * s) / 2, (H - bgImg.height * s) / 2, bgImg.width * s, bgImg.height * s);
      octx.drawImage(tmp, 0, 0);
    } else {
      var o = bg === 'blur' ? { type: 'blur', blur: Number(f('blur').value) } : bg === 'transparent' || bg === 'image' ? { type: 'transparent' } : { type: 'color', color: bg === 'color' ? f('color').value : bg };
      octx.putImageData(new ImageData(B.composite(src.data, matte, W, H, o), W, H), 0, 0);
    }
  }

  // ---- load
  function load(file) {
    if (!file || !/^image\//.test(file.type)) { status(T.bad); return; }
    name = (file.name || 'photo').replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').slice(0, 40) || 'photo';
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var d = B.fit(img.naturalWidth, img.naturalHeight);
      W = d.w; H = d.h;
      [cin, cout].forEach(function (c) { c.width = W; c.height = H; });
      var ctx = cin.getContext('2d'); ctx.drawImage(img, 0, 0, W, H); src = ctx.getImageData(0, 0, W, H);
      URL.revokeObjectURL(url);
      $('bgStage').style.aspectRatio = W + ' / ' + H;
      $('bgStage').hidden = false; $('bgEmpty').hidden = true; $('bgSplitWrap').hidden = false; $('bgDropText').hidden = true;
      var prev = $('bgPreview'); prev.src = cin.toDataURL('image/jpeg', 0.7); prev.hidden = false;
      octx.clearRect(0, 0, W, H); raw = null;
      compute();
    };
    img.onerror = function () { status(T.bad); URL.revokeObjectURL(url); };
    img.src = url;
  }
  $('bgFile').addEventListener('change', function () { load(this.files[0]); });
  var drop = $('bgDrop');
  ['dragenter', 'dragover'].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (ev) { if (ev.dataTransfer.files[0]) load(ev.dataTransfer.files[0]); });
  window.addEventListener('paste', function (ev) {
    var items = (ev.clipboardData || {}).items || [];
    for (var i = 0; i < items.length; i++) if (items[i].type.indexOf('image/') === 0) { load(items[i].getAsFile()); break; }
  });
  f('bgfile').addEventListener('change', function () {
    var file = this.files[0]; if (!file) return;
    var u = URL.createObjectURL(file), im = new Image();
    im.onload = function () { bgImg = im; draw(); };
    im.src = u;
  });

  // ---- brush: erase or restore on the matte, one undo step per stroke
  var painting = false, last = null;
  function at(ev) { var r = cout.getBoundingClientRect(); return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height, k: W / r.width }; }
  function stroke(p) {
    var r = Number(f('size').value) * p.k / 2, mode = radio('brush');
    if (last) { var dx = p.x - last.x, dy = p.y - last.y, n = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy) / (r / 3))); for (var i = 1; i <= n; i++) B.brush(raw, W, H, last.x + dx * i / n, last.y + dy * i / n, r, mode); }
    else B.brush(raw, W, H, p.x, p.y, r, mode);
    last = p; draw();
  }
  cout.addEventListener('pointerdown', function (ev) {
    if (radio('brush') === 'off' || !raw) return;
    ev.preventDefault(); cout.setPointerCapture(ev.pointerId); painting = true; last = null;
    undo.push(new Uint8ClampedArray(raw)); if (undo.length > 15) undo.shift();
    stroke(at(ev));
  });
  cout.addEventListener('pointermove', function (ev) { if (painting) stroke(at(ev)); });
  ['pointerup', 'pointercancel'].forEach(function (e) { cout.addEventListener(e, function () { painting = false; last = null; }); });
  $('bgUndo').addEventListener('click', function () { if (undo.length) { raw = undo.pop(); draw(); } else status(T.undo); });

  // ---- before/after
  var split = $('bgSplit');
  function setSplit() { cin.style.clipPath = 'inset(0 ' + (100 - split.value) + '% 0 0)'; $('bgHandle').style.left = split.value + '%'; }
  split.addEventListener('input', setSplit);

  // ---- download (optionally cropped to the subject); JPG has no transparency, so it gets white behind the cut-out
  $('bgDownload').addEventListener('click', function () {
    if (!raw) return;
    paint();
    var fmt = f('fmt').value, box = f('crop').checked ? B.bounds(matte, W, H, Math.round(Math.max(W, H) * 0.02)) : null;
    box = box || { x: 0, y: 0, w: W, h: H };
    var c = document.createElement('canvas'), x = c.getContext('2d'); c.width = box.w; c.height = box.h;
    if (fmt === 'jpeg') { x.fillStyle = '#fff'; x.fillRect(0, 0, box.w, box.h); }
    x.drawImage(cout, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    c.toBlob(function (b) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name + '-' + T.file + '.' + ({ 'image/jpeg': 'jpg', 'image/webp': 'webp' }[b.type] || 'png');
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, 'image/' + fmt, 0.92);
  });

  form.addEventListener('change', function (ev) {
    var n = ev.target.name;
    syncOutputs(); hash();
    // Painting needs the result in full view, so move the before/after split out of the way.
    if (n === 'brush' && ev.target.value !== 'off') { split.value = 0; setSplit(); }
    if (n === 'engine' || (n === 'tol' && radio('engine') === 'plain')) compute();
    else if (n !== 'bgfile') draw();
  });
  form.addEventListener('input', function (ev) { if (ev.target.type === 'range' || ev.target.type === 'color') { syncOutputs(); if (ev.target.name !== 'tol') draw(); } });
  form.addEventListener('submit', function (ev) { ev.preventDefault(); });

  fromHash(); syncOutputs(); setSplit();
})();
