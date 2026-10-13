/* Image to Prompt UI (EN + BM). A picture is read three ways: colours, tone and aspect ratio from its pixels (always,
   in the browser); a description from the Cloudflare Workers AI vision worker; and, if that is unavailable, an
   in-browser captioning model the visitor chooses to download. The description fields stay editable and feed the
   same three-variation prompt cards as the AI Prompt Generator. */
(function () {
  'use strict';
  var P = window.TBBPrompt, C = window.TBBPromptCards;
  var form = document.getElementById('imgForm');
  if (!P || !C || !form) return;
  var ms = document.documentElement.lang === 'ms';
  var $ = function (id) { return document.getElementById(id); };
  var api = form.getAttribute('data-api');
  var FIELDS = ['subject', 'action', 'setting', 'style', 'lighting', 'shot', 'mood', 'color', 'details', 'motion', 'negative'];
  // Transformers.js and the model load only when the visitor asks for the in-browser fallback.
  var LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1', LOCAL_MODEL = 'Xenova/vit-gpt2-image-captioning';
  var T = ms ? {
    reading: 'Membaca warna dan saiz…', asking: 'AI sedang menerangkan gambar anda…', online: 'Siap: diterangkan oleh AI dalam talian. Sunting apa-apa medan di bawah.',
    busy: 'AI dalam talian sibuk atau had harian sudah habis. Warna dan nisbah sudah diisi; tambah subjek sendiri atau guna AI dalam pelayar.',
    loading: 'Memuatkan AI dalam pelayar…', downloading: function (p) { return 'Memuat turun model AI: ' + p + '%'; },
    thinking: 'AI dalam pelayar sedang menerangkan gambar…', local: 'Siap: diterangkan oleh AI dalam pelayar (ringkas). Tambah butiran untuk hasil lebih baik.',
    localFail: 'AI dalam pelayar tidak dapat dimuatkan pada peranti ini. Taip subjek sendiri; warna dan nisbah sudah diisi.',
    bad: 'Fail ini tidak dapat dibaca. Guna gambar JPG, PNG atau WebP.'
  } : {
    reading: 'Reading colours and size…', asking: 'The AI is describing your picture…', online: 'Done: described by the online AI. Edit any field below.',
    busy: "The online AI is busy or today's free limit is used up. Colours and aspect ratio are filled in; add the subject yourself or use the in-browser AI.",
    loading: 'Loading the in-browser AI…', downloading: function (p) { return 'Downloading the AI model: ' + p + '%'; },
    thinking: 'The in-browser AI is describing your picture…', local: 'Done: described by the in-browser AI (short caption). Add details for a better result.',
    localFail: "The in-browser AI couldn't load on this device. Type the subject yourself; colours and aspect ratio are filled in.",
    bad: "This file couldn't be read. Use a JPG, PNG or WebP picture."
  };
  var picture = '', captioner = null;

  function mode() { return form.elements.mode.value === 'video' ? 'video' : 'image'; }
  function getState() {
    var s = { mode: mode(), platform: form.elements.platform.value, aspect: form.elements.aspect.value };
    FIELDS.forEach(function (k) { s[k] = form.elements[k].value; });
    return s;
  }
  function setFields(s) {
    FIELDS.forEach(function (k) { if (k !== 'negative' && k !== 'motion') form.elements[k].value = s[k] || ''; });
    if (s.aspect) form.elements.aspect.value = s.aspect;
  }
  function status(text, busy) { $('iStatus').textContent = text; $('iStatus').className = 'note' + (busy ? ' live on' : ''); }

  function setPlatforms(m) {
    var sel = form.elements.platform, list = P.PLATFORMS[m];
    sel.textContent = '';
    Object.keys(list).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = list[k].name; sel.appendChild(o); });
    Array.prototype.forEach.call(form.querySelectorAll('[data-only]'), function (el) { el.hidden = el.getAttribute('data-only') !== m; });
  }
  function render() {
    var s = C.update(getState());
    $('iEdit').href = $('iEdit').getAttribute('href').split('#')[0] + '#' + P.toHash(s);
  }

  function swatches(palette) {
    var box = $('iSwatches');
    box.textContent = '';
    palette.forEach(function (c) {
      var span = document.createElement('span'), dot = document.createElement('i');
      dot.style.background = c.hex;
      span.appendChild(dot);
      span.appendChild(document.createTextNode(c.name + ' ' + c.share + '%'));
      box.appendChild(span);
    });
    box.hidden = !palette.length;
  }

  // Shrink to 560 px (cheaper for the vision model, quick to upload) and read pixels from a 96 px copy.
  function readImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, 560 / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var s = Math.min(1, 96 / Math.max(w, h)), small = document.createElement('canvas');
        small.width = Math.max(1, Math.round(w * s)); small.height = Math.max(1, Math.round(h * s));
        var sx = small.getContext('2d');
        sx.drawImage(img, 0, 0, small.width, small.height);
        var px = sx.getImageData(0, 0, small.width, small.height).data;
        $('iPreview').src = url;
        $('iPreview').hidden = false;
        $('iDropText').hidden = true;
        resolve({ data: c.toDataURL('image/jpeg', 0.85), local: P.analyse(px, w, h) });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  function online(data) {
    if (!api || !window.fetch) return Promise.reject(new Error('no api'));
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 30000);
    return fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: data }), signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (j) { clearTimeout(timer); if (!j || !j.ok) throw new Error(j && j.error || 'busy'); return P.parseVision(j.text); },
        function (e) { clearTimeout(timer); throw e; });
  }

  function inBrowser() {
    if (!captioner) {
      status(T.loading, true);
      captioner = import(LIB).then(function (lib) {
        return lib.pipeline('image-to-text', LOCAL_MODEL, {
          progress_callback: function (p) { if (p && p.status === 'progress' && /\.onnx$/.test(p.file || '')) status(T.downloading(Math.round(p.progress || 0)), true); }
        });
      });
      captioner.catch(function () { captioner = null; });
    }
    return captioner.then(function (cap) { status(T.thinking, true); return cap(picture); })
      .then(function (out) { return P.parseVision(out && out[0] && out[0].generated_text); });
  }

  var local = null;
  function apply(vision) {
    setFields(P.merge(vision, local, mode()));
    render();
  }
  function handle(file) {
    if (!file || !/^image\//.test(file.type)) { status(T.bad); return; }
    status(T.reading, true);
    $('iLocal').hidden = true;
    readImage(file).then(function (r) {
      picture = r.data; local = r.local;
      swatches(local.palette);
      apply({});
      status(T.asking, true);
      return online(picture).then(function (v) { apply(v); status(T.online); }, function () { status(T.busy); $('iLocal').hidden = false; });
    }, function () { status(T.bad); });
  }

  $('imgFile').addEventListener('change', function () { handle(this.files[0]); });
  var drop = $('iDrop');
  ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); });
  document.addEventListener('paste', function (e) {
    var items = e.clipboardData && e.clipboardData.files;
    if (items && items[0] && /^image\//.test(items[0].type)) handle(items[0]);
  });
  $('iLocal').addEventListener('click', function () {
    if (!picture) return;
    $('iLocal').hidden = true;
    inBrowser().then(function (v) { apply(v); status(T.local); }, function () { status(T.localFail); });
  });

  var frame = 0;
  var later = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); };
  form.addEventListener('input', later);
  form.addEventListener('change', function (e) {
    if (e.target.name === 'mode') {
      setPlatforms(mode());
      if (!local) form.elements.aspect.value = mode() === 'video' ? '16:9' : '1:1';
    }
    later();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); render(); });
  $('pPrint').addEventListener('click', function () { window.print(); });
  C.bind(getState);
})();
