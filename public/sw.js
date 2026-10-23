// Axion Service Worker - Background Gap Alert, Push Notification Sync & Price Stream Cache
const CACHE_NAME = 'axion-v2';

// Static assets to pre-cache for offline support
const PRECACHE_URLS = [
  '/',
  '/favicon.ico',
  '/manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Background Push Notification Event
self.addEventListener('push', event => {
  let data = { title: 'Axion Market Alert', body: 'New market gap alert triggered.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || 'axion-gap-alert',
    data: data.url || '/',
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Open Axion' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click Handler - Focus or Open Window
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Network-first strategy for API calls, cache-first for static assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip SSE streams and non-GET requests
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/price-stream')) return;
  if (event.request.headers.get('accept')?.includes('text/event-stream')) return;

  // Cache-first for static assets
  if (url.pathname.match(/\.(js|css|png|jpg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
});
