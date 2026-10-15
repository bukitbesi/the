/* AI image generator UI (BM + EN). Builds the prompt with TBBAi.imagePrompt(), optionally rewrites a short Malay or
   English idea into a detailed English prompt (POST /text, task "enhance"), then asks the site's AI worker for a
   FLUX.1 [schnell] picture (POST /image). Pictures stay in this tab only: a small history strip, never stored. */
(function () {
  'use strict';
  var A = window.TBBAi, K = window.TBBAiKit;
  var form = document.getElementById('genForm');
  if (!A || !K || !form) return;
  var ms = K.ms, api = form.getAttribute('data-api'), $ = function (id) { return document.getElementById(id); };
  var input = form.elements.prompt, history = [], current = null;
  var T = ms ? { working: 'AI sedang melukis… (5 hingga 15 saat)', enhancing: 'Menambah baik prompt…', done: function (s) { return 'Siap dalam ' + s + ' saat.'; }, alt: 'Gambar AI: ' }
    : { working: 'The AI is drawing… (5 to 15 seconds)', enhancing: 'Improving your prompt…', done: function (s) { return 'Done in ' + s + ' s.'; }, alt: 'AI picture: ' };
  var OPTS = ['style', 'quality'];

  K.counter(input, $('gCount'), A.FACTS.limits.image);
  K.submitShortcut(input, form);
  function style() { var r = form.querySelector('input[name=style]:checked'); return r ? r.value : 'none'; }
  function quality() { var r = form.querySelector('input[name=quality]:checked'); return r ? r.value : 'fast'; }

  function show(item) {
    current = item;
    var img = $('gImg');
    img.src = 'data:' + item.mime + ';base64,' + item.b64; img.alt = T.alt + item.prompt.slice(0, 120); img.hidden = false;
    $('gEmpty').hidden = true; $('gDownload').disabled = false; $('gAgain').disabled = false;
    $('gUsed').textContent = item.prompt; $('gUsedBox').hidden = false;
  }
  function addHistory(item) {
    history.unshift(item); history = history.slice(0, 6);
    var strip = $('gHistory'); strip.textContent = '';
    history.forEach(function (h) {
      var b = document.createElement('button'), im = document.createElement('img');
      b.type = 'button'; b.className = 'thumb'; im.src = 'data:' + h.mime + ';base64,' + h.b64; im.alt = ''; im.width = 72; im.height = 72;
      b.setAttribute('aria-label', h.prompt.slice(0, 80)); b.appendChild(im);
      b.addEventListener('click', function () { show(h); });
      strip.appendChild(b);
    });
    strip.hidden = false;
  }

  function generate() {
    var idea = input.value.trim();
    if (!idea) { $('gStatus').textContent = A.errorText('empty', ms ? 'ms' : 'en'); input.focus(); return; }
    var prompt = A.imagePrompt(idea, style()), t0 = Date.now();
    K.busy($('gGo'), true, T.working); $('gAgain').disabled = true;
    $('gStatus').textContent = T.working; $('gResult').setAttribute('aria-busy', 'true');
    A.request(api, '/image', { prompt: prompt, steps: quality() === 'detail' ? 8 : 4 }, 60000).then(function (j) {
      var item = { b64: j.image, mime: A.mimeOf(j.image), prompt: prompt };
      show(item); addHistory(item);
      var s = ((Date.now() - t0) / 1000).toFixed(1);
      $('gStatus').textContent = T.done(s); $('gLive').textContent = T.done(s);
    }, function (e) { $('gStatus').textContent = A.errorText(e.message, ms ? 'ms' : 'en'); })
      .then(function () { K.busy($('gGo'), false); if (current) $('gAgain').disabled = false; $('gResult').removeAttribute('aria-busy'); });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); generate(); });
  $('gAgain').addEventListener('click', generate);
  $('gEnhance').addEventListener('click', function () {
    var idea = input.value.trim();
    if (!idea) { $('gStatus').textContent = A.errorText('empty', ms ? 'ms' : 'en'); input.focus(); return; }
    K.busy($('gEnhance'), true, T.enhancing); $('gStatus').textContent = T.enhancing;
    A.request(api, '/text', A.enhance({ text: idea })).then(function (j) {
      input.value = A.clean(j.text); input.dispatchEvent(new Event('input')); $('gStatus').textContent = '';
    }, function (e) { $('gStatus').textContent = A.errorText(e.message, ms ? 'ms' : 'en'); })
      .then(function () { K.busy($('gEnhance'), false); });
  });
  $('gDownload').addEventListener('click', function () {
    if (!current) return;
    var a = document.createElement('a'), ext = current.mime.split('/')[1].replace('jpeg', 'jpg');
    a.href = 'data:' + current.mime + ';base64,' + current.b64; a.download = 'ai-' + (ms ? 'gambar' : 'image') + '-' + Date.now() + '.' + ext;
    document.body.appendChild(a); a.click(); a.remove();
  });
  K.copy($('gCopyPrompt'), function () { return current ? current.prompt : ''; });
  Array.prototype.forEach.call(document.querySelectorAll('[data-idea]'), function (b) {
    b.addEventListener('click', function () { input.value = b.getAttribute('data-idea'); input.dispatchEvent(new Event('input')); input.focus(); });
  });
  form.addEventListener('change', function (e) { if (OPTS.indexOf(e.target.name) >= 0) K.saveOptions(form, OPTS); });
  K.loadOptions(form, OPTS);
})();
