# The Bukit Besi Tools — 48 Free Online Tools for Developers & Creators

[![Deploy](https://github.com/bukitbesi/the/actions/workflows/deploy.yml/badge.svg)](https://github.com/bukitbesi/the/actions/workflows/deploy.yml)
[![Live site](https://img.shields.io/badge/live-tool.thebukitbesi.com-6c5ce7)](https://tool.thebukitbesi.com/)
[![License: All rights reserved](https://img.shields.io/badge/license-all%20rights%20reserved-d63031)](LICENSE)

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
  ([audit](documentation/seo-audit.md)). GitHub Pages CDN keeps TTFB low.
- **SEO:** canonical URL, Open Graph + 1200×630 social card, sitemap,
  robots.txt, one `@graph` of Organization, WebSite, CollectionPage,
  ItemList (with per-tool descriptions) and FAQPage JSON-LD that is checked
  against the visible content on every build.
- **AEO / LLM visibility:** answer-first FAQ, an `llms.txt` directory
  ([llmstxt.org](https://llmstxt.org/)), open crawling for AI agents and an
  IndexNow ping on every deployment (Bing, ChatGPT search, Copilot).
- **PWA:** web app manifest with maskable icons and install screenshots, a
  versioned service worker (network-first directory, offline fallback,
  consent-based updates). See [PWA details](documentation/pwa.md).

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

Create three **Display ads → Responsive** units in AdSense and paste only their
`data-ad-slot` **numbers** (e.g. `2106466698`), not the whole ad code; the build
writes the ad markup and rejects anything that is not digits. The build then adds the units (after the hero, between
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
| [/income-tax-calculator-malaysia/](https://tool.thebukitbesi.com/income-tax-calculator-malaysia/) | English | income tax calculator malaysia, YA2026 tax relief, Budget 2027 tax |
| [/kalkulator-cukai-pendapatan/](https://tool.thebukitbesi.com/kalkulator-cukai-pendapatan/) | Bahasa Melayu | kalkulator cukai pendapatan, pelepasan cukai TT2026 |
| [/epf-calculator/](https://tool.thebukitbesi.com/epf-calculator/) | English | epf calculator, epf dividend 2025, epf retirement savings |
| [/kalkulator-kwsp/](https://tool.thebukitbesi.com/kalkulator-kwsp/) | Bahasa Melayu | kalkulator kwsp, dividen kwsp, simpanan persaraan |
| [/home-loan-calculator-malaysia/](https://tool.thebukitbesi.com/home-loan-calculator-malaysia/) | English | home loan calculator malaysia, loan calculator, stamp duty, DSR |
| [/kalkulator-pinjaman-perumahan/](https://tool.thebukitbesi.com/kalkulator-pinjaman-perumahan/) | Bahasa Melayu | kalkulator pinjaman perumahan, kalkulator loan rumah, duti setem |
| [/car-loan-calculator-malaysia/](https://tool.thebukitbesi.com/car-loan-calculator-malaysia/) | English | car loan calculator malaysia, flat rate to EIR, Rule of 78 |
| [/kalkulator-loan-kereta/](https://tool.thebukitbesi.com/kalkulator-loan-kereta/) | Bahasa Melayu | kalkulator loan kereta, pinjaman kereta, EIR |
| [/cgpa-to-percentage/](https://tool.thebukitbesi.com/cgpa-to-percentage/) | English | cgpa to percentage (+ VTU, AKTU, SPPU, GTU, MAKAUT, Mumbai, CBSE variants) |
| [/cgpa-calculator/](https://tool.thebukitbesi.com/cgpa-calculator/) | English | cgpa calculator, sgpa to cgpa, gpa calculator malaysia |

Both pages share one tested calculation core (`assets/js/salary-core.js`):
EPF from the KWSP Third Schedule bands, SOCSO / EIS / LINDUNG 24 Jam from
PERKESO's RM100 bands with the RM6,000 ceiling, and PCB from LHDN's
computerised method. The build renders the first result, the worked example
and the salary table into the HTML, so the page is complete before any script
runs. They are linked as `hreflang` pairs, carry WebApplication, BreadcrumbList
and FAQPage JSON-LD, cite their official sources and work offline.

**Yearly upkeep (EPF):** when the dividend is announced (February/March), add it to `DIVIDENDS` in `epf-core.js`, update `FACTS.latest`, `latestYear`, `verified` and the expectations in `tools-src/tests/epf.test.mjs`.

**Upkeep (home loan):** after each OPR change, Budget or SRO revision, update `FACTS` in `loan-core.js` (`opr`, `oprSince`, `defaultRate`, stamp duty, legal fee bands, first-home rules, `verified`) and `tools-src/tests/loan.test.mjs`. When the Finance Act 2027 passes, relabel the Budget 2027 first-home option.

**Upkeep (car loan):** `carloan-core.js` models both the reducing-balance EIR method (Hire-Purchase (Amendment) Act, from 1 June 2026) and older flat-rate / Rule of 78 agreements. After 31 March 2027 (end of the transition) review the page copy; update `FACTS.defaultRate` when typical offers move.

**Share buttons:** every page with an `app` block gets a share bar (WhatsApp, Telegram, Facebook, X, copy link, device share sheet) before the bottom ad, and a "Share result" button in its `.tool-actions`. Plain links and one small inline script; no third-party code.

**Yearly upkeep (tax):** after each Budget, add the new year to `YEARS` in `tax-core.js` (bands, individual relief) and update relief limits, labels in `build.mjs` (`TAX_LABELS`) and `tools-src/tests/tax.test.mjs`. When the Finance Act passes, drop the `proposal` flag.

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
tools-src/build.mjs         writes the whole public site to docs/ (pages, bundles, crawl files, manifest, sw.js, assets)
tools-src/validate.mjs      fails the deploy on SEO, schema, accessibility-attribute or PWA drift
tools-src/tests/            unit tests for calculation cores (node --test)
tools-src/images.mjs        renders the social card and PWA screenshots (Playwright)
assets/js/salary-*.js       salary calculator core and UI (bundled to docs/assets/js/salary.js)
assets/js/tax-core.js       annual income tax: YA2026 rules and the Budget 2027 (YA2027) proposal
assets/js/epf-core.js       EPF projection: Third Schedule contributions, 75/15/10 split, dividend method, RIA benchmarks
assets/js/loan-core.js      home loan: instalment, amortisation, stamp duty, SRO 2023 legal fees, first-home exemption, DSR
assets/js/carloan-core.js   car loan: EIR / flat rate, conversion, Rule of 78 settlement
assets/js/grade-core.js     CGPA maths shared by cgpa-ui.js and cgpa-percent-ui.js (bundled per page)
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

**Publishing:** `docs/` is the complete public site and is committed. GitHub
Pages serves it directly: **Settings → Pages → Build and deployment → Source:
"Deploy from a branch" → Branch: `main` → Folder: `/docs` → Save.** No Actions
minutes or billing are involved. After changing any source file, run the build
and commit `docs/` with it.

The `Check site` workflow runs the tests, build and validator on pull requests
and pushes, fails if `docs/` is out of date, and pings IndexNow after a push to
`main`. Update `dateModified` in `site.json` when published content changes.
Set `live: true` only after a tool's page returns HTTP 200. Never edit files in
`docs/` by hand; they are overwritten on every build.

The `CNAME` file and the `origin` in `site.json` must match; the build checks
this and copies `CNAME` into `docs/`. See [the domain migration](documentation/domain-migration.md).

## More documentation

- [SEO and performance audit](documentation/seo-audit.md)
- [PWA and offline behaviour](documentation/pwa.md)
- [Tool discovery report](documentation/tool-discovery.md)
- [Domain migration](documentation/domain-migration.md)

## License

Copyright © The Bukit Besi. All rights reserved. The code and content are proprietary; see [LICENSE](LICENSE). No permission is given to copy, host or adapt them.
