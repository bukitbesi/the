# Domain migration: the.thebukitbesi.com → tool.thebukitbesi.com

The directory was first published on `the.thebukitbesi.com` by mistake. The
canonical host is now **`https://tool.thebukitbesi.com/`**. Every generated
file (canonical tag, Open Graph, JSON-LD `@id`s, sitemap, robots.txt,
llms.txt, manifest, IndexNow key location) reads the host from
`tools-src/site.json`, and the build fails if `CNAME` disagrees.

## 1. Point DNS at GitHub Pages

At the DNS provider for `thebukitbesi.com`, add:

| Type | Name | Value |
| --- | --- | --- |
| CNAME | `tool` | `bukitbesi.github.io` |

## 2. Set the custom domain in GitHub

This repo deploys with GitHub Actions, so GitHub **ignores the `CNAME` file**
for routing. Set it manually:

1. Repo **Settings → Pages → Custom domain** → `tool.thebukitbesi.com` → Save.
2. Wait for the DNS check, then tick **Enforce HTTPS**.
3. Optional but recommended: verify `thebukitbesi.com` under
   **GitHub profile Settings → Pages → Verified domains** to block subdomain
   takeover of unused hosts.

## 3. Redirect the old host (done)

`the.thebukitbesi.com` is redirected at Namecheap with a **301 (permanent)**
URL Redirect record to `https://tool.thebukitbesi.com/`. No GitHub repository
serves the old host any more. Check that it keeps working:

- `http://the.thebukitbesi.com/` and `https://the.thebukitbesi.com/` both
  return 301 to the new host. If the HTTPS form shows a certificate error,
  Namecheap is not covering HTTPS for the redirect; move DNS to Cloudflare
  and use a Redirect Rule instead.
- A deep link such as `http://the.thebukitbesi.com/#tools` lands on the new
  directory.

PWA installs are tied to the origin. Anyone who installed the app from the old
host must install it again from `tool.thebukitbesi.com`.

## 4. Search Console and Bing

1. Add a **Domain property** for `thebukitbesi.com` (DNS TXT verification)
   so both subdomains are covered, or a URL-prefix property for
   `https://tool.thebukitbesi.com/`.
2. Submit `https://tool.thebukitbesi.com/sitemap.xml` and request indexing
   of the home page in URL Inspection.
3. In Bing Webmaster Tools, import from Search Console. Each deployment also
   pings IndexNow (see `.github/workflows/deploy.yml`), which reaches Bing and
   the Bing-backed answers in ChatGPT search and Copilot.
4. Google's *Change of Address* tool works only for root domains, not
   subdomains; the redirect in step 3 does that job here.

## 5. Update links you control

- Blogger theme / navigation and any posts linking to `the.thebukitbesi.com`.
- Social profiles and bio links.
- The GitHub repo **About → Website** field.
