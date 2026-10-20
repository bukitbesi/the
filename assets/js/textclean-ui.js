/* Find and Replace / Text Cleaner UI. Rules and clean-ups preview live; Replace all and Clean change the text with
   undo. Text and rules are kept only in this browser (localStorage). */
(function () {
  'use strict';
  var T = window.TBBText;
  var form = document.getElementById('frForm');
  if (!T || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var text = $('frText'), KEY = 'tbb-findreplace', history = [], timer = 0;

  function rules() {
    return [].map.call(form.querySelectorAll('.fr-rule'), function (row) {
      var r = { escapes: true };
      [].forEach.call(row.querySelectorAll('[data-k]'), function (el) { r[el.getAttribute('data-k')] = el.type === 'checkbox' ? el.checked : el.value; });
      r.multiline = r.regex;
      return r;
    });
  }
  function renderRules(list) { $('frRules').innerHTML = list.map(T.views.ruleRow).join(''); }
  function ops() { return [].filter.call(form.querySelectorAll('[name=op]'), function (c) { return c.checked; }).map(function (c) { return c.value; }); }

  function preview() {
    var R = rules(), t = text.value, r = T.replaceAll(t, R);
    [].forEach.call(form.querySelectorAll('.fr-rule'), function (row, i) {
      row.querySelector('.fr-count').textContent = R[i].find ? r.counts[i] + (r.counts[i] === 1 ? ' match' : ' matches') : '';
      var e = row.querySelector('.fr-err');
      e.hidden = !r.errors[i];
      e.textContent = r.errors[i] ? 'Invalid pattern: ' + r.errors[i] : '';
    });
    var first = R.filter(function (x) { return x.find; })[0];
    var h = first ? T.highlight(t.slice(0, 20000), first) : { html: T.esc(t.slice(0, 20000)), count: 0 };
    $('frPreview').innerHTML = h.html || '<span class="help">Your text appears here with matches highlighted.</span>';
    var total = r.counts.reduce(function (a, b) { return a + b; }, 0);
    $('frSummary').textContent = total ? total + (total === 1 ? ' replacement ready.' : ' replacements ready.') + ' Press Replace all.' : (R.some(function (x) { return x.find; }) ? 'No matches.' : '');
    var c = T.clean(t, ops(), $('frChars').value), s = T.stats(t, c);
    $('frCleanInfo').textContent = !(ops().length || $('frChars').value) ? 'Tick one or more clean-ups.' : c === t ? 'Nothing to clean with these options.' : s.removed > 0 ? s.removed + (s.removed === 1 ? ' character' : ' characters') + ' will be removed.' : 'Lines will be rearranged.';
    save();
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(preview, text.value.length > 100000 ? 300 : 80); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ t: text.value, r: rules(), o: ops(), c: $('frChars').value })); } catch (e) { /* storage blocked */ } }
  function apply(next, msg) {
    if (next === text.value) { $('frLive').textContent = 'No change.'; return; }
    history.push(text.value);
    if (history.length > 30) history.shift();
    text.value = next;
    $('frUndo').disabled = false;
    preview();
    $('frLive').textContent = msg;
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('input', schedule);
  form.addEventListener('change', schedule);
  form.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-del')) {
      var list = rules(), i = +b.closest('.fr-rule').getAttribute('data-i');
      list.splice(i, 1);
      renderRules(list.length ? list : [{}]);
      preview();
    } else if (b.id === 'frAdd') {
      var l = rules(); l.push({}); renderRules(l); form.querySelector('.fr-rule:last-child [data-k=find]').focus();
    } else if (b.id === 'frGo') {
      var r = T.replaceAll(text.value, rules()), n = r.counts.reduce(function (a, c) { return a + c; }, 0);
      apply(r.text, n + (n === 1 ? ' replacement made.' : ' replacements made.'));
    } else if (b.id === 'frClean') {
      var before = text.value, after = T.clean(before, ops(), $('frChars').value);
      apply(after, 'Cleaned: ' + T.stats(before, after).removed + ' characters removed.');
    } else if (b.id === 'frUndo') {
      if (history.length) { text.value = history.pop(); preview(); $('frLive').textContent = 'Undone.'; }
      b.disabled = !history.length;
    } else if (b.id === 'frCopy') {
      var btn = b;
      if (navigator.clipboard) navigator.clipboard.writeText(text.value).then(function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy text'; }, 1500); }, function () {});
    } else if (b.id === 'frClear') { apply('', 'Cleared.'); text.focus(); }
  });

  try {
    var s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s) {
      if (s.t) text.value = s.t;
      if (s.r && s.r.length) renderRules(s.r);
      [].forEach.call(form.querySelectorAll('[name=op]'), function (c) { c.checked = (s.o || []).indexOf(c.value) >= 0; });
      $('frChars').value = s.c || '';
      preview();
    }
  } catch (e) { /* storage blocked */ }
})();
