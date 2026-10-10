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
  fonts, inline SVG icons, no render-blocking third-party code. Local
  Lighthouse mobile with all three ad units enabled: 99–100 performance,
  100 accessibility/best practices/SEO, TBT 0 ms, CLS 0
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

- **Theme:** light by default (matches standard AdSense creatives), with a
  dark-mode toggle. The choice is stored per browser and applied before
  first paint, so there is no flash or layout shift. Both themes pass
  WCAG AA contrast (axe-core).

## AdSense

Fill in `adsense` in `tools-src/site.json`:

```json
"adsense": {
  "client": "ca-pub-0000000000000000",
  "slots": { "top": "1234567890", "middle": "1234567890", "bottom": "1234567890" }
}
```

Create three **Display ads → Responsive** units in AdSense and paste their
`data-ad-slot` values. The build then adds the units (after the hero, between
Categories and Why, and between FAQ and the closing call to action), each
labelled "Advertisement" with space reserved to prevent layout shift, and
writes `ads.txt`. The AdSense library loads only after the visitor's first
scroll, tap, key press or mouse move; the ad code itself is unmodified. With
`client` empty, no ad code is published.

## Hosted calculators

| Page | Language | Targets |
| --- | --- | --- |
| [/salary-calculator-malaysia/](https://tool.thebukitbesi.com/salary-calculator-malaysia/) | English | salary calculator malaysia, PCB / EPF / SOCSO calculator |
| [/kalkulator-gaji/](https://tool.thebukitbesi.com/kalkulator-gaji/) | Bahasa Melayu | kalkulator gaji bersih, kalkulator KWSP / PCB |

Both pages share one tested calculation core (`assets/js/salary-core.js`):
EPF from the KWSP Third Schedule bands, SOCSO / EIS / LINDUNG 24 Jam from
PERKESO's RM100 bands with the RM6,000 ceiling, and PCB from LHDN's
computerised method. The build renders the first result, the worked example
and the salary table into the HTML, so the page is complete before any script
runs. They are linked as `hreflang` pairs, carry WebApplication, BreadcrumbList
and FAQPage JSON-LD, cite their official sources and work offline.

**Yearly upkeep:** after each Budget or KWSP/PERKESO/LHDN change, update the
rates in `salary-core.js`, its `RULES.verified` date and the tests in
`tools-src/tests/salary.test.mjs`, then update `dateModified` on both pages.

[Privacy policy](https://tool.thebukitbesi.com/privacy/) and
[Terms of use](https://tool.thebukitbesi.com/terms/) live on this host and
cover AdSense cookies, on-device storage and calculator disclaimers.

## Project layout

```
tools-src/tools.json        tool records (only live: true is published)
tools-src/site.json         host, brand, categories, FAQ, social image, IndexNow key, AdSense IDs
tools-src/layout.html       shared page shell: head/meta, header, footer, theme, ads
tools-src/home.html         directory home page body
tools-src/pages/*.html      other pages; JSON front matter sets URL, language, hreflang, schema, FAQ
tools-src/css/              base.css (shared), home.css, page.css
tools-src/icons.mjs         one SVG icon per tool
tools-src/build.mjs         generates tool.html, dist/ pages and bundles, sitemap, robots, llms.txt, manifest, sw.js
tools-src/validate.mjs      fails the deploy on SEO, schema, accessibility-attribute or PWA drift
tools-src/tests/            unit tests for calculation cores (node --test)
tools-src/images.mjs        renders the social card and PWA screenshots (Playwright)
assets/js/salary-*.js       salary calculator core and UI (bundled to dist/assets/js/salary.js)
assets/PWA/sw.js            service-worker source template
```

To add a tool page, create `tools-src/pages/<slug>.html` with front matter
(copy an existing page), add its record to `tools.json` with the full URL on
this host, then build. The sitemap, llms.txt, offline cache and IndexNow
ping pick it up automatically.

## Build, preview, deploy

```sh
node --test tools-src/tests/*.test.mjs
node tools-src/build.mjs
node tools-src/validate.mjs
node tools-src/preview.mjs        # http://127.0.0.1:8765/
node tools-src/images.mjs         # only after brand, count or layout changes
```

Pull requests run the tests, build and validator. A push to `main` does the
same, publishes to GitHub Pages and pings IndexNow with every sitemap URL. Update `dateModified` in `site.json` when published content changes.
Set `live: true` only after a tool's page returns HTTP 200. Do not edit
generated files (`tool.html`, `dist/`, `sw.js`, `manifest.webmanifest`, `llms.txt`,
`sitemap.xml`, `robots.txt`) by hand.

The `CNAME` file and the `origin` in `site.json` must match; the build checks
this. **Settings → Pages → Source must be "GitHub Actions".** With "Deploy
from a branch", GitHub serves this README as the home page instead of the
built directory. Set the custom domain on the same settings page. See [the domain migration](docs/domain-migration.md).

## More documentation

- [SEO and performance audit](docs/seo-audit.md)
- [PWA and offline behaviour](docs/pwa.md)
- [Tool discovery report](docs/tool-discovery.md)
- [Domain migration](docs/domain-migration.md)

## License

MIT
