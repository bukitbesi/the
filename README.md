# The Bukit Besi Tools — 48 Free Online Tools for Developers & Creators

[![Deploy](https://github.com/bukitbesi/the/actions/workflows/deploy.yml/badge.svg)](https://github.com/bukitbesi/the/actions/workflows/deploy.yml)
[![Live site](https://img.shields.io/badge/live-tool.thebukitbesi.com-6c5ce7)](https://tool.thebukitbesi.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-00cec9)](LICENSE)

**[tool.thebukitbesi.com](https://tool.thebukitbesi.com/)** is a free, installable
directory of 48 browser-based tools from [The Bukit Besi](https://www.thebukitbesi.com/):
code minifiers, SEO and schema generators, writing utilities, image editors,
AI prompt tools and Malaysian calculators (zakat, faraid, BMI and more).
No signup, no tracking scripts, works offline after one visit.

| Category | Examples |
| --- | --- |
| Developer Tools | JavaScript minifier & obfuscator, CSS minifier, HTML beautifier, JSON formatter & validator |
| SEO Tools | JSON-LD and video schema generators, robots.txt generator, SEO meta analyzer, FAQ formatter |
| Content Tools | Word counter, text case converter, find & replace, text to HTML, online notepad |
| Design Tools | WebP and image format converters, color contrast checker, photo editor, WhatsApp stickers |
| AI Tools | AI art and video prompt generators, image to prompt, paraphraser, cartoonizer |
| Utilities | WhatsApp link creator, PDF & Word converter, currency converter, speed tests, courier tracking |
| Calculators | Kalkulator zakat, faraid, saiz kasut, kalori, BMI, pregnancy dates |

The full, always-current list is generated into [`llms.txt`](llms.txt).

## Performance and search

- **Core Web Vitals:** single static HTML file, inline critical CSS, system
  fonts, inline SVG icons, no third-party requests. Local Lighthouse mobile:
  100/100/100/100, LCP ≈ 1.1 s, TBT ≈ 0 ms, CLS 0
  ([audit](docs/seo-audit.md)). GitHub Pages CDN keeps TTFB low.
- **SEO:** canonical URL, Open Graph + 1200×630 social card, sitemap,
  robots.txt, one `@graph` of Organization, WebSite, CollectionPage,
  ItemList (with per-tool descriptions) and FAQPage JSON-LD that is checked
  against the visible content on every build.
- **AEO / LLM visibility:** answer-first FAQ, an `llms.txt` directory
  ([llmstxt.org](https://llmstxt.org/)), open crawling for AI agents and an
  IndexNow ping on every deployment (Bing, ChatGPT search, Copilot).
- **PWA:** web app manifest with maskable icons and install screenshots, a
  versioned service worker (network-first directory, offline fallback,
  consent-based updates). See [PWA details](docs/pwa.md).

## Project layout

```
tools-src/tools.json     tool records (only live: true is published)
tools-src/site.json      host, brand, categories, FAQ, social image, IndexNow key
tools-src/template.html  page layout
tools-src/icons.mjs      one SVG icon per tool
tools-src/build.mjs      generates tool.html, sitemap, robots, llms.txt, manifest, sw.js
tools-src/validate.mjs   fails the deploy on SEO, schema or PWA drift
tools-src/images.mjs     renders the social card and PWA screenshots (Playwright)
assets/PWA/sw.js         service-worker source template
migration/old-host/      redirect bundle for the retired the.thebukitbesi.com host
```

## Build, preview, deploy

```sh
node tools-src/build.mjs
node tools-src/validate.mjs
node tools-src/preview.mjs        # http://127.0.0.1:8765/
node tools-src/images.mjs         # only after brand, count or layout changes
```

A push to `main` builds, validates and publishes to GitHub Pages, then pings
IndexNow. Update `dateModified` in `site.json` when published content changes.
Set `live: true` only after a tool's page returns HTTP 200. Do not edit
generated files (`tool.html`, `sw.js`, `manifest.webmanifest`, `llms.txt`,
`sitemap.xml`, `robots.txt`) by hand.

The `CNAME` file and the `origin` in `site.json` must match; the build checks
this. Because deployment uses GitHub Actions, the custom domain must also be
set in **Settings → Pages**. See [the domain migration](docs/domain-migration.md).

## More documentation

- [SEO and performance audit](docs/seo-audit.md)
- [PWA and offline behaviour](docs/pwa.md)
- [Tool discovery report](docs/tool-discovery.md)
- [Domain migration](docs/domain-migration.md)

## License

MIT
