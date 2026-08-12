/* ═══════════════════════════════════════════════════════════
   Ibadah Daily Planner — le carnet de bord
   ───────────────────────────────────────────────────────────
   Ce fichier ne dessine RIEN à l'écran. Il ne s'occupe que des
   données et des dates.

   Deux idées portent tout le reste.

   1. On n'écrit jamais « faite » sur une intention. On tient un
      carnet, une page par jour, où l'on note ce qui a été accompli
      ce jour-là. Demain la page est vierge : l'intention réapparaît
      toute seule, sans rien avoir à remettre à zéro.

   2. On ne compte pas de points. On mesure la constance : sur les
      trente derniers jours, combien de fois une intention prévue
      a-t-elle été tenue ? Un acte n'a pas de prix qu'un programme
      puisse fixer ; la régularité, elle, se constate.
   ═══════════════════════════════════════════════════════════ */

const Store = (function () {

  const CLE_STOCKAGE = 'ibadah-v3';
  const CLE_V2       = 'ibadah-v2';         // version précédente, gardée en secours
  const CLE_V1       = 'ibadah-demo';       // la maquette de la première session

  const PRIERES  = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const FENETRE  = 30;                      // la régularité se mesure sur 30 jours
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

  /* ─── 2. Des identifiants qui ne se marchent pas dessus ───
     Les sous-éléments et les intentions puisent dans le même
     compteur : deux dhikr ne peuvent jamais recevoir le même
     numéro, même ajoutés dans la même milliseconde. */

  let dernierId = 0;
  function prochainId() {
    dernierId = Math.max(Date.now(), dernierId + 1);
    return dernierId;
  }

  /* ─── 3. Chargement et sauvegarde ───────────────────────── */

  function vide() {
    return {
      version:  3,
      accueilli: false,          // l'écran de bienvenue a-t-il été passé ?
      taches:   [],
      journal:  {},              // { "2026-08-11": { taches:[3], prieres:["Fajr"], sous:[7,9] } }
      reglages: { notif: false, sombre: false, silenceNuit: true }
    };
  }

  /* Remet en forme une sauvegarde : on n'a jamais la garantie que
     tous les champs sont là, surtout après une mise à jour. */
  function normaliser(brut) {
    const e = Object.assign(vide(), brut);
    e.version = 3;

    e.taches = (e.taches || []).filter(Boolean).map(t => {
      if (!Array.isArray(t.sousTaches)) t.sousTaches = [];
      t.sousTaches = t.sousTaches.filter(Boolean).map(s => ({
        id:          s.id,
        nom:         String(s.nom || ''),
        repetitions: Math.max(1, Number(s.repetitions) || 1),
        refBiblio:   s.refBiblio || null
      }));
      if (t.desactiveeLe === undefined) t.desactiveeLe = null;
      if (t.jourSemaine === undefined)  t.jourSemaine  = null;
      return t;
    });

    for (const cle in e.journal) {
      const p = e.journal[cle];
      p.taches  = Array.isArray(p.taches)  ? p.taches  : [];
      p.prieres = Array.isArray(p.prieres) ? p.prieres : [];
      p.sous    = Array.isArray(p.sous)    ? p.sous    : [];
    }

    // Le compteur d'identifiants repart après le plus grand déjà utilisé.
    e.taches.forEach(t => {
      dernierId = Math.max(dernierId, t.id || 0);
      t.sousTaches.forEach(s => { dernierId = Math.max(dernierId, s.id || 0); });
    });

    return e;
  }

  function charger() {
    try {
      const brut = localStorage.getItem(CLE_STOCKAGE);
      if (brut) {
        const e = JSON.parse(brut);
        if (e && e.version === 3) return normaliser(e);
      }
      const v2 = localStorage.getItem(CLE_V2);
      if (v2) return migrerV2(JSON.parse(v2));

      const v1 = localStorage.getItem(CLE_V1);
      if (v1) return migrerV1(JSON.parse(v1));
    } catch (e) { /* stockage indisponible ou abîmé : on repart proprement */ }
    return vide();
  }

  function sauver() {
    try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat)); } catch (e) {}
  }

  /* Reprend une sauvegarde de la version 2. On écrit sous une nouvelle
     clé : l'ancienne reste intacte sur l'appareil, au cas où. */
  function migrerV2(vieux) {
    const e = normaliser(vieux);
    // Les intentions déjà retirées n'ont pas de date de retrait. On les fait
    // sortir dès leur création, sinon la régularité inventerait des jours
    // ratés qui n'ont jamais existé.
    e.taches.forEach(t => { if (!t.active && !t.desactiveeLe) t.desactiveeLe = t.creeeLe; });
    return e;
  }

  /* Reprend une sauvegarde de la toute première maquette (version 1). */
  function migrerV1(vieux) {
    const e = vide();
    const jour = aujourdhui();

    e.accueilli = true;
    e.taches = (vieux.tasks || []).map(t => ({
      id:           t.id,
      nom:          t.name,
      frequence:    t.freq || 'daily',
      heure:        t.time || '',
      jourSemaine:  null,
      creeeLe:      jour,
      active:       true,
      desactiveeLe: null,
      sousTaches:   []
    }));

    const faites  = (vieux.tasks || []).filter(t => t.done).map(t => t.id);
    const prieres = PRIERES.filter(p => vieux.prayers && vieux.prayers[p]);
    if (faites.length || prieres.length) {
      e.journal[jour] = { taches: faites, prieres, sous: [] };
    }

    if (vieux.settings) {
      e.reglages.notif       = !!vieux.settings.notif;
      e.reglages.sombre      = !!vieux.settings.dark;
      e.reglages.silenceNuit = vieux.settings.quiet !== false;
    }
    return normaliser(e);
  }

  let etat = charger();

  /* ─── 4. La page du carnet ──────────────────────────────── */

  const PAGE_VIDE = { taches: [], prieres: [], sous: [] };

  function page(cle, creer) {
    let p = etat.journal[cle];
    if (!p && creer) { p = etat.journal[cle] = { taches: [], prieres: [], sous: [] }; }
    return p || PAGE_VIDE;
  }

  // On ne garde pas de page vide dans le carnet : sinon la série de jours
  // compterait des journées où rien n'a été accompli. Attention : une page
  // qui ne contient que des sous-éléments (3 dhikr sur 8) est bien une
  // journée où il s'est passé quelque chose — on la garde.
  function nettoyer(cle) {
    const p = etat.journal[cle];
    if (p && !p.taches.length && !p.prieres.length && !p.sous.length) {
      delete etat.journal[cle];
    }
  }

  /* ─── 5. Quelles intentions sont au programme ce jour-là ? ─

     « pourHistorique » change une seule chose : une intention retirée
     de la liste reste comptée pour les jours d'avant son retrait.
     Sans ça, retirer une intention réécrirait le passé. */

  function estAuProgramme(t, cle, pourHistorique) {
    if (cle < t.creeeLe) return false;                  // pas avant sa création

    if (!t.active) {
      if (!pourHistorique) return false;
      if (!t.desactiveeLe || cle >= t.desactiveeLe) return false;
    }

    switch (t.frequence) {
      case 'daily':
        return true;

      case 'weekly': {
        // Jour choisi par l'utilisateur, sinon le jour où l'intention a été créée
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

  // Ce qui était prévu ce jour-là, retraits compris : sert aux statistiques.
  function tachesPrevues(cle) {
    return etat.taches.filter(t => estAuProgramme(t, cle, true));
  }

  /* ─── 6. Cocher / décocher ──────────────────────────────── */

  function estFaite(t, cle) {
    return page(cle).taches.includes(t.id);
  }

  function basculerTache(t, cle) {
    // Une intention qui contient des sous-éléments ne se coche pas
    // directement : on coche ou décoche tout ce qu'elle contient.
    if (sousTachesDe(t).length) return toutBasculer(t, cle);

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

  /* ─── 7. Les sous-éléments (les dhikr d'une intention) ────

     Rien n'est stocké comme « le parent est fait ». Dès qu'un
     sous-élément bouge, on recalcule : si tous sont cochés, l'id du
     parent entre dans le carnet ; sinon il en sort. Le parent se coche
     donc tout seul, et il ne peut jamais mentir. */

  function sousTachesDe(t) {
    return (t && t.sousTaches) || [];
  }

  function sousFaite(idSous, cle) {
    return page(cle).sous.includes(idSous);
  }

  function avancement(t, cle) {
    const liste = sousTachesDe(t);
    return {
      faits: liste.filter(s => sousFaite(s.id, cle)).length,
      total: liste.length
    };
  }

  function recalculerParent(t, cle) {
    const liste = sousTachesDe(t);
    if (!liste.length) return;
    const p = etat.journal[cle];
    if (!p) return;                                     // rien de fait ce jour-là

    const complet = liste.every(s => p.sous.includes(s.id));
    const i = p.taches.indexOf(t.id);
    if (complet  && i === -1) p.taches.push(t.id);
    if (!complet && i !== -1) p.taches.splice(i, 1);
  }

  function basculerSous(t, idSous, cle) {
    const p = page(cle, true);
    const i = p.sous.indexOf(idSous);
    if (i === -1) p.sous.push(idSous); else p.sous.splice(i, 1);
    recalculerParent(t, cle);
    nettoyer(cle);
    sauver();
    return i === -1;
  }

  function toutBasculer(t, cle) {
    const liste = sousTachesDe(t);
    const p = page(cle, true);
    const complet = liste.every(s => p.sous.includes(s.id));

    if (complet) {
      p.sous = p.sous.filter(id => !liste.some(s => s.id === id));
    } else {
      liste.forEach(s => { if (!p.sous.includes(s.id)) p.sous.push(s.id); });
    }
    recalculerParent(t, cle);
    nettoyer(cle);
    sauver();
    return !complet;                                    // true = vient d'être tout cochée
  }

  function ajouterSousTache(idParent, { nom, repetitions, refBiblio }) {
    const t = tache(idParent);
    if (!t) return null;

    const s = {
      id:          prochainId(),
      nom:         String(nom).trim(),
      repetitions: Math.max(1, Number(repetitions) || 1),
      refBiblio:   refBiblio || null
    };
    t.sousTaches.push(s);
    // L'intention était peut-être terminée : elle ne l'est plus.
    recalculerParent(t, aujourdhui());
    nettoyer(aujourdhui());
    sauver();
    return s;
  }

  function retirerSousTache(idParent, idSous) {
    const t = tache(idParent);
    if (!t) return;
    t.sousTaches = t.sousTaches.filter(s => s.id !== idSous);

    // On efface aussi sa trace du jour, sinon un dhikr retiré continuerait
    // de peser dans l'avancement.
    const cle = aujourdhui();
    const p = etat.journal[cle];
    if (p) {
      const i = p.sous.indexOf(idSous);
      if (i !== -1) p.sous.splice(i, 1);
    }
    recalculerParent(t, cle);
    nettoyer(cle);
    sauver();
  }

  /* Remplace d'un coup la liste des dhikr d'une intention.
     C'est ce qu'utilise l'écran bibliothèque : ce qui est décoché
     disparaît, ce qui est coché arrive, le reste ne bouge pas. */
  function remplacerSousTaches(idParent, voulus) {
    const t = tache(idParent);
    if (!t) return;

    const avant  = t.sousTaches.map(s => s.id);
    const gardes = new Set(voulus.filter(v => v.id).map(v => Number(v.id)));

    t.sousTaches = t.sousTaches.filter(s => gardes.has(s.id));

    voulus.filter(v => !v.id).forEach(v => {
      t.sousTaches.push({
        id:          prochainId(),
        nom:         String(v.nom).trim(),
        repetitions: Math.max(1, Number(v.repetitions) || 1),
        refBiblio:   v.refBiblio || null
      });
    });

    // Un dhikr retiré ne doit plus peser dans le carnet du jour.
    const cle = aujourdhui();
    const p = etat.journal[cle];
    if (p) {
      const partis = avant.filter(id => !gardes.has(id));
      if (partis.length) p.sous = p.sous.filter(id => partis.indexOf(id) === -1);
    }
    recalculerParent(t, cle);
    nettoyer(cle);
    sauver();
  }

  /* ─── 8. Constance et régularité ────────────────────────── */

  // Une journée où il s'est passé quelque chose, même un seul dhikr.
  function activiteDuJour(cle) {
    const p = page(cle);
    return p.taches.length + p.prieres.length + p.sous.length;
  }

  function actesDuJour(cle) {
    const p = page(cle);
    return p.taches.length + p.prieres.length;
  }

  // Le premier jour connu : on ne remonte pas plus loin, sinon on
  // compterait comme « ratés » des jours d'avant l'installation.
  function premierJour() {
    let min = aujourdhui();
    for (const c in etat.journal) if (c < min) min = c;
    etat.taches.forEach(t => { if (t.creeeLe && t.creeeLe < min) min = t.creeeLe; });
    return min;
  }

  // Part de la journée accomplie, en pour cent.
  function partDuJour(cle) {
    const prevues = tachesPrevues(cle);
    const total   = prevues.length + PRIERES.length;
    if (!total) return 0;
    const p = page(cle);
    const faits = prevues.filter(t => p.taches.includes(t.id)).length + p.prieres.length;
    return Math.round(faits / total * 100);
  }

  /* Série : nombre de jours consécutifs avec au moins un acte.
     Une journée à peine commencée ne casse pas la série : si rien
     n'est encore coché aujourd'hui, on part d'hier. */
  function serie() {
    let cle = aujourdhui();
    if (!activiteDuJour(cle)) cle = cleDecalee(cle, -1);

    let n = 0;
    while (activiteDuJour(cle) > 0) { n++; cle = cleDecalee(cle, -1); }
    return n;
  }

  function meilleureSerie() {
    const jours = Object.keys(etat.journal)
      .filter(c => activiteDuJour(c) > 0)
      .sort();

    let meilleure = 0, courante = 0, precedent = null;
    jours.forEach(c => {
      courante = (precedent && cleDecalee(precedent, 1) === c) ? courante + 1 : 1;
      if (courante > meilleure) meilleure = courante;
      precedent = c;
    });
    return meilleure;
  }

  /* Régularité d'une intention : sur les N derniers jours où elle était
     prévue, combien de fois a-t-elle été tenue ?

     La journée en cours ne compte que si elle est déjà faite. Sinon on
     reprocherait à quelqu'un, dès le réveil, de ne pas avoir encore lu
     sa page de Coran. */
  function regularite(t, n) {
    n = n || FENETRE;
    const fin = aujourdhui(), debut = premierJour();
    let prevus = 0, faits = 0;

    for (let i = 0; i < n; i++) {
      const cle = cleDecalee(fin, -i);
      if (cle < debut) break;
      if (!estAuProgramme(t, cle, true)) continue;

      const fait = page(cle).taches.includes(t.id);
      if (i === 0 && !fait) continue;
      prevus++;
      if (fait) faits++;
    }
    return { prevus, faits, pourcent: prevus ? Math.round(faits / prevus * 100) : 0 };
  }

  function regulariteGlobale(n) {
    n = n || FENETRE;
    const fin = aujourdhui(), debut = premierJour();
    let prevus = 0, faits = 0;

    for (let i = 0; i < n; i++) {
      const cle = cleDecalee(fin, -i);
      if (cle < debut) break;
      const p = page(cle);

      tachesPrevues(cle).forEach(t => {
        const fait = p.taches.includes(t.id);
        if (i === 0 && !fait) return;
        prevus++;
        if (fait) faits++;
      });

      prevus += (i === 0) ? p.prieres.length : PRIERES.length;
      faits  += p.prieres.length;
    }
    return { prevus, faits, pourcent: prevus ? Math.round(faits / prevus * 100) : 0 };
  }

  function regularitePriere(nom, n) {
    n = n || FENETRE;
    const fin = aujourdhui(), debut = premierJour();
    let prevus = 0, faits = 0;

    for (let i = 0; i < n; i++) {
      const cle = cleDecalee(fin, -i);
      if (cle < debut) break;
      const fait = page(cle).prieres.includes(nom);
      if (i === 0 && !fait) continue;
      prevus++;
      if (fait) faits++;
    }
    return { prevus, faits, pourcent: prevus ? Math.round(faits / prevus * 100) : 0 };
  }

  function regularitePrieres(n) {
    n = n || FENETRE;
    const fin = aujourdhui(), debut = premierJour();
    let prevus = 0, faits = 0;

    for (let i = 0; i < n; i++) {
      const cle = cleDecalee(fin, -i);
      if (cle < debut) break;
      const f = page(cle).prieres.length;
      faits  += f;
      prevus += (i === 0) ? f : PRIERES.length;
    }
    return { prevus, faits, pourcent: prevus ? Math.round(faits / prevus * 100) : 0 };
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
        part:      partDuJour(cle),
        estCeJour: i === 0
      });
    }
    return out;
  }

  /* La grille du mois : une case par jour, avec des cases vides au début
     pour que le 1er tombe sous le bon jour de la semaine (lundi en tête). */
  function grilleDuMois(cleMois) {
    const d    = dateDepuisCle(cleMois || aujourdhui());
    const an   = d.getFullYear(), mois = d.getMonth();
    const nb   = new Date(an, mois + 1, 0).getDate();
    const jour = aujourdhui();
    const out  = [];

    let decalage = new Date(an, mois, 1).getDay();      // 0 = dimanche
    decalage = (decalage + 6) % 7;                       // 0 = lundi
    for (let i = 0; i < decalage; i++) out.push(null);

    for (let j = 1; j <= nb; j++) {
      const cle = cleDuJour(new Date(an, mois, j));
      out.push({
        cle,
        jour:      j,
        part:      cle > jour ? -1 : partDuJour(cle),    // -1 = jour à venir
        estCeJour: cle === jour
      });
    }
    return out;
  }

  function journeesCompletes() {
    let n = 0;
    for (const cle in etat.journal) if (partDuJour(cle) === 100) n++;
    return n;
  }

  // Combien de fois une intention a-t-elle été tenue depuis le début ?
  function foisTenue(t) {
    let n = 0;
    for (const cle in etat.journal) if (etat.journal[cle].taches.includes(t.id)) n++;
    return n;
  }

  function meilleureFidelite() {
    return etat.taches.reduce((m, t) => Math.max(m, foisTenue(t)), 0);
  }

  function totaux() {
    let taches = 0, prieres = 0;
    for (const cle in etat.journal) {
      taches  += etat.journal[cle].taches.length;
      prieres += etat.journal[cle].prieres.length;
    }
    return { taches, prieres, actes: taches + prieres };
  }

  /* Progression du jour : intentions au programme + les 5 prières. */
  function progression(cle) {
    const taches = tachesDuJour(cle);
    const total  = taches.length + PRIERES.length;
    const faits  = taches.filter(t => estFaite(t, cle)).length + page(cle).prieres.length;
    return { faits, total, pourcent: total ? Math.round(faits / total * 100) : 0 };
  }

  /* ─── 9. Gérer les intentions ───────────────────────────── */

  function ajouterTache({ nom, frequence, heure, jourSemaine, sousTaches }) {
    const t = {
      id:           prochainId(),
      nom:          String(nom).trim(),
      frequence:    frequence || 'daily',
      heure:        heure || '',
      jourSemaine:  (jourSemaine === undefined || jourSemaine === null) ? null : Number(jourSemaine),
      creeeLe:      aujourdhui(),
      active:       true,
      desactiveeLe: null,
      sousTaches:   []
    };

    (sousTaches || []).forEach(s => t.sousTaches.push({
      id:          prochainId(),
      nom:         String(s.nom).trim(),
      repetitions: Math.max(1, Number(s.repetitions) || 1),
      refBiblio:   s.refBiblio || null
    }));

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

  /* Suppression douce : l'intention disparaît des jours à venir, mais
     l'historique déjà accompli reste intact. La date du retrait sert à
     ne plus la compter comme « prévue » à partir d'aujourd'hui. */
  function supprimerTache(id) {
    const t = etat.taches.find(x => x.id === id);
    if (t) { t.active = false; t.desactiveeLe = aujourdhui(); sauver(); }
  }

  function tache(id) { return etat.taches.find(x => x.id === id) || null; }

  /* ─── 10. Réglages et remises à zéro ────────────────────── */

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

  /* Jeu de démonstration : douze jours d'historique pour que la
     régularité et les badges aient quelque chose à montrer. */
  function chargerDemo() {
    const sombre = etat.reglages.sombre;
    etat = vide();
    etat.reglages.sombre = sombre;
    etat.accueilli = true;

    const modeles = [
      { nom: 'Lire une page de Coran',      frequence: 'daily',  heure: '07:30' },
      { nom: 'Adhkar du matin',             frequence: 'daily',  heure: '08:00',
        sous: ['Ayat al-Kursi', 'Sourates protectrices', 'Sayyid al-istighfar',
               'Subhan Allah wa bi hamdih', 'Salat sur le Prophète'] },
      { nom: 'Adhkar du soir',              frequence: 'daily',  heure: '18:30' },
      { nom: 'Apprendre un nouveau hadith', frequence: 'daily',  heure: '21:00' },
      { nom: 'Faire une aumône (sadaqa)',   frequence: 'weekly', heure: '' },
      { nom: 'Appeler mes parents',         frequence: 'weekly', heure: '19:00' }
    ];

    const depart = cleDecalee(aujourdhui(), -11);
    etat.taches = modeles.map((m, i) => ({
      id:           1000 + i,
      nom:          m.nom,
      frequence:    m.frequence,
      heure:        m.heure,
      jourSemaine:  null,
      creeeLe:      depart,
      active:       true,
      desactiveeLe: null,
      sousTaches:   (m.sous || []).map((nom, k) => ({
        id: 5000 + i * 20 + k, nom, repetitions: k === 3 ? 100 : 1, refBiblio: null
      }))
    }));

    // Un carnet irrégulier, pour que la courbe ressemble à une vraie vie.
    const rythme = [4, 5, 3, 6, 5, 2, 4, 6, 5, 3, 5];
    rythme.forEach((n, i) => {
      const cle   = cleDecalee(depart, i);
      const dispo = tachesDuJour(cle).slice(0, n);
      etat.journal[cle] = {
        taches:  dispo.map(t => t.id),
        prieres: PRIERES.slice(0, Math.max(2, 5 - (i % 3))),
        // Une intention comptée comme faite doit avoir tous ses dhikr cochés,
        // sinon le carnet se contredirait lui-même.
        sous:    dispo.flatMap(t => sousTachesDe(t).map(s => s.id))
      };
    });

    // Aujourd'hui : à peine commencé, pour que l'écran soit vivant.
    etat.journal[aujourdhui()] = { taches: [1000], prieres: ['Fajr', 'Dhuhr'], sous: [] };
    sauver();
  }

  /* ─── Ce que le reste de l'application peut utiliser ────── */
  return {
    PRIERES, FREQUENCE, JOURS_LONGS, FENETRE,
    aujourdhui, cleDuJour, cleDecalee, dateDepuisCle, jourSimule: () => JOUR_SIMULE,
    libelleFrequence, jourSemaineDe,

    tachesDuJour, tachesPrevues, estAuProgramme, estFaite, basculerTache,
    priereFaite, basculerPriere,

    sousTachesDe, sousFaite, basculerSous, toutBasculer, avancement,
    ajouterSousTache, retirerSousTache, remplacerSousTaches,

    serie, meilleureSerie, partDuJour, septDerniersJours, grilleDuMois,
    regularite, regulariteGlobale, regularitePriere, regularitePrieres,
    journeesCompletes, foisTenue, meilleureFidelite,
    totaux, progression, actesDuJour, activiteDuJour,

    ajouterTache, modifierTache, supprimerTache, tache,
    toutesLesTaches: () => etat.taches.filter(t => t.active),
    reglages, reglerOption,
    estAccueilli, marquerAccueilli,
    repartirDeZero, chargerDemo,
    _etat: () => etat                                   // pour les tests
  };
})();
