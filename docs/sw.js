/* ═══════════════════════════════════════════════════════════
   Ibadah Daily Planner — le gardien hors-ligne (service worker)
   ───────────────────────────────────────────────────────────
   Il garde une copie des fichiers de l'application dans le
   téléphone. Résultat : l'appli s'ouvre même sans internet.

   Quand tu modifies un fichier, change le numéro de VERSION
   ci-dessous, sinon le navigateur continuera de servir l'ancienne copie.
   ═══════════════════════════════════════════════════════════ */

const VERSION = 'ibadah-f0ea54ea';

const FICHIERS = [
  './',
  './index.html',
  './styles.css?v=f0ea54ea',
  './store.js?v=f0ea54ea',
  './adhkar.js?v=f0ea54ea',
  './feuille.js?v=f0ea54ea',
  './app.js?v=f0ea54ea',
  './rappels.js?v=f0ea54ea',
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

  // La page principale : le réseau d'abord, la copie locale seulement en secours.
  //
  // C'est elle qui contient les adresses estampillées de tous les autres
  // fichiers (styles.css?v=…). Si on la servait depuis la réserve, une
  // nouvelle version mettrait une ouverture de plus à apparaître : la
  // première ouverture rafraîchirait la réserve, la deuxième seulement
  // l'afficherait. La page est minuscule, ce détour ne coûte rien.
  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copie = res.clone();
            caches.open(VERSION).then(c => c.put(req, copie));
          }
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Les autres fichiers portent un numéro de version dans leur adresse :
  // la copie locale ne peut pas être périmée. On la sert donc en premier,
  // pour une ouverture instantanée, et on rafraîchit en arrière-plan.
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
