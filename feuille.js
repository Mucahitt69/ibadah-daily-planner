/* ═══════════════════════════════════════════════════════════
   Ibadah Daily Planner — les dhikr ajoutés depuis ta feuille Google
   ───────────────────────────────────────────────────────────

   À QUOI SERT CE FICHIER

   Il permet d'ajouter des dhikr à l'application SANS toucher au
   code : tu écris une ligne dans ta feuille Google, et le dhikr
   apparaît dans la bibliothèque de tout le monde.

   Personne d'autre ne peut écrire dans ta feuille — c'est ton
   compte Google qui garde la porte. L'application, elle, se
   contente de LIRE. C'est ça, le « mode admin » : il n'y a pas
   de mot de passe à retenir dans l'application.

   ───────────────────────────────────────────────────────────
   COMMENT BRANCHER TA FEUILLE (à faire une seule fois)

   1. Ouvre ta feuille Google.
   2. Menu  Fichier → Partager → Publier sur le Web
   3. Choisis « Valeurs séparées par des virgules (.csv) »
   4. Clique sur « Publier », puis copie le lien proposé.
   5. Colle ce lien ci-dessous, entre les apostrophes.

   Tant que la ligne reste vide, l'application fonctionne
   normalement : elle affiche simplement les dhikr d'origine.
   ═══════════════════════════════════════════════════════════ */

const FEUILLE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTbHAPCkOKQKlFLyWMCdVoT0MgN6UMpVVl7Tj8b_qrsIVm9DMawGDTW3fWH8Hg0T1WE-jSLsbUI-gLX/pub?gid=566689662&single=true&output=csv';


/* ═══════════════════════════════════════════════════════════
   À partir d'ici, c'est de la mécanique. Tu n'as pas besoin
   d'y toucher pour ajouter des dhikr.
   ═══════════════════════════════════════════════════════════ */

/* Où l'on garde la dernière copie reçue. Elle sert quand le
   téléphone n'a pas de réseau : les dhikr de la feuille restent
   visibles au lieu de disparaître. */
const FEUILLE_CACHE = 'ibadah-feuille-adhkar';

/* Les seuls moments de la journée qu'une catégorie peut désigner.
   Si la feuille en contient un autre (faute de frappe), il est
   ignoré plutôt que de créer une catégorie fantôme. */
const FEUILLE_CATS = ['matin', 'soir', 'apres-priere', 'avant-dormir', 'general'];


/* ─── Lire un fichier CSV ────────────────────────────────────
   Un CSV, c'est un tableau écrit en texte : une ligne par
   rangée, des virgules entre les cases.

   La difficulté : une case peut elle-même contenir une virgule
   (« Allah, Unique »). Dans ce cas Google entoure la case de
   guillemets. Et si la case contient un guillemet, il est doublé.
   Cette fonction sait démêler tout ça. */
function feuilleLireCSV(texte) {
  const lignes = [];
  let ligne = [], champ = '', dansGuillemets = false;

  // Certains éditeurs collent une marque invisible en tête de fichier.
  if (texte.charCodeAt(0) === 0xFEFF) texte = texte.slice(1);

  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];

    if (dansGuillemets) {
      if (c !== '"')            { champ += c; }
      else if (texte[i + 1] === '"') { champ += '"'; i++; }   // guillemet doublé
      else                      { dansGuillemets = false; }
      continue;
    }

    if (c === '"')       dansGuillemets = true;
    else if (c === ',')  { ligne.push(champ); champ = ''; }
    else if (c === '\n') { ligne.push(champ); lignes.push(ligne); ligne = []; champ = ''; }
    else if (c !== '\r') champ += c;
  }

  if (champ !== '' || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  return lignes;
}


/* Met un mot à plat : sans accent, sans majuscule, sans espace autour.
   Cela permet d'accepter « Phonétique », « phonetique » ou
   « PHONETIQUE » comme un seul et même titre de colonne. */
function feuilleAplatir(valeur) {
  return String(valeur == null ? '' : valeur)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase();
}


/* Fabrique un nom court et unique à partir du titre du dhikr.
   Le préfixe « feuille- » garantit qu'un dhikr de la feuille ne
   pourra jamais écraser un dhikr d'origine portant le même nom. */
function feuilleIdentifiant(nom, dejaPris) {
  const base = feuilleAplatir(nom).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  let id = 'feuille-' + (base || 'dhikr');
  let n = 2;
  while (dejaPris.has(id)) { id = 'feuille-' + (base || 'dhikr') + '-' + n; n++; }
  dejaPris.add(id);
  return id;
}


/* « oui », « x », « vrai »… veulent tous dire vrai. Tout le reste
   veut dire faux — et dans le doute, un texte est considéré comme
   NON relu, ce qui laisse l'avertissement affiché. */
function feuilleEstOui(valeur) {
  return ['oui', 'o', 'x', 'vrai', 'yes', 'true', '1'].indexOf(feuilleAplatir(valeur)) !== -1;
}


/* ─── Transformer le tableau en dhikr ──────────────────────── */
function feuilleVersDhikr(lignes) {
  if (!lignes || lignes.length < 2) return [];

  // La première ligne donne les titres de colonnes. On note à quelle
  // position se trouve chacune, pour que l'ordre des colonnes dans la
  // feuille n'ait aucune importance.
  const colonne = {};
  lignes[0].forEach((titre, i) => { colonne[feuilleAplatir(titre)] = i; });

  const valeurDe = (ligne, nom) => {
    const i = colonne[nom];
    return i === undefined ? '' : String(ligne[i] == null ? '' : ligne[i]).trim();
  };

  const dejaPris = new Set();
  const dhikrs = [];

  for (let i = 1; i < lignes.length; i++) {
    const ligne = lignes[i];

    const nom = valeurDe(ligne, 'nom');
    if (!nom) continue;   // une ligne vide, ou un reste de mise en forme

    const cats = valeurDe(ligne, 'categories')
      .split(',')
      .map(feuilleAplatir)
      .filter(c => FEUILLE_CATS.indexOf(c) !== -1);

    const rep = parseInt(valeurDe(ligne, 'repetitions'), 10);

    dhikrs.push({
      id:          feuilleIdentifiant(nom, dejaPris),
      categories:  cats.length ? cats : ['general'],   // sinon il serait invisible
      nom:         nom,
      arabe:       valeurDe(ligne, 'arabe'),
      phonetique:  valeurDe(ligne, 'phonetique'),
      traduction:  valeurDe(ligne, 'traduction'),
      source:      valeurDe(ligne, 'source'),
      repetitions: (isFinite(rep) && rep > 0) ? rep : 1,
      verifie:     feuilleEstOui(valeurDe(ligne, 'verifie')),
      _feuille:    true    // marque d'origine : sert à les retirer proprement
    });
  }

  return dhikrs;
}


/* ─── Poser les dhikr dans la bibliothèque ──────────────────
   On modifie le tableau ADHKAR sur place. C'est important :
   app.js garde une référence vers CE tableau-là. Le remplacer
   par un neuf n'aurait aucun effet visible. */
function feuillePoser(dhikrs) {
  if (typeof ADHKAR === 'undefined' || !Array.isArray(ADHKAR)) return;

  // On enlève d'abord ceux d'un passage précédent, pour ne pas
  // les empiler en double à chaque rafraîchissement.
  for (let i = ADHKAR.length - 1; i >= 0; i--) {
    if (ADHKAR[i] && ADHKAR[i]._feuille) ADHKAR.splice(i, 1);
  }

  dhikrs.forEach(d => ADHKAR.push(d));
}


/* Redessine la bibliothèque si elle est ouverte à l'écran au moment
   où la feuille arrive. Si elle est fermée, il n'y a rien à faire :
   elle se dessinera avec les nouveaux dhikr à la prochaine ouverture. */
function feuilleRafraichirEcran() {
  const boite = document.getElementById('biblio');
  if (!boite || boite.hidden) return;

  /* ⚠️ Ce bandeau se décidait ici sur le seul champ « verifie » —
     c'est-à-dire sur le français. En anglais, où le SENS n'a été relu
     par personne, il se serait donc caché tout seul dès que la feuille
     Google arrivait, alors qu'il devait rester. On juge « relu » dans
     la langue affichée, exactement comme le fait ouvrirBiblio(). */
  const warn = document.getElementById('biblio-warn');
  if (warn && typeof ADHKAR !== 'undefined' && typeof dhikrRelu === 'function') {
    const traductionEnCause = ADHKAR.some(dhikrTraductionNonRelue);
    warn.hidden = ADHKAR.every(dhikrRelu);

    const titre = document.getElementById('biblio-warn-titre');
    const texte = document.getElementById('biblio-warn-texte');
    if (titre) titre.textContent = T(traductionEnCause ? 'biblio.warn.titre.trad' : 'biblio.warn.titre');
    if (texte) texte.textContent = T(traductionEnCause ? 'biblio.warn.texte.trad' : 'biblio.warn.texte');
  }

  if (typeof afficherBiblioCats === 'function') afficherBiblioCats();
  if (typeof afficherBiblio     === 'function') afficherBiblio();
}


/* ─── La réserve locale ─────────────────────────────────────── */
function feuilleLireReserve() {
  try {
    const brut = localStorage.getItem(FEUILLE_CACHE);
    const liste = brut ? JSON.parse(brut) : null;
    return Array.isArray(liste) ? liste : [];
  } catch (e) { return []; }
}

function feuilleEcrireReserve(dhikrs) {
  try { localStorage.setItem(FEUILLE_CACHE, JSON.stringify(dhikrs)); } catch (e) {}
}


/* ─── Le démarrage ──────────────────────────────────────────
   Deux temps, et c'est voulu :

   1. Tout de suite, sans attendre le réseau, on ressort la dernière
      copie connue. L'application s'ouvre donc complète même dans le
      métro, et sans le moindre clignotement.

   2. Ensuite, en arrière-plan, on va voir si la feuille a changé.

   Si internet est coupé, ou si la feuille est mal remplie, ou si le
   lien est faux : on garde simplement ce qu'on avait. L'application
   ne doit jamais s'arrêter à cause de la feuille. */
(function feuilleDemarrer() {
  try { feuillePoser(feuilleLireReserve()); } catch (e) {}

  if (!FEUILLE_URL) return;   // pas encore branchée : on s'arrête là

  fetch(FEUILLE_URL, { cache: 'no-store' })
    .then(r => (r && r.ok) ? r.text() : Promise.reject(new Error('feuille injoignable')))
    .then(texte => {
      const dhikrs = feuilleVersDhikr(feuilleLireCSV(texte));

      // Une feuille vide est presque toujours un accident (lien cassé,
      // page d'erreur renvoyée à la place du tableau). On préfère garder
      // la copie précédente plutôt que de vider la bibliothèque.
      if (!dhikrs.length) return;

      feuilleEcrireReserve(dhikrs);
      feuillePoser(dhikrs);
      feuilleRafraichirEcran();
    })
    .catch(() => { /* hors ligne ou feuille en panne : la réserve suffit */ });
})();


/* Permet aux vérifications automatiques (tests.js) d'examiner ce
   fichier sans navigateur. Sans effet dans l'application. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    feuilleLireCSV, feuilleAplatir, feuilleIdentifiant,
    feuilleEstOui, feuilleVersDhikr, feuillePoser
  };
}
