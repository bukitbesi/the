(function(){
"use strict";

/* ====== TOOLS DATA ====== */
var tools = [
  {name:"JavaScript Minifier &amp; Obfuscator",desc:"Reduce JS file size by 70% and protect code with advanced obfuscation.",url:"https://www.thebukitbesi.com/p/javascript-minifier-obfuscator.html",cat:"dev",icon:"{ }",iconCls:"t-dev",badge:"popular"},
  {name:"CSS Minifier",desc:"Compress and optimize CSS files instantly. Remove whitespace and comments.",url:"https://www.thebukitbesi.com/p/css-minifier-tool.html",cat:"dev",icon:"#",iconCls:"t-dev",badge:"popular"},
  {name:"HTML Beautifier &amp; Formatter",desc:"Format and beautify raw HTML code for better readability and clean structure.",url:"https://www.thebukitbesi.com/p/html-beautifier.html",cat:"dev",icon:"<>",iconCls:"t-dev",badge:""},
  {name:"HTML Minifier",desc:"Compress HTML by removing unnecessary whitespace, comments, and redundant code.",url:"https://www.thebukitbesi.com/p/html-minifier.html",cat:"dev",icon:"&lt;/&gt;",iconCls:"t-dev",badge:""},
  {name:"Parse HTML Online",desc:"Convert AdSense or any HTML code to XML-compatible code for Blogger.",url:"https://www.thebukitbesi.com/p/parse-html.html",cat:"dev",icon:"⟨⟩",iconCls:"t-dev",badge:""},
  {name:"HTML Table Generator",desc:"Create responsive, accessible HTML tables with custom styles, zebra stripes, sticky headers.",url:"https://www.thebukitbesi.com/p/html-table-generator.html",cat:"dev",icon:"▦",iconCls:"t-dev",badge:"hot"},
  {name:"JSON Validator &amp; Formatter",desc:"Validate, format, and beautify JSON data with syntax highlighting and error detection.",url:"https://www.thebukitbesi.com/p/json-validator.html",cat:"dev",icon:"{}",iconCls:"t-dev",badge:""},
  {name:"JSON Schema Generator",desc:"Auto-generate structured JSON-LD schema markup for SEO and rich snippets.",url:"https://www.thebukitbesi.com/p/json-schema-generator.html",cat:"seo",icon:"📋",iconCls:"t-seo",badge:"new"},
  {name:"Video JSON Schema Generator",desc:"Generate VideoObject JSON-LD schema for video SEO and rich results.",url:"https://www.thebukitbesi.com/p/video-json-schema.html",cat:"seo",icon:"🎬",iconCls:"t-seo",badge:"new"},
  {name:"Parser &amp; Unparser Tool",desc:"Parse JSON, CSV, query strings, INI, Base64, URL encode/decode and more.",url:"https://www.thebukitbesi.com/p/parser-unparser.html",cat:"dev",icon:"⇄",iconCls:"t-dev",badge:"popular"},
  {name:"GitHub Link Converter",desc:"Convert GitHub repository links to raw/CDN-ready URLs for direct file embedding.",url:"https://www.thebukitbesi.com/p/github-link-converter.html",cat:"dev",icon:"🔗",iconCls:"t-dev",badge:""},
  {name:"Robots.txt Generator",desc:"Generate Robots.txt for Blogger &amp; WordPress with built-in tester.",url:"https://www.thebukitbesi.com/p/robots-txt-generator.html",cat:"seo",icon:"🤖",iconCls:"t-seo",badge:""},
  {name:"SEO Keyword Density Checker",desc:"Analyze keyword density to optimize blog posts for #1 rankings.",url:"https://www.thebukitbesi.com/p/keyword-density-checker.html",cat:"seo",icon:"🔍",iconCls:"t-seo",badge:"popular"},
  {name:"Free Keywords Generator",desc:"Generate relevant keyword ideas for content strategy and SEO planning.",url:"https://www.thebukitbesi.com/p/keywords-generator.html",cat:"seo",icon:"🗝️",iconCls:"t-seo",badge:""},
  {name:"Meta Tags Generator",desc:"Create optimized meta title, description, and Open Graph tags for better SEO.",url:"https://www.thebukitbesi.com/p/meta-tags-generator.html",cat:"seo",icon:"🏷️",iconCls:"t-seo",badge:"new"},
  {name:"WebP Image Converter",desc:"Drag and drop JPG, PNG, GIF to instantly convert to optimized WebP format.",url:"https://www.thebukitbesi.com/p/webp-converter.html",cat:"design",icon:"🖼️",iconCls:"t-design",badge:"popular"},
  {name:"Image Format Converter",desc:"Convert images between any format — PNG, JPG, WebP, BMP, GIF and more.",url:"https://www.thebukitbesi.com/p/image-converter.html",cat:"design",icon:"🔄",iconCls:"t-design",badge:""},
  {name:"AI Prompt Generator",desc:"Craft perfect prompts for Midjourney, Stable Diffusion, DALL·E, and GPT models.",url:"https://www.thebukitbesi.com/p/ai-art-prompt-optimizer-create-perfect.html",cat:"ai",icon:"🧠",iconCls:"t-ai",badge:"hot"},
  {name:"AI Image Generator",desc:"Generate stunning AI images with detailed prompts and style controls.",url:"https://www.thebukitbesi.com/p/ai-image-generator.html",cat:"ai",icon:"🎨",iconCls:"t-ai",badge:"new"},
  {name:"Word Counter",desc:"Count words, characters, sentences, paragraphs, and pages instantly.",url:"https://www.thebukitbesi.com/p/word-counter.html",cat:"content",icon:"📝",iconCls:"t-content",badge:""},
  {name:"Text &amp; Character Remover",desc:"Remove specific characters, words, or patterns from any text instantly.",url:"https://www.thebukitbesi.com/p/text-character-remover.html",cat:"content",icon:"✂️",iconCls:"t-content",badge:""},
  {name:"Privacy Policy Generator",desc:"Generate GDPR-compliant privacy policies for your website or app.",url:"https://www.thebukitbesi.com/p/privacy-policy-generator.html",cat:"util",icon:"📜",iconCls:"t-util",badge:""},
  {name:"Lorem Ipsum Generator",desc:"Generate placeholder text in various lengths for design mockups.",url:"https://www.thebukitbesi.com/p/lorem-ipsum-generator.html",cat:"content",icon:"📄",iconCls:"t-content",badge:""},
  {name:"Text to HTML Converter",desc:"Convert plain text with line breaks and formatting into clean HTML code.",url:"https://www.thebukitbesi.com/p/text-to-html.html",cat:"content",icon:"🔀",iconCls:"t-content",badge:""},
  {name:"Markdown to HTML",desc:"Convert Markdown syntax to clean, semantic HTML ready for any CMS.",url:"https://www.thebukitbesi.com/p/markdown-to-html.html",cat:"content",icon:"📑",iconCls:"t-content",badge:""},
  {name:"Base64 Encoder/Decoder",desc:"Encode and decode Base64 strings for data URIs, APIs, and embeds.",url:"https://www.thebukitbesi.com/p/base64-encoder.html",cat:"util",icon:"🔐",iconCls:"t-util",badge:""},
  {name:"URL Encoder/Decoder",desc:"Encode and decode URLs for safe sharing and API parameter passing.",url:"https://www.thebukitbesi.com/p/url-encoder.html",cat:"util",icon:"🌐",iconCls:"t-util",badge:""},
  {name:"Color Palette Generator",desc:"Generate beautiful color palettes and extract hex, RGB, HSL values.",url:"https://www.thebukitbesi.com/p/color-palette-generator.html",cat:"design",icon:"🎨",iconCls:"t-design",badge:""},
  {name:"CSS Gradient Generator",desc:"Create stunning CSS gradients with visual editor and copy-ready code.",url:"https://www.thebukitbesi.com/p/css-gradient-generator.html",cat:"design",icon:"🌈",iconCls:"t-design",badge:"new"},
  {name:"Favicon Generator",desc:"Create favicons in multiple sizes from any image for your website.",url:"https://www.thebukitbesi.com/p/favicon-generator.html",cat:"design",icon:"⭐",iconCls:"t-design",badge:""},
  {name:"QR Code Generator",desc:"Generate customizable QR codes for URLs, text, WiFi, and more.",url:"https://www.thebukitbesi.com/p/qr-code-generator.html",cat:"util",icon:"▣",iconCls:"t-util",badge:""},
  {name:"Slug Generator",desc:"Convert any text to SEO-friendly URL slugs with custom separators.",url:"https://www.thebukitbesi.com/p/slug-generator.html",cat:"seo",icon:"🔗",iconCls:"t-seo",badge:""},
  {name:"Sitemap Generator",desc:"Generate XML sitemaps for better search engine crawling and indexing.",url:"https://www.thebukitbesi.com/p/sitemap-generator.html",cat:"seo",icon:"🗺️",iconCls:"t-seo",badge:""},
  {name:"Open Graph Preview",desc:"Preview how your page looks when shared on Facebook, Twitter, and LinkedIn.",url:"https://www.thebukitbesi.com/p/og-preview.html",cat:"seo",icon:"👁️",iconCls:"t-seo",badge:""},
  {name:"Regex Tester",desc:"Test and debug regular expressions with real-time matching and syntax highlighting.",url:"https://www.thebukitbesi.com/p/regex-tester.html",cat:"dev",icon:".*",iconCls:"t-dev",badge:""},
  {name:"Diff Checker",desc:"Compare two texts side by side and highlight the differences instantly.",url:"https://www.thebukitbesi.com/p/diff-checker.html",cat:"dev",icon:"⟷",iconCls:"t-dev",badge:""}
];

/* ====== RENDER TOOLS ====== */
var grid = document.getElementById("toolsGrid");
function renderTools(filter){
  var filtered = filter === "all" ? tools : tools.filter(function(t){ return t.cat === filter; });
  var html = "";
  for(var i = 0; i < filtered.length; i++){
    var t = filtered[i];
    var badgeHTML = "";
    if(t.badge === "new") badgeHTML = '<span class="tool-card-badge new">New</span>';
    else if(t.badge === "popular") badgeHTML = '<span class="tool-card-badge popular">Popular</span>';
    else if(t.badge === "hot") badgeHTML = '<span class="tool-card-badge hot">Hot</span>';
    html += '<a href="'+t.url+'" class="tool-card reveal reveal-stagger visible delay-'+Math.min(i,8)+'" title="'+t.name+'">'
      + badgeHTML
      + '<div class="tool-icon '+t.iconCls+'">'+t.icon+'</div>'
      + '<h3>'+t.name+'</h3>'
      + '<p>'+t.desc+'</p>'
      + '<span class="tool-link">Use Tool <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>'
      + '</a>';
  }
  grid.innerHTML = html;
  /* Re-trigger reveal for newly added cards */
  var cards = grid.querySelectorAll(".tool-card");
  for(var j = 0; j < cards.length; j++){
    cards[j].classList.remove("visible");
  }
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      var c = grid.querySelectorAll(".tool-card");
      for(var k = 0; k < c.length; k++){
        c[k].classList.add("visible");
      }
    });
  });
}
renderTools("all");

/* ====== FILTER BUTTONS ====== */
var filterBtns = document.querySelectorAll(".filter-btn");
for(var fb = 0; fb < filterBtns.length; fb++){
  filterBtns[fb].addEventListener("click", function(){
    for(var x = 0; x < filterBtns.length; x++){
      filterBtns[x].classList.remove("active");
      filterBtns[x].setAttribute("aria-pressed","false");
    }
    this.classList.add("active");
    this.setAttribute("aria-pressed","true");
    renderTools(this.getAttribute("data-filter"));
  });
}

/* Footer category links */
var catLinks = document.querySelectorAll("[data-filter-link]");
for(var cl = 0; cl < catLinks.length; cl++){
  catLinks[cl].addEventListener("click", function(e){
    var f = this.getAttribute("data-filter-link");
    for(var x = 0; x < filterBtns.length; x++){
      filterBtns[x].classList.remove("active");
      filterBtns[x].setAttribute("aria-pressed","false");
      if(filterBtns[x].getAttribute("data-filter") === f){
        filterBtns[x].classList.add("active");
        filterBtns[x].setAttribute("aria-pressed","true");
      }
    }
    renderTools(f);
  });
}

/* ====== NAVBAR SCROLL ====== */
var navbar = document.getElementById("navbar");
function handleScroll(){
  var st = window.pageYOffset || document.documentElement.scrollTop;
  if(st > 50) navbar.classList.add("scrolled");
  else navbar.classList.remove("scrolled");
}

/* ====== BACK TO TOP ====== */
var backTop = document.getElementById("backTop");
function handleBackTop(){
  var st = window.pageYOffset || document.documentElement.scrollTop;
  if(st > 600) backTop.classList.add("show");
  else backTop.classList.remove("show");
}
backTop.addEventListener("click", function(){
  window.scrollTo({top:0,behavior:"smooth"});
});

/* ====== MOBILE MENU ====== */
var mobileToggle = document.getElementById("mobileToggle");
var mobileMenu = document.getElementById("mobileMenu");
mobileToggle.addEventListener("click", function(){
  var isOpen = mobileMenu.classList.toggle("open");
  this.classList.toggle("active");
  this.setAttribute("aria-expanded", isOpen ? "true" : "false");
  document.documentElement.classList.toggle("tbb-menu-lock", isOpen);
});
var mobileLinks = mobileMenu.querySelectorAll("a");
for(var ml = 0; ml < mobileLinks.length; ml++){
  mobileLinks[ml].addEventListener("click", function(){
    mobileMenu.classList.remove("open");
    mobileToggle.classList.remove("active");
    mobileToggle.setAttribute("aria-expanded","false");
    document.documentElement.classList.remove("tbb-menu-lock");
  });
}

/* ====== FAQ ACCORDION ====== */
var faqItems = document.querySelectorAll(".faq-item");
for(var fi = 0; fi < faqItems.length; fi++){
  faqItems[fi].querySelector(".faq-question").addEventListener("click", function(){
    var item = this.parentElement;
    var answer = item.querySelector(".faq-answer");
    var isOpen = item.classList.contains("open");
    /* Close all */
    for(var fj = 0; fj < faqItems.length; fj++){
      faqItems[fj].classList.remove("open");
      faqItems[fj].querySelector(".faq-question").setAttribute("aria-expanded","false");
      faqItems[fj].querySelector(".faq-answer").style.maxHeight = null;
    }
    if(!isOpen){
      item.classList.add("open");
      this.setAttribute("aria-expanded","true");
      answer.style.maxHeight = answer.scrollHeight + "px";
    }
  });
}

/* ====== SCROLL REVEAL (IntersectionObserver) ====== */
function initReveal(){
  var reveals = document.querySelectorAll(".reveal:not(.visible)");
  if("IntersectionObserver" in window){
    var observer = new IntersectionObserver(function(entries){
      for(var i = 0; i < entries.length; i++){
        if(entries[i].isIntersecting){
          entries[i].target.classList.add("visible");
          observer.unobserve(entries[i].target);
        }
      }
    },{threshold:0.08,rootMargin:"0px 0px -40px 0px"});
    for(var r = 0; r < reveals.length; r++){
      observer.observe(reveals[r]);
    }
  } else {
    for(var s = 0; s < reveals.length; s++){
      reveals[s].classList.add("visible");
    }
  }
}

/* ====== COUNT UP ANIMATION ====== */
function animateCounter(el, target){
  if(target === 0){ el.textContent = "0"; return; }
  var duration = 1500;
  var startTime = null;
  function step(timestamp){
    if(!startTime) startTime = timestamp;
    var progress = Math.min((timestamp - startTime)/duration, 1);
    var eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target);
    if(progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}
function initCountUp(){
  var counters = document.querySelectorAll(".count-up");
  if("IntersectionObserver" in window){
    var cObserver = new IntersectionObserver(function(entries){
      for(var i = 0; i < entries.length; i++){
        if(entries[i].isIntersecting){
          var el = entries[i].target;
          var target = parseInt(el.getAttribute("data-target"),10);
          animateCounter(el, target);
          cObserver.unobserve(el);
        }
      }
    },{threshold:0.5});
    for(var c = 0; c < counters.length; c++){
      cObserver.observe(counters[c]);
    }
  }
}

/* ====== THROTTLED SCROLL HANDLER ====== */
var ticking = false;
window.addEventListener("scroll", function(){
  if(!ticking){
    requestAnimationFrame(function(){
      handleScroll();
      handleBackTop();
      ticking = false;
    });
    ticking = true;
  }
},{passive:true});

/* ====== INIT ====== */
handleScroll();
handleBackTop();
initReveal();
initCountUp();

/* ====== FAQ Schema ====== */
var faqSchema = {
  "@context":"https://schema.org",
  "@type":"FAQPage",
  "mainEntity":[
    {"@type":"Question","name":"Are all tools really free to use?","acceptedAnswer":{"@type":"Answer","text":"Yes, absolutely. Every tool on this page is 100% free with no limits, no subscriptions, and no hidden charges."}},
    {"@type":"Question","name":"Is my data safe? Do you store any code I paste?","acceptedAnswer":{"@type":"Answer","text":"All tools process data 100% in your browser using JavaScript. Your code, text, and images are never sent to any server."}},
    {"@type":"Question","name":"Do I need to create an account?","acceptedAnswer":{"@type":"Answer","text":"No account or signup is required. Simply click on any tool and start using it immediately."}},
    {"@type":"Question","name":"Can I use these tools for commercial projects?","acceptedAnswer":{"@type":"Answer","text":"Yes! All tools are free for both personal and commercial use with no restrictions."}},
    {"@type":"Question","name":"Will you add more tools in the future?","acceptedAnswer":{"@type":"Answer","text":"Absolutely! New tools are added periodically based on trends and user requests."}},
    {"@type":"Question","name":"What platforms are these tools compatible with?","acceptedAnswer":{"@type":"Answer","text":"Our tools generate universal output compatible with Blogger, WordPress, Shopify, custom HTML sites, and more."}},
    {"@type":"Question","name":"How can I suggest a new tool?","acceptedAnswer":{"@type":"Answer","text":"Reach out through our contact page or social media. Many tools were built from user suggestions."}}
  ]
};
var faqScript = document.createElement("script");
faqScript.type = "application/ld+json";
faqScript.textContent = JSON.stringify(faqSchema);
document.head.appendChild(faqScript);

})();
