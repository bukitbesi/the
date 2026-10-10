# Blogger tool discovery

Checked 6 October 2026. This update expands `tool.html`; tool destinations
remain on Blogger. No Blogger pages were changed or deleted, and no migration
or deployment was performed.

## Findings

Fetched every URL in the blog's
[static-page sitemap](https://www.thebukitbesi.com/sitemap-pages.xml):
58 pages returned HTTP 200. Reviewed page titles, canonical URLs, robots
metadata and the individual tool interfaces. Forty-eight pages are individual
tools and have matching canonical URLs with indexing allowed in their robots
metadata. Ten other pages are directories or publisher/support pages.

The old catalog had guessed or outdated paths for eleven tools that exist at
different live URLs. Those records now point to their actual pages. Twenty-eight
additional tool pages were added. Sixteen unverified/unpublished catalog
records remain excluded from the generated directory.

All 48 published cards now have a distinct, named inline SVG icon. These need
no external icon fonts, scripts or image downloads. Tool counts, category
counts, metadata, ItemList structured data and `llms.txt` regenerate from the
same catalog. The subdomain's sitemap still lists only its directory page;
the Blogger tool URLs belong in the Blogger sitemap until they are migrated.

## Search visibility limitations

An authenticated Ubersuggest `domain_top_pages` report for `thebukitbesi.com`
returned two article records and no tool-page records. It supplied no ranking
positions for these tools. This is insufficient coverage, not proof that the
tools are absent from Google.

Public web search queries returned these five tool destinations:

- [GitHub Link Converter](https://www.thebukitbesi.com/p/github-link-converter.html)
- [HTML Beautifier & Minifier](https://www.thebukitbesi.com/p/html-beautifier-online.html)
- [AI Art Prompt Generator](https://www.thebukitbesi.com/p/ai-art-prompt-optimizer-create-perfect.html)
- [TM Unifi Speed Test](https://www.thebukitbesi.com/p/tm-speed-test.html)
- [Kalkulator Zakat](https://www.thebukitbesi.com/p/kalkulator-zakat.html)

The other 43 tool pages were verified live by direct fetch, but their search
appearances remain unverified. The directory includes all live tools, including
the five observed in public search; it does not label the others as ranked.
Public search results do not establish current Google positions. Exact Google
impressions, queries and positions require Search Console performance data.

## Verification

- `node tools-src/build.mjs` and `node tools-src/validate.mjs` passed.
- Every published URL returned HTTP 200 with a matching canonical and no
  `noindex` directive during the scan.
- Every card has its own icon key and distinct SVG artwork; build validation
  rejects missing or reused published icon keys.
- Browser checks passed for all seven category filters, 48 visible links and
  icons, no-JavaScript access, no mobile horizontal overflow and no page errors.
- New mobile Lighthouse check: 100 performance, 100 accessibility, 100 best
  practices, 100 SEO; LCP 1.13 s, TBT 4 ms, CLS 0. Local measurements exclude
  production server latency and do not measure real-user INP.

The complete per-URL verification record, search observation flags and excluded
pages are in [tool-discovery.json](tool-discovery.json).
