import test from 'node:test';
import assert from 'node:assert/strict';
import { changedUrls, sitemapUrls } from '../indexnow.mjs';

const O = 'https://tool.thebukitbesi.com';
const listed = sitemapUrls(`<urlset><url><loc>${O}/</loc></url><url><loc>${O}/gold-price-malaysia/</loc></url>
  <url><loc>${O}/harga-emas-hari-ini/</loc></url></urlset>`);

test('sitemap URLs are read in order', () => {
  assert.deepEqual(listed, [`${O}/`, `${O}/gold-price-malaysia/`, `${O}/harga-emas-hari-ini/`]);
});

test('a gold-price commit maps to its two pages only', () => {
  const files = ['docs/gold-price-malaysia/index.html', 'docs/harga-emas-hari-ini/index.html', 'docs/sw.js', 'tools-src/gold-data.json'];
  assert.deepEqual(changedUrls(files, O, listed), [`${O}/gold-price-malaysia/`, `${O}/harga-emas-hari-ini/`]);
});

test('home page, llms.txt and pages outside the sitemap', () => {
  const files = ['docs/index.html', 'docs/llms.txt', 'docs/404.html', 'docs/offline.html', 'docs/unlisted/index.html', 'docs/assets/x.css'];
  assert.deepEqual(changedUrls(files, O, listed), [`${O}/`, `${O}/llms.txt`]);
});

test('nothing changed in docs/ sends nothing', () => {
  assert.deepEqual(changedUrls(['README.md', '.github/workflows/deploy.yml'], O, listed), []);
});
