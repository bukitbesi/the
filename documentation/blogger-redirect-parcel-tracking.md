# Redirect the old Blogger tracking page

The old page `https://www.thebukitbesi.com/p/semak-tracking-semua-kurier-di-malaysia.html`
is replaced by the hosted tracker. Its content is Bahasa Melayu, so it redirects to the
Bahasa Melayu page, which links to the English one with hreflang:

| Old URL | New URL |
| --- | --- |
| `/p/semak-tracking-semua-kurier-di-malaysia.html` | `https://tool.thebukitbesi.com/semak-tracking-parcel/` |

Blogger cannot send a server-side 301 to another host. An instant meta refresh is the
closest equivalent; Google treats a zero-second meta refresh as a permanent redirect.

## Steps

1. **Blogger → Theme → ⋮ → Backup** (download a copy first).
2. **Theme → Customise → Edit HTML.** Find `<head>` and paste this directly after it:

```xml
<b:if cond='data:blog.canonicalUrl == "https://www.thebukitbesi.com/p/semak-tracking-semua-kurier-di-malaysia.html"'>
<meta content='0; url=https://tool.thebukitbesi.com/semak-tracking-parcel/' http-equiv='refresh'/>
<script>location.replace("https://tool.thebukitbesi.com/semak-tracking-parcel/");</script>
</b:if>
```

   `canonicalUrl` ignores `?m=1`, so the mobile version redirects too. No other page is affected.
3. **Save**, then open the old URL in a private window: it should land on the new page at once.
4. **Edit the old page itself** (Pages → the tracking page) and replace its body with one line,
   for visitors whose browser blocks the refresh:
   `Alat ini telah dipindahkan: <a href="https://tool.thebukitbesi.com/semak-tracking-parcel/">Semak Tracking Parcel</a>.`
   Keep the page published; deleting it would turn old links into 404s.
5. **Search Console** (property `thebukitbesi.com`): URL Inspection → the old URL → Request indexing.
   Then in the `tool.thebukitbesi.com` property, request indexing for
   `/parcel-tracking-malaysia/` and `/semak-tracking-parcel/`.
6. Replace any internal links on the blog (menus, sidebar, posts) that point to the old URL with
   the new one, so link equity no longer depends on the redirect.

## After deployment: click-test courier links

The tracker links to each courier's own site. Courier sites change URLs without notice, so after
each deploy (and every few months) open `/parcel-tracking-malaysia/`, enter a real tracking number
for each courier you have, and check the page opens. If a link breaks, update `home` or `track` for
that courier in `assets/js/tracking-core.js` and the `verified` date in `FACTS`, then rebuild.
