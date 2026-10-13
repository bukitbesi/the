# Image to Prompt worker (Cloudflare Workers AI, free allocation)

`/image-to-prompt/` and `/gambar-ke-prompt/` describe an uploaded picture in three layers:

1. **Colours, tone and aspect ratio**: always, read from the pixels in the browser (`TBBPrompt.analyse`). Free, instant.
2. **Online AI description**: this worker, `tools-src/vision-worker/worker.js`, runs Meta Llama 3.2 11B Vision on
   Cloudflare Workers AI and returns a JSON description (subject, setting, style, lighting, framing, mood, colours).
3. **In-browser AI fallback**: if the worker is missing, busy or out of today's allocation, the page offers a
   one-time download of a small captioning model (Transformers.js, `Xenova/vit-gpt2-image-captioning`, roughly
   250 MB, then cached by the browser). It only loads when the visitor clicks, so it never slows the page.

The page shrinks the picture to 560 px before sending it, so each description costs very little of the free
allocation (10,000 Neurons a day, reset at 00:00 UTC). Expect a few hundred descriptions a day; the exact count
depends on the image and answer length, and is shown in the dashboard under **AI → Workers AI**.

## Deploy (about 5 minutes)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Create Worker**. Name it `tbb-vision` → **Deploy**.
2. **Edit code**, delete the sample, paste the whole of `tools-src/vision-worker/worker.js`, then **Deploy**.
3. Open the worker → **Settings** → **Bindings** → **Add** → **Workers AI**. Variable name: `AI` → **Deploy**.
4. Open `https://tbb-vision.<your-subdomain>.workers.dev` in the browser. It should show
   `{"ok":true,"service":"tbb-vision",...}`.
5. If the subdomain is not `bukitbesi`, put the URL in `tools-src/site.json` as `"visionApi"`, run
   `node tools-src/build.mjs`, and commit `site.json` with `docs/` (or ask Claude to do it).

The first description also accepts Meta's Llama 3.2 licence for the account (the worker sends the one-time
`"agree"` request itself).

## Cost and abuse controls

- **Stay on the Workers Free plan** for this account: when the daily allocation runs out, requests fail instead of
  billing, and the page switches to the in-browser model. On Workers Paid, usage beyond the allocation is billed
  ($0.011 per 1,000 Neurons).
- Only `https://tool.thebukitbesi.com` may call it (CORS and an Origin check), images over 1.5 MB are refused, and
  each IP address may describe 6 pictures a minute.
- Images are not stored or logged by the worker.

## If the model changes

Cloudflare retires models from time to time. If descriptions stop, pick another vision model from the Workers AI
catalogue that accepts `messages` with `image_url` content and change `MODEL` in the worker. The page parses any JSON
or plain-text answer (`TBBPrompt.parseVision`), so nothing else has to change.
