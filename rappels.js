/* ═══════════════════════════════════════════════════════════
   Ibadah Daily Planner — les rappels
   ───────────────────────────────────────────────────────────
   À savoir, et c'est dit clairement à l'utilisateur : un site web
   ne peut pas réveiller le téléphone quand l'application est
   complètement fermée. Les rappels fonctionnent tant que l'appli
   est ouverte ou en arrière-plan. À l'ouverture, on affiche en plus
   un petit résumé doux de ce qu'il reste à accomplir.
   ═══════════════════════════════════════════════════════════ */

const Rappels = (function () {

  const DEBUT_NUIT = 22;    // 22 h
  const FIN_NUIT   = 6;     // 6 h
  let minuteurs = [];

  const supporte = ('Notification' in window);

  /* ─── Ce que l'écran Réglages affiche sous « Rappels » ─── */
  function majTexteAide() {
    const aide = document.getElementById('notif-help');
    const bouton = document.getElementById('set-notif');
    if (!aide || !bouton) return;

    if (!supporte) {
      aide.textContent = 'Ton navigateur ne gère pas les notifications.';
      bouton.disabled = true;
      bouton.checked = false;
      return;
    }
    if (Notification.permission === 'denied') {
      aide.textContent = 'Les notifications sont bloquées dans les réglages du navigateur.';
      bouton.disabled = true;
      bouton.checked = false;
      return;
    }
    bouton.disabled = false;
    bouton.checked = Store.reglages().notif && Notification.permission === 'granted';
    aide.textContent = bouton.checked
      ? 'Actifs tant que l\'appli est ouverte ou en arrière-plan'
      : 'Recevoir des rappels doux aux heures que tu choisis';
  }

  /* ─── Activer / désactiver ──────────────────────────────── */
  async function basculer(vouluActif) {
    if (!vouluActif) {
      Store.reglerOption('notif', false);
      annulerTout();
      majTexteAide();
      toast('Rappels mis en pause');
      return;
    }

    // On demande la permission au moment où l'utilisateur le décide,
    // jamais au lancement : une demande à froid se fait refuser par réflexe.
    let etat = Notification.permission;
    if (etat === 'default') {
      try { etat = await Notification.requestPermission(); } catch (e) { etat = 'denied'; }
    }

    if (etat !== 'granted') {
      Store.reglerOption('notif', false);
      majTexteAide();
      toast('Sans autorisation, les rappels ne peuvent pas s\'afficher');
      return;
    }

    Store.reglerOption('notif', true);
    majTexteAide();
    planifier();
    toast('Rappels activés 🔔');
  }

  /* ─── Envoyer une notification ──────────────────────────── */
  async function envoyer(titre, corps) {
    const options = {
      body: corps,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'ibadah',
      silent: false
    };
    try {
      // Passer par le service worker marche mieux sur téléphone
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) { reg.showNotification(titre, options); return; }
      }
      new Notification(titre, options);
    } catch (e) { /* le navigateur a refusé : on n'insiste pas */ }
  }

  /* ─── Silence la nuit ───────────────────────────────────── */
  function dansLaNuit(d) {
    if (!Store.reglages().silenceNuit) return false;
    const h = d.getHours();
    return h >= DEBUT_NUIT || h < FIN_NUIT;
  }

  /* ─── Planifier les rappels de la journée ───────────────── */
  function annulerTout() {
    minuteurs.forEach(clearTimeout);
    minuteurs = [];
  }

  function planifier() {
    annulerTout();
    if (!supporte || !Store.reglages().notif || Notification.permission !== 'granted') return;

    const jour = Store.aujourdhui();
    const maintenant = new Date();

    Store.tachesDuJour(jour)
      .filter(t => t.heure && !Store.estFaite(t, jour))
      .forEach(t => {
        const [h, m] = t.heure.split(':').map(Number);
        const quand = Store.dateDepuisCle(jour);
        quand.setHours(h, m, 0, 0);

        const delai = quand - maintenant;
        // On ne planifie que ce qui arrive dans les 12 h à venir :
        // au-delà, l'onglet aura de toute façon été rechargé.
        if (delai <= 0 || delai > 12 * 3600 * 1000) return;
        if (dansLaNuit(quand)) return;

        minuteurs.push(setTimeout(() => {
          if (Store.estFaite(t, jour)) return;         // déjà faite entre-temps
          envoyer('C\'est le moment 🤍', t.nom);
        }, delai));
      });
  }

  /* ─── Résumé doux à l'ouverture ─────────────────────────── */
  function resumeOuverture() {
    const jour = Store.aujourdhui();
    const p = Store.progression(jour);
    if (p.total === 0) return;

    const reste = p.total - p.faits;
    if (reste === 0) return;                            // ne rien dire : tout est fait

    // On attend un instant : le message ne doit pas gêner l'ouverture.
    setTimeout(() => {
      toast(reste === 1
        ? 'Il te reste une seule chose aujourd\'hui 🤍'
        : `Il te reste ${reste} choses aujourd'hui 🤍`);
    }, 1400);
  }

  return { planifier, basculer, majTexteAide, resumeOuverture };
})();

/* Nom court utilisé par app.js */
function planifierRappels() { Rappels.planifier(); }

/* ─── Branchements ──────────────────────────────────────── */
document.getElementById('set-notif').addEventListener('change', e => {
  Rappels.basculer(e.target.checked);
});

// Quand l'utilisateur revient sur l'appli, on remet les minuteurs à l'heure
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) Rappels.planifier();
});

Rappels.majTexteAide();
Rappels.planifier();
Rappels.resumeOuverture();
