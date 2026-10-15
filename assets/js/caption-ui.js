/* AI caption and hashtag generator UI (BM + EN). Sends the post idea to the site's AI worker (POST /text) with the
   instructions from TBBAi.caption(), then lists each caption with its own copy button and length check against the
   platform's limit, plus the hashtags capped at the platform's maximum. */
(function () {
  'use strict';
  var A = window.TBBAi, K = window.TBBAiKit;
  var form = document.getElementById('capForm');
  if (!A || !K || !form) return;
  var ms = K.ms, api = form.getAttribute('data-api'), $ = function (id) { return document.getElementById(id); };
  var input = form.elements.text, list = $('kList'), tags = [];
  var T = ms ? { working: 'AI sedang menulis kapsyen…', copy: 'Salin', copyAll: 'Salin dengan hashtag', chars: function (n, max) { return n + ' / ' + K.nf.format(max) + ' aksara'; }, over: ' (terlalu panjang)', none: 'AI tidak memberikan kapsyen. Cuba lagi.', tagsMax: function (n) { return 'Maksimum ' + n + ' hashtag untuk platform ini.'; } }
    : { working: 'The AI is writing captions…', copy: 'Copy', copyAll: 'Copy with hashtags', chars: function (n, max) { return n + ' / ' + K.nf.format(max) + ' characters'; }, over: ' (too long)', none: 'The AI returned no captions. Please try again.', tagsMax: function (n) { return 'Maximum ' + n + ' hashtags for this platform.'; } };
  var OPTS = ['platform', 'tone', 'lang', 'occasion', 'emoji', 'hashtags'];

  K.counter(input, $('kCount'), A.FACTS.limits.caption);
  K.submitShortcut(input, form);
  K.copy($('kCopyTags'), function () { return tags.join(' '); });

  // The hashtag slider never goes above the platform's limit.
  function syncTags() {
    var lim = A.LIMITS[form.elements.platform.value] || A.LIMITS.instagram, h = form.elements.hashtags;
    h.max = lim.tags; if (Number(h.value) > lim.tags) h.value = lim.tags;
    $('o_hashtags').textContent = h.value; $('kTagNote').textContent = T.tagsMax(lim.tags);
  }

  function render(caps) {
    list.textContent = '';
    var lim = A.LIMITS[form.elements.platform.value] || A.LIMITS.instagram;
    caps.forEach(function (c) {
      var li = document.createElement('li'), p = document.createElement('p'), meta = document.createElement('div'), n = Array.from(c).length;
      p.textContent = c;
      var small = document.createElement('small'); small.textContent = T.chars(n, lim.max) + (n > lim.max ? T.over : ''); if (n > lim.max) small.className = 'over';
      var b1 = document.createElement('button'), b2 = document.createElement('button');
      b1.type = b2.type = 'button'; b1.className = b2.className = 'btn ghost sm'; b1.textContent = T.copy; b2.textContent = T.copyAll;
      K.copy(b1, function () { return c; }); K.copy(b2, function () { return c + (tags.length ? '\n\n' + tags.join(' ') : ''); });
      meta.className = 'cap-meta'; meta.appendChild(small); meta.appendChild(b1); if (tags.length) meta.appendChild(b2);
      li.appendChild(p); li.appendChild(meta); list.appendChild(li);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) { $('kStatus').textContent = A.errorText('empty', ms ? 'ms' : 'en'); input.focus(); return; }
    var body = A.caption({ text: text, platform: form.elements.platform.value, tone: form.elements.tone.value, lang: form.elements.lang.value, occasion: form.elements.occasion.value, emoji: form.elements.emoji.value, hashtags: form.elements.hashtags.value, count: 5 });
    K.busy($('kGo'), true, T.working); $('kStatus').textContent = T.working; $('kResult').setAttribute('aria-busy', 'true');
    A.request(api, '/text', body).then(function (j) {
      var r = A.parseCaptions(j.text), lim = A.LIMITS[form.elements.platform.value] || A.LIMITS.instagram;
      if (!r.captions.length) { $('kStatus').textContent = T.none; return; }
      tags = r.hashtags.slice(0, Math.min(lim.tags, Number(form.elements.hashtags.value)));
      $('kTitle').hidden = true; render(r.captions);
      $('kTags').textContent = tags.join(' '); $('kTagBox').hidden = !tags.length;
      $('kStatus').textContent = ''; $('kLive').textContent = r.captions[0];
    }, function (e2) { $('kStatus').textContent = A.errorText(e2.message, ms ? 'ms' : 'en'); })
      .then(function () { K.busy($('kGo'), false); $('kResult').removeAttribute('aria-busy'); });
  });
  form.addEventListener('change', function (e) { if (e.target.name === 'platform') syncTags(); if (OPTS.indexOf(e.target.name) >= 0) K.saveOptions(form, OPTS); });
  form.addEventListener('input', function (e) { if (e.target.name === 'hashtags') $('o_hashtags').textContent = e.target.value; });
  // Quick idea chips fill the box with a starter the visitor can edit.
  Array.prototype.forEach.call(document.querySelectorAll('[data-idea]'), function (b) {
    b.addEventListener('click', function () { input.value = b.getAttribute('data-idea'); input.dispatchEvent(new Event('input')); input.focus(); });
  });
  // Existing example captions get working copy buttons.
  tags = ($('kTags').textContent || '').split(/\s+/).filter(Boolean);
  Array.prototype.forEach.call(list.querySelectorAll('li'), function (li) {
    var text = li.querySelector('p').textContent, btns = li.querySelectorAll('button');
    if (btns[0]) K.copy(btns[0], function () { return text; });
    if (btns[1]) K.copy(btns[1], function () { return text + (tags.length ? '\n\n' + tags.join(' ') : ''); });
  });
  K.loadOptions(form, OPTS); syncTags();
})();
