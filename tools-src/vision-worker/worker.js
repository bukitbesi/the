// Image to Prompt describer for /image-to-prompt/ and /gambar-ke-prompt/ (Cloudflare Workers AI, free allocation).
// The page shrinks the picture to 768 px, posts it here as a JPEG data URL, and this worker asks Llama 3.2 Vision for a
// JSON description that assets/js/prompt-core.js turns into prompts. Nothing is stored. On the Workers Free plan usage
// stops at the daily free allocation instead of billing; the page then offers its in-browser fallback.
// Deploy steps: documentation/vision-worker.md
const ALLOWED_ORIGINS = ['https://tool.thebukitbesi.com'];
const MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';
const MAX_BODY = 1_500_000;
const PER_MINUTE = 6;
const SYSTEM = 'You describe a picture so someone can recreate it with an AI image or video generator. Reply with one JSON object only, no other text, with these string keys: ' +
  '"subject" (the main subject and its key visual traits, max 25 words), "action" (what it is doing, or ""), "setting" (place and background), ' +
  '"style" (photo, painting, 3D render, anime, illustration and so on), "lighting", "shot" (framing and camera angle), "mood", ' +
  '"color" (main colours), "details" (other notable details, max 30 words). Describe only what is visible. Never name or identify real people.';

const json = (body, status, cors) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors } });

// A soft per-IP limit using the edge cache; good enough to stop one visitor draining the daily allocation.
async function overLimit(ip) {
  const cache = caches.default, minute = Math.floor(Date.now() / 60000);
  const key = new Request(`https://limit.invalid/${encodeURIComponent(ip)}/${minute}`);
  const hit = await cache.match(key), n = hit ? Number(await hit.text()) + 1 : 1;
  await cache.put(key, new Response(String(n), { headers: { 'Cache-Control': 'max-age=70' } }));
  return n > PER_MINUTE;
}

async function describe(env, image) {
  const input = {
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: [{ type: 'text', text: 'Describe this picture as the JSON object.' }, { type: 'image_url', image_url: { url: image } }] }
    ],
    max_tokens: 400, temperature: 0.2
  };
  try {
    return await env.AI.run(MODEL, input);
  } catch (err) {
    // Meta's licence must be accepted once per account by sending "agree" to the model.
    if (!/agree|licen[cs]e|accept/i.test(String(err && err.message))) throw err;
    await env.AI.run(MODEL, { prompt: 'agree' });
    return env.AI.run(MODEL, input);
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.includes(origin);
    const cors = { 'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0], Vary: 'Origin' };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
    if (request.method === 'GET') return json({ ok: true, service: 'tbb-vision', model: MODEL }, 200, cors);
    if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405, cors);
    if (!allowed) return json({ ok: false, error: 'origin' }, 403, cors);
    if (!env.AI) return json({ ok: false, error: 'not_configured' }, 503, cors);
    if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY) return json({ ok: false, error: 'too_large' }, 413, cors);

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (await overLimit(ip)) return json({ ok: false, error: 'rate' }, 429, cors);

    let image;
    try {
      const raw = await request.text();
      if (raw.length > MAX_BODY) return json({ ok: false, error: 'too_large' }, 413, cors);
      image = JSON.parse(raw).image;
    } catch { return json({ ok: false, error: 'bad_request' }, 400, cors); }
    if (typeof image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) return json({ ok: false, error: 'bad_image' }, 400, cors);

    try {
      const out = await describe(env, image);
      const text = out && typeof out.response === 'string' ? out.response : '';
      if (!text) return json({ ok: false, error: 'empty' }, 502, cors);
      return json({ ok: true, text, model: MODEL }, 200, cors);
    } catch (err) {
      // Daily allocation used up, model busy or capacity errors: the page falls back to the in-browser model.
      return json({ ok: false, error: 'busy', detail: String(err && err.message || err).slice(0, 200) }, 503, cors);
    }
  }
};
