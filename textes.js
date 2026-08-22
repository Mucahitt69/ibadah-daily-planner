/* ═══════════════════════════════════════════════════════════
   Ibadah Daily Planner — TOUS LES MOTS DE L'APPLICATION
   ───────────────────────────────────────────────────────────

   Ce fichier contient chaque phrase que l'application peut
   afficher, en français et en anglais, côte à côte.

   ───────────────────────────────────────────────────────────
   COMMENT CORRIGER UNE PHRASE (sans savoir coder)

   Chaque phrase est une ligne de la forme :

       'un-nom-court': { fr: 'Le texte français', en: 'The English text' },

   Pour corriger, change UNIQUEMENT ce qui est entre les
   apostrophes après « fr: » ou après « en: ». Ne touche ni au
   nom court à gauche, ni aux accolades, ni aux virgules.

   ⚠️ Si le texte contient une apostrophe (comme dans « l'Ami »),
   il faut écrire \' à la place de ' — sinon la ligne se coupe
   en deux et l'application ne s'affiche plus.

   ⚠️ Certains textes contiennent des morceaux entre accolades,
   comme {n} ou {nom}. Ce sont des trous que l'application
   remplit toute seule (un nombre, un nom d'intention...).
   GARDE-LES tels quels, et garde-les dans les deux langues,
   sinon le trou reste vide à l'écran.

   ⚠️ Quelques textes contiennent <b>…</b> ou <br> : ce sont des
   marques de mise en forme (gras, retour à la ligne). Laisse-les
   en place, elles ne s'affichent pas telles quelles.

   ───────────────────────────────────────────────────────────
   AJOUTER UNE TROISIÈME LANGUE (le turc, par exemple)

   1. Ajouter la langue dans LANGUES juste en dessous :
          { code: 'tr', nom: 'Türkçe', locale: 'tr-TR' }
   2. Ajouter « tr: '…' » sur chaque ligne de TEXTES.
      Une ligne oubliée n'est PAS une erreur : l'application
      retombe alors sur le français, et rien ne casse.
   3. Dans adhkar.js, ajouter nom_tr / traduction_tr / source_tr.
   4. Dans app.js, ajouter l'édition de hadiths correspondante
      (voir COLLECTIONS : 'tur-nawawi' existe déjà).

   ⚠️ Le sens des invocations et des hadiths est du contenu
   religieux. Une traduction neuve doit être relue par une
   personne de science AVANT d'être présentée comme validée.
   Voir adhkar.js.
   ═══════════════════════════════════════════════════════════ */

/* Les langues que l'application sait parler.
   « locale » sert à écrire les dates (« vendredi 22 août »). */
const LANGUES = [
  { code: 'fr', nom: 'Français', locale: 'fr-FR' },
  { code: 'en', nom: 'English',  locale: 'en-GB' }
];

const LANGUE_PAR_DEFAUT = 'fr';
const CLE_LANGUE = 'ibadah-langue';


/* ═══════════════════════════════════════════════════════════
   LE CHOIX DE LA LANGUE
   ═══════════════════════════════════════════════════════════ */

const Langue = (function () {

  function connue(code) {
    return LANGUES.some(l => l.code === code);
  }

  /* Ce que parle le téléphone. Un anglophone qui ouvre l'application
     pour la première fois ne doit pas tomber sur du français. */
  function devinee() {
    const dites = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language || ''];
    for (const brute of dites) {
      const court = String(brute).slice(0, 2).toLowerCase();
      if (connue(court)) return court;
    }
    return LANGUE_PAR_DEFAUT;
  }

  /* La langue choisie à la main l'emporte toujours sur celle du
     téléphone. Tant que personne n'a choisi, on suit le téléphone. */
  function choisie() {
    let gardee = null;
    try { gardee = localStorage.getItem(CLE_LANGUE); } catch (e) {}
    return connue(gardee) ? gardee : devinee();
  }

  function choisir(code) {
    if (!connue(code)) return;
    try { localStorage.setItem(CLE_LANGUE, code); } catch (e) {}
  }

  function fiche() {
    const c = choisie();
    return LANGUES.find(l => l.code === c) || LANGUES[0];
  }

  /* Pour les dates : « fr-FR », « en-GB »… */
  function locale() {
    return fiche().locale;
  }

  return { choisie, choisir, devinee, locale, fiche, connue };
})();


/* ═══════════════════════════════════════════════════════════
   T('nom-court') → la phrase dans la bonne langue

   T('nom-court', { n: 3 })  remplit les trous {n}.

   Si la phrase n'existe pas dans la langue choisie, on retombe
   sur le français : une traduction oubliée laisse un mot
   français à l'écran, jamais un écran vide.
   ═══════════════════════════════════════════════════════════ */

function T(cle, valeurs) {
  const entree = TEXTES[cle];
  if (!entree) return cle;          // clé inconnue : on montre la clé, ça se repère
  const code = Langue.choisie();
  let s = entree[code];
  if (s === undefined || s === null || s === '') s = entree.fr;
  if (s === undefined) return cle;
  if (valeurs) {
    s = String(s).replace(/\{(\w+)\}/g, (tout, nom) =>
      (valeurs[nom] !== undefined ? valeurs[nom] : tout));
  }
  return s;
}


/* ═══════════════════════════════════════════════════════════
   Écrit les traductions dans la page.

   Dans index.html, chaque élément à traduire porte une marque :
     data-t="nom-court"        → remplace le texte de l'élément
     data-t-html="nom-court"   → idem, mais accepte <b> et <br>
     data-t-aria="nom-court"   → remplace le aria-label (lecteur d'écran)
     data-t-ph="nom-court"     → remplace le texte grisé d'un champ
   ═══════════════════════════════════════════════════════════ */

function traduirePage(racine) {
  const zone = racine || document;

  zone.querySelectorAll('[data-t]').forEach(el => {
    el.textContent = T(el.dataset.t);
  });
  zone.querySelectorAll('[data-t-html]').forEach(el => {
    el.innerHTML = T(el.dataset.tHtml);
  });
  zone.querySelectorAll('[data-t-aria]').forEach(el => {
    el.setAttribute('aria-label', T(el.dataset.tAria));
  });
  zone.querySelectorAll('[data-t-ph]').forEach(el => {
    el.setAttribute('placeholder', T(el.dataset.tPh));
  });
  // Pour les balises qui n'ont pas de texte visible mais un « content » :
  // la description du site, celle qui s'affiche quand on partage le lien.
  zone.querySelectorAll('[data-t-content]').forEach(el => {
    el.setAttribute('content', T(el.dataset.tContent));
  });

  // La langue de la page elle-même : elle indique au téléphone
  // comment prononcer le texte à voix haute, et comment couper
  // les mots en fin de ligne.
  if (!racine) document.documentElement.setAttribute('lang', Langue.choisie());
}


/* ═══════════════════════════════════════════════════════════
   TOUS LES TEXTES

   Rangés dans l'ordre des écrans, pour s'y retrouver.
   ═══════════════════════════════════════════════════════════ */

const TEXTES = {

  /* La description du site, celle qui s'affiche quand on partage le lien. */
  'site.description':   { fr: 'Un carnet doux pour ne rien oublier de ton quotidien spirituel.',
                          en: 'A gentle journal so you forget nothing of your daily worship.' },

  /* ─── La barre du bas ────────────────────────────────── */
  'nav.today':          { fr: 'Aujourd\'hui',   en: 'Today' },
  'nav.stats':          { fr: 'Progrès',        en: 'Progress' },
  'nav.hadith':         { fr: 'Hadith',         en: 'Hadith' },
  'nav.settings':       { fr: 'Réglages',       en: 'Settings' },
  'nav.aria':           { fr: 'Navigation principale', en: 'Main navigation' },
  'nav.today.aria':     { fr: 'Aujourd\'hui',   en: 'Today' },
  'nav.stats.aria':     { fr: 'Progrès',        en: 'Progress' },
  'nav.hadith.aria':    { fr: 'Hadith du jour', en: 'Hadith of the day' },
  'nav.settings.aria':  { fr: 'Réglages',       en: 'Settings' },

  /* ─── Écran « Aujourd'hui » ──────────────────────────── */
  'today.salam':        { fr: 'Assalamu alaykum', en: 'Assalamu alaykum' },
  'today.theme.aria':   { fr: 'Changer le thème clair / sombre', en: 'Switch light / dark theme' },
  'today.simule':       { fr: ' — jour simulé',  en: ' — simulated day' },

  'today.install.texte': { fr: 'Ajoute Ibadah à ton écran d\'accueil pour l\'ouvrir comme une vraie appli.',
                           en: 'Add Ibadah to your home screen to open it like a real app.' },
  'today.install.oui':   { fr: 'Installer',      en: 'Install' },
  'today.install.non':   { fr: 'Masquer cette proposition', en: 'Dismiss this suggestion' },
  'today.install.faite': { fr: 'Ibadah est installée 🤍', en: 'Ibadah is installed 🤍' },

  'today.ring.aria':    { fr: 'Progression du jour', en: 'Progress for today' },
  'today.ring.sub':     { fr: 'de ta journée',   en: 'of your day' },
  'today.ring.detail':  { fr: 'Progression du jour : {pourcent} pour cent, {faits} sur {total}',
                          en: 'Progress for today: {pourcent} per cent, {faits} of {total}' },
  'today.ring.compte':  { fr: '{faits} / {total} accomplis', en: '{faits} / {total} done' },

  'today.jours':        { fr: 'jours',           en: 'days' },
  'today.sur30':        { fr: 'sur 30 j',        en: 'over 30 d' },

  'today.prieres.titre':  { fr: 'Les 5 prières', en: 'The 5 prayers' },
  'today.prieres.aria':   { fr: 'Les cinq prières du jour', en: 'The five daily prayers' },
  'today.prieres.toutes': { fr: 'Toutes accomplies 🤍', en: 'All done 🤍' },
  'today.prieres.une':    { fr: '1 restante',    en: '1 left' },
  'today.prieres.reste':  { fr: '{n} restantes', en: '{n} left' },
  'today.priere.faite':   { fr: '{nom} : accomplie',    en: '{nom}: done' },
  'today.priere.afaire':  { fr: '{nom} : à accomplir',  en: '{nom}: to do' },
  'today.priere.bravo':   { fr: '{nom} accomplie — qu\'Allah l\'accepte 🤍',
                            en: '{nom} done — may Allah accept it 🤍' },

  'today.taches.titre': { fr: 'Aujourd\'hui',    en: 'Today' },
  'today.taches.reste': { fr: '{n} à faire',     en: '{n} to do' },
  'today.groupe.autres':{ fr: 'Autres',          en: 'Other' },

  'today.vide.titre':   { fr: 'Ta journée est libre', en: 'Your day is open' },
  'today.vide.texte':   { fr: 'Ajoute une première intention.<br>Même une seule, faite avec sincérité, compte.',
                          en: 'Add a first intention.<br>Even a single one, done sincerely, counts.' },
  'today.fini.titre':   { fr: 'Tout est accompli 🤍', en: 'Everything is done 🤍' },
  'today.fini.texte':   { fr: 'Tu as terminé tes intentions du jour.<br>Qu\'Allah les accepte de toi.',
                          en: 'You have finished your intentions for today.<br>May Allah accept them from you.' },
  'today.vide.bouton':  { fr: 'Ajouter une tâche', en: 'Add a task' },
  'today.fab.aria':     { fr: 'Ajouter une tâche', en: 'Add a task' },

  'today.done.titre':   { fr: 'Terminées',       en: 'Completed' },

  /* Les messages d'accueil, selon l'avancement du jour */
  'today.msg.0':        { fr: 'Une nouvelle journée t\'est offerte.', en: 'A new day is given to you.' },
  'today.msg.1':        { fr: 'Tu as commencé, c\'est le plus important.', en: 'You have started — that is what matters most.' },
  'today.msg.2':        { fr: 'Belle avancée, continue tranquillement.', en: 'Good progress, keep going gently.' },
  'today.msg.3':        { fr: 'Presque tout est accompli, ma sha Allah.', en: 'Almost everything is done, ma sha Allah.' },
  'today.msg.4':        { fr: 'Journée complète — qu\'Allah accepte de toi 🤍', en: 'A full day — may Allah accept it from you 🤍' },
  'today.msg.depart':   { fr: 'Qu\'Allah facilite ta journée.', en: 'May Allah make your day easy.' },

  /* Une intention dans la liste */
  'tache.terminee':     { fr: '{nom} : terminée', en: '{nom}: done' },
  'tache.afaire':       { fr: '{nom} : à faire',  en: '{nom}: to do' },
  'tache.toutcocher':   { fr: 'Tout cocher',      en: 'Check all' },
  'tache.toutdecocher': { fr: 'Tout décocher',    en: 'Uncheck all' },
  'tache.ouvrir':       { fr: '{nom} : {faits} sur {total}, ouvrir la liste',
                          en: '{nom}: {faits} of {total}, open the list' },
  'tache.options':      { fr: 'Options pour {nom}', en: 'Options for {nom}' },
  'tache.complete':     { fr: '{nom} : tout est accompli 🤍', en: '{nom}: all done 🤍' },
  'tache.lire':         { fr: 'Lire le texte : {nom}', en: 'Read the text: {nom}' },
  'tache.ajoutdhikr':   { fr: 'Ajouter un dhikr', en: 'Add a dhikr' },

  /* ─── Écran « Progrès » ──────────────────────────────── */
  'stats.sur':          { fr: 'Ton cheminement', en: 'Your journey' },
  'stats.titre':        { fr: 'Statistiques',    en: 'Statistics' },
  'stats.streak':       { fr: 'jours d\'affilée', en: 'days in a row' },
  'stats.best':         { fr: 'meilleure série', en: 'best streak' },
  'stats.regularite':   { fr: 'de régularité sur 30 jours', en: 'consistency over 30 days' },
  'stats.prieres':      { fr: 'des prières sur 30 jours', en: 'of prayers over 30 days' },

  'stats.sept.titre':   { fr: 'Ces 7 derniers jours', en: 'These last 7 days' },
  'stats.sept.hint':    { fr: 'part de la journée accomplie', en: 'share of the day completed' },
  'stats.sept.aria':    { fr: 'Graphique des 7 derniers jours', en: 'Chart of the last 7 days' },
  'stats.sept.detail':  { fr: 'Part de la journée accomplie sur 7 jours : ',
                          en: 'Share of the day completed over 7 days: ' },
  'stats.sept.jour':    { fr: '{lettre} {part} pour cent', en: '{lettre} {part} per cent' },

  'stats.mois.titre':   { fr: 'Ton mois',        en: 'Your month' },
  'stats.mois.aria':    { fr: 'Grille du mois',  en: 'Month grid' },
  'stats.mois.detail':  { fr: 'Grille du mois : {n} jours où quelque chose a été accompli.',
                          en: 'Month grid: {n} days where something was completed.' },
  'stats.mois.rien':    { fr: 'Rien',            en: 'Nothing' },
  'stats.mois.partiel': { fr: 'Commencé',        en: 'Started' },
  'stats.mois.complet': { fr: 'Journée entière', en: 'Full day' },

  'stats.chaque.titre': { fr: 'Chaque intention', en: 'Each intention' },
  'stats.chaque.hint':  { fr: 'sur 30 jours',    en: 'over 30 days' },
  'stats.chaque.vide':  { fr: 'Tes intentions apparaîtront ici dès que tu en auras coché quelques-unes.',
                          en: 'Your intentions will appear here as soon as you have checked a few.' },
  'stats.chaque.aria':  { fr: '{faits} fois sur {prevus} jours prévus',
                          en: '{faits} times out of {prevus} planned days' },

  'stats.badges.titre': { fr: 'Tes badges',      en: 'Your badges' },
  'stats.note':         { fr: 'Ici, rien ne se compte en points : la valeur d\'un acte ne se chiffre pas. On regarde seulement la constance — et ces chiffres ne sont visibles que par toi, ni partagés ni comparés à ceux d\'autres personnes.',
                          en: 'Nothing here is counted in points: the worth of a deed cannot be measured. We only look at consistency — and these figures are visible to you alone, never shared, never compared with anyone else\'s.' },

  /* Les badges */
  'badge.7j':           { fr: '7 jours d\'affilée',  en: '7 days in a row' },
  'badge.30j':          { fr: '30 jours d\'affilée', en: '30 days in a row' },
  'badge.60j':          { fr: '60 jours d\'affilée', en: '60 days in a row' },
  'badge.fajr':         { fr: 'Fajr tenu tout un mois', en: 'Fajr held for a whole month' },
  'badge.40':           { fr: 'Une intention tenue 40 fois', en: 'One intention kept 40 times' },
  'badge.10':           { fr: '10 journées entières', en: '10 full days' },

  /* ─── Écran « Hadith » ───────────────────────────────── */
  'hadith.sur':         { fr: 'Rappel du jour',  en: 'Reminder of the day' },
  'hadith.titre':       { fr: 'Hadith',          en: 'Hadith' },
  'hadith.autre.aria':  { fr: 'Voir un autre hadith', en: 'See another hadith' },
  'hadith.chargement':  { fr: 'Recherche du hadith du jour…', en: 'Looking for today\'s hadith…' },
  'hadith.plus':        { fr: 'Voir plus',       en: 'Show more' },
  'hadith.moins':       { fr: 'Voir moins',      en: 'Show less' },
  'hadith.collection':  { fr: 'Les 40 hadiths de an-Nawawi', en: 'The 40 Hadith of an-Nawawi' },
  'hadith.numero':      { fr: '{titre} — n° {n}', en: '{titre} — no. {n}' },
  'hadith.horsligne':   { fr: 'Texte de secours, sans connexion.', en: 'Offline fallback text.' },

  'infos.titre':        { fr: 'Infos importantes', en: 'Important notes' },
  'infos.rappel.tag':   { fr: 'Rappel',          en: 'Reminder' },
  'infos.rappel':       { fr: 'Le jeûne du lundi et du jeudi est une sunna régulière du Prophète ﷺ.',
                          en: 'Fasting on Mondays and Thursdays is a regular sunna of the Prophet ﷺ.' },
  'infos.calendrier.tag': { fr: 'Calendrier',    en: 'Calendar' },
  'infos.calendrier':   { fr: 'Les jours blancs (13, 14, 15 du mois hégirien) approchent — pense à les noter.',
                          en: 'The white days (13th, 14th, 15th of the Hijri month) are coming — remember to note them.' },
  'infos.conseil.tag':  { fr: 'Conseil',         en: 'Tip' },
  'infos.conseil':      { fr: 'Place tes adhkar du matin juste après la prière du Fajr : le geste devient automatique.',
                          en: 'Put your morning adhkar right after the Fajr prayer: it becomes automatic.' },
  'infos.communaute.tag': { fr: 'Communauté',    en: 'Community' },
  'infos.communaute':   { fr: 'Une aumône, même petite, chaque vendredi : c\'est une habitude simple à tenir.',
                          en: 'A charity, however small, every Friday: it is a simple habit to keep.' },

  /* ─── Écran « Réglages » ─────────────────────────────── */
  'set.sur':            { fr: 'Ton espace',      en: 'Your space' },
  'set.titre':          { fr: 'Réglages',        en: 'Settings' },

  'set.langue':         { fr: 'Langue',          en: 'Language' },
  'set.langue.help':    { fr: 'La langue de l\'application', en: 'The language of the app' },
  'set.langue.aria':    { fr: 'Choisir la langue de l\'application', en: 'Choose the app language' },

  'set.notif':          { fr: 'Rappels',         en: 'Reminders' },
  'set.notif.help':     { fr: 'Recevoir des notifications douces', en: 'Receive gentle notifications' },
  'set.dark':           { fr: 'Mode sombre',     en: 'Dark mode' },
  'set.dark.help':      { fr: 'Plus reposant le soir', en: 'Easier on the eyes at night' },
  'set.quiet':          { fr: 'Silence la nuit', en: 'Silent at night' },
  'set.quiet.help':     { fr: 'Les rappels de la nuit s\'affichent sans son',
                          en: 'Night reminders appear without sound' },

  'set.exacte':         { fr: 'Sonner à l\'heure exacte', en: 'Ring at the exact time' },
  'set.exacte.help':    { fr: 'Sans cette autorisation, Android a le droit de décaler un rappel de plusieurs minutes.',
                          en: 'Without this permission, Android may delay a reminder by several minutes.' },
  'set.exacte.btn':     { fr: 'Autoriser',       en: 'Allow' },
  'set.jamais':         { fr: 'Si un rappel n\'arrive jamais', en: 'If a reminder never arrives' },
  'set.jamais.help':    { fr: 'Ton téléphone met peut-être Ibadah en sommeil. Sur Samsung : Paramètres → Batterie → Limites d\'utilisation en arrière-plan → retirer Ibadah, ou la passer en « Sans restriction ».',
                          en: 'Your phone may be putting Ibadah to sleep. On Samsung: Settings → Battery → Background usage limits → remove Ibadah, or set it to "Unrestricted".' },

  'set.hijri':          { fr: 'Date hégirienne', en: 'Hijri date' },
  'set.hijri.aujourd':  { fr: 'Aujourd\'hui : {date}', en: 'Today: {date}' },
  'set.hijri.non':      { fr: 'Non disponible sur ce navigateur', en: 'Not available on this browser' },
  'set.hijri.moins':    { fr: 'Reculer la date d\'un jour', en: 'Move the date back one day' },
  'set.hijri.plus':     { fr: 'Avancer la date d\'un jour', en: 'Move the date forward one day' },
  'set.hijri.note':     { fr: 'La date hégirienne est <b>calculée</b>, pas annoncée : le vrai calendrier dépend de l\'observation de la lune. Si ta mosquée annonce un autre jour, ajuste ici — l\'application ne te dira jamais quoi accomplir à partir de cette date.',
                          en: 'The Hijri date is <b>calculated</b>, not announced: the real calendar depends on sighting the moon. If your mosque announces a different day, adjust it here — the app will never tell you what to do based on this date.' },

  'set.export':         { fr: 'Sauvegarder mes données', en: 'Back up my data' },
  'set.export.help':    { fr: 'Enregistre un fichier à garder en lieu sûr', en: 'Saves a file to keep somewhere safe' },
  'set.export.aria':    { fr: 'Sauvegarder mes données dans un fichier', en: 'Back up my data to a file' },
  'set.import':         { fr: 'Restaurer une sauvegarde', en: 'Restore a backup' },
  'set.import.help':    { fr: 'Remplace tout par le contenu d\'un fichier', en: 'Replaces everything with the contents of a file' },
  'set.import.aria':    { fr: 'Restaurer une sauvegarde', en: 'Restore a backup' },
  'set.recover':        { fr: 'Récupérer un ancien carnet', en: 'Recover an older notebook' },
  'set.recover.aria':   { fr: 'Récupérer un carnet d\'une version précédente', en: 'Recover a notebook from a previous version' },
  'set.recover.trouve': { fr: 'Retrouvé sur cet appareil : {resume}', en: 'Found on this device: {resume}' },
  'set.donnees.note':   { fr: 'Tes données ne vivent que sur cet appareil. Changer de téléphone, vider le navigateur ou désinstaller l\'application les efface définitivement. <b>Une sauvegarde de temps en temps est la seule protection.</b>',
                          en: 'Your data lives only on this device. Changing phone, clearing the browser or uninstalling the app erases it for good. <b>A backup from time to time is the only protection.</b>' },

  'set.demo':           { fr: 'Charger des données d\'exemple', en: 'Load sample data' },
  'set.demo.help':      { fr: '12 jours d\'historique pour voir les statistiques', en: '12 days of history to see the statistics' },
  'set.clear':          { fr: 'Tout effacer',    en: 'Erase everything' },
  'set.clear.help':     { fr: 'Repartir d\'une page blanche', en: 'Start from a blank page' },

  'set.contact':        { fr: 'Nous écrire',     en: 'Write to us' },
  'set.contact.help':   { fr: 'Une idée, une gêne, quelque chose qui ne marche pas',
                          en: 'An idea, a niggle, something that does not work' },
  'set.contact.aria':   { fr: 'Écrire à l\'auteur de l\'application', en: 'Write to the app\'s author' },
  'set.contact.note':   { fr: 'Le message part avec la version de l\'application, le modèle de ton téléphone et l\'écran où tu te trouvais — c\'est ce qui permet de retrouver un problème. <b>Rien de ton carnet n\'est joint</b> : ni tes intentions, ni ton historique. Tu vois le message entier avant de l\'envoyer, et tu peux tout effacer.',
                          en: 'The message goes out with the app version, your phone model and the screen you were on — that is what makes a problem findable. <b>Nothing from your notebook is attached</b>: not your intentions, not your history. You see the whole message before sending it, and you can erase any of it.' },
  /* ⚠️ Le numéro de version s'écrit dans TROIS fichiers : ici (une fois par
     langue), dans index.html, et dans android/app/build.gradle. C'est cette
     ligne-ci qui gagne à l'écran. Un test refuse qu'ils se contredisent. */
  'set.version.note':   { fr: 'Ibadah Daily Planner — version 0.5.<br>Tes données restent sur cet appareil. Seul le hadith du jour est cherché en ligne.',
                          en: 'Ibadah Daily Planner — version 0.5.<br>Your data stays on this device. Only the hadith of the day is fetched online.' },

  /* Le message que l'on écrit à l'auteur */
  'contact.entete1':    { fr: 'Ces quelques lignes aident à retrouver le problème.',
                          en: 'These few lines help track down the problem.' },
  'contact.entete2':    { fr: 'Tu peux les effacer si tu préfères.', en: 'You can delete them if you prefer.' },
  'contact.version':    { fr: 'Version : ',      en: 'Version: ' },
  'contact.appareil':   { fr: 'Appareil : ',     en: 'Device: ' },
  'contact.installee':  { fr: 'Application installée : ', en: 'App installed: ' },
  'contact.oui':        { fr: 'oui',             en: 'yes' },
  'contact.non':        { fr: 'non, ouverte dans le navigateur', en: 'no, opened in the browser' },
  'contact.langue':     { fr: 'Langue : ',       en: 'Language: ' },
  'contact.inconnue':   { fr: 'inconnue',        en: 'unknown' },
  'contact.sujet':      { fr: 'Ibadah — un retour', en: 'Ibadah — feedback' },
  'contact.dev':        { fr: 'en développement', en: 'in development' },

  /* ─── Feuille « Ajouter / Modifier une intention » ───── */
  'sheet.titre.new':    { fr: 'Nouvelle intention', en: 'New intention' },
  'sheet.titre.edit':   { fr: 'Modifier l\'intention', en: 'Edit intention' },
  'sheet.nom.label':    { fr: 'Que veux-tu accomplir ?', en: 'What would you like to do?' },
  'sheet.nom.ph':       { fr: 'Ex : Lire une page de Coran', en: 'E.g. Read a page of Qur\'an' },
  'sheet.nom.err':      { fr: 'Écris d\'abord le nom de ta tâche 🙂', en: 'Please write a name for your task first 🙂' },
  'sheet.freq.label':   { fr: 'À quelle fréquence ?', en: 'How often?' },
  'sheet.freq.aria':    { fr: 'Fréquence',       en: 'Frequency' },
  'sheet.jour.label':   { fr: 'Quel jour ?',     en: 'Which day?' },
  'sheet.jour.aria':    { fr: 'Jour de la semaine', en: 'Day of the week' },
  'sheet.heure.label':  { fr: 'Un rappel ?',     en: 'A reminder?' },
  'sheet.heure.opt':    { fr: '(facultatif)',    en: '(optional)' },
  'sheet.heure.nuit':   { fr: 'Entre 22h et 6h, ce rappel s\'affichera <b>sans son</b>.',
                          en: 'Between 10pm and 6am, this reminder will appear <b>without sound</b>.' },
  'sheet.heure.sonner': { fr: 'Le laisser sonner', en: 'Let it ring' },
  'sheet.annuler':      { fr: 'Annuler',         en: 'Cancel' },
  'sheet.ajouter':      { fr: 'Ajouter',         en: 'Add' },
  'sheet.enregistrer':  { fr: 'Enregistrer',     en: 'Save' },

  /* Les rythmes */
  'freq.daily':         { fr: 'Chaque jour',     en: 'Every day' },
  'freq.weekly':        { fr: 'Chaque semaine',  en: 'Every week' },
  'freq.monthly':       { fr: 'Chaque mois',     en: 'Every month' },
  'freq.once':          { fr: 'Une fois',        en: 'Once' },
  'freq.chaque':        { fr: 'Chaque ',         en: 'Every ' },
  'freq.chaquemois':    { fr: 'Chaque mois le ', en: 'Every month on the ' },

  /* Les jours de la semaine — version courte (boutons) */
  'jour.court.0':       { fr: 'Dim',             en: 'Sun' },
  'jour.court.1':       { fr: 'Lun',             en: 'Mon' },
  'jour.court.2':       { fr: 'Mar',             en: 'Tue' },
  'jour.court.3':       { fr: 'Mer',             en: 'Wed' },
  'jour.court.4':       { fr: 'Jeu',             en: 'Thu' },
  'jour.court.5':       { fr: 'Ven',             en: 'Fri' },
  'jour.court.6':       { fr: 'Sam',             en: 'Sat' },
  /* … et version longue (phrases, lecteur d'écran) */
  'jour.long.0':        { fr: 'dimanche',        en: 'Sunday' },
  'jour.long.1':        { fr: 'lundi',           en: 'Monday' },
  'jour.long.2':        { fr: 'mardi',           en: 'Tuesday' },
  'jour.long.3':        { fr: 'mercredi',        en: 'Wednesday' },
  'jour.long.4':        { fr: 'jeudi',           en: 'Thursday' },
  'jour.long.5':        { fr: 'vendredi',        en: 'Friday' },
  'jour.long.6':        { fr: 'samedi',          en: 'Saturday' },

  /* Les mois hégiriens — mêmes noms arabes, écrits à la mode
     de chaque langue. */
  'hijri.1':            { fr: 'Mouharram',       en: 'Muharram' },
  'hijri.2':            { fr: 'Safar',           en: 'Safar' },
  'hijri.3':            { fr: 'Rabi\' al-Awwal', en: 'Rabi\' al-Awwal' },
  'hijri.4':            { fr: 'Rabi\' ath-Thani', en: 'Rabi\' ath-Thani' },
  'hijri.5':            { fr: 'Joumada al-Oula', en: 'Jumada al-Ula' },
  'hijri.6':            { fr: 'Joumada ath-Thania', en: 'Jumada ath-Thaniya' },
  'hijri.7':            { fr: 'Rajab',           en: 'Rajab' },
  'hijri.8':            { fr: 'Cha\'ban',        en: 'Sha\'ban' },
  'hijri.9':            { fr: 'Ramadan',         en: 'Ramadan' },
  'hijri.10':           { fr: 'Chawwal',         en: 'Shawwal' },
  'hijri.11':           { fr: 'Dhou al-Qi\'da',  en: 'Dhu al-Qi\'dah' },
  'hijri.12':           { fr: 'Dhou al-Hijja',   en: 'Dhu al-Hijjah' },

  /* ─── Menu d'une intention ───────────────────────────── */
  'menu.edit':          { fr: 'Modifier cette intention', en: 'Edit this intention' },
  'menu.dhikr':         { fr: 'Choisir des dhikr à mettre dedans', en: 'Choose dhikr to put inside' },
  'menu.delete':        { fr: 'Retirer de ma liste', en: 'Remove from my list' },
  'menu.annuler':       { fr: 'Annuler',         en: 'Cancel' },
  'menu.confirm':       { fr: 'Cette intention ne s\'affichera plus les prochains jours.<br>Ce que tu as déjà accompli reste inscrit dans ton historique.',
                          en: 'This intention will no longer appear on the coming days.<br>What you have already done stays recorded in your history.' },
  'menu.garder':        { fr: 'Garder',          en: 'Keep' },
  'menu.retirer':       { fr: 'Retirer',         en: 'Remove' },

  /* ─── La bibliothèque de dhikr ───────────────────────── */
  'biblio.titre':       { fr: 'Choisir des dhikr', en: 'Choose dhikr' },
  'biblio.retour':      { fr: 'Revenir à ma liste', en: 'Back to my list' },
  'biblio.cats.aria':   { fr: 'Catégories de dhikr', en: 'Dhikr categories' },
  'biblio.perso':       { fr: 'Écrire mon propre dhikr', en: 'Write my own dhikr' },
  'biblio.aucun':       { fr: 'Aucun dhikr choisi', en: 'No dhikr chosen' },
  'biblio.un':          { fr: '1 dhikr choisi',  en: '1 dhikr chosen' },
  'biblio.plusieurs':   { fr: '{n} dhikr choisis', en: '{n} dhikr chosen' },
  'biblio.save':        { fr: 'Enregistrer',     en: 'Save' },
  'biblio.mesdhikr':    { fr: 'Tes propres dhikr', en: 'Your own dhikr' },
  'biblio.dansliste':   { fr: '{nom} : dans ma liste', en: '{nom}: in my list' },
  'biblio.warn.titre':  { fr: 'Certains textes ne sont pas encore relus',
                          en: 'Some texts have not been reviewed yet' },
  'biblio.warn.texte':  { fr: 'Les invocations ajoutées récemment n\'ont pas encore été validées par une personne de science. Chacune porte un avertissement quand tu l\'ouvres : fais-la vérifier avant de t\'appuyer dessus ou de la partager.',
                          en: 'Recently added invocations have not yet been validated by a person of knowledge. Each one carries a warning when you open it: have it checked before relying on it or sharing it.' },
  /* En anglais, la traduction du sens n'a PAS encore été relue :
     le bandeau parle donc de toute la bibliothèque, pas seulement
     des ajouts récents. Voir adhkar.js. */
  'biblio.warn.titre.trad': { fr: 'Certains textes ne sont pas encore relus',
                              en: 'These translations have not been reviewed yet' },
  'biblio.warn.texte.trad': { fr: 'Les invocations ajoutées récemment n\'ont pas encore été validées par une personne de science. Chacune porte un avertissement quand tu l\'ouvres : fais-la vérifier avant de t\'appuyer dessus ou de la partager.',
                              en: 'The Arabic and the transliteration were reviewed and validated. The English meaning, however, is a new translation that no person of knowledge has checked yet. Have it verified before relying on it or sharing it.' },

  /* ─── Lire un dhikr ──────────────────────────────────── */
  'lecture.fois':       { fr: 'À répéter {n} fois', en: 'To repeat {n} times' },
  'lecture.unefois':    { fr: 'Une fois',        en: 'Once' },
  'lecture.warn':       { fr: 'Ce texte n\'a pas encore été relu par une personne de science. Vérifie-le auprès de quelqu\'un de confiance avant de t\'y fier.',
                          en: 'This text has not yet been reviewed by a person of knowledge. Check it with someone you trust before relying on it.' },
  'lecture.warn.trad':  { fr: 'Ce texte n\'a pas encore été relu par une personne de science. Vérifie-le auprès de quelqu\'un de confiance avant de t\'y fier.',
                          en: 'The English meaning below is a new translation that has not yet been reviewed by a person of knowledge. The Arabic and the transliteration were reviewed. Check the meaning with someone you trust before relying on it.' },
  'lecture.fermer':     { fr: 'Fermer',          en: 'Close' },
  'lecture.fait':       { fr: 'C\'est fait',     en: 'Done' },
  'lecture.decocher':   { fr: 'Décocher',        en: 'Uncheck' },

  /* ─── Écrire son propre dhikr ────────────────────────── */
  'perso.titre':        { fr: 'Écrire mon propre dhikr', en: 'Write my own dhikr' },
  'perso.nom.label':    { fr: 'Son nom',         en: 'Its name' },
  'perso.nom.ph':       { fr: 'Ex : Sourate Al-Kahf', en: 'E.g. Surah Al-Kahf' },
  'perso.nom.err':      { fr: 'Écris d\'abord un nom 🙂', en: 'Please write a name first 🙂' },
  'perso.fois.label':   { fr: 'Combien de fois ?', en: 'How many times?' },
  'perso.annuler':      { fr: 'Annuler',         en: 'Cancel' },
  'perso.ajouter':      { fr: 'Ajouter',         en: 'Add' },

  /* ─── Les questions de l'application ─────────────────── */
  'ask.continuer':      { fr: 'Continuer',       en: 'Continue' },
  'ask.annuler':        { fr: 'Annuler',         en: 'Cancel' },
  'ask.compris':        { fr: 'J\'ai compris',   en: 'Understood' },

  /* ─── Les petits messages qui passent ────────────────── */
  'toast.0':            { fr: 'Alhamdoulillah, c\'est fait ✨', en: 'Alhamdulillah, it is done ✨' },
  'toast.1':            { fr: 'Barak Allahu fik, continue ainsi', en: 'Barak Allahu fik, keep going' },
  'toast.2':            { fr: 'Un pas de plus, qu\'Allah l\'accepte', en: 'One step more, may Allah accept it' },
  'toast.3':            { fr: 'Ma sha Allah, belle constance', en: 'Ma sha Allah, fine consistency' },
  'toast.4':            { fr: 'Petit à petit, régulièrement — c\'est ce qu\'Allah aime',
                          en: 'Little by little, regularly — that is what Allah loves' },

  'toast.modifiee':     { fr: 'Intention modifiée ✍️', en: 'Intention updated ✍️' },
  'toast.ajoutee':      { fr: 'Intention ajoutée — qu\'Allah te facilite 🤍',
                          en: 'Intention added — may Allah make it easy for you 🤍' },
  'toast.retiree':      { fr: 'Intention retirée. Ce qui est accompli reste inscrit.',
                          en: 'Intention removed. What you completed stays recorded.' },
  'toast.dhikrmaj':     { fr: 'Ta liste de dhikr est à jour 🤍', en: 'Your dhikr list is up to date 🤍' },
  'toast.nuitsonne':    { fr: 'Les rappels de la nuit sonneront', en: 'Night reminders will ring' },
  'toast.listeprete':   { fr: 'Ta liste est prête — qu\'Allah te facilite 🤍',
                          en: 'Your list is ready — may Allah make it easy for you 🤍' },
  'toast.demo':         { fr: 'Données d\'exemple chargées ↺', en: 'Sample data loaded ↺' },
  'toast.quitter':      { fr: 'Appuie encore pour quitter', en: 'Press again to exit' },

  /* ─── Sauvegarder / restaurer ────────────────────────── */
  'sauv.nom':           { fr: 'Sauvegarde Ibadah', en: 'Ibadah backup' },
  'sauv.partage':       { fr: 'Envoyer une copie de ta sauvegarde', en: 'Send a copy of your backup' },
  'sauv.ok.titre':      { fr: 'Sauvegarde enregistrée', en: 'Backup saved' },
  'sauv.ok.copie':      { fr: 'Envoyer une copie', en: 'Send a copy' },
  'sauv.ok.bon':        { fr: 'C’est bon',       en: 'All good' },
  'sauv.ok.toast':      { fr: 'Sauvegarde enregistrée — {resume} 🤍', en: 'Backup saved — {resume} 🤍' },
  'sauv.echec':         { fr: 'La sauvegarde n\'a pas pu être enregistrée.', en: 'The backup could not be saved.' },

  'rest.illisible.titre': { fr: 'Ce fichier ne peut pas être lu', en: 'This file cannot be read' },
  'rest.illisible.texte': { fr: 'Choisis un fichier de sauvegarde Ibadah — son nom commence par « ibadah-sauvegarde ».',
                            en: 'Choose an Ibadah backup file — its name starts with "ibadah-sauvegarde".' },
  'rest.inutilisable':  { fr: 'Cette sauvegarde est inutilisable', en: 'This backup cannot be used' },
  'rest.remplacer.titre': { fr: 'Remplacer ton carnet ?', en: 'Replace your notebook?' },
  'rest.remplacer.ok':  { fr: 'Remplacer',       en: 'Replace' },
  'rest.echec':         { fr: 'La restauration n\'a pas abouti', en: 'The restore did not complete' },
  'rest.ok.toast':      { fr: 'Sauvegarde restaurée — {resume} 🤍', en: 'Backup restored — {resume} 🤍' },

  'recup.parti.titre':  { fr: 'Ce carnet n\'est plus disponible', en: 'This notebook is no longer available' },
  'recup.parti.texte':  { fr: 'Il n\'a pas été retrouvé sur cet appareil.', en: 'It was not found on this device.' },
  'recup.titre':        { fr: 'Récupérer l\'ancien carnet ?', en: 'Recover the older notebook?' },
  'recup.ok':           { fr: 'Récupérer',       en: 'Recover' },
  'recup.echec':        { fr: 'La récupération n\'a pas abouti', en: 'The recovery did not complete' },
  'recup.ok.toast':     { fr: 'Ancien carnet récupéré — {resume} 🤍', en: 'Older notebook recovered — {resume} 🤍' },
  'recup.auto.toast':   { fr: 'Ton carnet a été récupéré — {resume} 🤍', en: 'Your notebook was recovered — {resume} 🤍' },

  'demo.titre':         { fr: 'Charger les données d\'exemple ?', en: 'Load the sample data?' },
  'demo.ok':            { fr: 'Charger l\'exemple', en: 'Load the sample' },
  'clear.titre':        { fr: 'Vraiment tout effacer ?', en: 'Really erase everything?' },
  'clear.ok':           { fr: 'Tout effacer',    en: 'Erase everything' },

  'copies.titre':       { fr: 'Une copie chaque jour', en: 'A copy every day' },

  /* ─── Écran de bienvenue ─────────────────────────────── */
  'w.titre':            { fr: 'Bienvenue 🤍',    en: 'Welcome 🤍' },
  'w.texte1':           { fr: 'Ibadah est un carnet discret pour t\'aider à ne rien oublier de ton quotidien spirituel.',
                          en: 'Ibadah is a quiet notebook to help you forget nothing of your daily worship.' },
  'w.texte2':           { fr: 'Tes données restent sur ton appareil. Rien n\'est partagé, rien n\'est comparé : ton adoration ne regarde qu\'Allah.',
                          en: 'Your data stays on your device. Nothing is shared, nothing is compared: your worship concerns Allah alone.' },
  'w.commencer':        { fr: 'Commencer',       en: 'Get started' },
  'w2.titre':           { fr: 'Par quoi veux-tu commencer ?', en: 'Where would you like to start?' },
  'w2.texte':           { fr: 'Choisis ce qui te parle. Tu pourras tout modifier ensuite.',
                          en: 'Choose what speaks to you. You can change everything later.' },
  'w2.zero':            { fr: 'Partir de zéro', en: 'Start from scratch' },
  'w2.parti':           { fr: 'C\'est parti',   en: 'Let\'s go' },

  /* Les paquets d'intentions proposés au premier jour */
  'pack.coran.nom':     { fr: 'Coran quotidien', en: 'Daily Qur\'an' },
  'pack.coran.desc':    { fr: 'Une page chaque jour', en: 'One page every day' },
  'pack.coran.t1':      { fr: 'Lire une page de Coran', en: 'Read a page of Qur\'an' },

  'pack.adhkar.nom':    { fr: 'Adhkar matin et soir', en: 'Morning and evening adhkar' },
  'pack.adhkar.desc':   { fr: 'Avec 8 dhikr déjà prêts dans chacun', en: 'With 8 dhikr already prepared in each' },
  'pack.adhkar.t1':     { fr: 'Adhkar du matin', en: 'Morning adhkar' },
  'pack.adhkar.t2':     { fr: 'Adhkar du soir',  en: 'Evening adhkar' },

  'pack.sunna.nom':     { fr: 'Sunna de la semaine', en: 'Sunna of the week' },
  'pack.sunna.desc':    { fr: 'Jeûne du lundi, sourate Al-Kahf le vendredi',
                          en: 'Monday fast, Surah Al-Kahf on Friday' },
  'pack.sunna.t1':      { fr: 'Jeûner le lundi', en: 'Fast on Monday' },
  'pack.sunna.t2':      { fr: 'Lire sourate Al-Kahf', en: 'Read Surah Al-Kahf' },

  'pack.liens.nom':     { fr: 'Bienfaisance',    en: 'Kindness' },
  'pack.liens.desc':    { fr: 'Aumône et liens familiaux', en: 'Charity and family ties' },
  'pack.liens.t1':      { fr: 'Faire une aumône (sadaqa)', en: 'Give a charity (sadaqa)' },
  'pack.liens.t2':      { fr: 'Prendre des nouvelles d\'un proche', en: 'Check in on a relative' },

  'pack.savoir.nom':    { fr: 'Apprendre',       en: 'Learning' },
  'pack.savoir.desc':   { fr: 'Un hadith nouveau chaque jour', en: 'A new hadith every day' },
  'pack.savoir.t1':     { fr: 'Apprendre un nouveau hadith', en: 'Learn a new hadith' },

  /* ─── Les rappels (notifications) ────────────────────── */
  'rap.moment':         { fr: 'C\'est le moment 🤍', en: 'It is time 🤍' },
  'rap.canal.nom':      { fr: 'Rappels',         en: 'Reminders' },
  'rap.canal.desc':     { fr: 'Les rappels de tes intentions', en: 'Reminders for your intentions' },
  'rap.canalnuit.nom':  { fr: 'Rappels de la nuit', en: 'Night reminders' },
  'rap.canalnuit.desc': { fr: 'Entre 22 h et 6 h : ils s\'affichent sans bruit',
                          en: 'Between 10pm and 6am: they appear silently' },
  'rap.pause':          { fr: 'Rappels mis en pause', en: 'Reminders paused' },
  'rap.refus':          { fr: 'Sans autorisation, les rappels ne peuvent pas s\'afficher',
                          en: 'Without permission, reminders cannot appear' },
  'rap.actifs':         { fr: 'Rappels activés 🔔', en: 'Reminders on 🔔' },
  'rap.natif.on':       { fr: 'Ils sonnent même quand l\'application est fermée',
                          en: 'They ring even when the app is closed' },
  'rap.natif.off':      { fr: 'Recevoir des rappels doux aux heures que tu choisis',
                          en: 'Receive gentle reminders at the times you choose' },
  'rap.bloques.tel':    { fr: 'Les notifications sont bloquées dans les réglages du téléphone',
                          en: 'Notifications are blocked in the phone settings' },
  'rap.bloques.nav':    { fr: 'Les notifications sont bloquées dans les réglages du navigateur.',
                          en: 'Notifications are blocked in the browser settings.' },
  'rap.pasgere':        { fr: 'Ton navigateur ne gère pas les notifications.',
                          en: 'Your browser does not support notifications.' },
  'rap.web.on':         { fr: 'Actifs tant que l\'appli est ouverte ou en arrière-plan',
                          en: 'Active while the app is open or in the background' },
  'rap.reste.une':      { fr: 'Il te reste une seule chose aujourd\'hui 🤍',
                          en: 'You have one thing left today 🤍' },
  'rap.reste.n':        { fr: 'Il te reste {n} choses aujourd\'hui 🤍',
                          en: 'You have {n} things left today 🤍' },

  /* ─── Messages venant du carnet lui-même ─────────────── */
  'store.nocarnet':     { fr: 'Aucun carnet d\'une version précédente sur cet appareil.',
                          en: 'No notebook from a previous version on this device.' },
  'store.illisible':    { fr: 'Ce carnet n\'a pas pu être relu.', en: 'This notebook could not be read.' },
  'store.paslasauv':    { fr: 'Ce fichier n\'est pas une sauvegarde Ibadah.',
                          en: 'This file is not an Ibadah backup.' },
  'store.troprecente':  { fr: 'Cette sauvegarde vient d\'une version plus récente de l\'application.',
                          en: 'This backup comes from a newer version of the app.' },

  /* Les catégories de la bibliothèque (adhkar.js) */
  'cat.matin':          { fr: 'Matin',             en: 'Morning' },
  'cat.soir':           { fr: 'Soir',              en: 'Evening' },
  'cat.apres-priere':   { fr: 'Après la prière',   en: 'After prayer' },
  'cat.avant-dormir':   { fr: 'Avant de dormir',   en: 'Before sleep' },
  'cat.general':        { fr: 'À tout moment',     en: 'Any time' },

  /* ─── Textes découverts au fil du code ──────────────── */
  'biblio.voirtexte':   { fr: 'Voir le texte de {nom}', en: 'See the text of {nom}' },
  'biblio.aajouter':    { fr: '{nom} : à ajouter', en: '{nom}: to add' },
  'biblio.videcat':     { fr: 'Aucun dhikr dans cette catégorie pour le moment.',
                          en: 'No dhikr in this category for now.' },
  'dhikr.pastexte':     { fr: 'Ce dhikr n\'a pas encore de texte.', en: 'This dhikr has no text yet.' },
  'dhikr.pasrelu':      { fr: 'Texte pas encore relu par une personne de science.',
                          en: 'Text not yet reviewed by a person of knowledge.' },
  'dhikr.pasrelu.trad': { fr: 'Texte pas encore relu par une personne de science.',
                          en: 'English meaning not yet reviewed by a person of knowledge.' },

  'hadith.warn.enligne': { fr: 'Texte récupéré automatiquement en ligne : cette traduction n\'a été relue par personne. Vérifie-la auprès de quelqu\'un de confiance avant de t\'y fier.',
                           en: 'Text fetched automatically online: this translation has been reviewed by no one. Check it with someone you trust before relying on it.' },
  'hadith.warn.reserve': { fr: 'Pas de connexion : hadith affiché depuis la réserve de l\'application. Ce texte n\'a pas été relu non plus.',
                           en: 'No connection: hadith shown from the app\'s own reserve. This text has not been reviewed either.' },

  /* Le résumé d'un carnet : « 12 intentions et 47 jours d'historique » */
  'resume.intention':   { fr: '{n} intention',   en: '{n} intention' },
  'resume.intentions':  { fr: '{n} intentions',  en: '{n} intentions' },
  'resume.jour':        { fr: '{n} jour d\'historique',  en: '{n} day of history' },
  'resume.jours':       { fr: '{n} jours d\'historique', en: '{n} days of history' },
  'resume.et':          { fr: ' et ',            en: ' and ' },

  /* Le corps des questions posées avant l'irréparable */
  'sauv.ok.texte':      { fr: 'Ton carnet — {resume} — est rangé dans :\n\n{chemin}\n\nCe fichier reste sur le téléphone même si tu désinstalles Ibadah. Tu peux aussi en envoyer une copie ailleurs : sur Drive, ou dans un message à toi-même.',
                          en: 'Your notebook — {resume} — is stored in:\n\n{chemin}\n\nThis file stays on the phone even if you uninstall Ibadah. You can also send a copy elsewhere: to Drive, or in a message to yourself.' },
  'rest.remplacer.texte': { fr: 'Cette sauvegarde contient {nouveau}.\n\nElle va remplacer ce qui est sur cet appareil ({actuel}), sans possibilité de revenir en arrière.',
                            en: 'This backup contains {nouveau}.\n\nIt will replace what is on this device ({actuel}), with no way back.' },
  'recup.texte':        { fr: 'Un carnet d\'une version précédente a été retrouvé : {trouve}.\n\nLe récupérer remplacera ce qui est sur cet appareil ({actuel}).',
                          en: 'A notebook from a previous version was found: {trouve}.\n\nRecovering it will replace what is on this device ({actuel}).' },
  'demo.texte':         { fr: 'Les données d\'exemple remplacent ton carnet : {actuel} seront perdues.\n\nSi tu n\'as pas encore enregistré de sauvegarde, annule et fais-le d\'abord.',
                          en: 'The sample data replaces your notebook: {actuel} will be lost.\n\nIf you have not saved a backup yet, cancel and do that first.' },
  'clear.texte':        { fr: 'Tout effacer supprimera {actuel}, définitivement.\n\nSi tu n\'as pas encore enregistré de sauvegarde, annule et fais-le d\'abord.',
                          en: 'Erasing everything will delete {actuel}, for good.\n\nIf you have not saved a backup yet, cancel and do that first.' },
  'copies.texte':       { fr: 'Ibadah range désormais une sauvegarde par jour dans :\n\n{chemin}\n\nCes fichiers restent sur le téléphone même si tu désinstalles l\'application. Les 7 derniers jours sont gardés.',
                          en: 'Ibadah now stores one backup per day in:\n\n{chemin}\n\nThese files stay on the phone even if you uninstall the app. The last 7 days are kept.' },
  'contact.ecran':      { fr: 'Écran affiché : ', en: 'Screen shown: ' },

  /* Les intentions de l'exemple (bouton « données d'exemple ») */
  'demo.t.coran':       { fr: 'Lire une page de Coran', en: 'Read a page of Qur\'an' },
  'demo.t.matin':       { fr: 'Adhkar du matin', en: 'Morning adhkar' },
  'demo.t.soir':        { fr: 'Adhkar du soir',  en: 'Evening adhkar' },
  'demo.t.hadith':      { fr: 'Apprendre un nouveau hadith', en: 'Learn a new hadith' },
  'demo.t.sadaqa':      { fr: 'Faire une aumône (sadaqa)', en: 'Give a charity (sadaqa)' },
  'demo.t.parents':     { fr: 'Appeler mes parents', en: 'Call my parents' },
  'demo.d.protect':     { fr: 'Sourates protectrices', en: 'Protective surahs' },
  'demo.d.salat':       { fr: 'Salat sur le Prophète', en: 'Salat upon the Prophet' }
};


/* ═══════════════════════════════════════════════════════════
   LES DHIKR ET LEUR TRADUCTION

   Dans adhkar.js, chaque invocation porte son texte français
   (nom, traduction, source) et, à côté, sa version anglaise
   (nom_en, traduction_en, source_en).

   L'arabe et la phonétique, eux, ne changent jamais de langue :
   ils n'ont qu'une seule version.
   ═══════════════════════════════════════════════════════════ */

/* Rend le champ dans la bonne langue, ou le français s'il manque. */
function champDhikr(d, champ) {
  if (!d) return '';
  const code = Langue.choisie();
  if (code !== 'fr') {
    const traduit = d[champ + '_' + code];
    if (traduit) return traduit;
  }
  return d[champ] || '';
}

/* Ce dhikr est-il relu ET validé DANS LA LANGUE AFFICHÉE ?

   ⚠️ Le français a été relu le 21 août 2026. Les traductions, elles,
   ne l'ont PAS été : tant que « verifie_en » n'est pas passé à true
   par une personne de science, l'avertissement doit rester à l'écran.
   C'est le seul garde-fou, et il ne doit pas sauter en changeant
   simplement de langue. */
function dhikrRelu(d) {
  if (!d) return false;
  const code = Langue.choisie();
  if (code === 'fr') return !!d.verifie;
  return !!d.verifie && !!d['verifie_' + code];
}

/* Vrai quand c'est la TRADUCTION qui n'est pas relue (l'original, lui,
   l'est). L'avertissement affiché n'est alors pas le même : il dit que
   l'arabe est validé mais que le sens traduit ne l'est pas encore. */
function dhikrTraductionNonRelue(d) {
  return !!d && !!d.verifie && Langue.choisie() !== 'fr' && !d['verifie_' + Langue.choisie()];
}

/* Les initiales des jours, pour le graphique et la grille du mois.
   Rangées de DIMANCHE (0) à SAMEDI (6), comme les numéros que rend
   getDay(). En anglais, deux « T » et deux « S » se suivent — c'est
   normal, c'est ainsi que s'écrivent les calendriers anglais. */
TEXTES['lettre.0'] = { fr: 'D', en: 'S' };
TEXTES['lettre.1'] = { fr: 'L', en: 'M' };
TEXTES['lettre.2'] = { fr: 'M', en: 'T' };
TEXTES['lettre.3'] = { fr: 'M', en: 'W' };
TEXTES['lettre.4'] = { fr: 'J', en: 'T' };
TEXTES['lettre.5'] = { fr: 'V', en: 'F' };
TEXTES['lettre.6'] = { fr: 'S', en: 'S' };


/* ═══════════════════════════════════════════════════════════
   SINGULIER OU PLURIEL ?

   Les langues ne comptent pas pareil :
     • en français, 0 et 1 sont au SINGULIER  → « 0 jour », « 1 jour »
     • en anglais, seul 1 est au singulier    → « 0 days », « 1 day »

   Rend true quand il faut le pluriel.
   ═══════════════════════════════════════════════════════════ */
function estPluriel(n) {
  const nombre = Number(n);
  if (!isFinite(nombre)) return false;
  if (Langue.choisie() === 'fr') return Math.abs(nombre) >= 2;
  return Math.abs(nombre) !== 1;
}
