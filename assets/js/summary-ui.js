/* AI summarizer UI (BM + EN). Sends the text to the site's AI worker (POST /text) with the instructions from
   TBBAi.summarize(), then shows the summary with how much shorter it is and the reading time saved. */
(function () {
  'use strict';
  var A = window.TBBAi, K = window.TBBAiKit;
  var form = document.getElementById('sumForm');
  if (!A || !K || !form) return;
  var ms = K.ms, api = form.getAttribute('data-api'), $ = function (id) { return document.getElementById(id); };
  var input = form.elements.text, out = $('sOut'), lastOut = out.textContent.trim();
  var T = ms ? { working: 'AI sedang meringkaskan…', stats: function (a, b, pct, mins) { return a + ' → ' + b + ' patah perkataan · ' + pct + '% lebih pendek · jimat kira-kira ' + mins + ' minit membaca'; } }
    : { working: 'The AI is summarizing…', stats: function (a, b, pct, mins) { return a + ' → ' + b + ' words · ' + pct + '% shorter · about ' + mins + (mins === 1 ? ' minute' : ' minutes') + ' of reading saved'; } };
  var OPTS = ['size', 'format', 'lang'];

  K.counter(input, $('sCount'), A.FACTS.limits.summarize);
  K.submitShortcut(input, form);
  K.copy($('sCopy'), function () { return lastOut; });

  // Bullet lines ("- " or "• ") become a list; anything else stays as paragraphs.
  function render(text) {
    out.textContent = '';
    var lines = text.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean), list = null;
    lines.forEach(function (l) {
      var b = l.match(/^[-•*]\s+(.*)$/);
      if (b) { if (!list) { list = document.createElement('ul'); out.appendChild(list); } var li = document.createElement('li'); li.textContent = b[1]; list.appendChild(li); }
      else { list = null; var p = document.createElement('p'); p.textContent = l.replace(/^\*\*(.*)\*\*$/, '$1'); out.appendChild(p); }
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) { $('sStatus').textContent = A.errorText('empty', ms ? 'ms' : 'en'); input.focus(); return; }
    if (text.length > A.FACTS.limits.summarize) { $('sStatus').textContent = A.errorText('too_long', ms ? 'ms' : 'en'); return; }
    var body = A.summarize({ text: text, length: form.elements.size.value, format: form.elements.format.value, lang: form.elements.lang.value });
    K.busy($('sGo'), true, T.working); $('sStatus').textContent = T.working; $('sResult').setAttribute('aria-busy', 'true');
    A.request(api, '/text', body).then(function (j) {
      lastOut = A.clean(j.text); render(lastOut); $('sTitle').hidden = true;
      var a = A.count(text), b = A.count(lastOut), pct = a.words ? Math.max(0, Math.round((1 - b.words / a.words) * 100)) : 0;
      $('sStats').textContent = T.stats(a.words, b.words, pct, Math.max(1, Math.round(a.minutes - b.minutes)));
      $('sStatus').textContent = ''; $('sLive').textContent = lastOut.slice(0, 200);
    }, function (e2) { $('sStatus').textContent = A.errorText(e2.message, ms ? 'ms' : 'en'); })
      .then(function () { K.busy($('sGo'), false); $('sResult').removeAttribute('aria-busy'); });
  });
  form.addEventListener('change', function (e) { if (OPTS.indexOf(e.target.name) >= 0) K.saveOptions(form, OPTS); });
  $('sClear').addEventListener('click', function () { input.value = ''; input.dispatchEvent(new Event('input')); input.focus(); });
  K.loadOptions(form, OPTS);
})();
