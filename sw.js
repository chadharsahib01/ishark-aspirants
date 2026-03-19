const CACHE_NAME = 'ishark-v2-enterprise';
const assets = ['/', '/index.html', '/style.css', '/app.js', '/manifest.json'];

// Install Event - Forces the new service worker to activate immediately
self.addEventListener('install', e => {
  self.skipWaiting(); 
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(assets)));
});

// Activate Event - Wipes out all old caches so users aren't stuck on broken versions
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Fetch Event - NETWORK FIRST, Fallback to Cache (Crucial for seamless updates)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // If network succeeds, quietly update the cache in the background
        const resClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
        return response;
      })
      .catch(() => {
        // If network fails (user is offline), serve from cache
        return caches.match(e.request);
      })
  );
});