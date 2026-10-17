/* PDF Converter UI. Seven jobs share one file list and one Convert button. PDF.js, pdf-lib and mammoth are
   self-hosted and loaded only when a job needs them; files are processed on the device and never uploaded. */
(function () {
  'use strict';
  var P = window.TBBPdf, D = window.TBBDocx, Z = window.TBBZip;
  var form = document.getElementById('pdForm');
  if (!P || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var V = P.VENDOR, mode = 'img2pdf', items = [], pages = [], busy = false, urls = [], pdfjs = null, loaded = {};
  var LABEL = { img2pdf: 'Create PDF', pdf2img: 'Convert to images', merge: 'Merge PDFs', organize: 'Save PDF', pdf2word: 'Convert to Word', word2pdf: 'Open print preview', compress: 'Compress PDF' };

  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  function status(m) { $('pdStatus').textContent = m; $('pdLive').textContent = m; }
  function error(m) { $('pdError').hidden = !m; $('pdError').textContent = m || ''; }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function toBlob(c, type, q) { return new Promise(function (ok, bad) { c.toBlob(function (b) { b ? ok(b) : bad(new Error('The browser ran out of memory drawing this page. Try a lower resolution.')); }, type, q); }); }
  function bytes(b) { return b.arrayBuffer().then(function (a) { return new Uint8Array(a); }); }
  function revoke() { urls.forEach(function (u) { URL.revokeObjectURL(u); }); urls = []; }
  function link(data, name, type, label) {
    var u = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type: type }));
    urls.push(u);
    return '<a class="btn sm" href="' + u + '" download="' + esc(name) + '">' + esc(label || 'Download ' + name) + '</a>';
  }
  function save(data, name, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type: type }));
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  // ---------------------------------------------------------------- libraries, loaded once on demand
  function script(src, global) {
    if (window[global]) return Promise.resolve(window[global]);
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise(function (ok, bad) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { ok(window[global]); };
      s.onerror = function () { delete loaded[src]; bad(new Error('Could not load the PDF tools. Check your connection and try again.')); };
      document.head.appendChild(s);
    });
    return loaded[src];
  }
  function pdfLib() { return script(V.pdflib, 'PDFLib'); }
  function getPdfjs() {
    if (pdfjs) return Promise.resolve(pdfjs);
    return import(V.pdfjs).then(function (m) { m.GlobalWorkerOptions.workerSrc = V.worker; pdfjs = m; return m; }, function () { throw new Error('Could not load the PDF reader. Update your browser or check your connection.'); });
  }
  // Opens a PDF with PDF.js, asking for the password if it is protected.
  function openPdf(data, name) {
    return getPdfjs().then(function (lib) {
      var task = lib.getDocument({ data: data.slice(), wasmUrl: V.wasm, standardFontDataUrl: V.fonts, useSystemFonts: true, isEvalSupported: false });
      task.onPassword = function (update, reason) {
        var pw = window.prompt((reason === 2 ? 'Wrong password. ' : '') + name + ' is password-protected. Enter the password to open it:');
        if (pw === null) { task.destroy(); return; }
        update(pw);
      };
      return task.promise;
    }).catch(function (e) {
      if (e && /Password/.test(e.name)) throw new Error(name + ' is password-protected.');
      if (e && /Invalid PDF|InvalidPDF|structure/i.test(e.message + e.name)) throw new Error(name + ' is not a valid PDF or is damaged.');
      throw e;
    });
  }
  // PDF.js 6 closes a document through its loading task.
  function closePdf(doc) { try { if (doc.destroy) doc.destroy(); else doc.loadingTask.destroy(); } catch (e) { /* already closed */ } }
  function renderPage(doc, n, scale, bg) {
    return doc.getPage(n).then(function (pg) {
      var vp = pg.getViewport({ scale: scale }), c = canvas(vp.width, vp.height), x = c.getContext('2d');
      if (bg) { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
      return pg.render({ canvasContext: x, viewport: vp }).promise.then(function () { pg.cleanup(); return { canvas: c, page: pg, vp: vp, base: pg.getViewport({ scale: 1 }) }; });
    });
  }

  // ---------------------------------------------------------------- file list
  function readFiles(list) {
    return Promise.all(Array.prototype.map.call(list, function (f) {
      if (f.size > P.FACTS.maxBytes) return Promise.reject(new Error(f.name + ' is over 200 MB.'));
      return f.arrayBuffer().then(function (b) { return { name: f.name, type: f.type, data: new Uint8Array(b) }; });
    }));
  }
  function add(files) {
    error('');
    var multi = mode === 'img2pdf' || mode === 'merge';
    return readFiles(multi ? files : [files[0]]).then(function (got) {
      if (mode === 'merge' || mode !== 'img2pdf') got = got.filter(function (g) { return mode === 'word2pdf' ? /\.docx$/i.test(g.name) : /%PDF-/.test(new TextDecoder('latin1').decode(g.data.subarray(0, 1024))); });
      if (!got.length) { error(mode === 'word2pdf' ? 'Choose a .docx file (save .doc files as .docx in Word first).' : mode === 'img2pdf' ? 'Choose image files.' : 'That is not a PDF file.'); return; }
      items = multi ? items.concat(got) : got;
      pages = [];
      revoke();
      $('pdResult').innerHTML = '';
      renderList();
      if (mode === 'organize') return thumbs();
    }).catch(function (e) { error(e.message); });
  }
  function renderList() {
    var L = $('pdList');
    if (mode === 'organize' && pages.length) {
      L.className = 'pd-pages';
      L.innerHTML = pages.map(function (p, i) {
        return '<li class="pd-page' + (p.drop ? ' off' : '') + '"><img src="' + p.thumb + '" alt="Page ' + (p.n + 1) + '" style="transform:rotate(' + p.rot + 'deg)">' +
          '<span>Page ' + (p.n + 1) + (p.drop ? ' (dropped)' : '') + '</span><span class="pd-acts">' +
          '<button type="button" class="btn ghost sm" data-act="left" data-i="' + i + '" aria-label="Move page ' + (p.n + 1) + ' earlier">←</button>' +
          '<button type="button" class="btn ghost sm" data-act="rot" data-i="' + i + '" aria-label="Rotate page ' + (p.n + 1) + '">↻</button>' +
          '<button type="button" class="btn ghost sm" data-act="drop" data-i="' + i + '" aria-label="' + (p.drop ? 'Keep' : 'Drop') + ' page ' + (p.n + 1) + '">' + (p.drop ? '↺' : '✕') + '</button>' +
          '<button type="button" class="btn ghost sm" data-act="right" data-i="' + i + '" aria-label="Move page ' + (p.n + 1) + ' later">→</button></span></li>';
      }).join('');
    } else {
      L.className = 'ex-files pd-list';
      L.innerHTML = items.map(function (it, i) {
        return '<li class="ex-file"><div class="ex-file-head"><strong>' + esc(it.name) + '</strong><span>' + P.size(it.data.length) + '</span></div>' +
          (items.length > 1 ? '<span class="pd-acts"><button type="button" class="btn ghost sm" data-act="up" data-i="' + i + '" aria-label="Move ' + esc(it.name) + ' up">↑</button><button type="button" class="btn ghost sm" data-act="down" data-i="' + i + '" aria-label="Move ' + esc(it.name) + ' down">↓</button><button type="button" class="btn ghost sm" data-act="remove" data-i="' + i + '" aria-label="Remove ' + esc(it.name) + '">✕</button></span>' : '') + '</li>';
      }).join('');
    }
    $('pdGo').disabled = !items.length || busy || (mode === 'merge' && items.length < 2);
    $('pdGo').textContent = mode === 'merge' && items.length === 1 ? 'Add another PDF' : LABEL[mode];
  }
  function thumbs() {
    status('Reading pages…');
    return openPdf(items[0].data, items[0].name).then(function (doc) {
      var list = [];
      var next = function (n) {
        if (n > doc.numPages) { closePdf(doc); pages = list; renderList(); status(doc.numPages + ' pages. Arrange them, then save.'); return; }
        return renderPage(doc, n, 0.25, true).then(function (r) {
          return toBlob(r.canvas, 'image/jpeg', 0.7).then(function (b) {
            var u = URL.createObjectURL(b); urls.push(u);
            list.push({ n: n - 1, rot: 0, drop: false, thumb: u });
            if (n % 10 === 0) status('Reading page ' + n + ' of ' + doc.numPages + '…');
            return next(n + 1);
          });
        });
      };
      return next(1);
    }).catch(function (e) { error(e.message); status(''); });
  }

  // ---------------------------------------------------------------- jobs
  function imagesToPdf() {
    var o = { size: $('pdSize').value, orient: $('pdOrient').value, margin: +$('pdMargin').value, mode: $('pdFit').value }, q = +$('pdQ').value / 100;
    var out = [];
    return items.reduce(function (p, it, i) {
      return p.then(function () {
        status('Adding image ' + (i + 1) + ' of ' + items.length + '…');
        var info = P.jpegInfo(it.data);
        if (P.embeddable(info)) { out.push({ jpeg: it.data, w: info.w, h: info.h, comps: info.comps, place: P.layout(info.w, info.h, o) }); return; }
        return createImageBitmap(new Blob([it.data], { type: it.type })).then(function (bm) {
          var c = canvas(bm.width, bm.height), x = c.getContext('2d');
          x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bm, 0, 0);
          return toBlob(c, 'image/jpeg', q).then(bytes).then(function (j) { out.push({ jpeg: j, w: c.width, h: c.height, comps: 3, place: P.layout(c.width, c.height, o) }); });
        }, function () { throw new Error(it.name + ' could not be read as an image.'); });
      });
    }, Promise.resolve()).then(function () {
      var pdf = P.imagesToPdf(out, { title: P.baseName(items[0].name) }), name = (items.length === 1 ? P.baseName(items[0].name) : 'images') + '.pdf';
      $('pdResult').innerHTML = link(pdf, name, 'application/pdf') + '<p class="help">' + out.length + ' pages · ' + P.size(pdf.length) + '</p>';
      status('PDF ready: ' + out.length + ' pages, ' + P.size(pdf.length) + '.');
    });
  }
  function pdfToImages() {
    var fmt = $('pdImgFmt').value, scale = +$('pdDpi').value / 72, it = items[0], files = [];
    return openPdf(it.data, it.name).then(function (doc) {
      var list = $('pdPagesImg').value.trim() ? P.parseRanges($('pdPagesImg').value, doc.numPages) : Array.from({ length: doc.numPages }, function (_, i) { return i; });
      if (!list.length) throw new Error('None of those pages exist; this PDF has ' + doc.numPages + ' pages.');
      return list.reduce(function (p, n, k) {
        return p.then(function () {
          status('Rendering page ' + (n + 1) + ' (' + (k + 1) + ' of ' + list.length + ')…');
          return renderPage(doc, n + 1, scale, fmt === 'jpeg').then(function (r) { return toBlob(r.canvas, fmt === 'png' ? 'image/png' : 'image/jpeg', 0.9); })
            .then(function (b) { return bytes(b).then(function (d) { files.push({ name: P.baseName(it.name) + '-page-' + (n + 1) + (fmt === 'png' ? '.png' : '.jpg'), bytes: d }); }); });
        });
      }, Promise.resolve()).then(function () { closePdf(doc); });
    }).then(function () {
      var html = files.length > 1 ? link(Z.zip(files, new Date()), P.baseName(it.name) + '-images.zip', 'application/zip', 'Download all (.zip)') : '';
      html += '<ul class="pd-shots">' + files.map(function (f) {
        var u = URL.createObjectURL(new Blob([f.bytes], { type: fmt === 'png' ? 'image/png' : 'image/jpeg' })); urls.push(u);
        return '<li><a href="' + u + '" download="' + esc(f.name) + '"><img src="' + u + '" alt="' + esc(f.name) + '" loading="lazy"><span>' + esc(f.name) + ' · ' + P.size(f.bytes.length) + '</span></a></li>';
      }).join('') + '</ul>';
      $('pdResult').innerHTML = html;
      status(files.length + ' images ready.');
    });
  }
  function encryptedMsg(name) { return name + ' is password-protected, so its pages cannot be copied. Open it in a PDF reader, print it to a new PDF, and use that.'; }
  function merge() {
    return pdfLib().then(function (L) {
      return L.PDFDocument.create().then(function (out) {
        return items.reduce(function (p, it, i) {
          return p.then(function () {
            status('Adding ' + it.name + ' (' + (i + 1) + ' of ' + items.length + ')…');
            return L.PDFDocument.load(it.data).catch(function (e) { throw new Error(/encrypt/i.test(e.message) ? encryptedMsg(it.name) : it.name + ' could not be read: ' + e.message); })
              .then(function (src) { return out.copyPages(src, src.getPageIndices()); })
              .then(function (copied) { copied.forEach(function (pg) { out.addPage(pg); }); });
          });
        }, Promise.resolve()).then(function () { out.setProducer('The Bukit Besi PDF Converter'); return out.save(); });
      });
    }).then(function (pdf) {
      $('pdResult').innerHTML = link(pdf, 'merged.pdf', 'application/pdf') + '<p class="help">' + items.length + ' files merged · ' + P.size(pdf.length) + '</p>';
      status('Merged PDF ready: ' + P.size(pdf.length) + '.');
    });
  }
  function organize() {
    var it = items[0];
    return pdfLib().then(function (L) {
      return L.PDFDocument.load(it.data).catch(function (e) { throw new Error(/encrypt/i.test(e.message) ? encryptedMsg(it.name) : it.name + ' could not be read: ' + e.message); }).then(function (src) {
        var order = pages.length ? pages.filter(function (p) { return !p.drop; }) : src.getPageIndices().map(function (n) { return { n: n, rot: 0 }; });
        if ($('pdKeep').value.trim()) {
          var keep = P.parseRanges($('pdKeep').value, src.getPageCount()), by = {};
          order.forEach(function (p) { by[p.n] = p; });
          order = keep.map(function (n) { return by[n] || { n: n, rot: 0 }; });
        }
        if (!order.length) throw new Error('No pages left to save.');
        var mk = function (group) {
          return L.PDFDocument.create().then(function (out) {
            return out.copyPages(src, group.map(function (p) { return p.n; })).then(function (copied) {
              copied.forEach(function (pg, i) { if (group[i].rot) pg.setRotation(L.degrees((pg.getRotation().angle + group[i].rot) % 360)); out.addPage(pg); });
              return out.save();
            });
          });
        };
        var how = $('pdSplit').value, base = P.baseName(it.name);
        if (how === 'one') return mk(order).then(function (pdf) {
          $('pdResult').innerHTML = link(pdf, base + '-edited.pdf', 'application/pdf') + '<p class="help">' + order.length + ' pages · ' + P.size(pdf.length) + '</p>';
          status('PDF ready: ' + order.length + ' pages.');
        });
        var groups = P.splitGroups(how, order.length, $('pdSplitArg').value).map(function (g) { return g.map(function (k) { return order[k]; }); });
        if (!groups.length) throw new Error('Type how to split, for example 2, or 1-2; 3-5.');
        var files = [];
        return groups.reduce(function (p, g, k) {
          return p.then(function () { return mk(g).then(function (pdf) { files.push({ name: base + '-' + (k + 1) + (g.length === 1 ? '-page-' + (g[0].n + 1) : '') + '.pdf', bytes: pdf }); }); });
        }, Promise.resolve()).then(function () {
          $('pdResult').innerHTML = link(Z.zip(files, new Date()), base + '-split.zip', 'application/zip', 'Download ' + files.length + ' PDFs (.zip)') +
            '<ul class="removed-list">' + files.map(function (f) { return '<li>' + link(f.bytes, f.name, 'application/pdf', f.name) + ' <small>' + P.size(f.bytes.length) + '</small></li>'; }).join('') + '</ul>';
          status(files.length + ' PDFs ready.');
        });
      });
    });
  }
  function pdfToWord() {
    var it = items[0], fmt = $('pdWordFmt').value;
    return openPdf(it.data, it.name).then(function (doc) {
      var all = [];
      var next = function (n) {
        if (n > doc.numPages) return Promise.resolve(all);
        status('Reading text on page ' + n + ' of ' + doc.numPages + '…');
        return doc.getPage(n).then(function (pg) { return pg.getTextContent(); }).then(function (tc) { all.push(P.lines(tc.items)); return next(n + 1); });
      };
      return next(1).then(function (ls) {
        var chars = ls.reduce(function (s, l) { return s + l.reduce(function (t, x) { return t + x.text.length; }, 0); }, 0);
        if (chars < doc.numPages * 20) throw new Error('This PDF has almost no text layer: it is probably a scan (pictures of pages). Converting it needs OCR, which this tool does not do.');
        var blocks = P.toBlocks(ls, { pageBreaks: $('pdBreaks').checked }), base = P.baseName(it.name), pagesN = doc.numPages;
        closePdf(doc);
        var out = fmt === 'txt' ? new TextEncoder().encode(P.blocksToText(blocks)) : D.build(blocks, { title: base, date: new Date() });
        var name = base + (fmt === 'txt' ? '.txt' : '.docx');
        $('pdResult').innerHTML = link(out, name, fmt === 'txt' ? 'text/plain' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') +
          '<p class="help">' + pagesN + ' pages · ' + blocks.filter(function (b) { return b.t === 'p'; }).length + ' paragraphs · ' + blocks.filter(function (b) { return b.t === 'h'; }).length + ' headings</p>' +
          '<details class="np-more"><summary>Preview the text</summary><pre class="pd-preview">' + esc(P.blocksToText(blocks).slice(0, 3000)) + '</pre></details>';
        status('Converted ' + pagesN + ' pages to ' + (fmt === 'txt' ? 'text' : 'Word') + '.');
      });
    });
  }
  function wordToPdf() {
    var it = items[0];
    status('Reading the Word document…');
    return script(V.mammoth, 'mammoth').then(function (m) {
      return m.convertToHtml({ arrayBuffer: it.data.buffer.slice(it.data.byteOffset, it.data.byteOffset + it.data.byteLength) });
    }).then(function (r) {
      var title = P.baseName(it.name);
      var doc = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>@page{size:A4;margin:20mm}body{font:11pt/1.5 Calibri,Carlito,"Segoe UI",Arial,sans-serif;color:#000;max-width:170mm;margin:0 auto}' +
        'h1{font-size:20pt}h2{font-size:16pt}h3{font-size:13pt}table{border-collapse:collapse;width:100%;margin:8pt 0}td,th{border:1px solid #999;padding:4pt 6pt;vertical-align:top}img{max-width:100%;height:auto}p{margin:0 0 8pt}</style></head><body>' + r.value + '</body></html>';
      var frame = document.createElement('iframe');
      frame.className = 'pd-frame';
      frame.title = 'Print preview of ' + it.name;
      $('pdResult').innerHTML = '';
      $('pdResult').appendChild(frame);
      frame.srcdoc = doc;
      var warn = r.messages.filter(function (x) { return x.type === 'warning'; }).length;
      var bar = document.createElement('div');
      bar.className = 'tool-actions';
      bar.innerHTML = '<button type="button" class="btn sm" id="pdPrint">Save as PDF (print)</button>' + link(new Blob([doc], { type: 'text/html' }), title + '.html', 'text/html', 'Download HTML');
      $('pdResult').insertBefore(bar, frame);
      $('pdPrint').addEventListener('click', function () { frame.contentWindow.focus(); frame.contentWindow.print(); });
      frame.addEventListener('load', function () { frame.style.height = Math.min(900, frame.contentDocument.documentElement.scrollHeight + 20) + 'px'; });
      status('Preview ready. Choose Save as PDF (print), then pick "Save as PDF" as the printer.' + (warn ? ' Some formatting was simplified.' : ''));
    });
  }
  function compress() {
    var it = items[0], scale = +$('pdCompDpi').value / 72, q = +$('pdCompQ').value / 100, out = [];
    return openPdf(it.data, it.name).then(function (doc) {
      var next = function (n) {
        if (n > doc.numPages) { closePdf(doc); return Promise.resolve(); }
        status('Compressing page ' + n + ' of ' + doc.numPages + '…');
        return renderPage(doc, n, scale, true).then(function (r) {
          return toBlob(r.canvas, 'image/jpeg', q).then(bytes).then(function (j) {
            var w = r.base.width, h = r.base.height;
            out.push({ jpeg: j, w: r.canvas.width, h: r.canvas.height, comps: 3, place: { pw: w, ph: h, x: 0, y: 0, w: w, h: h } });
            return next(n + 1);
          });
        });
      };
      return next(1);
    }).then(function () {
      var pdf = P.imagesToPdf(out, { title: P.baseName(it.name) }), before = it.data.length, smaller = pdf.length < before;
      $('pdResult').innerHTML = (smaller ? link(pdf, P.baseName(it.name) + '-compressed.pdf', 'application/pdf') : '') +
        '<p class="help">' + P.size(before) + ' → ' + P.size(pdf.length) + ' (' + (smaller ? Math.round((1 - pdf.length / before) * 100) + '% smaller' : 'larger, so keep your original') + ')</p>';
      status(smaller ? 'Compressed: ' + Math.round((1 - pdf.length / before) * 100) + '% smaller.' : 'This PDF is already compact; compressing would make it bigger.');
    });
  }
  var JOBS = { img2pdf: imagesToPdf, pdf2img: pdfToImages, merge: merge, organize: organize, pdf2word: pdfToWord, word2pdf: wordToPdf, compress: compress };

  // ---------------------------------------------------------------- events
  function tab(name) {
    mode = name;
    Array.prototype.forEach.call(form.querySelectorAll('[data-tab]'), function (b) { var on = b.getAttribute('data-tab') === name; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    Array.prototype.forEach.call(form.querySelectorAll('[data-panel]'), function (p) { p.hidden = p.getAttribute('data-panel') !== name; });
    items = []; pages = []; revoke();
    $('pdResult').innerHTML = '';
    error('');
    renderList();
    status('Add your file' + (name === 'img2pdf' || name === 'merge' ? 's' : '') + ' to start.');
    try { history.replaceState(null, '', '#' + name); } catch (e) { /* ignore */ }
    if (name !== 'img2pdf' && name !== 'word2pdf') getPdfjs().catch(function () {});
  }
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  var tabs = form.querySelector('.pe-tabs');
  tabs.addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) tab(b.getAttribute('data-tab')); });
  tabs.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var all = Array.prototype.slice.call(form.querySelectorAll('[data-tab]')), i = all.indexOf(document.activeElement);
    if (i < 0) return;
    var n = all[(i + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
    n.focus(); tab(n.getAttribute('data-tab'));
  });
  form.addEventListener('change', function (e) {
    var t = e.target;
    if (t.type === 'file') { if (t.files.length) add(t.files); t.value = ''; return; }
    if (t.id === 'pdSplit') $('pdSplitArgWrap').hidden = !/chunks|ranges/.test(t.value);
  });
  form.addEventListener('input', function (e) {
    if (e.target.id === 'pdQ') $('pdQOut').textContent = e.target.value + '%';
    if (e.target.id === 'pdCompQ') $('pdCompQOut').textContent = e.target.value + '%';
  });
  Array.prototype.forEach.call(form.querySelectorAll('.drop'), function (d) {
    d.addEventListener('dragover', function (e) { e.preventDefault(); d.classList.add('over'); });
    d.addEventListener('dragleave', function () { d.classList.remove('over'); });
    d.addEventListener('drop', function (e) { e.preventDefault(); d.classList.remove('over'); if (e.dataTransfer.files.length) add(e.dataTransfer.files); });
  });
  $('pdList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var i = +b.getAttribute('data-i'), act = b.getAttribute('data-act'), arr = mode === 'organize' && pages.length ? pages : items;
    var swap = function (a, z) { if (z < 0 || z >= arr.length) return; var t = arr[a]; arr[a] = arr[z]; arr[z] = t; };
    if (act === 'up' || act === 'left') swap(i, i - 1);
    if (act === 'down' || act === 'right') swap(i, i + 1);
    if (act === 'remove') items.splice(i, 1);
    if (act === 'rot') pages[i].rot = (pages[i].rot + 90) % 360;
    if (act === 'drop') pages[i].drop = !pages[i].drop;
    renderList();
    var again = $('pdList').querySelector('[data-act="' + act + '"][data-i="' + Math.max(0, Math.min(arr.length - 1, act === 'up' || act === 'left' ? i - 1 : act === 'down' || act === 'right' ? i + 1 : i)) + '"]');
    if (again) again.focus();
  });
  $('pdGo').addEventListener('click', function () {
    if (busy || !items.length) return;
    if (mode === 'merge' && items.length < 2) { form.querySelector('#pdMergeFiles').click(); return; }
    busy = true; error(''); renderList();
    var job = JOBS[mode];
    Promise.resolve().then(job).catch(function (e) {
      var m = e && e.message || String(e);
      error(/^range:/.test(m) ? 'Pages must look like 1-3, 5, 8-.' : m);
      status('');
    }).then(function () { busy = false; renderList(); });
  });
  $('pdClear').addEventListener('click', function () { tab(mode); });

  var start = location.hash.slice(1);
  if (JOBS[start]) tab(start); else renderList();
})();
