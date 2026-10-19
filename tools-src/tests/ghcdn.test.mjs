// GitHub to jsDelivr core: every GitHub link shape converts to jsDelivr's documented /gh/user/repo@ref/path format.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const G = require('../../assets/js/ghcdn-core.js');

test('Parses GitHub, raw and jsDelivr links', () => {
  const want = { user: 'jquery', repo: 'jquery', ref: '3.6.4', path: 'dist/jquery.js', dir: false };
  for (const u of ['https://github.com/jquery/jquery/blob/3.6.4/dist/jquery.js', 'github.com/jquery/jquery/raw/3.6.4/dist/jquery.js?raw=true',
    'https://raw.githubusercontent.com/jquery/jquery/3.6.4/dist/jquery.js', 'https://raw.githubusercontent.com/jquery/jquery/refs/tags/3.6.4/dist/jquery.js',
    'https://cdn.jsdelivr.net/gh/jquery/jquery@3.6.4/dist/jquery.js'])
    assert.deepEqual(G.parse(u), want, u);
  assert.deepEqual(G.parse('https://github.com/user/my.repo/tree/main/assets'), { user: 'user', repo: 'my.repo', ref: 'main', path: 'assets', dir: true });
  assert.deepEqual(G.parse('https://github.com/user/repo.git'), { user: 'user', repo: 'repo', ref: '', path: '', dir: true });
  assert.equal(G.parse('https://gist.github.com/x/abc').error, 'gist');
  assert.equal(G.parse('https://user.github.io/site/app.js').error, 'pages');
  assert.equal(G.parse('https://example.com/a.js').error, 'unknown');
});

test('Converts to jsDelivr with minified, raw and tag', () => {
  const r = G.convert('https://github.com/bukitbesi/theme/blob/main/js/app.js');
  assert.equal(r.cdn, 'https://cdn.jsdelivr.net/gh/bukitbesi/theme@main/js/app.js');
  assert.equal(r.min, 'https://cdn.jsdelivr.net/gh/bukitbesi/theme@main/js/app.min.js');
  assert.equal(r.raw, 'https://raw.githubusercontent.com/bukitbesi/theme/main/js/app.js');
  assert.equal(r.tag, '<script src="https://cdn.jsdelivr.net/gh/bukitbesi/theme@main/js/app.min.js" defer></script>');
  assert.deepEqual([r.kind, r.notes], ['branch', ['branch']]);
  const v = G.convert('https://github.com/jquery/jquery/blob/3.6.4/dist/jquery.min.js');
  assert.deepEqual([v.kind, v.min, v.major, v.minor], ['version', undefined, 'https://cdn.jsdelivr.net/gh/jquery/jquery@3/dist/jquery.min.js', 'https://cdn.jsdelivr.net/gh/jquery/jquery@3.6/dist/jquery.min.js']);
  assert.equal(G.convert('https://github.com/a/b/blob/v2.0.1/x.css').major, undefined);
  assert.equal(G.convert('https://github.com/a/b/blob/32b00373b3f42e5cdcb709df53f3b08b7184a944/s.css').kind, 'commit');
  assert.equal(G.convert('https://github.com/a/b/blob/main/s.css').tag, '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/a/b@main/s.min.css">');
  assert.equal(G.convert('https://github.com/a/b/blob/main/img/logo.webp').tag, '<img src="https://cdn.jsdelivr.net/gh/a/b@main/img/logo.webp" alt="" loading="lazy">');
  assert.equal(G.convert('https://github.com/a/b/blob/main/My File.js').cdn, 'https://cdn.jsdelivr.net/gh/a/b@main/My%20File.js');
});

test('Directories, latest and HTML notes', () => {
  const d = G.convert('https://github.com/a/b/tree/main/assets');
  assert.deepEqual([d.cdn, d.tag, d.github], ['https://cdn.jsdelivr.net/gh/a/b@main/assets/', undefined, 'https://github.com/a/b/tree/main/assets']);
  const l = G.convert('https://cdn.jsdelivr.net/gh/a/b/x.js');
  assert.deepEqual([l.kind, l.notes, l.raw], ['latest', ['latest'], '']);
  assert.deepEqual(G.convert('https://github.com/a/b/blob/1.0.0/index.html').notes, ['html']);
  assert.equal(G.convert('').error, 'empty');
  assert.equal(G.FACTS.branchCacheHours, 12);
  assert.match(G.FACTS.verified, /^\d{4}-\d{2}-\d{2}$/);
});
