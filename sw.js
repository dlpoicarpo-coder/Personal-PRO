const CACHE_NAME = 'personal-pro-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/css/index.css',
  '/css/components.css',
  '/css/student-portal.css',
  '/js/app.js',
  '/js/db.js',
  '/assets/icon.svg',
  '/assets/icon-trainer-512.png',
  '/assets/icon-portal-512.png',
  '/manifest.json',
  '/portal-manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Ignorar requisições que não sejam GET (ex: POST de login) ou que vão para o Supabase
  if (e.request.method !== 'GET' || e.request.url.includes('supabase.co')) {
    return; // Deixa o navegador tratar nativamente
  }

  // CDN — cache first
  if (e.request.url.includes('cdn.jsdelivr.net') || e.request.url.includes('fonts.googleapis') || e.request.url.includes('cdnjs.cloudflare.com')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        return cached || fetch(e.request).then((res) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, res.clone());
            return res;
          });
        });
      })
    );
  } else {
    // Network first, cache fallback
    e.respondWith(
      fetch(e.request).catch(async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      })
    );
  }
});

// Push notification support
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { title: 'Personal PRO', body: 'Nova notificação' };
  e.waitUntil(
    self.registration.showNotification(data.title || 'Personal PRO', {
      body: data.body || '',
      icon: '/assets/icon-portal-512.png',
      badge: '/assets/icon-portal-512.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
});
