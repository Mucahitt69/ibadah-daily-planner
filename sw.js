/* ═══════════════════════════════════════════════════════════
   Ibadah Daily Planner — le gardien hors-ligne (service worker)
   ───────────────────────────────────────────────────────────
   Il garde une copie des fichiers de l'application dans le
   téléphone. Résultat : l'appli s'ouvre même sans internet.

   Quand tu modifies un fichier, change le numéro de VERSION
   ci-dessous, sinon le navigateur continuera de servir l'ancienne copie.
   ═══════════════════════════════════════════════════════════ */

const VERSION = 'ibadah-v3';

const FICHIERS = [
  './',
  './index.html',
  './styles.css',
  './store.js',
  './adhkar.js',
  './app.js',
  './rappels.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* À l'installation : on range une copie de chaque fichier. */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(FICHIERS))
      .then(() => self.skipWaiting())
  );
});

/* À l'activation : on jette les copies des versions précédentes. */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(noms => Promise.all(noms.filter(n => n !== VERSION).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/* Pendant le développement (sur ton ordinateur), on ne garde aucune copie :
   sinon le navigateur continuerait d'afficher l'ancienne version après
   chaque modification de fichier. */
const EN_DEVELOPPEMENT = ['localhost', '127.0.0.1'].includes(self.location.hostname);

/* À chaque demande de fichier. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (EN_DEVELOPPEMENT) return;

  const url = new URL(req.url);

  // Les hadiths viennent d'internet : on essaie le réseau d'abord,
  // et on garde la dernière réponse reçue en réserve.
  if (url.origin !== location.origin) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copie = res.clone();
          caches.open(VERSION).then(c => c.put(req, copie));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Les fichiers de l'appli : la copie locale d'abord (ouverture instantanée),
  // et on rafraîchit la copie en arrière-plan.
  e.respondWith(
    caches.match(req).then(copie => {
      const reseau = fetch(req)
        .then(res => {
          if (res && res.ok) {
            const c2 = res.clone();
            caches.open(VERSION).then(c => c.put(req, c2));
          }
          return res;
        })
        .catch(() => copie);
      return copie || reseau;
    })
  );
});

/* Un clic sur une notification ramène à l'application. */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(liste => {
      for (const c of liste) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow('./index.html');
    })
  );
});
