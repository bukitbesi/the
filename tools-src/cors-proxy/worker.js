// Read-only fetch proxy for the Unused CSS Remover (Cloudflare Workers, free plan).
// The tool first fetches pages directly; it only comes here when a site does not allow cross-site reads (CORS).
// Limits: requests from the tool's own origin only, GET only, public http(s) hosts only (no IP addresses,
// no internal names), HTML and CSS responses only, 3 MB maximum, cached for 10 minutes.
// Deploy steps: documentation/cors-proxy.md
const ALLOWED_ORIGINS = ['https://tool.thebukitbesi.com'];
const MAX_BYTES = 3 * 1024 * 1024;
const TYPES = /^(text\/html|application\/xhtml\+xml|text\/css|text\/plain)\b/i;

const isBlockedHost = h => !h.includes('.') || /^\[|^\d+(\.\d+){3}$/.test(h) ||
  /(^|\.)(localhost|local|internal|intranet|lan|home|corp|test|invalid|example)$/i.test(h);

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.includes(origin);
    const cors = { 'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0], Vary: 'Origin' };
    const fail = (status, text) => new Response(text, { status, headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8' } });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' } });
    if (request.method !== 'GET' || !allowed) return fail(403, 'This proxy only serves the Unused CSS Remover.');

    let target;
    try { target = new URL(new URL(request.url).searchParams.get('url') || ''); } catch { return fail(400, 'Missing or invalid url.'); }
    if (!/^https?:$/.test(target.protocol) || target.username || target.password || (target.port && !['80', '443'].includes(target.port)) || isBlockedHost(target.hostname)) {
      return fail(400, 'Only public http and https addresses can be loaded.');
    }

    const cache = caches.default;
    const key = new Request('https://cache.invalid/' + encodeURIComponent(target.href));
    const hit = await cache.match(key);
    if (hit) return new Response(hit.body, { status: hit.status, headers: { ...Object.fromEntries(hit.headers), ...cors } });

    let res;
    try {
      res = await fetch(target.href, {
        redirect: 'follow',
        headers: { 'User-Agent': 'BukitBesiUnusedCSS/1.0 (+https://tool.thebukitbesi.com/unused-css-remover/)', Accept: 'text/html,text/css;q=0.9,*/*;q=0.1' }
      });
    } catch { return fail(502, 'The site could not be reached.'); }
    const type = res.headers.get('Content-Type') || 'text/plain';
    if (!TYPES.test(type)) return fail(415, 'Only HTML and CSS can be loaded.');
    if (Number(res.headers.get('Content-Length') || 0) > MAX_BYTES) return fail(413, 'The file is larger than 3 MB.');

    // Read with a hard cap, since Content-Length can be missing or wrong.
    const reader = res.body.getReader(), chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { reader.cancel(); return fail(413, 'The file is larger than 3 MB.'); }
      chunks.push(value);
    }
    const out = new Response(new Blob(chunks), {
      status: res.status,
      headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=600', 'X-Robots-Tag': 'noindex', 'X-Content-Type-Options': 'nosniff' }
    });
    if (res.ok) ctx.waitUntil(cache.put(key, out.clone()));
    return new Response(out.body, { status: out.status, headers: { ...Object.fromEntries(out.headers), ...cors } });
  }
};
