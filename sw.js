const CACHE_NAME = 'personal-pro-v10';
const ASSETS = [
  '/',
  '/index.html',
  '/css/index.css',
  '/css/components.css',
  '/css/student-portal.css',
  '/js/app.js',
  '/js/db.js',
  '/js/insights.js',
  '/js/pages/anamnesis.js',
  '/js/pages/assessments.js',
  '/js/pages/biofeedback.js',
  '/js/pages/calendar.js',
  '/js/pages/cardio.js',
  '/js/pages/dashboard.js',
  '/js/pages/exercises-library.js',
  '/js/pages/financial.js',
  '/js/pages/live-tracker.js',
  '/js/pages/login.js',
  '/js/pages/periodization.js',
  '/js/pages/reports.js',
  '/js/pages/settings.js',
  '/js/pages/student-forms.js',
  '/js/pages/student-portal.js',
  '/js/pages/students.js',
  '/js/pages/tutorial.js',
  '/js/pages/weekly-summary.js',
  '/js/pages/workouts.js',
  '/js/utils/alerts.js',
  '/js/utils/auth.js',
  '/js/utils/backup.js',
  '/js/utils/calculations.js',
  '/js/utils/exercises-db.js',
  '/js/utils/icons.js',
  '/js/utils/notifications-manager.js',
  '/js/utils/pdf-generator.js',
  '/js/utils/periodization-engine.js',
  '/js/utils/periodization-models.js',
  '/js/utils/roles.js',
  '/js/utils/whatsapp.js',
  '/js/utils/workout-generator.js',
  '/js/utils/workout-templates.js',
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
  const url = e.request.url;

  // Nunca interceptar: não-GET, extensões, data URIs
  if (e.request.method !== 'GET' ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('data:') ||
      url.startsWith('blob:')) {
    return;
  }

  // Supabase: tenta rede primeiro, se falhar serve do cache (mantém sessão offline)
  if (url.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).then((res) => {
        // Cachear apenas respostas GET bem-sucedidas (ex: getUser)
        if (res.ok && e.request.method === 'GET') {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        }
        return res;
      }).catch(async () => {
        // Rede falhou: servir do cache se disponível
        const cached = await caches.match(e.request);
        return cached || new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // CDN — cache first
  if (url.includes('cdn.jsdelivr.net') || url.includes('fonts.googleapis') || url.includes('cdnjs.cloudflare.com')) {
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
    // App files — network first, dynamic cache put, cache fallback
    e.respondWith(
      fetch(e.request).then((res) => {
        if (res.ok && e.request.method === 'GET') {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        }
        return res;
      }).catch(async () => {
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
