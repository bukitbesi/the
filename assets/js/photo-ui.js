/* Photo Editor UI. A layer document (photo-core.js) is drawn to a canvas; everything runs on the device and
   nothing is uploaded. Image layers keep their original pixels; adjustments are applied to a cached copy (a
   screen-sized one while editing, the full-size one on export), so edits are non-destructive and undoable. */
(function () {
  'use strict';
  var P = window.TBBPhoto;
  var form = document.getElementById('peForm');
  if (!P || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var stage = $('peStage'), cv = $('peCanvas'), ov = $('peOverlay'), ctx = cv.getContext('2d'), octx = ov.getContext('2d');
  var SAMPLE = stage.getAttribute('data-sample');
  var doc = P.newDoc(800, 533), bitmaps = {}, cache = {}, history = new P.History();
  var view = { k: 1, dpr: 1 }, mode = 'move', crop = null, cropRatio = 0, drag = null, comparing = false, raf = 0, drawLayer = null;
  var MIME = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }, EXT = { jpeg: 'jpg', png: 'png', webp: 'webp' };
  var fileBase = 'photo';

  // ---------------------------------------------------------------- helpers
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  function say(m) { $('peLive').textContent = m; }
  function error(m) { $('peError').hidden = !m; $('peError').textContent = m || ''; }
  function sel() { return P.find(doc, doc.selected); }
  function snapshot() { history.push(doc); syncUndo(); }
  function syncUndo() { $('peUndo').disabled = !history.past.length; $('peRedo').disabled = !history.future.length; }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; render(); }); }

  // ---------------------------------------------------------------- images and adjustments
  function decode(blob) {
    if (typeof createImageBitmap !== 'undefined') return createImageBitmap(blob).catch(function () { return viaImg(blob); });
    return viaImg(blob);
  }
  function viaImg(blob) {
    return new Promise(function (ok, bad) {
      var img = new Image(), u = URL.createObjectURL(blob);
      img.onload = function () { ok(img); };
      img.onerror = function () { URL.revokeObjectURL(u); bad(new Error('This file could not be opened as an image. HEIC opens only in Safari.')); };
      img.src = u;
    });
  }
  function dims(b) { return { w: b.naturalWidth || b.width, h: b.naturalHeight || b.height }; }
  // Adjusted pixels for an image layer at a given scale (1 = full size), cached by settings.
  function processed(l, scale) {
    var src = bitmaps[l.src];
    if (!src) return null;
    var d = dims(src), a = comparing ? P.NONE : P.combine(l.filter, l.adjust);
    var w = Math.max(1, Math.round(d.w * Math.min(1, scale))), h = Math.max(1, Math.round(d.h * Math.min(1, scale)));
    if (P.isIdentity(a) && w === d.w) return src;
    var key = l.src + '|' + w + '|' + JSON.stringify(a);
    if (cache[key]) return cache[key];
    var c = canvas(w, h), x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, w, h);
    if (!P.isIdentity(a)) {
      var img = x.getImageData(0, 0, w, h);
      P.apply(img, a, w / d.w);
      x.putImageData(img, 0, 0);
    }
    Object.keys(cache).forEach(function (k) { if (k.indexOf(l.src + '|' + w + '|') === 0) delete cache[k]; });
    cache[key] = c;
    return c;
  }
  function measureText(l) {
    var lines = P.textLines(l.text), m = ctx;
    m.save(); m.font = P.fontCss(l);
    var w = Math.max.apply(null, lines.map(function (t) { return m.measureText(t).width; }));
    m.restore();
    var cx = l.x + l.w / 2, cy = l.y + l.h / 2, pad = l.box ? l.size * 0.3 : l.size * 0.1;
    l.w = Math.max(l.size * 0.6, w + pad * 2 + l.strokeWidth);
    l.h = lines.length * l.size * l.lineHeight + pad * 2;
    l.x = cx - l.w / 2; l.y = cy - l.h / 2;
  }

  // ---------------------------------------------------------------- rendering
  function drawLayerTo(c, l, k, full) {
    if (l.hidden) return;
    c.save();
    c.globalAlpha = l.opacity / 100;
    c.globalCompositeOperation = l.blend || 'source-over';
    if (l.type === 'draw') {
      var off = canvas(doc.w * k, doc.h * k), ox = off.getContext('2d');
      ox.lineCap = ox.lineJoin = 'round';
      l.paths.forEach(function (p) {
        ox.globalCompositeOperation = p.erase ? 'destination-out' : 'source-over';
        ox.strokeStyle = p.color; ox.fillStyle = p.color; ox.lineWidth = p.size * k;
        ox.beginPath();
        p.points.forEach(function (q, i) { if (i) ox.lineTo(q[0] * k, q[1] * k); else ox.moveTo(q[0] * k, q[1] * k); });
        if (p.points.length === 1) { ox.arc(p.points[0][0] * k, p.points[0][1] * k, p.size * k / 2, 0, Math.PI * 2); ox.fill(); } else ox.stroke();
      });
      c.drawImage(off, 0, 0);
      c.restore();
      return;
    }
    c.translate((l.x + l.w / 2) * k, (l.y + l.h / 2) * k);
    c.rotate((l.rotation || 0) * Math.PI / 180);
    c.scale(l.flipX ? -1 : 1, l.flipY ? -1 : 1);
    var w = l.w * k, h = l.h * k;
    if (l.type === 'image') {
      var src = processed(l, full ? 1 : Math.min(1, (l.w * k) / dims(bitmaps[l.src] || { width: 1, height: 1 }).w * 1.5));
      if (src) { c.imageSmoothingQuality = 'high'; c.drawImage(src, -w / 2, -h / 2, w, h); }
    } else if (l.type === 'shape') {
      c.fillStyle = l.fill; c.strokeStyle = l.stroke; c.lineWidth = l.strokeWidth * k; c.lineCap = 'round';
      c.beginPath();
      if (l.kind === 'ellipse') c.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      else if (l.kind === 'line' || l.kind === 'arrow') {
        c.lineWidth = Math.max(1, (l.strokeWidth || 6)) * k; c.strokeStyle = l.fill;
        c.moveTo(-w / 2, 0); c.lineTo(w / 2, 0);
        if (l.kind === 'arrow') { var hd = Math.min(w / 3, c.lineWidth * 4); c.moveTo(w / 2 - hd, -hd * 0.6); c.lineTo(w / 2, 0); c.lineTo(w / 2 - hd, hd * 0.6); }
        c.stroke(); c.restore(); return;
      } else if (c.roundRect && l.radius) c.roundRect(-w / 2, -h / 2, w, h, Math.min(w, h) / 2 * l.radius / 100);
      else c.rect(-w / 2, -h / 2, w, h);
      if (l.fill && l.fill !== 'transparent') c.fill();
      if (l.strokeWidth > 0) c.stroke();
    } else if (l.type === 'text') {
      var lines = P.textLines(l.text), size = l.size * k, lh = size * l.lineHeight;
      if (l.box) { c.fillStyle = l.box; c.beginPath(); if (c.roundRect) c.roundRect(-w / 2, -h / 2, w, h, size * 0.2); else c.rect(-w / 2, -h / 2, w, h); c.fill(); }
      c.font = P.fontCss({ italic: l.italic, weight: l.weight, size: size, font: l.font });
      c.textAlign = l.align; c.textBaseline = 'middle';
      var x = l.align === 'left' ? -w / 2 + size * 0.3 : l.align === 'right' ? w / 2 - size * 0.3 : 0, top = -(lines.length - 1) * lh / 2;
      if (l.shadow) { c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = size * 0.15; c.shadowOffsetY = size * 0.05; }
      lines.forEach(function (t, i) {
        if (l.strokeWidth > 0) { c.lineJoin = 'round'; c.strokeStyle = l.stroke; c.lineWidth = l.strokeWidth * k * 2; c.strokeText(t, x, top + i * lh); c.shadowColor = 'transparent'; }
        c.fillStyle = l.color; c.fillText(t, x, top + i * lh);
      });
    }
    c.restore();
  }
  function paint(c, k, full) {
    c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    if (doc.bg) { c.fillStyle = doc.bg; c.fillRect(0, 0, doc.w * k, doc.h * k); }
    doc.layers.forEach(function (l) { drawLayerTo(c, l, k, full); });
  }
  function layout() {
    var maxW = stage.clientWidth, maxH = Math.max(260, Math.min(window.innerHeight * 0.62, 720));
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    view.k = Math.min(maxW / doc.w, maxH / doc.h, 4);
    var w = Math.round(doc.w * view.k), h = Math.round(doc.h * view.k);
    [cv, ov].forEach(function (c) { c.width = Math.round(w * view.dpr); c.height = Math.round(h * view.dpr); c.style.width = w + 'px'; c.style.height = h + 'px'; });
    stage.style.height = h + 'px';
  }
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    paint(ctx, view.k * view.dpr, false);
    overlay();
    $('peInfo').textContent = doc.w + ' × ' + doc.h + ' px · ' + doc.layers.length + (doc.layers.length === 1 ? ' layer' : ' layers') + (sel() ? ' · selected: ' + layerName(sel()) : '');
  }
  function overlay() {
    var k = view.k * view.dpr;
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, ov.width, ov.height);
    if (mode === 'crop' && crop) {
      octx.fillStyle = 'rgba(0,0,0,.5)';
      octx.fillRect(0, 0, ov.width, ov.height);
      octx.clearRect(crop.x * k, crop.y * k, crop.w * k, crop.h * k);
      octx.strokeStyle = '#fff'; octx.lineWidth = 2; octx.setLineDash([]);
      octx.strokeRect(crop.x * k, crop.y * k, crop.w * k, crop.h * k);
      octx.strokeStyle = 'rgba(255,255,255,.5)'; octx.lineWidth = 1;
      for (var i = 1; i < 3; i++) {
        octx.beginPath(); octx.moveTo((crop.x + crop.w * i / 3) * k, crop.y * k); octx.lineTo((crop.x + crop.w * i / 3) * k, (crop.y + crop.h) * k); octx.stroke();
        octx.beginPath(); octx.moveTo(crop.x * k, (crop.y + crop.h * i / 3) * k); octx.lineTo((crop.x + crop.w) * k, (crop.y + crop.h * i / 3) * k); octx.stroke();
      }
      handle(octx, (crop.x + crop.w) * k, (crop.y + crop.h) * k);
      handle(octx, crop.x * k, crop.y * k);
      return;
    }
    var l = sel();
    if (!l || l.type === 'draw' || l.hidden || mode === 'draw') return;
    octx.save();
    octx.translate((l.x + l.w / 2) * k, (l.y + l.h / 2) * k);
    octx.rotate((l.rotation || 0) * Math.PI / 180);
    octx.strokeStyle = '#6c5ce7'; octx.lineWidth = 2; octx.setLineDash([6, 4]);
    octx.strokeRect(-l.w * k / 2, -l.h * k / 2, l.w * k, l.h * k);
    octx.setLineDash([]);
    handle(octx, l.w * k / 2, l.h * k / 2);
    octx.restore();
  }
  function handle(c, x, y) { var s = 9 * view.dpr; c.fillStyle = '#fff'; c.strokeStyle = '#6c5ce7'; c.lineWidth = 2; c.fillRect(x - s, y - s, s * 2, s * 2); c.strokeRect(x - s, y - s, s * 2, s * 2); }

  // ---------------------------------------------------------------- pointer interaction
  function point(e) { var r = ov.getBoundingClientRect(); return [(e.clientX - r.left) / view.k, (e.clientY - r.top) / view.k]; }
  function nearHandle(l, p) {
    var cx = l.x + l.w / 2, cy = l.y + l.h / 2, r = (l.rotation || 0) * Math.PI / 180;
    var hx = cx + (l.w / 2) * Math.cos(r) - (l.h / 2) * Math.sin(r), hy = cy + (l.w / 2) * Math.sin(r) + (l.h / 2) * Math.cos(r);
    return Math.hypot(p[0] - hx, p[1] - hy) < 16 / view.k;
  }
  ov.addEventListener('pointerdown', function (e) {
    var p = point(e);
    ov.setPointerCapture(e.pointerId);
    if (mode === 'crop') {
      var corner = Math.hypot(p[0] - crop.x - crop.w, p[1] - crop.y - crop.h) < 20 / view.k, tl = Math.hypot(p[0] - crop.x, p[1] - crop.y) < 20 / view.k;
      drag = { kind: corner ? 'cropBR' : tl ? 'cropTL' : 'cropMove', start: p, orig: Object.assign({}, crop) };
      return;
    }
    if (mode === 'draw') {
      snapshot();
      if (!drawLayer || !P.find(doc, drawLayer)) { var dl = P.add(doc, P.layer('draw', { name: 'Drawing' })); drawLayer = dl.id; }
      var d = P.find(doc, drawLayer), erase = form.elements.brush.value === 'erase';
      d.paths.push({ points: [p], size: +$('peBrushSize').value, color: $('peBrushColor').value, erase: erase });
      drag = { kind: 'draw' };
      schedule();
      return;
    }
    var l = sel();
    if (l && l.type !== 'draw' && nearHandle(l, p)) { snapshot(); drag = { kind: 'resize', start: p, orig: { x: l.x, y: l.y, w: l.w, h: l.h, size: l.size } }; return; }
    var hitId = P.hitTest(doc, p[0], p[1], 4 / view.k);
    doc.selected = hitId;
    syncPanels();
    if (hitId) { snapshot(); l = sel(); drag = { kind: 'move', start: p, orig: { x: l.x, y: l.y } }; }
    schedule();
  });
  ov.addEventListener('pointermove', function (e) {
    var p = point(e);
    if (!drag) {
      var l = sel();
      ov.style.cursor = mode === 'draw' ? 'crosshair' : mode === 'crop' ? 'move' : l && nearHandle(l, p) ? 'nwse-resize' : P.hitTest(doc, p[0], p[1]) ? 'move' : 'default';
      return;
    }
    var dx = p[0] - (drag.start ? drag.start[0] : 0), dy = p[1] - (drag.start ? drag.start[1] : 0);
    if (drag.kind === 'draw') { P.find(doc, drawLayer).paths.slice(-1)[0].points.push(p); schedule(); return; }
    if (drag.kind.indexOf('crop') === 0) {
      var o = drag.orig, r = { x: o.x, y: o.y, w: o.w, h: o.h }, ratio = cropRatioValue();
      if (drag.kind === 'cropMove') { r.x += dx; r.y += dy; }
      else if (drag.kind === 'cropBR') { r.w = o.w + dx; r.h = ratio ? r.w / ratio : o.h + dy; }
      else { r.w = o.w - dx; r.h = ratio ? r.w / ratio : o.h - dy; r.x = o.x + o.w - r.w; r.y = o.y + o.h - r.h; }
      crop = P.clampRect(r, doc.w, doc.h, ratio);
      $('peCropInfo').textContent = Math.round(crop.w) + ' × ' + Math.round(crop.h) + ' px';
      overlay();
      return;
    }
    var l2 = sel();
    if (!l2) return;
    if (drag.kind === 'move') { l2.x = drag.orig.x + dx; l2.y = drag.orig.y + dy; }
    else if (drag.kind === 'resize') {
      var keep = l2.type === 'image' || l2.type === 'text' ? !e.shiftKey : e.shiftKey;
      var nw = Math.max(10, drag.orig.w + dx * 2), nh = keep ? nw * drag.orig.h / drag.orig.w : Math.max(10, drag.orig.h + dy * 2);
      if (l2.type === 'text') { l2.size = Math.max(6, drag.orig.size * nw / drag.orig.w); l2.x = drag.orig.x; l2.w = drag.orig.w; measureText(l2); syncPanels(); }
      else { l2.x = drag.orig.x + (drag.orig.w - nw) / 2; l2.y = drag.orig.y + (drag.orig.h - nh) / 2; l2.w = nw; l2.h = nh; }
    }
    schedule();
  });
  function endDrag() { if (drag) { drag = null; renderLayers(); schedule(); } }
  ov.addEventListener('pointerup', endDrag);
  ov.addEventListener('pointercancel', endDrag);
  ov.addEventListener('dblclick', function () { var l = sel(); if (l && l.type === 'text') { tab('text'); $('peText').focus(); } });

  // ---------------------------------------------------------------- panels
  function layerName(l) { return l.name || (l.type === 'image' ? 'Photo' : l.type === 'text' ? '“' + String(l.text).split('\n')[0].slice(0, 20) + '”' : l.type === 'shape' ? l.kind.charAt(0).toUpperCase() + l.kind.slice(1) : 'Drawing'); }
  function tab(name) {
    Array.prototype.forEach.call(form.querySelectorAll('[data-tab]'), function (b) { var on = b.getAttribute('data-tab') === name; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    Array.prototype.forEach.call(form.querySelectorAll('[data-panel]'), function (p) { p.hidden = p.getAttribute('data-panel') !== name; });
    var was = mode;
    mode = name === 'crop' ? 'crop' : name === 'draw' ? 'draw' : 'move';
    if (mode === 'crop' && was !== 'crop') { crop = P.aspectRect(doc.w, doc.h, cropRatioValue()); $('peCropInfo').textContent = Math.round(crop.w) + ' × ' + Math.round(crop.h) + ' px'; }
    if (name === 'filters') thumbs();
    if (name === 'layers') renderLayers();
    syncPanels();
    schedule();
  }
  function cropRatioValue() {
    var r = +form.elements.ratio.value;
    if (r === -1) { var img = doc.layers.filter(function (l) { return l.type === 'image'; })[0], b = img && bitmaps[img.src]; return b ? dims(b).w / dims(b).h : doc.w / doc.h; }
    return r;
  }
  function selectedImage() { var l = sel(); if (l && l.type === 'image') return l; return doc.layers.filter(function (x) { return x.type === 'image'; }).slice(-1)[0] || null; }
  function syncPanels() {
    var img = selectedImage();
    $('peAdjNote').hidden = !!img;
    Array.prototype.forEach.call(form.querySelectorAll('[data-adj]'), function (r) {
      var k = r.getAttribute('data-adj');
      r.value = img ? img.adjust[k] || 0 : 0;
      r.disabled = !img;
      var out = form.querySelector('[data-adj-out="' + k + '"]');
      if (out) out.textContent = r.value;
    });
    Array.prototype.forEach.call(form.querySelectorAll('[data-filter]'), function (b) { b.setAttribute('aria-pressed', String(!!img && img.filter === b.getAttribute('data-filter'))); });
    var l = sel();
    var t = l && l.type === 'text' ? l : null;
    $('peTextProps').hidden = !t;
    if (t) {
      $('peText').value = t.text; $('peFont').value = t.font; $('peSize').value = Math.round(t.size); $('peColor').value = t.color; $('peStroke').value = t.stroke;
      $('peStrokeW').value = t.strokeWidth; $('peBold').checked = t.weight >= 700; $('peItalic').checked = t.italic; $('peShadow').checked = t.shadow;
      $('peBoxOn').checked = !!t.box; if (t.box) $('peBox').value = t.box; form.elements.align.value = t.align;
    }
    var s = l && l.type === 'shape' ? l : null;
    $('peShapeProps').hidden = !s;
    if (s) { $('peFill').value = s.fill; $('peLine').value = s.stroke; $('peLineW').value = s.strokeWidth; $('peRadius').value = s.radius; }
    $('peLayerProps').hidden = !l;
    if (l) { $('peOpacity').value = l.opacity; $('peRotate').value = Math.round(l.rotation || 0); $('peBlend').value = l.blend || 'source-over'; $('peRotateOut').textContent = Math.round(l.rotation || 0) + '°'; }
  }
  function renderLayers() {
    var list = $('peLayers');
    if (!doc.layers.length) { list.innerHTML = '<li class="help">No layers yet.</li>'; return; }
    list.innerHTML = doc.layers.slice().reverse().map(function (l) {
      var on = l.id === doc.selected;
      return '<li class="pe-layer' + (on ? ' on' : '') + '"><button type="button" class="link-btn" data-pick="' + l.id + '"' + (on ? ' aria-current="true"' : '') + '>' + esc(layerName(l)) + '</button>' +
        '<span><button type="button" class="btn ghost sm" data-act="hide" data-id="' + l.id + '" aria-label="' + (l.hidden ? 'Show' : 'Hide') + ' layer">' + (l.hidden ? 'Show' : 'Hide') + '</button>' +
        '<button type="button" class="btn ghost sm" data-act="up" data-id="' + l.id + '" aria-label="Move layer up">↑</button><button type="button" class="btn ghost sm" data-act="down" data-id="' + l.id + '" aria-label="Move layer down">↓</button>' +
        '<button type="button" class="btn ghost sm" data-act="dup" data-id="' + l.id + '" aria-label="Duplicate layer">⧉</button><button type="button" class="btn ghost sm" data-act="del" data-id="' + l.id + '" aria-label="Delete layer">✕</button></span></li>';
    }).join('');
  }
  // Filter previews: the selected photo, small, with each preset.
  function thumbs() {
    var img = selectedImage();
    Array.prototype.forEach.call(form.querySelectorAll('[data-filter] canvas'), function (c) {
      var x = c.getContext('2d');
      x.clearRect(0, 0, c.width, c.height);
      if (!img || !bitmaps[img.src]) return;
      var b = bitmaps[img.src], d = dims(b), k = Math.max(c.width / d.w, c.height / d.h);
      x.drawImage(b, (c.width - d.w * k) / 2, (c.height - d.h * k) / 2, d.w * k, d.h * k);
      var data = x.getImageData(0, 0, c.width, c.height);
      P.apply(data, P.combine(c.parentNode.getAttribute('data-filter'), img.adjust), c.width / d.w);
      x.putImageData(data, 0, 0);
    });
  }

  // ---------------------------------------------------------------- open, add, new
  function openPhoto(blob, name) {
    return decode(blob).then(function (b) {
      var d = dims(b), k = Math.min(1, P.FACTS.maxSide / Math.max(d.w, d.h));
      snapshot();
      doc = P.newDoc(d.w * k, d.h * k, null);
      var key = 'b' + Date.now().toString(36);
      bitmaps[key] = b;
      P.add(doc, P.layer('image', { src: key, x: 0, y: 0, w: doc.w, h: doc.h, name: 'Photo' }));
      fileBase = String(name || 'photo').replace(/\.[^.]+$/, '') || 'photo';
      $('peName').value = fileBase + '-edited';
      drawLayer = null;
      layout(); syncPanels(); renderLayers();
      if (mode === 'crop') crop = P.aspectRect(doc.w, doc.h, cropRatioValue());
      render();
      error('');
      say('Opened ' + (name || 'photo') + ', ' + doc.w + ' × ' + doc.h + ' px.');
    }, function (e) { error(e.message); });
  }
  function addImage(blob, name) {
    return decode(blob).then(function (b) {
      snapshot();
      var key = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), d = dims(b), f = P.fitInto(doc, d.w, d.h);
      bitmaps[key] = b;
      var k = Math.min(1, 0.6 * Math.min(doc.w / f.w, doc.h / f.h));
      P.add(doc, P.layer('image', { src: key, x: f.x + f.w * (1 - k) / 2, y: f.y + f.h * (1 - k) / 2, w: f.w * k, h: f.h * k, name: String(name || 'Image').slice(0, 24) }));
      syncPanels(); renderLayers(); schedule();
    }, function (e) { error(e.message); });
  }

  // ---------------------------------------------------------------- export
  function exportBlob() {
    var fmt = form.elements.fmt.value, scale = Math.max(1, Math.min(400, +$('peScale').value || 100)) / 100;
    var c = canvas(doc.w * scale, doc.h * scale), x = c.getContext('2d');
    if (fmt === 'jpeg' && !doc.bg) { x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); }
    paint(x, scale, true);
    return new Promise(function (ok, bad) { c.toBlob(function (b) { b ? ok(b) : bad(new Error('The browser could not save this image. Try a smaller size.')); }, MIME[fmt], +$('peQuality').value / 100); });
  }

  // ---------------------------------------------------------------- events
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.querySelector('.pe-tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) tab(b.getAttribute('data-tab')); });
  form.querySelector('.pe-tabs').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var tabs = Array.prototype.slice.call(form.querySelectorAll('[data-tab]')), i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    n.focus(); tab(n.getAttribute('data-tab'));
  });
  $('peFile').addEventListener('change', function () { if (this.files[0]) openPhoto(this.files[0], this.files[0].name); this.value = ''; });
  $('peAddImg').addEventListener('change', function () { Array.prototype.forEach.call(this.files, function (f) { addImage(f, f.name); }); this.value = ''; });
  stage.addEventListener('dragover', function (e) { e.preventDefault(); stage.classList.add('over'); });
  stage.addEventListener('dragleave', function () { stage.classList.remove('over'); });
  stage.addEventListener('drop', function (e) {
    e.preventDefault(); stage.classList.remove('over');
    var f = e.dataTransfer.files;
    if (!f.length) return;
    if (doc.layers.length && !e.shiftKey && f.length === 1 && !window.confirm('Open this photo and replace the current picture? (Cancel adds it as a layer.)')) addImage(f[0], f[0].name);
    else openPhoto(f[0], f[0].name).then(function () { Array.prototype.slice.call(f, 1).forEach(function (x) { addImage(x, x.name); }); });
  });
  document.addEventListener('paste', function (e) {
    var f = Array.prototype.filter.call((e.clipboardData && e.clipboardData.files) || [], function (x) { return /^image\//.test(x.type); })[0];
    if (f && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { if (doc.layers.length) addImage(f, 'Pasted'); else openPhoto(f, 'pasted.png'); }
  });
  $('peNew').addEventListener('change', function () {
    var v = this.value.split('x');
    this.value = '';
    if (v.length !== 2) return;
    snapshot();
    doc = P.newDoc(+v[0], +v[1], '#ffffff');
    drawLayer = null;
    fileBase = 'design';
    $('peName').value = 'design';
    layout(); syncPanels(); renderLayers(); render();
    say('New ' + v[0] + ' × ' + v[1] + ' canvas. Add images, text and shapes.');
  });
  $('peUndo').addEventListener('click', function () { var s = history.undo(doc); if (s) { doc = s; layout(); syncPanels(); renderLayers(); render(); } syncUndo(); });
  $('peRedo').addEventListener('click', function () { var s = history.redo(doc); if (s) { doc = s; layout(); syncPanels(); renderLayers(); render(); } syncUndo(); });
  var cmp = $('peCompare');
  var on = function (e) { e.preventDefault(); comparing = true; render(); }, off = function () { if (comparing) { comparing = false; render(); } };
  cmp.addEventListener('pointerdown', on); cmp.addEventListener('pointerup', off); cmp.addEventListener('pointerleave', off);
  cmp.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') on(e); });
  cmp.addEventListener('keyup', off);

  // Adjust sliders: preview on input, one undo step per drag.
  form.addEventListener('pointerdown', function (e) { if (e.target.matches('[data-adj], #peOpacity, #peRotate, #peSize, #peStrokeW, #peLineW, #peRadius')) snapshot(); });
  form.addEventListener('keydown', function (e) { if (e.target.matches('input[type=range]') && /Arrow|Page|Home|End/.test(e.key)) snapshot(); });
  form.addEventListener('input', function (e) {
    var t = e.target, l = sel(), img = selectedImage();
    if (t.hasAttribute('data-adj') && img) {
      img.adjust[t.getAttribute('data-adj')] = +t.value;
      form.querySelector('[data-adj-out="' + t.getAttribute('data-adj') + '"]').textContent = t.value;
      schedule(); return;
    }
    if (!l) return;
    if (t.id === 'peOpacity') l.opacity = +t.value;
    else if (t.id === 'peRotate') { l.rotation = +t.value; $('peRotateOut').textContent = t.value + '°'; }
    else if (l.type === 'text' && /^pe(Text|Font|Size|Color|Stroke|StrokeW|Box)$/.test(t.id)) {
      if (t.id === 'peText') l.text = t.value;
      if (t.id === 'peFont') l.font = t.value;
      if (t.id === 'peSize') l.size = Math.max(6, +t.value || 6);
      if (t.id === 'peColor') l.color = t.value;
      if (t.id === 'peStroke') l.stroke = t.value;
      if (t.id === 'peStrokeW') l.strokeWidth = +t.value;
      if (t.id === 'peBox' && $('peBoxOn').checked) l.box = t.value;
      measureText(l); renderLayers();
    } else if (l.type === 'shape') {
      if (t.id === 'peFill') l.fill = t.value;
      if (t.id === 'peLine') l.stroke = t.value;
      if (t.id === 'peLineW') l.strokeWidth = +t.value;
      if (t.id === 'peRadius') l.radius = +t.value;
    } else return;
    schedule();
  });
  form.addEventListener('change', function (e) {
    var t = e.target, l = sel();
    if (t.id === 'peText' || t.id === 'peFont' || t.id === 'peColor' || t.id === 'peStroke' || t.id === 'peFill' || t.id === 'peLine' || t.id === 'peBox') snapshot();
    if (t.name === 'ratio') { crop = P.aspectRect(doc.w, doc.h, cropRatioValue()); $('peCropInfo').textContent = Math.round(crop.w) + ' × ' + Math.round(crop.h) + ' px'; overlay(); return; }
    if (t.id === 'peBlend' && l) { snapshot(); l.blend = t.value; schedule(); return; }
    if (t.name === 'fmt') { $('peQualityWrap').hidden = t.value === 'png'; return; }
    if (!l || l.type !== 'text') return;
    if (/^pe(Bold|Italic|Shadow|BoxOn)$/.test(t.id) || t.name === 'align') {
      snapshot();
      l.weight = $('peBold').checked ? 800 : 400; l.italic = $('peItalic').checked; l.shadow = $('peShadow').checked;
      l.box = $('peBoxOn').checked ? $('peBox').value : ''; l.align = form.elements.align.value;
      measureText(l); schedule();
    }
  });
  form.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var img = selectedImage(), l = sel();
    if (b.hasAttribute('data-filter') && img) { snapshot(); img.filter = b.getAttribute('data-filter'); syncPanels(); schedule(); say(b.textContent.trim() + ' filter.'); }
    else if (b.id === 'peAdjReset' && img) { snapshot(); img.adjust = {}; img.filter = 'none'; syncPanels(); schedule(); say('Adjustments reset.'); }
    else if (b.id === 'peAuto' && img) { snapshot(); img.adjust = autoFix(img); syncPanels(); schedule(); say('Auto enhance applied.'); }
    else if (b.id === 'peCropApply' && crop) {
      snapshot(); P.crop(doc, crop); layout(); crop = P.aspectRect(doc.w, doc.h, cropRatioValue()); render();
      say('Cropped to ' + doc.w + ' × ' + doc.h + ' px.');
    }
    else if (b.hasAttribute('data-rot')) { snapshot(); P.rotate90(doc, b.getAttribute('data-rot') === 'cw'); layout(); if (mode === 'crop') crop = P.aspectRect(doc.w, doc.h, cropRatioValue()); render(); }
    else if (b.hasAttribute('data-flip')) { snapshot(); P.flip(doc, b.getAttribute('data-flip')); render(); }
    else if (b.id === 'peResize') {
      var w = Math.round(+$('peW').value), h = Math.round(+$('peH').value);
      if (w > 0 && h > 0 && w <= P.FACTS.maxSide && h <= P.FACTS.maxSide) { snapshot(); P.resize(doc, w, h); layout(); render(); say('Resized to ' + w + ' × ' + h + ' px.'); }
      else error('Width and height must be between 1 and ' + P.FACTS.maxSide + ' px.');
    }
    else if (b.id === 'peAddText') {
      snapshot();
      var t = P.add(doc, P.layer('text', { text: 'Your text', size: Math.round(Math.max(24, doc.w / 12)), x: doc.w / 2, y: doc.h / 2, w: 0, h: 0 }));
      measureText(t); syncPanels(); renderLayers(); schedule();
      $('peText').focus(); $('peText').select();
    }
    else if (b.hasAttribute('data-shape')) {
      snapshot();
      var kind = b.getAttribute('data-shape'), s = Math.min(doc.w, doc.h) / 3;
      P.add(doc, P.layer('shape', { kind: kind, x: doc.w / 2 - s / 2, y: doc.h / 2 - (kind === 'line' || kind === 'arrow' ? 10 : s / 2), w: s, h: kind === 'line' || kind === 'arrow' ? 20 : s, strokeWidth: kind === 'line' || kind === 'arrow' ? Math.max(4, s / 25) : 0, fill: kind === 'line' || kind === 'arrow' ? '#e17055' : '#6c5ce7' }));
      syncPanels(); renderLayers(); schedule();
    }
    else if (b.id === 'peClearDraw') { var d = P.find(doc, drawLayer); if (d) { snapshot(); d.paths = []; schedule(); } }
    else if (b.hasAttribute('data-pick')) { doc.selected = b.getAttribute('data-pick'); syncPanels(); renderLayers(); schedule(); }
    else if (b.hasAttribute('data-act')) {
      var lid = b.getAttribute('data-id'), x = P.find(doc, lid), act = b.getAttribute('data-act');
      snapshot();
      if (act === 'hide') x.hidden = !x.hidden;
      if (act === 'up') P.move(doc, lid, 1);
      if (act === 'down') P.move(doc, lid, -1);
      if (act === 'del') P.remove(doc, lid);
      if (act === 'dup') { var c = JSON.parse(JSON.stringify(x)); c.id = P.layer(x.type).id; c.x += 20; c.y += 20; P.add(doc, c); }
      syncPanels(); renderLayers(); schedule();
    }
    else if (b.id === 'peDownload') {
      ensure().then(exportBlob).then(function (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = ($('peName').value.trim() || fileBase).replace(/[\\/:*?"<>|]+/g, '-') + '.' + EXT[form.elements.fmt.value];
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        $('peSaved').textContent = 'Saved ' + a.download + ' (' + (blob.size < 1048576 ? (blob.size / 1024).toFixed(1) + ' KB' : (blob.size / 1048576).toFixed(2) + ' MB') + ').';
        say($('peSaved').textContent);
      }, function (e2) { error(e2.message); });
    }
    else if (b.id === 'peCopy') {
      if (!navigator.clipboard || typeof ClipboardItem === 'undefined') { error('This browser cannot copy images; use Download.'); return; }
      var c2 = canvas(doc.w, doc.h);
      paint(c2.getContext('2d'), 1, true);
      navigator.clipboard.write([new ClipboardItem({ 'image/png': new Promise(function (ok) { c2.toBlob(ok, 'image/png'); }) })]).then(function () { say('Copied to clipboard.'); $('peSaved').textContent = 'Copied as PNG.'; }, function () { error('Copy was blocked; use Download.'); });
    }
  });
  // Auto enhance: stretch levels to the 1st and 99th percentile of luminance and add a little vibrance.
  function autoFix(img) {
    var b = bitmaps[img.src], d = dims(b), k = Math.min(1, 200 / Math.max(d.w, d.h)), c = canvas(d.w * k, d.h * k), x = c.getContext('2d');
    x.drawImage(b, 0, 0, c.width, c.height);
    var data = x.getImageData(0, 0, c.width, c.height).data, hist = new Array(256).fill(0), n = data.length / 4;
    for (var i = 0; i < data.length; i += 4) hist[Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2])]++;
    var lo = 0, hi = 255, acc = 0;
    for (; lo < 255 && (acc += hist[lo]) < n * 0.01; lo++);
    acc = 0;
    for (; hi > 0 && (acc += hist[hi]) < n * 0.01; hi--);
    var range = Math.max(32, hi - lo), mid = (hi + lo) / 2;
    return { contrast: Math.max(-20, Math.min(40, Math.round((255 / range - 1) * 45))), brightness: Math.max(-25, Math.min(25, Math.round((128 - mid) / 4))), vibrance: 15, sharpen: 10 };
  }
  document.addEventListener('keydown', function (e) {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    var meta = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (meta && k === 'z') { e.preventDefault(); $(e.shiftKey ? 'peRedo' : 'peUndo').click(); return; }
    if (meta && k === 'y') { e.preventDefault(); $('peRedo').click(); return; }
    var l = sel();
    if (!l || !stage.contains(document.activeElement) && document.activeElement !== document.body) return;
    if (k === 'delete' || k === 'backspace') { e.preventDefault(); snapshot(); P.remove(doc, l.id); syncPanels(); renderLayers(); schedule(); }
    var step = e.shiftKey ? 10 : 1, mv = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] }[k];
    if (mv) { e.preventDefault(); l.x += mv[0]; l.y += mv[1]; schedule(); }
  });
  window.addEventListener('resize', function () { layout(); render(); });

  // ---------------------------------------------------------------- start with the sample photo
  function ensure() { return doc.layers.length ? Promise.resolve() : Promise.reject(new Error('Open a photo or start a new canvas first.')); }
  fetch(SAMPLE).then(function (r) { return r.blob(); }).then(function (b) { return openPhoto(b, 'sample-photo.jpg'); }).then(function () {
    history = new P.History(); syncUndo();
    var ph = $('pePlaceholder'); if (ph) ph.remove();
    stage.classList.add('ready');
  });
  layout();
  syncUndo();
})();
