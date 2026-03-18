const CACHE_NAME = 'ishark-v2-enterprise';
const assets = ['/', '/index.html', '/style.css', '/app.js'];

// Install Event
self.addEventListener('install', e => {
  self.skipWaiting(); // Force the new worker to activate immediately
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(assets)));
});

// Activate Event (Cleans up old broken caches)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Fetch Event (Network First, Fallback to Cache)
self.addEventListener('fetch', e => {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // If network succeeds, update the cache quietly in the background
        const resClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
        return response;
      })
      .catch(() => {
        // If network fails (offline), serve from cache
        return caches.match(e.request);
      })
  );
});