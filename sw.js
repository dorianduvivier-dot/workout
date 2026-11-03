// Service worker : hors-ligne + clic sur notification + rappel en arrière-plan (Android, si dispo).
const VERSION = 'serie-v4';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'levels.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'serie-state').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Réseau d'abord (pour recevoir les mises à jour), cache en secours.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});

// Synchro périodique (Chrome Android, appli installée) : le système décide de la fréquence.
self.addEventListener('periodicsync', e => {
  if (e.tag !== 'rappel') return;
  e.waitUntil((async () => {
    const cache = await caches.open('serie-state');
    const res = await cache.match('state.json');
    if (!res) return;
    const s = await res.json();
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const mins = now.getHours() * 60 + now.getMinutes();
    const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const first = Math.min(...s.reminders.map(toMin), toMin(s.eod || '21:30'));
    const last = toMin(s.eod || '21:30') + 60;
    if (s.day === key && s.complete) return;
    if (mins < first || mins > last) return;
    const lastRes = await cache.match('last-bg.json');
    const lastAt = lastRes ? (await lastRes.json()).t : 0;
    if (Date.now() - lastAt < 2 * 60 * 60 * 1000) return;
    await cache.put('last-bg.json', new Response(JSON.stringify({ t: Date.now() })));
    const body = s.day === key && s.remaining ? `Il te reste : ${s.remaining}` : 'Ouvre l\'appli pour noter tes séries.';
    await self.registration.showNotification(s.streak ? `🔥 Série de ${s.streak} jours en jeu` : '💪 Une petite série ?',
      { body, tag: 'rappel', icon: 'icon-192.png', badge: 'icon-192.png' });
  })());
});
