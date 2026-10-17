/* Image Converter UI. Images are decoded, resized and encoded with the browser's own codecs on the device and are
   never uploaded. Originals stay in memory, so changing a setting re-converts every image; a run counter drops
   results from superseded runs. Settings are kept in the URL hash. */
(function () {
  'use strict';
  var I = window.TBBImg, X = window.TBBExif, Z = window.TBBZip;
  var form = document.getElementById('icForm');
  if (!I || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var E = form.elements, F = I.FORMATS;
  var SAMPLE = '/assets/img/exif-sample-bukit-besi.jpg';
  var DEFAULTS = { fmt: 'webp', quality: '85', targetOn: false, target: '100', mode: 'none', w: '1200', h: '1200', percent: '50', enlarge: false, bg: '#ffffff', keepMeta: false, suffix: false, ico: '16,32,48' };
  var items = [], urls = [], run = 0, timer = 0, avif = null;
  var ERR = {
    heic: 'This browser cannot open HEIC. Open this page in Safari, or set the iPhone camera to Most Compatible.',
    tiff: 'TIFF cannot be opened by browsers. Export it as PNG or JPG first.',
    decode: 'This file could not be read as an image.', tooBig: 'Files up to 80 MB are supported.'
  };

  // ---- settings
  function opts() {
    return {
      fmt: E.fmt.value, quality: +E.quality.value / 100, targetOn: E.targetOn.checked && /jpeg|webp|avif/.test(E.fmt.value), target: Math.max(1, +E.target.value || 100) * 1024,
      resize: { mode: E.mode.value, w: +E.w.value, h: +E.h.value, percent: +E.percent.value, enlarge: E.enlarge.checked },
      bg: E.bg.value, keepMeta: E.keepMeta.checked, suffix: E.suffix.checked,
      ico: Array.prototype.filter.call(form.querySelectorAll('input[name=ico]'), function (c) { return c.checked; }).map(function (c) { return +c.value; })
    };
  }
  function values() {
    var o = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      if (k === 'ico') o.ico = opts().ico.join(',');
      else if (E[k].type === 'checkbox') o[k] = E[k].checked;
      else o[k] = E[k].value;
    });
    return o;
  }
  function save() {
    var q = new URLSearchParams(), v = values();
    Object.keys(DEFAULTS).forEach(function (k) { if (String(v[k]) !== String(DEFAULTS[k])) q.set(k, v[k] === true ? '1' : v[k] === false ? '0' : v[k]); });
    var s = q.toString();
    history.replaceState(null, '', s ? '#' + s : location.pathname + location.search);
  }
  function restore() {
    var q = new URLSearchParams(location.hash.slice(1));
    Object.keys(DEFAULTS).forEach(function (k) {
      if (!q.has(k)) return;
      var v = q.get(k);
      if (k === 'ico') { var sizes = v.split(','); Array.prototype.forEach.call(form.querySelectorAll('input[name=ico]'), function (c) { c.checked = sizes.indexOf(c.value) >= 0; }); }
      else if (k === 'fmt') { if (F[v]) E.fmt.value = v; }
      else if (E[k].type === 'checkbox') E[k].checked = v === '1';
      else E[k].value = v;
    });
  }
  function sync() {
    var f = E.fmt.value, lossy = F[f].lossy;
    $('icQualityWrap').hidden = !lossy;
    $('icTargetWrap').hidden = !lossy;
    $('icQualityOut').textContent = E.quality.value + '%';
    $('icBgWrap').hidden = F[f].alpha;
    $('icIcoWrap').hidden = f !== 'ico';
    $('icDims').hidden = E.mode.value === 'none';
    $('icPctWrap').hidden = E.mode.value !== 'percent';
    form.querySelector('#icDims .field-row').hidden = E.mode.value === 'percent';
    $('icHWrap').hidden = E.mode.value !== 'fit';
    E.target.disabled = !E.targetOn.checked;
    E.quality.disabled = E.targetOn.checked;
  }

  // ---- decode and encode
  function decode(item) {
    var kind = I.sniff(item.bytes);
    if (kind === 'tiff') return Promise.reject(new Error('tiff'));
    var blob = new Blob([item.bytes], { type: kind === 'svg' ? 'image/svg+xml' : item.type || '' });
    function viaImg() {
      return new Promise(function (ok, bad) {
        var img = new Image(), u = URL.createObjectURL(blob);
        img.onload = function () {
          var w = img.naturalWidth || 1024, h = img.naturalHeight || 1024;
          if (kind === 'svg' && (!img.naturalWidth || w < 256)) { var k = 1024 / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
          ok({ src: img, w: w, h: h, done: function () { URL.revokeObjectURL(u); } });
        };
        img.onerror = function () { URL.revokeObjectURL(u); bad(new Error(kind === 'heic' ? 'heic' : 'decode')); };
        img.src = u;
      });
    }
    if (kind === 'svg' || typeof createImageBitmap === 'undefined') return viaImg();
    return createImageBitmap(blob).then(function (bm) { return { src: bm, w: bm.width, h: bm.height, done: function () { if (bm.close) bm.close(); } }; }, viaImg);
  }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // Downscaling in halves before the final step keeps edges smooth, like a proper resampling filter.
  function draw(src, sw, sh, w, h, bg) {
    var cur = src, cw = sw, ch = sh;
    while (cw / 2 >= w && ch / 2 >= h && cw * ch > 4e6) {
      var half = canvas(Math.round(cw / 2), Math.round(ch / 2)), hx = half.getContext('2d');
      hx.imageSmoothingQuality = 'high';
      hx.drawImage(cur, 0, 0, half.width, half.height);
      cur = half; cw = half.width; ch = half.height;
    }
    var c = canvas(w, h), x = c.getContext('2d');
    if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
    x.imageSmoothingQuality = 'high';
    x.drawImage(cur, 0, 0, w, h);
    return c;
  }
  function blob(c, mime, q) {
    return new Promise(function (ok, bad) { c.toBlob(function (b) { b ? ok(b) : bad(new Error('encode')); }, mime, q); });
  }
  function bytesOf(b) { return b.arrayBuffer().then(function (a) { return new Uint8Array(a); }); }
  function supportsAvif() {
    if (avif !== null) return Promise.resolve(avif);
    return blob(canvas(2, 2), 'image/avif', 0.5).then(function (b) { avif = b.type === 'image/avif'; return avif; }, function () { avif = false; return false; });
  }
  // post(bytes, size) adds metadata; target-size searches measure the final file so the limit still holds.
  function encode(d, o, fmt, post) {
    var size = I.capPixels(I.fit(d.w, d.h, o.resize)), f = F[fmt];
    if (fmt === 'ico') {
      var sizes = I.icoSizes(size.w, size.h, o.ico);
      return Promise.all(sizes.map(function (s) {
        var c = canvas(s, s), x = c.getContext('2d'), k = Math.min(s / d.w, s / d.h), w = Math.max(1, Math.round(d.w * k)), h = Math.max(1, Math.round(d.h * k));
        x.imageSmoothingQuality = 'high';
        x.drawImage(draw(d.src, d.w, d.h, w, h, null), Math.round((s - w) / 2), Math.round((s - h) / 2));
        return blob(c, 'image/png').then(bytesOf).then(function (b) { return { size: s, bytes: b }; });
      })).then(function (imgs) { return { bytes: I.encodeIco(imgs), size: { w: sizes[sizes.length - 1], h: sizes[sizes.length - 1] }, note: sizes.join(', ') + ' px' }; });
    }
    var c = draw(d.src, d.w, d.h, size.w, size.h, f.alpha ? null : o.bg);
    if (fmt === 'bmp') return Promise.resolve({ bytes: I.encodeBmp(c.getContext('2d').getImageData(0, 0, size.w, size.h).data, size.w, size.h), size: size });
    var once = function (q) { return blob(c, f.mime, q).then(bytesOf).then(function (b) { return post ? post(b, size) : b; }); };
    if (!o.targetOn) return once(o.quality).then(function (bytes) { return { bytes: bytes, size: size, q: o.quality }; });
    var last = {};
    return I.searchQuality(function (q) { return once(q).then(function (b) { last[Math.round(q * 100)] = b; return b.length; }); }, o.target).then(function (r) {
      return { bytes: last[Math.round(r.q * 100)], size: size, q: r.q, fits: r.fits };
    });
  }

  // ---- render
  function card(it) {
    if (it.error) return '<li class="ex-file"><div class="ex-file-head"><strong>' + esc(it.name) + '</strong></div><p class="error">' + esc(ERR[it.error] || it.error) + '</p></li>';
    if (!it.out) return '<li class="ex-file"><div class="ex-file-head"><strong>' + esc(it.name) + '</strong><span>Converting…</span></div></li>';
    var o = it.out, f = F[it.fmt];
    return '<li class="ex-file ic-file"><img src="' + it.preview + '" alt="" width="64" height="64" loading="lazy" decoding="async"><div class="ic-meta"><div class="ex-file-head"><strong>' + esc(o.name) + '</strong><span>' +
      I.size(it.bytes.length) + ' → ' + I.size(o.bytes.length) + ' (' + I.change(it.bytes.length, o.bytes.length) + ')</span></div>' +
      '<p class="help">' + it.w + ' × ' + it.h + ' → ' + (o.note || o.size.w + ' × ' + o.size.h) + ' · ' + f.label + (o.q && f.lossy ? ' at ' + Math.round(o.q * 100) + '%' : '') +
      (o.fits === false ? ' · <strong>still above the target at the lowest quality; resize it smaller</strong>' : '') + (o.meta ? ' · metadata kept' : '') + '</p>' +
      '<a class="btn sm" href="' + o.url + '" download="' + esc(o.name) + '">Download</a></div></li>';
  }
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  function render() {
    $('icList').innerHTML = items.length ? items.map(card).join('') : '<li class="help">Choose images above, or <button type="button" class="link-btn" id="icSample">convert a sample photo</button>.</li>';
    var done = items.filter(function (i) { return i.out; });
    $('icZip').hidden = done.length < 2;
    $('icCompare').disabled = !done.length;
    var before = 0, after = 0;
    done.forEach(function (i) { before += i.bytes.length; after += i.out.bytes.length; });
    var msg = done.length ? done.length + ' of ' + items.length + ' converted: ' + I.size(before) + ' → ' + I.size(after) + ' (' + I.change(before, after) + ').' : 'Settings are kept in the page link, so you can bookmark them.';
    $('icStats').textContent = msg;
    return msg;
  }
  function convertAll() {
    var my = ++run, o = opts(), fmt = o.fmt;
    urls.forEach(function (u) { URL.revokeObjectURL(u); });
    urls = [];
    items.forEach(function (i) { i.out = null; });
    render();
    var chain = Promise.resolve();
    items.forEach(function (it) {
      if (it.error) return;
      chain = chain.then(function () {
        if (my !== run) return;
        return (it.decoded ? Promise.resolve(it.decoded) : decode(it).then(function (d) { it.decoded = d; it.w = d.w; it.h = d.h; return d; }))
          .then(function (d) {
            it.meta = false;
            var post = o.keepMeta && X && /jpeg|png|webp/.test(fmt) ? function (b, size) { var t = X.transplant(it.bytes, b, size); if (t !== b) it.meta = true; return t; } : null;
            return encode(d, o, fmt, post);
          })
          .then(function (r) {
            if (my !== run) return;
            var bytes = r.bytes, meta = it.meta;
            var url = URL.createObjectURL(new Blob([bytes], { type: F[fmt].mime }));
            urls.push(url);
            it.preview = url;
            it.fmt = fmt;
            it.out = { bytes: bytes, size: r.size, q: r.q, fits: r.fits, note: r.note, meta: meta, url: url, name: I.outName(it.name, fmt, r.size, { suffix: o.suffix }) };
            render();
          }, function (e) { it.error = e.message; render(); });
      });
    });
    return chain.then(function () { if (my === run) $('icLive').textContent = render(); });
  }
  function add(files) {
    var list = Array.prototype.slice.call(files);
    Promise.all(list.map(function (f) {
      if (f.size > I.FACTS.maxBytes) return { name: f.name, error: 'tooBig' };
      return f.arrayBuffer().then(function (b) { return { name: f.name, type: f.type, bytes: new Uint8Array(b) }; });
    })).then(function (got) {
      items.forEach(function (i) { if (i.decoded) i.decoded.done(); });
      items = got;
      convertAll();
    });
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(function () { save(); if (items.length) convertAll(); }, 250); }

  // ---- compare formats on the first image
  function compare() {
    var it = items.filter(function (i) { return i.decoded; })[0];
    if (!it) return;
    var o = opts(), list = ['jpeg', 'png', 'webp'];
    o.targetOn = false;
    $('icCompareOut').innerHTML = '<p class="help">Comparing…</p>';
    supportsAvif().then(function (ok) {
      if (ok) list.push('avif');
      return Promise.all(list.map(function (f) { return encode(it.decoded, o, f).then(function (r) { return { f: f, n: r.bytes.length }; }); }));
    }).then(function (rows) {
      var min = Math.min.apply(null, rows.map(function (r) { return r.n; }));
      $('icCompareOut').innerHTML = '<div class="table-wrap"><table class="data text ic-cmp"><caption>' + esc(it.name) + ' at ' + Math.round(o.quality * 100) + '% quality</caption><thead><tr><th scope="col">Format</th><th scope="col">Size</th><th scope="col">vs original</th></tr></thead><tbody>' +
        rows.map(function (r) { return '<tr' + (r.n === min ? ' class="ic-best"' : '') + '><th scope="row">' + F[r.f].label + (r.n === min ? ' (smallest)' : '') + '</th><td>' + I.size(r.n) + '</td><td>' + I.change(it.bytes.length, r.n) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      $('icLive').textContent = 'Smallest: ' + F[rows.filter(function (r) { return r.n === min; })[0].f].label + '.';
    });
  }

  // ---- events
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('input', function (e) { if (e.target.id === 'icFile') return; sync(); schedule(); });
  form.addEventListener('change', function (e) { if (e.target.id === 'icFile') return; sync(); schedule(); });
  $('icFile').addEventListener('change', function () { if (this.files.length) add(this.files); this.value = ''; });
  var drop = $('icDrop');
  drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
  drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files.length) add(e.dataTransfer.files); });
  document.addEventListener('paste', function (e) {
    var files = Array.prototype.filter.call((e.clipboardData && e.clipboardData.files) || [], function (f) { return /^image\//.test(f.type); });
    if (files.length) add(files);
  });
  $('icList').addEventListener('click', function (e) {
    if (e.target.id !== 'icSample') return;
    fetch(SAMPLE).then(function (r) { return r.arrayBuffer(); }).then(function (b) { items = [{ name: 'sample-photo.jpg', type: 'image/jpeg', bytes: new Uint8Array(b) }]; convertAll(); });
  });
  $('icZip').addEventListener('click', function () {
    var files = items.filter(function (i) { return i.out; }).map(function (i) { return { name: i.out.name, bytes: i.out.bytes }; });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([Z.zip(files, new Date())], { type: 'application/zip' }));
    a.download = 'converted-images.zip';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  });
  $('icCompare').addEventListener('click', compare);
  $('icClear').addEventListener('click', function () {
    run++;
    items.forEach(function (i) { if (i.decoded) i.decoded.done(); });
    items = [];
    $('icCompareOut').innerHTML = '';
    render();
  });

  restore();
  sync();
  supportsAvif().then(function (ok) {
    var r = form.querySelector('input[name=fmt][value=avif]');
    if (ok || !r) return;
    r.disabled = true;
    r.parentNode.title = 'This browser cannot save AVIF';
    r.parentNode.classList.add('ic-off');
    if (r.checked) { E.fmt.value = 'webp'; sync(); }
  });
})();
