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
  verifier('les réglages sont gardés', Store.reglages(),
    { notif: false, sombre: true, silenceNuit: false });
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
