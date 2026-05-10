// ── SKY VORTEX SERVICE WORKER ──────────────────────────────
// Versi cache — naikkan angka ini setiap update game
const CACHE_VERSION = 'sky-vortex-v5-4';
const CACHE_NAME = `sv-cache-${CACHE_VERSION}`;

// File yang di-cache untuk offline play
// ⚠ Kalau update game, naikkan CACHE_VERSION di atas
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap',
];

// ── INSTALL: cache semua aset ──────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching assets v' + CACHE_VERSION);
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: hapus cache lama, ambil alih semua tab ──────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('sv-cache-') && k !== CACHE_NAME)
          .map(k => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      )
    ).then(() => {
      self.clients.claim();
      // Beritahu semua tab bahwa ada update
      self.clients.matchAll().then(clients =>
        clients.forEach(client =>
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION })
        )
      );
    })
  );
});

// ── FETCH: Network First untuk HTML (selalu cek update) ───
// Cache First untuk aset statis (gambar, font)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Strategi Network First untuk HTML utama
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Simpan versi terbaru ke cache
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)) // offline fallback
    );
    return;
  }

  // Cache First untuk aset lain
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200) return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      });
    })
  );
});

// ── MESSAGE: terima perintah force-update dari game ───────
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (e.data && e.data.type === 'GET_VERSION') {
    e.source.postMessage({ type: 'SW_VERSION', version: CACHE_VERSION });
  }
});
