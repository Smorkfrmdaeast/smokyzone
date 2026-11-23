// Smoky Zone Audio & App Service Worker
// Provides offline asset caching, background audio synchronization, and cross-tab command routing.

const CACHE_NAME = 'smokyzone-cache-v1';
const AUDIO_CACHE_NAME = 'smokyzone-audio-cache-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/music/gunna_on_one_tonight.mp3',
  '/music/Gunna - on one tonight [Official Visualizer].mp3',
  '/images/celebrity_smork.jpg',
  '/images/drill_culture.jpg',
  '/images/street_party.jpg',
  '/images/StockCake-Neon Music Studio_1758587212.jpg',
  '/images/StockCake-Neon Dance Silhouette_1758587304.jpg',
];

// Broadcast channel for instantaneous cross-context messaging
let broadcastChannel = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    broadcastChannel = new BroadcastChannel('smokyzone_audio_channel');
  }
} catch {
  // BroadcastChannel not available in this worker context
}

// 1. Installation Lifecycle
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache partial warning:', err);
      });
    })
  );
});

// 2. Activation Lifecycle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== AUDIO_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Handler: Cache-First for Audio, Network-First for dynamic data, Stale-While-Revalidate for app assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Audio files: Cache-First for smooth uninterrupted background playback
  if (url.pathname.endsWith('.mp3') || url.pathname.endsWith('.wav') || url.pathname.includes('/music/')) {
    event.respondWith(
      caches.open(AUDIO_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch {
          return cached || new Response('Audio unavailable offline', { status: 503 });
        }
      })
    );
    return;
  }

  // API or Firebase requests: Network only
  if (url.pathname.includes('/api/') || url.hostname.includes('firebase') || url.hostname.includes('firestore')) {
    return;
  }

  // App shell & static assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// 4. Background Audio Command Router
// Allows commands like play, pause, next, prev to be relayed to all active browser windows/tabs
self.addEventListener('message', (event) => {
  if (!event.data) return;

  const { type, action, payload } = event.data;

  if (type === 'AUDIO_COMMAND' || type === 'PLAYER_STATE_UPDATE') {
    // 1. Broadcast via BroadcastChannel
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage(event.data);
      } catch {
        // ignore
      }
    }

    // 2. Broadcast to all matched window clients
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage(event.data);
      });
    });
  }

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 5. Background Sync Event (When online connectivity resumes)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-audio-state') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'REQUEST_AUDIO_STATE_SYNC' });
        });
      })
    );
  }
});
