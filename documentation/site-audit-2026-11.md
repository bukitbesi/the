# Full audit: thebukitbesi.com + tool.thebukitbesi.com (2026-11-15)

Method: live crawl of both sitemaps (tool: 256 URLs, blog: 1,611 posts + pages), Cloudflare zone read through the API,
Lighthouse 12.8 mobile on 3 tool pages and 2 blog pages, repo tests/build/validator. Re-run with
`node tools-src/edge-check.mjs`.

## Fixed (applied 2026-11-15)

| # | Problem | Impact | Fix |
|---|---|---|---|
| 1 | Cloudflare custom rules put a **Managed Challenge on all `tool.` traffic** and on `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/ads.txt` | Crawlers that could not pass the challenge got 403s: the "robots.txt 403", failed sitemap fetches, ads.txt unverifiable for AdSense | Both rules removed. One Skip rule now keeps crawler files clear of every security check |
| 2 | Redirect rules contained pasted Markdown (`[host](https://host)`), so none matched. One would have sent `www` to the root domain (a loop with Blogger) | `the.thebukitbesi.com/*` returned 404 to GitHub Pages | Rebuilt: `the.` and `www.tool.` → `https://tool.thebukitbesi.com` + path + query, 301, one hop (also from `http://`) |
| 3 | `assets.thebukitbesi.com` had no DNS record (lost in the Namecheap → Cloudflare move) | Every Blogger page logged a failed `tbb-pwa.min.js` load (Best Practices 75), and the PWA/install helper and reading progress were dead | CNAME `assets` → `bukitbesi.github.io` (grey cloud). HTTPS 200 confirmed |
| 4 | SSL mode **Full** (accepts any origin certificate) | Allows a man-in-the-middle between Cloudflare and GitHub | **Full (strict)** |
| 5 | Browser Integrity Check on, Security Level medium | 403s for clients with unusual headers and for shared Malaysian mobile IPs (CGNAT) with poor reputation | Off / Essentially off (static site; DDoS protection unaffected) |
| 6 | Cloudflare Web Analytics injected `static.cloudflareinsights.com/beacon.min.js` into every tool page | A third-party script (against the repo rule), 10 KB of legacy JS | Configuration Rule disables RUM on `tool.` |
| 7 | No DMARC record | Spoofed mail could claim the domain | `_dmarc` TXT `p=reject` (SPF `-all` and null DKIM already existed; the domain sends no mail) |
| 8 | Crawler Hints off | New and changed pages reach Bing/Yandex only through the workflow | On: Cloudflare also pings IndexNow on content changes |
| 9 | Logo link `aria-label` differed from its visible text (Lighthouse `label-content-name-mismatch`) | Accessibility (voice-control users) | `aria-label` removed; the name is now the visible text |

Tool site after the fixes: 256/256 URLs return 200 with a self-canonical, one H1, unique titles of 70 characters or
fewer, descriptions and JSON-LD. Lighthouse mobile scores 99–100 / 100 / 100 / 100 with CLS 0. 557/557 tests pass.

## Your action needed (Blogger: about 15 minutes, highest SERP impact first)

### A. Paste the tool redirect block into the Blogger theme (high impact)

29 old Blogger tool pages (`/p/css-minifier-tool.html`, `/p/kalkulator-zakat.html`, `/p/kalkulator-bmi.html`, …)
still serve the old tool with a **self-canonical**. They compete with the new tool pages for the same queries
(keyword cannibalisation), and Google splits ranking signals between two URLs. The redirect block in
[`blogger-redirects.xml`](blogger-redirects.xml) is current but **not in the live theme** (checked: no meta refresh on
any of the 29). Follow [blogger-redirects.md](blogger-redirects.md) → "First time". Afterwards
`node tools-src/edge-check.mjs` should still pass, and each old URL lands on the tool page.

Mechanism: Google treats a 0-second meta refresh as a permanent redirect and consolidates the old page's links and
history into the tool page. Expect the tool URLs to replace the Blogger URLs in results within 2–6 weeks.

### B. Preload the post's LCP image (blog mobile LCP 6.1 s → about 3 s)

Lighthouse on a post: the featured image already has `fetchpriority="high"`, but it is discovered late
(**3.4 s load delay**, 56% of LCP) because it sits deep in the body behind the render-blocking theme CSS. In the theme
(`bukitbesi/xml`, `asset/tbb.xml`), add inside `<head>`:

```xml
<b:if cond='data:view.isSingleItem and data:blog.postImageUrl'>
  <link as='image' expr:href='resizeImage(data:blog.postImageUrl, 800)' fetchpriority='high' rel='preload'/>
</b:if>
```

The `resizeImage` width must match the `src` the theme prints for the hero image (800 here), or the browser
downloads it twice.

### C. Post-body layout shift (CLS 0.105 on posts, 0 on the home page)

The first `#post-body > p` moves after load: something above it (most likely the AdSense auto-ad slot or the TOC) is
inserted without reserved height. Give that slot a `min-height` in the theme CSS. Above 0.1 is "needs improvement" in
Core Web Vitals.

### D. 649 of 1,611 sitemap posts are `noindex` (decision, not a bug)

The pruning list (`docs/prune/noindex.txt` in `bukitbesi/xml`) noindexes 649 posts, mostly from 2020–2022 but also 87
from 2025. Blogger still lists them in `sitemap.xml` (it cannot exclude posts), so Search Console reports "Submitted
URL marked noindex". That is harmless. Check the 2025 entries, though: recent posts with real traffic (for example
`cara-simpan-duit-gaji`, `cara-semak-ccris-ctos-online`) are exactly what AI Overviews cite. Look at Search Console →
Performance for each before you prune it.

### E. Static pages without a search description

`/p/about.html`, `/p/contact.html` and `/p/tools.html` have no meta description. Fill in Blogger → Pages → edit →
Search description (150–160 characters). About/Contact feed E-E-A-T (the publisher's identity).

## Checked and fine

- Blogger redirects: root → `https://www` keeps path and query (301), `http` → `https` (301). The mobile `?m=1` 302 is
  Blogger's own and costs about 0.8 s on mobile; it cannot be removed while Blogger is the host.
- Blogger robots.txt: allows all crawlers except Bytespider/CCBot; sitemaps listed.
- Tool robots.txt, sitemap, llms.txt and ads.txt: 200 for every crawler user-agent.
- Purge workflow: secrets set, last runs successful.

## Do not do

- Do not orange-cloud `www` or the root domain (Blogger SSL renewal breaks; see cloudflare.md).
- Do not add Challenge or Block rules on `tool.`. If you need one, add `and not cf.client.bot` and keep
  `allow-crawler-files` first.
- `data.thebukitbesi.com` serves "Site not found" through Cloudflare. Point it at a live Pages site or delete the
  record; an unused record pointing at github.io is a takeover target.
