// Service worker: la app funciona sin conexión.
// Estrategia: el "cascarón" y el contenido se sirven de caché y se actualizan en segundo plano.
// Las llamadas al backend (otro origen) nunca se interceptan: el progreso siempre va a la red.
const VERSION = 'v8';
const CACHE = `rfs-${VERSION}`;
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'assets/icon.svg', 'css/tokens.css', 'css/base.css', 'css/cuaderno.css', 'css/lab.css',
  'js/main.js', 'js/util.js', 'js/icons.js', 'js/content.js', 'js/store.js', 'js/sync.js', 'js/logic.js', 'js/theme.js', 'js/fx.js', 'js/palette.js', 'js/avatar.js',
  'js/views/ui.js', 'js/views/hoy.js', 'js/views/ruta.js', 'js/views/tema.js', 'js/views/cuaderno.js', 'js/views/examen.js', 'js/views/insignias.js', 'js/views/perfil.js', 'js/views/lab.js',
  'content/route.json', 'content/index.json', 'content/checklist.json', 'content/badges.json', 'content/config.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('rfs-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req);
    const net = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
