// Live gold price feed for /harga-emas-hari-ini/ and /gold-price-malaysia/ (Cloudflare Workers, free plan).
// Fetches three public sources, caches the combined answer for 5 minutes, and returns them unchanged; the page
// parses them with assets/js/gold-core.js. Upstream sees at most one request per source every 5 minutes.
// Deploy steps: documentation/gold-worker.md
const ALLOWED_ORIGINS = ['https://tool.thebukitbesi.com'];
const TTL = 300;
const BNM = { Accept: 'application/vnd.BNM.API.v1+json' };
const SOURCES = {
  spot: ['https://api.gold-api.com/price/XAU', {}],
  kijang: ['https://api.bnm.gov.my/public/kijang-emas', BNM],
  fx: ['https://api.bnm.gov.my/public/exchange-rate/USD', BNM],
  fxBackup: ['https://api.frankfurter.app/latest?from=USD&to=MYR', {}]
};

async function getJson(url, headers) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'BukitBesiGold/1.0 (+https://tool.thebukitbesi.com/harga-emas-hari-ini/)', ...headers }, cf: { cacheTtl: TTL } });
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const cors = { 'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0], Vary: 'Origin' };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' } });
    if (request.method !== 'GET') return new Response('GET only', { status: 405, headers: cors });

    const cache = caches.default, key = new Request('https://cache.invalid/gold-v1');
    let hit = await cache.match(key);
    if (!hit) {
      const names = Object.keys(SOURCES);
      const values = await Promise.all(names.map(n => getJson(...SOURCES[n])));
      const body = { fetchedAt: new Date().toISOString() };
      names.forEach((n, i) => { body[n] = values[i]; });
      hit = new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': `public, max-age=${TTL}` } });
      ctx.waitUntil(cache.put(key, hit.clone()));
    }
    return new Response(hit.body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60', ...cors } });
  }
};
