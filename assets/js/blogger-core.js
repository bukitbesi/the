/* Blogger Template Generator core: reads TBB Lite's Theme Designer variables, builds a palette from one brand colour,
   checks every text/background pair against WCAG 2.2 AA in light and dark mode (using the Color Contrast Checker
   core), renders a sandboxed live preview, writes a customised theme XML, and audits any Blogger theme XML for speed
   and SEO problems. UMD: module.exports in Node, window.TBBBlogger in the browser (needs window.TBBContrast). */
(function (root) {
  'use strict';
  var C = typeof module !== 'undefined' && module.exports ? require('./contrast-core.js') : root.TBBContrast;
  var FACTS = { verified: '2026-11-07', theme: 'TBB Lite 1.0.1', aa: 4.5 };

  var FONTS = [
    { key: 'system', label: 'System sans (fastest)', stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
    { key: 'humanist', label: 'Humanist sans', stack: "Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'DejaVu Sans', source-sans-pro, sans-serif" },
    { key: 'serif', label: 'Book serif', stack: "Charter, 'Bitstream Charter', 'Sitka Text', Cambria, Georgia, serif" },
    { key: 'rounded', label: 'Rounded sans', stack: "ui-rounded, 'Hiragino Maru Gothic ProN', Quicksand, Comfortaa, Manjari, 'Arial Rounded MT', Calibri, sans-serif" },
    { key: 'mono', label: 'Monospace (tech blogs)', stack: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace" }
  ];
  // Pairs the generator checks; every one is text, so each must reach 4.5:1 (WCAG 2.2 SC 1.4.3, AA normal text).
  var PAIRS = [
    ['text.color', 'page.bg', 'light', 'Body text'], ['text.color', 'surface.bg', 'light', 'Text on cards'],
    ['muted.color', 'page.bg', 'light', 'Dates and captions'], ['muted.color', 'surface.bg', 'light', 'Captions on cards'],
    ['link.color', 'page.bg', 'light', 'Links'], ['link.color', 'surface.bg', 'light', 'Links on cards'],
    ['brand.ink', 'brand.color', 'light', 'Button text'],
    ['dark.text', 'dark.bg', 'dark', 'Body text'], ['dark.text', 'dark.surface', 'dark', 'Text on cards'],
    ['dark.muted', 'dark.bg', 'dark', 'Dates and captions'], ['dark.muted', 'dark.surface', 'dark', 'Captions on cards'],
    ['dark.link', 'dark.bg', 'dark', 'Links'], ['dark.link', 'dark.surface', 'dark', 'Links on cards']
  ];
  var LIMITS = { menu: 8, footer: 6, about: 400 };

  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); };
  var xmlText = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var xmlAttr = function (s) { return xmlText(s).replace(/"/g, '&quot;'); };
  var attr = function (tag, name) { var m = new RegExp('\\b' + name + '="([^"]*)"').exec(tag); return m ? m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : null; };

  // ---- Theme parsing
  function parseTheme(xml) {
    var skin = /<b:skin[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/b:skin>/.exec(xml);
    if (!skin) throw new Error('No <b:skin> block found');
    var vars = [], group = '', re = /<Group description="([^"]*)"|<Variable\b[^>]*\/>/g, m;
    while ((m = re.exec(skin[1]))) {
      if (m[1] != null) { group = m[1]; continue; }
      vars.push({ name: attr(m[0], 'name'), desc: attr(m[0], 'description'), type: attr(m[0], 'type'), def: attr(m[0], 'default'), min: attr(m[0], 'min'), max: attr(m[0], 'max'), group: group });
    }
    return { xml: xml, skin: skin[1], vars: vars };
  }
  function defaults(theme) {
    var o = {};
    theme.vars.forEach(function (v) { o[v.name] = v.def; });
    return o;
  }
  function skinCss(theme, values) {
    return theme.skin.replace(/\/\* Variable definitions[\s\S]*?\*\//, '').replace(/\$\(([a-zA-Z][\w.]*)\)/g, function (all, k) {
      return values && values[k] != null ? values[k] : (theme.vars.filter(function (v) { return v.name === k; })[0] || { def: all }).def;
    });
  }

  // ---- Colour helpers
  var hexOf = function (s) { var c = C.parse(s); return c ? C.hex(c) : null; };
  var hsl = function (h, s, l) { return C.hex(C.hslToRgb(h, s, l)); };
  function ratioOf(a, b) { var x = C.parse(a), y = C.parse(b); return x && y ? C.ratio(x, y) : 0; }

  // A complete light and dark palette from one brand colour: neutrals take a hint of the brand hue,
  // then every text pair is pushed to AA.
  function palette(brand) {
    var b = C.parse(brand);
    if (!b) return null;
    var t = C.rgbToHsl(b), h = t.h, s = t.s, cap = function (x) { return Math.min(s, x); };
    var white = { r: 255, g: 255, b: 255, a: 1 }, ink = C.ratio(white, b) >= C.ratio({ r: 0, g: 0, b: 0, a: 1 }, b) ? '#ffffff' : '#000000';
    var v = {
      'brand.color': C.hex(b), 'brand.ink': ink, 'link.color': C.hex(b),
      'page.bg': '#ffffff', 'surface.bg': hsl(h, cap(30), 97), 'text.color': hsl(h, cap(25), 10), 'muted.color': hsl(h, cap(12), 38), 'line.color': hsl(h, cap(15), 89),
      'dark.bg': hsl(h, cap(20), 7), 'dark.surface': hsl(h, cap(16), 11), 'dark.text': hsl(h, cap(20), 93), 'dark.muted': hsl(h, cap(10), 66), 'dark.line': hsl(h, cap(12), 20),
      'dark.link': C.hex(b)
    };
    return fixAll(v).values;
  }

  // ---- Accessibility guard
  function checks(values) {
    return PAIRS.map(function (p) {
      var r = ratioOf(values[p[0]], values[p[1]]);
      return { fg: p[0], bg: p[1], mode: p[2], label: p[3], fgHex: hexOf(values[p[0]]), bgHex: hexOf(values[p[1]]), ratio: r, text: C.show(r), pass: r >= FACTS.aa };
    });
  }
  // Fixes each failing pair by moving the text colour's lightness (hue kept); for button text it tries white or near
  // black first. The darker or lighter of the two backgrounds a colour sits on decides the target.
  function fixAll(values) {
    var v = {}, k, changed = [];
    for (k in values) v[k] = values[k];
    if (ratioOf(v['brand.ink'], v['brand.color']) < FACTS.aa) {
      var w = ratioOf('#ffffff', v['brand.color']), d = ratioOf('#000000', v['brand.color']);
      var best = w >= d ? '#ffffff' : '#000000';
      if (best !== hexOf(v['brand.ink'])) { v['brand.ink'] = best; changed.push('brand.ink'); }
      // Mid-tone brands (some purples, oranges) pass with neither: darken the brand just enough for white text.
      if (Math.max(w, d) < FACTS.aa) {
        var s0 = C.suggest(C.parse(v['brand.color']), C.parse('#ffffff'), FACTS.aa + 0.05);
        if (s0) { v['brand.color'] = s0.hex; v['brand.ink'] = '#ffffff'; changed.push('brand.color'); }
      }
    }
    PAIRS.forEach(function (p) {
      if (p[0] === 'brand.ink') return;
      var fg = C.parse(v[p[0]]), bg = C.parse(v[p[1]]);
      if (!fg || !bg || C.ratio(fg, bg) >= FACTS.aa) return;
      var s = C.suggest(fg, bg, FACTS.aa + 0.05);
      if (s) { v[p[0]] = s.hex; if (changed.indexOf(p[0]) < 0) changed.push(p[0]); }
    });
    return { values: v, changed: changed };
  }

  // ---- Fonts and sizes
  function fontValue(key, px, weight) {
    var f = FONTS.filter(function (x) { return x.key === key; })[0] || FONTS[0];
    return 'normal ' + (weight || 400) + ' ' + Math.round(px) + 'px ' + f.stack;
  }
  function fontKey(value) {
    var f = FONTS.filter(function (x) { return String(value).indexOf(x.stack) >= 0; })[0];
    return f ? f.key : 'system';
  }
  var fontPx = function (value) { var m = /(\d+)px/.exec(value || ''); return m ? +m[1] : 17; };

  // ---- Menu and footer links: "Label | URL" per line
  function safeUrl(u) {
    u = String(u || '').trim();
    if (/^(https?:\/\/|\/(?!\/)|#|mailto:)/i.test(u)) return u;
    if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(u)) return 'https://' + u;
    return null;
  }
  function parseLinks(text, max) {
    var out = [], bad = [];
    String(text || '').split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      var i = line.lastIndexOf('|'), label = (i < 0 ? '' : line.slice(0, i)).trim(), url = safeUrl(i < 0 ? line : line.slice(i + 1));
      if (!label || !url) { bad.push(line.trim()); return; }
      if (out.length < max) out.push({ label: label.slice(0, 60), url: url });
    });
    return { links: out, bad: bad };
  }

  // ---- XML output
  function setVariable(xml, name, value) {
    var re = new RegExp('<Variable name="' + name.replace(/\./g, '\\.') + '"[^>]*\\/>');
    var tag = re.exec(xml);
    if (!tag) throw new Error('Variable ' + name + ' not found');
    var next = tag[0].replace(/default="[^"]*"/, 'default="' + xmlAttr(value) + '"').replace(/value="[^"]*"/, 'value="' + xmlAttr(value) + '"');
    return xml.replace(tag[0], function () { return next; });
  }
  function setLinkList(xml, id, links) {
    var re = new RegExp("(<b:widget id='" + id + "'[^>]*>\\s*<b:widget-settings>)([\\s\\S]*?)(\\s*</b:widget-settings>)");
    var m = re.exec(xml);
    if (!m) throw new Error('Widget ' + id + ' not found');
    var pad = '\n' + /\n([ \t]*)<b:widget-setting/.exec(m[2])[1];
    var body = pad + "<b:widget-setting name='sorting'>NONE</b:widget-setting>" + links.map(function (l, i) {
      return pad + "<b:widget-setting name='text-" + i + "'>" + xmlText(l.label) + '</b:widget-setting>' + pad + "<b:widget-setting name='link-" + i + "'>" + xmlText(l.url) + '</b:widget-setting>';
    }).join('');
    return xml.replace(m[0], function () { return m[1] + body + m[3]; });
  }
  function setText(xml, id, text) {
    var re = new RegExp("(<b:widget id='" + id + "'[\\s\\S]*?<b:widget-setting name='content'>)([\\s\\S]*?)(</b:widget-setting>)");
    var m = re.exec(xml);
    if (!m) throw new Error('Widget ' + id + ' not found');
    return xml.replace(m[0], function () { return m[1] + xmlText(text) + m[3]; });
  }
  function build(xml, state) {
    var out = xml;
    Object.keys(state.values || {}).forEach(function (k) { out = setVariable(out, k, state.values[k]); });
    if (state.menu) out = setLinkList(out, 'LinkList1', state.menu);
    if (state.pages) out = setLinkList(out, 'LinkList2', state.pages);
    if (state.about != null && String(state.about).trim()) out = setText(out, 'Text1', String(state.about).trim().slice(0, LIMITS.about));
    var stamp = '  Customised with the Blogger Template Generator (https://tool.thebukitbesi.com/blogger-template-generator/)' + (state.date ? ' on ' + state.date : '') + '.\n';
    return out.replace(/(  Licence: CC BY 4\.0[^\n]*\n)/, function (l) { return l + stamp; });
  }

  // ---- Preview: the theme's real CSS with sample posts; no scripts run inside it (sandboxed iframe).
  var SAMPLE = {
    en: { home: 'Home', about: 'About', contact: 'Contact', search: 'Search', latest: 'Latest posts', popular: 'Popular posts', topics: 'Topics', older: 'Older posts →', aboutBlog: 'About this blog',
      posts: ['How to plan a monthly budget on a single income', 'Five free tools every Malaysian blogger should bookmark', 'Nasi lemak at home: a 30-minute recipe', 'Why your blog loads slowly on phones'],
      snippet: 'A short summary from the start of the post. The theme clamps it to three lines so every card keeps the same height.', date: 'November 7, 2026',
      post: 'Answer first: list your fixed costs, save on payday, then split what is left. ', link: 'Read the full guide', quote: 'A budget is a plan for money you already have.', h2: 'Step 1: list fixed costs', tags: ['Finance', 'Budget'] },
    ms: { home: 'Utama', about: 'Tentang', contact: 'Hubungi', search: 'Cari', latest: 'Entri terkini', popular: 'Entri popular', topics: 'Topik', older: 'Entri lama →', aboutBlog: 'Tentang blog ini',
      posts: ['Cara merancang bajet bulanan dengan satu pendapatan', 'Lima alat percuma untuk blogger Malaysia', 'Nasi lemak di rumah: resipi 30 minit', 'Kenapa blog anda lambat di telefon'],
      snippet: 'Ringkasan pendek dari awal entri. Tema ini mengehadkannya kepada tiga baris supaya setiap kad sama tinggi.', date: '7 November 2026',
      post: 'Jawapan dahulu: senaraikan kos tetap, simpan pada hari gaji, kemudian bahagikan bakinya. ', link: 'Baca panduan penuh', quote: 'Bajet ialah rancangan untuk wang yang sudah ada.', h2: 'Langkah 1: senaraikan kos tetap', tags: ['Kewangan', 'Bajet'] }
  };
  function thumb(n) {
    return 'data:image/svg+xml,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'><rect width='16' height='9' fill='hsl(" + (n * 53 % 360) + " 45% 62%)'/></svg>");
  }
  // Markup matches what TBB Lite renders after its menu script runs (html.tbb-js, menu button), since the sandboxed
  // preview runs no scripts.
  function previewDoc(css, opts) {
    opts = opts || {};
    var T = SAMPLE[opts.lang === 'ms' ? 'ms' : 'en'], scheme = opts.dark ? 'dark' : 'light', view = opts.view === 'post' ? 'post' : 'home';
    var menu = (opts.menu && opts.menu.length ? opts.menu : [{ label: T.home }, { label: T.about }, { label: T.contact }]).map(function (l) { return '<li><a href="#">' + esc(l.label) + '</a></li>'; }).join('');
    var title = esc(opts.title || 'My Blog');
    var cards = T.posts.map(function (p, i) {
      return '<article class="tbb-card">' + (i === 2 ? '' : '<a class="tbb-card__thumb" href="#"><img alt="" src="' + thumb(i + 1) + '" width="640" height="360"></a>') +
        '<div class="tbb-card__body"><h2 class="tbb-card__title"><a href="#">' + esc(p) + '</a></h2><p class="tbb-meta"><time>' + T.date + '</time></p><p class="tbb-card__snippet">' + esc(T.snippet) + '</p></div></article>';
    }).join('');
    var main = view === 'post'
      ? '<article class="tbb-post"><header class="tbb-post__header"><nav class="tbb-crumbs"><ol><li><a href="#">' + T.home + '</a></li><li><a href="#">' + T.tags[0] + '</a></li></ol></nav><h1>' + esc(T.posts[0]) + '</h1><p class="tbb-meta"><span>Admin</span><time>' + T.date + '</time></p></header>' +
        '<div class="tbb-post__body"><p>' + T.post + '<a href="#">' + T.link + '</a>.</p><img alt="" src="' + thumb(7) + '" width="1200" height="675"><h2>' + T.h2 + '</h2><p>' + T.post + T.post + '</p><blockquote>' + T.quote + '</blockquote></div>' +
        '<ul class="tbb-tags">' + T.tags.map(function (t) { return '<li><a href="#">' + t + '</a></li>'; }).join('') + '</ul></article>'
      : '<h2 class="tbb-heading">' + T.latest + '</h2><div class="tbb-grid">' + cards + '</div><nav class="tbb-pager"><a class="tbb-btn tbb-pager__next" href="#">' + T.older + '</a></nav>';
    var side = '<aside class="tbb-side"><div class="widget"><h2>' + T.popular + '</h2><ul class="tbb-popular">' + T.posts.slice(0, 3).map(function (p, i) { return '<li><img alt="" src="' + thumb(i + 4) + '" width="72" height="72"><a href="#">' + esc(p) + '</a></li>'; }).join('') +
      '</ul></div><div class="widget"><h2>' + T.topics + '</h2><div class="tbb-labels"><a href="#">' + T.tags[0] + '</a><a href="#">' + T.tags[1] + '</a><a href="#">SEO</a></div><p>' + T.post + '<a href="#">' + T.link + '</a></p></div></aside>';
    return '<!DOCTYPE html><html class="tbb-js" lang="' + (opts.lang === 'ms' ? 'ms' : 'en') + '" style="color-scheme:' + scheme + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="' + scheme + '">' +
      '<style>' + css + 'a{cursor:default}</style></head><body><header class="tbb-header"><div class="tbb-wrap tbb-header__bar"><a class="tbb-brand" href="#"><span class="tbb-brand__title">' + title + '</span></a>' +
      '<button class="tbb-menu-btn" type="button" aria-label="Menu"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><div class="tbb-menu"><nav><ul>' + menu + '</ul></nav></div><form class="tbb-search"><input type="search" aria-label="' + T.search + '" placeholder="' + T.search + '…"><button type="button">' + T.search + '</button></form></div></header>' +
      '<div class="tbb-wrap"><main class="tbb-main"><div class="tbb-content">' + main + '</div>' + side + '</main></div>' +
      '<footer class="tbb-footer"><div class="tbb-wrap"><div class="tbb-footer__bar"><span>© ' + title + '</span><span>Theme: <a href="#">TBB Lite</a></span></div></div></footer></body></html>';
  }
  // The preview follows the chosen mode, not the visitor's device: dark mode swaps the variable set before rendering.
  function previewCss(theme, values, dark) {
    var v = {}, k;
    for (k in values) v[k] = values[k];
    if (dark) ['bg', 'surface', 'text', 'muted', 'line', 'link'].forEach(function (n) {
      var light = { bg: 'page.bg', surface: 'surface.bg', text: 'text.color', muted: 'muted.color', line: 'line.color', link: 'link.color' }[n];
      v[light] = values['dark.' + n];
    });
    return skinCss(theme, v).replace(/@media \(prefers-color-scheme:dark\)\{[\s\S]*?\}\s*\}/, '');
  }

  // A typical older theme head, used as the page's worked example and in the tests.
  var LEGACY_SAMPLE = "<?xml version=\"1.0\"?><html b:version='2' xmlns:b='http://www.google.com/2005/gml/b'><head>\n" +
    "<b:include data='blog' name='all-head-content'/><link rel='canonical' href='x'/>\n" +
    "<script src='https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js'></script><script src='https://example.com/slider.js'></script>\n" +
    "<link href='https://fonts.googleapis.com/css2?family=Poppins' rel='stylesheet'/><link href='https://use.fontawesome.com/releases/v6/css/all.css' rel='stylesheet'/>\n" +
    "<b:skin><![CDATA[body{}]]></b:skin></head><body></body></html>";

  // ---- Theme audit: speed and SEO checks on any Blogger theme XML. Weights add up to 100.
  var bytes = function (s) { var n = 0, i, c; for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); n += c < 0x80 ? 1 : c < 0x800 ? 2 : (c >= 0xd800 && c < 0xdc00) ? (i++, 4) : 3; } return n; };
  function audit(xml, opts) {
    opts = opts || {};
    var raw = String(xml || '');
    var x = raw.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'"), head = (x.split(/<\/head>/i)[0] || ''), items = [];
    var count = function (re, s) { return ((s == null ? x : s).match(re) || []).length; };
    var add = function (id, weight, status, value, fix) { items.push({ id: id, weight: weight, status: status, value: value, fix: fix || '' }); };
    var size = bytes(raw);
    if (!/<b:skin\b/.test(x) || !/xmlns:b=/.test(x)) return { valid: false, error: 'This does not look like a Blogger theme: no xmlns:b namespace or <b:skin> block.', items: [], score: 0, size: size };

    add('size', 10, size <= 100000 ? 'pass' : size <= 200000 ? 'warn' : 'fail', size,
      'Move rarely changed CSS and JavaScript out of the theme into cached files, and delete unused widget styles and old includables.');
    var scripts = head.match(/<script\b[^>]*\bsrc=[^>]*>/gi) || [];
    var blocking = scripts.filter(function (s) { return !/\b(async|defer)\b/i.test(s) && !/type=['"](application\/ld\+json|text\/template)/i.test(s); });
    add('blocking', 15, blocking.length === 0 ? 'pass' : blocking.length === 1 ? 'warn' : 'fail', blocking.length,
      'Add defer to external scripts in <head>, or move them to just before </body>. Each blocking script delays the first paint.');
    var jq = /jquery(\.min)?(-[\d.]+)?\.js|code\.jquery\.com|ajax\.googleapis\.com\/ajax\/libs\/jquery/i.test(x);
    add('jquery', 10, jq ? 'fail' : 'pass', jq, 'Replace jQuery with plain JavaScript (document.querySelector, fetch, classList). It is about 30 KB of script most themes barely use.');
    var icons = /font-?awesome|fontawesome|icomoon|material-?icons|ionicons/i.test(x);
    add('iconfont', 5, icons ? 'warn' : 'pass', icons, 'Swap the icon font for a few inline SVG icons; an icon font downloads hundreds of icons to show a handful.');
    var css = (head.match(/<link\b[^>]*\bstylesheet\b[^>]*>/gi) || []).length;
    var gfonts = /fonts\.googleapis\.com/i.test(x);
    add('css', 10, css <= 1 && !gfonts ? 'pass' : css <= 2 ? 'warn' : 'fail', css,
      'Each external stylesheet blocks rendering. Inline the critical CSS in <b:skin>, use system fonts or font-display: swap, and drop unused libraries.');
    // Blogger keeps one tag per b:if branch, so several tags can still mean one per page. Only all-head-content plus a
    // hand-written tag is a certain duplicate: that include always prints its own canonical and description.
    var allHead = count(/<b:include[^>]*name=['"]all-head-content['"]/g) > 0;
    var canon = count(/rel=['"]canonical['"]/g), desc = count(/name=['"]description['"]/g);
    var tagStatus = function (n, missing) { return allHead && n > 0 ? 'fail' : n + (allHead ? 1 : 0) === 0 ? missing : n > 1 ? 'warn' : 'pass'; };
    add('canonical', 10, tagStatus(canon, 'fail'), canon + (allHead ? 1 : 0),
      allHead && canon ? 'Remove the hand-written canonical tag: the all-head-content include already prints one on every page.'
        : canon + (allHead ? 1 : 0) === 0 ? 'Add <link expr:href=\'data:view.url.canonical\' rel=\'canonical\'/> to <head>.'
        : 'Several canonical tags: make sure each sits in its own b:if branch so only one prints per page.');
    add('description', 5, tagStatus(desc, 'fail'), desc + (allHead ? 1 : 0),
      allHead && desc ? 'Remove the hand-written meta description, or the all-head-content include: together they print two.'
        : desc + (allHead ? 1 : 0) === 0 ? 'Output data:view.description in <meta name=\'description\'> so search snippets use your post summary.'
        : 'Several meta descriptions: make sure each sits in its own b:if branch so only one prints per page.');
    var viewport = /name=['"]viewport['"]/.test(x) || /b:responsive=['"]true['"]/.test(x);
    add('viewport', 10, viewport ? 'pass' : 'fail', viewport, 'Add <meta content=\'width=device-width, initial-scale=1\' name=\'viewport\'/>: without it phones show a zoomed-out desktop page.');
    var ld = (x.match(/"@type"\s*:\s*"(BlogPosting|Article|NewsArticle)"/g) || []).length;
    add('schema', 5, ld === 1 ? 'pass' : 'warn', ld,
      ld === 0 ? 'Add one BlogPosting JSON-LD block on post pages (headline, dates, author, image).' : 'Several BlogPosting or Article blocks: make sure only one prints on each post, or rich results get mixed signals.');
    var noindex = /noindex/i.test(x);
    add('noindex', 5, noindex ? 'pass' : 'warn', noindex, 'Mark search and label result pages noindex, follow so Google indexes your posts, not thin lists of them.');
    var lazy = /loading=['"]lazy['"]/i.test(x);
    add('lazy', 5, lazy ? 'pass' : 'warn', lazy, 'Add loading=\'lazy\' to thumbnails below the fold (never to the first image, which is usually the LCP element).');
    var v3 = /b:layoutsVersion=['"]3['"]/.test(x);
    add('layouts', 5, v3 ? 'pass' : 'warn', v3, 'The theme uses Blogger\'s older layout engine. Themes on layouts version 3 get data:view, resizeImage and lighter default widgets.');
    var nocss = /b:css=['"]false['"]/.test(x);
    add('bcss', 5, nocss ? 'pass' : 'warn', nocss, 'Set b:css=\'false\' on <html> once your theme styles every widget, so Blogger stops adding its own default widget CSS.');

    var score = items.reduce(function (t, i) { return t + (i.status === 'pass' ? i.weight : i.status === 'warn' ? i.weight / 2 : 0); }, 0);
    var hosts = {};
    (x.match(/\b(?:src|href)=['"](?:https?:)?\/\/([a-z0-9.-]+)/gi) || []).forEach(function (s) { var h = /\/\/([a-z0-9.-]+)/i.exec(s)[1].toLowerCase(); hosts[h] = (hosts[h] || 0) + 1; });
    var inlineCss = ((x.match(/<b:skin[^>]*>([\s\S]*?)<\/b:skin>/) || [])[1] || '');
    var inlineJs = (x.match(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi) || []).join('');
    return {
      valid: opts.wellFormed !== false, error: opts.wellFormed === false ? opts.error || 'The XML is not well-formed, so Blogger will refuse to save it.' : '',
      score: Math.round(score), grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F',
      items: items, size: size, inlineCss: bytes(inlineCss), inlineJs: bytes(inlineJs),
      hosts: Object.keys(hosts).sort(function (a, b) { return hosts[b] - hosts[a]; }).map(function (h) { return [h, hosts[h]]; }),
      widgets: count(/<b:widget\b/g), sections: count(/<b:section\b/g)
    };
  }

  // ---- Views (HTML strings shared by the build-time render and the UI)
  var TEXT = {
    en: { pass: 'Pass', fail: 'Fail', warn: 'Improve', light: 'Light', dark: 'Dark', ratio: 'Ratio', fixed: 'Fixed', score: 'Speed and SEO score', kb: 'KB',
      checks: { size: 'Theme file size', blocking: 'Render-blocking scripts in <head>', jquery: 'jQuery', iconfont: 'Icon font', css: 'External stylesheets in <head>', canonical: 'Canonical links', description: 'Meta descriptions', viewport: 'Mobile viewport', schema: 'Article structured data', noindex: 'Thin pages kept out of search', lazy: 'Lazy-loaded images', layouts: 'Blogger layouts version 3', bcss: "Blogger's default widget CSS off" },
      yes: 'Yes', no: 'No', none: 'None', allPass: 'All 13 text pairs pass WCAG AA in both modes.', fails: function (n) { return n + ' of 13 text pairs fail WCAG AA (4.5:1). Use “Fix contrast” to repair them, keeping each hue.'; } },
    ms: { pass: 'Lulus', fail: 'Gagal', warn: 'Perbaiki', light: 'Cerah', dark: 'Gelap', ratio: 'Nisbah', fixed: 'Dibaiki', score: 'Skor kelajuan dan SEO', kb: 'KB',
      checks: { size: 'Saiz fail tema', blocking: 'Skrip yang menyekat paparan dalam <head>', jquery: 'jQuery', iconfont: 'Fon ikon', css: 'Helaian gaya luaran dalam <head>', canonical: 'Pautan kanonik', description: 'Meta description', viewport: 'Viewport mudah alih', schema: 'Data berstruktur artikel', noindex: 'Halaman nipis tidak diindeks', lazy: 'Imej lazy-load', layouts: 'Blogger layouts versi 3', bcss: 'CSS widget lalai Blogger dimatikan' },
      yes: 'Ya', no: 'Tidak', none: 'Tiada', allPass: 'Kesemua 13 pasangan teks lulus WCAG AA dalam kedua-dua mod.', fails: function (n) { return n + ' daripada 13 pasangan teks gagal WCAG AA (4.5:1). Tekan “Baiki kontras” untuk membaikinya tanpa mengubah warna asas.'; } }
  };
  var LABELS_MS = { 'Body text': 'Teks utama', 'Text on cards': 'Teks pada kad', 'Dates and captions': 'Tarikh dan kapsyen', 'Captions on cards': 'Kapsyen pada kad', 'Links': 'Pautan', 'Links on cards': 'Pautan pada kad', 'Button text': 'Teks butang' };
  function checksHtml(rows, lang) {
    var T = TEXT[lang === 'ms' ? 'ms' : 'en'];
    return rows.map(function (r) {
      var label = lang === 'ms' ? LABELS_MS[r.label] || r.label : r.label;
      return '<tr><th scope="row">' + esc(label) + '</th><td>' + (r.mode === 'dark' ? T.dark : T.light) + '</td><td><span class="bt-pair" style="color:' + r.fgHex + ';background:' + r.bgHex + '">Aa</span> <code>' + r.fgHex + '</code> / <code>' + r.bgHex + '</code></td><td>' + r.text + ':1</td><td class="' + (r.pass ? 'rb-yes' : 'rb-no') + '">' + (r.pass ? T.pass : T.fail) + '</td></tr>';
    }).join('');
  }
  function checksSummary(rows, lang) {
    var T = TEXT[lang === 'ms' ? 'ms' : 'en'], n = rows.filter(function (r) { return !r.pass; }).length;
    return n ? T.fails(n) : T.allPass;
  }
  function auditValue(i, lang) {
    var T = TEXT[lang === 'ms' ? 'ms' : 'en'];
    if (i.id === 'size') return (i.value / 1024).toFixed(1) + ' ' + T.kb;
    if (typeof i.value === 'boolean') return i.value ? T.yes : T.no;
    return i.value === 0 ? T.none : String(i.value);
  }
  function auditHtml(r, lang) {
    var T = TEXT[lang === 'ms' ? 'ms' : 'en'];
    if (!r || !r.items.length) return '<p class="help">' + esc(r && r.error || '') + '</p>';
    var label = { pass: T.pass, warn: T.warn, fail: T.fail }, cls = { pass: 'rb-yes', warn: 'rb-warn', fail: 'rb-no' };
    return (r.error ? '<p class="callout">' + esc(r.error) + '</p>' : '') +
      '<p class="bt-score"><b>' + r.score + '</b>/100 <span>' + T.score + ' · ' + r.grade + '</span></p>' +
      '<div class="table-wrap"><table class="data text"><tbody>' + r.items.map(function (i) {
        return '<tr><th scope="row">' + esc(T.checks[i.id]) + '</th><td>' + esc(auditValue(i, lang)) + '</td><td class="' + cls[i.status] + '">' + label[i.status] + '</td><td>' + (i.status === 'pass' ? '' : esc(i.fix)) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  var api = {
    FACTS: FACTS, FONTS: FONTS, PAIRS: PAIRS, LIMITS: LIMITS, TEXT: TEXT, LEGACY_SAMPLE: LEGACY_SAMPLE,
    parseTheme: parseTheme, defaults: defaults, skinCss: skinCss, palette: palette, checks: checks, fixAll: fixAll, ratioOf: ratioOf,
    fontValue: fontValue, fontKey: fontKey, fontPx: fontPx, safeUrl: safeUrl, parseLinks: parseLinks, build: build,
    previewDoc: previewDoc, previewCss: previewCss, audit: audit, bytes: bytes,
    views: { checksHtml: checksHtml, checksSummary: checksSummary, auditHtml: auditHtml, esc: esc }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBBlogger = api;
})(typeof self !== 'undefined' ? self : this);
