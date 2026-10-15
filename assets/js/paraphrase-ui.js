/* Paraphraser and grammar checker UI (BM + EN). Sends the text to the site's AI worker (POST /text) with the
   instructions from TBBAi.paraphrase(), then shows the result with a word-level "show changes" view. */
(function () {
  'use strict';
  var A = window.TBBAi, K = window.TBBAiKit;
  var form = document.getElementById('paraForm');
  if (!A || !K || !form) return;
  var ms = K.ms, api = form.getAttribute('data-api'), $ = function (id) { return document.getElementById(id); };
  var input = form.elements.text, out = $('pOut'), lastIn = $('pOut').getAttribute('data-source') || '', lastOut = out.textContent.trim();
  var T = ms ? { go: 'Parafrasa', check: 'Semak tatabahasa', working: 'AI sedang menulis…', stats: function (w1, w2, sim) { return w1 + ' → ' + w2 + ' patah perkataan · ' + Math.round((1 - sim) * 100) + '% perkataan diubah'; }, fixes: function (n) { return n ? n + ' pembetulan' : 'Tiada kesalahan ditemui'; } }
    : { go: 'Paraphrase', check: 'Check grammar', working: 'The AI is writing…', stats: function (w1, w2, sim) { return w1 + ' → ' + w2 + ' words · ' + Math.round((1 - sim) * 100) + '% of words changed'; }, fixes: function (n) { return n ? n + (n === 1 ? ' correction' : ' corrections') : 'No mistakes found'; } };
  var OPTS = ['mode', 'lang'];

  K.counter(input, $('pCount'), A.FACTS.limits.paraphrase);
  K.submitShortcut(input, form);
  K.copy($('pCopy'), function () { return lastOut; });

  function mode() { var r = form.querySelector('input[name=mode]:checked'); return r ? r.value : 'standard'; }
  function label() { $('pGo').textContent = mode() === 'grammar' ? T.check : T.go; $('wLang').hidden = mode() === 'grammar'; }

  function show() {
    var d = A.diff(lastIn, lastOut), adds = d.filter(function (x) { return x.t === 'add'; }).length;
    if ($('pShow').checked) K.renderDiff(out, d); else out.textContent = lastOut;
    var c1 = A.count(lastIn).words, c2 = A.count(lastOut).words;
    $('pStats').textContent = mode() === 'grammar' ? T.fixes(adds) : T.stats(c1, c2, A.similarity(lastIn, lastOut));
  }

  function run(text) {
    text = String(text || '').trim();
    if (!text) { $('pStatus').textContent = A.errorText('empty', ms ? 'ms' : 'en'); input.focus(); return; }
    if (text.length > A.FACTS.limits.paraphrase) { $('pStatus').textContent = A.errorText('too_long', ms ? 'ms' : 'en'); return; }
    var body = A.paraphrase({ text: text, mode: mode(), lang: form.elements.lang.value });
    K.busy($('pGo'), true, T.working); $('pAgain').disabled = true;
    $('pStatus').textContent = T.working; $('pResult').setAttribute('aria-busy', 'true');
    A.request(api, '/text', body).then(function (j) {
      lastIn = text; lastOut = A.clean(j.text);
      $('pTitle').hidden = true; show();
      $('pStatus').textContent = '';
      $('pLive').textContent = lastOut.slice(0, 200);
    }, function (e) {
      $('pStatus').textContent = A.errorText(e.message, ms ? 'ms' : 'en');
    }).then(function () { K.busy($('pGo'), false); $('pAgain').disabled = false; $('pResult').removeAttribute('aria-busy'); });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); run(input.value); });
  form.addEventListener('change', function (e) { if (OPTS.indexOf(e.target.name) >= 0) { label(); K.saveOptions(form, OPTS); } });
  $('pShow').addEventListener('change', show);
  $('pAgain').addEventListener('click', function () { if (lastOut) { input.value = lastOut; input.dispatchEvent(new Event('input')); run(lastOut); } });
  $('pUse').addEventListener('click', function () { if (lastOut) { input.value = lastOut; input.dispatchEvent(new Event('input')); input.focus(); } });

  K.loadOptions(form, OPTS); label();
  if (lastIn && lastOut) show();
})();
