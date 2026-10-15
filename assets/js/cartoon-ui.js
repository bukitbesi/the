/* Photo to cartoon UI (BM + EN). The picture never leaves the browser: it is drawn on a canvas, passed to
   TBBCartoon.cartoon(), and shown with a before/after slider. Settings (not the picture) live in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBCartoon;
  var form = document.getElementById('cartoonForm');
  if (!X || !form) return;
  var ms = document.documentElement.lang === 'ms';
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  var T = ms ? {
    working: 'Sedang melukis kartun…', done: function (ms2, w, h) { return 'Siap dalam ' + (ms2 / 1000).toFixed(1) + ' saat · ' + w + ' × ' + h + ' px. Gambar tidak dimuat naik.'; },
    bad: 'Fail ini bukan gambar yang boleh dibaca. Cuba JPG, PNG atau WebP.', file: 'kartun', colors: 'warna'
  } : {
    working: 'Drawing your cartoon…', done: function (ms2, w, h) { return 'Done in ' + (ms2 / 1000).toFixed(1) + ' s · ' + w + ' × ' + h + ' px. Your picture was not uploaded.'; },
    bad: 'This file is not a picture the browser can read. Try JPG, PNG or WebP.', file: 'cartoon', colors: 'colours'
  };
  var src = null, srcW = 0, srcH = 0, name = 'photo', busy = 0;
  var cin = $('cIn'), cout = $('cOut');

  function syncOutputs() {
    ['colors', 'smooth', 'line', 'thick'].forEach(function (k) { var o = $('o_' + k); if (o) o.textContent = k === 'line' ? Math.round(f(k).value * 100) + '%' : f(k).value; });
    var sk = styleValue() === 'sketch';
    ['colors', 'smooth', 'line', 'thick'].forEach(function (k) { $('w_' + k).hidden = sk; });
  }
  function styleValue() { var r = form.querySelector('input[name=style]:checked'); return r ? r.value : 'classic'; }
  // Choosing a style loads its preset into the sliders.
  function applyPreset(style) {
    var s = X.STYLES[style];
    if (s.mode === 'sketch') return;
    f('colors').value = s.colors; f('smooth').value = s.smooth; f('line').value = s.line; f('thick').value = s.thick;
  }

  function hash() {
    var parts = ['style=' + styleValue()], s = X.STYLES[styleValue()];
    ['colors', 'smooth', 'line', 'thick'].forEach(function (k) { if (s.mode !== 'sketch' && Number(f(k).value) !== s[k]) parts.push(k + '=' + f(k).value); });
    history.replaceState(null, '', parts.length > 1 || styleValue() !== 'classic' ? '#' + parts.join('&') : location.pathname);
  }
  function fromHash() {
    if (location.hash.length < 2) return;
    var kv = {};
    location.hash.slice(1).split('&').forEach(function (p) { var i = p.indexOf('='); if (i > 0) kv[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1)); });
    if (kv.style && X.STYLES[kv.style]) { var r = form.querySelector('input[name=style][value="' + kv.style + '"]'); if (r) { r.checked = true; applyPreset(kv.style); } }
    ['colors', 'smooth', 'line', 'thick'].forEach(function (k) { if (kv[k] !== undefined) f(k).value = kv[k]; });
  }

  function render() {
    if (!src) return;
    var job = ++busy;
    $('cStatus').textContent = T.working;
    $('cResult').setAttribute('aria-busy', 'true');
    // Let the status paint before the heavy work starts.
    setTimeout(function () {
      if (job !== busy) return;
      var t = performance.now();
      var r = X.cartoon(new Uint8ClampedArray(src.data), srcW, srcH, { style: styleValue(), colors: f('colors').value, smooth: f('smooth').value, line: f('line').value, thick: f('thick').value });
      cout.getContext('2d').putImageData(new ImageData(r.data, srcW, srcH), 0, 0);
      var sw = $('cPalette'); sw.textContent = '';
      r.palette.forEach(function (c) { var s = document.createElement('span'); s.style.background = 'rgb(' + c.join(',') + ')'; s.title = 'rgb(' + c.join(', ') + ')'; sw.appendChild(s); });
      sw.hidden = !r.palette.length;
      $('cStatus').textContent = T.done(performance.now() - t, srcW, srcH);
      $('cLive').textContent = T.done(performance.now() - t, srcW, srcH);
      $('cResult').removeAttribute('aria-busy');
      $('cDownload').disabled = false;
    }, 30);
  }

  function load(file) {
    if (!file || !/^image\//.test(file.type)) { $('cStatus').textContent = T.bad; return; }
    name = (file.name || 'photo').replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').slice(0, 40) || 'photo';
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var d = X.fit(img.naturalWidth, img.naturalHeight);
      srcW = d.w; srcH = d.h;
      [cin, cout].forEach(function (c) { c.width = srcW; c.height = srcH; });
      var ctx = cin.getContext('2d');
      ctx.drawImage(img, 0, 0, srcW, srcH);
      src = ctx.getImageData(0, 0, srcW, srcH);
      URL.revokeObjectURL(url);
      $('cStage').style.aspectRatio = srcW + ' / ' + srcH;
      $('cStage').hidden = false; $('cEmpty').hidden = true; $('cSplitWrap').hidden = false;
      $('cDropText').hidden = true;
      var prev = $('cPreview'); prev.src = cin.toDataURL('image/jpeg', 0.7); prev.hidden = false;
      render();
    };
    img.onerror = function () { $('cStatus').textContent = T.bad; URL.revokeObjectURL(url); };
    img.src = url;
  }

  $('cFile').addEventListener('change', function () { load(this.files[0]); });
  var drop = $('cDrop');
  ['dragenter', 'dragover'].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (ev) { if (ev.dataTransfer.files[0]) load(ev.dataTransfer.files[0]); });
  window.addEventListener('paste', function (ev) {
    var items = (ev.clipboardData || {}).items || [];
    for (var i = 0; i < items.length; i++) if (items[i].type.indexOf('image/') === 0) { load(items[i].getAsFile()); break; }
  });

  form.addEventListener('change', function (ev) {
    if (ev.target.name === 'style') applyPreset(ev.target.value);
    syncOutputs(); hash(); render();
  });
  form.addEventListener('input', function (ev) { if (ev.target.type === 'range') syncOutputs(); });
  form.addEventListener('submit', function (ev) { ev.preventDefault(); });

  var split = $('cSplit');
  function setSplit() { cin.style.clipPath = 'inset(0 ' + (100 - split.value) + '% 0 0)'; $('cHandle').style.left = split.value + '%'; }
  split.addEventListener('input', setSplit);

  $('cDownload').addEventListener('click', function () {
    cout.toBlob(function (b) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name + '-' + T.file + '-' + styleValue() + '.png';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, 'image/png');
  });
  $('cReset').addEventListener('click', function () { applyPreset(styleValue()); syncOutputs(); hash(); render(); });

  fromHash(); syncOutputs(); setSplit();
})();
