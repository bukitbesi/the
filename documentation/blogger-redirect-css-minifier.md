# Redirect the old Blogger CSS Minifier page

The Blogger page `https://www.thebukitbesi.com/p/css-minifier-tool.html` is replaced by the
hosted tool, which loads without the blog theme, header, sidebar or footer and passes Core Web
Vitals on its own:

| Old URL | New URL |
| --- | --- |
| `/p/css-minifier-tool.html` | `https://tool.thebukitbesi.com/css-minifier/` |

Blogger cannot send a server-side 301 to another host. An instant meta refresh is the closest
equivalent; Google treats a zero-second meta refresh as a permanent redirect.

## Steps

1. **Blogger → Theme → ⋮ → Backup** (download a copy first).
2. **Theme → Customise → Edit HTML.** Find `<head>` and paste this directly after it. If the
   parcel-tracking redirect is already there, paste this block under it:

```xml
<b:if cond='data:blog.canonicalUrl == "https://www.thebukitbesi.com/p/css-minifier-tool.html"'>
<meta content='0; url=https://tool.thebukitbesi.com/css-minifier/' http-equiv='refresh'/>
<script>location.replace("https://tool.thebukitbesi.com/css-minifier/");</script>
</b:if>
```

   `canonicalUrl` ignores `?m=1`, so the mobile version redirects too. No other page is affected.
3. **Save**, then open the old URL in a private window: it should land on the new page at once.
4. **Edit the old page itself** (Pages → CSS Minifier) and replace its body with one line, for
   visitors whose browser blocks the refresh:
   `This tool has moved: <a href="https://tool.thebukitbesi.com/css-minifier/">CSS Minifier</a>.`
   Keep the page published; deleting it would turn old links into 404s.
5. **Search Console**: in the `thebukitbesi.com` property, URL Inspection → the old URL → Request
   indexing. In the `tool.thebukitbesi.com` property, request indexing for `/css-minifier/`.
6. Replace internal links on the blog (menus, sidebar, posts, the tools hub page) that point to the
   old URL with the new one, so link equity no longer depends on the redirect.
