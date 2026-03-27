// Daily Fitness Activities - Service Worker
const CACHE_NAME = 'fitdaily-v1.2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// ===== INSTALL =====
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// ===== ACTIVATE =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ===== FETCH =====
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', event => {
  let data = { title: 'Daily Fitness Activities', body: 'Time to stay on track!', tag: 'fitness' };
  try { data = { ...data, ...event.data.json() }; } catch (e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.png',
      badge: './badge.png',
      tag: data.tag || 'fitness',
      renotify: true,
      requireInteraction: false,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      data: { url: './', timestamp: Date.now() }
    })
  );
});

// ===== NOTIFICATION CLICK =====
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      if (cls.length > 0) { cls[0].focus(); return; }
      return clients.openWindow('./');
    })
  );
});

// ===== PERIODIC SYNC (background reminders) =====
self.addEventListener('periodicsync', event => {
  if (event.tag === 'fitness-reminder') {
    event.waitUntil(sendReminderNotification());
  }
});

async function sendReminderNotification() {
  const allClients = await clients.matchAll();
  if (allClients.length === 0) {
    await self.registration.showNotification('Daily Fitness Activities', {
      body: 'Have you logged your exercises and water today?',
      tag: 'daily-reminder',
      vibrate: [100, 50, 100]
    });
  }
}

// ===== MESSAGE HANDLER =====
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'SEND_NOTIFICATION') {
    const { title, body, tag } = event.data.payload;
    self.registration.showNotification(title || 'Daily Fitness Activities', {
      body: body || 'Stay on track with your fitness goals!',
      tag: tag || 'fitness-reminder',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Later' }
      ]
    });
  }
});
