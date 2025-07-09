/**
 * Alchemist V1 - Theme Scripts
 * For: The Bukit Besi Blog
 * Alchemist: Gemini
 * Version: 1.0 | Vanilla JS
 */
const AlchemistTheme = {
  // Central configuration
  config: {
    tocContainerId: 'auto-toc-container',
    tocHeadlineSelector: '.post-body h2, .post-body h3',
    breakingNews: {
      containerId: 'breaking-news-ticker',
      label: 'TERKINI',
      maxPosts: 5
    }
  },

  // Initialize all modules
  init: function() {
    document.addEventListener('DOMContentLoaded', () => {
      this.ui.initMobileNav();
      this.ui.initBackToTop();
      this.ui.initDarkMode();
      this.utils.updateCopyrightYear();
      this.features.initAutoTOC();
      this.features.initBreakingNews();
      this.utils.transmuteParagraphs();
      this.utils.initLazyLoadVideos();
    });
  },

  ui: {
    initMobileNav: () => {
      const toggle = document.getElementById('mobile-nav-toggle');
      const menu = document.getElementById('main-nav');
      if (toggle && menu) {
        toggle.addEventListener('click', () => menu.classList.toggle('is-open'));
      }
    },
    initBackToTop: () => {
      const button = document.querySelector('.back-to-top');
      if (button) {
        window.addEventListener('scroll', () => button.classList.toggle('visible', window.scrollY > 300));
        button.addEventListener('click', e => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }
    },
    initDarkMode: () => {
       const toggle = document.getElementById('dark-mode-toggle');
       const html = document.documentElement;
       const applyTheme = (isDark) => {
         html.classList.toggle('dark-mode', isDark);
         localStorage.setItem('theme-preference', isDark ? 'dark' : 'light');
       };
       const storedTheme = localStorage.getItem('theme-preference');
       const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
       applyTheme(storedTheme === 'dark' || (storedTheme === null && systemPrefersDark));
       toggle?.addEventListener('click', () => applyTheme(!html.classList.contains('dark-mode')));
    }
  },

  features: {
    initAutoTOC: () => {
      const container = document.getElementById(AlchemistTheme.config.tocContainerId);
      const headlines = document.querySelectorAll(AlchemistTheme.config.tocHeadlineSelector);
      if (!container || headlines.length < 2) return;

      let tocHtml = '<ul>';
      headlines.forEach((h, index) => {
        const id = 'toc-heading-' + index;
        h.id = id;
        const indentClass = h.tagName === 'H3' ? 'toc-indent' : '';
        tocHtml += `<li class="${indentClass}"><a href="#${id}">${h.textContent}</a></li>`;
      });
      tocHtml += '</ul>';
      container.innerHTML = tocHtml;
      container.style.display = 'block';
    },
    initBreakingNews: () => {
      const container = document.getElementById(AlchemistTheme.config.breakingNews.containerId);
      if (!container) return;
      const { maxPosts, label } = AlchemistTheme.config.breakingNews;
      const feedUrl = `/feeds/posts/default?alt=json-in-script&max-results=${maxPosts}`;
      
      window.breakingNewsCallback = (json) => {
        let listHtml = '<ul>';
        json.feed.entry.forEach(entry => {
          let postUrl = '';
          for (let link of entry.link) {
            if (link.rel == 'alternate') {
              postUrl = link.href;
              break;
            }
          }
          listHtml += `<li><a href="${postUrl}"><span class="breaking-label">${label}</span> ${entry.title.$t}</a></li>`;
        });
        listHtml += '</ul>';
        container.innerHTML = listHtml;
      };
      
      const script = document.createElement('script');
      script.src = `${feedUrl}&callback=breakingNewsCallback`;
      document.body.appendChild(script);
    }
  },

  utils: {
    updateCopyrightYear: () => {
      const el = document.getElementById('current-year');
      if (el) el.textContent = new Date().getFullYear();
    },
    transmuteParagraphs: () => {
      const postBody = document.querySelector('.post-body');
      if (!postBody) return;
      // This regex finds 2 or more consecutive <br> tags, with optional whitespace
      const brRegex = /(<br\s*\/?>\s*){2,}/gi;
      const originalHtml = postBody.innerHTML;

      // Only run if double <br> tags exist to avoid re-processing
      if (brRegex.test(originalHtml)) {
        const segments = originalHtml.split(brRegex);
        const newHtml = segments
          .map(segment => segment ? segment.trim() : '')
          .filter(segment => segment.length > 0)
          .map(segment => `<p>${segment}</p>`)
          .join('');
        postBody.innerHTML = newHtml;
      }
    },
    initLazyLoadVideos: () => {
      document.querySelectorAll('.lazy-video').forEach(container => {
        const button = container.querySelector('button');
        button.addEventListener('click', () => {
          const iframe = document.createElement('iframe');
          iframe.setAttribute('src', container.dataset.src);
          iframe.setAttribute('frameborder', '0');
          iframe.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture');
          iframe.setAttribute('allowfullscreen', '');
          container.replaceWith(iframe);
        }, { once: true });
      });
    }
  }
};

AlchemistTheme.init();