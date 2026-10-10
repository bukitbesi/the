# SEO and performance audit

Checked 6 October 2026. Changes are local; this task did not push or deploy them.

**PWA update, 7 October 2026:** added the app manifest, correctly sized and
maskable icons, root service worker, offline fallback and install/update UI.
Chrome reported no installability errors. Browser regression checks passed
for complete precache, offline directory access and filtering, an uncached
page's HTTP 503 fallback, preservation of real online 404 responses, POST
bypass and the update lifecycle with selective cache cleanup. A local mobile
Lighthouse run with the PWA enabled scored 100 in performance, accessibility,
best practices and SEO; LCP 1.65 s, TBT 0 ms, CLS 0. See [PWA details](pwa.md).

**Directory expanded after the initial audit:** a full Blogger static-page
sitemap scan found 48 live tool pages. Eleven old catalog URLs had working
replacements under different slugs, and 28 additional tool pages were
discovered. The directory now publishes all 48 with distinct inline SVG icons
across seven categories. The earlier nine-tool count below describes the
initial catalog audit, not the current site's complete tool inventory.
See [the discovery report](tool-discovery.md) and
[the URL evidence](tool-discovery.json).

The expanded 48-tool page passed a new mobile Lighthouse 13.5.0 run:
100 performance, 100 accessibility, 100 best practices, and 100 SEO;
LCP 1.13 s, FCP 1.04 s, TBT 4 ms, CLS 0. Browser checks passed for all seven
category filters, all 48 links and icons, no-JavaScript access, mobile layout
without horizontal overflow, and no external asset requests. These remain
local lab measurements, not deployed-site or real-user Core Web Vitals.

## Results

Lighthouse 13.5.0, headless Chrome, simulated throttling against
`http://127.0.0.1:8765/tool.html`:

| Check | Original mobile | Updated mobile | Updated desktop |
| --- | ---: | ---: | ---: |
| Performance | 100 | 100 | 100 |
| Accessibility | 100 | 100 | 100 |
| Best practices | 100 | 100 | 100 |
| SEO | 100 | 100 | 100 |
| Largest Contentful Paint | 1.19 s | 1.21 s | 0.24 s |
| First Contentful Paint | 1.19 s | 0.99 s | 0.24 s |
| Total Blocking Time | 0 ms | 9 ms | 0 ms |
| Cumulative Layout Shift | 0 | 0 | 0 |

These are individual lab runs. Small timing differences are normal; the runs
do not establish a significant LCP improvement. Lighthouse already gave the
original page full scores despite its broken outbound links.

## Changes and evidence

- Verified all 36 tool destinations: nine returned HTTP 200 and 27 returned
  HTTP 404. Publish only the nine available tools. Keep the other records in
  the source catalog for future releases.
- Synchronize tool counts and categories across visible content, metadata,
  ItemList structured data, and `llms.txt`. Match FAQ markup to visible answers.
- Use one accurate title and description across search and social metadata.
  Retain the canonical root URL and static, crawlable links.
- Serve the existing logo locally as WebP: 1,622 bytes at 72 pixels,
  4,818 bytes at 192 pixels, and 12,910 bytes at 512 pixels. Remove the external
  image connection and fixed-header blur; keep explicit logo dimensions,
  system fonts, inline styles, and the small filter script.
- Generate a permissive `robots.txt` with the canonical sitemap location.
  Allow fetching the 404 page so crawlers can read its `noindex` directive.
  [Google's robots guidance](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
  explains why crawl blocking alone does not prevent indexing.
- Keep only the canonical root URL and the content modification date in the
  sitemap. The external tools belong to the main blog's sitemap.
- Structure `llms.txt` as a concise Markdown directory with verified tool
  links and publisher resources, following the
  [llms.txt proposal](https://llmstxt.org/). This file is a summary, not an
  indexing or ranking guarantee. Google states that AI features require
  [no special AI text files](https://developers.google.com/search/docs/appearance/ai-features).
- Build and validate during deployment to avoid stale generated files.

The build validator passed for published links, schema counts, FAQ counts,
unique IDs, anchor destinations, local files, script syntax, canonical URL,
and crawl-file consistency. Headless-browser checks passed for category
filtering, status announcements, FAQ interaction, 360-pixel layout without
horizontal overflow, all-local loaded assets, and access to all nine tool
links with JavaScript disabled. Blog, About, Contact, and Privacy links also
returned HTTP 200.

## Production follow-through

After deploying, run PageSpeed Insights against the canonical URL and check
Search Console's URL inspection, sitemap processing, and Core Web Vitals.
Localhost runs exclude real server latency, production caching, compression,
and visitors' network conditions. No production performance improvement is
claimed by these lab results.

INP was not measured. Total Blocking Time is a lab diagnostic and does not
replace INP. Core Web Vitals assess LCP, INP, and CLS using real visits at the
75th percentile; see [Web Vitals](https://web.dev/articles/vitals).

GitHub Pages controls response headers. This repository cannot independently
set its caching or compression policy. The live crawl-file endpoints returned
HTTP 200 with appropriate HTML, plain-text, and XML content types during the
check, but their deployed content has not been updated by this task.

Recheck links when publishing new tools and set `live: true` only after their
pages are available. Submit the canonical sitemap in Search Console after
deployment if it is not already registered.
