/* Meta Tag Checker core. Reads the head of a page's HTML (pasted from View Source) without a browser: title, meta
   description, robots, viewport, canonical, hreflang, Open Graph, Twitter cards, JSON-LD, headings and image alt text,
   then checks them against Google Search Central guidance. Length ranges are common practice, not Google limits:
   Google truncates titles and snippets to fit the device. UMD: module.exports in Node, window.TBBMeta in the browser. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-19', title: [30, 60], description: [70, 160] };
  var ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
  var decode = function (s) {
    return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function (m, e) {
      if (e[0] === '#') { var n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n ? String.fromCodePoint(n) : m; }
      return ENT[e.toLowerCase()] != null ? ENT[e.toLowerCase()] : m;
    });
  };
  var clean = function (s) { return decode(String(s).replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim(); };

  function attrs(tag) {
    var o = {}, re = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g, m, body = tag.replace(/^<\s*[\w-]+/, '').replace(/\/?>$/, '');
    while ((m = re.exec(body))) o[m[1].toLowerCase()] = decode(m[2] != null ? m[2] : m[3] != null ? m[3] : m[4] != null ? m[4] : '');
    return o;
  }
  function tags(html, name) { return (html.match(new RegExp('<' + name + '\\b[^>]*>', 'gi')) || []).map(attrs); }

  function extract(html) {
    var h = String(html || '').replace(/<!--[\s\S]*?-->/g, '');
    var noScript = h.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, function (m) { return /application\/ld\+json/i.test(m) ? m : ''; });
    var titles = (noScript.match(/<title\b[^>]*>([\s\S]*?)<\/title>/gi) || []).map(function (t) { return clean(t.replace(/^<title\b[^>]*>|<\/title>$/gi, '')); });
    var metas = tags(noScript, 'meta'), links = tags(noScript, 'link');
    var meta = function (k) { var x = metas.filter(function (m) { return (m.name || m.property || '').toLowerCase() === k; })[0]; return x ? x.content || '' : null; };
    var htmlTag = (noScript.match(/<html\b[^>]*>/i) || [''])[0];
    var heads = function (n) { return (noScript.match(new RegExp('<h' + n + '\\b[^>]*>[\\s\\S]*?<\\/h' + n + '>', 'gi')) || []).map(clean); };
    var imgs = tags(noScript, 'img');
    var ld = (h.match(/<script\b[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || []).map(function (s) {
      var body = s.replace(/^<script\b[^>]*>|<\/script>$/gi, '').trim();
      try {
        var j = JSON.parse(body), types = [];
        (function walk(x) { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { if (x['@type']) types = types.concat(x['@type']); if (x['@graph']) walk(x['@graph']); } })(j);
        return { ok: true, types: types };
      } catch (e) { return { ok: false, error: e.message }; }
    });
    return {
      titles: titles, title: titles[0] || '', description: meta('description'), robots: meta('robots'), googlebot: meta('googlebot'), viewport: meta('viewport'),
      charset: metas.some(function (m) { return m.charset || /charset/i.test(m.content || '') && (m['http-equiv'] || '').toLowerCase() === 'content-type'; }),
      lang: attrs(htmlTag).lang || '', canonical: (links.filter(function (l) { return (l.rel || '').toLowerCase() === 'canonical'; })[0] || {}).href || '',
      hreflang: links.filter(function (l) { return (l.rel || '').toLowerCase() === 'alternate' && l.hreflang; }).map(function (l) { return { lang: l.hreflang, href: l.href }; }),
      icon: links.some(function (l) { return /(^|\s)icon(\s|$)/i.test(l.rel || ''); }),
      og: { title: meta('og:title'), description: meta('og:description'), image: meta('og:image'), url: meta('og:url'), type: meta('og:type'), site: meta('og:site_name') },
      twitter: { card: meta('twitter:card'), title: meta('twitter:title'), image: meta('twitter:image') },
      h1: heads(1), h2: heads(2).length, images: imgs.length, noAlt: imgs.filter(function (i) { return !('alt' in i); }).length, ld: ld
    };
  }

  // Each check: { id, status: pass | warn | fail | info, label, detail }.
  function check(info, opts) {
    opts = opts || {};
    var out = [], add = function (id, status, label, detail) { out.push({ id: id, status: status, label: label, detail: detail || '' }); };
    var tl = Array.from(info.title || '').length, T = FACTS.title, D = FACTS.description;
    if (!info.title) add('title', 'fail', 'Title tag', 'No <title>. Every page needs a unique, descriptive title.');
    else add('title', tl < T[0] || tl > T[1] ? 'warn' : 'pass', 'Title tag', tl + ' characters' + (tl > T[1] ? ': may be cut off in results; put the main words first.' : tl < T[0] ? ': short; add a few descriptive words.' : '.'));
    if (info.titles && info.titles.length > 1) add('titles', 'warn', 'Several title tags', info.titles.length + ' <title> elements; keep one.');
    var d = info.description, dl = d == null ? 0 : Array.from(d).length;
    if (d == null) add('description', 'warn', 'Meta description', 'Missing. Google will build a snippet from the page text.');
    else add('description', dl < D[0] || dl > D[1] ? 'warn' : 'pass', 'Meta description', dl + ' characters' + (dl > D[1] ? ': will usually be cut off.' : dl < D[0] ? ': short; summarise the page in a sentence or two.' : '.'));
    var robots = ((info.robots || '') + ',' + (info.googlebot || '')).toLowerCase();
    if (/noindex/.test(robots)) add('robots', 'fail', 'Robots meta', 'noindex: this page will not appear in Google.');
    else if (/nofollow|nosnippet|max-snippet:0/.test(robots)) add('robots', 'warn', 'Robots meta', info.robots || info.googlebot);
    else add('robots', 'pass', 'Robots meta', info.robots ? info.robots : 'Not set: the page can be indexed (default).');
    if (!info.canonical) add('canonical', 'warn', 'Canonical URL', 'Missing. Add <link rel="canonical"> with the preferred address.');
    else add('canonical', /^https?:\/\//i.test(info.canonical) ? 'pass' : 'warn', 'Canonical URL', info.canonical + (/^https?:\/\//i.test(info.canonical) ? '' : ': use a full URL.'));
    add('viewport', info.viewport ? 'pass' : 'fail', 'Viewport', info.viewport || 'Missing: the page will not fit phones.');
    add('lang', info.lang ? 'pass' : 'warn', 'Language', info.lang ? 'lang="' + info.lang + '"' : 'Add lang to <html>, e.g. lang="ms" or lang="en".');
    add('charset', info.charset ? 'pass' : 'warn', 'Character set', info.charset ? 'Declared.' : 'Add <meta charset="utf-8"> as the first tag in <head>.');
    if (!info.h1.length) add('h1', 'warn', 'H1 heading', 'No <h1>. Give the page one clear main heading.');
    else add('h1', info.h1.length === 1 ? 'pass' : 'info', 'H1 heading', info.h1.length === 1 ? info.h1[0] : info.h1.length + ' H1 headings. Allowed, but one main heading is clearer.');
    if (info.images) add('alt', info.noAlt ? 'warn' : 'pass', 'Image alt text', info.noAlt ? info.noAlt + ' of ' + info.images + ' images have no alt attribute.' : 'All ' + info.images + ' images have alt.');
    var og = info.og, ogMissing = ['title', 'type', 'image', 'url'].filter(function (k) { return !og[k]; });
    add('og', ogMissing.length ? 'warn' : 'pass', 'Open Graph', ogMissing.length ? 'Missing og:' + ogMissing.join(', og:') + ' (needed for Facebook and WhatsApp previews).' : 'og:title, og:type, og:image and og:url set.');
    if (og.image && !/^https?:\/\//i.test(og.image)) add('ogimg', 'warn', 'og:image', 'Use a full URL starting with https://.');
    add('twitter', info.twitter.card ? 'pass' : 'info', 'Twitter / X card', info.twitter.card ? info.twitter.card : 'No twitter:card; X falls back to Open Graph.');
    if (info.hreflang.length) add('hreflang', 'info', 'Language versions', info.hreflang.map(function (x) { return x.lang; }).join(', '));
    if (info.ld.length) {
      var bad = info.ld.filter(function (x) { return !x.ok; });
      add('jsonld', bad.length ? 'fail' : 'pass', 'Structured data', bad.length ? bad.length + ' JSON-LD block(s) are invalid JSON: ' + bad[0].error : info.ld.reduce(function (a, x) { return a.concat(x.types); }, []).join(', ') || 'JSON-LD found.');
    } else add('jsonld', 'info', 'Structured data', 'No JSON-LD. Add schema markup for rich results.');
    add('icon', info.icon ? 'pass' : 'info', 'Favicon', info.icon ? 'Declared.' : 'No <link rel="icon">; Google shows a favicon next to results.');
    var kw = String(opts.keyword || '').trim().toLowerCase();
    if (kw) {
      var where = [['title', info.title], ['description', info.description], ['H1', info.h1.join(' ')], ['URL', String(info.canonical || opts.url || '').replace(/[-_/]/g, ' ')]]
        .filter(function (x) { return String(x[1] || '').toLowerCase().indexOf(kw) >= 0; }).map(function (x) { return x[0]; });
      add('keyword', where.length >= 2 ? 'pass' : 'warn', 'Keyword "' + opts.keyword.trim() + '"', where.length ? 'Found in ' + where.join(', ') + '.' : 'Not found in the title, description, H1 or URL.');
    }
    return out;
  }
  function score(list) {
    var w = { pass: 1, info: 1, warn: 0.5, fail: 0 }, n = list.filter(function (c) { return c.status !== 'info'; });
    return n.length ? Math.round(n.reduce(function (a, c) { return a + w[c.status]; }, 0) / n.length * 100) : 0;
  }

  // Search-result style breadcrumb from a URL: example.com › blog › post
  function crumb(url) {
    var m = /^https?:\/\/(?:www\.)?([^/?#]+)([^?#]*)/i.exec(String(url || '').trim());
    if (!m) return '';
    return [m[1]].concat(m[2].split('/').filter(Boolean).map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } })).join(' › ');
  }

  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  function checksHtml(list) {
    var icon = { pass: '✓', warn: '!', fail: '✗', info: 'i' };
    return '<ul class="mc-checks">' + list.map(function (c) { return '<li class="mc-' + c.status + '"><span aria-hidden="true">' + icon[c.status] + '</span><strong>' + esc(c.label) + '</strong> <span class="sr-only">(' + c.status + ')</span><small>' + esc(c.detail) + '</small></li>'; }).join('') + '</ul>';
  }
  function serpHtml(o) {
    return '<div class="mc-serp"><p class="mc-site"><span class="mc-fav" aria-hidden="true">' + esc((o.site || crumb(o.url) || '?').charAt(0).toUpperCase()) + '</span><span><b>' + esc(o.site || (crumb(o.url).split(' › ')[0] || 'example.com')) + '</b><small>' + esc(crumb(o.url) || 'example.com') + '</small></span></p>' +
      '<p class="mc-t">' + esc(o.title || 'Add a title') + '</p><p class="mc-d">' + esc(o.description || 'Google will show text from the page because there is no meta description.') + '</p></div>';
  }

  var api = { FACTS: FACTS, extract: extract, check: check, score: score, crumb: crumb, attrs: attrs, views: { checksHtml: checksHtml, serpHtml: serpHtml, esc: esc } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBMeta = api;
})(typeof self !== 'undefined' ? self : this);
