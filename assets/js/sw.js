// Service Worker - PWA Support
const CACHE_NAME = 'bukit-besi-v1';
const RUNTIME_CACHE = 'runtime-cache-v1';
const IMAGE_CACHE = 'image-cache-v1';

// Files to cache on install
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap',
  'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecg.woff2'
];

// Cache strategies
const CACHE_STRATEGIES = {
  networkFirst: [
    /\/$/,
    /\/\d{4}\/\d{2}\/.*/,
    /\/search\?.*/,
    /\/feeds\/.*/
  ],
  cacheFirst: [
    /\.(?:css|js|woff2?)$/,
    /fonts\.googleapis\.com/,
    /fonts\.gstatic\.com/,
    /cdn\.jsdelivr\.net/
  ],
  networkOnly: [
    /\/comment-iframe/,
    /\/b\/post-preview/,
    /google-analytics\.com/,
    /doubleclick\.net/
  ]
};

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== RUNTIME_CACHE && 
              cacheName !== IMAGE_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip Chrome extensions
  if (url.protocol === 'chrome-extension:') return;
  
  // Determine strategy
  let strategy = 'networkFirst'; // default
  
  for (const [strategyName, patterns] of Object.entries(CACHE_STRATEGIES)) {
    if (patterns.some(pattern => pattern.test(url.pathname) || pattern.test(url.href))) {
      strategy = strategyName;
      break;
    }
  }
  
  // Apply strategy
  switch (strategy) {
    case 'networkFirst':
      event.respondWith(networkFirst(request));
      break;
    case 'cacheFirst':
      event.respondWith(cacheFirst(request));
      break;
    case 'networkOnly':
      event.respondWith(fetch(request));
      break;
    default:
      event.respondWith(networkFirst(request));
  }
});

// Network first strategy
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fall back to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's a navigation request, return offline page
    if (request.mode === 'navigate') {
      return createOfflineResponse();
    }
    
    throw error;
  }
}

// Cache first strategy
async function cacheFirst(request) {
  const cache = await caches.open(
    request.destination === 'image' ? IMAGE_CACHE : CACHE_NAME
  );
  
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return placeholder for images
    if (request.destination === 'image') {
      return createImagePlaceholder();
    }
    
    throw error;
  }
}

// Create offline response
function createOfflineResponse() {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Offline - Bukit Besi Blog</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #f5f5f5;
          color: #333;
          text-align: center;
          padding: 50px 20px;
          margin: 0;
        }
        .container {
          max-width: 500px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
          font-size: 2rem;
          margin: 0 0 1rem;
          color: #0984e3;
        }
        p {
          font-size: 1.125rem;
          line-height: 1.6;
          margin: 1rem 0;
        }
        .icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: #0984e3;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin-top: 1rem;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📡</div>
        <h1>You're Offline</h1>
        <p>It looks like you've lost your internet connection. Please check your connection and try again.</p>
        <p>Don't worry, we've saved some pages for offline reading. You can still browse previously visited content.</p>
        <a href="/" class="button">Go to Homepage</a>
      </div>
    </body>
    </html>
  `;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Create image placeholder
function createImagePlaceholder() {
  const svg = `
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#999" text-anchor="middle" dy=".3em">Image unavailable offline</text>
    </svg>
  `;
  
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml' }
  });
}

// Background sync for comments
self.addEventListener('sync', event => {
  if (event.tag === 'sync-comments') {
    event.waitUntil(syncComments());
  }
});

async function syncComments() {
  // Implementation for syncing pending comments when back online
  const cache = await caches.open('pending-comments');
  const requests = await cache.keys();
  
  for (const request of requests) {
    try {
      await fetch(request);
      await cache.delete(request);
    } catch (error) {
      console.error('Failed to sync comment:', error);
    }
  }
}

// Push notifications
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/pwa/icon-192.png',
    badge: '/pwa/icon-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// Message handling
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
