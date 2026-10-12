/* JavaScript minifier core shared by the page, its Web Worker, the build and the tests.
   Turns the page's options into Terser and javascript-obfuscator settings and runs them. Neither library
   is bundled here: the worker loads them from /assets/vendor/ on first use, the build and tests load the
   same files into a VM, so the page, its examples and the tests all run identical code.
   Note: the build strips comment blocks from bundles, so no string or regex here contains the comment delimiters. */
(function (root) {
  'use strict';

  var VENDOR = { terser: '/assets/vendor/terser-5.51.2.js', obfuscator: '/assets/vendor/javascript-obfuscator-5.9.0.js' };
  var DEFAULTS = {
    mode: 'minify', ecma: 2015, passes: 2, mangle: true, toplevel: false, module: false,
    dropConsole: false, dropDebugger: true, keepNames: false, comments: true, sourceMap: false,
    level: 'low', domains: '', fileName: 'script', seed: 0
  };
  var LEVELS = { low: 'low-obfuscation', medium: 'medium-obfuscation', high: 'high-obfuscation' };

  function options(o) {
    var r = {};
    for (var k in DEFAULTS) r[k] = o && o[k] !== undefined ? o[k] : DEFAULTS[k];
    r.ecma = [5, 2015, 2020].indexOf(Number(r.ecma)) >= 0 ? Number(r.ecma) : DEFAULTS.ecma;
    r.passes = Math.min(3, Math.max(1, Number(r.passes) || DEFAULTS.passes));
    if (!LEVELS[r.level]) r.level = DEFAULTS.level;
    return r;
  }

  function terserOptions(o) {
    if (o.mode === 'beautify') {
      return { compress: false, mangle: false, module: o.module, format: { beautify: true, comments: 'all', indent_level: 2, ecma: o.ecma } };
    }
    var t = {
      ecma: o.ecma, module: o.module, toplevel: o.toplevel,
      keep_classnames: o.keepNames, keep_fnames: o.keepNames,
      compress: { passes: o.passes, drop_console: o.dropConsole, drop_debugger: o.dropDebugger },
      mangle: o.mangle ? { toplevel: o.toplevel || o.module } : false,
      // "some" keeps comments that start with "!" or contain @license, @preserve or @cc_on.
      format: { comments: o.comments ? 'some' : false, ecma: o.ecma }
    };
    if (o.sourceMap) t.sourceMap = { filename: o.fileName + '.min.js', url: o.fileName + '.min.js.map' };
    return t;
  }

  function domainList(s) {
    return String(s || '').split(/[\s,]+/).map(function (d) {
      return d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[/:].*$/, '');
    }).filter(function (d) { return /^\.?[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d); });
  }

  function obfuscatorOptions(o) {
    var domains = domainList(o.domains);
    return {
      // seed 0 is random; the build passes a fixed seed so published size figures are reproducible.
      optionsPreset: LEVELS[o.level], target: 'browser', sourceMap: false, seed: Number(o.seed) || 0,
      // Every preset silences console.* by default; only do that when the user asked to remove console calls.
      disableConsoleOutput: o.dropConsole,
      renameGlobals: o.toplevel, domainLock: domains, domainLockRedirectUrl: 'about:blank'
    };
  }

  // Licence comments survive minification; the obfuscator drops all comments, so they are copied back on top.
  function licenceComments(code) {
    var out = [], re = /\/\*([\s\S]*?)\*\//g, m;
    while ((m = re.exec(code))) if (m[1].charAt(0) === '!' || /@(license|preserve)\b/.test(m[1])) out.push(m[0]);
    return out.join('\n');
  }

  // Terser errors carry line and col; obfuscator errors read "ERROR at line N: message (N:C)" plus a code excerpt.
  function errorInfo(e) {
    var msg = String(e && e.message || e).split('\n')[0];
    var line = e && e.line, col = e && e.col;
    var m = /\((\d+):(\d+)\)\s*$/.exec(msg);
    if (!line && m) { line = Number(m[1]); col = Number(m[2]); }
    msg = msg.replace(/^ERROR(?: at line \d+)?:\s*/, '').replace(/\s*\(\d+:\d+\)\s*$/, '');
    return { message: msg, line: line || 0, col: col || 0 };
  }

  // Character offset of a 1-based line and 0-based column, for selecting the error in the editor.
  function offset(code, line, col) {
    var lines = String(code).split('\n'), pos = 0;
    for (var i = 0; i < line - 1 && i < lines.length; i++) pos += lines[i].length + 1;
    return Math.min(code.length, pos + (col || 0));
  }

  function run(libs, code, opts) {
    var o = options(opts), started = Date.now();
    var done = function (r) { r.ms = Date.now() - started; return r; };
    if (!String(code).trim()) return Promise.resolve(done({ code: '', map: '' }));
    try {
      if (o.mode === 'obfuscate') {
        var out = libs.obfuscator.obfuscate(code, obfuscatorOptions(o)).getObfuscatedCode();
        var keep = o.comments ? licenceComments(code) : '';
        return Promise.resolve(done({ code: (keep ? keep + '\n' : '') + out, map: '' }));
      }
      return libs.terser.minify(code, terserOptions(o)).then(function (r) {
        return done({ code: r.code || '', map: typeof r.map === 'string' ? r.map : '' });
      }, function (e) { return done({ code: '', map: '', error: errorInfo(e) }); });
    } catch (e) {
      return Promise.resolve(done({ code: '', map: '', error: errorInfo(e) }));
    }
  }

  // Blogger themes are XML: a raw "<" or "&&" breaks them, so inline scripts go inside a CDATA section.
  function bloggerWrap(code) {
    return { code: '<script>//<![CDATA[\n' + code + '\n//]]></script>', unsafe: code.indexOf(']]>') >= 0 };
  }

  var bytes = function (s) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s).length;
    return unescape(encodeURIComponent(s)).length;
  };
  var saving = function (before, after) {
    var a = bytes(before), b = bytes(after);
    return { before: a, after: b, saved: a - b, percent: a ? Math.round((a - b) / a * 1000) / 10 : 0 };
  };

  var SAMPLE = [
    '/' + '*! Reading time widget v1.0 | MIT *' + '/',
    '// Estimate reading time for a blog post and show it above the post.',
    'function estimateReadingTime(text, wordsPerMinute) {',
    '  const words = text.trim().split(/\\s+/).filter(Boolean).length;',
    '  const minutes = Math.max(1, Math.round(words / (wordsPerMinute || 200)));',
    '  return { words: words, minutes: minutes };',
    '}',
    '',
    'function showReadingTime(selector) {',
    '  const post = document.querySelector(selector);',
    '  if (!post) {',
    "    console.warn('Post body not found: ' + selector);",
    '    return;',
    '  }',
    '  debugger;',
    '  const result = estimateReadingTime(post.textContent);',
    "  const label = document.createElement('p');",
    "  label.className = 'reading-time';",
    "  label.textContent = result.minutes + ' min read (' + result.words + ' words)';",
    '  post.parentNode.insertBefore(label, post);',
    '}',
    '',
    "document.addEventListener('DOMContentLoaded', function () {",
    "  showReadingTime('.post-body');",
    '});',
    ''
  ].join('\n');

  var api = { VENDOR: VENDOR, DEFAULTS: DEFAULTS, options: options, terserOptions: terserOptions, obfuscatorOptions: obfuscatorOptions,
    domainList: domainList, licenceComments: licenceComments, errorInfo: errorInfo, offset: offset, run: run,
    bloggerWrap: bloggerWrap, bytes: bytes, saving: saving, SAMPLE: SAMPLE };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBJs = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
