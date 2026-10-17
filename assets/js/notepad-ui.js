/* Online Notepad UI. Notes live in localStorage on this device only; nothing is uploaded. The page ships with the
   welcome note rendered; stored notes replace it on load. Share links carry the note deflated into the URL
   fragment (#n=...), which browsers never send to the server. */
(function () {
  'use strict';
  var N = window.TBBNotes, D = window.TBBDocx;
  var form = document.getElementById('npForm');
  if (!N || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'tbb-notes-v1';
  var text = $('npText'), preview = $('npPreview'), panes = $('npPanes'), list = $('npNotes'), titleIn = $('npTitle');
  var state = { notes: [], current: '', settings: { font: 'sans', size: 'm', wrap: true, spell: true, view: 'write' } };
  var saveTimer = 0, previewTimer = 0, savedAt = 0, findPos = 0;

  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && Array.isArray(s.notes)) return s; } catch (e) { /* storage blocked */ }
    return null;
  }
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      savedAt = Date.now();
      error('');
      return true;
    } catch (e) {
      error(e && e.name === 'QuotaExceededError' ? 'Storage is full. Download a backup, then delete old notes or snapshots.' : 'This browser is blocking storage (private mode?), so notes will not be kept after you close the page. Download your note to keep it.');
      return false;
    }
  }
  function error(msg) { $('npError').hidden = !msg; $('npError').textContent = msg || ''; }
  function say(msg) { $('npLive').textContent = msg; }
  function cur() {
    var n = null;
    state.notes.forEach(function (x) { if (x.id === state.current) n = x; });
    return n;
  }
  var time = function (t) { return new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };

  function renderStats() {
    $('npStats').textContent = N.summary(N.stats(text.value)) + (savedAt ? ' · Saved ' + new Date(savedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '');
  }
  function renderPreview() { if (panes.getAttribute('data-view') !== 'write') preview.innerHTML = N.html(text.value, { shift: 2 }) || '<p class="help">Nothing to preview yet.</p>'; }
  function renderList() {
    var q = $('npSearch').value, shown = N.search(state.notes, q).sort(function (a, b) { return b.updated - a.updated; });
    list.innerHTML = shown.map(function (n) {
      return '<li><button type="button" class="np-note' + (n.id === state.current ? ' on' : '') + '" data-id="' + n.id + '"' + (n.id === state.current ? ' aria-current="true"' : '') + '><strong>' +
        N.esc(N.title(n)) + '</strong><small>' + time(n.updated) + ' · ' + N.stats(n.text).words + ' words</small></button></li>';
    }).join('') || '<li class="help">No notes match.</li>';
  }
  function renderSnaps() {
    var n = cur(), snaps = n ? n.snaps.slice().reverse() : [];
    $('npSnaps').innerHTML = snaps.length ? snaps.map(function (s, i) {
      return '<li><span>' + time(s.t) + ' · ' + N.stats(s.text).words + ' words</span> <button type="button" class="link-btn" data-snap="' + (snaps.length - 1 - i) + '">Restore</button></li>';
    }).join('') : '<li class="help">No snapshots yet.</li>';
  }
  function open(id) {
    state.current = id;
    var n = cur();
    text.value = n.text;
    titleIn.value = n.title || '';
    titleIn.placeholder = N.title({ text: n.text });
    renderStats(); renderPreview(); renderList(); renderSnaps();
  }
  function schedule() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var n = cur();
      if (!n) return;
      if (N.snapshot(n, Date.now())) renderSnaps();
      persist();
      renderStats();
      renderList();
    }, 400);
  }
  function applySettings() {
    var s = state.settings;
    form.setAttribute('data-font', s.font);
    form.setAttribute('data-size', s.size);
    text.wrap = s.wrap ? 'soft' : 'off';
    text.spellcheck = s.spell;
    $('npFont').value = s.font; $('npSize').value = s.size; $('npWrap').checked = s.wrap; $('npSpell').checked = s.spell;
    setView(s.view || 'write');
  }
  function setView(v) {
    panes.setAttribute('data-view', v);
    form.elements.view.value = v;
    state.settings.view = v;
    renderPreview();
  }
  function addNote(body, title) {
    var n = N.newNote(body || '');
    n.title = title || '';
    state.notes.push(n);
    open(n.id);
    persist();
    return n;
  }

  // ---- export
  function download(bytes, name, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bytes], { type: type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function exportNote(fmt) {
    var n = cur(), name = N.safeName(N.title(n)), body = text.value;
    if (fmt === 'md') return download(body, name + '.md', 'text/markdown');
    if (fmt === 'docx') return download(D.build(N.parse(body), { title: N.title(n), date: new Date() }), name + '.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    if (fmt === 'html') return download('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + N.esc(N.title(n)) +
      '</title><style>body{max-width:720px;margin:2rem auto;padding:0 1rem;font:16px/1.6 system-ui,sans-serif}pre{background:#f4f4f4;padding:12px;overflow:auto}blockquote{border-left:4px solid #ccc;margin-left:0;padding-left:1rem;color:#555}</style></head><body>\n' + N.html(body) + '\n</body></html>\n', name + '.html', 'text/html');
    download(body, name + '.txt', 'text/plain');
  }
  // ---- share links
  function pack(str) {
    if (typeof CompressionStream === 'undefined') return Promise.reject(new Error('old'));
    var s = new Blob([str]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Response(s).arrayBuffer().then(function (b) { return N.toBase64Url(new Uint8Array(b)); });
  }
  function unpack(str) {
    var s = new Blob([N.fromBase64Url(str)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(s).text();
  }
  function copy(str, btn, label) {
    var done = function () { if (btn) { var old = btn.textContent; btn.textContent = label || 'Copied'; setTimeout(function () { btn.textContent = old; }, 1800); } say('Copied to clipboard.'); };
    if (navigator.clipboard) return navigator.clipboard.writeText(str).then(done, function () { window.prompt('Copy this:', str); });
    window.prompt('Copy this:', str);
  }

  // ---- find and replace
  function findOpts() { return { caseSensitive: $('npCase').checked, word: $('npWord').checked, regex: $('npRegex').checked }; }
  function count() {
    var q = $('npQ').value;
    try { $('npCount').textContent = q ? N.findAll(text.value, q, findOpts()).length + ' found' : ''; error(''); }
    catch (e) { $('npCount').textContent = ''; error('That regular expression is not valid.'); }
  }
  function findNext() {
    var hits;
    try { hits = N.findAll(text.value, $('npQ').value, findOpts()); } catch (e) { return count(); }
    if (!hits.length) { say('Not found.'); return null; }
    var from = text.selectionEnd, hit = hits.filter(function (h) { return h.start >= from; })[0] || hits[0];
    text.focus();
    text.setSelectionRange(hit.start, hit.end);
    findPos = hit.start;
    say('Match ' + (hits.indexOf(hit) + 1) + ' of ' + hits.length + '.');
    return hit;
  }
  // Replacing through execCommand keeps the browser's undo history (Ctrl+Z) working.
  function replaceSelection(str) {
    text.focus();
    if (!document.execCommand || !document.execCommand('insertText', false, str)) text.setRangeText(str, text.selectionStart, text.selectionEnd, 'end');
    text.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // ---- events
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  text.addEventListener('input', function () {
    var n = cur();
    if (!n) n = addNote(text.value);
    n.text = text.value;
    n.updated = Date.now();
    if (!n.title) titleIn.placeholder = N.title(n);
    renderStats();
    clearTimeout(previewTimer);
    previewTimer = setTimeout(renderPreview, 150);
    if ($('npQ').value) count();
    schedule();
  });
  titleIn.addEventListener('input', function () { var n = cur(); n.title = titleIn.value; n.updated = Date.now(); schedule(); });
  form.addEventListener('change', function (e) {
    var t = e.target, s = state.settings;
    if (t.name === 'view') setView(t.value);
    else if (t.id === 'npFont') s.font = t.value;
    else if (t.id === 'npSize') s.size = t.value;
    else if (t.id === 'npWrap') s.wrap = t.checked;
    else if (t.id === 'npSpell') s.spell = t.checked;
    else return;
    applySettings();
    persist();
  });
  list.addEventListener('click', function (e) { var b = e.target.closest('[data-id]'); if (b) { open(b.getAttribute('data-id')); text.focus(); } });
  $('npSearch').addEventListener('input', renderList);
  $('npNew').addEventListener('click', function () { addNote(''); text.focus(); say('New note.'); });
  $('npDelete').addEventListener('click', function () {
    var n = cur();
    if (!n || !window.confirm('Delete "' + N.title(n) + '"? This cannot be undone.')) return;
    state.notes = state.notes.filter(function (x) { return x.id !== n.id; });
    if (!state.notes.length) state.notes.push(N.newNote(''));
    open(state.notes.slice().sort(function (a, b) { return b.updated - a.updated; })[0].id);
    persist();
    say('Note deleted.');
  });
  $('npFile').addEventListener('change', function () {
    var files = Array.prototype.slice.call(this.files);
    this.value = '';
    Promise.all(files.map(function (f) { return f.text().then(function (t) { return { name: f.name, text: t }; }); })).then(function (got) {
      got.forEach(function (f) {
        if (/\.json$/i.test(f.name)) { try { restore(f.text); } catch (e) { error(f.name + ' is not a notepad backup.'); } return; }
        addNote(f.text.replace(/\r\n?/g, '\n'), f.name.replace(/\.[^.]+$/, ''));
      });
      say(got.length + ' file' + (got.length === 1 ? '' : 's') + ' opened.');
    });
  });
  function restore(json) {
    var notes = N.importBackup(json, state.notes);
    state.notes = state.notes.concat(notes);
    if (notes.length) open(notes[0].id);
    persist();
    say(notes.length + ' notes restored.');
  }
  $('npRestore').addEventListener('change', function () {
    var f = this.files[0];
    this.value = '';
    if (f) f.text().then(function (t) { try { restore(t); } catch (e) { error('That file is not a notepad backup.'); } });
  });
  $('npBackup').addEventListener('click', function () {
    download(JSON.stringify({ app: 'tool.thebukitbesi.com/online-notepad', version: 1, exported: new Date().toISOString(), notes: state.notes }, null, 1),
      'notes-backup-' + new Date().toISOString().slice(0, 10) + '.json', 'application/json');
  });
  $('npDownload').addEventListener('click', function () { exportNote($('npFmt').value); });
  $('npCopy').addEventListener('click', function () { copy(text.value, this); });
  $('npShare').addEventListener('click', function () {
    var btn = this;
    pack(text.value).then(function (code) {
      var url = location.origin + location.pathname + '#n=' + code;
      copy(url, btn, 'Link copied');
      say('Share link copied' + (url.length > 8000 ? '. It is long; some chat apps cut links over 8,000 characters, so send the .txt file instead if it breaks.' : '.'));
    }, function () { error('This browser cannot compress share links. Update it, or download the note instead.'); });
  });
  $('npPrint').addEventListener('click', function () {
    var v = panes.getAttribute('data-view');
    preview.innerHTML = N.html(text.value, { shift: 2 });
    document.body.classList.add('np-printing');
    window.print();
    document.body.classList.remove('np-printing');
    setView(v);
  });
  $('npFocus').addEventListener('click', function () {
    var on = !document.body.classList.contains('np-focus');
    document.body.classList.toggle('np-focus', on);
    this.setAttribute('aria-pressed', String(on));
    this.textContent = on ? 'Exit focus' : 'Focus';
    if (on && form.requestFullscreen) form.requestFullscreen().catch(function () {});
    if (!on && document.fullscreenElement) document.exitFullscreen().catch(function () {});
    text.focus();
  });
  document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement && document.body.classList.contains('np-focus')) $('npFocus').click();
  });
  $('npTransforms').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tf]');
    if (!b) return;
    var fn = N.TRANSFORMS[b.getAttribute('data-tf')].fn;
    if (text.selectionStart === text.selectionEnd) text.setSelectionRange(0, text.value.length);
    replaceSelection(fn(text.value.slice(text.selectionStart, text.selectionEnd)));
    say(b.textContent + ' applied.');
  });
  $('npSnap').addEventListener('click', function () {
    var n = cur();
    say(N.snapshot(n, Date.now(), true) ? 'Snapshot saved.' : 'Nothing new to snapshot.');
    persist(); renderSnaps();
  });
  $('npSnaps').addEventListener('click', function (e) {
    var b = e.target.closest('[data-snap]');
    if (!b) return;
    var n = cur(), s = n.snaps[+b.getAttribute('data-snap')];
    N.snapshot(n, Date.now(), true);
    text.focus();
    text.setSelectionRange(0, text.value.length);
    replaceSelection(s.text);
    say('Restored the version from ' + time(s.t) + '. The previous text was kept as a snapshot.');
  });
  ['npQ', 'npCase', 'npWord', 'npRegex'].forEach(function (id) { $(id).addEventListener('input', count); $(id).addEventListener('change', count); });
  $('npQ').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); findNext(); } });
  $('npNext').addEventListener('click', findNext);
  $('npRep').addEventListener('click', function () {
    var q = $('npQ').value, sel = text.value.slice(text.selectionStart, text.selectionEnd), hits;
    try { hits = N.findAll(sel, q, findOpts()); } catch (e) { return count(); }
    if (sel && hits.length === 1 && hits[0].start === 0 && hits[0].end === sel.length) replaceSelection(N.replaceAll(sel, q, $('npR').value, findOpts()).text);
    findNext();
  });
  $('npRepAll').addEventListener('click', function () {
    var r;
    try { r = N.replaceAll(text.value, $('npQ').value, $('npR').value, findOpts()); } catch (e) { return count(); }
    if (!r.count) { say('Not found.'); return; }
    text.focus();
    text.setSelectionRange(0, text.value.length);
    replaceSelection(r.text);
    say(r.count + ' replaced.');
  });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && form.contains(document.activeElement)) {
      e.preventDefault();
      $('npSnap').click();
    }
    if (e.key === 'Escape' && document.body.classList.contains('np-focus')) $('npFocus').click();
  });
  // Another tab changed the notes: reload them unless this tab has unsaved typing.
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY || !e.newValue) return;
    clearTimeout(saveTimer);
    var s = load();
    if (!s) return;
    var id = state.current;
    state = s;
    if (!cur()) state.current = id;
    if (cur()) open(state.current); else open(state.notes[0].id);
  });

  // ---- start: stored notes, else the welcome note becomes the first note; a share link adds a note.
  var stored = load();
  if (stored && stored.notes.length) {
    state.notes = stored.notes;
    state.current = stored.current;
    state.settings = Object.assign(state.settings, stored.settings || {});
    if (!cur()) state.current = state.notes[0].id;
    open(state.current);
  } else {
    var w = N.newNote(text.value);
    state.notes = [w];
    state.current = w.id;
    renderList();
  }
  applySettings();
  var m = /^#n=([A-Za-z0-9_-]+)$/.exec(location.hash);
  if (m && typeof DecompressionStream !== 'undefined') {
    unpack(m[1]).then(function (shared) {
      addNote(shared);
      history.replaceState(null, '', location.pathname + location.search);
      say('Shared note opened and saved as a new note.');
    }, function () { error('This share link is damaged or incomplete.'); });
  }
})();
