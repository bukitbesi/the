/* Image to text UI (BM + EN). The picture stays in the browser: it is prepared on a canvas (TBBOcr) and read by
   tesseract.js, loaded from jsDelivr only when the first picture is chosen. The text is editable, can be copied or
   saved as .txt, and the chosen languages/options live in the URL hash. */
(function () {
  'use strict';
  var O = window.TBBOcr;
  var form = document.getElementById('ocrForm');
  if (!O || !form) return;
  var ms = document.documentElement.lang === 'ms', $ = function (id) { return document.getElementById(id); }, f = function (n) { return form.elements[n]; };
  var L = ms ? {
    status: { 'loading tesseract core': 'Memuatkan enjin OCR', 'initializing tesseract': 'Menyediakan enjin', 'loading language traineddata': 'Memuat turun data bahasa', 'initializing api': 'Menyediakan bahasa', 'recognizing text': 'Membaca teks' },
    first: function (mb) { return 'Kali pertama memuat turun kira-kira ' + mb + ' MB (enjin dan bahasa), kemudian disimpan dalam pelayar.'; },
    done: function (s, c, w) { return 'Siap dalam ' + s.toFixed(1) + ' saat · keyakinan ' + Math.round(c) + '% · ' + w + ' perkataan. Gambar tidak dimuat naik.'; },
    low: ' Keyakinan rendah: cuba Tingkatkan gambar, pusing, atau gambar yang lebih jelas.', bad: 'Fail ini bukan gambar yang boleh dibaca. Cuba JPG, PNG atau WebP.', fail: 'Enjin OCR gagal dimuatkan (semak sambungan) atau gambar tidak dapat dibaca.', none: 'Tiada teks dikesan.', copied: 'Disalin ✓', file: 'teks-dari-gambar'
  } : {
    status: { 'loading tesseract core': 'Loading the OCR engine', 'initializing tesseract': 'Starting the engine', 'loading language traineddata': 'Downloading language data', 'initializing api': 'Preparing languages', 'recognizing text': 'Reading the text' },
    first: function (mb) { return 'The first time downloads about ' + mb + ' MB (engine and languages), then the browser keeps it.'; },
    done: function (s, c, w) { return 'Done in ' + s.toFixed(1) + ' s · ' + Math.round(c) + '% confidence · ' + w + ' words. Your picture was not uploaded.'; },
    low: ' Low confidence: try Enhance, rotate, or a sharper picture.', bad: 'This file is not a picture the browser can read. Try JPG, PNG or WebP.', fail: 'The OCR engine could not load (check your connection) or the picture could not be read.', none: 'No text found.', copied: 'Copied ✓', file: 'text-from-image'
  };
  var libP = null, worker = null, workerLangs = '', img = null, rot = 0, job = 0, raw = '';
  var langs = function () { return O.langs(Array.prototype.filter.call(form.querySelectorAll('input[name=lang]'), function (c) { return c.checked; }).map(function (c) { return c.value; })); };
  var status = function (t) { $('ocrStatus').textContent = t; };

  function lib() {
    if (!libP) libP = new Promise(function (ok, fail) {
      if (window.Tesseract) return ok(window.Tesseract);
      var s = document.createElement('script'); s.src = O.FACTS.lib; s.crossOrigin = 'anonymous'; s.onload = function () { ok(window.Tesseract); }; s.onerror = function (e) { libP = null; fail(e); }; document.head.appendChild(s);
    });
    return libP;
  }
  function getWorker() {
    var key = langs().join('+');
    if (worker && workerLangs === key) return Promise.resolve(worker);
    var old = worker; worker = null; if (old) old.terminate();
    return lib().then(function (T) {
      return T.createWorker(langs(), 1, {
        workerPath: O.FACTS.worker, corePath: O.FACTS.core,
        logger: function (m) { if (m && m.status) { status((L.status[m.status] || m.status) + (m.progress ? ' ' + Math.round(m.progress * 100) + '%' : '')); $('ocrProg').value = Math.round((m.progress || 0) * 100); } }
      });
    }).then(function (w) { worker = w; workerLangs = key; return w; });
  }

  // Draw the picture, scaled and rotated, optionally enhanced; returns the canvas Tesseract reads.
  function prepare() {
    var c = $('ocrCanvas'), s = O.scaleFor(img.naturalWidth, img.naturalHeight), w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s), turn = rot % 180 !== 0;
    c.width = turn ? h : w; c.height = turn ? w : h;
    var x = c.getContext('2d', { willReadFrequently: true });
    x.save(); x.translate(c.width / 2, c.height / 2); x.rotate(rot * Math.PI / 180); x.drawImage(img, -w / 2, -h / 2, w, h); x.restore();
    if (f('enhance').checked) { var d = x.getImageData(0, 0, c.width, c.height); d.data.set(O.enhance(d.data).data); x.putImageData(d, 0, 0); }
    return c;
  }

  function run() {
    if (!img) return;
    var id = ++job, t0 = performance.now(), canvas = prepare();
    $('ocrResult').setAttribute('aria-busy', 'true'); $('ocrProg').hidden = false; $('ocrProg').value = 0;
    if (!worker) status(L.first(O.downloadMb(langs())));
    getWorker().then(function (w) { return w.recognize(canvas); }).then(function (r) {
      if (id !== job) return;
      raw = r.data.text || '';
      show();
      var st = O.stats($('ocrText').value), msg = st.words ? L.done((performance.now() - t0) / 1000, r.data.confidence || 0, st.words) + ((r.data.confidence || 0) < 60 ? L.low : '') : L.none;
      status(msg); $('ocrLive').textContent = msg; finish();
    }, function () { if (id === job) { status(L.fail); finish(); } });
  }
  function finish() { $('ocrProg').hidden = true; $('ocrResult').removeAttribute('aria-busy'); }
  function show() {
    $('ocrText').value = O.clean(raw, { join: f('join').checked });
    var st = O.stats($('ocrText').value);
    $('ocrCount').textContent = st.words + (ms ? ' perkataan · ' : ' words · ') + st.chars + (ms ? ' aksara' : ' characters');
    ['ocrCopy', 'ocrSave'].forEach(function (b) { $(b).disabled = !st.chars; });
  }

  function load(file) {
    if (!file || !/^image\//.test(file.type)) { status(L.bad); return; }
    var url = URL.createObjectURL(file), im = new Image();
    im.onload = function () { img = im; rot = 0; $('ocrPreview').src = url; $('ocrPreview').hidden = false; $('ocrDropText').hidden = true; $('ocrRotate').disabled = false; run(); };
    im.onerror = function () { status(L.bad); URL.revokeObjectURL(url); };
    im.src = url;
  }
  $('ocrFile').addEventListener('change', function () { load(this.files[0]); });
  var drop = $('ocrDrop');
  ['dragenter', 'dragover'].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (ev) { if (ev.dataTransfer.files[0]) load(ev.dataTransfer.files[0]); });
  window.addEventListener('paste', function (ev) {
    if (ev.target === $('ocrText')) return;
    var items = (ev.clipboardData || {}).items || [];
    for (var i = 0; i < items.length; i++) if (items[i].type.indexOf('image/') === 0) { load(items[i].getAsFile()); break; }
  });
  $('ocrRotate').addEventListener('click', function () { rot = (rot + 90) % 360; $('ocrPreview').style.transform = 'rotate(' + rot + 'deg)'; run(); });
  $('ocrCopy').addEventListener('click', function () { var b = $('ocrCopy'), t = b.textContent, ok = function () { b.textContent = L.copied; setTimeout(function () { b.textContent = t; }, 1500); }; if (navigator.clipboard) navigator.clipboard.writeText($('ocrText').value).then(ok, ok); });
  $('ocrSave').addEventListener('click', function () { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([$('ocrText').value], { type: 'text/plain;charset=utf-8' })); a.download = L.file + '.txt'; document.body.appendChild(a); a.click(); a.remove(); });
  $('ocrPrint').addEventListener('click', function () { window.print(); });
  $('ocrText').addEventListener('input', function () { var st = O.stats(this.value); $('ocrCount').textContent = st.words + (ms ? ' perkataan · ' : ' words · ') + st.chars + (ms ? ' aksara' : ' characters'); });

  function hash() {
    var parts = [], l = langs().join('+'), def = Array.prototype.filter.call(form.querySelectorAll('input[name=lang]'), function (c) { return c.defaultChecked; }).map(function (c) { return c.value; });
    if (l !== O.langs(def).join('+')) parts.push('lang=' + l);
    if (f('enhance').checked) parts.push('enhance=1');
    if (f('join').checked) parts.push('join=1');
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
  }
  if (location.hash.length > 1) location.hash.slice(1).split('&').forEach(function (p) {
    var kv = p.split('=');
    if (kv[0] === 'lang') { var set = kv[1].split('+'); Array.prototype.forEach.call(form.querySelectorAll('input[name=lang]'), function (c) { c.checked = set.indexOf(c.value) >= 0; }); }
    else if (kv[0] === 'enhance') f('enhance').checked = kv[1] === '1'; else if (kv[0] === 'join') f('join').checked = kv[1] === '1';
  });
  form.addEventListener('change', function (e) {
    hash();
    $('ocrSize').textContent = O.downloadMb(langs());
    if (e.target.name === 'join') show(); else if (e.target.name === 'lang' || e.target.name === 'enhance') run();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  $('ocrSize').textContent = O.downloadMb(langs());
})();
