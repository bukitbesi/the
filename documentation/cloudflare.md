# Cloudflare

`thebukitbesi.com` uses Cloudflare DNS (Free plan). Only `tool.thebukitbesi.com` (GitHub Pages) and the retired
`the.thebukitbesi.com` (redirect only) are proxied (orange cloud). `www` (Blogger) and the root domain stay DNS-only
(grey cloud).

Run `node tools-src/edge-check.mjs` after any Cloudflare or Blogger change. It checks every host, redirect, robots.txt,
sitemap and ads.txt with search and AI crawler user-agents and exits non-zero on a problem.

## Why Blogger (www) stays grey-cloud

Proxying Blogger gains almost nothing and risks the main revenue site:

- Google already serves Blogger from its own edge (server `GSE`), so Cloudflare adds a second hop, not speed.
- Blogger HTML is dynamic (comments, `?m=1` mobile redirect, AdSense); caching it at the edge serves stale or wrong pages.
- Blogger's free SSL certificate renews only while `www` resolves straight to `ghs.googlehosted.com`. Behind the orange
  cloud the renewal fails, and "Full (strict)" then breaks the whole site.
- Blogger already does the right redirects (checked 2026-11-14): `thebukitbesi.com/*` → `https://www.thebukitbesi.com/*`
  with path and query kept (301), and `http://www` → `https://www` (301).

The only Blogger-side fix is its robots.txt (see the last section).

## DNS records

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | `tool` | `bukitbesi.github.io` (GitHub Pages) | Proxied |
| AAAA | `the` | `100::` (placeholder; the Redirect Rule answers) | Proxied |
| CNAME | `www` | `ghs.googlehosted.com` | DNS only |
| A | `@` | `216.239.32.21`, `216.239.34.21`, `216.239.36.21`, `216.239.38.21` (four records) | DNS only |
| CNAME | Blogger verification name | `gv-….dv.googlehosted.com` | DNS only |

Blogger → Settings → Publishing → "Redirect domain" must be on, so the root domain redirects to `www`.

`the.thebukitbesi.com` stopped resolving when DNS moved from Namecheap to Cloudflare (the Namecheap URL Redirect record
did not move). Any backlinks or old index entries on that host are dead until the `AAAA the` record and the Redirect
Rule below exist.

## Settings for the zone (dashboard paths as of November 2026)

### SSL/TLS

- Encryption mode: **Full (strict)** (GitHub Pages has a valid certificate; grey-cloud hosts are not affected).
- Edge Certificates: **Always Use HTTPS on**, **Automatic HTTPS Rewrites on**, minimum TLS **1.2**.
- HSTS: leave off in Cloudflare. GitHub Pages already sends it for `tool`, and a zone-wide `includeSubDomains` would
  pin `www` to whatever Blogger does.

### Bots and AI crawlers: the cause of "robots.txt 403"

These features answer real crawler IPs with 403 (or a challenge, which crawlers also report as 403). They do not show
up when you test with `curl`, because they key on the crawler's verified IP, not the user-agent.

| Setting | Where | Value |
|---|---|---|
| Bot Fight Mode | Security → Settings → Bot traffic (older dashboard: Security → Bots) | **Off**. On the Free plan it cannot be skipped by any rule and blocks SEO auditors, Bing tools and some AI fetchers. |
| Block AI bots | Security → Settings, or AI Crawl Control | **Do not block (allow crawlers)** |
| AI Crawl Control → Crawlers | AI Crawl Control | Every crawler **Allow**; Pay per crawl off |
| AI Labyrinth | Security → Settings | **Off** |
| Managed robots.txt | Security → Settings, or AI Crawl Control → Robots.txt | **Off**. The repo generates `robots.txt`; the managed version would prepend AI `Disallow` lines. |
| Browser Integrity Check | Security → Settings | Off, or covered by the skip rule below. It 403s clients with missing or unusual headers. |
| Security Level / Challenge Passage | Security → Settings | Essentially Off / default |
| Under Attack Mode | Overview | Off |

### WAF custom rule: never challenge crawler files

Security → Security rules → Create rule → Custom rule:

- Name: `allow-crawler-files`
- Expression (Edit expression):

  ```
  (http.host eq "tool.thebukitbesi.com" and http.request.uri.path in {"/robots.txt" "/sitemap.xml" "/llms.txt" "/ads.txt" "/9d56c171df1cfe0535b521f4e72344ea.txt"})
  ```

- Action: **Skip** → tick all remaining custom rules, all rate limiting rules, all managed rules, all Super Bot Fight
  Mode rules; under More settings tick Browser Integrity Check, Security Level and Hotlink Protection.
- Place it **first**.

If you ever add a block/challenge rule (country, ASN, etc.), add `and not cf.client.bot` to it so verified search and
AI crawlers pass.

### Redirect Rule: retired host

Rules → Redirect Rules → Create rule (Single Redirect):

- Name: `the-to-tool`
- When: Hostname equals `the.thebukitbesi.com`
- Then: Dynamic, expression `concat("https://tool.thebukitbesi.com", http.request.uri.path)`, status **301**,
  **Preserve query string** on.

### Speed and caching (tool host only)

- Cache Rule `tool-cache-all`: hostname equals `tool.thebukitbesi.com` → Eligible for cache, Edge TTL 1 day,
  Browser TTL: respect origin. The purge workflow below clears it after every deploy.
- **Rocket Loader off** (rewrites inline scripts; hurts INP/CLS). **Email Obfuscation off** (injects a script on pages
  with email addresses). **Auto Minify** no longer exists; the build minifies.
- Brotli, HTTP/3, Early Hints: on. Speed Brain (speculation rules) can stay on.
- Always Online: off (serves stale tool pages with old rates).

## Cache purge on deploy

`.github/workflows/cloudflare-purge.yml` purges `tool.thebukitbesi.com` after every Pages deploy, including the scheduled
gold/fuel/solat updates.

One-time setup:

1. Cloudflare → My Profile → API Tokens → Create Token → "Create Custom Token".
   Permissions: **Zone → Cache Purge → Purge**. Zone Resources: **Include → Specific zone → thebukitbesi.com**.
   Create and copy the token (it is shown once).
2. Cloudflare → thebukitbesi.com → Overview → right column → copy **Zone ID**.
3. GitHub → this repo → Settings → Secrets and variables → Actions → New repository secret:
   `CLOUDFLARE_API_TOKEN` (the token) and `CLOUDFLARE_ZONE_ID` (the Zone ID).
4. Actions → "Purge Cloudflare cache" → Run workflow, and check that the log says `Cloudflare cache purged.`

Without the secrets the workflow logs a warning and skips the purge; it never fails the deploy.

## After changing settings

1. Caching → Configuration → **Purge Everything** (robots.txt can sit at the edge for a day).
2. `node tools-src/edge-check.mjs`.
3. Search Console → Settings → robots.txt → open the report → "Request a recrawl" for each host listed.
4. Bing Webmaster Tools → robots.txt tester → fetch `https://tool.thebukitbesi.com/robots.txt`.
5. Security → Events (filter host `tool.thebukitbesi.com`, path `/robots.txt`): no Block or Challenge rows after the change.

## Blogger robots.txt (www): recommended

Blogger → Settings → Crawlers and indexing → Enable custom robots.txt. The current file blocks `Google-Extended`,
`Amazonbot`, `GPTBot`, `ClaudeBot`, `Applebot-Extended`, `meta-externalagent`, `CCBot` and `Bytespider`. That costs
LLM visibility: `Google-Extended` controls whether Gemini apps and Vertex AI grounding may use the pages, and
`Amazonbot` feeds Alexa answers. AI Overviews and ChatGPT search are not affected (they use Googlebot and
OAI-SearchBot). For the AEO/LLM goal, use one policy across both sites:

```
User-agent: *
Allow: /
Disallow: /search
Disallow: /feeds/
Disallow: /*?showComment=

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

Sitemap: https://www.thebukitbesi.com/sitemap.xml
Sitemap: https://www.thebukitbesi.com/sitemap-pages.xml
```

`Bytespider` and `CCBot` stay blocked: they scrape for training and never send traffic or citations.
