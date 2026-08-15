/* ═══════════════════════════════════════════════════════════
   Ibadah Daily Planner — les rappels
   ───────────────────────────────────────────────────────────
   Ce fichier contient DEUX moteurs, et choisit tout seul lequel
   utiliser selon l'endroit où l'application tourne :

     • dans l'application Android → de vraies alarmes du système.
       Elles sonnent application fermée, téléphone en veille, et elles
       survivent à un redémarrage. C'est tout le but du portage.

     • sur le site web → des minuteurs posés dans la page.
       Un site ne peut pas réveiller un téléphone : les rappels ne
       tiennent que tant que la page vit. Ce n'est pas un défaut à
       corriger, c'est une limite du web — et on le dit clairement.

   ⚠️ « Silence la nuit » ne jette plus jamais un rappel. Entre 22 h
   et 6 h, le rappel s'affiche SANS BRUIT et il est là au réveil.
   L'ancien code le supprimait sans rien dire : c'est très probablement
   ce qui a fait rater les premiers essais du matin.
   ═══════════════════════════════════════════════════════════ */

const Rappels = (function () {

  /* ─── Les réglages de ce fichier ────────────────────────── */
  const DEBUT_NUIT = 22;          // la nuit commence à 22 h
  const FIN_NUIT   = 6;           // et finit à 6 h
  const JOURS_PLANIFIES = 14;     // on pose 14 jours d'alarmes d'avance
  const MAX_RAPPELS     = 200;    // large : 14 jours × 10 intentions = 140
  const HEURES_WEB      = 12;     // le site, lui, ne voit pas plus loin que 12 h

  /* Deux canaux Android, parce qu'un canal ne se modifie PLUS une fois
     créé sur le téléphone : l'un sonne, l'autre pas. C'est le seul moyen
     propre d'avoir un rappel muet la nuit et sonore le jour. */
  const CANAL_JOUR = 'ibadah-rappels';
  const CANAL_NUIT = 'ibadah-nuit';

  /* ─── Où tourne-t-on ? ──────────────────────────────────── */

  // Le greffon des vraies alarmes. Il n'existe que dans l'application :
  // sur le site web, « Capacitor » n'existe pas du tout, d'où les typeof.
  function greffon() {
    if (typeof Capacitor === 'undefined') return null;
    const p = Capacitor.Plugins;
    return (p && p.LocalNotifications) || null;
  }

  // estNatif() vient de app.js, chargé juste avant celui-ci.
  function enAppli() {
    return typeof estNatif === 'function' && estNatif() && !!greffon();
  }

  const supporteWeb = (typeof window !== 'undefined') && ('Notification' in window);

  /* ─── Le numéro d'un rappel ─────────────────────────────────
     Android ne sait manipuler que des numéros de notification qui
     tiennent sur 32 bits. Or les identifiants d'intentions sont
     fabriqués à partir de l'heure : ils font 13 chiffres. Les passer
     tels quels ferait planter le greffon ou, bien pire, tronquerait
     le numéro en silence — deux rappels différents recevraient le même
     et s'écraseraient l'un l'autre.

     On fabrique donc un numéro court à partir du couple
     « intention + jour ». Il doit être TOUJOURS LE MÊME pour le même
     couple : sinon on ne pourrait plus annuler un rappel déjà posé, et
     les rappels fantômes s'accumuleraient. */

  const NUMERO_MAX = 1073741824;                 // 2³⁰

  function numeroDeRappel(idTache, cle) {
    const texte = String(idTache) + '@' + String(cle);
    let h = 2166136261;                          // recette FNV-1a, sur 32 bits
    for (let i = 0; i < texte.length; i++) {
      h ^= texte.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % NUMERO_MAX) + 1;         // entre 1 et 2³⁰
  }

  /* ─── La nuit ───────────────────────────────────────────── */
  function heureDeNuit(h) {
    return h >= DEBUT_NUIT || h < FIN_NUIT;
  }

  // Ce rappel doit-il arriver sans bruit ?
  function sansBruit(quand) {
    return Store.reglages().silenceNuit && heureDeNuit(quand.getHours());
  }

  /* ─── La liste de ce qu'il y a à poser ──────────────────────
     Une seule fonction, la même pour les deux moteurs, et qui ne
     touche à rien : elle se contente de dire ce qui devrait sonner.
     C'est elle que les vérifications automatiques interrogent. */

  function listeDesRappels(maintenant, nbJours) {
    const jours = nbJours || JOURS_PLANIFIES;
    const depart = Store.aujourdhui();
    const liste = [];

    for (let i = 0; i < jours; i++) {
      const cle = Store.cleDecalee(depart, i);

      Store.tachesDuJour(cle).forEach(t => {
        if (!t.heure) return;

        // « Une seule fois » reste affichée tant qu'elle n'est pas faite :
        // la rappeler 14 matins de suite serait du harcèlement. Aujourd'hui
        // seulement, et elle reviendra demain si elle n'est pas cochée.
        if (t.frequence === 'once' && i > 0) return;

        // Déjà accomplie : pas de rappel. (Ne vaut que pour aujourd'hui —
        // les jours à venir ne sont jamais « déjà faits ».)
        if (Store.estFaite(t, cle)) return;

        const [h, m] = t.heure.split(':').map(Number);
        if (!isFinite(h) || !isFinite(m)) return;

        const quand = Store.dateDepuisCle(cle);
        quand.setHours(h, m, 0, 0);
        if (quand <= maintenant) return;         // l'heure est passée

        liste.push({
          id:    numeroDeRappel(t.id, cle),
          titre: 'C\'est le moment 🤍',
          corps: t.nom,
          quand,
          nuit:  sansBruit(quand)
        });
      });
    }

    // Les plus proches d'abord : si jamais il y en avait trop, ce sont
    // les rappels lointains qu'on sacrifie, pas ceux de ce soir.
    liste.sort((a, b) => a.quand - b.quand);
    return liste.slice(0, MAX_RAPPELS);
  }

  /* ═══════════════════════════════════════════════════════════
     MOTEUR 1 — l'application Android : de vraies alarmes
     ═══════════════════════════════════════════════════════════ */

  async function autorisationNative() {
    const LN = greffon();
    let etat = 'denied';
    try { etat = (await LN.checkPermissions()).display; } catch (e) { return false; }
    if (etat === 'prompt' || etat === 'prompt-with-rationale') {
      try { etat = (await LN.requestPermissions()).display; } catch (e) { return false; }
    }
    return etat === 'granted';
  }

  /* La deuxième porte : les « alarmes exactes ». Sans elle, Android a le
     droit de décaler un rappel de plusieurs minutes — « vers 5 h 45 » au
     lieu de 5 h 30 pile. On se contente de REGARDER si elle est ouverte :
     le greffon, lui, enverrait l'utilisateur dans les réglages du système
     à chaque ouverture de l'appli, ce qui serait insupportable. */
  async function alarmesExactes() {
    const LN = greffon();
    if (typeof LN.checkExactNotificationSetting !== 'function') return true;
    try { return (await LN.checkExactNotificationSetting()).exact_alarm === 'granted'; }
    catch (e) { return false; }
  }

  let canauxPrets = false;

  async function preparerCanaux() {
    if (canauxPrets) return;
    const LN = greffon();
    if (typeof LN.createChannel !== 'function') { canauxPrets = true; return; }
    try {
      await LN.createChannel({
        id: CANAL_JOUR, name: 'Rappels',
        description: 'Les rappels de tes intentions',
        importance: 4,            // 4 = il sonne et s'affiche par-dessus l'écran
        visibility: 1,            // 1 = visible sur l'écran verrouillé
        vibration: true
      });
      await LN.createChannel({
        id: CANAL_NUIT, name: 'Rappels de la nuit',
        description: 'Entre 22 h et 6 h : ils s\'affichent sans bruit',
        importance: 2,            // 2 = aucun son, aucune vibration
        visibility: 1,
        vibration: false
      });
      canauxPrets = true;
    } catch (e) { /* vieux téléphone sans canaux : on continue quand même */ }
  }

  async function toutAnnulerNatif() {
    const LN = greffon();
    try {
      if (typeof LN.cancelAll === 'function') { await LN.cancelAll(); return; }
      const enAttente = (await LN.getPending()).notifications || [];
      if (enAttente.length) {
        await LN.cancel({ notifications: enAttente.map(n => ({ id: n.id })) });
      }
    } catch (e) { /* rien en attente : tant mieux */ }
  }

  async function planifierNatif() {
    const LN = greffon();

    // On refait TOUTE la liste à chaque fois. Essayer d'annuler « juste la
    // bonne notification » est exactement ce qui fabrique des rappels
    // fantômes. Ça prend quelques dizaines de millisecondes.
    await toutAnnulerNatif();

    if (!Store.reglages().notif) return;
    if (!(await autorisationNative())) return;

    await preparerCanaux();
    const exactes = await alarmesExactes();

    const liste = listeDesRappels(new Date());
    if (!liste.length) return;

    try {
      await LN.schedule({
        notifications: liste.map(r => ({
          id:      r.id,
          title:   r.titre,
          body:    r.corps,
          channelId: r.nuit ? CANAL_NUIT : CANAL_JOUR,
          autoCancel: true,
          schedule: {
            at: r.quand,
            allowWhileIdle: true          // sonne même téléphone en veille profonde
          },
          // Si la porte des alarmes exactes est fermée, on demande une alarme
          // approximative : sinon le greffon ouvre les réglages du système
          // en pleine figure, à chaque ouverture de l'application.
          isExactNotification: exactes
        }))
      });
    } catch (e) { /* on n'insiste pas : l'appli doit rester utilisable */ }
  }

  /* ═══════════════════════════════════════════════════════════
     MOTEUR 2 — le site web : des minuteurs dans la page
     ═══════════════════════════════════════════════════════════ */

  let minuteurs = [];

  function annulerMinuteurs() {
    minuteurs.forEach(clearTimeout);
    minuteurs = [];
  }

  async function envoyerWeb(titre, corps, muet) {
    const options = {
      body: corps,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'ibadah',
      silent: !!muet
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

  function planifierWeb() {
    annulerMinuteurs();
    if (!supporteWeb) return;
    if (!Store.reglages().notif || Notification.permission !== 'granted') return;

    const maintenant = new Date();
    const limite = maintenant.getTime() + HEURES_WEB * 3600 * 1000;

    listeDesRappels(maintenant).forEach(r => {
      // Au-delà de quelques heures, la page aura de toute façon été fermée
      // ou rechargée : poser le minuteur ne servirait à rien.
      if (r.quand.getTime() > limite) return;

      minuteurs.push(setTimeout(() => {
        envoyerWeb(r.titre, r.corps, r.nuit);
      }, r.quand - maintenant));
    });
  }

  /* ═══════════════════════════════════════════════════════════
     Le chef d'orchestre
     ═══════════════════════════════════════════════════════════ */

  /* Les replanifications s'enchaînent au lieu de se chevaucher : deux
     appels rapprochés (on coche une intention, puis on revient sur
     l'appli) pourraient sinon annuler les alarmes que l'autre vient de
     poser, et il ne resterait plus rien. */
  let chaine = Promise.resolve();

  function replanifier() {
    chaine = chaine
      .then(() => (enAppli() ? planifierNatif() : planifierWeb()))
      .catch(() => {});
    return chaine;
  }

  /* ─── Activer / désactiver ──────────────────────────────── */
  async function basculer(vouluActif) {
    if (!vouluActif) {
      Store.reglerOption('notif', false);
      annulerMinuteurs();
      if (enAppli()) await toutAnnulerNatif();
      majTexteAide();
      toast('Rappels mis en pause');
      return;
    }

    // On demande l'autorisation au moment où l'utilisateur le décide,
    // jamais au lancement : une demande à froid se fait refuser par réflexe.
    const accorde = enAppli()
      ? await autorisationNative()
      : await autorisationWeb();

    if (!accorde) {
      Store.reglerOption('notif', false);
      majTexteAide();
      toast('Sans autorisation, les rappels ne peuvent pas s\'afficher');
      return;
    }

    Store.reglerOption('notif', true);
    majTexteAide();
    await replanifier();
    toast('Rappels activés 🔔');
  }

  async function autorisationWeb() {
    if (!supporteWeb) return false;
    let etat = Notification.permission;
    if (etat === 'default') {
      try { etat = await Notification.requestPermission(); } catch (e) { etat = 'denied'; }
    }
    return etat === 'granted';
  }

  /* ═══════════════════════════════════════════════════════════
     Ce que l'écran Réglages affiche
     ═══════════════════════════════════════════════════════════ */

  function majTexteAide() {
    const aide   = document.getElementById('notif-help');
    const bouton = document.getElementById('set-notif');
    if (!aide || !bouton) return;

    const actif = !!Store.reglages().notif;

    if (enAppli()) {
      bouton.disabled = false;
      bouton.checked  = actif;
      aide.textContent = actif
        ? 'Ils sonnent même quand l\'application est fermée'
        : 'Recevoir des rappels doux aux heures que tu choisis';

      // L'autorisation a pu être retirée dans les réglages du téléphone,
      // sans que l'application en sache rien : on va vérifier.
      if (actif) {
        greffon().checkPermissions()
          .then(p => {
            if (p.display === 'granted') return;
            bouton.checked = false;
            aide.textContent = 'Les notifications sont bloquées dans les réglages du téléphone';
          })
          .catch(() => {});
      }
      majPortes();
      return;
    }

    majPortes();

    if (!supporteWeb) {
      aide.textContent = 'Ton navigateur ne gère pas les notifications.';
      bouton.disabled = true;
      bouton.checked  = false;
      return;
    }
    if (Notification.permission === 'denied') {
      aide.textContent = 'Les notifications sont bloquées dans les réglages du navigateur.';
      bouton.disabled = true;
      bouton.checked  = false;
      return;
    }
    bouton.disabled = false;
    bouton.checked = actif && Notification.permission === 'granted';
    aide.textContent = bouton.checked
      ? 'Actifs tant que l\'appli est ouverte ou en arrière-plan'
      : 'Recevoir des rappels doux aux heures que tu choisis';
  }

  /* ─── Les deux portes qui restent ───────────────────────────
     Sur téléphone, avoir dit oui aux notifications ne suffit pas :
     Android peut décaler l'heure, et les fabricants (Samsung, Xiaomi,
     Huawei, Oppo…) mettent les applications en sommeil. On l'explique
     doucement, à l'endroit où l'on vient chercher ce genre de réponse,
     et seulement quand il y a vraiment quelque chose à faire. */
  function majPortes() {
    const carte = document.getElementById('portes');
    if (!carte) return;

    if (!enAppli() || !Store.reglages().notif) { carte.hidden = true; return; }

    carte.hidden = false;
    const ligne = document.getElementById('porte-exacte');
    if (!ligne) return;

    alarmesExactes()
      .then(ouverte => { ligne.hidden = ouverte; })
      .catch(() => {});
  }

  // Le bouton « Autoriser » de la première porte : là, c'est l'utilisateur
  // qui le demande, donc ouvrir l'écran du système est le bon geste.
  async function ouvrirReglageAlarmes() {
    const LN = greffon();
    if (!LN || typeof LN.changeExactNotificationSetting !== 'function') return;
    try {
      await LN.changeExactNotificationSetting();
      await replanifier();
      majPortes();
    } catch (e) { /* l'utilisateur est revenu en arrière */ }
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

  return {
    replanifier, basculer, majTexteAide, majPortes, resumeOuverture,
    ouvrirReglageAlarmes,
    // ouverts aux vérifications automatiques :
    numeroDeRappel, listeDesRappels, heureDeNuit, enAppli
  };
})();

/* Nom court utilisé par app.js */
function planifierRappels() { Rappels.replanifier(); }

/* ─── Branchements ──────────────────────────────────────────
   Ils n'ont de sens que dans un navigateur. Les vérifications
   automatiques, elles, chargent ce fichier sans écran, juste pour
   contrôler les calculs — d'où la protection ci-dessous. */
if (typeof document !== 'undefined') {

  document.getElementById('set-notif').addEventListener('change', e => {
    Rappels.basculer(e.target.checked);
  });

  const boutonAlarmes = document.getElementById('porte-exacte-btn');
  if (boutonAlarmes) {
    boutonAlarmes.addEventListener('click', () => Rappels.ouvrirReglageAlarmes());
  }

  // Quand l'utilisateur revient sur l'appli, on remet toute la liste à plat
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { Rappels.replanifier(); Rappels.majPortes(); }
  });

  Rappels.majTexteAide();
  Rappels.replanifier();
  Rappels.resumeOuverture();
}
