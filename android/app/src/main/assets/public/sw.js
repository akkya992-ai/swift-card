/**
 * SwiftCart Professional Background Delivery Alarm Service Worker (sw.js)
 * Enables background alarms, continuous vibrate sequences, and OS notifications
 * active indefinitely (24+ hours) even when the app is completely closed or inactive.
 */

const CACHE_NAME = 'swiftcart-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.jpg',
  '/splash.jpg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(e => console.warn('PWA Pre-cache failed:', e));
    })
  );
  console.log('[SwiftCart SW] Background Service Worker installed successfully.');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
  console.log('[SwiftCart SW] Active mode activated. Ready to listen for background shifts.');
});

// Cache interceptor for local assets to enable instant offline speed and touch feedback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  // Strictly exclude database, api, and analytics calls so they preserve realtime sync
  if (url.pathname.startsWith('/api') || url.href.includes('supabase.co') || url.href.includes('firebase')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in the background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/');
        }
      });
    })
  );
});

// Sound / Vibration Patterns matching emergency alarm rings
const ALARM_VIBRATION_PATTERN = [500, 250, 500, 250, 500, 250, 800, 150, 800, 500];

// Handle real-time push events from the server
self.addEventListener('push', (event) => {
  let data = {
    title: '🔔 New Instant SwiftCart Order!',
    message: 'Check your dashboard immediately! Sound alarm is ringing in active mode.',
    role: 'rider',
    orderId: 'SC-9999'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.message = event.data.text();
    }
  }

  const options = {
    body: data.message,
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>',
    vibrate: ALARM_VIBRATION_PATTERN,
    tag: 'swiftcart-order-alarm-' + (data.orderId || 'general'),
    renotify: true,
    requireInteraction: true, // Remain on screen until user manually interacts or accepts order
    data: {
      orderId: data.orderId,
      role: data.role || 'rider',
      timestamp: Date.now()
    },
    actions: [
      { action: 'open_dashboard', title: '⚡ Accept & Open App' },
      { action: 'dismiss', title: '🔇 Snooze Alarm' }
    ]
  };

  const logPromise = fetch('/api/notifications/log-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: data.orderId || 'SC-9999',
      role: data.role || 'rider',
      eventType: 'sent',
      timestamp: new Date().toISOString()
    })
  }).then(() => {
    return fetch('/api/notifications/log-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: data.orderId || 'SC-9999',
        role: data.role || 'rider',
        eventType: 'opened',
        timestamp: new Date().toISOString()
      })
    });
  }).catch(err => console.warn('[SW Log Event Error]', err));

  event.waitUntil(
    Promise.all([
      logPromise,
      self.registration.showNotification(data.title, options)
    ])
  );
});

// Listener for custom messages sent from open dashboard clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SIMULATE_BACKGROUND_ALARM') {
    // Simulated alarm scheduled to ring with a custom delayed timestamp matching a 24-hour offline setup
    const delaySim = event.data.delay || 1500;
    const userRole = event.data.role || 'rider';
    const orderId = event.data.orderId || 'SIM-9999';
    
    setTimeout(() => {
      // Log matching simulation events
      fetch('/api/notifications/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
          role: userRole,
          eventType: 'sent',
          timestamp: new Date().toISOString()
        })
      }).then(() => {
        return fetch('/api/notifications/log-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderId,
            role: userRole,
            eventType: 'opened',
            timestamp: new Date().toISOString()
          })
        });
      }).catch(err => console.warn('[SW SIM LOG ERROR]', err));

      self.registration.showNotification('🎯 Offline Active Mode: SwiftCart Alarm!', {
        body: `🛒 ORDER ASSIGNED! App was closed/asleep for over 24 hours. Click instantly to launch the sound alarm.`,
        vibrate: ALARM_VIBRATION_PATTERN,
        requireInteraction: true,
        tag: 'simulated-background-alarm',
        data: {
          orderId: orderId,
          role: userRole,
          triggerSiren: true
        },
        actions: [
          { action: 'open_dashboard', title: '📢 Wake & Loud Sound Alarm' },
          { action: 'dismiss', title: 'Turn Off' }
        ]
      });
    }, delaySim);
  }
});

// What happens when user clicks action buttons or notification card
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const orderId = event.notification.data?.orderId || 'SC-9999';
  const role = event.notification.data?.role || 'rider';

  if (action === 'dismiss') {
    console.log('[SwiftCart SW] Notification dismissed/muted by user.');
    event.waitUntil(
      fetch('/api/notifications/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
          role: role,
          eventType: 'rejected'
        })
      }).catch(err => console.warn('[SW Log Event Error]', err))
    );
    return;
  }

  // Redirect to application and trigger continuous loud alarm
  const targetUrl = '/';

  event.waitUntil(
    Promise.all([
      fetch('/api/notifications/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
          role: role,
          eventType: 'accepted'
        })
      }).catch(err => console.warn('[SW Log Event Error]', err)),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Look for open tabs of the dashboard
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            if (client.url.includes(targetUrl) && 'focus' in client) {
              // Send command instructing the app page to force/resume high volume siren alert
              client.postMessage({
                type: 'TRIGGER_EMERGENCYS_SIREN',
                orderId: orderId,
                role: role
              });
              return client.focus();
            }
          }
          
          // If app doesn't have an open tab, open a new window pointing to the homepage with a directive hash query
          if (self.clients.openWindow) {
            return self.clients.openWindow('/#alarm-trigger=true&role=' + role);
          }
        })
    ])
  );
});
