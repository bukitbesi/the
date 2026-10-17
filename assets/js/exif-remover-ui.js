/* EXIF Remover UI. Photos are cleaned in the browser and never uploaded. Originals stay in memory so changing an
   option re-cleans every photo; options are kept in the URL hash. The page ships with the sample's result
   rendered at build time. */
(function () {
  'use strict';
  var X = window.TBBExif;
  var form = document.getElementById('rmForm');
  if (!X || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var V = X.views, E = form.elements;
  var OPTS = { keepOrientation: true, keepIcc: true, keepRights: false, keepTrailer: false };
  var MIME = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  var SAMPLE = '/assets/img/exif-sample-bukit-besi.jpg';
  var originals = [], results = [], urls = [];
  var ERR = {
    heif: 'HEIC and HEIF photos are not supported; convert to JPEG first.', unsupported: 'not a JPEG, PNG or WebP image.',
    truncated: 'the file looks incomplete.', corrupt: 'the file looks damaged.', tooBig: 'files up to 50 MB are supported.'
  };

  function opts() { var o = {}; Object.keys(OPTS).forEach(function (k) { o[k] = E[k].checked; }); return o; }
  function saveHash() {
    var q = new URLSearchParams(), o = opts();
    Object.keys(OPTS).forEach(function (k) { if (o[k] !== OPTS[k]) q.set(k, o[k] ? '1' : '0'); });
    var s = q.toString();
    history.replaceState(null, '', s ? '#' + s : location.pathname + location.search);
  }
  function restore() {
    var q = new URLSearchParams(location.hash.slice(1));
    Object.keys(OPTS).forEach(function (k) { if (q.has(k)) E[k].checked = q.get(k) === '1'; });
  }
  function revoke() { urls.forEach(function (u) { URL.revokeObjectURL(u); }); urls = []; }

  function render() {
    revoke();
    var o = opts(), errors = [];
    results = [];
    var html = originals.map(function (f) {
      if (f.error) { errors.push(f.name + ': ' + (ERR[f.error] || f.error)); return ''; }
      try {
        var s = X.strip(f.bytes, o), url = URL.createObjectURL(new Blob([s.bytes], { type: MIME[s.info.format] }));
        urls.push(url);
        results.push({ name: V.cleanName(f.name), s: s });
        return V.resultCard(f.name, s, url);
      } catch (e) { errors.push(f.name + ': ' + (ERR[e.message] || e.message)); return ''; }
    }).join('');
    $('rmList').innerHTML = html;
    $('rmError').hidden = !errors.length;
    $('rmError').textContent = errors.join(' ');
    $('rmZip').hidden = results.length < 2;
    var before = 0, after = 0, found = 0;
    results.forEach(function (r) { before += r.s.before; after += r.s.after; found += r.s.info.privacy.length; });
    var msg = results.length
      ? results.length + (results.length === 1 ? ' photo' : ' photos') + ' cleaned: ' + V.size(before) + ' → ' + V.size(after) + ', ' + found + ' kinds of personal data removed.'
      : 'Choose photos to clean.';
    $('rmStats').textContent = msg;
    $('rmLive').textContent = msg;
  }

  function add(items) {
    var jobs = Array.prototype.map.call(items, function (file) {
      if (file.size > X.FACTS.maxBytes) return Promise.resolve({ name: file.name, error: 'tooBig' });
      return file.arrayBuffer().then(function (buf) {
        var bytes = new Uint8Array(buf), info = X.read(bytes);
        return info.error ? { name: file.name, error: info.error } : { name: file.name, bytes: bytes };
      });
    });
    return Promise.all(jobs).then(function (got) { originals = got; render(); });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('change', function (e) {
    if (e.target.id === 'rmFile') return;
    saveHash();
    if (originals.length) render();
  });
  $('rmFile').addEventListener('change', function () { if (this.files.length) add(this.files); this.value = ''; });
  var drop = $('rmDrop');
  drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
  drop.addEventListener('drop', function (e) {
    e.preventDefault();
    drop.classList.remove('over');
    if (e.dataTransfer && e.dataTransfer.files.length) add(e.dataTransfer.files);
  });
  $('rmZip').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([X.zip(results.map(function (r) { return { name: r.name, bytes: r.s.bytes }; }), new Date())], { type: 'application/zip' }));
    a.download = 'clean-photos.zip';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    $('rmLive').textContent = 'ZIP with ' + results.length + ' photos downloaded.';
  });
  $('rmSample').addEventListener('click', function () {
    fetch(SAMPLE).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
      originals = [{ name: SAMPLE.split('/').pop(), bytes: new Uint8Array(buf) }];
      render();
    });
  });
  $('rmPrint').addEventListener('click', function () { window.print(); });
  $('rmClear').addEventListener('click', function () {
    originals = [];
    render();
    $('rmList').innerHTML = '';
  });

  restore();
})();
