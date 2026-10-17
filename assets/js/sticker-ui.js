/* WhatsApp Sticker Maker UI. Photos are cut out, framed and encoded on the device; nothing is uploaded. Each
   sticker keeps its source pixels and an editable alpha mask, so the eraser and restore brush are undoable by
   painting back. Stickers are encoded as 512 x 512 WebP at the highest quality that stays under 100 KB. */
(function () {
  'use strict';
  var T = window.TBBSticker, I = window.TBBImg, Z = window.TBBZip;
  var form = document.getElementById('stForm');
  if (!T || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var E = form.elements, S = T.SPEC.size, stage = $('stCanvas'), sctx = stage.getContext('2d');
  var SAMPLE = stage.getAttribute('data-sample');
  var stickers = [], cur = -1, tray = -1, drag = null, timer = 0, webpOk = null;
  var MAX_SRC = 1024, started = false;

  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function say(m) { $('stLive').textContent = m; }
  function error(m) { $('stError').hidden = !m; $('stError').textContent = m || ''; }
  function st() { return stickers[cur]; }

  // ---------------------------------------------------------------- loading
  function load(blob, name) {
    var make = typeof createImageBitmap !== 'undefined' ? createImageBitmap(blob) : Promise.reject();
    return make.catch(function () {
      return new Promise(function (ok, bad) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { bad(new Error(name + ' could not be opened as an image.')); }; i.src = URL.createObjectURL(blob); });
    }).then(function (img) {
      var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, k = Math.min(1, MAX_SRC / Math.max(w, h));
      var c = canvas(Math.round(w * k), Math.round(h * k)), x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0, c.width, c.height);
      var px = x.getImageData(0, 0, c.width, c.height);
      var s = { name: name, src: c, px: px, mask: new Uint8Array(c.width * c.height), x: 0, y: 0, scale: 1, rot: 0,
        outlineW: 10, outlineC: '#ffffff', shadow: true, top: '', bottom: '', textSize: 64, textColor: '#ffffff', emoji: '', alt: '', out: null };
      for (var i = 0; i < s.mask.length; i++) s.mask[i] = px.data[i * 4 + 3];
      s.cut = canvas(c.width, c.height);
      updateCut(s);
      // Photos with a plain background are cut out straight away; anything else keeps its background.
      var r = T.floodRemove(px.data, c.width, c.height, 12), cleared = 0;
      for (var j = 0; j < r.mask.length; j++) if (!r.mask[j]) cleared++;
      if (cleared > r.mask.length * 0.15 && cleared < r.mask.length * 0.9) { s.mask = r.mask; updateCut(s); s.autoCut = true; }
      fitSticker(s);
      return s;
    });
  }
  function updateCut(s) {
    var x = s.cut.getContext('2d'), d = new ImageData(new Uint8ClampedArray(s.px.data), s.px.width, s.px.height);
    for (var i = 0; i < s.mask.length; i++) d.data[i * 4 + 3] = Math.min(d.data[i * 4 + 3], s.mask[i]);
    x.putImageData(d, 0, 0);
  }
  function fitSticker(s) {
    var b = T.bounds(s.mask, s.src.width, s.src.height) || { x: 0, y: 0, w: s.src.width, h: s.src.height };
    var f = T.fit(b, S, s.outlineW + 12 + (s.top ? s.textSize : 0) / 2 + (s.bottom ? s.textSize : 0) / 2);
    s.scale = f.scale; s.x = f.x + b.w * f.scale / 2 + b.x * f.scale; s.y = f.y + b.h * f.scale / 2 + b.y * f.scale;
    s.cx = 0; s.cy = 0;
    // Store the centre of the content in source pixels so rotation turns around it.
    s.ox = b.x + b.w / 2; s.oy = b.y + b.h / 2;
    s.rot = 0;
  }
  function add(files) {
    var list = Array.prototype.slice.call(files).slice(0, T.SPEC.maxPack - stickers.length);
    if (files.length > list.length) error('A pack holds at most ' + T.SPEC.maxPack + ' stickers.');
    return list.reduce(function (p, f) {
      return p.then(function () { return load(f, f.name || 'sticker').then(function (s) { stickers.push(s); cur = stickers.length - 1; }, function (e) { error(e.message); }); });
    }, Promise.resolve()).then(function () { if (tray < 0 && stickers.length) tray = 0; sync(); render(); renderStrip(); });
  }

  // ---------------------------------------------------------------- compose
  function compose(s, ctx, size, light) {
    var k = size / S, sub = canvas(size, size), x = sub.getContext('2d', { willReadFrequently: true });
    x.translate(s.x * k, s.y * k);
    x.rotate(s.rot * Math.PI / 180);
    x.scale(s.scale * k, s.scale * k);
    x.drawImage(s.cut, -s.ox, -s.oy);
    x.setTransform(1, 0, 0, 1, 0, 0);
    textOn(x, s, k);
    ctx.clearRect(0, 0, size, size);
    var ow = Math.round(s.outlineW * k);
    if (ow > 0 && !light) {
      var a = x.getImageData(0, 0, size, size), alpha = new Uint8Array(size * size);
      for (var i = 0; i < alpha.length; i++) alpha[i] = a.data[i * 4 + 3];
      var o = T.outline(alpha, size, size, ow), oc = canvas(size, size), ox = oc.getContext('2d'), od = ox.createImageData(size, size);
      var rgb = hex(s.outlineC);
      for (var j = 0; j < o.length; j++) { od.data[j * 4] = rgb[0]; od.data[j * 4 + 1] = rgb[1]; od.data[j * 4 + 2] = rgb[2]; od.data[j * 4 + 3] = o[j]; }
      ox.putImageData(od, 0, 0);
      if (s.shadow) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 10 * k; ctx.shadowOffsetY = 4 * k; ctx.drawImage(oc, 0, 0); ctx.restore(); }
      else ctx.drawImage(oc, 0, 0);
    } else if (s.shadow && !light) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 10 * k; ctx.shadowOffsetY = 4 * k; ctx.drawImage(sub, 0, 0); ctx.restore(); }
    ctx.drawImage(sub, 0, 0);
  }
  function textOn(x, s, k) {
    [['top', 0.08], ['bottom', 0.92]].forEach(function (t) {
      var v = s[t[0]];
      if (!v) return;
      var size = s.textSize * k;
      x.font = '900 ' + size + 'px Impact,"Arial Black",system-ui,sans-serif';
      x.textAlign = 'center'; x.textBaseline = t[0] === 'top' ? 'top' : 'bottom';
      var max = S * k * 0.94, w = x.measureText(v).width;
      if (w > max) { size *= max / w; x.font = '900 ' + size + 'px Impact,"Arial Black",system-ui,sans-serif'; }
      var y = t[0] === 'top' ? S * k * 0.04 : S * k * 0.96;
      x.lineJoin = 'round'; x.lineWidth = size * 0.16; x.strokeStyle = '#000';
      x.strokeText(v, S * k / 2, y);
      x.fillStyle = s.textColor; x.fillText(v, S * k / 2, y);
    });
  }
  function hex(c) { var m = /^#?([0-9a-f]{6})$/i.exec(c) || [0, 'ffffff'], n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function render(light) {
    var s = st();
    sctx.clearRect(0, 0, S, S);
    if (!s) return;
    compose(s, sctx, S, light);
  }
  function schedule() { clearTimeout(timer); render(true); timer = setTimeout(function () { render(false); var s = st(); if (s) { s.out = null; thumb(cur); } }, 180); }

  // ---------------------------------------------------------------- encode
  function blob(c, type, q) { return new Promise(function (ok, bad) { c.toBlob(function (b) { b ? ok(b) : bad(new Error('encode')); }, type, q); }); }
  function bytes(b) { return b.arrayBuffer().then(function (a) { return new Uint8Array(a); }); }
  function supportsWebp() {
    if (webpOk !== null) return Promise.resolve(webpOk);
    return blob(canvas(2, 2), 'image/webp', 0.8).then(function (b) { webpOk = b.type === 'image/webp'; return webpOk; }, function () { webpOk = false; return false; });
  }
  function encode(s) {
    if (s.out) return Promise.resolve(s.out);
    var c = canvas(S, S);
    compose(s, c.getContext('2d'), S, false);
    return supportsWebp().then(function (ok) {
      if (!ok) return blob(c, 'image/png').then(bytes).then(function (b) { return { bytes: b, webp: false, q: 1 }; });
      var cache = {};
      return I.searchQuality(function (q) { return blob(c, 'image/webp', q).then(bytes).then(function (b) { cache[Math.round(q * 100)] = b; return b.length; }); }, T.SPEC.maxBytes, 0.3, 0.92)
        .then(function (r) { return { bytes: cache[Math.round(r.q * 100)], webp: true, q: r.q }; });
    }).then(function (o) { s.out = o; return o; });
  }
  function trayIcon() {
    var s = stickers[tray] || stickers[0], c = canvas(T.SPEC.tray, T.SPEC.tray), big = canvas(S, S);
    compose(s, big.getContext('2d'), S, false);
    var x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(big, 0, 0, c.width, c.height);
    return blob(c, 'image/png').then(bytes);
  }
  function download(data, name, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: type }));
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ---------------------------------------------------------------- UI sync
  function sync() {
    var s = st(), has = !!s || !started;
    Array.prototype.forEach.call(form.querySelectorAll('[data-needs]'), function (el) { el.disabled = !has; });
    if (!s) return;
    E.zoom.value = Math.round(s.scale * 100 * Math.max(s.src.width, s.src.height) / S);
    E.rot.value = s.rot; E.outlineW.value = s.outlineW; E.outlineC.value = s.outlineC; E.shadow.checked = s.shadow;
    E.top.value = s.top; E.bottom.value = s.bottom; E.textSize.value = s.textSize; E.textColor.value = s.textColor; E.emoji.value = s.emoji; E.alt.value = s.alt;
    $('stName').textContent = (cur + 1) + '. ' + s.name + (s.autoCut ? ' · background removed' : '');
  }
  function thumb(i) {
    var c = form.querySelector('[data-st="' + i + '"] canvas');
    if (c) { var x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); compose(stickers[i], x, c.width, true); }
  }
  function renderStrip() {
    $('stStrip').innerHTML = stickers.map(function (s, i) {
      return '<button type="button" class="st-thumb' + (i === cur ? ' on' : '') + '" data-st="' + i + '"' + (i === cur ? ' aria-current="true"' : '') + '><canvas width="64" height="64" aria-hidden="true"></canvas><b class="sr-only">Sticker ' + (i + 1) + '</b>' + (i === tray ? '<span>tray</span>' : '') + '</button>';
    }).join('') + (stickers.length < T.SPEC.maxPack ? '<label class="st-thumb st-add">+<input type="file" accept="image/*" multiple class="sr-only" aria-label="Add photos"></label>' : '');
    stickers.forEach(function (s, i) { thumb(i); });
    $('stCount').textContent = stickers.length + ' of ' + T.SPEC.maxPack + ' stickers (a pack needs ' + T.SPEC.minPack + ' to ' + T.SPEC.maxPack + ')';
  }
  function checks() {
    return Promise.all(stickers.map(encode)).then(function (outs) {
      return trayIcon().then(function (tb) {
        var pack = { name: E.packName.value, publisher: E.publisher.value, tray: { bytes: tb.length }, stickers: stickers.map(function (s, i) { return { bytes: outs[i].bytes.length, webp: outs[i].webp, emojis: T.emojis(s.emoji), alt: s.alt }; }) };
        var p = T.check(pack);
        $('stChecks').innerHTML = (p.length ? p.map(function (x) { return '<li class="rb-n rb-' + x.level + '">' + esc(x.text) + '</li>'; }).join('') : '<li class="rb-n rb-ok">Ready: every sticker is 512 × 512 and under 100 KB.</li>') +
          stickers.map(function (s, i) { return '<li class="help">Sticker ' + (i + 1) + ': ' + (outs[i].bytes.length / 1024).toFixed(1) + ' KB ' + (outs[i].webp ? 'WebP' : 'PNG') + (outs[i].webp ? ' at ' + Math.round(outs[i].q * 100) + '%' : '') + '</li>'; }).join('');
        return { pack: pack, outs: outs, tray: tb };
      });
    });
  }

  // ---------------------------------------------------------------- pointer: move, erase, restore
  function toSource(s, px, py) {
    var r = -s.rot * Math.PI / 180, dx = px - s.x, dy = py - s.y;
    return [(dx * Math.cos(r) - dy * Math.sin(r)) / s.scale + s.ox, (dx * Math.sin(r) + dy * Math.cos(r)) / s.scale + s.oy];
  }
  function paint(s, p, restore) {
    var q = toSource(s, p[0], p[1]), rad = +E.brush.value / s.scale, w = s.src.width, h = s.src.height;
    for (var y = Math.max(0, Math.floor(q[1] - rad)); y <= Math.min(h - 1, Math.ceil(q[1] + rad)); y++) {
      for (var x = Math.max(0, Math.floor(q[0] - rad)); x <= Math.min(w - 1, Math.ceil(q[0] + rad)); x++) {
        var d = Math.hypot(x - q[0], y - q[1]);
        if (d > rad) continue;
        var i = y * w + x, edge = d > rad - 1.5 ? 0.5 : 1;
        s.mask[i] = restore ? Math.max(s.mask[i], Math.round(s.px.data[i * 4 + 3] * edge)) : Math.min(s.mask[i], d > rad - 1.5 ? 128 : 0);
      }
    }
  }
  function pt(e) { var r = stage.getBoundingClientRect(); return [(e.clientX - r.left) * S / r.width, (e.clientY - r.top) * S / r.height]; }
  stage.addEventListener('pointerdown', function (e) {
    var s = st();
    if (!s) return;
    stage.setPointerCapture(e.pointerId);
    var tool = E.tool.value, p = pt(e);
    drag = { tool: tool, start: p, x: s.x, y: s.y };
    if (tool !== 'move') { paint(s, p, tool === 'restore'); updateCut(s); schedule(); }
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var s = st(), p = pt(e);
    if (drag.tool === 'move') { s.x = drag.x + p[0] - drag.start[0]; s.y = drag.y + p[1] - drag.start[1]; }
    else { paint(s, p, drag.tool === 'restore'); updateCut(s); }
    schedule();
  });
  ['pointerup', 'pointercancel'].forEach(function (t) { stage.addEventListener(t, function () { drag = null; }); });
  stage.addEventListener('wheel', function (e) {
    var s = st();
    if (!s || !e.ctrlKey) return;
    e.preventDefault();
    s.scale *= e.deltaY < 0 ? 1.05 : 0.95;
    sync(); schedule();
  }, { passive: false });

  // ---------------------------------------------------------------- events
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('input', function (e) {
    var s = st(), t = e.target;
    if (!s || !t.name) return;
    if (t.name === 'zoom') s.scale = +t.value / 100 * S / Math.max(s.src.width, s.src.height);
    else if (t.name === 'rot') s.rot = +t.value;
    else if (t.name === 'outlineW') s.outlineW = +t.value;
    else if (t.name === 'outlineC') s.outlineC = t.value;
    else if (t.name === 'shadow') s.shadow = t.checked;
    else if (t.name === 'top' || t.name === 'bottom') s[t.name] = t.value;
    else if (t.name === 'textSize') s.textSize = +t.value;
    else if (t.name === 'textColor') s.textColor = t.value;
    else if (t.name === 'emoji') { s.emoji = t.value; $('stEmojiOut').textContent = T.emojis(t.value).join(' ') || 'none yet'; return; }
    else if (t.name === 'alt') { s.alt = t.value; return; }
    else return;
    schedule();
  });
  form.addEventListener('change', function (e) {
    if (e.target.type === 'file') { if (e.target.files.length) add(e.target.files); e.target.value = ''; }
  });
  form.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var s = st();
    if (b.hasAttribute('data-st')) { cur = +b.getAttribute('data-st'); sync(); render(); renderStrip(); return; }
    if (b.id === 'stSample') { fetch(SAMPLE).then(function (r) { return r.blob(); }).then(function (bl) { return add([new File([bl], 'cat.png', { type: 'image/png' })]); }); return; }
    if (!s) return;
    if (b.id === 'stRemove') {
      var r = T.floodRemove(s.px.data, s.src.width, s.src.height, +E.tol.value);
      s.mask = r.mask; s.autoCut = true; updateCut(s); fitSticker(s); sync(); schedule();
      say('Background removed. Use the eraser or restore brush to touch up.');
    }
    else if (b.id === 'stReset') { for (var i = 0; i < s.mask.length; i++) s.mask[i] = s.px.data[i * 4 + 3]; s.autoCut = false; updateCut(s); fitSticker(s); sync(); schedule(); }
    else if (b.id === 'stFit') { fitSticker(s); sync(); schedule(); }
    else if (b.id === 'stTray') { tray = cur; renderStrip(); say('Sticker ' + (cur + 1) + ' will be the tray icon.'); }
    else if (b.id === 'stDelete') {
      stickers.splice(cur, 1);
      if (tray === cur) tray = 0; else if (tray > cur) tray--;
      cur = Math.min(cur, stickers.length - 1);
      sync(); render(); renderStrip();
    }
    else if (b.id === 'stOne') {
      encode(s).then(function (o) {
        download(o.bytes, String(s.name).replace(/\.[^.]+$/, '') + '-sticker.' + (o.webp ? 'webp' : 'png'), o.webp ? 'image/webp' : 'image/png');
        say('Sticker saved: ' + (o.bytes.length / 1024).toFixed(1) + ' KB.');
      });
    }
    else if (b.id === 'stCheck' || b.id === 'stPack') {
      b.disabled = true;
      checks().then(function (r) {
        b.disabled = false;
        if (b.id !== 'stPack') return;
        var files = r.outs.map(function (o, i) { return { name: o.webp ? T.fileName(i) : T.fileName(i).replace('.webp', '.png'), bytes: o.bytes }; });
        files.push({ name: 'tray.png', bytes: r.tray });
        files.push({ name: 'contents.json', text: JSON.stringify(T.contents(r.pack), null, 2) + '\n' });
        files.push({ name: 'README.txt', text: 'WhatsApp sticker pack made at https://tool.thebukitbesi.com/whatsapp-sticker-maker/\n\n' + r.outs.length + ' stickers (512 x 512), tray.png (96 x 96) and contents.json in the layout of WhatsApp\'s sample sticker app (github.com/WhatsApp/stickers).\nTo add stickers on your phone, open a sticker pack app that imports WebP files, or send each sticker from WhatsApp Web or Desktop.\n' });
        download(Z.zip(files, new Date()), T.slug(E.packName.value) + '.zip', 'application/zip');
        say('Pack downloaded with ' + r.outs.length + ' stickers.');
      }, function () { b.disabled = false; error('Could not encode the stickers.'); });
    }
  });
  var drop = $('stDrop');
  drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
  drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files.length) add(e.dataTransfer.files); });
  document.addEventListener('paste', function (e) {
    var f = Array.prototype.filter.call((e.clipboardData && e.clipboardData.files) || [], function (x) { return /^image\//.test(x.type); });
    if (f.length && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) add(f);
  });

  // The page shows a pre-rendered sample sticker; the editor loads the real sample on the first interaction, so
  // background removal and the outline never compete with page load.
  function start(e) {
    if (started) return;
    started = true;
    var fromFile = e && e.target && e.target.type === 'file';
    var ready = function () { var ph = $('stPlaceholder'); if (ph) ph.remove(); $('stWrap').classList.add('ready'); };
    if (fromFile || (e && e.target && e.target.id === 'stSample')) { ready(); return; }
    fetch(SAMPLE).then(function (r) { return r.blob(); }).then(function (bl) { return add([new File([bl], 'cat.png', { type: 'image/png' })]); }).then(ready);
  }
  ['pointerdown', 'focusin', 'dragenter'].forEach(function (t) { form.addEventListener(t, start, { once: false, passive: true }); });
  sync();
})();
