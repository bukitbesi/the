/* Unused CSS remover core, shared by the page, the build and the tests. Needs TBBCss (css-core.js) for parsing.
   Each selector is kept or removed by a matcher. The page uses an exact matcher (querySelector on the parsed
   pages); this file provides the keyword matcher (PurgeCSS-style: every class, id and tag in the selector must
   appear somewhere in the content) and everything both share: selector scanning, pseudo-class stripping,
   safelists, and pruning of rules, @media blocks, @keyframes, @font-face and custom properties.
   Note: the build strips comment blocks from bundles, so no string or regex here contains the comment delimiters. */
(function (root) {
  'use strict';

  var C = root.TBBCss || (typeof require === 'function' ? require('./css-core.js') : null);

  // Selector scanner: returns compounds of simple parts, keeping escapes such as .md\:flex intact.
  function scan(sel) {
    var parts = [], i = 0, n = sel.length;
    var ident = function () {
      var s = i;
      while (i < n && (/[-\w\u00a0-\uffff]/.test(sel[i]) || sel[i] === '\\')) i += sel[i] === '\\' ? 2 : 1;
      return sel.slice(s, i);
    };
    var balanced = function (open, close) {
      var depth = 0, s = i, q = '';
      for (; i < n; i++) {
        var c = sel[i];
        if (q) { if (c === '\\') i++; else if (c === q) q = ''; continue; }
        if (c === '"' || c === "'") q = c;
        else if (c === open) depth++;
        else if (c === close && --depth === 0) { i++; break; }
      }
      return sel.slice(s, i);
    };
    while (i < n) {
      var c = sel[i];
      if (/\s/.test(c) || c === '>' || c === '+' || c === '~') {
        var s = i;
        while (i < n && /[\s>+~]/.test(sel[i])) i++;
        var comb = sel.slice(s, i).trim();
        parts.push({ t: 'comb', v: comb || ' ' });
      } else if (c === '.') { i++; parts.push({ t: 'class', v: ident() }); }
      else if (c === '#') { i++; parts.push({ t: 'id', v: ident() }); }
      else if (c === '[') { parts.push({ t: 'attr', v: balanced('[', ']') }); }
      else if (c === ':') {
        var s2 = i;
        i += sel[i + 1] === ':' ? 2 : 1;
        ident();
        if (sel[i] === '(') balanced('(', ')');
        parts.push({ t: 'pseudo', v: sel.slice(s2, i) });
      } else if (c === '*') { i++; parts.push({ t: 'tag', v: '*' }); }
      else if (c === '&') { i++; parts.push({ t: 'nest', v: '&' }); }
      else if (c === '|') { i++; }
      else { var id = ident(); if (id) parts.push({ t: 'tag', v: id }); else i++; }
    }
    return parts;
  }

  var unesc = function (s) { return s.replace(/\\([0-9a-fA-F]{1,6}\s?|[\s\S])/g, function (m, x) { return /^[0-9a-fA-F]/.test(x) && x.length > 1 ? String.fromCodePoint(parseInt(x, 16)) : x.trim() || x; }); };

  // Pseudo-classes and pseudo-elements describe state (hover, focus, checked) or generated content that a static
  // page cannot show, so they are removed before matching. Removing them only widens a selector, never narrows it.
  // skip(name), when given, also removes safelisted classes, ids and tags: they are treated as possibly present.
  function matchable(sel, skip) {
    var parts = scan(sel), out = '', compound = '';
    var flush = function () { out += compound; compound = ''; };
    parts.forEach(function (p) {
      if (p.t === 'comb') { if (!compound) compound = '*'; flush(); out += p.v === ' ' ? ' ' : p.v; return; }
      if (p.t === 'pseudo') return;
      if (p.t === 'nest') return;
      if (skip && p.t !== 'attr' && skip(p.t === 'tag' ? p.v.toLowerCase() : unesc(p.v))) return;
      compound += (p.t === 'class' ? '.' : p.t === 'id' ? '#' : '') + p.v;
    });
    if (!compound) compound = '*';
    flush();
    return out.trim();
  }

  // Names a selector depends on: classes, ids, tags and attribute names outside functional pseudo-classes.
  function names(sel) {
    var r = { classes: [], ids: [], tags: [], attrs: [] };
    scan(sel).forEach(function (p) {
      if (p.t === 'class') r.classes.push(unesc(p.v));
      else if (p.t === 'id') r.ids.push(unesc(p.v));
      else if (p.t === 'tag' && p.v !== '*') r.tags.push(p.v.toLowerCase());
      else if (p.t === 'attr') { var m = /^\[\s*([^\s~|^$*=\]]+)/.exec(p.v); if (m) r.attrs.push(m[1].toLowerCase()); }
    });
    return r;
  }

  // Content words, PurgeCSS style: narrow words plus wider runs so Tailwind names such as md:flex or w-1/2 match.
  function keywords(texts) {
    var set = Object.create(null);
    texts.forEach(function (t) {
      // CSS inside <style> is what is being judged, so it must not count as content that uses it.
      t = String(t).replace(/<style\b[\s\S]*?<\/style\s*>/gi, ' ');
      String(t).replace(/[A-Za-z0-9_-]+/g, function (w) { set[w] = true; set[w.toLowerCase()] = true; return w; });
      String(t).replace(/[^\s"'`<>=(){};,]+/g, function (w) { set[w] = true; return w; });
      // Every class in class="a b c" also counts on its own, whatever characters it contains.
      String(t).replace(/\bclass(?:Name)?\s*=\s*("[^"]*"|'[^']*')/g, function (m, v) {
        v.slice(1, -1).split(/\s+/).forEach(function (c) { if (c) set[c] = true; });
        return m;
      });
    });
    return set;
  }
  function keywordMatcher(set) {
    var has = function (w) { return !!set[w]; };
    return function (sel) {
      var n = names(sel);
      return n.classes.every(has) && n.ids.every(has) && n.tags.every(has) && n.attrs.every(has);
    };
  }

  // ---- safelist
  var SAFE_PRESETS = {
    state: '/^(is|has|js)-/ active open opened show shown hide hidden visible collapsed collapsing expanded selected current disabled loading loaded fade in out sticky scrolled focus-visible',
    blogger: '/^(post|comment|widget|blog|status-msg|feed|item|main|sidebar|footer|header|navbar|section|tabs|Label|PopularPosts|BlogArchive|FeaturedPost|ContactForm|LinkList|PageList|Profile|BlogSearch|Attribution|Image|HTML|Text|Stats)/ /^(byline|share|snippet|jump-link|thread|continue|loadmore|cloud-label|label-size)/',
    wordpress: '/^wp-/ /^(align|has|is)-/ /^(menu|page|current|sub-menu|nav-|screen-reader|sticky|bypostauthor|gallery|wp-caption)/ alignleft alignright aligncenter alignwide alignfull',
    bootstrap: 'show fade collapse collapsing active disabled was-validated is-valid is-invalid /^(modal|offcanvas|dropdown|tooltip|popover|carousel|toast|bs-)/'
  };
  function safelist(text) {
    var exact = Object.create(null), patterns = [];
    String(text || '').split(/[\s,]+/).forEach(function (w) {
      if (!w) return;
      var m = /^\/(.+)\/([a-z]*)$/.exec(w);
      if (m) { try { patterns.push(new RegExp(m[1], m[2].replace(/[^imsu]/g, ''))); } catch (e) { return; } }
      else exact[w.replace(/^[.#]/, '')] = true;
    });
    return function (name) { return !!exact[name] || patterns.some(function (r) { return r.test(name); }); };
  }

  // Selectors that match the document itself or nothing in particular are always kept.
  var ALWAYS = /^(\*|html|body|:root|::?(selection|backdrop|placeholder|marker|-webkit-scrollbar[-\w]*|-moz-selection|cue|view-transition[-\w]*)(\(.*\))?|:host.*|::slotted.*|&.*)$/i;

  var allStar = function (m) { return /^[*\s>+~]*$/.test(m); };
  // A safelisted name does not keep every selector it appears in: it counts as present, and the rest of the
  // selector must still match. So with "active" safelisted, .nav-link.active stays while .dropdown-item.active
  // goes when the page has no .dropdown-item.
  function decision(sel, ctx) {
    var plain = sel.trim();
    if (!plain || ALWAYS.test(plain) || plain.indexOf('&') >= 0) return { keep: true, why: 'global' };
    var m = matchable(plain);
    if (allStar(m)) return { keep: true, why: 'global' };
    var n = names(plain), safe = ctx.safe && n.classes.concat(n.ids, n.tags).some(ctx.safe);
    var reduced = safe ? matchable(plain, ctx.safe) : m;
    var r = allStar(reduced) ? true : ctx.match(reduced, reduced);
    if (r === false) return { keep: false, why: 'unused' };
    return { keep: true, why: safe && ctx.match(m, m) === false ? 'safelist' : 'used' };
  }

  var KEYFRAMES = /^@(-[a-z]+-)?keyframes\s+(.+)$/i;
  var KEEP_BLOCK = /^@(font-feature-values|page|property|counter-style|view-transition|position-try|-[a-z]+-viewport|viewport)\b/i;

  function prune(items, ctx, report) {
    return items.filter(function (it) {
      if (it.comment || it.statement || it.prop !== undefined) return true;
      var head = it.prelude[0] || '';
      if (head.charAt(0) === '@') {
        var k = KEYFRAMES.exec(head);
        if (k) { ctx.keyframes.push({ item: it, name: k[2].trim().replace(/^["']|["']$/g, '') }); return true; }
        if (/^@font-face$/i.test(head)) { ctx.fonts.push(it); return true; }
        if (KEEP_BLOCK.test(head)) return true;
        // @media, @supports, @container, @layer, @scope, @starting-style, @document: prune inside, drop when empty.
        it.items = prune(it.items, ctx, report);
        return it.items.length > 0 || /^@layer\b/i.test(head);
      }
      var kept = [], unused = [];
      it.prelude.forEach(function (sel) {
        var d = decision(sel, ctx);
        if (d.why === 'safelist') report.safelisted++;
        (d.keep ? kept : unused).push(sel);
      });
      report.selectors += it.prelude.length;
      // Without "partial", one used selector keeps the whole list. Nested rules (CSS nesting) stay with their parent.
      var gone = !kept.length ? unused : ctx.partial ? unused : [];
      gone.forEach(function (sel) { report.removed.push({ selector: sel, source: ctx.source }); });
      report.selectorsRemoved += gone.length;
      if (!kept.length) { report.rulesRemoved++; return false; }
      report.rulesKept++;
      if (ctx.partial) it.prelude = kept;
      return true;
    });
  }

  // Values of every kept declaration, used to decide which @keyframes, @font-face and --variables are still needed.
  function values(items, out) {
    items.forEach(function (it) {
      if (it.prop !== undefined) out.push({ prop: it.prop, value: it.value });
      // A @font-face naming its own family is a definition, not a use.
      else if (it.items && !/^@font-face$/i.test(it.prelude[0] || '')) values(it.items, out);
    });
    return out;
  }
  function dropItems(items, test) {
    return items.filter(function (it) {
      if (test(it)) return false;
      if (it.items) {
        it.items = dropItems(it.items, test);
        var head = it.prelude && it.prelude[0] || '';
        if (it.items.length === 0 && head.charAt(0) === '@' && !/^@(layer|font-face|page|property)\b/i.test(head)) return false;
        if (it.items.length === 0 && head.charAt(0) !== '@') return false;
      }
      return true;
    });
  }

  /* sources: [{ name, css }]; opts: { match(selectorForMatching, original) -> false to remove, safelist text,
     safePresets: [...], partial (drop unused selectors from lists), keyframes, fontFace, variables, content (texts
     for variable references) }. Returns per-source CSS (unformatted) and a report. */
  function purge(sources, opts) {
    var safeText = (opts.safePresets || []).map(function (k) { return SAFE_PRESETS[k] || ''; }).join(' ') + ' ' + (opts.safelist || '');
    var report = { selectors: 0, selectorsRemoved: 0, rulesKept: 0, rulesRemoved: 0, safelisted: 0, removed: [], keyframes: [], fonts: [], variables: [], warnings: [] };
    var trees = sources.map(function (s) {
      var t = C.tree(s.css, { keepImportant: true });
      t.warnings.forEach(function (w) { report.warnings.push({ source: s.name, warning: w }); });
      var ctx = { match: opts.match, safe: safelist(safeText), partial: opts.partial !== false, keyframes: [], fonts: [], source: s.name };
      var items = prune(t.items, ctx, report);
      return { name: s.name, items: items, keyframes: ctx.keyframes, fonts: ctx.fonts };
    });
    var all = function () { return values([].concat.apply([], trees.map(function (t) { return t.items; })), []); };
    var used = all();
    var usedText = used.map(function (d) { return d.prop + ':' + d.value; }).join(';');
    var safe = safelist(safeText);
    if (opts.keyframes !== false) {
      // Animation names are matched as whole words in any kept value, including custom properties.
      var drop = [];
      trees.forEach(function (t) { t.keyframes.forEach(function (k) {
        var re = new RegExp('(^|[\\s,:;(])' + k.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[\\s,;)])');
        if (!re.test(usedText) && !safe(k.name)) { drop.push(k.item); report.keyframes.push({ name: k.name, source: t.name }); }
      }); });
      trees.forEach(function (t) { t.items = dropItems(t.items, function (it) { return drop.indexOf(it) >= 0; }); });
    }
    if (opts.fontFace !== false) {
      var families = used.filter(function (d) { return /^(font|font-family|--.*)$/i.test(d.prop); }).map(function (d) { return d.value.toLowerCase(); }).join(',');
      var dropF = [];
      trees.forEach(function (t) { t.fonts.forEach(function (f) {
        var fam = (f.items.filter(function (d) { return /^font-family$/i.test(d.prop); })[0] || {}).value;
        if (!fam) return;
        var name = fam.replace(/^["']|["']$/g, '').toLowerCase();
        if (families.indexOf(name) < 0 && !safe(name)) { dropF.push(f); report.fonts.push({ name: fam.replace(/^["']|["']$/g, ''), source: t.name }); }
      }); });
      trees.forEach(function (t) { t.items = dropItems(t.items, function (it) { return dropF.indexOf(it) >= 0; }); });
    }
    if (opts.variables) {
      // Repeat until stable: removing one variable can leave another unreferenced.
      var content = (opts.content || []).join('\n');
      for (var pass = 0; pass < 10; pass++) {
        var vals = all(), refs = vals.map(function (d) { return d.value; }).join(';') + content;
        var dead = Object.create(null), any = false;
        vals.forEach(function (d) {
          if (d.prop.slice(0, 2) !== '--' || safe(d.prop.slice(2))) return;
          var name = d.prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (!new RegExp('var\\(\\s*' + name + '\\b|' + name + '\\s*[,)\'"]').test(refs)) { dead[d.prop] = true; any = true; }
        });
        if (!any) break;
        Object.keys(dead).forEach(function (v) { if (report.variables.indexOf(v) < 0) report.variables.push(v); });
        trees.forEach(function (t) { t.items = dropItems(t.items, function (it) { return it.prop !== undefined && dead[it.prop]; }); });
      }
    }
    return {
      files: trees.map(function (t) { return { name: t.name, css: C.print(t.items) }; }),
      report: report
    };
  }

  // Report markup, shared by the page and the build so the pre-rendered report matches later runs.
  var escHtml = function (x) { return String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  function reportHtml(rep) {
    var group = function (title, items) {
      if (!items.length) return '';
      var shown = items.slice(0, 400);
      return '<h3 class="sub-h">' + escHtml(title) + ' (' + items.length + ')</h3><ul class="removed-list">' + shown.map(function (x) {
        return '<li><code>' + escHtml(x.label) + '</code>' + (x.source ? ' <small>' + escHtml(x.source) + '</small>' : '') + '</li>';
      }).join('') + (items.length > shown.length ? '<li>… and ' + (items.length - shown.length) + ' more</li>' : '') + '</ul>';
    };
    var body = group('Removed selectors', rep.removed.map(function (x) { return { label: x.selector, source: x.source }; })) +
      group('Removed @keyframes', rep.keyframes.map(function (x) { return { label: x.name, source: x.source }; })) +
      group('Removed @font-face', rep.fonts.map(function (x) { return { label: x.name, source: x.source }; })) +
      group('Removed custom properties', rep.variables.map(function (x) { return { label: x }; })) +
      group('Warnings', rep.warnings.map(function (x) { return { label: x.warning, source: x.source }; }));
    var parts = [rep.selectorsRemoved + (rep.selectorsRemoved === 1 ? ' selector' : ' selectors')];
    if (rep.keyframes.length) parts.push(rep.keyframes.length + ' @keyframes');
    if (rep.fonts.length) parts.push(rep.fonts.length + ' @font-face');
    if (rep.variables.length) parts.push(rep.variables.length + (rep.variables.length === 1 ? ' variable' : ' variables'));
    return {
      summary: 'Report: removed ' + parts.join(', ') + (rep.safelisted ? ' · ' + rep.safelisted + ' kept by the safelist' : ''),
      body: body || '<p>Nothing was removed: every selector is used.</p>'
    };
  }
  function statsHtml(before, after, rep, pages, gz) {
    var s = C.saving(before, after), kb = function (n) { return n < 1024 ? n + ' B' : (n / 1024).toFixed(n < 10240 ? 2 : 1) + ' KB'; };
    return '<strong>' + kb(s.before) + ' → ' + kb(s.after) + '</strong> (' + s.percent + '% smaller)<span id="purgeGz">' + (gz || '') + '</span> · ' +
      rep.selectorsRemoved + ' of ' + rep.selectors + ' selectors removed · ' + pages + (pages === 1 ? ' page' : ' pages');
  }

  var SAMPLE_HTML = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head><title>Blog post</title></head>',
    '<body>',
    '<header class="site-header">',
    '  <nav class="nav"><a class="nav-link active" href="/">Home</a> <a class="nav-link" href="/blog">Blog</a></nav>',
    '</header>',
    '<main class="container">',
    '  <article class="post">',
    '    <h1 class="post-title">Hello world</h1>',
    '    <p class="lead">Unused CSS makes every page slower to render.</p>',
    '    <button class="btn btn-primary" type="button">Subscribe</button>',
    '  </article>',
    '</main>',
    '</body>',
    '</html>',
    ''
  ].join('\n');

  var SAMPLE_CSS = [
    ':root { --brand: #5b4bd5; --unused-color: #ff0000; }',
    'body { margin: 0; font-family: "Inter", system-ui, sans-serif; }',
    '.site-header { padding: 16px; border-bottom: 1px solid #eee; }',
    '.nav-link { color: #333; text-decoration: none; }',
    '.nav-link:hover, .nav-link.active { color: var(--brand); }',
    '.sidebar { width: 300px; float: right; }',
    '.post-title { font-size: 2rem; animation: fade-in .3s ease-out; }',
    '.lead { font-size: 1.25rem; }',
    '.btn { padding: 8px 16px; border-radius: 6px; }',
    '.btn-primary { background: var(--brand); color: #fff; }',
    '.btn-danger, .alert-danger { background: #d63031; color: #fff; }',
    '.modal, .modal-backdrop { position: fixed; inset: 0; }',
    '@media (max-width: 600px) { .sidebar { display: none; } .post-title { font-size: 1.5rem; } }',
    '@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }',
    '@keyframes spin { to { transform: rotate(360deg); } }',
    '@font-face { font-family: "Inter"; src: url(inter.woff2) format("woff2"); }',
    '@font-face { font-family: "Old Icons"; src: url(icons.woff2) format("woff2"); }',
    ''
  ].join('\n');

  var api = { scan: scan, matchable: matchable, names: names, keywords: keywords, keywordMatcher: keywordMatcher,
    safelist: safelist, SAFE_PRESETS: SAFE_PRESETS, decision: decision, purge: purge, reportHtml: reportHtml, statsHtml: statsHtml, SAMPLE_HTML: SAMPLE_HTML, SAMPLE_CSS: SAMPLE_CSS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBPurge = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
