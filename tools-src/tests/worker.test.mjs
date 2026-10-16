// AI worker routes with a mocked Workers AI binding and edge cache.
import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.caches = { default: { match: async k => store.has(k.url) ? new Response(store.get(k.url)) : undefined, put: async (k, r) => { store.set(k.url, await r.text()); } } };
const { default: worker } = await import('../../tools-src/vision-worker/worker.js');
const calls = [];
const env = { AI: { run: async (model, input) => {
  calls.push(model);
  if (model.includes('flux')) return { image: 'QUJD' };
  if (model.includes('vision')) return { response: '{"subject":"cat"}' };
  if (env.failFirst && model.includes('mistral')) throw new Error('model unavailable');
  if (env.quota) throw new Error('3036: You have used up your daily free allocation of 10,000 neurons');
  return { response: 'Rewritten: ' + input.messages[1].content };
} } };
const ORIGIN = 'https://tool.thebukitbesi.com';
const post = (path, body, ip = '1.1.1.1', origin = ORIGIN) => worker.fetch(new Request('https://w.dev' + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': ip }, body: JSON.stringify(body) }), env).then(async r => ({ status: r.status, j: await r.json() }));

test('GET lists the routes; other origins are refused', async () => {
  const r = await worker.fetch(new Request('https://w.dev/'), env);
  assert.deepEqual((await r.json()).routes, ['/', '/text', '/image']);
  assert.equal((await post('/text', { task: 'paraphrase', system: 's', user: 'u' }, '2.2.2.2', 'https://evil.example')).status, 403);
});

test('/text runs a task, validates it, falls back to the next model and reports quota', async () => {
  const ok = await post('/text', { task: 'paraphrase', system: 'Rewrite.', user: 'hello' }, '3.3.3.3');
  assert.equal(ok.status, 200); assert.equal(ok.j.text, 'Rewritten: hello'); assert.match(ok.j.model, /mistral/);
  assert.equal((await post('/text', { task: 'hack', system: 's', user: 'u' }, '3.3.3.4')).status, 400);
  assert.equal((await post('/text', { task: 'caption', system: 's', user: 'x'.repeat(1300) }, '3.3.3.5')).j.error, 'too_long');
  env.failFirst = true;
  const fb = await post('/text', { task: 'summarize', system: 's', user: 'text' }, '3.3.3.6');
  assert.match(fb.j.model, /llama-3.3/); env.failFirst = false;
  env.quota = true;
  assert.equal((await post('/text', { task: 'summarize', system: 's', user: 'text' }, '3.3.3.7')).j.error, 'quota'); env.quota = false;
});

test('/text sends Malay requests to the larger model first', async () => {
  calls.length = 0;
  const r = await post('/text', { task: 'grammar', lang: 'ms', system: 's', user: 'teks' }, '6.6.6.6');
  assert.equal(r.status, 200); assert.match(calls[0], /llama-3.3-70b/);
});

test('/image blocks unsafe prompts, returns base64 and limits each IP', async () => {
  assert.equal((await post('/image', { prompt: 'a nude person' }, '4.4.4.4')).j.error, 'blocked');
  assert.equal((await post('/image', { prompt: 'gambar bogel' }, '4.4.4.5')).j.error, 'blocked');
  const ok = await post('/image', { prompt: 'a cat eating durian in Penang, watercolour' }, '4.4.4.6');
  assert.equal(ok.j.image, 'QUJD');
  for (let i = 0; i < 2; i++) await post('/image', { prompt: 'a red kite' }, '4.4.4.6');
  assert.equal((await post('/image', { prompt: 'a red kite' }, '4.4.4.6')).j.error, 'rate');
});

test('POST / still describes pictures for Image to Prompt', async () => {
  const r = await post('/', { image: 'data:image/jpeg;base64,QUJD' }, '5.5.5.5');
  assert.equal(r.j.text, '{"subject":"cat"}');
});
