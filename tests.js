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

/* Depuis le 22 août 2026, store.js demande ses mots à textes.js
   (T('freq.daily')…). Il ne peut donc plus être chargé tout seul :
   sans textes.js, il s'arrête sur « T is not defined ».

   On les charge ensemble, dans le même ordre que la vraie page.
   « navigator » est nécessaire : textes.js lit la langue du téléphone. */
function chargerStore(options) {
  const o = options || {};
  const nav = fauxNavigateur(o.sauvegarde, o.jour);
  const fauxNavigateurLangue = { language: o.langue || 'fr-FR', languages: [o.langue || 'fr-FR'] };
  const fabriquer = new Function(
    'localStorage', 'location', 'navigator',
    lire('textes.js') + '\n' + lire('store.js') + '\n;return Store;');
  return { Store: fabriquer(nav.localStorage, nav.location, fauxNavigateurLangue), nav };
}

/* Le même, mais en rendant aussi les outils de langue : les tests
   des traductions en ont besoin. */
function chargerTextes(langue) {
  const memoire = new Map();
  if (langue) memoire.set('ibadah-langue', langue);
  const faux = {
    getItem: c => (memoire.has(c) ? memoire.get(c) : null),
    setItem: (c, v) => memoire.set(c, String(v)),
    removeItem: c => memoire.delete(c)
  };
  return new Function('localStorage', 'navigator',
    lire('textes.js') +
    '\n;return { T, TEXTES, LANGUES, Langue, champDhikr, dhikrRelu, dhikrTraductionNonRelue };'
  )(faux, { language: 'fr-FR', languages: ['fr-FR'] });
}

function chargerAdhkar() {
  return new Function(lire('adhkar.js') +
    '\n;return { ADHKAR, ADHKAR_CATEGORIES };')();
}

/* Les mots de l'application, chargés une fois pour toutes.
   Beaucoup de vérifications parlent d'une phrase précise : depuis que
   les phrases vivent dans textes.js, c'est ici qu'elles se lisent. */
const MOTS = chargerTextes();

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
  // rappels.js demande lui aussi ses mots à textes.js : on le charge avant,
  // exactement comme le fait index.html.
  const fabriquer = new Function(
    'Store', 'toast', 'estNatif', 'Capacitor', 'document', 'window', 'navigator', 'localStorage',
    lire('textes.js') + '\n' + lire('rappels.js') + '\n;return Rappels;');
  const memoire = new Map();
  return fabriquer(
    Store, function () {}, function () { return false; },
    undefined, undefined, undefined,
    { language: 'fr-FR', languages: ['fr-FR'] },
    { getItem: c => (memoire.has(c) ? memoire.get(c) : null),
      setItem: (c, v) => memoire.set(c, String(v)),
      removeItem: c => memoire.delete(c) });
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

    /* ★ 21 août 2026 : les 26 invocations de ce fichier ont été relues et
       validées — texte arabe, traduction, source, répétitions, moment — et
       rendues SANS aucune correction. Ce test n'est pas décoratif : si l'une
       d'elles repassait un jour à « verifie: false » par accident, le bandeau
       reviendrait sur des textes relus et ferait douter de tout le reste.
       ⚠️ Il ne vaut QUE pour ce fichier. Les dhikr venus de la feuille Google
       arrivent, eux, à « verifie: false », et c'est le garde-fou : voir le
       groupe « La feuille Google » plus bas, qui l'exige. */
    verifier('★ les 26 invocations du fichier sont relues et validées',
      ADHKAR.filter(d => !d.verifie).map(d => d.id), []);
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
    // ⚠️ On cherche `await demander(` et non `confirm(` : le confirm() du
    //   navigateur écrit CANCEL / OK en anglais dans l'application, sans
    //   moyen de traduire. Il a été remplacé par la question maison
    //   (groupe « Les questions en français », plus bas).
    const bloc = app.match(/#import-file'\)\.addEventListener[\s\S]*?\n\}\);/);
    vrai('★ restaurer demande confirmation', !!bloc && /await demander\(/.test(bloc[0]));

    const clear = app.match(/#btn-clear'\)\.addEventListener[\s\S]*?\n\}\);/);
    vrai('★ tout effacer demande confirmation', !!clear && /await demander\(/.test(clear[0]));
    vrai('et rappelle de sauvegarder d\'abord',
      !!clear && /T\('clear\.texte'/.test(clear[0])
      && /sauvegarde/.test(MOTS.TEXTES['clear.texte'].fr)
      && /backup/i.test(MOTS.TEXTES['clear.texte'].en));

    // ★ « Charger des données d'exemple » REMPLACE le carnet (store.js :
    //   chargerDemo fait `etat = vide()`). Il détruisait donc autant que
    //   « Tout effacer », juste en dessous, sans rien demander : le même
    //   piège, une ligne plus haut. Trouvé le 16 août 2026.
    const demo = app.match(/#btn-demo'\)\.addEventListener[\s\S]*?\n\}\);/);
    vrai('★ charger l\'exemple demande confirmation', !!demo && /await demander\(/.test(demo[0]));
    vrai('et rappelle de sauvegarder d\'abord',
      !!demo && /T\('demo\.texte'/.test(demo[0])
      && /sauvegarde/.test(MOTS.TEXTES['demo.texte'].fr)
      && /backup/i.test(MOTS.TEXTES['demo.texte'].en));
    // Sur un carnet vide il n'y a rien à perdre : demander serait un obstacle
    // posé devant la seule bonne façon de découvrir l'application.
    vrai('★ mais ne demande rien si le carnet est vide',
      !!demo && /if \(r\.intentions \|\| r\.joursNotes\)/.test(demo[0]));
    vrai('★ et chargerDemo remplace bien tout (ce qui justifie la question)',
      /function chargerDemo\(\)[\s\S]{0,200}?etat = vide\(\)/.test(lire('store.js')));

    // Le bouton de récupération existe, part caché, et demande avant de remplacer.
    vrai('le bouton « Récupérer » existe', /id="btn-recover"/.test(html));
    vrai('★ il est caché par défaut',
      /id="btn-recover"[\s\S]{0,120}?hidden/.test(html));
    vrai('★ il n\'apparaît que si un carnet est trouvé',
      /Store\.ancienCarnet\(\)[\s\S]{0,200}?#btn-recover'\)\.hidden = false/.test(app));
    const rec = app.match(/#btn-recover'\)\.addEventListener[\s\S]*?\n\}\);/);
    vrai('★ récupérer demande confirmation', !!rec && /await demander\(/.test(rec[0]));
  }
}


/* ═══════════════════════════════════════════════════════════
   9 bis. Les questions en français
   ───────────────────────────────────────────────────────────
   Les questions les plus dangereuses de l'application passaient par
   le confirm() du navigateur, qui écrit ses deux boutons CANCEL / OK
   EN ANGLAIS dans l'application Android — sans aucun moyen de les
   traduire. Pour une appli entièrement en français, c'est un défaut
   visible, et il tombe précisément là où il faut comprendre avant
   d'appuyer. Trouvé le 16 août 2026, corrigé le 17.
   ═══════════════════════════════════════════════════════════ */
groupe('Les questions en français');
{
  const app  = lire('app.js');
  const html = lire('index.html');
  const css  = lire('styles.css');

  // Le code seul : les commentaires, eux, ont le droit (et le devoir) de
  // parler de confirm() pour que le piège ne soit pas rouvert un jour.
  const sansCommentaires = txt => txt
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const code = sansCommentaires(app);

  // ★ Le cœur du groupe : plus une seule fenêtre du système, nulle part.
  faux('★ plus aucun confirm() du navigateur', /\bconfirm\(/.test(code));
  faux('★ plus aucun alert() du navigateur',   /\balert\(/.test(code));

  // La fenêtre maison, et ses deux boutons écrits en toutes lettres.
  vrai('la question existe dans la page',   /id="ask"/.test(html));
  vrai('★ elle part cachée',                /id="ask"[\s\S]{0,300}?hidden>/.test(html));
  vrai('elle a un fond qui l\'isole',       /id="ask-backdrop"/.test(html));
  vrai('★ le bouton d\'annulation est en français',
    /id="ask-no"[^>]*>Annuler</.test(html));
  vrai('★ le bouton d\'action est en français',
    /id="ask-yes"[^>]*>Continuer</.test(html));
  vrai('elle se présente comme une question au lecteur d\'écran',
    /id="ask"[\s\S]{0,200}?role="alertdialog"/.test(html));
  vrai('la fenêtre a son habillage', /^\.ask \{/m.test(css));

  // Les deux fonctions, et ce qu'elles promettent.
  vrai('★ « demander » rend une promesse',
    /function poserQuestion[\s\S]*?return new Promise\(resoudre/.test(app));
  vrai('« demander » propose deux issues',
    /function demander\([\s\S]{0,200}?annuler: T\('ask\.annuler'\)/.test(app)
    && MOTS.TEXTES['ask.annuler'].fr === 'Annuler'
    && !!MOTS.TEXTES['ask.annuler'].en);
  vrai('« prévenir » n\'en propose qu\'une',
    /function prevenir\([\s\S]{0,200}?annuler: ''/.test(app));

  // ★ Le retournement à ne jamais laisser passer : une question qu'on
  //   ferme sans répondre doit valoir NON. Si elle valait oui, fermer la
  //   fenêtre par mégarde effacerait le carnet.
  vrai('★ appuyer à côté vaut « non »',
    /#ask-backdrop'\)\.addEventListener\('click', \(\) => fermerQuestion\(false\)\)/.test(app));
  vrai('★ Échap vaut « non »',
    /questionOuverte\)\s*\{ fermerQuestion\(false\); return; \}/.test(app));
  // On isole la fonction : ailleurs dans le fichier, « #welcome-1 » ferait
  // croire à un bon ordre alors que la question serait passée en dernier.
  const retour = app.match(/function retourEnArriere\(\)[\s\S]*?\n\}/);
  vrai('la marche arrière d\'Android est trouvée', !!retour);
  vrai('★ le bouton Retour d\'Android vaut « non »',
    !!retour && /questionOuverte\)\s*\{ fermerQuestion\(false\); return true; \}/.test(retour[0]));
  vrai('★ et la question passe AVANT tout le reste',
    !!retour && retour[0].indexOf('questionOuverte') < retour[0].indexOf('#welcome'));

  // Le doigt se pose sur la sortie : une question dangereuse ne doit pas
  // pouvoir se valider par un appui distrait sur Entrée.
  vrai('★ le focus va sur « Annuler », pas sur l\'action',
    /\(annuler \? non : oui\)\.focus\(\)/.test(app));
  // Constaté dans le navigateur le 17 août : sans clic préalable, le focus
  // restait sur un bouton devenu invisible — un lecteur d'écran annonçait
  // alors un bouton qui n'était plus là.
  vrai('★ et il ne reste jamais sur un bouton devenu invisible',
    /function fermerQuestion[\s\S]*?contains\(document\.activeElement\)\) document\.activeElement\.blur\(\)/.test(app));

  // Le nom d'une intention ne doit jamais pouvoir devenir une balise.
  vrai('★ le texte de la question est écrit comme du texte, jamais du HTML',
    /function poserQuestion[\s\S]*?p\.textContent = bout/.test(app));
  faux('★ et jamais par innerHTML',
    /function poserQuestion[\s\S]*?innerHTML/.test(app.match(/function poserQuestion[\s\S]*?\n\}/)?.[0] || ''));

  // ★ aller('nom-inconnu') laissait l'application ENTIÈREMENT BLANCHE :
  //   tous les écrans cachés, aucun onglet allumé. C'est ce qui avait
  //   faussé un test le 16 août (on visait `progress`, qui n'existe pas).
  vrai('★ un écran inconnu ne blanchit plus l\'application',
    /function aller\(nom\)[\s\S]{0,400}?if \(!document\.getElementById\('screen-' \+ nom\)\) return;/.test(app));
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
    // Une édition par langue, déclarée dans EDITIONS juste au-dessus.
    const carte = app.match(/const EDITIONS = \{([^}]*)\}/);
    vrai('la carte des éditions par langue est trouvée', !!carte);
    const editions = carte
      ? [...carte[1].matchAll(/'([^']+)'/g)].map(m => m[1])
      : [];
    verifier('★ une édition par langue, et rien d\'autre',
      editions.sort(), ['eng-nawawi', 'fra-nawawi']);
    vrai('★ le recueil choisi vient bien de cette carte',
      /edition:\s*EDITIONS\[Langue\.choisie\(\)\]/.test(bloc[1]));
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

  // ★ Un trait de séparation flottait TOUT EN HAUT de l'encadré des rappels,
  //   sans rien à séparer. Vu sur le vrai téléphone le 16 août 2026 : la
  //   ligne « Sonner à l'heure exacte » disparaît une fois l'autorisation
  //   donnée, et l'ancienne règle (« pas de trait sur la première ligne »)
  //   comptait la ligne cachée comme première. Une ligne ne prend un trait
  //   que s'il existe une ligne VISIBLE avant elle.
  vrai('★ le trait de séparation ignore les lignes cachées',
    /\.list \.row:not\(\[hidden\]\)\s*~\s*\.row:not\(\[hidden\]\)\s*\{[^}]*border-top-color/.test(css));
  vrai('★ et plus rien ne se fie au rang de la première ligne',
    !/\.list \.row:first-child\s*\{[^}]*border-top/.test(css));
  // Le trait reste réservé même quand il ne se voit pas : sinon la première
  // ligne serait 1 pixel plus courte que les autres.
  vrai('la hauteur des lignes reste identique',
    /\.row\s*\{[^}]*border-top:\s*1px solid transparent/.test(css));

  // ★ Vu sur le vrai téléphone le 18 août 2026, en photo. « Écrire mon propre
  //   dhikr » s'ouvre DEPUIS la bibliothèque. La feuille était à l'étage 21,
  //   le panneau de la bibliothèque à l'étage 30, plein écran et fond opaque :
  //   la feuille s'ouvrait DERRIÈRE lui. Le curseur entrait dans le champ, le
  //   clavier montait, et on tapait à l'aveugle dans une fenêtre invisible.
  //   Rien à voir avec le clavier, contrairement à ce qu'on avait cru.
  const etage = (sel) => {
    const m = new RegExp('\\' + sel + '\\s*\\{[^}]*z-index:\\s*(\\d+)').exec(css);
    return m ? Number(m[1]) : null;
  };
  vrai('★ la feuille du dhikr perso passe DEVANT la bibliothèque',
    etage('#perso-sheet') > etage('.biblio'));
  vrai('et son voile aussi',
    etage('#perso-backdrop') > etage('.biblio'));
  // ⚠️ Elle ne doit pas monter trop haut non plus : la question qu'on lit
  //   avant d'effacer son carnet reste la dernière chose visible.
  vrai('★ mais elle reste sous la question',
    etage('#perso-sheet') < etage('.ask'));
  // ⚠️ Monter « .sheet » en entier ferait passer le toast (étage 30)
  //   derrière toutes les feuilles. Seule celle-ci bouge.
  vrai('★ les autres feuilles n\'ont pas bougé, le toast reste visible',
    etage('.sheet') < etage('.toast'));

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
  /* ★ 21 août 2026 : les 26 invocations ont été relues et validées, sans
     aucune correction. Les hadiths, eux, NE L'ONT PAS ÉTÉ — l'application va
     les chercher sur internet. Une politique qui dirait « rien n'est relu »
     serait devenue fausse ; une qui dirait « tout est relu » serait un
     mensonge. Elle doit dire lequel des deux est lequel. */
  vrai('★ elle dit que les invocations ont été relues et validées',
    /invocations[\s\S]{0,60}relues et\s+validées/.test(conf));
  vrai('★ et elle dit que les hadiths, eux, ne le sont pas',
    /hadiths, eux, n'ont pas été relus/.test(conf));
  vrai('★ et que tout texte ajouté ensuite porte un avertissement',
    /ajouté après cette date/.test(conf));

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

  /* ★ Vu sur le vrai téléphone le 19 août 2026, en photo : le bouton « + »
     se posait SUR l'onglet « Réglages », qu'on n'arrivait plus à toucher.
     Son seul repère était le bas du TÉLÉPHONE (88 pixels), alors que la
     barre d'onglets grandit avec la police du système et avec la barre de
     gestes d'Android : passé 88 pixels de haut, elle passait dessous.
     Depuis, l'écran est « position: relative » : le bas de l'écran, c'est
     le haut de la barre d'onglets, et le « + » ne peut plus la chevaucher
     quelle que soit sa hauteur. */
  vrai('★ l\'écran sert de plancher au bouton « + »',
    /\.screen \{[^}]*position: relative/.test(css));
  const basDuFab = Number((css.match(/\.fab \{[\s\S]*?bottom: (\d+)px/) || [])[1]);
  vrai(`★ et le « + » se pose juste au-dessus de la barre (${basDuFab}px)`,
    basDuFab > 0 && basDuFab <= 24);
  // Le vide laissé en bas de la liste doit rester plus grand que le
  // bouton, sinon la dernière intention se cache derrière lui.
  const vide = Number((css.match(/\.scroll__pad \{ height: (\d+)px/) || [])[1]);
  const hautFab = Number((css.match(/\.fab \{[\s\S]*?height: (\d+)px/) || [])[1]);
  vrai(`★ la dernière intention reste atteignable sous le « + »`,
    vide >= basDuFab + hautFab);

  /* ★ Vu sur le vrai téléphone le 19 août 2026 : les longs hadiths
     s'arrêtaient au milieu d'une phrase. Le texte était coupé à 900 signes
     AVANT d'être affiché — la suite n'existait plus nulle part, aucun
     bouton n'aurait pu la retrouver. */
  faux('★ le hadith n\'est plus coupé à 900 signes',
    /slice\(0, 900\)/.test(app));
  vrai('★ il se replie sous un bouton « Voir plus » au lieu d\'être amputé',
    html.includes('id="hadith-plus"') &&
    /is-replie/.test(app) && /\.hadith__text\.is-replie/.test(css));
  // ⚠️ Deviner le débordement à partir du nombre de caractères serait faux
  //    dès que la police du système est réglée en grand : on mesure.
  vrai('★ le repli se mesure, il ne se devine pas à la longueur du texte',
    /scrollHeight > texte\.clientHeight/.test(app));
  // ⚠️ Et un écran caché mesure zéro : la question doit être reposée
  //    au moment où l'onglet Hadith s'ouvre, sinon le bouton n'apparaît
  //    jamais au premier lancement.
  vrai('★ la mesure est refaite quand l\'onglet Hadith s\'ouvre',
    /nom === 'hadith'\)[\s\S]{0,40}replierLeHadith/.test(app));
  vrai('★ le cache jette les hadiths rangés à l\'ancienne forme',
    /VERSION_CACHE_HADITH/.test(app));
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
    /id="quiet-help"[^>]*>[^<]*sans son/.test(html)
    && /sans son/.test(MOTS.TEXTES['set.quiet.help'].fr)
    && /without sound/i.test(MOTS.TEXTES['set.quiet.help'].en));
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

  const scripts = [...html.matchAll(/<script src="([^"?]+)"/g)].map(m => m[1]);
  verifier('les rappels restent dans rappels.js, sans nouveau fichier',
    scripts,
    ['textes.js', 'store.js', 'adhkar.js', 'hadith-secours-en.js',
     'feuille.js', 'app.js', 'rappels.js']);
  vrai('★ textes.js est chargé en PREMIER — les autres lui demandent leurs mots',
    scripts[0] === 'textes.js');
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
    /greffonNatif\('Filesystem'\)[\s\S]{0,200}?sauvegarderDansLAppli/.test(app));
  vrai('et le site garde son téléchargement, qui marche',
    /lien\.download = nomDeSauvegarde/.test(app));

  /* ─── Le bouton qui envoyait au lieu de ranger ───
     ★ Vu sur le vrai téléphone le 19 août 2026, en photo : « Sauvegarder »
     ouvrait DIRECTEMENT le partage d'Android, qui propose d'abord des
     contacts et des messageries. Le bouton avait donc l'air de demander à
     qui ENVOYER son carnet — et il fallait deviner qu'on cherchait
     « Fichiers » au milieu des visages. Il doit d'abord RANGER. */
  {
    const corps = (app.match(/async function sauvegarderDansLAppli[\s\S]*?\n}/) || [''])[0];
    vrai('★ « Sauvegarder » range le fichier dans Documents/Ibadah',
      corps.includes('rangerDansDocuments') && corps.includes('DOSSIER_COPIES'));
    vrai('★ et il dit à l\'écran où il l\'a rangé',
      corps.includes('cheminLisible(uri)'));
    vrai('★ le partage ne vient qu\'APRÈS, et seulement si on le demande',
      corps.indexOf('rangerDansDocuments') < corps.indexOf('envoyerUneCopie(uri)') &&
      /if \(envoyer\) await envoyerUneCopie\(uri\)/.test(corps));
    // Si Documents refuse (cela dépend de la version d'Android), on ne
    // laisse pas quelqu'un repartir sans fichier.
    vrai('★ un secours existe si le dossier Documents refuse',
      corps.includes('rangerDansLeCache'));
    // ★ Le chemin annoncé est long et ne contient aucune espace : sans
    //   césure autorisée, il dépassait de la fenêtre et on ne lisait plus
    //   la fin — c'est-à-dire le nom du fichier qu'on cherche.
    vrai('★ un long chemin de fichier tient dans la fenêtre',
      /\.ask__text \{[^}]*overflow-wrap: anywhere/.test(lire('styles.css')));
  }

  /* ─── Ce que le filet 2 oblige à dire ───
     ★ « Désinstaller : tout part avec elle » est devenu FAUX le jour où
     les copies quotidiennes sont allées dans Documents — elles y restent,
     c'est tout leur intérêt. Une politique de confidentialité qui se
     trompe là-dessus, ce n'est pas un détail : c'est une promesse non
     tenue à quelqu'un qui voulait effacer ses données, et une réponse
     fausse au formulaire du Play Store. */
  {
    const conf = lire('confidentialite.html');
    faux('★ la politique ne promet plus que désinstaller efface TOUT',
      /désinstaller l'application : tout part avec elle/.test(conf));
    vrai('★ elle dit où sont les copies qui survivent',
      /Documents\/Ibadah/.test(conf) && /ne partent pas/.test(conf));
    vrai('★ et elle explique comment les effacer aussi',
      /supprime le dossier/.test(conf));
    vrai('elle signale la copie que Google peut garder',
      /compte Google/.test(conf));
  }

  /* ─── store.js doit rester lisible sans navigateur ───
     ★ Une seule mention non protégée de window ou Capacitor dans
     store.js, et toutes les vérifications ci-dessus s'effondrent d'un
     coup : elles le chargent dans une boîte où rien de tout cela
     n'existe. C'est pour ça que ce code vit dans app.js. */
  faux('★ store.js ne mentionne ni window, ni Capacitor, ni document',
    /\bwindow\b|Capacitor|\bdocument\b/.test(store));
}


/* ═══════════════════════════════════════════════════════════
   14. Ce qui casse au passage en application
   ═══════════════════════════════════════════════════════════
   Sept habitudes d'Android, invisibles sur un ordinateur, évidentes
   au premier lancement sur un téléphone.
   ═══════════════════════════════════════════════════════════ */
groupe('Le passage en application');
{
  const app       = lire('app.js');
  const css       = lire('styles.css');
  const html      = lire('index.html');
  const manifeste = lire('android/app/src/main/AndroidManifest.xml');
  const d         = JSON.parse(lire('package.json')).dependencies || {};

  /* ─── Le bouton Retour ─── */
  vrai('le greffon de l\'application est installé', !!d['@capacitor/app']);
  vrai('★ le bouton Retour est écouté', /addListener\('backButton'/.test(app));

  // ★ Il doit fermer ce qui est ouvert, dans le MÊME ordre que la touche
  //   Échap. Un ordre différent fermerait la mauvaise chose : on annule la
  //   bibliothèque et c'est la feuille dessous qui se referme.
  const retour = app.match(/function retourEnArriere[\s\S]*?\n\}/);
  const echap  = app.match(/e\.key !== 'Escape'[\s\S]*?\n\}\);/);
  const ordreDe = txt => (txt ? [...txt[0].matchAll(/fermer(\w+)\(\)/g)].map(m => m[1]) : []);
  verifier('★ Retour ferme dans le même ordre que la touche Échap',
    ordreDe(retour), ordreDe(echap));

  vrai('★ Retour ne referme pas l\'écran de bienvenue par mégarde',
    /#welcome'\)\.hidden\)\s*return true/.test(app));
  vrai('à la racine, il ramène d\'abord à « Aujourd\'hui »',
    /aller\('today'\); return true/.test(app));
  vrai('★ et il faut DEUX appuis pour quitter', /exitApp\(\)/.test(app) &&
    /T\('toast\.quitter'\)/.test(app) &&
    /Appuie encore/.test(MOTS.TEXTES['toast.quitter'].fr) &&
    !!MOTS.TEXTES['toast.quitter'].en);

  /* ─── La barre d'état ─── */
  vrai('le greffon de la barre d\'état est installé', !!d['@capacitor/status-bar']);

  // ★ Android dessine la page SOUS l'horloge : sans réserve en haut, le
  //   titre passe dessous. « env() » reste à 0 sur beaucoup de téléphones,
  //   d'où la hauteur demandée au greffon.
  vrai('★ l\'en-tête réserve la place de la barre d\'état',
    /\.topbar\s*\{[\s\S]{0,200}?padding:\s*calc\(22px \+ var\(--haut-barre\)\)/.test(css));
  vrai('la valeur de repli existe pour le site',
    /--haut-barre:\s*env\(safe-area-inset-top/.test(css));
  vrai('★ et la vraie hauteur est demandée au téléphone',
    /getInfo\(\)[\s\S]{0,300}?--haut-barre/.test(app));
  vrai('l\'écriture de la barre suit le thème',
    /sombre \? 'DARK' : 'LIGHT'/.test(app));

  /* ─── Le clavier ─── */
  vrai('le greffon du clavier est installé', !!d['@capacitor/keyboard']);
  vrai('★ la barre d\'onglets s\'efface quand le clavier monte',
    /keyboardWillShow/.test(app) &&
    /body\.clavier-ouvert \.tabbar\s*\{\s*display:\s*none/.test(css));

  /* ─── La feuille cachée par le clavier ─── */
  // ★ Trouvé le 18 août 2026 par Mucahid, le doigt sur l'écran, la veille de
  //   l'envoi. Les feuilles sont en « bottom: 0 » ; sur Android 15+ le clavier
  //   passe PAR-DESSUS la page au lieu de la rétrécir. La feuille « écrire mon
  //   propre dhikr » est courte : elle disparaissait en entier, et on tapait
  //   sans rien voir. 398 vérifications vertes n'y pouvaient rien — il n'y a
  //   pas de clavier tactile dans un navigateur d'ordinateur.
  vrai('★ la feuille se pose SUR le clavier, pas dessous',
    /\.sheet\s*\{[\s\S]{0,260}?bottom:\s*var\(--clavier\)/.test(css));
  vrai('★ et elle ne déborde pas par le haut pour autant',
    /\.sheet\s*\{[\s\S]{0,400}?max-height:\s*calc\(92% - var\(--clavier\)\)/.test(css));
  vrai('--clavier vaut 0 tant qu\'aucun clavier n\'est ouvert',
    /--clavier:\s*0px/.test(css));
  vrai('★ la hauteur cachée est mesurée, pas devinée',
    /visualViewport/.test(app) &&
    /innerHeight - vue\.height - vue\.offsetTop/.test(app) &&
    /setProperty\(\s*\n?\s*'--clavier'/.test(app));
  // ★ Appelée avec appliquerTheme, PAS dans seMettreAuFormatAppli() : celle-ci
  //   sort tout de suite hors application, et le site aurait gardé le bug.
  vrai('★ la mesure vaut aussi pour le site, pas seulement l\'application',
    /appliquerTheme\([\s\S]{0,400}?suivreLeClavier\(\);/.test(app)
    && !/seMettreAuFormatAppli\(\)[\s\S]{0,400}?suivreLeClavier\(\);/.test(app));
  // ★ Le navigateur sait faire le travail seul depuis Chrome 108 ; la mesure
  //   ci-dessus n'est que le filet pour les autres.
  vrai('★ le navigateur est prié de rétrécir la page de lui-même',
    /content="[^"]*interactive-widget=resizes-content/.test(html));

  /* ─── L'orientation ─── */
  // ★ Capacitor IGNORE l'orientation du manifest.webmanifest : elle ne
  //   vaut que pour le site. Seul le manifeste Android décide.
  vrai('★ l\'application est bloquée en portrait',
    /android:screenOrientation="portrait"/.test(manifeste));

  /* ─── Le jour qui change pendant la nuit ─── */
  // ★ Laissée ouverte toute la nuit, l'appli affiche encore hier : les
  //   intentions cochées la veille paraissent cochées aujourd'hui.
  vrai('★ un changement de jour repart à neuf',
    /Store\.aujourdhui\(\) === JOUR\) return;[\s\S]{0,80}?location\.reload\(\)/.test(app));

  /* ─── Les alarmes après une mise à jour ─── */
  // ★ Android efface les alarmes quand on remplace l'application. Le
  //   greffon sait les remettre après un redémarrage, mais il n'écoute
  //   pas la mise à jour : un testeur qui reçoit une correction n'aurait
  //   plus aucun rappel jusqu'à sa prochaine ouverture.
  vrai('★ les alarmes sont remises après une mise à jour',
    /LocalNotificationRestoreReceiver[\s\S]{0,240}?MY_PACKAGE_REPLACED/.test(manifeste));
}


/* ═══════════════════════════════════════════════════════════
   15. Nous écrire
   ═══════════════════════════════════════════════════════════ */
groupe('Nous écrire');
{
  const app  = lire('app.js');
  const html = lire('index.html');
  const conf = lire('confidentialite.html');

  vrai('le bouton existe et il est branché',
    /id="btn-contact"/.test(html) && /#btn-contact'\)\.addEventListener/.test(app));

  // ★ Deux adresses qui se contredisent, c'est un message qui se perd.
  const dansApp  = (app.match(/ADRESSE_CONTACT = '([^']+)'/)  || [])[1];
  const dansConf = (conf.match(/href="mailto:([^"]+)"/)       || [])[1];
  verifier('★ l\'adresse est la même que dans la politique de confidentialité',
    dansApp, dansConf);

  // Ce qui rend un rapport exploitable : sans ça, on cherche des heures
  // un défaut qui n'existe que sur un modèle de téléphone.
  const message = app.match(/function messageDeContact[\s\S]*?\n\}/);
  vrai('★ le message porte la version, l\'appareil et l\'écran',
    !!message && /versionPublieee\(\)/.test(message[0])
              && /modeleDuTelephone\(\)/.test(message[0])
              && /ecranAffiche\(\)/.test(message[0]));

  // ★ Ce message part chez quelqu'un. Le carnet ne doit JAMAIS y entrer,
  //   ni par une sauvegarde, ni par une liste d'intentions.
  faux('★ et il n\'emporte RIEN du carnet',
    !!message && /Store\.exporter|texteDeSauvegarde|tachesDuJour|journal/.test(message[0]));

  // La version est relue là où publier.py l'a collée : en tenir une
  // seconde à la main finirait par la contredire.
  vrai('★ la version est relue sur le fichier, pas recopiée à la main',
    /script\[src\*="app\.js"\]/.test(app) &&
    /getAttribute\('src'\)\.match/.test(app));

  // ★ Si aucune application de courrier n'existe, le bouton ne fait rien —
  //   exactement le piège de « Sauvegarder ». L'adresse doit rester lisible.
  vrai('★ l\'adresse s\'affiche sous le bouton, au cas où rien ne s\'ouvre',
    /#contact-help'\)\.textContent = ADRESSE_CONTACT/.test(app));

  vrai('l\'écran annonce ce que le message emporte',
    /Rien de ton carnet n'est joint/.test(html));
}


/* ═══════════════════════════════════════════════════════════
   16. L'icône et ses images sources
   ═══════════════════════════════════════════════════════════ */
groupe('L\'icône');
{
  const dans = (...bouts) => path.join(RACINE, ...bouts);

  // ★ Les cinq images sont arrivées dans node_modules/@capacitor/assets/files.
  //   C'est l'endroit le plus dangereux du projet : il est exclu du dépôt, et
  //   un simple « npm install » le vide. Le travail d'un dessinateur y aurait
  //   disparu sans un bruit, sans même une ligne dans git pour le dire.
  const sources = ['icon-only.png', 'icon-foreground.png', 'icon-background.png',
                   'splash.png', 'splash-dark.png'];
  verifier('★ les cinq images sources sont dans le dépôt, pas dans node_modules',
    sources.filter(n => !fs.existsSync(dans('assets', n))), []);

  faux('★ et le dossier assets/ n\'est pas exclu du dépôt',
    /^\s*\/?assets\/?\s*$/m.test(lire('.gitignore')));

  vrai('le script qui les dessine est gardé avec elles',
    fs.existsSync(dans('assets', '_generate.py')));

  // Le script écrivait vers le dossier de la machine où il a été écrit :
  // le relancer ici n'aurait rien produit d'utile.
  faux('★ et il écrit à côté de lui, pas sur une autre machine',
    /\/mnt\/user-data/.test(lire('assets/_generate.py')));

  // ★ Les icônes du site étaient des aplats de 823 et 2 836 octets fabriqués
  //   par script — floues dès qu'on les agrandit. C'est un plancher, pas une
  //   mesure : il attrape un retour en arrière vers une source fabriquée.
  vrai('★ les icônes du site viennent de la vraie source, plus d\'un aplat',
    fs.statSync(dans('icons', 'icon-192.png')).size > 3000 &&
    fs.statSync(dans('icons', 'icon-512.png')).size > 8000);

  // Le manifeste réutilise le 512 pour l'entrée « maskable ». C'est bon
  // uniquement parce que le motif tient dans les 80 % du centre — mesuré.
  const man = JSON.parse(lire('manifest.webmanifest'));
  vrai('le manifeste déclare bien une icône « maskable »',
    (man.icons || []).some(i => i.purpose === 'maskable'));

  /* ─── Les deux images de la fiche du Play Store ───────────────────────
     Elles ne servent pas dans l'appli : elles se déposent une fois dans le
     formulaire du Play Console. Une taille fausse s'y voit tout de suite —
     le formulaire refuse le fichier, sans toujours dire pourquoi. */
  function tailleDuPng(chemin) {
    const o = fs.readFileSync(chemin);
    return { large: o.readUInt32BE(16), haut: o.readUInt32BE(20) };
  }

  verifier('★ l\'icône de la fiche fait exactement 512 × 512',
    tailleDuPng(dans('assets', 'play-store-icone.png')), { large: 512, haut: 512 });
  verifier('le bandeau de la fiche fait exactement 1024 × 500',
    tailleDuPng(dans('assets', 'play-store-bandeau.png')), { large: 1024, haut: 500 });

  // Le Play Store n'accepte pas une icône de plus d'un mégaoctet.
  vrai('l\'icône de la fiche tient sous le mégaoctet',
    fs.statSync(dans('assets', 'play-store-icone.png')).size < 1024 * 1024);

  // Comme pour le bandeau : le script qui la fabrique reste à côté d'elle,
  // sinon personne ne saura la refaire le jour où le motif changera.
  const scriptIcone = dans('assets', '_icone-store.ps1');
  vrai('le script qui fabrique l\'icône de la fiche est gardé avec elle',
    fs.existsSync(scriptIcone));

  // ⚠️ On lit le script SEULEMENT s'il existe. Sans cette précaution, un
  //    fichier disparu ne rendait pas la vérification rouge : il faisait
  //    exploser tests.js, emportant avec lui toutes les vérifications
  //    suivantes — on ne voyait plus rien du tout. Mesuré, pas supposé.

  // ★ Ce script repose le motif sur son fond au lieu de redessiner : c'est ce
  //   qui garantit que l'icône du téléphone, le bandeau et la fiche montrent
  //   exactement le même dessin.
  const script = fs.existsSync(scriptIcone) ? lire('assets/_icone-store.ps1') : '';
  vrai('★ l\'icône de la fiche vient du même dessin que celle du téléphone',
    /icon-foreground\.png/.test(script) && /icon-background\.png/.test(script));

  // ★ icon-background.png n'est pas tout à fait opaque (coins à alpha 220).
  //   Sans le fond plein posé dessous, l'icône partirait transparente — et
  //   la fiche du Play Store la refuse.
  vrai('★ et elle est posée sur un fond plein, sans transparence',
    /\$g\.Clear\(/.test(script));
}


/* ═══════════════════════════════════════════════════════════
   17. Les captures d'écran de la fiche du Play Store
   ═══════════════════════════════════════════════════════════
   Elles ne servent pas dans l'application : elles se déposent une fois
   dans le formulaire du Play Console, et elles restent publiques pour
   toujours. Une taille fausse est refusée par le formulaire, sans qu'il
   dise toujours pourquoi.
   ═══════════════════════════════════════════════════════════ */
groupe('Les captures de la fiche');
{
  const dossier = path.join(RACINE, 'assets', 'play-store-captures');
  const dedans = fs.existsSync(dossier) ? fs.readdirSync(dossier) : [];

  function tailleDuPng(nom) {
    const o = fs.readFileSync(path.join(dossier, nom));
    return { large: o.readUInt32BE(16), haut: o.readUInt32BE(20) };
  }

  // Celles qu'on dépose : « fiche-… ». Les autres sont les originaux bruts.
  const pretes = dedans.filter(n => /^fiche-.*\.png$/.test(n)).sort();
  const brutes = dedans.filter(n => /^\d-.*\.png$/.test(n)).sort();

  // Le Play Store en demande 2 au minimum et en accepte 8.
  vrai('★ il y a entre 4 et 8 captures prêtes à déposer',
    pretes.length >= 4 && pretes.length <= 8);

  // ★ L'écran du S24 fait 1080 × 2340, soit 2,17 — le Play Store n'accepte
  //   pas plus haut que 9:16. Une capture brute est refusée telle quelle.
  verifier('★ chaque capture fait exactement 1080 × 1920',
    pretes.filter(n => {
      const t = tailleDuPng(n);
      return t.large !== 1080 || t.haut !== 1920;
    }), []);

  verifier('aucune capture ne dépasse les 8 Mo du Play Store',
    pretes.filter(n => fs.statSync(path.join(dossier, n)).size > 8 * 1024 * 1024), []);

  // Les originaux du téléphone restent : sans eux, changer le cadrage
  // obligerait à refaire toute la manœuvre sur le téléphone — carnet
  // sauvegardé, données d'exemple, restauration.
  vrai('★ les captures brutes du téléphone sont gardées',
    brutes.length >= pretes.length);

  const chemin = path.join(RACINE, 'assets', '_captures-fiche.ps1');
  vrai('le script qui les met au format est gardé avec elles',
    fs.existsSync(chemin));

  // ⚠️ Lu seulement s'il existe : sinon un fichier disparu ferait exploser
  //    tests.js au lieu de virer au rouge, emportant la suite avec lui.
  const script = fs.existsSync(chemin) ? lire('assets/_captures-fiche.ps1') : '';

  // ★ Le piège payé en écrivant ce script : sans [double], PowerShell fait
  //   de 1080/1080 un ENTIER, [math]::Min choisit sa version entière,
  //   arrondit 0,86 à 1 — et l'image déborde de 150 points en haut et en
  //   bas. La barre d'état et la barre d'onglets sont coupées, en silence.
  vrai('★ le calcul d\'échelle est fait en nombres à virgule',
    /\[double\]1080/.test(script) && /\[double\]1920/.test(script));

  // ★ Et l'autre piège du même script : -Filter ne comprend pas [0-9].
  //   Un filtre qui n'attrape rien ne se plaint pas, il ne fait rien.
  faux('★ le tri des fichiers ne passe pas par un -Filter en [0-9]',
    /-Filter\s+'\[0-9\]/.test(script));
}


/* ═══════════════════════════════════════════════════════════
   18. La signature de la version envoyée à Google
   ═══════════════════════════════════════════════════════════
   Le trousseau de signature est la seule chose de ce projet qui ne se
   refabrique pas. Le perdre, c'est perdre le droit de mettre l'appli à
   jour — pour tous les testeurs, définitivement. Le laisser partir sur
   un dépôt PUBLIC, c'est pire : n'importe qui pourrait signer à sa place.

   Ces vérifications ne prouvent pas que la clé existe (elle vit hors du
   dépôt, exprès). Elles surveillent les trois façons de la perdre.
   ═══════════════════════════════════════════════════════════ */
groupe('La signature');
{
  const gitignore = lire('.gitignore');
  const gradle    = lire('android/app/build.gradle');
  const modele    = lire('android/keystore.properties.exemple');
  const envoi     = (JSON.parse(lire('package.json')).scripts || {}).envoi || '';

  // ★ Les trois lignes qui empêchent le trousseau et son mot de passe de
  //   partir sur GitHub. Le dépôt est public : une seule effacée suffit.
  vrai('★ le trousseau .jks ne peut pas partir sur GitHub',
    /^\*\.jks\s*$/m.test(gitignore));
  vrai('l\'autre format de trousseau non plus',
    /^\*\.keystore\s*$/m.test(gitignore));
  vrai('★ ni le fichier qui porte le mot de passe',
    /^keystore\.properties\s*$/m.test(gitignore));

  // ★ Et le trousseau ne doit pas non plus DORMIR dans le dossier du projet :
  //   .gitignore le protège aujourd'hui, mais sa place est ailleurs, en trois
  //   copies. Un fichier qu'on ne peut pas refabriquer n'a rien à faire dans
  //   un dossier qu'on publie.
  const trousseaux = [];
  (function fouiller(dossier) {
    for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
      if (['node_modules', '.git', 'build', '.gradle'].includes(e.name)) continue;
      const chemin = path.join(dossier, e.name);
      if (e.isDirectory()) fouiller(chemin);
      else if (/\.(jks|keystore|p12)$/i.test(e.name)) {
        trousseaux.push(path.relative(RACINE, chemin));
      }
    }
  })(RACINE);
  verifier('★ aucun trousseau ne dort dans le dossier du projet', trousseaux, []);

  // ★ Le mot de passe ne doit jamais être écrit dans un fichier suivi par git.
  //   Gradle va le chercher dans un fichier à part, qui reste sur l'ordinateur.
  faux('★ aucun mot de passe écrit en clair dans build.gradle',
    /(storePassword|keyPassword)\s*=?\s+["']/.test(gradle));
  vrai('build.gradle lit la clé dans un fichier gardé à part',
    /keystore\.properties/.test(gradle));

  // Un fichier de clés à moitié rempli donnerait « mot de passe incorrect » —
  // on cherche alors la clé, le trousseau, l'alias… tout sauf la bonne cause.
  vrai('★ un fichier de clés pas encore rempli est dit en français',
    /A-REMPLIR/.test(gradle));

  // ★ On isole le bloc « release » avant de chercher dedans. Chercher
  //   « signingConfig » dans TOUT le fichier passerait au vert même si la
  //   ligne avait été retirée du bon endroit — c'est le genre de test qui
  //   rassure sans rien vérifier (déjà payé le 17 août).
  const blocRelease = (gradle.match(/release\s*\{[^}]*\}/g) || [])
    .find(b => /proguardFiles/.test(b)) || '(bloc release introuvable)';
  vrai('★ la version envoyée à Google est signée, pas laissée nue',
    /signingConfig/.test(blocRelease));

  // Google n'accepte plus de .apk pour une NOUVELLE application : il veut un
  // .aab, dont il tire lui-même l'apk adapté à chaque téléphone.
  vrai('★ npm run envoi fabrique un .aab, pas un .apk',
    /bundleRelease/.test(envoi));
  faux('et il ne fabrique pas un apk de release',
    /assembleRelease/.test(envoi));

  // Le même piège qu'à l'étape 4, en plus cher : sans publier.py, on enverrait
  // à Google l'ANCIENNE version du site — et on ne le verrait qu'après.
  vrai('★ npm run envoi refabrique docs/ AVANT de synchroniser',
    envoi.includes('publier.py') &&
    envoi.indexOf('publier.py') < envoi.indexOf('cap sync'));

  // Google refuse un numéro de version déjà vu. Ici on vérifie seulement
  // qu'il en existe un, entier — l'augmenter reste un geste réfléchi.
  const numero = Number((gradle.match(/versionCode\s+(\d+)/) || [])[1]);
  vrai('l\'application porte un numéro de version entier',
    Number.isInteger(numero) && numero >= 1);

  // ★ Le nom de version est celui que le testeur lira sur la fiche du Store.
  //   Il doit rester d'accord avec celui écrit dans l'application, sinon
  //   personne ne sait quelle version il a entre les mains.
  const nomAndroid = (gradle.match(/versionName\s+"([^"]+)"/) || [])[1];
  const nomAffiche = (lire('index.html').match(/version\s+(\d+\.\d+)/) || [])[1];
  verifier('★ le nom de version est celui affiché dans l\'appli',
    nomAndroid, nomAffiche);

  /* ⚠️ Depuis que l'appli est bilingue, index.html ne fait plus foi : au
     chargement, textes.js RÉÉCRIT ce paragraphe. On pouvait donc corriger
     index.html et build.gradle, voir ce test au vert, et malgré tout servir
     l'ancien numéro à l'écran — dans les deux langues. On regarde maintenant
     le fichier qui gagne, langue par langue. */
  const versionsAffichees = MOTS.LANGUES.map(l => {
    const t = MOTS.TEXTES['set.version.note'][l.code] || '';
    return l.code + ':' + ((t.match(/version\s+(\d+\.\d+)/) || [])[1] || 'ABSENTE');
  });
  verifier('★ et il l\'est dans CHAQUE langue (c\'est textes.js qui gagne)',
    versionsAffichees, MOTS.LANGUES.map(l => l.code + ':' + nomAndroid));

  // Le modèle, lui, est public : il ne doit contenir que des trous à remplir.
  vrai('le modèle de fichier de clés ne contient aucun vrai mot de passe',
    /storePassword=A-REMPLIR/.test(modele) && /keyPassword=A-REMPLIR/.test(modele));

  // ⚠️ Dans ce genre de fichier, la barre « \ » a un sens spécial : un chemin
  //    Windows écrit avec des « \ » serait mal lu, Gradle ne trouverait pas le
  //    trousseau, et le message d'erreur ne dirait pas ça.
  faux('★ et il montre le chemin avec des barres obliques',
    /storeFile=.*\\/.test(modele));
}


/* ═══════════════════════════════════════════════════════════
   Les langues — le 22 août 2026, l'application a appris l'anglais
   ═══════════════════════════════════════════════════════════
   Ces vérifications existent parce qu'une traduction se casse en
   silence : une phrase oubliée, et l'écran affiche un mot de code
   au milieu d'une page ; un trou {n} oublié, et c'est un nombre
   qui disparaît. Rien de tout cela ne fait planter l'application —
   donc rien ne le signale, sauf ici.
   ═══════════════════════════════════════════════════════════ */
{
  groupe('Les langues');

  const html    = lire('index.html');
  const app     = lire('app.js');
  const textes  = lire('textes.js');
  const CLES    = Object.keys(MOTS.TEXTES);
  const CODES   = MOTS.LANGUES.map(l => l.code);

  vrai('l\'application déclare au moins deux langues', CODES.length >= 2);
  vrai('le français est la langue de repli', MOTS.LANGUES[0].code === 'fr');
  vrai('il y a beaucoup de phrases à traduire', CLES.length > 300);

  /* ─── Aucune phrase manquante ─── */
  const sansTraduction = [];
  const vides = [];
  CLES.forEach(c => {
    CODES.forEach(code => {
      const v = MOTS.TEXTES[c][code];
      if (v === undefined) sansTraduction.push(c + ' (' + code + ')');
      else if (typeof v !== 'string' || v.trim() === '') vides.push(c + ' (' + code + ')');
    });
  });
  verifier('★ chaque phrase existe dans chaque langue', sansTraduction, []);
  verifier('★ aucune phrase vide', vides, []);

  /* ─── Les trous {n} doivent se correspondre ───
     Un trou présent en français et absent en anglais, c'est un nombre
     ou un nom qui disparaît de l'écran — sans la moindre erreur. */
  const trousDe = t => (String(t).match(/\{\w+\}/g) || []).sort().join(',');
  const trousDepareilles = CLES.filter(c => {
    const ref = trousDe(MOTS.TEXTES[c].fr);
    return CODES.some(code => trousDe(MOTS.TEXTES[c][code]) !== ref);
  });
  verifier('★ les trous {n} sont les mêmes dans toutes les langues', trousDepareilles, []);

  /* ─── Les marques de la page pointent sur de vraies phrases ─── */
  const marques = [...html.matchAll(/data-t(?:-html|-aria|-ph|-content)?="([^"]+)"/g)].map(m => m[1]);
  vrai('la page porte de nombreuses marques de traduction', marques.length > 120);
  verifier('★ chaque marque de la page a bien sa phrase',
    [...new Set(marques.filter(m => !MOTS.TEXTES[m]))], []);

  /* ─── Les appels T('…') du code pointent sur de vraies phrases ───
     On ne regarde que les clés écrites en toutes lettres : celles
     construites à la volée (T('cat.' + id)) ne se vérifient pas ici. */
  const appelees = new Set();
  ['app.js', 'store.js', 'rappels.js', 'feuille.js'].forEach(f => {
    for (const m of lire(f).matchAll(/\bT\('([^']+)'\)/g)) appelees.add(m[1]);
    for (const m of lire(f).matchAll(/\bT\('([^']+)',/g))  appelees.add(m[1]);
  });
  vrai('le code demande bien ses mots à textes.js', appelees.size > 80);
  verifier('★ chaque phrase demandée par le code existe',
    [...appelees].filter(c => !MOTS.TEXTES[c]).sort(), []);

  /* ─── Plus de français cousu dans la page ───
     Le piège de départ : une phrase laissée en dur dans index.html
     reste en français quoi qu'il arrive, et personne ne le voit tant
     qu'on ne lit pas la page en anglais. */
  const durs = (function () {
    /* On parcourt la page balise par balise en gardant la pile des
       éléments ouverts. Une phrase est couverte dès qu'UN de ses
       parents porte une marque — sinon le <b> à l'intérieur d'un
       paragraphe traduit passerait pour du français oublié. */
    const corps = html.slice(html.indexOf('<body'));
    const SEULES = /^(br|hr|img|input|meta|link|circle|path|rect|use|source)$/i;
    const pile = [];
    const trouves = [];
    let i = 0;

    while (i < corps.length) {
      const ouvre = corps.indexOf('<', i);

      // Le texte qui précède la prochaine balise.
      const texte = corps.slice(i, ouvre === -1 ? corps.length : ouvre)
        .replace(/\s+/g, ' ').trim();
      if (texte.length >= 12 && /[a-zA-ZÀ-ÿ]/.test(texte)
          && !/[{}]/.test(texte) && !pile.some(e => e.marque)) {
        trouves.push(texte.slice(0, 60));
      }
      if (ouvre === -1) break;

      // Les commentaires ne s'affichent pas.
      if (corps.startsWith('<!--', ouvre)) {
        const fin = corps.indexOf('-->', ouvre);
        i = fin === -1 ? corps.length : fin + 3;
        continue;
      }

      const ferme = corps.indexOf('>', ouvre);
      if (ferme === -1) break;
      const balise = corps.slice(ouvre, ferme + 1);
      const nom = (balise.match(/^<\/?\s*([a-zA-Z0-9]+)/) || [])[1] || '';

      if (balise[1] === '/') {
        // On remonte jusqu'à l'élément correspondant, pour survivre
        // à une balise mal refermée sans dérégler toute la pile.
        for (let k = pile.length - 1; k >= 0; k--) {
          if (pile[k].nom.toLowerCase() === nom.toLowerCase()) { pile.length = k; break; }
        }
      } else if (!balise.endsWith('/>') && !SEULES.test(nom)) {
        pile.push({ nom, marque: /\sdata-t/.test(balise) });
      }
      i = ferme + 1;
    }
    return trouves;
  })();
  verifier('★ aucune phrase française laissée en dur dans la page', durs, []);

  /* ─── Le hadith du jour suit la langue ─── */
  const carte = app.match(/const EDITIONS = \{([^}]*)\}/);
  vrai('chaque langue a son édition de hadiths',
    !!carte && CODES.every(c => new RegExp('\\b' + c + ':').test(carte[1])));
  vrai('★ la réserve hors-ligne suit elle aussi la langue',
    /function reserveHadiths\(\)/.test(app) &&
    /HADITH_SECOURS_EN/.test(app));
  vrai('la réserve anglaise contient bien les 42 hadiths',
    (lire('hadith-secours-en.js').match(/^  \{ text:/gm) || []).length === 42);

  /* ─── Le choix de la langue ─── */
  vrai('le réglage de langue existe dans la page', /id="set-langue"/.test(html));
  vrai('★ changer de langue recharge la page — rien ne reste dans l\'ancienne',
    /function brancherLangue\(\)[\s\S]{0,900}?location\.reload\(\)/.test(app));
  vrai('★ et le carnet est rangé AVANT de recharger',
    /function brancherLangue\(\)[\s\S]{0,900}?sauverDouble\(true\)[\s\S]{0,120}?location\.reload\(\)/.test(app));
  vrai('la langue du téléphone est suivie tant que personne n\'a choisi',
    /function devinee\(\)/.test(textes) && /navigator\.languages/.test(textes));

  /* ─── La bibliothèque s'ouvre au bon endroit dans toutes les langues ───
     « Morning adhkar » ne tombait sur rien : les mots cherchés étaient
     tous français, et la bibliothèque s'ouvrait toujours sur la première
     catégorie. Trouvé le 22 août 2026, avant la mise en ligne. */
  const mots = app.match(/const MOTS_CATEGORIE = \[([\s\S]*?)\n\];/);
  vrai('les mots qui devinent la catégorie sont trouvés', !!mots);
  vrai('★ ils existent aussi en anglais',
    !!mots && /'morning'/.test(mots[1]) && /'evening'/.test(mots[1])
           && /'prayer'/.test(mots[1]) && /'sleep'/.test(mots[1]));

  /* ─── Les paquets du premier jour ─────────────────────────
     ★ Le 22 août 2026, ces cinq paquets ont affiché « undefined »
     sur le tout premier écran de l'application, en anglais : le code
     lisait encore p.nom et p.desc alors que les paquets ne portaient
     plus qu'une clé. Aucune erreur, aucun plantage — juste cinq
     « undefined » devant la personne qui découvre l'appli. */
  const paquets = app.match(/const PACKS = \[([\s\S]*?)\n\];/);
  vrai('la liste des paquets est trouvée', !!paquets);
  // La clé du paquet suit son icône ; celles des intentions ouvrent
  // une accolade. Sans cette distinction, le test mélangeait les deux.
  const clesPacks = paquets
    ? [...paquets[1].matchAll(/ico: '[^']*',\s*cle: '([^']+)'/g)].map(m => m[1]) : [];
  vrai('chaque paquet a sa clé', clesPacks.length === 5);
  verifier('★ chaque paquet a son nom dans toutes les langues',
    clesPacks.filter(c => !MOTS.TEXTES[c + '.nom']), []);
  verifier('★ chaque paquet a sa description dans toutes les langues',
    clesPacks.filter(c => !MOTS.TEXTES[c + '.desc']), []);
  faux('★ l\'affichage ne lit plus p.nom ni p.desc — ils n\'existent plus',
    /\$\{p\.nom\}|\$\{p\.desc\}|echapper\(p\.nom\)/.test(app));

  // Et les intentions que ces paquets créent doivent, elles aussi,
  // avoir un nom dans chaque langue.
  const clesTaches = paquets
    ? [...paquets[1].matchAll(/\{ cle: '([^']+)'/g)].map(m => m[1]) : [];
  vrai('les intentions des paquets ont leurs clés', clesTaches.length >= 7);
  verifier('★ chaque intention créée par un paquet est traduite',
    clesTaches.filter(c => !MOTS.TEXTES[c]), []);

  /* ─── Le garde-fou du contenu religieux ───────────────────
     ★ LE TEST LE PLUS IMPORTANT DU GROUPE.
     Les 26 invocations sont relues EN FRANÇAIS. Les traductions ne
     l'ont été par personne. Si « verifie_en » passait à true sans
     relecture — par distraction, ou en recopiant une ligne — l'appli
     présenterait un sens non relu comme validé, en silence. */
  const biblio = chargerAdhkar().ADHKAR;

  verifier('★ AUCUNE traduction n\'est déclarée relue',
    biblio.filter(d => d.verifie_en === true).map(d => d.id), []);
  verifier('les 26 invocations sont toujours relues en français',
    biblio.filter(d => d.verifie !== true).map(d => d.id), []);

  verifier('chaque invocation a son titre anglais',
    biblio.filter(d => !d.nom_en).map(d => d.id), []);
  verifier('chaque invocation a son sens anglais',
    biblio.filter(d => !d.traduction_en).map(d => d.id), []);
  verifier('chaque invocation a sa source anglaise',
    biblio.filter(d => !d.source_en).map(d => d.id), []);

  // Une traduction qui recopie le français n'est pas une traduction.
  verifier('★ aucune traduction n\'est restée en français',
    biblio.filter(d => d.traduction_en === d.traduction).map(d => d.id), []);

  // L'arabe et la phonétique ne se traduisent pas : ils sont relus,
  // et une « version anglaise » de l'arabe n'aurait aucun sens.
  verifier('★ l\'arabe n\'a pas de version traduite',
    biblio.filter(d => d.arabe_en || d.phonetique_en).map(d => d.id), []);

  /* Et le code doit juger « relu » DANS LA LANGUE AFFICHÉE : c'est ce
     qui empêche l'avertissement de sauter en changeant de langue. */
  vrai('★ « relu » se juge dans la langue affichée',
    /function dhikrRelu\(d\)[\s\S]{0,400}?verifie_' \+ code/.test(textes));
  /* ⚠️ Cette vérification ne regardait QUE app.js. feuille.js avait sa
     propre copie de la règle — « ADHKAR.every(d => d.verifie) » — et
     elle est passée entre les mailles : en anglais, le bandeau se
     cachait tout seul dès que la feuille Google arrivait. On regarde
     donc désormais TOUS les fichiers qui touchent au bandeau. */
  const juges = ['app.js', 'feuille.js']
    .filter(f => /\.every\(d => d\.verifie\)|\.hidden = !!d\.verifie/.test(lire(f)));
  verifier('★ aucun fichier ne juge « relu » sur le seul champ français', juges, []);
  vrai('★ feuille.js juge lui aussi dans la langue affichée',
    /dhikrRelu/.test(lire('feuille.js')));
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
