/**
 * Reforged Theme Scripts | Vanilla JS
 * For: Bukit Besi Blog
 * Alchemist: Gemini
 */
const App = {
  init: function() {
    document.addEventListener('DOMContentLoaded', () => {
      this.ui.initMobileNav();
      this.ui.initBackToTop();
      this.ui.updateCopyrightYear();
      this.features.initRecentPostsWidget();
    });
  },

  ui: {
    initMobileNav: function() {
      const toggle = document.getElementById('mobile-nav-toggle');
      const menu = document.getElementById('main-nav-ul');
      if (!toggle || !menu) return;
      
      toggle.addEventListener('click', () => {
        menu.classList.toggle('is-open');
      });
    },
    
    initBackToTop: function() {
      const button = document.querySelector('.back-to-top');
      if (!button) return;
      
      window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
          button.classList.add('visible');
        } else {
          button.classList.remove('visible');
        }
      });
      
      button.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    },
    
    updateCopyrightYear: function() {
      const yearSpan = document.getElementById('current-year');
      if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
      }
    }
  },
  
  features: {
    initRecentPostsWidget: function() {
      const container = document.getElementById('recent-posts-widget-container');
      if (!container) return;
      
      const numPosts = 5; // Configurable number of posts
      const feedUrl = `/feeds/posts/default?alt=json-in-script&max-results=${numPosts}`;

      // Create a script tag to fetch the JSONP feed
      const script = document.createElement('script');
      script.src = feedUrl;
      
      // Define the callback function that Blogger's feed will call
      window.recentPostCallback = function(json) {
        let html = '<ul class="recent-posts-list">';
        json.feed.entry.forEach(entry => {
          const postTitle = entry.title.$t;
          let postUrl = '';
          for (let i = 0; i < entry.link.length; i++) {
            if (entry.link[i].rel == 'alternate') {
              postUrl = entry.link[i].href;
              break;
            }
          }
          const thumbUrl = entry.media$thumbnail ? entry.media$thumbnail.url.replace(/\/s\d+-c\//, '/s90-c/') : 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiPQfqfnJDqT3Dd0aCf7X0-CcaXPzEgG9AVb2pTSEfJ1xOWySeTFxL_i-MqdCwq5xvvHb2q_bNZFIAuwaXJTl47OWF6o4JkNoVq4A68OKiBBTiBJ8KByDnUovGC3uWtUjMg5YwQPQKCPJ4/s1600/no-thumbnail.png';

          html += `
            <li>
              <a href="${postUrl}">
                <div class="recent-post-thumb">
                  <img src="${thumbUrl}" alt="" loading="lazy"/>
                </div>
                <div class="recent-post-title">${postTitle}</div>
              </a>
            </li>
          `;
        });
        html += '</ul>';
        container.innerHTML = html;
      };
      
      // Append the script to trigger the fetch, and add the callback parameter
      script.src += '&callback=recentPostCallback';
      document.body.appendChild(script);
    }
  }
};

App.init();
