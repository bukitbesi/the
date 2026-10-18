# The Bukit Besi Tools: working rules

Owner: solo Malaysian publisher, AdSense-funded, limited budget. Every tool on tool.thebukitbesi.com must ship complete:
correct maths, SEO/E-E-A-T/AEO/LLM-ready content, and top Core Web Vitals. Never ship a half-done tool.

## Definition of done for every tool

1. **Verified facts.** Rates, laws and thresholds checked against at least two sources (official first: LHDN, KWSP, PERKESO,
   JPJ, BNM, JTKSM, PNB/ASNB). Conflicting figures are left out and stated on the page, never guessed. Each core has
   `FACTS.verified` (ISO date) and the page shows it ("Rules verified …").
2. **Tested core.** Maths in `assets/js/<name>-core.js` (UMD: `module.exports` for Node, `window.TBB<Name>` in the
   browser), unit tests in `tools-src/tests/<name>.test.mjs` with worked examples that match the FAQ numbers.
3. **UI.** `assets/js/<name>-ui.js`, vanilla JS IIFE, live results on input, state in the URL hash, print button,
   `aria-live` summary. Bundle registered in `bundles` in `tools-src/build.mjs`.
4. **Build-time render.** A `RENDERERS` entry in `build.mjs` fills the first result, tables and examples into the HTML,
   so the page is complete before any script runs (crawlable, zero layout shift).
5. **English + Bahasa Melayu pair** (`tools-src/pages/<en-slug>.html` and `<bm-slug>.html`) linked with `alternates`
   (hreflang). Slugs and titles target the real search phrase in each language.
6. **Page content (AEO/LLM):** answer-first `.answer` paragraph with the key number in the first sentence; worked
   example; data tables generated from the core; "how it works" steps; sources list with links; disclaimer callout;
   7 FAQs whose answers are self-contained and quote exact figures; related tools (EN→EN, BM→BM).
7. **Front matter:** `title` ≤ 70 characters after HTML escaping (avoid `&`), `description` ≤ 160, `llms` (one dense
   factual paragraph for llms.txt), `about`, `app` (WebApplication schema), `citations`, `faq` (FAQPage schema),
   `breadcrumb`, `datePublished`/`dateModified`.
8. **Catalog:** record in `tools-src/tools.json` (`live: true`), unique icon in `tools-src/icons.mjs`, README row and
   upkeep note, links added from related existing pages.
9. **Checks before push:** `node --test tools-src/tests/*.test.mjs`, `node tools-src/build.mjs`,
   `node tools-src/validate.mjs`, Playwright at 390 px (inputs work, no overflow, no console errors), Lighthouse
   mobile 100/100/100/100 with CLS 0. Commit `docs/` with the sources.

## Rules

- White-hat, AdSense-safe only. No doorway pages: no near-duplicate "bank-specific" or "state-specific" clones unless
  each page carries genuinely different verified data.
- Don't cannibalise: check `tools.json` and existing pages before adding a tool that overlaps (e.g. DSR lives in the
  home loan calculator; zakat lives on the main blog).
- No frameworks, no third-party scripts on tool pages, system fonts, inline SVG. Keep pages static and light.
  The one exception is Google Tag Manager (`gtm` in `site.json`), lazy-loaded by the layout after Consent Mode
  defaults; add GA4 and other tags inside GTM, never as page scripts.
- Never edit `docs/` by hand; it is generated.
- Yearly upkeep items are listed in README.md; update them when budgets, rates or laws change.
