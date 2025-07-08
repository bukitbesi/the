/**
 * Theme: The Bukit Besi - JS Engine
 * Author: (SEO Alchemist)
 * Version: 2.0 (Complete Refactor)
 */
const TheBukitBesi = {
    // --- Configuration ---
    config: {
        lazyLoadOffset: 200,
        smoothScrollOffset: 60, // Height of your fixed header
        darkModeKey: 'the-bukit-besi-dark-mode'
    },

    // --- Initialization ---
    init: function() {
        // Run essential setup on DOMContentLoaded
        document.addEventListener('DOMContentLoaded', () => {
            this.utils.cleanBloggerMarkup();
            this.ui.handleDarkMode();
            this.ui.handleMobileNav();
            this.ui.handleBackToTop();
            this.ui.updateCurrentYear();
            this.features.initLazyLoad();
        });
    },

    // --- Core UI Modules ---
    ui: {
        handleDarkMode: function() {
            const toggle = document.getElementById('dark-mode-toggle');
            const html = document.documentElement;
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const storedTheme = localStorage.getItem(TheBukitBesi.config.darkModeKey);

            const applyTheme = (isDark) => {
                html.classList.toggle('dark-mode', isDark);
                localStorage.setItem(TheBukitBesi.config.darkModeKey, isDark);
            };

            // Set initial theme
            applyTheme(storedTheme === 'true' || (storedTheme === null && prefersDark));

            toggle?.addEventListener('click', () => {
                applyTheme(!html.classList.contains('dark-mode'));
            });
        },

        handleMobileNav: function() {
            const toggle = document.getElementById('nav-toggle');
            if (toggle) {
                // Allows closing the nav by clicking outside of it
                document.addEventListener('click', (e) => {
                    const navMenu = document.getElementById('simplify-click');
                    if (navMenu && !navMenu.contains(e.target) && !toggle.contains(e.target)) {
                        toggle.checked = false;
                    }
                });
            }
        },

        handleBackToTop: function() {
            const button = document.querySelector('.simplifytotop');
            if (!button) return;

            window.addEventListener('scroll', () => {
                button.classList.toggle('hider', window.scrollY < 300);
            });

            button.addEventListener('click', (e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        },

        updateCurrentYear: function() {
            const yearSpan = document.getElementById('current-year');
            if (yearSpan) yearSpan.textContent = new Date().getFullYear();
        }
    },

    // --- Feature Modules ---
    features: {
        initLazyLoad: function() {
            const lazyImages = document.querySelectorAll('img[loading="lazy"]');
            if ("IntersectionObserver" in window) {
                const observer = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            if (img.dataset.src) img.src = img.dataset.src;
                            if (img.dataset.srcset) img.srcset = img.dataset.srcset;
                            img.removeAttribute('loading'); // Optional: remove attribute after load
                            observer.unobserve(img);
                        }
                    });
                }, { rootMargin: `${TheBukitBesi.config.lazyLoadOffset}px` });
                lazyImages.forEach(img => observer.observe(img));
            } else {
                // Fallback for older browsers
                lazyImages.forEach(img => {
                    if (img.dataset.src) img.src = img.dataset.src;
                    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
                });
            }
        }
    },

    // --- Utility Modules ---
    utils: {
        cleanBloggerMarkup: function() {
            // Blogger sometimes wraps images in divs that break layouts.
            document.querySelectorAll('.post-body .separator').forEach(el => {
                if (el.children.length === 1 && el.firstChild.tagName === 'A') {
                    el.replaceWith(el.firstChild);
                }
            });
        }
    }
};

// --- Engage The Engine ---
TheBukitBesi.init();
