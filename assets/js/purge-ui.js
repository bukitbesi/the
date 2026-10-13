/* Unused CSS Remover UI. Pages are parsed with DOMParser and each selector is tested with querySelector
   (exact mode), or matched by keywords like PurgeCSS (keyword mode). Sources come from pasted code, files,
   URLs (with stylesheet discovery and an optional same-site crawl) and captures made by the bookmarklet on a
   live page. Nothing is uploaded: URLs are fetched by this browser, through the site's proxy only when the
   other site blocks cross-site requests. Only options are remembered in localStorage. */
(function () {
  'use strict';
  var P = window.TBBPurge, C = window.TBBCss;
  var form = document.getElementById('purgeForm');
  if (!P || !C || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var output = $('purgeOut'), stats = $('purgeStats'), live = $('purgeLive');
  var STORE = 'tbb-purge-opts', LIVE_MAX = 1500000, PROXY = form.getAttribute('data-proxy') || '';
  var CHECKS = ['partial', 'keyframes', 'fontFace', 'variables', 'safeState', 'safeBlogger', 'safeWordpress', 'safeBootstrap', 'discover'];
  var result = null, timer = 0, seq = 0, gzRun = 0;
  var kb = function (n) { return n < 1024 ? n + ' B' : (n / 1024).toFixed(n < 10240 ? 2 : 1) + ' KB'; };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ---- sources
  function list(kind) { return $('src-' + kind); }
  function sources(kind) {
    return [].map.call(list(kind).querySelectorAll('.src'), function (box) {
      return { name: box.getAttribute('data-name'), text: box.querySelector('textarea').value };
    }).filter(function (s) { return s.text.trim(); });
  }
  function addSource(kind, name, text) {
    var box = [].filter.call(list(kind).querySelectorAll('.src'), function (b) { return b.getAttribute('data-name') === name; })[0];
    if (!box) {
      var n = ++seq, id = 'src-' + kind + '-' + n;
      box = document.createElement('div');
      box.className = 'src';
      box.setAttribute('data-name', name);
      box.innerHTML = '<div class="src-head"><label for="' + id + '">' + esc(name) + '</label>' +
        '<button type="button" class="link-btn src-del" aria-label="Remove ' + esc(name) + '">Remove</button></div>' +
        '<textarea class="code code-sm" id="' + id + '" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>';
      list(kind).appendChild(box);
    }
    box.querySelector('textarea').value = text;
    return box;
  }
  var counter = { html: 1, css: 1, js: 0 };
  var LABEL = { html: 'Page', css: 'Stylesheet', js: 'Script' };
  function blank(kind) {
    counter[kind]++;
    var box = addSource(kind, LABEL[kind] + ' ' + counter[kind], '');
    box.querySelector('textarea').focus();
  }

  // ---- options
  function opts() {
    var e = form.elements, o = { mode: e.match.value, format: e.format.value, safelist: e.safelist.value };
    CHECKS.forEach(function (k) { o[k] = e[k].checked; });
    return o;
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(opts())); } catch (x) { return; }
  }
  function restore() {
    var o, before = JSON.stringify(opts()), e = form.elements;
    try { o = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (x) { o = null; }
    if (!o) return false;
    if (o.mode === 'exact' || o.mode === 'keyword') e.match.value = o.mode;
    if (o.format === 'min' || o.format === 'pretty') e.format.value = o.format;
    if (typeof o.safelist === 'string') e.safelist.value = o.safelist;
    CHECKS.forEach(function (k) { if (typeof o[k] === 'boolean') e[k].checked = o[k]; });
    return JSON.stringify(opts()) !== before;
  }

  // ---- matching
  function matcher(o, html, js) {
    var all = P.keywordMatcher(P.keywords(html.map(function (s) { return s.text; }).concat(js.map(function (s) { return s.text; }))));
    if (o.mode === 'keyword') return all;
    var parser = new DOMParser();
    var docs = html.map(function (s) { return parser.parseFromString(s.text, 'text/html'); });
    var cache = Object.create(null);
    return function (sel, original) {
      if (sel in cache) return cache[sel];
      var r = false;
      for (var i = 0; i < docs.length && !r; i++) {
        // A selector this browser cannot parse (another browser's prefix, new syntax) is kept.
        try { r = !!docs[i].querySelector(sel); } catch (x) { r = undefined; break; }
      }
      // Class names that scripts add later (menus, sliders) count as used when they appear in the scripts.
      if (r === false && js.length) r = all(original);
      cache[sel] = r;
      return r;
    };
  }

  function run(announce) {
    clearTimeout(timer);
    var o = opts(), html = sources('html'), css = sources('css'), js = sources('js');
    if (!css.length || !(html.length || js.length)) {
      result = null;
      output.value = '';
      stats.textContent = !css.length ? 'Add the CSS to clean.' : 'Add at least one page (HTML) to compare the CSS with.';
      renderReport(null);
      $('purgeCopy').disabled = $('purgeDownload').disabled = true;
      return;
    }
    var presets = [];
    if (o.safeState) presets.push('state');
    if (o.safeBlogger) presets.push('blogger');
    if (o.safeWordpress) presets.push('wordpress');
    if (o.safeBootstrap) presets.push('bootstrap');
    var r = P.purge(css.map(function (s) { return { name: s.name, css: s.text }; }), {
      match: matcher(o, html, js), safelist: o.safelist, safePresets: presets, partial: o.partial,
      keyframes: o.keyframes, fontFace: o.fontFace, variables: o.variables,
      content: html.map(function (s) { return s.text; }).concat(js.map(function (s) { return s.text; }))
    });
    var fmt = function (t) { return o.format === 'pretty' ? C.beautify(t).css : C.minify(t).css; };
    r.files.forEach(function (f, i) { f.out = fmt(f.css); f.before = css[i].text; });
    result = { files: r.files, report: r.report, pages: html.length };
    var sel = $('purgeFile'), prev = sel.value;
    sel.innerHTML = '<option value="all">All files combined (' + r.files.length + ')</option>' + r.files.map(function (f, i) {
      return '<option value="' + i + '">' + esc(f.name) + '</option>';
    }).join('');
    sel.value = [].some.call(sel.options, function (x) { return x.value === prev; }) ? prev : 'all';
    $('purgeFileField').hidden = r.files.length < 2;
    show(announce);
    renderReport(r.report);
  }

  function show(announce) {
    if (!result) return;
    var v = $('purgeFile').value, files = v === 'all' ? result.files : [result.files[Number(v)]];
    output.value = files.map(function (f) { return f.out; }).join(opts().format === 'pretty' ? '\n' : '');
    var before = files.map(function (f) { return f.before; }).join('\n');
    var s = C.saving(before, output.value), rep = result.report;
    gzRun++;
    // The previous gzip size stays until the new one is known, so the line keeps its height and nothing below jumps.
    var oldGz = $('purgeGz') ? $('purgeGz').textContent : '';
    stats.innerHTML = P.statsHtml(before, output.value, rep, result.pages, oldGz);
    gzip(output.value, gzRun);
    $('purgeCopy').disabled = $('purgeDownload').disabled = !output.value;
    if (announce) live.textContent = 'Removed ' + rep.selectorsRemoved + ' unused selectors. ' + kb(s.after) + ', ' + s.percent + '% smaller.';
  }

  function gzip(text, run) {
    if (typeof CompressionStream === 'undefined' || !text) return;
    var stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    new Response(stream).arrayBuffer().then(function (buf) {
      var el = $('purgeGz');
      if (run === gzRun && el) el.textContent = ' · ' + kb(buf.byteLength) + ' gzipped';
    }, function () {});
  }

  function renderReport(rep) {
    if (!rep) { $('purgeReportSum').textContent = 'Report'; $('purgeReportBody').innerHTML = ''; return; }
    var r = P.reportHtml(rep);
    $('purgeReportSum').textContent = r.summary;
    $('purgeReportBody').innerHTML = r.body;
  }

  // ---- URLs
  function fetchText(url) {
    var ok = function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); };
    return fetch(url, { mode: 'cors', credentials: 'omit' }).then(ok, function () {
      // A network-level failure is almost always the other site refusing cross-site reads (CORS).
      if (!PROXY) throw new Error('blocked');
      return fetch(PROXY + encodeURIComponent(url), { credentials: 'omit' }).then(ok, function () { throw new Error('blocked'); });
    });
  }
  var SKIP = /\.(jpe?g|png|gif|webp|avif|svg|ico|pdf|zip|rar|7z|mp3|mp4|webm|mov|woff2?|ttf|otf|css|js|json|xml|txt)(\?|$)/i;
  function status(url, state, note) {
    var ul = $('urlStatus'), li = [].filter.call(ul.children, function (x) { return x.getAttribute('data-url') === url; })[0];
    if (!li) { li = document.createElement('li'); li.setAttribute('data-url', url); ul.appendChild(li); }
    li.className = 'url-' + state;
    li.innerHTML = '<span class="lvl">' + esc(state) + '</span> <span class="url-name">' + esc(url) + '</span>' + (note ? ' <small>' + esc(note) + '</small>' : '');
  }
  function fetchPages() {
    var urls = $('urlList').value.split(/\s+/).filter(Boolean).map(function (u) {
      try { return new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u).href; } catch (x) { return null; }
    }).filter(Boolean);
    if (!urls.length) { $('urlList').focus(); return; }
    var o = opts(), crawl = Number(form.elements.crawl.value) || 0, seen = Object.create(null), cssSeen = Object.create(null);
    var queue = urls.slice(), extra = 0, blocked = 0, active = 0;
    $('urlStatus').innerHTML = '';
    $('urlGo').disabled = true;
    return new Promise(function (resolve) {
      function next() {
        if (!queue.length && !active) { $('urlGo').disabled = false; resolve(); return; }
        while (queue.length && active < 3) take(queue.shift());
      }
      function take(url) {
        if (seen[url]) return next();
        seen[url] = true;
        active++;
        status(url, 'loading');
        fetchText(url).then(function (text) {
          addSource('html', url, text);
          var doc = new DOMParser().parseFromString(text, 'text/html'), jobs = [];
          if (o.discover) {
            [].forEach.call(doc.querySelectorAll('link[rel~="stylesheet" i][href]'), function (l) {
              var href;
              try { href = new URL(l.getAttribute('href'), url).href; } catch (x) { return; }
              if (cssSeen[href]) return;
              cssSeen[href] = true;
              jobs.push(fetchText(href).then(function (css) { addSource('css', href, css); }, function () { status(href, 'blocked', 'stylesheet could not be loaded'); }));
            });
            [].forEach.call(doc.querySelectorAll('style'), function (s, i) {
              if (s.textContent.trim()) addSource('css', 'inline <style> ' + (i + 1) + ' on ' + url, s.textContent);
            });
          }
          if (extra < crawl) {
            var origin = new URL(url).origin;
            [].forEach.call(doc.querySelectorAll('a[href]'), function (a) {
              if (extra >= crawl) return;
              var href;
              try { href = new URL(a.getAttribute('href'), url); } catch (x) { return; }
              href.hash = '';
              if (href.origin !== origin || SKIP.test(href.pathname) || seen[href.href] || queue.indexOf(href.href) >= 0) return;
              queue.push(href.href);
              extra++;
            });
          }
          return Promise.all(jobs).then(function () { status(url, 'loaded'); });
        }, function (e) {
          blocked++;
          status(url, 'blocked', e.message === 'blocked' ? 'this site does not allow other sites to read it; use the capture bookmarklet below' : e.message);
        }).then(function () { active--; run(true); next(); });
      }
      next();
    });
  }

  // ---- capture bookmarklet: copies the rendered page and the raw text of its stylesheets as JSON.
  var SNIPPET = "(async()=>{const o={tbb:'css-capture',v:1,url:location.href,html:document.documentElement.outerHTML,css:[],skipped:[]};" +
    "for(const s of document.styleSheets){const n=s.ownerNode;try{if(n&&n.tagName==='STYLE'){if(n.textContent.trim())o.css.push({name:'inline <style> on '+location.pathname,text:n.textContent});continue}" +
    "if(s.href){const r=await fetch(s.href);if(!r.ok)throw 0;o.css.push({name:s.href,text:await r.text()})}}catch(e){o.skipped.push(s.href||'inline')}}" +
    "const t=JSON.stringify(o);try{await navigator.clipboard.writeText(t);alert('Copied this page and '+o.css.length+' stylesheets ('+Math.round(t.length/1024)+' KB). Paste it into the Unused CSS Remover.')}" +
    "catch(e){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'application/json'}));a.download='css-capture.json';a.click();alert('Saved css-capture.json. Upload it in the Unused CSS Remover.')}})()";
  function importCapture(text) {
    var d;
    try { d = JSON.parse(text); } catch (x) { return false; }
    if (!d || d.tbb !== 'css-capture' || typeof d.html !== 'string') return false;
    addSource('html', d.url || 'Captured page', d.html);
    (d.css || []).forEach(function (s) { if (s && typeof s.text === 'string') addSource('css', s.name || 'Captured stylesheet', s.text); });
    var note = $('capNote');
    note.hidden = false;
    note.textContent = 'Added ' + (d.url || 'the page') + ' and ' + (d.css || []).length + ' stylesheets.' +
      (d.skipped && d.skipped.length ? ' Not readable (other sites): ' + d.skipped.join(', ') + '.' : '');
    run(true);
    return true;
  }

  function readFiles(files, kind) {
    [].forEach.call(files, function (f) {
      if (f.size > 8 * 1024 * 1024) return;
      var r = new FileReader();
      r.onload = function () {
        var text = String(r.result);
        if (/\.json$/i.test(f.name) && importCapture(text)) return;
        var k = kind || (/\.css$/i.test(f.name) ? 'css' : /\.(m?js|cjs)$/i.test(f.name) ? 'js' : 'html');
        addSource(k, f.name, text);
        if (k === 'js') $('jsSources').open = true;
        run(true);
      };
      r.readAsText(f);
    });
  }

  // ---- events
  form.addEventListener('submit', function (e) { e.preventDefault(); run(true); });
  form.addEventListener('change', function (e) {
    var t = e.target;
    // Text areas (sources and the safelist) rerun while typing, so their change on blur would only repeat that run.
    if (t.type === 'file' || t.tagName === 'TEXTAREA' || t.name === 'crawl' || t.id === 'purgeFile') return;
    save();
    run(true);
  });
  form.addEventListener('input', function (e) {
    if (e.target.tagName !== 'TEXTAREA' || e.target.id === 'urlList' || e.target.id === 'capIn' || e.target === output) return;
    if (e.target.id === 'safelist') save();
    clearTimeout(timer);
    var total = 0;
    [].forEach.call(form.querySelectorAll('.src textarea'), function (t) { total += t.value.length; });
    if (total <= LIVE_MAX) timer = setTimeout(run, 700);
  });
  form.addEventListener('click', function (e) {
    var del = e.target.closest('.src-del');
    if (del) { del.closest('.src').remove(); run(true); return; }
    var add = e.target.closest('[data-add]');
    if (add) blank(add.getAttribute('data-add'));
  });
  [['fileHtml', 'html'], ['fileCss', 'css'], ['fileJs', 'js'], ['fileCap', null]].forEach(function (x) {
    $(x[0]).addEventListener('change', function () { readFiles(this.files, x[1]); this.value = ''; });
  });
  form.addEventListener('dragover', function (e) { if (e.target.closest('.code-tool')) e.preventDefault(); });
  form.addEventListener('drop', function (e) {
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    readFiles(e.dataTransfer.files, null);
  });
  $('urlGo').addEventListener('click', fetchPages);
  $('purgeFile').addEventListener('change', function () { show(false); });
  $('capIn').addEventListener('input', function () {
    if (importCapture(this.value)) this.value = '';
  });
  $('capCopy').addEventListener('click', function () {
    var btn = this;
    if (navigator.clipboard) navigator.clipboard.writeText(SNIPPET).then(function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy console code'; }, 1800); });
  });
  $('capLink').setAttribute('href', 'javascript:' + encodeURIComponent(SNIPPET));
  $('capLink').addEventListener('click', function (e) { e.preventDefault(); live.textContent = 'Drag this button to your bookmarks bar, then click it on your own site.'; });
  $('purgeCopy').addEventListener('click', function () {
    var btn = this;
    var done = function () { var old = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = old; }, 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(output.value).then(done, function () { output.select(); document.execCommand('copy'); done(); });
    live.textContent = 'Copied to clipboard.';
  });
  $('purgeDownload').addEventListener('click', function () {
    var v = $('purgeFile').value, name = 'styles.clean.css';
    if (result && v !== 'all') {
      var f = result.files[Number(v)].name;
      name = (f.split(/[\\/?#]/).filter(Boolean).pop() || 'styles').replace(/\.css$/i, '').replace(/[^\w.-]+/g, '-').slice(0, 60) + '.clean.css';
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([output.value], { type: 'text/css' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  });
  $('purgeSample').addEventListener('click', function () {
    ['html', 'css', 'js'].forEach(function (k) { list(k).innerHTML = ''; });
    counter = { html: 1, css: 1, js: 0 };
    addSource('html', 'Page 1', P.SAMPLE_HTML);
    addSource('css', 'Stylesheet 1', P.SAMPLE_CSS);
    run(true);
  });
  $('purgeClear').addEventListener('click', function () {
    ['html', 'css', 'js'].forEach(function (k) { list(k).innerHTML = ''; });
    counter = { html: 0, css: 0, js: 0 };
    $('urlStatus').innerHTML = '';
    blank('css');
    blank('html');
    run(false);
  });

  // The page ships with the sample already cleaned with the default options; it only reruns when options differ.
  if (restore()) run(false);
})();
