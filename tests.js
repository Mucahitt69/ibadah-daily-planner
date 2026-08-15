/* ═══════════════════════════════════════════════════════════
   Ibadah Daily Planner — les vérifications automatiques
   ───────────────────────────────────────────────────────────
   Pour les lancer :   node tests.js

   Ce fichier ne touche à rien. Il pose des questions au cerveau
   de l'application (store.js) dont il connaît déjà les réponses,
   et il prévient dès qu'une réponse change.

   À quoi ça sert, concrètement :
     • on ne peut plus casser sans le savoir ce qui marchait avant ;
     • chaque bug trouvé devient une question posée pour toujours ;
     • si tu corriges adhkar.js à la main et qu'une virgule saute,
       tu le sais tout de suite au lieu de le découvrir en ligne.

   Quand un test échoue, il dit ce qu'il attendait et ce qu'il a
   obtenu. Ce n'est pas forcément le test qui a raison : si tu as
   changé une règle exprès, c'est le test qu'il faut mettre à jour.
   ═══════════════════════════════════════════════════════════ */

const fs   = require('fs');
const path = require('path');

const RACINE = __dirname;
const lire = nom => fs.readFileSync(path.join(RACINE, nom), 'utf8');

/* ─── Un faux navigateur, juste ce dont store.js a besoin ───
   store.js est fait pour tourner dans un navigateur : il lit
   localStorage et l'adresse de la page. Ici on lui en fabrique
   des imitations, ce qui permet de le tester sans rien ouvrir. */

function fauxNavigateur(sauvegarde, jourSimule) {
  const memoire = new Map();
  for (const [cle, valeur] of Object.entries(sauvegarde || {})) {
    memoire.set(cle, typeof valeur === 'string' ? valeur : JSON.stringify(valeur));
  }
  return {
    memoire,
    localStorage: {
      getItem:    c => (memoire.has(c) ? memoire.get(c) : null),
      setItem:    (c, v) => memoire.set(c, String(v)),
      removeItem: c => memoire.delete(c),
      clear:      () => memoire.clear()
    },
    location: { search: jourSimule ? '?jour=' + jourSimule : '' }
  };
}

/* Chaque test repart d'un store neuf : aucun ne peut polluer le suivant. */
function chargerStore(options) {
  const o = options || {};
  const nav = fauxNavigateur(o.sauvegarde, o.jour);
  const fabriquer = new Function(
    'localStorage', 'location', lire('store.js') + '\n;return Store;');
  return { Store: fabriquer(nav.localStorage, nav.location), nav };
}

function chargerAdhkar() {
  return new Function(lire('adhkar.js') +
    '\n;return { ADHKAR, ADHKAR_CATEGORIES };')();
}

/* ─── Charger les rappels sans écran ────────────────────────
   Pendant longtemps, ce fichier n'a pas lu une seule ligne de
   rappels.js : les vérifications ne pouvaient RIEN dire des rappels,
   et deux essais du matin ont échoué sans que rien ne passe au rouge.

   On lui fabrique donc ici un monde vide : pas de page, pas de
   Capacitor, pas de navigateur. Tout ce qui touche à l'écran se
   débranche tout seul, et il reste les calculs — qui, eux, décident
   de ce qui sonnera.

   ⚠️ Cela ne prouve toujours pas qu'un téléphone sonne. Seule une
   vraie alarme sur un vrai téléphone le prouve. */
function chargerRappels(Store) {
  const fabriquer = new Function(
    'Store', 'toast', 'estNatif', 'Capacitor', 'document', 'window', 'navigator',
    lire('rappels.js') + '\n;return Rappels;');
  return fabriquer(Store, function () {}, function () { return false; });
}

/* Un rappel attendu mais absent doit faire passer la vérification au ROUGE,
   pas faire exploser le fichier : une explosion emporterait avec elle toutes
   les vérifications suivantes, et on ne verrait plus rien. */
function rappel(liste, i) {
  return liste[i] || { id: null, corps: '(aucun rappel)', nuit: null, quand: new Date(0) };
}

/* ─── Le carnet de notes des tests ──────────────────────── */

let reussis = 0;
const echecs = [];
let groupeCourant = '—';

function groupe(nom) { groupeCourant = nom; }

function verifier(nom, obtenu, attendu) {
  const a = JSON.stringify(attendu);
  const o = JSON.stringify(obtenu);
  if (a === o) reussis++;
  else echecs.push({ groupe: groupeCourant, nom, attendu: a, obtenu: o });
}

function vrai(nom, condition)  { verifier(nom, condition === true,  true); }
function faux(nom, condition)  { verifier(nom, condition === false, true); }

/* Une sauvegarde version 3 toute prête, à ajuster test par test. */
const JOUR = '2026-08-12';

function etatV3(taches, journal) {
  return {
    'ibadah-v3': {
      version: 3, accueilli: true,
      taches: taches || [], journal: journal || {},
      reglages: { notif: false, sombre: false, silenceNuit: true }
    }
  };
}

function tache(champs) {
  return Object.assign({
    id: 1, nom: 'Test', frequence: 'daily', heure: '', jourSemaine: null,
    creeeLe: '2026-01-01', active: true, desactiveeLe: null, sousTaches: []
  }, champs);
}


/* ═══════════════════════════════════════════════════════════
   1. Les dates
   ═══════════════════════════════════════════════════════════ */
groupe('Les dates');
{
  const { Store } = chargerStore({ jour: JOUR });

  verifier('le jour simulé est bien pris en compte', Store.aujourdhui(), JOUR);
  verifier('aller-retour clé → date → clé',
    Store.cleDuJour(Store.dateDepuisCle('2026-03-07')), '2026-03-07');

  verifier('la veille du 1er mars 2026', Store.cleDecalee('2026-03-01', -1), '2026-02-28');
  verifier('le lendemain du 31 décembre', Store.cleDecalee('2026-12-31', 1), '2027-01-01');
  verifier('la veille du 1er janvier',    Store.cleDecalee('2026-01-01', -1), '2025-12-31');
  verifier('trente jours en arrière',     Store.cleDecalee('2026-08-12', -30), '2026-07-13');

  // Un jour simulé farfelu ne doit pas être accepté
  const bidon = chargerStore({ jour: 'n-importe-quoi' }).Store;
  verifier('une date d\'adresse invalide est ignorée', bidon.jourSimule(), null);
}


/* ═══════════════════════════════════════════════════════════
   2. La récurrence — quelle intention un jour donné ?
   ═══════════════════════════════════════════════════════════ */
groupe('La récurrence');
{
  const { Store } = chargerStore({ jour: JOUR, sauvegarde: etatV3([
    tache({ id: 1, frequence: 'daily' }),
    tache({ id: 2, frequence: 'weekly', jourSemaine: 5 }),      // vendredi
    tache({ id: 3, frequence: 'monthly', creeeLe: '2026-01-31' }),
    tache({ id: 4, frequence: 'once' })
  ]) });

  const t = id => Store.tache(id);

  vrai('quotidienne : présente aujourd\'hui', Store.estAuProgramme(t(1), JOUR));
  faux('quotidienne : absente avant sa création',
    Store.estAuProgramme(t(1), '2025-12-31'));

  // Sur 14 jours, une hebdomadaire doit tomber exactement 2 fois
  let compte = 0;
  for (let i = 0; i < 14; i++) {
    if (Store.estAuProgramme(t(2), Store.cleDecalee(JOUR, i))) compte++;
  }
  verifier('hebdomadaire : 2 fois en 14 jours', compte, 2);
  vrai('hebdomadaire : bien un vendredi',
    Store.dateDepuisCle(
      [0,1,2,3,4,5,6,7,8,9,10,11,12,13]
        .map(i => Store.cleDecalee(JOUR, i))
        .find(c => Store.estAuProgramme(t(2), c))
    ).getDay() === 5);

  // Mensuelle créée un 31 : elle doit retomber sur le dernier jour des mois courts
  vrai('mensuelle du 31 → 28 février (2026 n\'est pas bissextile)',
    Store.estAuProgramme(t(3), '2026-02-28'));
  faux('mensuelle du 31 → pas le 27 février', Store.estAuProgramme(t(3), '2026-02-27'));
  vrai('mensuelle du 31 → 31 mars',   Store.estAuProgramme(t(3), '2026-03-31'));
  vrai('mensuelle du 31 → 30 avril',  Store.estAuProgramme(t(3), '2026-04-30'));
  faux('mensuelle du 31 → pas le 29 avril', Store.estAuProgramme(t(3), '2026-04-29'));

  vrai('« une seule fois » : visible tant qu\'elle n\'est pas faite',
    Store.estAuProgramme(t(4), JOUR));
  Store.basculerTache(t(4), JOUR);
  vrai('« une seule fois » : reste visible le jour où on la coche',
    Store.estAuProgramme(t(4), JOUR));
  faux('« une seule fois » : disparaît le lendemain',
    Store.estAuProgramme(t(4), Store.cleDecalee(JOUR, 1)));
}


/* ═══════════════════════════════════════════════════════════
   3. Le carnet — cocher, décocher, et demain
   ═══════════════════════════════════════════════════════════ */
groupe('La date hégirienne');
{
  const { Store } = chargerStore({ jour: '2026-08-14' });

  const h = Store.dateHegirienne('2026-08-14');
  vrai('le navigateur sait la calculer', !!h);

  if (h) {
    // Repère fixe : si cette réponse change, c'est que la méthode de
    // calcul a changé sous nos pieds, et il faut le savoir.
    verifier('★ 14 août 2026 → 1 Rabi\' al-Awwal 1448', h.texte, '1 Rabi\' al-Awwal 1448');
    verifier('le jour est un nombre', h.jour, 1);
    verifier('le mois est un nombre', h.mois, 3);
    verifier('l\'année est un nombre', h.annee, 1448);
  }

  // Le décalage doit vraiment décaler, y compris d'un mois à l'autre.
  {
    const S = chargerStore({ jour: '2026-08-14' }).Store;
    verifier('sans réglage, aucun décalage', S.decalageHegire(), 0);

    S.reglerOption('decalageHegire', -1);
    verifier('★ « −1 jour » recule bien la date',
      S.dateHegirienne('2026-08-14').texte, '30 Safar 1448');

    S.reglerOption('decalageHegire', 1);
    verifier('★ « +1 jour » avance bien la date',
      S.dateHegirienne('2026-08-14').texte, '2 Rabi\' al-Awwal 1448');
  }

  // Un décalage aberrant ne doit pas pouvoir s'installer.
  {
    const S = chargerStore({ jour: '2026-08-14' }).Store;
    S.reglerOption('decalageHegire', 40);
    verifier('★ un décalage démesuré est ramené au maximum',
      S.decalageHegire(), S.DECALAGE_MAX);
    S.reglerOption('decalageHegire', -40);
    verifier('dans l\'autre sens aussi', S.decalageHegire(), -S.DECALAGE_MAX);
    S.reglerOption('decalageHegire', 'bonjour');
    verifier('★ une valeur illisible vaut zéro', S.decalageHegire(), 0);
    vrai('et la date reste calculable', !!S.dateHegirienne('2026-08-14'));
  }

  // Une sauvegarde écrite avant ce réglage doit recevoir sa valeur par défaut.
  {
    const S = chargerStore({ jour: '2026-08-14', sauvegarde: { 'ibadah-v3': {
      version: 3, accueilli: true, taches: [], journal: {},
      reglages: { notif: false, sombre: true, silenceNuit: true }   // pas de décalage
    } } }).Store;
    verifier('★ une ancienne sauvegarde reçoit le réglage manquant',
      S.decalageHegire(), 0);
    vrai('★ sans perdre ses réglages existants', S.reglages().sombre);
  }

  /* L'écran dit-il bien que c'est une estimation ? */
  {
    const html = lire('index.html');
    const app  = lire('app.js');
    const store = lire('store.js');

    vrai('la date apparaît dans l\'en-tête',   /id="today-hijri"/.test(html));
    vrai('le réglage existe',                  /id="hijri-minus"/.test(html));
    vrai('★ l\'écran dit qu\'elle est calculée', /calculée/.test(html));
    vrai('★ et invite à s\'aligner sur sa mosquée', /mosquée/.test(html));
    vrai('les deux boutons sont branchés',
      /#hijri-minus'\)\.addEventListener/.test(app) && /#hijri-plus'\)\.addEventListener/.test(app));

    // Le garde-fou central : cette date ne doit jamais prescrire une adoration.
    // On regarde le code seul — les commentaires, eux, ont le droit (et le
    // devoir) de parler de ce piège pour qu'il ne soit pas oublié.
    const sansCommentaires = txt => txt
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    faux('★ la date hégirienne ne dicte aucune adoration',
      /(jeûne|jeune|jeûner)\s+aujourd/i.test(sansCommentaires(app) + sansCommentaires(store)));

    vrai('la liste des mois est trouvée',
      /const MOIS_HEGIRIENS = \[/.test(store));
  }

  // Les douze mois, un par un : aucun ne doit manquer à l'appel.
  {
    const S = chargerStore({ jour: '2026-08-14' }).Store;
    const vus = new Set();
    for (let i = 0; i < 400; i++) {
      const d = S.dateHegirienne(S.cleDecalee('2026-01-01', i));
      if (d) vus.add(d.mois);
    }
    verifier('★ une année entière donne bien douze mois nommés', vus.size, 12);
    vrai('★ aucun mois ne s\'affiche « undefined »',
      [...Array(400).keys()].every(i => {
        const d = S.dateHegirienne(S.cleDecalee('2026-01-01', i));
        return !d || !/undefined/.test(d.texte);
      }));
  }
}


/* ═══════════════════════════════════════════════════════════
   2 ter. L'ordre des intentions
   ═══════════════════════════════════════════════════════════ */
groupe('L\'ordre des intentions');
{
  // Créées dans le désordre exprès : c'est le rythme qui doit décider,
  // pas l'ordre dans lequel on les a écrites.
  const { Store } = chargerStore({ jour: JOUR, sauvegarde: etatV3([
    tache({ id: 1, nom: 'Mensuelle A',   frequence: 'monthly', creeeLe: '2026-08-12' }),
    tache({ id: 2, nom: 'Quotidienne A', frequence: 'daily' }),
    tache({ id: 3, nom: 'Une fois',      frequence: 'once' }),
    tache({ id: 4, nom: 'Quotidienne B', frequence: 'daily' }),
    tache({ id: 5, nom: 'Vendredi',      frequence: 'weekly', jourSemaine: 3 })
  ]) });

  const noms = Store.tachesDuJour(JOUR).map(t => t.nom);
  verifier('★ les intentions sont rangées par rythme', noms, [
    'Quotidienne A', 'Quotidienne B',   // chaque jour d'abord
    'Vendredi',                         // puis chaque semaine
    'Mensuelle A',                      // puis chaque mois
    'Une fois'                          // et les ponctuelles en bas
  ]);

  verifier('★ à rythme égal, l\'ordre de création est gardé',
    noms.indexOf('Quotidienne A') < noms.indexOf('Quotidienne B'), true);

  // Le tri ne doit toucher qu'à l'affichage : la liste rangée sur
  // l'appareil garde son ordre, sinon chaque ouverture la réécrirait.
  verifier('★ la liste rangée sur l\'appareil n\'est pas réorganisée',
    Store._etat().taches.map(t => t.id), [1, 2, 3, 4, 5]);

  // Un rythme inconnu (fichier bricolé) ne doit pas faire disparaître
  // l'intention : elle passe simplement en dernier.
  const bizarre = chargerStore({ jour: JOUR, sauvegarde: etatV3([
    tache({ id: 1, nom: 'Inconnue', frequence: 'lunaire' }),
    tache({ id: 2, nom: 'Normale',  frequence: 'daily' })
  ]) }).Store;
  const n2 = bizarre.tachesDuJour(JOUR).map(t => t.nom);
  vrai('★ un rythme inconnu ne fait pas disparaître l\'intention',
    n2.indexOf('Inconnue') !== -1);
  verifier('et il se range en dernier', n2[n2.length - 1], 'Inconnue');

  /* L'écran regroupe-t-il vraiment ? */
  const app = lire('app.js');
  const css = lire('styles.css');
  vrai('★ l\'écran écrit les intentions par groupes',
    /remplirParGroupes\(listeAFaire/.test(app));
  vrai('les faites sont groupées aussi',
    /remplirParGroupes\(listeFaites/.test(app));
  vrai('★ l\'intertitre n\'apparaît qu\'avec plusieurs rythmes',
    /groupes\.length > 1/.test(app));
  vrai('l\'intertitre a un style', /\.groupe-titre\s*\{/.test(css));
}


/* ═══════════════════════════════════════════════════════════
   3 bis. Le carnet du jour
   ═══════════════════════════════════════════════════════════ */
groupe('Le carnet du jour');
{
  const { Store } = chargerStore({ jour: JOUR, sauvegarde: etatV3([tache({ id: 1 })]) });
  const t = Store.tache(1);

  faux('au départ, rien n\'est fait', Store.estFaite(t, JOUR));
  vrai('cocher renvoie « vient d\'être cochée »', Store.basculerTache(t, JOUR));
  vrai('elle est faite', Store.estFaite(t, JOUR));
  faux('décocher renvoie « n\'est plus cochée »', Store.basculerTache(t, JOUR));
  faux('elle n\'est plus faite', Store.estFaite(t, JOUR));

  verifier('une page vide ne reste pas dans le carnet',
    Object.keys(Store._etat().journal).length, 0);

  Store.basculerTache(t, JOUR);
  faux('l\'intention réapparaît demain',
    Store.estFaite(t, Store.cleDecalee(JOUR, 1)));
  vrai('elle est bien au programme de demain',
    Store.estAuProgramme(t, Store.cleDecalee(JOUR, 1)));

  Store.basculerPriere('Fajr', JOUR);
  vrai('une prière se coche', Store.priereFaite('Fajr', JOUR));
  faux('les autres prières ne bougent pas', Store.priereFaite('Isha', JOUR));
}


/* ═══════════════════════════════════════════════════════════
   4. Les dhikr rangés dans une intention
   ═══════════════════════════════════════════════════════════ */
groupe('Les dhikr d\'une intention');
{
  const huit = [];
  for (let i = 1; i <= 8; i++) {
    huit.push({ id: 100 + i, nom: 'Dhikr ' + i, repetitions: 1, refBiblio: null });
  }
  const { Store } = chargerStore({ jour: JOUR,
    sauvegarde: etatV3([tache({ id: 1, sousTaches: huit })]) });
  const t = Store.tache(1);

  verifier('huit dhikr au départ', Store.avancement(t, JOUR), { faits: 0, total: 8 });

  for (let i = 1; i <= 7; i++) Store.basculerSous(t, 100 + i, JOUR);
  verifier('sept cochés', Store.avancement(t, JOUR), { faits: 7, total: 8 });
  faux('à 7 sur 8, l\'intention n\'est PAS terminée', Store.estFaite(t, JOUR));

  Store.basculerSous(t, 108, JOUR);
  verifier('huit cochés', Store.avancement(t, JOUR), { faits: 8, total: 8 });
  vrai('★ à 8 sur 8, l\'intention se valide TOUTE SEULE', Store.estFaite(t, JOUR));

  Store.basculerSous(t, 103, JOUR);
  faux('★ décocher un dhikr fait revenir l\'intention', Store.estFaite(t, JOUR));
  verifier('l\'avancement suit', Store.avancement(t, JOUR), { faits: 7, total: 8 });

  Store.toutBasculer(t, JOUR);
  vrai('« tout cocher » termine l\'intention', Store.estFaite(t, JOUR));
  Store.toutBasculer(t, JOUR);
  faux('« tout décocher » la rouvre', Store.estFaite(t, JOUR));
  verifier('et vide l\'avancement', Store.avancement(t, JOUR), { faits: 0, total: 8 });

  // Cocher le parent directement doit passer par ses dhikr
  Store.basculerTache(t, JOUR);
  verifier('cocher l\'intention coche tous ses dhikr',
    Store.avancement(t, JOUR), { faits: 8, total: 8 });

  // Ajouter un dhikr à une intention terminée doit la rouvrir
  Store.ajouterSousTache(1, { nom: 'Un neuvième', repetitions: 3 });
  faux('ajouter un dhikr rouvre une intention terminée', Store.estFaite(t, JOUR));
  verifier('neuf dhikr maintenant', Store.avancement(t, JOUR).total, 9);

  // Retirer le dhikr non fait doit la refermer
  const neuvieme = Store.sousTachesDe(t).find(s => s.nom === 'Un neuvième');
  Store.retirerSousTache(1, neuvieme.id);
  vrai('retirer le dhikr manquant retermine l\'intention', Store.estFaite(t, JOUR));

  // Deux dhikr ne doivent jamais partager un identifiant
  const ids = Store.sousTachesDe(t).map(s => s.id);
  verifier('aucun identifiant en double', ids.length, new Set(ids).size);
}

groupe('Remplacer la liste des dhikr');
{
  const { Store } = chargerStore({ jour: JOUR, sauvegarde: etatV3([
    tache({ id: 1, sousTaches: [
      { id: 201, nom: 'Gardé',  repetitions: 1, refBiblio: 'ayat-kursi' },
      { id: 202, nom: 'Retiré', repetitions: 1, refBiblio: 'sourate-ikhlas' }
    ] })
  ]) });
  const t = Store.tache(1);

  Store.basculerSous(t, 201, JOUR);
  Store.basculerSous(t, 202, JOUR);
  vrai('les deux faits, l\'intention est terminée', Store.estFaite(t, JOUR));

  // On garde le premier (avec son identifiant) et on en ajoute un nouveau
  Store.remplacerSousTaches(1, [
    { id: 201, nom: 'Gardé', repetitions: 1, refBiblio: 'ayat-kursi' },
    { nom: 'Nouveau', repetitions: 3, refBiblio: 'sourate-falaq' }
  ]);

  verifier('deux dhikr après remplacement', Store.sousTachesDe(t).length, 2);
  vrai('★ le dhikr gardé reste coché aujourd\'hui', Store.sousFaite(201, JOUR));
  faux('★ le dhikr retiré ne pèse plus dans le carnet',
    Store._etat().journal[JOUR].sous.includes(202));
  faux('l\'intention n\'est plus terminée (le nouveau reste à faire)',
    Store.estFaite(t, JOUR));
}


/* ═══════════════════════════════════════════════════════════
   5. L'assiduité
   ═══════════════════════════════════════════════════════════ */
groupe('L\'assiduité');
{
  // Tenue les jours -1 à -20, ratée les jours -21 à -29, rien aujourd'hui.
  const journal = {};
  const provisoire = chargerStore({ jour: JOUR }).Store;
  for (let i = 1; i <= 20; i++) {
    journal[provisoire.cleDecalee(JOUR, -i)] = { taches: [1], prieres: [], sous: [] };
  }
  const { Store } = chargerStore({ jour: JOUR,
    sauvegarde: etatV3([tache({ id: 1, creeeLe: provisoire.cleDecalee(JOUR, -40) })], journal) });
  const t = Store.tache(1);

  verifier('régularité : 20 tenues sur 29 jours prévus',
    Store.regularite(t), { prevus: 29, faits: 20, pourcent: 69 });
  verifier('★ la journée en cours ne compte pas tant qu\'elle n\'est pas faite',
    Store.regularite(t).prevus, 29);

  verifier('série en cours', Store.serie(), 20);
  verifier('meilleure série', Store.meilleureSerie(), 20);
  verifier('part de la journée d\'hier (1 intention + 0 prière sur 6)',
    Store.partDuJour(Store.cleDecalee(JOUR, -1)), 17);
  verifier('part de la journée d\'aujourd\'hui', Store.partDuJour(JOUR), 0);
  verifier('régularité globale', Store.regulariteGlobale(),
    { prevus: 174, faits: 20, pourcent: 11 });
  verifier('régularité des prières', Store.regularitePrieres().prevus, 145);
  verifier('nombre de fois tenue', Store.foisTenue(t), 20);
  verifier('journées entières', Store.journeesCompletes(), 0);

  // Sept derniers jours et grille du mois
  verifier('le graphique donne 7 jours', Store.septDerniersJours().length, 7);
  vrai('chaque barre est un pourcentage',
    Store.septDerniersJours().every(j => j.part >= 0 && j.part <= 100));
  vrai('la grille du mois contient bien les 31 jours d\'août',
    Store.grilleDuMois().filter(c => c).length === 31);
  vrai('les jours à venir sont marqués comme tels',
    Store.grilleDuMois().filter(c => c && c.part === -1).length > 0);

  // ★ Le test décisif : retirer une intention ne réécrit pas le passé
  const avant = JSON.stringify({
    reg: Store.regularite(t), glob: Store.regulariteGlobale(),
    hier: Store.partDuJour(Store.cleDecalee(JOUR, -1)), serie: Store.serie()
  });
  Store.supprimerTache(1);
  const apres = JSON.stringify({
    reg: Store.regularite(t), glob: Store.regulariteGlobale(),
    hier: Store.partDuJour(Store.cleDecalee(JOUR, -1)), serie: Store.serie()
  });
  verifier('★★ retirer une intention ne change RIEN au passé', apres, avant);
  verifier('la date de retrait est notée', Store.tache(1).desactiveeLe, JOUR);
  verifier('elle disparaît de la liste du jour', Store.tachesDuJour(JOUR).length, 0);
}

groupe('L\'assiduité : cas particuliers');
{
  const provisoire = chargerStore({ jour: JOUR }).Store;
  const dec = n => provisoire.cleDecalee(JOUR, n);

  // Une série trouée : 3 jours, un trou, 5 jours
  const journal = {};
  [1, 2, 3].forEach(i => journal[dec(-i)] = { taches: [1], prieres: [], sous: [] });
  [5, 6, 7, 8, 9].forEach(i => journal[dec(-i)] = { taches: [1], prieres: [], sous: [] });

  const { Store } = chargerStore({ jour: JOUR,
    sauvegarde: etatV3([tache({ id: 1, creeeLe: dec(-40) })], journal) });

  verifier('la série s\'arrête au trou', Store.serie(), 3);
  verifier('la meilleure série retient le plus long passage', Store.meilleureSerie(), 5);

  // Une journée à peine commencée ne casse pas la série
  Store.basculerTache(Store.tache(1), JOUR);
  verifier('cocher aujourd\'hui allonge la série', Store.serie(), 4);

  // Une journée entière
  const complet = chargerStore({ jour: JOUR, sauvegarde: etatV3(
    [tache({ id: 1, creeeLe: dec(-5) })],
    { [dec(-1)]: { taches: [1], prieres: ['Fajr','Dhuhr','Asr','Maghrib','Isha'], sous: [] } }
  ) }).Store;
  verifier('une journée entière vaut 100 %', complet.partDuJour(dec(-1)), 100);
  verifier('et compte comme journée entière', complet.journeesCompletes(), 1);
}


/* ═══════════════════════════════════════════════════════════
   6. Reprendre une ancienne sauvegarde
   ═══════════════════════════════════════════════════════════ */
groupe('Reprise des anciennes sauvegardes');
{
  const v2 = {
    version: 2, accueilli: true,
    taches: [
      { id: 11, nom: 'Coran',   frequence: 'daily',  heure: '07:30', jourSemaine: null, creeeLe: '2026-08-02', active: true },
      { id: 12, nom: 'Al-Kahf', frequence: 'weekly', heure: '',      jourSemaine: 5,    creeeLe: '2026-08-02', active: true },
      { id: 13, nom: 'Retirée', frequence: 'daily',  heure: '',      jourSemaine: null, creeeLe: '2026-08-02', active: false }
    ],
    journal: { '2026-08-11': { taches: [11, 13], prieres: ['Fajr', 'Dhuhr'] } },
    reglages: { notif: false, sombre: true, silenceNuit: false }
  };
  const { Store, nav } = chargerStore({ jour: JOUR, sauvegarde: { 'ibadah-v2': v2 } });

  verifier('la sauvegarde passe en version 3', Store._etat().version, 3);
  verifier('aucune intention perdue', Store._etat().taches.length, 3);
  // Les réglages sauvegardés sont gardés, et ceux ajoutés depuis reçoivent
  // leur valeur par défaut — sinon une vieille sauvegarde arriverait avec
  // des réglages manquants, et l'application lirait « undefined ».
  verifier('les réglages sont gardés', Store.reglages(),
    { notif: false, sombre: true, silenceNuit: false, decalageHegire: 0 });
  vrai('chaque intention reçoit une liste de dhikr vide',
    Store._etat().taches.every(t => Array.isArray(t.sousTaches)));
  vrai('chaque page du carnet reçoit son casier « sous »',
    Object.values(Store._etat().journal).every(p => Array.isArray(p.sous)));
  verifier('★ une intention déjà retirée ne compte nulle part dans l\'historique',
    Store.tache(13).desactiveeLe, Store.tache(13).creeeLe);
  vrai('l\'ancienne sauvegarde reste sur l\'appareil, en secours',
    nav.memoire.has('ibadah-v2'));

  // Version 1 : la toute première maquette
  const v1 = { tasks: [{ id: 5, name: 'Ancienne', freq: 'daily', time: '', done: true }],
               prayers: { Fajr: true }, settings: { dark: false, notif: false, quiet: true } };
  const ancien = chargerStore({ jour: JOUR, sauvegarde: { 'ibadah-demo': v1 } }).Store;
  verifier('la maquette v1 se reprend aussi', ancien._etat().taches.length, 1);
  verifier('son nom est conservé', ancien._etat().taches[0].nom, 'Ancienne');
  vrai('ce qui était fait reste fait', ancien.estFaite(ancien.tache(5), JOUR));

  // Une sauvegarde abîmée ne doit pas empêcher l'appli de démarrer
  const casse = chargerStore({ jour: JOUR,
    sauvegarde: { 'ibadah-v3': '{ ceci n\'est pas du JSON' } }).Store;
  verifier('une sauvegarde abîmée repart proprement', casse._etat().taches.length, 0);
  verifier('et sans planter', casse._etat().version, 3);
}


/* ═══════════════════════════════════════════════════════════
   7. La bibliothèque de dhikr (adhkar.js)
       C'est le fichier corrigé à la main : il faut le surveiller.
   ═══════════════════════════════════════════════════════════ */
groupe('La bibliothèque de dhikr');
{
  let biblio = null;
  try { biblio = chargerAdhkar(); }
  catch (e) { echecs.push({ groupe: groupeCourant,
    nom: '★ adhkar.js est cassé — vérifie les apostrophes et les virgules',
    attendu: 'un fichier lisible', obtenu: e.message }); }

  if (biblio) {
    const { ADHKAR, ADHKAR_CATEGORIES } = biblio;
    const cats = ADHKAR_CATEGORIES.map(c => c.id);

    vrai('la bibliothèque n\'est pas vide', ADHKAR.length > 0);
    verifier('cinq catégories', ADHKAR_CATEGORIES.length, 5);

    const ids = ADHKAR.map(d => d.id);
    verifier('aucun identifiant en double', ids.length, new Set(ids).size);

    const champs = ['id', 'nom', 'arabe', 'phonetique', 'traduction', 'source'];
    const manquants = [];
    const categoriesInconnues = [];
    const repetitionsInvalides = [];
    const verifieNonBooleen = [];

    ADHKAR.forEach(d => {
      champs.forEach(c => {
        if (typeof d[c] !== 'string' || !d[c].trim()) manquants.push(`${d.id || '?'} → ${c}`);
      });
      if (!Array.isArray(d.categories) || !d.categories.length) {
        categoriesInconnues.push(`${d.id} → aucune catégorie`);
      } else {
        d.categories.forEach(c => {
          if (!cats.includes(c)) categoriesInconnues.push(`${d.id} → « ${c} » inconnue`);
        });
      }
      if (!Number.isInteger(d.repetitions) || d.repetitions < 1) {
        repetitionsInvalides.push(`${d.id} → ${d.repetitions}`);
      }
      if (typeof d.verifie !== 'boolean') verifieNonBooleen.push(String(d.id));
    });

    verifier('tous les champs sont remplis', manquants, []);
    verifier('toutes les catégories existent', categoriesInconnues, []);
    verifier('les nombres de répétitions sont corrects', repetitionsInvalides, []);
    verifier('« verifie » est bien vrai ou faux partout', verifieNonBooleen, []);

    // Chaque catégorie doit contenir au moins un dhikr, sinon l'écran est vide
    const vides = cats.filter(c => !ADHKAR.some(d => d.categories.includes(c)));
    verifier('aucune catégorie vide', vides, []);

    // Les dhikr proposés d'office au premier démarrage doivent exister
    const bloc = lire('app.js').match(/const DEPART = \{([\s\S]*?)\n\};/);
    vrai('la liste de départ est trouvée dans app.js', !!bloc);
    if (bloc) {
      const depart = [...bloc[1].matchAll(/'([a-z0-9-]+)'/g)].map(m => m[1]);
      vrai('elle n\'est pas vide', depart.length > 0);
      verifier('★ chaque dhikr de départ existe dans la bibliothèque',
        depart.filter(id => !ids.includes(id)), []);
    }

    // Combien restent à relire ? Ce n'est pas une erreur, juste un rappel.
    const aRelire = ADHKAR.filter(d => !d.verifie).length;
    if (aRelire) {
      console.log(`\n  ⚠️  ${aRelire} dhikr sur ${ADHKAR.length} n'ont pas encore été relus`);
      console.log('     par une personne de science. Le bandeau d\'avertissement');
      console.log('     reste affiché dans l\'application tant que c\'est le cas.\n');
    }
  }
}


/* ═══════════════════════════════════════════════════════════
   8. Les dhikr ajoutés depuis la feuille Google
   ═══════════════════════════════════════════════════════════ */
groupe('La feuille Google');
{
  /* feuille.js est écrit pour un navigateur. On lui fournit ici les
     deux choses dont il a besoin — un tableau ADHKAR et un
     localStorage — pour pouvoir l'interroger sans rien ouvrir. */
  function chargerFeuille(adhkar) {
    const memoire = new Map();
    const faux = {
      getItem: c => (memoire.has(c) ? memoire.get(c) : null),
      setItem: (c, v) => memoire.set(c, String(v))
    };
    return new Function('ADHKAR', 'localStorage', lire('feuille.js') +
      '\n;return { feuilleLireCSV, feuilleVersDhikr, feuilleEstOui,' +
      ' feuilleIdentifiant, feuillePoser, FEUILLE_URL };')(adhkar, faux);
  }

  let F = null;
  try { F = chargerFeuille([]); }
  catch (e) { echecs.push({ groupe: groupeCourant,
    nom: '★ feuille.js est cassé', attendu: 'un fichier lisible', obtenu: e.message }); }

  if (F) {
    /* ─── Lire le tableau ─── */
    const simple = F.feuilleLireCSV('a,b\n1,2');
    verifier('deux lignes lues', simple.length, 2);
    verifier('les cases sont séparées', simple[1], ['1', '2']);

    // Le piège principal : une virgule À L'INTÉRIEUR d'une case.
    const virgule = F.feuilleLireCSV('Nom,Traduction\nTasbih,"Gloire, à Allah"');
    verifier('★ une virgule dans une case ne coupe pas la case',
      virgule[1][1], 'Gloire, à Allah');

    const guillemet = F.feuilleLireCSV('Nom\n"Il a dit ""oui"""');
    verifier('un guillemet dans une case est rendu tel quel',
      guillemet[1][0], 'Il a dit "oui"');

    const saut = F.feuilleLireCSV('Nom,Traduction\nA,"deux\nlignes"');
    verifier('un retour à la ligne dans une case ne coupe pas la ligne',
      saut.length, 2);

    /* ─── Transformer en dhikr ─── */
    const csv = [
      'Nom,Categories,Arabe,Phonetique,Traduction,Source,Repetitions,Verifie',
      'Tasbih,"matin, soir",سبحان الله,Subhâna-Llâh,Gloire à Allah,Muslim,33,non',
      'Tahmid,soir,الحمد لله,Al-hamdu li-Llâh,Louange à Allah,Muslim,10,oui'
    ].join('\n');
    const dhikrs = F.feuilleVersDhikr(F.feuilleLireCSV(csv));

    verifier('deux dhikr fabriqués', dhikrs.length, 2);
    verifier('les catégories deviennent une liste', dhikrs[0].categories, ['matin', 'soir']);
    verifier('les répétitions sont un nombre', dhikrs[0].repetitions, 33);
    verifier('« non » veut dire pas encore relu', dhikrs[0].verifie, false);
    verifier('« oui » veut dire relu', dhikrs[1].verifie, true);
    verifier('l\'arabe est conservé', dhikrs[1].arabe, 'الحمد لله');

    // Un dhikr de la feuille ne doit jamais pouvoir écraser un dhikr d'origine.
    vrai('★ les identifiants sont préfixés',
      dhikrs.every(d => d.id.indexOf('feuille-') === 0));

    /* ─── Ce qui doit résister aux erreurs de saisie ─── */
    const bancal = F.feuilleVersDhikr(F.feuilleLireCSV([
      'Nom,Categories,Repetitions,Verifie',
      'Sans catégorie,,,',            // tout est vide
      ',matin,5,oui',                 // pas de nom : ligne ignorée
      'Catégorie inventée,lundi,,',   // moment qui n'existe pas
      'Répétitions absurdes,matin,zéro,',
      'Sans catégorie,,,'             // même nom que la première
    ].join('\n')));

    verifier('★ une ligne sans nom est ignorée', bancal.length, 4);
    verifier('un dhikr sans catégorie reste visible', bancal[0].categories, ['general']);
    verifier('une catégorie inventée est écartée', bancal[1].categories, ['general']);
    verifier('des répétitions illisibles valent 1', bancal[2].repetitions, 1);
    verifier('★ deux dhikr de même nom gardent des identifiants distincts',
      bancal[0].id === bancal[3].id, false);
    verifier('une case « Vérifié » vide laisse l\'avertissement',
      bancal.every(d => d.verifie === false), true);

    // Les titres de colonnes doivent être acceptés avec ou sans accent,
    // en majuscules comme en minuscules, et dans n'importe quel ordre.
    const melange = F.feuilleVersDhikr(F.feuilleLireCSV(
      'VÉRIFIÉ,Nom,Répétitions,CATÉGORIES\noui,Istighfar,100,matin'));
    verifier('★ l\'ordre des colonnes n\'a pas d\'importance', melange[0].nom, 'Istighfar');
    verifier('les accents dans les titres sont tolérés', melange[0].repetitions, 100);
    verifier('les majuscules dans les titres sont tolérées', melange[0].verifie, true);

    /* ─── Poser les dhikr dans la bibliothèque ─── */
    const biblio = [{ id: 'ayat-kursi', nom: 'Origine', verifie: true, categories: ['matin'] }];
    const G = chargerFeuille(biblio);
    G.feuillePoser(dhikrs);
    verifier('les dhikr rejoignent la bibliothèque', biblio.length, 3);

    // Rafraîchir deux fois ne doit pas empiler les mêmes dhikr en double.
    G.feuillePoser(dhikrs);
    verifier('★ un deuxième passage ne crée pas de doublons', biblio.length, 3);
    verifier('le dhikr d\'origine est toujours là', biblio[0].nom, 'Origine');

    // Une feuille vidée doit pouvoir retirer ce qu'elle avait ajouté.
    G.feuillePoser([]);
    verifier('une feuille vide retire ses dhikr', biblio.length, 1);
  }

  /* ─── Le fichier est-il vraiment branché ? ───
     C'est le piège déjà payé une fois : un fichier parfait, des tests
     verts, mais personne ne le charge — donc rien ne s'affiche. */
  const html = lire('index.html');
  const sw   = lire('sw.js');
  const pub  = lire('publier.py');

  vrai('★ index.html charge feuille.js',       /src="feuille\.js"/.test(html));
  vrai('★ il est chargé après adhkar.js',
    html.indexOf('adhkar.js') < html.indexOf('feuille.js'));
  vrai('★ le mode hors-ligne garde feuille.js', /feuille\.js/.test(sw));
  vrai('★ publier.py met feuille.js en ligne', /"feuille\.js"/.test(pub));
  vrai('★ feuille.js reçoit un numéro de version',
    /ESTAMPILLES = \[[^\]]*"feuille\.js"/.test(pub));

  // Le lien de la feuille doit rester branché. S'il disparaît, l'application
  // continue de marcher — mais plus aucun ajout n'arrive, et en silence.
  if (F) {
    vrai('★ le lien de la feuille est branché', F.FEUILLE_URL.length > 0);
    vrai('★ c\'est bien un lien publié au format CSV',
      /^https:\/\/docs\.google\.com\/spreadsheets\/.*output=csv/.test(F.FEUILLE_URL));
  }

  // Le modèle proposé doit correspondre aux colonnes que le code sait lire.
  const modele = lire('modele-adhkar.csv');
  if (F) {
    const essai = F.feuilleVersDhikr(F.feuilleLireCSV(modele));
    vrai('★ le modèle CSV est lisible par l\'application', essai.length === 2);
    vrai('les exemples du modèle ne sont pas marqués comme relus',
      essai.every(d => d.verifie === false));
  }
}


/* ═══════════════════════════════════════════════════════════
   9. Les pièges déjà payés cher — qu'ils ne reviennent jamais
   ═══════════════════════════════════════════════════════════ */
groupe('Sauvegarder et restaurer');
{
  const taches  = [tache({ id: 1, nom: 'Coran' }), tache({ id: 2, nom: 'Adhkar du soir' })];
  const journal = { '2026-08-10': { taches: [1], prieres: ['Fajr'], sous: [] },
                    '2026-08-11': { taches: [1, 2], prieres: [], sous: [] } };

  /* ─── Exporter ─── */
  {
    const { Store } = chargerStore({ sauvegarde: etatV3(taches, journal), jour: JOUR });
    const f = Store.exporter();

    verifier('le fichier s\'annonce', f.application, 'Ibadah Daily Planner');
    verifier('deux intentions comptées', f.resume.intentions, 2);
    verifier('deux jours comptés', f.resume.joursNotes, 2);
    vrai('il porte une date d\'export', typeof f.exporteLe === 'string' && f.exporteLe.length > 0);
    verifier('les intentions sont dedans', f.donnees.taches.length, 2);

    // Le fichier ne doit pas être une fenêtre sur le carnet vivant :
    // le modifier ne doit rien changer dans l'application.
    f.donnees.taches[0].nom = 'MODIFIE';
    verifier('★ le fichier est une copie, pas un raccourci',
      Store.tache(1).nom, 'Coran');

    // Il doit survivre au voyage par un fichier texte.
    vrai('★ il se transforme en texte sans rien perdre',
      JSON.parse(JSON.stringify(Store.exporter())).donnees.taches.length === 2);
  }

  /* ─── Aller-retour complet ─── */
  {
    const source = chargerStore({ sauvegarde: etatV3(taches, journal), jour: JOUR }).Store;
    const fichier = JSON.parse(JSON.stringify(source.exporter()));

    // Un autre appareil, vierge.
    const { Store: cible, nav } = chargerStore({ jour: JOUR });
    verifier('l\'appareil vierge est vide', cible.toutesLesTaches().length, 0);

    const v = cible.importer(fichier);
    vrai('l\'import est accepté', v.ok);
    verifier('les intentions sont revenues', cible.toutesLesTaches().length, 2);
    verifier('les noms sont intacts', cible.tache(2).nom, 'Adhkar du soir');
    verifier('★ l\'historique est revenu aussi',
      cible.estFaite(cible.tache(1), '2026-08-10'), true);
    verifier('la prière notée est revenue', cible.priereFaite('Fajr', '2026-08-10'), true);
    verifier('le résumé annonce ce qui est arrivé', v.resume,
      { intentions: 2, joursNotes: 2 });

    // Ça doit tenir après extinction du téléphone : sans ça, la
    // restauration ne durerait que le temps d'un écran.
    const ecrit = JSON.parse(nav.memoire.get('ibadah-v3'));
    verifier('★ la restauration est écrite sur l\'appareil', ecrit.taches.length, 2);

    // On rallume : un Store tout neuf, qui repart de ce qui a été écrit.
    const rallume = chargerStore({ sauvegarde: { 'ibadah-v3': ecrit }, jour: JOUR }).Store;
    verifier('★ elle est toujours là au redémarrage',
      rallume.toutesLesTaches().length, 2);
    verifier('avec son historique', rallume.estFaite(rallume.tache(1), '2026-08-10'), true);
  }

  /* ─── Regarder sans toucher ─── */
  {
    const { Store } = chargerStore({ sauvegarde: etatV3(taches, journal), jour: JOUR });
    const autre = { application: 'Ibadah Daily Planner', format: 1,
      donnees: { version: 3, accueilli: true, taches: [tache({ id: 9, nom: 'Autre' })],
                 journal: {}, reglages: {} } };

    const vu = Store.importer(autre, { verifierSeulement: true });
    vrai('la vérification réussit', vu.ok);
    verifier('elle annonce le contenu du fichier', vu.resume.intentions, 1);
    verifier('★ mais elle n\'a rien remplacé', Store.toutesLesTaches().length, 2);
    verifier('★ le carnet est intact', Store.tache(1).nom, 'Coran');
  }

  /* ─── Ce qui doit être refusé ─── */
  {
    const { Store } = chargerStore({ sauvegarde: etatV3(taches, journal), jour: JOUR });

    const refuses = [
      ['rien du tout',            null],
      ['un texte',                'bonjour'],
      ['un nombre',               42],
      ['une liste',               [1, 2, 3]],
      ['un objet sans rapport',   { bonjour: 'monde' }],
      ['un carnet sans journal',  { taches: [] }],
      ['un carnet sans taches',   { journal: {} }],
      ['un journal qui est une liste', { taches: [], journal: [] }]
    ];
    refuses.forEach(([quoi, valeur]) => {
      faux(`★ refuse ${quoi}`, Store.importer(valeur).ok === true);
    });

    // Le plus important : après tous ces refus, rien n'a bougé.
    verifier('★ aucun refus n\'a abîmé le carnet', Store.toutesLesTaches().length, 2);

    // Une sauvegarde venue d'une version future : on refuse plutôt que
    // de deviner et d'écraser du bon avec du mal compris.
    const futur = { format: 2, donnees: { taches: [], journal: {} } };
    faux('★ refuse une sauvegarde trop récente', Store.importer(futur).ok);
    vrai('et il le dit clairement', /récente/.test(Store.importer(futur).raison));
  }

  /* ─── Les petits pièges ─── */
  {
    const { Store } = chargerStore({ sauvegarde: etatV3(taches, journal), jour: JOUR });

    // Quelqu'un qui bricole son fichier et enlève l'enveloppe.
    const nu = { version: 3, accueilli: true, taches: [tache({ id: 5, nom: 'Nu' })],
                 journal: {}, reglages: {} };
    vrai('accepte un carnet sans enveloppe', Store.importer(nu).ok);
    verifier('et le restaure vraiment', Store.tache(5).nom, 'Nu');
  }
  {
    // Le thème appartient à l'appareil, pas à la sauvegarde : restaurer
    // le carnet d'un téléphone en mode sombre ne doit pas basculer celui-ci.
    const clair = chargerStore({ sauvegarde: {
      'ibadah-v3': { version: 3, accueilli: true, taches: [], journal: {},
                     reglages: { notif: false, sombre: false, silenceNuit: true } } } }).Store;
    clair.importer({ donnees: { version: 3, accueilli: true, taches: [], journal: {},
                                reglages: { sombre: true } } });
    faux('★ restaurer ne change pas le thème de l\'appareil', clair.reglages().sombre);
  }
  {
    // Une sauvegarde abîmée en route ne doit pas faire tomber l'application.
    const { Store } = chargerStore({ sauvegarde: etatV3(taches, journal), jour: JOUR });
    const casse = { donnees: { version: 3, taches: [null, tache({ id: 3, nom: 'Ok' })],
                               journal: { '2026-08-10': { taches: 'pas une liste' } } } };
    const v = Store.importer(casse);
    vrai('★ un fichier à moitié abîmé passe quand même', v.ok);
    verifier('les entrées vides sont écartées', Store.toutesLesTaches().length, 1);
    verifier('la journée abîmée est remise d\'aplomb',
      Store.estFaite(Store.tache(3), '2026-08-10'), false);
  }

  /* ─── Rattraper un effacement accidentel ─── */
  {
    const carnetV2 = { version: 2, accueilli: true,
      taches: [tache({ id: 1, nom: 'Ancien Coran' }), tache({ id: 2, nom: 'Ancien dhikr' })],
      journal: { '2026-08-01': { taches: [1], prieres: ['Fajr'], sous: [] } },
      reglages: { notif: false, sombre: false, silenceNuit: true } };

    // Rien à récupérer sur un appareil qui n'a jamais connu d'autre version.
    {
      const { Store } = chargerStore({ sauvegarde: etatV3(taches, journal), jour: JOUR });
      verifier('aucun ancien carnet quand il n\'y en a pas', Store.ancienCarnet(), null);
      faux('et la récupération le dit', Store.restaurerAncienCarnet().ok);
    }

    // LE scénario réel : quelqu'un efface tout par erreur, sans sauvegarde.
    {
      const { Store } = chargerStore({ jour: JOUR, sauvegarde: Object.assign(
        { 'ibadah-v2': carnetV2 }, etatV3(taches, journal)) });

      verifier('avant l\'accident', Store.toutesLesTaches().length, 2);
      Store.repartirDeZero();
      verifier('après l\'accident, plus rien', Store.toutesLesTaches().length, 0);

      const trouve = Store.ancienCarnet();
      vrai('★ l\'ancien carnet a survécu à l\'effacement', !!trouve);
      verifier('et on sait ce qu\'il contient', trouve.resume,
        { intentions: 2, joursNotes: 1 });

      const v = Store.restaurerAncienCarnet();
      vrai('★ la récupération réussit', v.ok);
      verifier('★ les intentions sont revenues', Store.toutesLesTaches().length, 2);
      verifier('avec leurs noms', Store.tache(1).nom, 'Ancien Coran');
      verifier('★ et leur historique',
        Store.estFaite(Store.tache(1), '2026-08-01'), true);
    }

    // Un carnet vide ne doit pas être proposé : ce serait un faux espoir.
    {
      const { Store } = chargerStore({ jour: JOUR, sauvegarde: {
        'ibadah-v2': { version: 2, taches: [], journal: {}, reglages: {} } } });
      verifier('★ un ancien carnet vide n\'est pas proposé', Store.ancienCarnet(), null);
    }

    // La toute première maquette (version 1) doit être rattrapée aussi.
    {
      const { Store } = chargerStore({ jour: JOUR, sauvegarde: { 'ibadah-demo': {
        tasks: [{ id: 7, name: 'Maquette', freq: 'daily', time: '', done: true }],
        prayers: { Fajr: true }, settings: {} } } });
      const t = Store.ancienCarnet();
      vrai('★ un carnet de la toute première version est retrouvé', !!t);
      vrai('la récupération réussit aussi', Store.restaurerAncienCarnet().ok);
      verifier('et rend l\'intention', Store.tache(7).nom, 'Maquette');
    }

    // Un ancien carnet illisible ne doit pas faire tomber l'application.
    {
      const { Store } = chargerStore({ jour: JOUR, sauvegarde: {
        'ibadah-v2': 'ceci n\'est pas du JSON {{{' } });
      verifier('★ un ancien carnet abîmé est ignoré sans casse',
        Store.ancienCarnet(), null);
      faux('et la récupération refuse proprement', Store.restaurerAncienCarnet().ok);
    }

    // Le thème reste celui de l'appareil, comme pour une restauration.
    {
      const { Store } = chargerStore({ jour: JOUR, sauvegarde: {
        'ibadah-v2': Object.assign({}, carnetV2, { reglages: { sombre: true } }),
        'ibadah-v3': { version: 3, accueilli: true, taches: [], journal: {},
                       reglages: { notif: false, sombre: false, silenceNuit: true } } } });
      Store.restaurerAncienCarnet();
      faux('★ récupérer ne change pas le thème de l\'appareil', Store.reglages().sombre);
    }
  }

  /* ─── Les boutons existent-ils vraiment ? ─── */
  {
    const html = lire('index.html');
    const app  = lire('app.js');

    vrai('★ le bouton « Sauvegarder » existe',  /id="btn-export"/.test(html));
    vrai('★ le bouton « Restaurer » existe',    /id="btn-import"/.test(html));
    vrai('le sélecteur de fichier existe',      /id="import-file"/.test(html));
    vrai('★ « Sauvegarder » est branché',       /#btn-export'\)\.addEventListener/.test(app));
    vrai('★ « Restaurer » est branché',         /#import-file'\)\.addEventListener/.test(app));
    vrai('l\'écran prévient que tout est local', /efface définitivement/.test(html));

    // Restaurer et tout effacer sont irréversibles : ils doivent demander.
    const bloc = app.match(/#import-file'\)\.addEventListener[\s\S]*?\n\}\);/);
    vrai('★ restaurer demande confirmation', !!bloc && /confirm\(/.test(bloc[0]));

    const clear = app.match(/#btn-clear'\)\.addEventListener[\s\S]*?\n\}\);/);
    vrai('★ tout effacer demande confirmation', !!clear && /confirm\(/.test(clear[0]));
    vrai('et rappelle de sauvegarder d\'abord', !!clear && /sauvegarde/.test(clear[0]));

    // Le bouton de récupération existe, part caché, et demande avant de remplacer.
    vrai('le bouton « Récupérer » existe', /id="btn-recover"/.test(html));
    vrai('★ il est caché par défaut',
      /id="btn-recover"[\s\S]{0,120}?hidden/.test(html));
    vrai('★ il n\'apparaît que si un carnet est trouvé',
      /Store\.ancienCarnet\(\)[\s\S]{0,200}?#btn-recover'\)\.hidden = false/.test(app));
    const rec = app.match(/#btn-recover'\)\.addEventListener[\s\S]*?\n\}\);/);
    vrai('★ récupérer demande confirmation', !!rec && /confirm\(/.test(rec[0]));
  }
}


/* ═══════════════════════════════════════════════════════════
   10. Le hadith du jour
   ═══════════════════════════════════════════════════════════ */
groupe('Le hadith du jour');
{
  const app = lire('app.js');

  /* Les hadiths qudsi ont été retirés parce qu'ils n'avaient pas été relus.
     Le piège : l'appli a DEUX sources de hadiths — une en ligne et une
     réserve hors connexion. Ne corriger que l'une des deux laisse les
     textes non relus revenir dès que le téléphone retrouve du réseau. */
  const bloc = app.match(/const RECUEILS = \[([\s\S]*?)\n\];/);
  vrai('la liste des recueils en ligne est trouvée', !!bloc);

  if (bloc) {
    const editions = [...bloc[1].matchAll(/edition:\s*'([^']+)'/g)].map(m => m[1]);
    verifier('★ un seul recueil en ligne', editions, ['fra-nawawi']);
    faux('★ aucun hadith qudsi en ligne — ils ne sont pas relus',
      editions.some(e => /qudsi/.test(e)));
  }

  faux('★ plus aucune mention de qudsi dans le code', /qudsi/i.test(
    app.replace(/\/\*[\s\S]*?\*\//g, '')));   // hors commentaires explicatifs

  // La réserve hors connexion doit couvrir les 40 hadiths de an-Nawawi,
  // pour que l'appli montre la même chose avec ou sans réseau.
  const secours = app.match(/const HADITH_SECOURS = \[([\s\S]*?)\n\];/);
  vrai('la réserve hors connexion est trouvée', !!secours);
  if (secours) {
    const nb = (secours[1].match(/text:/g) || []).length;
    vrai(`★ la réserve contient au moins 40 hadiths (elle en a ${nb})`, nb >= 40);
  }
}


/* ═══════════════════════════════════════════════════════════
   10. Les pièges déjà payés cher — qu'ils ne reviennent jamais
   ═══════════════════════════════════════════════════════════ */
groupe('Les pièges déjà rencontrés');
{
  const css  = lire('styles.css');
  const html = lire('index.html');
  const sw   = lire('sw.js');
  const pub  = lire('publier.py');

  // Le bug qui a bloqué l'écran de bienvenue et créé 14 doublons
  vrai('★ la règle [hidden] { display:none !important } est toujours là',
    /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(css));

  // Tous les fichiers chargés par la page doivent exister,
  // être publiés, être estampillés et être gardés hors-ligne.
  const charges = [
    ...[...html.matchAll(/<script src="([^"?]+)"/g)].map(m => m[1]),
    ...[...html.matchAll(/<link rel="stylesheet" href="([^"?]+)"/g)].map(m => m[1])
  ];
  vrai('la page charge bien plusieurs fichiers', charges.length >= 4);

  verifier('tous les fichiers chargés existent sur le disque',
    charges.filter(f => !fs.existsSync(path.join(RACINE, f))), []);
  verifier('★ tous sont dans la liste de publication de publier.py',
    charges.filter(f => !pub.includes(`"${f}"`)), []);
  verifier('★ tous reçoivent un numéro de version',
    charges.filter(f => !new RegExp(`ESTAMPILLES[^\\]]*"${f.replace('.', '\\.')}"`, 's').test(pub)), []);
  verifier('★ tous sont gardés pour le mode hors-ligne',
    charges.filter(f => !sw.includes(`'./${f}'`)), []);

  // La page principale doit être cherchée sur le réseau d'abord,
  // sinon une mise à jour demande deux ouvertures pour apparaître.
  vrai('★ index.html est cherché sur le réseau avant la réserve',
    /req\.mode === 'navigate'/.test(sw));

  // La politique de confidentialité est exigée par le Play Store, et elle
  // doit porter une vraie adresse de contact. Une page publiée avec un
  // marqueur « à compléter » ferait refuser la fiche.
  const conf = lire('confidentialite.html');
  faux('★ la politique de confidentialité ne contient plus de marqueur à compléter',
    /A-COMPLETER|example\.com/.test(conf));
  vrai('★ la politique de confidentialité donne une adresse de contact',
    /href="mailto:[^"@\s]+@[^"@\s]+\.[a-z]{2,}"/.test(conf));
  vrai('★ elle est bien dans la liste de publication',
    pub.includes('"confidentialite.html"'));
  vrai('elle prévient que les textes ne sont pas relus',
    /pas encore\s+été\s+relus/.test(conf));

  // Plus aucun point nulle part
  const store = lire('store.js');
  const app   = lire('app.js');
  faux('la constante PTS a bien disparu de store.js', /\bPTS\b/.test(store));
  faux('aucun calcul de points ne subsiste',
    /points\s*:\s*taches\s*\*/.test(store));
  faux('l\'écran ne montre plus de compteur de points', /id="hero-points"/.test(html));
  faux('ni de carte de points', /id="st-points"/.test(html));
  vrai('la régularité l\'a remplacé dans l\'en-tête', /id="hero-regularite"/.test(html));
  vrai('app.js affiche bien la régularité', /hero-regularite/.test(app));
}


/* ═══════════════════════════════════════════════════════════
   11. La chaîne de fabrication de l'application Android
   ═══════════════════════════════════════════════════════════
   On modifie les fichiers à la racine, publier.py refabrique docs/,
   Capacitor recopie docs/ dans android/. Chaque maillon sauté se voit
   sur le téléphone sous la forme d'un bug déjà corrigé qui revient.
   ═══════════════════════════════════════════════════════════ */
groupe('La chaîne de fabrication de l\'appli');
{
  const pkg = JSON.parse(lire('package.json'));
  const cap = JSON.parse(lire('capacitor.config.json'));
  const s   = pkg.scripts || {};
  const tel = s.tel || '';

  vrai('npm run verif lance les vérifications', /node\s+tests\.js/.test(s.verif || ''));
  vrai('npm run site refabrique le dossier docs', /publier\.py/.test(s.site || ''));

  // ★ Le piège de l'étape 4 : oublier publier.py avant « cap sync » envoie
  //   l'ANCIENNE version sur le téléphone. On corrige un bug, rien ne change
  //   à l'écran, et on va chercher la cause ailleurs pendant une heure.
  vrai('★ npm run tel refabrique docs/ AVANT de synchroniser',
    tel.includes('publier.py') &&
    tel.indexOf('publier.py') < tel.indexOf('cap sync'));

  // ★ « npx cap run android » est cassé sous Windows : le CLI de Capacitor
  //   appelle « gradlew » au lieu de « gradlew.bat ». On construit et on
  //   installe nous-mêmes, ce qui donne exactement le même résultat.
  faux('★ npm run tel n\'utilise pas « cap run », cassé sous Windows',
    /cap\s+run/.test(tel));
  vrai('il construit l\'apk avec gradlew.bat', /gradlew\.bat/.test(tel));
  vrai('puis il le pose sur le téléphone', /adb\s+install/.test(tel));

  // Sans ce greffon, l'application retomberait sans bruit sur les minuteurs
  // du site web — et plus rien ne sonnerait application fermée.
  vrai('★ le greffon des vraies alarmes est bien installé',
    !!(pkg.dependencies || {})['@capacitor/local-notifications']);

  // Capacitor ne doit lire que le dossier que publier.py fabrique.
  verifier('★ l\'appli est fabriquée à partir de docs/', cap.webDir, 'docs');
  verifier('le nom de code de l\'appli est inchangé', cap.appId, 'com.mucahid.ibadah');

  // ★ Le navigateur range les données selon l'adresse sous laquelle tourne
  //   la page. Changer cette adresse ferait DISPARAÎTRE le carnet d'un coup.
  faux('★ aucun androidScheme dans capacitor.config.json',
    'androidScheme' in (cap.server || {}) || 'androidScheme' in (cap.android || {}));
  faux('★ aucun hostname dans capacitor.config.json',
    'hostname' in (cap.server || {}));
}


/* ═══════════════════════════════════════════════════════════
   12. Les rappels
   ═══════════════════════════════════════════════════════════
   Ce que ces vérifications peuvent dire : QUOI doit sonner, QUAND,
   avec quel numéro, et avec ou sans bruit.
   Ce qu'elles ne pourront jamais dire : si le téléphone sonne. Pour
   ça, il n'existe qu'une preuve — un téléphone posé sur une table,
   application fermée, qui sonne à 5 h 30 deux matins de suite.
   ═══════════════════════════════════════════════════════════ */
groupe('Les rappels : le numéro');
{
  const { Store } = chargerStore({ jour: JOUR });
  const R = chargerRappels(Store);

  // ★ Android n'accepte que des numéros tenant sur 32 bits, or nos
  //   identifiants d'intentions font 13 chiffres. Les passer tels quels
  //   ferait planter le greffon — ou pire, tronquerait le numéro en
  //   silence et deux rappels s'écraseraient l'un l'autre.
  const numeros = [];
  for (let i = 0; i < 400; i++) {
    numeros.push(R.numeroDeRappel(1755000000000 + i * 7919, '2026-08-12'));
  }
  const horsPlage = numeros.filter(n => !Number.isInteger(n) || n < 1 || n > 1073741824);
  verifier('★ aucun numéro ne sort de la plage 1 … 2³⁰',
    { combien: horsPlage.length, premier: horsPlage[0] === undefined ? null : horsPlage[0] },
    { combien: 0, premier: null });
  verifier('★ 400 numéros différents ne se marchent pas dessus',
    new Set(numeros).size, 400);

  // ★ Le même couple doit TOUJOURS donner le même numéro : sinon on ne
  //   peut plus annuler un rappel déjà posé, et les fantômes s'accumulent.
  verifier('★ le même couple donne toujours le même numéro',
    R.numeroDeRappel(1755000000000, '2026-08-12'),
    R.numeroDeRappel(1755000000000, '2026-08-12'));
  vrai('deux jours différents donnent deux numéros différents',
    R.numeroDeRappel(1755000000000, '2026-08-12') !==
    R.numeroDeRappel(1755000000000, '2026-08-13'));
  vrai('deux intentions différentes aussi',
    R.numeroDeRappel(1755000000000, '2026-08-12') !==
    R.numeroDeRappel(1755000000001, '2026-08-12'));
}

groupe('Les rappels : ce qui doit sonner');
{
  // 4 h du matin le jour simulé : le rappel de 5 h 30 est encore à venir.
  const QUATRE_H = new Date(2026, 7, 12, 4, 0, 0);
  const matin = () => chargerStore({
    jour: JOUR,
    sauvegarde: etatV3([tache({ id: 1, nom: 'Adhkar du matin', heure: '05:30' })])
  }).Store;

  {
    const Store = matin();
    const liste = chargerRappels(Store).listeDesRappels(QUATRE_H);
    verifier('une intention quotidienne est posée 14 jours d\'avance', liste.length, 14);
    verifier('chaque rappel porte un numéro unique',
      new Set(liste.map(r => r.id)).size, 14);
    verifier('le premier est celui d\'aujourd\'hui',
      rappel(liste, 0).quand.getDate(), 12);
    verifier('ils sont rangés du plus proche au plus lointain',
      liste.map(r => r.quand.getTime()).slice().sort((a, b) => a - b),
      liste.map(r => r.quand.getTime()));
    verifier('le texte du rappel est le nom de l\'intention',
      rappel(liste, 0).corps, 'Adhkar du matin');
  }

  // ★ LE bug qui a fait rater les deux essais du matin : « Silence la nuit »
  //   est allumé d'origine, et l'ancien code JETAIT le rappel de 5 h 30
  //   sans rien dire. Il doit maintenant être posé, simplement sans bruit.
  {
    const Store = matin();
    vrai('« Silence la nuit » est bien allumé d\'origine', Store.reglages().silenceNuit);
    const liste = chargerRappels(Store).listeDesRappels(QUATRE_H);
    verifier('★ le rappel de 5 h 30 n\'est PLUS jeté', liste.length, 14);
    vrai('★ il est simplement marqué « sans bruit »', rappel(liste, 0).nuit === true);
  }

  {
    const Store = matin();
    Store.reglerOption('silenceNuit', false);
    const liste = chargerRappels(Store).listeDesRappels(QUATRE_H);
    vrai('sans « Silence la nuit », le même rappel sonne', rappel(liste, 0).nuit === false);
  }

  {
    const Store = chargerStore({
      jour: JOUR,
      sauvegarde: etatV3([tache({ id: 1, nom: 'Sunna du midi', heure: '14:00' })])
    }).Store;
    const liste = chargerRappels(Store).listeDesRappels(QUATRE_H);
    vrai('un rappel de 14 h sonne, lui', rappel(liste, 0).nuit === false);
  }

  // La nuit va de 22 h à 6 h, bornes comprises du bon côté.
  {
    const R = chargerRappels(matin());
    vrai('22 h est déjà la nuit',   R.heureDeNuit(22));
    vrai('5 h est encore la nuit',  R.heureDeNuit(5));
    faux('6 h ne l\'est plus',      R.heureDeNuit(6));
    faux('21 h non plus',           R.heureDeNuit(21));
  }

  // ★ Recette d'acceptation n° 7 : une intention cochée le matin ne doit
  //   pas déclencher son rappel de l'après-midi.
  {
    const Store = chargerStore({
      jour: JOUR,
      sauvegarde: etatV3(
        [tache({ id: 1, nom: 'Adhkar du soir', heure: '18:00' })],
        { [JOUR]: { taches: [1], prieres: [], sous: [] } })
    }).Store;
    const liste = chargerRappels(Store).listeDesRappels(QUATRE_H);
    verifier('★ déjà accomplie : aucun rappel aujourd\'hui', liste.length, 13);
    verifier('mais elle revient dès demain', rappel(liste, 0).quand.getDate(), 13);
  }

  {
    const Store = matin();
    const liste = chargerRappels(Store).listeDesRappels(new Date(2026, 7, 12, 9, 0, 0));
    verifier('une heure déjà passée ne fabrique pas de rappel', liste.length, 13);
  }

  {
    const Store = chargerStore({
      jour: JOUR, sauvegarde: etatV3([tache({ id: 1, heure: '' })])
    }).Store;
    verifier('une intention sans heure ne fabrique aucun rappel',
      chargerRappels(Store).listeDesRappels(QUATRE_H).length, 0);
  }

  // ★ « Une seule fois » reste affichée tant qu'elle n'est pas faite : la
  //   rappeler 14 matins de suite serait du harcèlement.
  {
    const Store = chargerStore({
      jour: JOUR,
      sauvegarde: etatV3([tache({ id: 1, frequence: 'once', heure: '10:00' })])
    }).Store;
    verifier('★ « une seule fois » ne se rappelle qu\'aujourd\'hui',
      chargerRappels(Store).listeDesRappels(QUATRE_H).length, 1);
  }

  {
    const Store = chargerStore({
      jour: JOUR,
      sauvegarde: etatV3([tache({ id: 1, frequence: 'weekly', jourSemaine: 3, heure: '10:00' })])
    }).Store;
    verifier('une intention hebdomadaire donne 2 rappels en 14 jours',
      chargerRappels(Store).listeDesRappels(QUATRE_H).length, 2);
  }

  {
    const Store = chargerStore({ jour: JOUR, sauvegarde: etatV3([]) }).Store;
    verifier('un carnet vide ne fabrique aucun rappel',
      chargerRappels(Store).listeDesRappels(QUATRE_H).length, 0);
  }
}

groupe('Les rappels : les promesses tenues');
{
  const html = lire('index.html');
  const rap  = lire('rappels.js');
  const manifeste = lire('android/app/src/main/AndroidManifest.xml');

  // ★ Le texte des Réglages promettait « aucun rappel entre 22h et 6h ».
  //   C'est justement ce qu'on ne fait plus : il s'affiche, sans son.
  faux('★ les Réglages ne promettent plus « aucun rappel » la nuit',
    /id="quiet-help">\s*Aucun rappel/.test(html));
  vrai('ils annoncent un rappel sans son',
    /id="quiet-help">[^<]*sans son/.test(html));
  vrai('la feuille prévient avant de choisir une heure de nuit',
    /id="f-time-nuit"/.test(html));

  // ★ Google réserve USE_EXACT_ALARM aux réveils et aux agendas : la
  //   demander est un motif de refus au Play Store. On utilise
  //   SCHEDULE_EXACT_ALARM, que le greffon déclare tout seul.
  faux('★ USE_EXACT_ALARM n\'est demandée nulle part',
    /USE_EXACT_ALARM/.test(manifeste) || /USE_EXACT_ALARM/.test(rap));

  // Deux canaux Android, parce qu'un canal ne se modifie plus une fois créé.
  vrai('il y a bien un canal de jour et un canal de nuit',
    /CANAL_JOUR\s*=\s*'[^']+'/.test(rap) && /CANAL_NUIT\s*=\s*'[^']+'/.test(rap));

  // ★ Sans allowWhileIdle, Android garde le rappel pour plus tard quand le
  //   téléphone dort — c'est-à-dire exactement à 5 h 30 du matin.
  vrai('★ les alarmes réveillent le téléphone en veille profonde',
    /allowWhileIdle:\s*true/.test(rap));

  // ★ Une alarme « qui se répète » sonnerait aussi les jours déjà cochés,
  //   sans qu'on puisse annuler une seule occurrence.
  faux('★ aucune alarme répétitive : on repose la liste entière',
    /repeats:\s*true|every:\s*'/.test(rap));

  vrai('les rappels restent dans rappels.js, sans nouveau fichier',
    [...html.matchAll(/<script src="([^"?]+)"/g)].map(m => m[1]).length === 5);
}


/* ═══════════════════════════════════════════════════════════
   13. Les trois filets — ne plus jamais rien perdre
   ═══════════════════════════════════════════════════════════
   Le carnet doit tomber à travers TROIS filets pour disparaître.
   Ces vérifications regardent que les trois sont bien tendus, et
   surtout qu'aucun ne se retourne contre son propriétaire.
   ═══════════════════════════════════════════════════════════ */
groupe('Les trois filets');
{
  const app   = lire('app.js');
  const store = lire('store.js');
  const d     = JSON.parse(lire('package.json')).dependencies || {};

  /* ─── Filet 1 : le double ─── */
  vrai('le rangement hors du navigateur est installé', !!d['@capacitor/preferences']);
  vrai('le double y est bien écrit',
    /Preferences[\s\S]{0,600}?CLE_DOUBLE/.test(app));
  vrai('★ un carnet vide alors qu\'un double existe est récupéré tout seul',
    /function recupererDouble[\s\S]*?Store\.importer\(contenu\)/.test(app));

  // ★ Le retournement à ne jamais laisser passer : on dit oui à « tout
  //   effacer », et le carnet revient tout seul à la réouverture.
  const efface = app.match(/#btn-clear'\)\.addEventListener[\s\S]*?\n\}\);/);
  vrai('★ « tout effacer » emporte AUSSI le double',
    !!efface && /remove\(\{\s*key:\s*CLE_DOUBLE/.test(efface[0]));

  // Quand Android ferme l'appli sans prévenir, le délai d'attente ne
  // serait jamais atteint : le départ doit écrire tout de suite.
  vrai('★ le double est écrit sans délai quand l\'appli s\'en va',
    /document\.hidden\)\s*sauverDouble\(true\)/.test(app));

  /* ─── Filet 2 : une sauvegarde par jour, en fichier ─── */
  vrai('les greffons fichier et partage sont installés',
    !!d['@capacitor/filesystem'] && !!d['@capacitor/share']);
  vrai('★ la copie du jour va dans Documents — elle survit à la désinstallation',
    /directory:\s*'DOCUMENTS'/.test(app));
  verifier('on garde une semaine de copies',
    (app.match(/COPIES_GARDEES\s*=\s*(\d+)/) || [])[1], '7');

  // ★ L'ordre compte : récupérer d'abord, écrire ensuite. À l'envers, on
  //   écraserait la bonne copie du jour par un carnet encore vide.
  vrai('★ on récupère AVANT d\'écrire la copie du jour',
    app.indexOf('await recupererDouble()') > -1 &&
    app.indexOf('await recupererDouble()') < app.indexOf('await sauvegardeDuJour()'));

  /* ─── Le bouton qui ne faisait rien ─── */
  // ★ Dans l'application, un lien « download » n'ouvre aucun gestionnaire
  //   de téléchargement : le bouton restait muet, et on croyait avoir
  //   une sauvegarde alors qu'on n'avait rien.
  vrai('★ « Sauvegarder » ne compte plus sur le seul lien de téléchargement',
    /greffonNatif\('Share'\)[\s\S]{0,120}?sauvegarderDansLAppli/.test(app));
  vrai('et le site garde son téléchargement, qui marche',
    /lien\.download = nomDeSauvegarde/.test(app));

  /* ─── store.js doit rester lisible sans navigateur ───
     ★ Une seule mention non protégée de window ou Capacitor dans
     store.js, et toutes les vérifications ci-dessus s'effondrent d'un
     coup : elles le chargent dans une boîte où rien de tout cela
     n'existe. C'est pour ça que ce code vit dans app.js. */
  faux('★ store.js ne mentionne ni window, ni Capacitor, ni document',
    /\bwindow\b|Capacitor|\bdocument\b/.test(store));
}


/* ═══════════════════════════════════════════════════════════
   Le verdict
   ═══════════════════════════════════════════════════════════ */

const total = reussis + echecs.length;
console.log('');
console.log('═'.repeat(62));

if (!echecs.length) {
  console.log(`  ✅  Les ${total} vérifications passent.`);
  console.log('═'.repeat(62));
  console.log('');
  process.exit(0);
}

console.log(`  ❌  ${echecs.length} vérification(s) en échec sur ${total}.`);
console.log('═'.repeat(62));

let dernierGroupe = null;
echecs.forEach(e => {
  if (e.groupe !== dernierGroupe) {
    console.log('\n  ' + e.groupe);
    dernierGroupe = e.groupe;
  }
  console.log(`    • ${e.nom}`);
  console.log(`        attendu : ${e.attendu}`);
  console.log(`        obtenu  : ${e.obtenu}`);
});

console.log('');
console.log('  Si tu as changé une règle exprès, c\'est le test qu\'il faut');
console.log('  mettre à jour, pas forcément le code.');
console.log('');
process.exit(1);
