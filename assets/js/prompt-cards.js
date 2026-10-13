/* Prompt cards shared by the AI Prompt Generator and Image to Prompt pages: fills the three variation cards,
   copies prompts, and keeps saved prompts in this browser only (localStorage). */
(function (root) {
  'use strict';
  var P = root.TBBPrompt;
  if (!P) return;
  var ms = document.documentElement.lang === 'ms', lang = ms ? 'ms' : 'en';
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'tbb-prompts-v1', MAX = 30, KINDS = ['main', 'cinematic', 'artistic'];
  var T = ms ? {
    words: function (n) { return n + ' patah perkataan'; }, tokens: function (n) { return '~' + n + ' token'; },
    copied: 'Disalin', saved: 'Disimpan', del: 'Padam', live: function (p) { return '3 prompt untuk ' + p + ' sedia.'; }
  } : {
    words: function (n) { return n + ' words'; }, tokens: function (n) { return '~' + n + ' tokens'; },
    copied: 'Copied', saved: 'Saved', del: 'Delete', live: function (p) { return '3 prompts for ' + p + ' ready.'; }
  };
  var results = [];
  var editor = ($('promptOut') && $('promptOut').getAttribute('data-editor')) || location.pathname;

  function update(state) {
    results = P.buildAll(state, lang);
    var s = P.normalize(state);
    results.forEach(function (r) {
      $('pt-' + r.kind).textContent = r.ok ? r.prompt : r.notes[0];
      $('pm-' + r.kind).textContent = r.ok ? (s.platform === 'sd' ? T.tokens(r.tokens) : T.words(r.words)) : '';
      $('pn-' + r.kind).hidden = $('pcn-' + r.kind).hidden = !r.negative;
      $('pnt-' + r.kind).textContent = r.negative;
    });
    var notes = results[0].ok ? results[0].notes : [], ul = $('pNotes');
    ul.textContent = '';
    notes.forEach(function (n) { var li = document.createElement('li'); li.textContent = n; ul.appendChild(li); });
    ul.hidden = !notes.length;
    $('pPlatform').textContent = P.PLATFORMS[s.mode][s.platform].name;
    $('pLive').textContent = results[0].ok ? T.live(P.PLATFORMS[s.mode][s.platform].name) : '';
    return s;
  }

  function flash(btn, text) {
    var old = btn.textContent;
    btn.textContent = text;
    setTimeout(function () { btn.textContent = old; }, 1600);
  }
  function copy(text, btn) {
    var done = function () { flash(btn, T.copied); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* the text stays selectable on the card */ }
      ta.remove();
    }
  }

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function store(list) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); } catch (e) { /* private mode */ } }
  function renderSaved() {
    var box = $('savedBox'), ul = $('savedList');
    if (!box) return;
    var list = load();
    box.hidden = !list.length;
    ul.textContent = '';
    list.forEach(function (x, i) {
      var li = document.createElement('li'), a = document.createElement('a'), small = document.createElement('small'), del = document.createElement('button');
      a.className = 'saved-n'; a.href = editor + '#' + x.h;
      a.textContent = x.t.length > 90 ? x.t.slice(0, 88) + '…' : x.t;
      small.textContent = x.p; a.appendChild(small);
      del.type = 'button'; del.className = 'link-btn'; del.textContent = T.del; del.setAttribute('data-del', i);
      li.appendChild(a); li.appendChild(del); ul.appendChild(li);
    });
  }
  function save(kind, state, btn) {
    var r = results.filter(function (x) { return x.kind === kind; })[0];
    if (!r || !r.ok) return;
    var list = load().filter(function (x) { return x.t !== r.prompt; });
    list.unshift({ t: r.prompt, p: r.platform, h: P.toHash(P.normalize(state)) });
    store(list);
    renderSaved();
    flash(btn, T.saved);
  }

  function bind(getState) {
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-copy],[data-save],[data-del]');
      if (!b) return;
      if (b.hasAttribute('data-del')) { var list = load(); list.splice(+b.getAttribute('data-del'), 1); store(list); renderSaved(); return; }
      if (b.hasAttribute('data-save')) { save(b.getAttribute('data-save'), getState(), b); return; }
      var k = b.getAttribute('data-copy'), neg = /-neg$/.test(k), r = results.filter(function (x) { return x.kind === k.replace(/-neg$/, ''); })[0];
      if (r && r.ok) copy(neg ? r.negative : r.prompt, b);
    });
    renderSaved();
  }

  root.TBBPromptCards = { KINDS: KINDS, update: update, bind: bind };
})(typeof globalThis !== 'undefined' ? globalThis : this);
