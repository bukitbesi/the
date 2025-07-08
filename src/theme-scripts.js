/**
 * Theme Scripts for The Bukit Besi Blog
 * Version: 3.0 (All Features)
 * Includes: PWA Logic, Dark Mode, Auto TOC, WebP Images
 */

// --- UTILITY FUNCTIONS ---
function convertToWebP(url) {
    if (!url || url.includes('-rw')) return url;
    // Handles Blogger's specific image URLs
    if (url.includes('googleusercontent.com/img/b/')) {
        return url + '-rw';
    }
    return url;
}

// --- CORE LOGIC (RUNS ON DOM CONTENT LOADED) ---
document.addEventListener("DOMContentLoaded", function () {

    // --- Dark Mode Initialization ---
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    let currentTheme = localStorage.getItem('theme');

    // Set initial theme based on localStorage or OS preference
    if (currentTheme === 'dark' || (!currentTheme && prefersDark.matches)) {
        document.body.classList.add('dark-mode');
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
    }

    // --- General Site Initializations ---
    const currentYearEl = document.getElementById("current-year");
    if (currentYearEl) currentYearEl.textContent = new Date().getFullYear();

    const toTopButton = document.querySelector(".simplifytotop");
    if (toTopButton) {
        window.addEventListener("scroll", () => {
            window.scrollY > 400 ? toTopButton.classList.add("arlniainf") : toTopButton.classList.remove("arlniainf");
        });
        toTopButton.addEventListener("click", e => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            e.preventDefault();
        });
    }
    
    document.querySelectorAll("#PopularPosts1 img, .recent_posts_arlina img").forEach(img => {
        img.src = img.src.replace(/s\B\d{2,4}/, "s90-c");
        img.setAttribute('loading', 'lazy');
    });

    // --- Automatic Table of Contents (Post Pages Only) ---
    if (document.body.classList.contains('post-view')) {
        const tocContainer = document.getElementById('toc-container');
        const postBody = document.querySelector('.post-body');
        if (tocContainer && postBody) {
            const headings = postBody.querySelectorAll('h2, h3');
            if (headings.length >= 2) {
                let tocHTML = '<div id="toc-title">Table of Contents</div><ul class="toc-list">';
                headings.forEach((h, index) => {
                    const level = h.tagName.toLowerCase() === 'h2' ? '1' : '2';
                    const id = h.id || `toc-heading-${index}`;
                    h.id = id; // Ensure heading has an ID to link to
                    tocHTML += `<li class="toc-level-${level}"><a href="#${id}">${h.textContent}</a></li>`;
                });
                tocHTML += '</ul>';
                tocContainer.innerHTML = tocHTML;

                // Make TOC collapsible
                document.getElementById('toc-title').addEventListener('click', () => {
                    tocContainer.classList.toggle('toc-collapsed');
                });
            }
        }
    }

    // --- Breaking News Ticker ---
    const breakingNewsScript = document.createElement("script");
    breakingNewsScript.src = "/feeds/posts/default?alt=json-in-script&max-results=10&callback=breakingNewsCallback";
    document.body.appendChild(breakingNewsScript);
    window.breakingNewsCallback = function (json) {
        const container = document.getElementById("recentbreaking");
        if (!container) return;
        const entries = json.feed.entry;
        if (entries && entries.length > 0) {
            let listHtml = "<ul>";
            entries.forEach(function (entry) {
                let link = entry.link.find(l => l.rel === "alternate").href;
                listHtml += `<li><a href="${link}" target="_blank">${entry.title.$t}</a></li>`;
            });
            listHtml += "</ul>";
            container.innerHTML = listHtml;
            const ul = container.querySelector("ul");
            if (ul) {
                setInterval(() => {
                    const firstItem = ul.querySelector("li:first-child");
                    if (firstItem) ul.appendChild(firstItem);
                }, 5000);
            }
        } else {
            container.innerHTML = "<span>No recent news.</span>";
        }
    };
});


// --- PROCEDURAL SCRIPTS FOR BLOGGER FEEDS (Run as they are parsed) ---

// Featured Post Slider Script (with WebP)
var imgr = ["https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiPQfqfnJDqT3Dd0aCf7X0-CcaXPzEgG9AVb2pTSEfJ1xOWySeTFxL_i-MqdCwq5xvvHb2q_bNZFIAuwaXJTl47OWF6o4JkNoVq4A68OKiBBTiBJ8KByDnUovGC3uWtUjMg5YwQPQKCPJ4/s1600/no-thumbnail.png-rw"];
var showRandomImg = !0, numposts1 = 10, featured_numpost = "3";
function sliderpost(json) {
    let html = '';
    let maxpost = Math.min(numposts1, json.feed.entry.length);
    for (let i = 0; i < maxpost; i++) {
        const entry = json.feed.entry[i];
        if (!entry) break;
        const posttitle = entry.title.$t;
        const posturl = entry.link.find(link => link.rel === 'alternate').href;
        const postlabel = entry.category[0].term;
        let postimg = ("media$thumbnail" in entry) ? convertToWebP(entry.media$thumbnail.url) : imgr[0];
        
        if (i === 0) {
            html += `<div class="main-post col-post"><a href="${posturl}"><span class="lebb">${postlabel}</span><span class="vignette"></span><img loading="lazy" src="${postimg}" height="350" width="640" alt="${posttitle}"/></a><header><h3 class="entry-title"><a href="${posturl}" title="${posttitle}">${posttitle}</a></h3></header></div>`;
        } else {
            html += `<div class="ripplelink secondary-post col-post"><span class="lebb">${postlabel}</span><span class="vignette"></span><a class="hover_play_small" href="${posturl}"><img loading="lazy" src="${postimg}" height="200" width="320" alt="${posttitle}"/></a><header><h4><a href="${posturl}">${posttitle}</a></h4></header></div>`;
        }
    }
    document.write(html);
}


// Related Posts Script (with WebP)
var relnojudul = 0, relmaxtampil = 6, reljudul = [], relurls = [], relgambar = [];
function relpostimgcuplik(e) {
    for (var t = 0; t < e.feed.entry.length; t++) {
        var r = e.feed.entry[t];
        reljudul[relnojudul] = r.title.$t;
        var l;
        "media$thumbnail" in r ? l = convertToWebP(r.media$thumbnail.url.replace(/\/s[0-9]+(\-c)?\//, "/w720-h720-c/")) : l = "https://1.bp.blogspot.com/-htG7vy9vIAA/Tp0KrMUdoWI/AAAAAAAABAU/e7XkFtErqsU/s1600/grey.GIF";
        relgambar[relnojudul] = l;
        for (var n = 0; n < r.link.length; n++) if ("alternate" == r.link[n].rel) { relurls[relnojudul] = r.link[n].href; break }
        relnojudul++;
    }
}
function contains(e, t) { for (var r = 0; r < e.length; r++) if (e[r] == t) return !0; return !1 }
function artikelterkait() {
    for (var e = [], t = [], r = [], n = 0; n < relurls.length; n++) contains(e, relurls[n]) || (e.push(relurls[n]), t.push(reljudul[n]), r.push(relgambar[n]));
    reljudul = t, relurls = e, relgambar = r;
    // Fisher-Yates shuffle
    for (let i = reljudul.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [reljudul[i], reljudul[j]] = [reljudul[j], reljudul[i]];
        [relurls[i], relurls[j]] = [relurls[j], relurls[i]];
        [relgambar[i], relgambar[j]] = [relgambar[j], relgambar[i]];
    }
    var l = "", u = 0;
    for (var i = 0; i < reljudul.length && u < relmaxtampil; i++) {
        if (relurls[i] !== document.URL) {
            l += "<li><a href='" + relurls[i] + "' rel='nofollow' target='_top' title='" + reljudul[i] + "'><div class='overlayb'><img loading='lazy' src='" + relgambar[i] + "'/></div></a><div class='overlaytext'><a class='relinkjdulx' href='" + relurls[i] + "' target='_top'>" + reljudul[i] + "</a></div></li>";
            u++;
        }
    }
    document.write(l);
}
