// Game.Log — Service Worker
// Stratégie : cache sur la coquille de l'app,
// et surtout AUCUN cache sur les appels réseau dynamiques (Firebase, IGDB).
const CACHE = 'gamelog-v2';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

// Domaines qui ne doivent JAMAIS être mis en cache
const NEVER_CACHE = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'www.gstatic.com',
  'apis.google.com',
  'accounts.google.com',
  'workers.dev',
  'api.igdb.com',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  if (NEVER_CACHE.some(h => url.hostname.includes(h))) return;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(req).then(cached => {
        const network = fetch(req).then(res => {
          if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
            cache.put(req, res.clone()).catch(() => {});
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    )
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
