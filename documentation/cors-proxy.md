# Optional URL proxy for the Unused CSS Remover

The Unused CSS Remover loads pages and stylesheets straight from the visitor's browser. That works for
sites that allow cross-site reads (CORS): GitHub Pages, most CDNs (jsDelivr, cdnjs, unpkg, Google Fonts)
and any site that sends `Access-Control-Allow-Origin`. Most other sites, including Blogger blogs, do not,
so the browser refuses to read them. The tool then suggests the capture bookmarklet, which always works.

To let "Load pages from URLs" work for every site, deploy the small proxy in
[`tools-src/cors-proxy/worker.js`](../tools-src/cors-proxy/worker.js) on Cloudflare Workers. The free plan
allows 100,000 requests a day, which is far more than the tool needs.

The proxy only answers requests from `https://tool.thebukitbesi.com`, only fetches public http(s)
addresses, only returns HTML and CSS up to 3 MB, and caches each URL for 10 minutes.

## Steps (about 10 minutes, free)

1. Create a free account at [dash.cloudflare.com](https://dash.cloudflare.com/) (no domain or card needed).
2. **Workers & Pages → Create → Create Worker.** Name it, for example, `css-proxy`, then **Deploy**.
3. **Edit code**, replace everything with the contents of `tools-src/cors-proxy/worker.js`, then **Deploy**.
4. Copy the worker address, such as `https://css-proxy.yourname.workers.dev`.
5. In `tools-src/site.json`, set:

   ```json
   "corsProxy": "https://css-proxy.yourname.workers.dev/?url="
   ```

6. Run `node tools-src/build.mjs`, commit and push. The tool now falls back to the proxy whenever a site
   blocks direct reads.

To switch it off, set `"corsProxy": ""` and rebuild. If you serve the tool from another domain, add that
origin to `ALLOWED_ORIGINS` at the top of the worker.
