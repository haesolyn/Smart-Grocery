const CACHE_NAME = 'smart-grocery-v17';
const ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './favicon.ico',
  './js/firebase-config.js',
  './js/app.js',
  './js/grocery.js',
  './js/comparator.js',
  './js/budget.js',
  './js/history.js',
  './js/sound.js',
  './js/pwa.js',
  './manifest.json',
  './icons/app-logo.png',
  './icons/icon-96.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon.svg',
  './icons/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching offline assets v17');
      return cache.addAll(ASSETS).catch(err => console.warn('[SW] Cache addAll warning:', err));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Let Firebase / Firestore / Google Auth APIs pass directly to network
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebaseinstallations.googleapis.com') ||
    event.request.url.includes('identitytoolkit.googleapis.com') ||
    event.request.url.includes('securetoken.googleapis.com') ||
    event.request.url.includes('accounts.google.com')
  ) {
    return;
  }

  // Network-First strategy for all app assets (HTML, JS, CSS, Images)
  // This guarantees users immediately receive latest updates when online,
  // and fully maintains offline capability when offline!
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
            return caches.match('./index.html');
          }
          return null;
        });
      })
  );
});
