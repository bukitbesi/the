# Redirect moved Blogger pages to tool.thebukitbesi.com

Every tool that moves from the blog to this site gets `"bloggerFrom"` (its old Blogger URL) in
its page front matter. The build then writes **one** block for the Blogger theme,
[`blogger-redirects.xml`](blogger-redirects.xml), covering every moved page. The theme only ever
holds that single block, however many tools move.

Blogger cannot send a server-side 301 to another host. An instant meta refresh is the closest
equivalent; Google treats a zero-second meta refresh as a permanent redirect. The `b:switch` runs
on Blogger's servers, so every other blog page gets no extra code at all.

## First time (replaces any older redirect blocks)

1. **Blogger → Theme → ⋮ → Backup** (download a copy first).
2. **Theme → Customise → Edit HTML.** Delete any older single-page redirect blocks
   (`<b:if cond='data:blog.canonicalUrl == …'>` … `</b:if>`) right after `<head>`.
3. Paste the whole of [`blogger-redirects.xml`](blogger-redirects.xml) directly after `<head>`, then **Save**.

## Each time another tool moves

1. Add `"bloggerFrom"` to the new page, run `node tools-src/build.mjs` (CI fails if the file is stale)
   and merge.
2. In **Edit HTML**, search for `TBB tool redirects START`, select everything from that line down to
   `TBB tool redirects END`, and paste the new contents of `blogger-redirects.xml` over it. **Save.**
   If Blogger removed the comments when saving, select from `<b:switch var='data:blog.canonicalUrl'>`
   to `</b:switch>` instead.

## Checks after each move

- Open the old URL in a private window: it should land on the new page at once. `canonicalUrl`
  ignores `?m=1`, so the mobile version redirects too.
- **Edit the old Blogger page** and replace its body with one line for browsers that block the
  refresh, for example
  `This tool has moved: <a href="https://tool.thebukitbesi.com/css-minifier/">CSS Minifier</a>.`
  Keep the page published; deleting it turns old links into 404s.
- **Search Console**: in the `thebukitbesi.com` property, URL Inspection → old URL → Request
  indexing. In the `tool.thebukitbesi.com` property, request indexing for the new page.
- Replace internal blog links (menus, sidebar, posts, the tools hub page) that point to the old URL.

## Why not Blogger's own "Custom redirects"?

**Settings → Errors and redirects → Custom redirects** only accepts paths on the same blog
(`/p/old.html` → `/p/new.html`), so it cannot send visitors to `tool.thebukitbesi.com`.
