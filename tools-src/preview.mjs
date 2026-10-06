// Serve the same root URLs as the GitHub Pages deployment (no dependencies).
// Usage: node tools-src/preview.mjs [port]
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = new Set(['tool.html', 'sw.js', 'manifest.webmanifest', 'offline.html',
  '404.html', 'robots.txt', 'sitemap.xml', 'llms.txt']);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    const url = new URL(req.url, 'http://localhost');
    const name = url.pathname === '/' || url.pathname === '/index.html' ? 'tool.html' : decodeURIComponent(url.pathname).slice(1);
    const absolute = path.resolve(root, name);
    const permitted = files.has(name) || /^assets\/(?:PWA|favicon-image)\/[\w/.-]+$/.test(name);
    if (!permitted || !absolute.startsWith(root + path.sep)) throw new Error('Not found');
    const content = await fs.readFile(absolute);
    res.writeHead(200, { 'Content-Type': mime[path.extname(name)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(await fs.readFile(path.join(root, '404.html')));
  }
});
server.listen(Number(process.argv[2] || 8765), '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${server.address().port}/`));
