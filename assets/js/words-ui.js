/* Word Counter UI. Counts run in the browser on every change; the text is kept only in this browser's
   localStorage. Opens .txt, .md and .docx (unzipped with zip-core.js and the browser's DecompressionStream). */
(function () {
  'use strict';
  var W = window.TBBWords, Z = window.TBBZip;
  var form = document.getElementById('wcForm');
  if (!W || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var V = W.views, text = $('wcText'), KEY = 'tbb-wordcount', timer = 0;

  function run() {
    var t = text.value, a = W.analyze(t);
    $('wcStats').innerHTML = V.statsHtml(a);
    $('wcRead').innerHTML = V.readHtml(a);
    $('wcDensity').innerHTML = V.densityRows(W.density(t, +form.elements.n.value, { stop: $('wcStop').checked }));
    $('wcLimits').innerHTML = V.limitRows(W.limits(t, a));
    var kw = $('wcKw').value.trim();
    $('wcKwOut').innerHTML = V.keywordHtml(kw ? W.keyword(t, kw) : null, kw);
    var goal = +$('wcGoal').value, bar = $('wcGoalBar');
    bar.hidden = !(goal > 0);
    if (goal > 0) {
      var pct = Math.min(100, Math.round(a.words / goal * 100));
      bar.firstChild.style.width = pct + '%';
      bar.setAttribute('aria-valuenow', String(pct));
      bar.title = a.words + ' of ' + goal + ' words (' + pct + '%)';
    }
    try { if (t) localStorage.setItem(KEY, JSON.stringify({ t: t, goal: $('wcGoal').value, kw: kw })); } catch (e) { /* storage blocked */ }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(run, text.value.length > 50000 ? 300 : 60); }
  function error(m) { $('wcError').hidden = !m; $('wcError').textContent = m || ''; }

  function inflate(b) {
    var s = new Blob([b]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(s).arrayBuffer().then(function (x) { return new Uint8Array(x); });
  }
  function openFile(f) {
    error('');
    if (/\.docx$/i.test(f.name)) {
      if (typeof DecompressionStream === 'undefined') { error('This browser cannot open .docx files; paste the text instead.'); return; }
      return f.arrayBuffer().then(function (buf) {
        // Identity "inflate" hands back the raw entry; deflated ones are inflated asynchronously below.
        var doc = Z.unzip(new Uint8Array(buf), function (x) { return x; }).filter(function (e) { return e.name === 'word/document.xml'; })[0];
        if (!doc) throw new Error('notDocx');
        var raw = Z.unzip(new Uint8Array(buf)).filter(function (e) { return e.name === 'word/document.xml'; })[0];
        return (raw.bytes ? Promise.resolve(raw.bytes) : inflate(doc.bytes)).then(function (bytes) {
          text.value = W.docxText([{ name: doc.name, bytes: bytes }]); run(); $('wcLive').textContent = 'Opened ' + f.name + '.';
        });
      }).catch(function () { error(f.name + ' could not be read as a Word document.'); });
    }
    return f.text().then(function (t) { text.value = t.replace(/\r\n?/g, '\n'); run(); $('wcLive').textContent = 'Opened ' + f.name + '.'; });
  }
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('input', schedule);
  form.addEventListener('change', function (e) { if (e.target.id === 'wcFile') { if (e.target.files[0]) openFile(e.target.files[0]); e.target.value = ''; return; } run(); });
  text.addEventListener('dragover', function (e) { e.preventDefault(); });
  text.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files[0]; if (f) { e.preventDefault(); openFile(f); } });
  $('wcCopy').addEventListener('click', function () {
    var b = this, done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy text'; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(text.value).then(done, function () { text.select(); document.execCommand('copy'); done(); });
  });
  $('wcClear').addEventListener('click', function () {
    text.value = '';
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    run();
    text.focus();
  });

  // Restore the last text; otherwise the page already shows the sample's counts.
  try {
    var s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && s.t) { text.value = s.t; $('wcGoal').value = s.goal || ''; $('wcKw').value = s.kw || ''; run(); }
  } catch (e) { /* storage blocked */ }
})();
