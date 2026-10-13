/* AI Prompt Generator UI (EN + BM): image and video modes, style chips, "Surprise me", three variations per
   platform, state in the URL hash (also how Image to Prompt hands a description over). */
(function () {
  'use strict';
  var P = window.TBBPrompt, C = window.TBBPromptCards;
  var form = document.getElementById('promptForm');
  if (!P || !C || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var GROUP_KEYS = Object.keys(P.GROUPS);
  var TEXT = ['subject', 'action', 'setting', 'details', 'negative', 'sound', 'dialogue'];

  function mode() { return form.elements.mode.value === 'video' ? 'video' : 'image'; }
  function getState() {
    var s = { mode: mode(), platform: form.elements.platform.value, aspect: form.elements.aspect.value };
    TEXT.forEach(function (k) { s[k] = form.elements[k].value; });
    var groups = mode() === 'video' ? P.VIDEO_GROUPS : P.IMAGE_GROUPS;
    groups.forEach(function (k) { s[k] = form.elements[k].value; });
    return s;
  }

  function setPlatforms(m, wanted) {
    var sel = form.elements.platform, list = P.PLATFORMS[m];
    if (sel.getAttribute('data-mode') !== m) {
      sel.textContent = '';
      Object.keys(list).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = list[k].name; sel.appendChild(o); });
      sel.setAttribute('data-mode', m);
    }
    sel.value = list[wanted] ? wanted : Object.keys(list)[0];
  }
  function showMode(m) {
    Array.prototype.forEach.call(form.querySelectorAll('[data-only]'), function (el) { el.hidden = el.getAttribute('data-only') !== m; });
  }
  // A value that is not one of the chips (from Image to Prompt or an old link) gets its own chip.
  function setGroup(k, v) {
    if (!form.elements[k]) return;
    var found = false;
    Array.prototype.forEach.call(form.querySelectorAll('input[name="' + k + '"]'), function (r) { r.checked = r.value === (v || ''); if (r.checked) found = true; });
    if (v && !found) {
      var set = form.querySelector('[data-group="' + k + '"]'), label = document.createElement('label'), input = document.createElement('input');
      input.type = 'radio'; input.name = k; input.value = v; input.checked = true;
      label.appendChild(input); label.appendChild(document.createTextNode(v));
      set.appendChild(label);
    }
  }
  function setState(s) {
    var n = P.normalize(s);
    form.elements.mode.value = n.mode;
    showMode(n.mode);
    setPlatforms(n.mode, n.platform);
    form.elements.aspect.value = n.aspect;
    TEXT.forEach(function (k) { form.elements[k].value = n[k]; });
    GROUP_KEYS.forEach(function (k) { setGroup(k, n[k]); });
  }

  function render(writeHash) {
    var s = C.update(getState());
    if (writeHash) history.replaceState(null, '', '#' + P.toHash(s));
  }

  var frame = 0;
  var later = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
  form.addEventListener('input', later);
  form.addEventListener('change', function (e) {
    if (e.target.name === 'mode') {
      var m = mode(), other = m === 'video' ? '1:1' : '16:9';
      showMode(m);
      setPlatforms(m, '');
      if (form.elements.aspect.value === other) form.elements.aspect.value = m === 'video' ? '16:9' : '1:1';
    }
    later();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  $('pSurprise').addEventListener('click', function () {
    var keep = { platform: form.elements.platform.value, aspect: form.elements.aspect.value, negative: form.elements.negative.value };
    var s = P.surprise(Math.floor(Math.random() * 1e9) + 1, mode());
    for (var k in keep) s[k] = keep[k];
    setState(s);
    render(true);
  });
  $('pClear').addEventListener('click', function () {
    setState({ mode: mode(), platform: form.elements.platform.value, aspect: form.elements.aspect.value });
    render(true);
    form.elements.subject.focus();
  });
  $('pPrint').addEventListener('click', function () { window.print(); });
  // A link that only sets the mode (such as the old video prompt page) keeps the example idea.
  function fromLink() {
    var h = P.fromHash(location.hash), cur = getState();
    if (!h.subject) for (var k in cur) if (!(k in h) && k !== 'platform' && k !== 'aspect') h[k] = cur[k];
    setState(h);
    render(false);
  }
  window.addEventListener('hashchange', fromLink);

  C.bind(getState);
  if (location.hash.length > 1) fromLink();
})();
