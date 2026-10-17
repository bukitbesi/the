/* EXIF Editor UI. Photos are read and rewritten in the browser and never uploaded. The form starts with the
   sample photo's values (rendered at build time); the sample bytes are fetched only when needed. Only fields the
   user changed are written, so untouched tags and XMP stay exactly as they were. The five Google Images rights
   fields are mirrored in the URL hash so a bookmarked link refills them. */
(function () {
  'use strict';
  var X = window.TBBExif;
  var form = document.getElementById('exForm');
  if (!X || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var V = X.views, E = form.elements;
  var SAMPLE = $('exPreview').getAttribute('data-sample');
  var RIGHTS = ['creator', 'credit', 'copyright', 'webStatement', 'licensorUrl', 'title', 'description', 'keywords'];
  var HASHED = ['creator', 'credit', 'copyright', 'webStatement', 'licensorUrl'];
  var CAMERA = ['Make', 'Model', 'LensModel', 'Software'];
  var MIME = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  var files = [], cur = -1, base = null, previewUrl = '';
  var ERR = {
    heif: 'HEIC and HEIF photos are not supported. Convert the photo to JPEG first.',
    unsupported: 'This is not a JPEG, PNG or WebP image.',
    truncated: 'This file looks incomplete or damaged.', corrupt: 'This file looks damaged.',
    segmentTooLarge: 'The metadata is over 64 KB, the most one JPEG block can hold. Shorten the text or remove the thumbnail.',
    tooBig: 'Files up to 50 MB are supported.',
    DateTimeOriginal: 'Enter a valid date taken.', lat: 'Latitude must be between -90 and 90.', lon: 'Longitude must be between -180 and 180.', alt: 'Altitude must be a number.'
  };

  var exifDateToInput = function (s) { var m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}:\d{2}:\d{2})/.exec(s || ''); return m ? m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] : ''; };
  var num = function (s) { s = String(s).trim().replace(',', '.'); return s === '' ? null : Number(s); };
  var hashState = function () {
    var q = new URLSearchParams(location.hash.slice(1)), out = {};
    HASHED.forEach(function (k) { if (q.has(k)) out[k] = q.get(k); });
    return out;
  };
  function saveHash() {
    var q = new URLSearchParams();
    HASHED.forEach(function (k) { if (E[k].value.trim()) q.set(k, E[k].value.trim()); });
    var s = q.toString();
    history.replaceState(null, '', s ? '#' + s : location.pathname + location.search);
  }
  function error(msg) { $('exError').hidden = !msg; $('exError').textContent = msg || ''; }
  function say(msg) { $('exStatus').textContent = msg; $('exLive').textContent = msg; }
  function mapLink() {
    var lat = num(E.lat.value), lon = num(E.lon.value), ok = lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
    E.lat.setAttribute('aria-invalid', String(lat !== null && !(Math.abs(lat) <= 90)));
    E.lon.setAttribute('aria-invalid', String(lon !== null && !(Math.abs(lon) <= 180)));
    $('exMap').hidden = !ok || E.nogps.checked;
    if (ok) $('exMap').firstChild.href = V.mapUrl({ lat: lat, lon: lon });
  }

  // Fill the form from a file's metadata; the hash preset wins for the rights fields.
  function fill(info, raw) {
    var v = info.exif ? info.exif.values : {}, g = info.exif && info.exif.gps, preset = raw ? {} : hashState();
    RIGHTS.forEach(function (k) { E[k].value = preset[k] !== undefined ? preset[k] : info.rights[k] || ''; });
    CAMERA.forEach(function (k) { E[k].value = v[k] || ''; });
    E.DateTimeOriginal.value = exifDateToInput(v.DateTimeOriginal || v.CreateDate);
    E.orientation.value = String(info.exif && info.exif.orientation || 1);
    E.lat.value = g ? g.lat : '';
    E.lon.value = g ? g.lon : '';
    E.alt.value = g && g.alt !== undefined ? g.alt : '';
    E.nogps.checked = E.ids.checked = E.thumb.checked = false;
    base = { rights: info.rights, values: v, gps: g || null, orientation: info.exif && info.exif.orientation || 1, date: E.DateTimeOriginal.value };
    mapLink();
  }
  function show(i, keepForm, raw) {
    cur = i;
    var f = files[i];
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(new Blob([f.bytes], { type: MIME[f.info.format] }));
    $('exPreview').src = previewUrl;
    $('exPreview').alt = 'Preview of ' + f.name;
    $('exInfo').innerHTML = V.fileInfo(f.name, f.info);
    $('exPrivacy').innerHTML = V.privacyList(f.info);
    $('exTables').innerHTML = V.metaTables(f.info);
    $('exPick').value = String(i);
    if (!keepForm) fill(f.info, raw);
  }
  function list() {
    var many = files.length > 1;
    $('exPickWrap').hidden = !many;
    $('exAll').hidden = !many;
    $('exPick').innerHTML = files.map(function (f, i) { return '<option value="' + i + '">' + V.esc(f.name) + '</option>'; }).join('');
  }

  function readFile(name, buf) {
    var bytes = new Uint8Array(buf), info = X.read(bytes);
    if (info.error) throw new Error(info.error);
    return { name: name, bytes: bytes, info: info };
  }
  function add(items) {
    var bad = [];
    var jobs = Array.prototype.map.call(items, function (file) {
      if (file.size > X.FACTS.maxBytes) { bad.push(file.name + ': ' + ERR.tooBig); return null; }
      return file.arrayBuffer().then(function (buf) {
        try { return readFile(file.name, buf); } catch (e) { bad.push(file.name + ': ' + (ERR[e.message] || e.message)); return null; }
      });
    });
    return Promise.all(jobs).then(function (got) {
      got = got.filter(Boolean);
      error(bad.join(' '));
      if (!got.length) return;
      files = got;
      list();
      show(0);
      say(files.length > 1 ? files.length + ' photos loaded. Edit one at a time, or apply the copyright to all.' : 'Loaded ' + files[0].name + '.');
    });
  }
  function loadUrl(url, keepForm, raw) {
    return fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
      files = [readFile(url.split('/').pop(), buf)];
      list();
      show(0, keepForm, raw);
      error('');
    });
  }
  // Before any file is chosen the form already describes the sample, so fetch it without refilling the form.
  var ensure = function () { return files.length ? Promise.resolve() : loadUrl(SAMPLE, true); };

  function rightsValues() {
    var r = {};
    RIGHTS.forEach(function (k) { r[k] = E[k].value.trim(); });
    return r;
  }
  function rightsEdits(r) {
    var ex = {};
    if (E.sync.checked) { ex.Artist = r.creator; ex.Copyright = r.copyright; }
    return ex;
  }
  // Compare the form with the file and keep only what changed.
  function edits() {
    var e = { exif: {} }, r = rightsValues(), changed = RIGHTS.some(function (k) { return r[k] !== String(base.rights[k] || ''); });
    if (changed) { e.rights = r; e.exif = rightsEdits(r); }
    CAMERA.forEach(function (k) { var v = E[k].value.trim(); if (v !== (base.values[k] || '')) e.exif[k] = v; });
    if (X.exifDate(E.DateTimeOriginal.value) !== X.exifDate(base.date)) e.exif.DateTimeOriginal = e.exif.CreateDate = E.DateTimeOriginal.value;
    if (+E.orientation.value !== base.orientation) e.orientation = +E.orientation.value;
    if (E.ids.checked) { e.exif.SerialNumber = ''; e.exif.LensSerialNumber = ''; e.exif.OwnerName = ''; }
    if (E.thumb.checked) e.removeThumbnail = true;
    var lat = num(E.lat.value), lon = num(E.lon.value), alt = num(E.alt.value), g = base.gps;
    if (E.nogps.checked || (lat === null && lon === null && g)) e.gps = null;
    else if (lat !== null || lon !== null) {
      if (!g || lat !== g.lat || lon !== g.lon || alt !== (g.alt === undefined ? null : g.alt)) e.gps = { lat: lat === null ? NaN : lat, lon: lon === null ? NaN : lon, alt: alt === null ? '' : alt };
    }
    return e;
  }
  function download(bytes, name, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bytes], { type: type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  var editedName = function (n) { return n.replace(/(-edited)?(\.[^.]+)?$/, function (m, e, ext) { return '-edited' + (ext || ''); }); };
  function fail(e) {
    var m = String(e && e.message || e), codes = m.indexOf('invalid:') === 0 ? m.slice(8).split(',') : [m];
    error(codes.map(function (c) { return ERR[c] || c; }).join(' '));
  }

  function save() {
    ensure().then(function () {
      var f = files[cur], e = edits(), out;
      try { out = X.write(f.bytes, e); } catch (err) { return fail(err); }
      error('');
      var name = editedName(f.name);
      download(out, name, MIME[f.info.format]);
      var before = f.bytes.length;
      files[cur] = readFile(name, out.buffer);
      show(cur);
      list();
      say('Saved ' + name + ': ' + V.size(before) + ' → ' + V.size(out.length) + '. Image data unchanged.');
    }, fail);
  }
  function stampAll() {
    var r = rightsValues(), out = [], bad = [];
    files.forEach(function (f) {
      try { out.push({ name: editedName(f.name), bytes: X.write(f.bytes, { rights: r, exif: rightsEdits(r) }) }); } catch (e) { bad.push(f.name); }
    });
    if (out.length) download(X.zip(out, new Date()), 'photos-copyright.zip', 'application/zip');
    error(bad.length ? 'Could not write: ' + bad.join(', ') : '');
    say('Copyright written to ' + out.length + ' of ' + files.length + ' photos; ZIP downloaded.');
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); save(); });
  form.addEventListener('input', function (e) {
    if (HASHED.indexOf(e.target.name) >= 0) saveHash();
    if (e.target.name === 'lat' || e.target.name === 'lon') mapLink();
  });
  E.nogps.addEventListener('change', mapLink);
  $('exFile').addEventListener('change', function () { if (this.files.length) add(this.files); this.value = ''; });
  var drop = $('exDrop');
  drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
  drop.addEventListener('drop', function (e) {
    e.preventDefault();
    drop.classList.remove('over');
    if (e.dataTransfer && e.dataTransfer.files.length) add(e.dataTransfer.files);
  });
  $('exPick').addEventListener('change', function () { show(+this.value); });
  $('exSample').addEventListener('click', function () { loadUrl(SAMPLE).then(function () { say('Sample photo loaded.'); }, fail); });
  $('exPrint').addEventListener('click', function () { window.print(); });
  $('exAll').addEventListener('click', stampAll);
  var hero = $('exHero');
  if (hero) hero.addEventListener('click', function () {
    // Show the picture's own fields, not a bookmarked preset.
    loadUrl(hero.getAttribute('data-src'), false, true).then(function () {
      form.scrollIntoView({ behavior: 'smooth' });
      say('Loaded ' + files[0].name + ': see its copyright fields below.');
    }, fail);
  });

  // The page ships with the sample's values; a bookmarked preset replaces the rights fields.
  base = {
    rights: (function () { var r = {}; RIGHTS.forEach(function (k) { r[k] = E[k].defaultValue !== undefined ? E[k].defaultValue : E[k].value; }); return r; })(),
    values: (function () { var v = {}; CAMERA.forEach(function (k) { v[k] = E[k].defaultValue; }); return v; })(),
    gps: { lat: num(E.lat.defaultValue), lon: num(E.lon.defaultValue), alt: num(E.alt.defaultValue) === null ? undefined : num(E.alt.defaultValue) },
    orientation: 1, date: E.DateTimeOriginal.defaultValue
  };
  var preset = hashState();
  Object.keys(preset).forEach(function (k) { E[k].value = preset[k]; });
})();
