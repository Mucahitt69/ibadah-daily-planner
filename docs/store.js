/* ═══════════════════════════════════════════════════════════
   Ibadah Daily Planner — le carnet de bord
   ───────────────────────────────────────────────────────────
   Ce fichier ne dessine RIEN à l'écran. Il ne s'occupe que des
   données et des dates.

   L'idée principale : on n'écrit jamais « faite » sur une tâche.
   On tient un carnet, une page par jour, où l'on note ce qui a
   été accompli ce jour-là. Demain, la page est vierge : la tâche
   réapparaît toute seule, sans rien avoir à remettre à zéro.
   ═══════════════════════════════════════════════════════════ */

const Store = (function () {

  const CLE_STOCKAGE = 'ibadah-v2';
  const ANCIENNE_CLE = 'ibadah-demo';       // la maquette de la première session

  const PTS      = { tache: 10, priere: 20 };
  const PRIERES  = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const FREQUENCE = {
    daily:   'Chaque jour',
    weekly:  'Chaque semaine',
    monthly: 'Chaque mois',
    once:    'Une fois'
  };

  /* ─── 1. Les dates ──────────────────────────────────────
     Une « clé de jour » est un texte comme "2026-08-11".
     On la fabrique à la main : toISOString() donnerait la date
     de Londres, ce qui ferait changer de jour trop tôt ou trop tard. */

  // Permet de simuler un autre jour avec ?jour=2026-08-12 dans l'adresse.
  // Sert uniquement aux tests : sans ce paramètre, c'est la vraie date.
  const JOUR_SIMULE = (function () {
    try {
      const p = new URLSearchParams(location.search).get('jour');
      return /^\d{4}-\d{2}-\d{2}$/.test(p || '') ? p : null;
    } catch (e) { return null; }
  })();

  function aujourdhui() {
    return JOUR_SIMULE || cleDuJour(new Date());
  }

  function cleDuJour(d) {
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function dateDepuisCle(cle) {
    const [a, m, j] = cle.split('-').map(Number);
    return new Date(a, m - 1, j);
  }

  // "2026-08-11" décalé de -1 → "2026-08-10"
  function cleDecalee(cle, nbJours) {
    const d = dateDepuisCle(cle);
    d.setDate(d.getDate() + nbJours);
    return cleDuJour(d);
  }

  function dernierJourDuMois(cle) {
    const d = dateDepuisCle(cle);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }

  /* ─── 2. Chargement et sauvegarde ───────────────────────── */

  function vide() {
    return {
      version:  2,
      accueilli: false,          // l'écran de bienvenue a-t-il été passé ?
      taches:   [],
      journal:  {},              // { "2026-08-11": { taches:[3,7], prieres:["Fajr"] } }
      reglages: { notif: false, sombre: false, silenceNuit: true }
    };
  }

  function charger() {
    try {
      const brut = localStorage.getItem(CLE_STOCKAGE);
      if (brut) {
        const e = JSON.parse(brut);
        if (e && e.version === 2) return Object.assign(vide(), e);
      }
      const ancien = localStorage.getItem(ANCIENNE_CLE);
      if (ancien) return migrer(JSON.parse(ancien));
    } catch (e) { /* stockage indisponible ou abîmé : on repart proprement */ }
    return vide();
  }

  function sauver() {
    try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat)); } catch (e) {}
  }

  /* Reprend une sauvegarde de la maquette (version 1) sans rien perdre. */
  function migrer(vieux) {
    const e = vide();
    const jour = aujourdhui();

    e.accueilli = true;
    e.taches = (vieux.tasks || []).map(t => ({
      id:        t.id,
      nom:       t.name,
      frequence: t.freq || 'daily',
      heure:     t.time || '',
      creeeLe:   jour,
      active:    true
    }));

    const faites  = (vieux.tasks || []).filter(t => t.done).map(t => t.id);
    const prieres = PRIERES.filter(p => vieux.prayers && vieux.prayers[p]);
    if (faites.length || prieres.length) e.journal[jour] = { taches: faites, prieres };

    if (vieux.settings) {
      e.reglages.notif       = !!vieux.settings.notif;
      e.reglages.sombre      = !!vieux.settings.dark;
      e.reglages.silenceNuit = vieux.settings.quiet !== false;
    }
    return e;
  }

  let etat = charger();

  /* ─── 3. La page du carnet ──────────────────────────────── */

  function page(cle, creer) {
    let p = etat.journal[cle];
    if (!p && creer) { p = etat.journal[cle] = { taches: [], prieres: [] }; }
    return p || { taches: [], prieres: [] };
  }

  /* ─── 4. Quelles tâches sont au programme ce jour-là ? ──── */

  function estAuProgramme(t, cle) {
    if (!t.active) return false;
    if (cle < t.creeeLe) return false;                  // pas avant sa création

    switch (t.frequence) {
      case 'daily':
        return true;

      case 'weekly': {
        // Jour choisi par l'utilisateur, sinon le jour où la tâche a été créée
        const voulu = (t.jourSemaine === undefined || t.jourSemaine === null)
          ? dateDepuisCle(t.creeeLe).getDay()
          : t.jourSemaine;
        return dateDepuisCle(cle).getDay() === voulu;
      }

      case 'monthly': {
        const voulu = dateDepuisCle(t.creeeLe).getDate();
        const jour  = dateDepuisCle(cle).getDate();
        const fin   = dernierJourDuMois(cle);
        // Le 31 dans un mois de 30 jours retombe sur le dernier jour du mois.
        return jour === Math.min(voulu, fin);
      }

      case 'once':
        // Visible tant qu'elle n'a jamais été faite ; le jour où on la coche,
        // elle reste affichée dans « Terminées » de ce jour-là.
        return estFaite(t, cle) || jamaisFaite(t);

      default:
        return true;
    }
  }

  function jamaisFaite(t) {
    return !Object.keys(etat.journal).some(c => etat.journal[c].taches.includes(t.id));
  }

  function tachesDuJour(cle) {
    return etat.taches.filter(t => estAuProgramme(t, cle));
  }

  /* ─── 5. Cocher / décocher ──────────────────────────────── */

  function estFaite(t, cle) {
    return page(cle).taches.includes(t.id);
  }

  function basculerTache(t, cle) {
    const p = page(cle, true);
    const i = p.taches.indexOf(t.id);
    if (i === -1) p.taches.push(t.id); else p.taches.splice(i, 1);
    nettoyer(cle);
    sauver();
    return i === -1;                                    // true = vient d'être cochée
  }

  function priereFaite(nom, cle) {
    return page(cle).prieres.includes(nom);
  }

  function basculerPriere(nom, cle) {
    const p = page(cle, true);
    const i = p.prieres.indexOf(nom);
    if (i === -1) p.prieres.push(nom); else p.prieres.splice(i, 1);
    nettoyer(cle);
    sauver();
    return i === -1;
  }

  // On ne garde pas de page vide dans le carnet : sinon la série de jours
  // compterait des journées où rien n'a été accompli.
  function nettoyer(cle) {
    const p = etat.journal[cle];
    if (p && !p.taches.length && !p.prieres.length) delete etat.journal[cle];
  }

  /* ─── 6. Les chiffres, tous recalculés depuis le carnet ─── */

  function totaux() {
    let taches = 0, prieres = 0;
    for (const cle in etat.journal) {
      taches  += etat.journal[cle].taches.length;
      prieres += etat.journal[cle].prieres.length;
    }
    return {
      taches,
      prieres,
      actes:  taches + prieres,
      points: taches * PTS.tache + prieres * PTS.priere
    };
  }

  function actesDuJour(cle) {
    const p = page(cle);
    return p.taches.length + p.prieres.length;
  }

  /* Série : nombre de jours consécutifs avec au moins un acte.
     Une journée à peine commencée ne casse pas la série : si rien
     n'est encore coché aujourd'hui, on part d'hier. */
  function serie() {
    let cle = aujourdhui();
    if (!actesDuJour(cle)) cle = cleDecalee(cle, -1);

    let n = 0;
    while (actesDuJour(cle) > 0) { n++; cle = cleDecalee(cle, -1); }
    return n;
  }

  const LETTRES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  function septDerniersJours() {
    const fin = aujourdhui();
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const cle = cleDecalee(fin, -i);
      out.push({
        cle,
        lettre:    LETTRES[dateDepuisCle(cle).getDay()],
        valeur:    actesDuJour(cle),
        estCeJour: i === 0
      });
    }
    return out;
  }

  /* Progression du jour : tâches au programme + les 5 prières. */
  function progression(cle) {
    const taches = tachesDuJour(cle);
    const total  = taches.length + PRIERES.length;
    const faits  = taches.filter(t => estFaite(t, cle)).length + page(cle).prieres.length;
    return { faits, total, pourcent: total ? Math.round(faits / total * 100) : 0 };
  }

  /* ─── 7. Gérer les tâches ───────────────────────────────── */

  function ajouterTache({ nom, frequence, heure, jourSemaine }) {
    const t = {
      id:          Date.now() + Math.floor(Math.random() * 1000),
      nom:         String(nom).trim(),
      frequence:   frequence || 'daily',
      heure:       heure || '',
      jourSemaine: (jourSemaine === undefined || jourSemaine === null) ? null : Number(jourSemaine),
      creeeLe:     aujourdhui(),
      active:      true
    };
    etat.taches.unshift(t);
    sauver();
    return t;
  }

  function modifierTache(id, champs) {
    const t = etat.taches.find(x => x.id === id);
    if (!t) return null;
    if (champs.nom !== undefined)       t.nom = String(champs.nom).trim();
    if (champs.heure !== undefined)     t.heure = champs.heure;
    if (champs.frequence !== undefined) t.frequence = champs.frequence;
    if (champs.jourSemaine !== undefined) {
      t.jourSemaine = champs.jourSemaine === null ? null : Number(champs.jourSemaine);
    }
    sauver();
    return t;
  }

  /* Libellé lisible : « Chaque semaine » seul ne dit pas quel jour. */
  const JOURS_LONGS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  function libelleFrequence(t) {
    switch (t.frequence) {
      case 'weekly': {
        const j = (t.jourSemaine === undefined || t.jourSemaine === null)
          ? dateDepuisCle(t.creeeLe).getDay()
          : t.jourSemaine;
        return 'Chaque ' + JOURS_LONGS[j];
      }
      case 'monthly':
        return 'Chaque mois le ' + dateDepuisCle(t.creeeLe).getDate();
      default:
        return FREQUENCE[t.frequence] || FREQUENCE.daily;
    }
  }

  function jourSemaineDe(t) {
    return (t.jourSemaine === undefined || t.jourSemaine === null)
      ? dateDepuisCle(t.creeeLe).getDay()
      : t.jourSemaine;
  }

  /* Suppression douce : la tâche disparaît des jours à venir,
     mais l'historique déjà accompli reste intact. */
  function supprimerTache(id) {
    const t = etat.taches.find(x => x.id === id);
    if (t) { t.active = false; sauver(); }
  }

  function tache(id) { return etat.taches.find(x => x.id === id) || null; }

  /* ─── 8. Réglages et remises à zéro ─────────────────────── */

  function reglages() { return etat.reglages; }

  function reglerOption(nom, valeur) {
    etat.reglages[nom] = valeur;
    sauver();
  }

  function estAccueilli() { return etat.accueilli; }
  function marquerAccueilli() { etat.accueilli = true; sauver(); }

  function repartirDeZero() {
    const sombre = etat.reglages.sombre;
    etat = vide();
    etat.reglages.sombre = sombre;
    sauver();
  }

  /* Jeu de démonstration : 12 jours d'historique pour que les
     statistiques et les badges aient quelque chose à montrer. */
  function chargerDemo() {
    const sombre = etat.reglages.sombre;
    etat = vide();
    etat.reglages.sombre = sombre;
    etat.accueilli = true;

    const modeles = [
      { nom: 'Lire une page de Coran',      frequence: 'daily',  heure: '07:30' },
      { nom: 'Adhkar du matin',             frequence: 'daily',  heure: '08:00' },
      { nom: 'Adhkar du soir',              frequence: 'daily',  heure: '18:30' },
      { nom: 'Apprendre un nouveau hadith', frequence: 'daily',  heure: '21:00' },
      { nom: 'Faire une aumône (sadaqa)',   frequence: 'weekly', heure: '' },
      { nom: 'Appeler mes parents',         frequence: 'weekly', heure: '19:00' }
    ];

    const depart = cleDecalee(aujourdhui(), -11);
    etat.taches = modeles.map((m, i) => Object.assign({
      id: 1000 + i, creeeLe: depart, active: true
    }, m));

    // On remplit le carnet des 11 jours passés de façon irrégulière,
    // pour que le graphique ressemble à une vraie vie.
    const rythme = [4, 5, 3, 6, 5, 2, 4, 6, 5, 3, 5];
    rythme.forEach((n, i) => {
      const cle = cleDecalee(depart, i);
      const dispo = tachesDuJour(cle).map(t => t.id);
      etat.journal[cle] = {
        taches:  dispo.slice(0, Math.min(n, dispo.length)),
        prieres: PRIERES.slice(0, Math.max(2, 5 - (i % 3)))
      };
    });

    // Aujourd'hui : à peine commencé, pour que l'écran soit vivant.
    etat.journal[aujourdhui()] = { taches: [1001], prieres: ['Fajr', 'Dhuhr'] };
    sauver();
  }

  /* ─── Ce que le reste de l'application peut utiliser ────── */
  return {
    PTS, PRIERES, FREQUENCE, JOURS_LONGS,
    aujourdhui, cleDuJour, cleDecalee, dateDepuisCle, jourSimule: () => JOUR_SIMULE,
    libelleFrequence, jourSemaineDe,
    tachesDuJour, estAuProgramme, estFaite, basculerTache,
    priereFaite, basculerPriere,
    totaux, serie, septDerniersJours, progression, actesDuJour,
    ajouterTache, modifierTache, supprimerTache, tache,
    toutesLesTaches: () => etat.taches.filter(t => t.active),
    reglages, reglerOption,
    estAccueilli, marquerAccueilli,
    repartirDeZero, chargerDemo,
    _etat: () => etat                                   // pour les tests
  };
})();
