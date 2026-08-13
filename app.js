/* ═══════════════════════════════════════════════════════════
   Ibadah Daily Planner — l'affichage
   ───────────────────────────────────────────────────────────
   Ce fichier ne calcule presque rien : il demande tout à
   store.js et se contente de dessiner à l'écran.
   ═══════════════════════════════════════════════════════════ */

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>';
/* Le chevron est enveloppé dans un <span> : une rotation CSS posée
   directement sur une balise <svg> racine n'est pas appliquée de la
   même façon partout, alors que sur un <span> elle marche toujours. */
const CHEV_SVG  = '<span class="task__chev" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span>';
const FLECHE_SVG = '<svg class="sub__voir" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

// Le jour affiché (la vraie date, ou celle simulée par ?jour=...)
const JOUR = Store.aujourdhui();

/* La bibliothèque de dhikr est un fichier que l'on corrige à la main.
   S'il manque ou s'il est abîmé, l'application doit continuer de
   fonctionner — simplement sans bibliothèque. */
const BIBLIO = (typeof ADHKAR !== 'undefined' && Array.isArray(ADHKAR)) ? ADHKAR : [];
const BIBLIO_CATS = (typeof ADHKAR_CATEGORIES !== 'undefined' && Array.isArray(ADHKAR_CATEGORIES))
  ? ADHKAR_CATEGORIES : [];

function dhikrDeLaBiblio(ref) {
  return ref ? (BIBLIO.find(d => d.id === ref) || null) : null;
}

// Quelles intentions sont dépliées à l'écran. Volontairement non sauvegardé :
// chaque jour on repart d'une liste refermée, donc lisible.
const depliees = new Set();

/* ─── Thème clair / sombre ──────────────────────────────── */
function appliquerTheme(sombre) {
  document.documentElement.setAttribute('data-theme', sombre ? 'dark' : 'light');
  $('#theme-icon').textContent = sombre ? '☀️' : '🌙';
  $('#set-dark').checked = sombre;
  Store.reglerOption('sombre', sombre);
}

/* ─── Navigation entre écrans ───────────────────────────── */
function aller(nom) {
  $$('.screen').forEach(s => {
    const actif = s.id === 'screen-' + nom;
    s.classList.toggle('is-active', actif);
    s.hidden = !actif;
  });
  $$('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.go === nom));
  const zone = $('#screen-' + nom + ' .scroll');
  if (zone) zone.scrollTop = 0;
  if (nom === 'stats') afficherStats();
}

/* ─── Petit message de félicitation ─────────────────────── */
let minuteurToast;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => { t.hidden = true; }, 2600);
}

const ENCOURAGEMENTS = [
  'Alhamdoulillah, c\'est fait ✨',
  'Barak Allahu fik, continue ainsi',
  'Un pas de plus, qu\'Allah l\'accepte',
  'Ma sha Allah, belle constance',
  'Petit à petit, régulièrement — c\'est ce qu\'Allah aime'
];

/* ─── Écran « Aujourd'hui » ─────────────────────────────── */
function afficherDate() {
  const d = Store.dateDepuisCle(JOUR);
  $('#today-date').textContent = d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
  // Petit bandeau visible seulement quand on simule une autre date (tests)
  if (Store.jourSimule()) {
    $('#today-date').textContent += ' — jour simulé';
  }
}

function afficherPrieres() {
  const boite = $('#prayers');
  boite.innerHTML = '';

  Store.PRIERES.forEach(nom => {
    const faite = Store.priereFaite(nom, JOUR);
    const b = document.createElement('button');
    b.className = 'prayer' + (faite ? ' is-on' : '');
    b.type = 'button';
    b.setAttribute('aria-pressed', faite);
    b.setAttribute('aria-label', nom + (faite ? ' : accomplie' : ' : à accomplir'));
    b.innerHTML = `<span class="prayer__dot">${CHECK_SVG}</span><span class="prayer__name">${nom}</span>`;
    b.addEventListener('click', () => {
      const cochee = Store.basculerPriere(nom, JOUR);
      if (cochee) toast(`${nom} accomplie — qu'Allah l'accepte 🤍`);
      afficherPrieres();
      afficherEnTete();
    });
    boite.appendChild(b);
  });

  const reste = Store.PRIERES.filter(p => !Store.priereFaite(p, JOUR)).length;
  $('#prayers-left').textContent =
    reste === 0 ? 'Toutes accomplies 🤍' : reste === 1 ? '1 restante' : reste + ' restantes';
}

function afficherTaches() {
  const listeAFaire  = $('#task-list');
  const listeFaites  = $('#done-list');
  listeAFaire.innerHTML = '';
  listeFaites.innerHTML = '';

  const duJour  = Store.tachesDuJour(JOUR);
  const aFaire  = duJour.filter(t => !Store.estFaite(t, JOUR));
  const faites  = duJour.filter(t =>  Store.estFaite(t, JOUR));

  aFaire.forEach(t => listeAFaire.appendChild(ligneTache(t, false)));
  faites.forEach(t => listeFaites.appendChild(ligneTache(t, true)));

  $('#tasks-empty').hidden      = aFaire.length > 0;
  $('#tasks-count').textContent = aFaire.length ? `${aFaire.length} à faire` : '';
  $('#done-block').hidden       = faites.length === 0;
  $('#done-count').textContent  = faites.length;

  // Texte de l'état vide : différent si la journée est finie ou si tout est à créer
  const rienDeCree = Store.toutesLesTaches().length === 0;
  $('#empty-title').textContent = rienDeCree ? 'Ta journée est libre' : 'Tout est accompli 🤍';
  $('#empty-text').innerHTML    = rienDeCree
    ? 'Ajoute une première intention.<br>Même une seule, faite avec sincérité, compte.'
    : 'Tu as terminé tes intentions du jour.<br>Qu\'Allah les accepte de toi.';

  afficherEnTete();
}

function ligneTache(t, faite) {
  const sous = Store.sousTachesDe(t);
  const li = document.createElement('li');
  li.className = 'task' + (faite ? ' is-done' : '');
  li.dataset.id = t.id;

  const meta = [`<span class="task__tag">${echapper(Store.libelleFrequence(t))}</span>`];
  if (t.heure) meta.push(`<span>🔔 ${t.heure}</span>`);

  const corps = `
    <span class="task__body">
      <span class="task__name">${echapper(t.nom)}</span>
      <span class="task__meta">${meta.join('')}</span>
    </span>`;

  const plus = `
    <button class="task__more" aria-label="Options pour ${echapper(t.nom)}">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>
      </svg>
    </button>`;

  if (!sous.length) {
    /* Intention simple : toute la ligne coche, comme avant. */
    li.innerHTML = `
      <div class="task__ligne">
        <button class="task__hit" aria-pressed="${faite}"
                aria-label="${echapper(t.nom)}${faite ? ' : terminée' : ' : à faire'}">
          <span class="check">${CHECK_SVG}</span>
          ${corps}
        </button>
        ${plus}
      </div>`;
    li.querySelector('.task__hit').addEventListener('click', () => basculer(t, li));

  } else {
    /* Intention qui contient des dhikr : le rond coche tout, le reste déplie. */
    const av = Store.avancement(t, JOUR);
    const ouverte = depliees.has(t.id);
    const idListe = 'subs-' + t.id;
    if (ouverte) li.classList.add('is-open');

    li.innerHTML = `
      <div class="task__ligne">
        <button class="task__check" aria-pressed="${faite}"
                aria-label="${faite ? 'Tout décocher' : 'Tout cocher'} : ${echapper(t.nom)}">
          <span class="check">${CHECK_SVG}</span>
        </button>
        <button class="task__hit task__hit--groupe" aria-expanded="${ouverte}" aria-controls="${idListe}"
                aria-label="${echapper(t.nom)} : ${av.faits} sur ${av.total}, ouvrir la liste">
          ${corps}
          <span class="task__prog">${av.faits} / ${av.total}</span>
          ${CHEV_SVG}
        </button>
        ${plus}
      </div>
      <ul class="subs" id="${idListe}"${ouverte ? '' : ' hidden'}></ul>`;

    remplirSous(li.querySelector('.subs'), t, li);
    li.querySelector('.task__check').addEventListener('click', () => basculer(t, li));
    li.querySelector('.task__hit').addEventListener('click', () => deplier(t, li));
  }

  li.querySelector('.task__more').addEventListener('click', e => {
    e.stopPropagation();
    ouvrirMenu(t);
  });
  return li;
}

function deplier(t, li) {
  const etaitOuverte = depliees.has(t.id);
  if (etaitOuverte) depliees.delete(t.id); else depliees.add(t.id);

  li.classList.toggle('is-open', !etaitOuverte);
  li.querySelector('.subs').hidden = etaitOuverte;
  li.querySelector('.task__hit').setAttribute('aria-expanded', String(!etaitOuverte));
}

function remplirSous(ul, t, liParent) {
  ul.innerHTML = '';

  Store.sousTachesDe(t).forEach(s => {
    const fait = Store.sousFaite(s.id, JOUR);
    const d    = dhikrDeLaBiblio(s.refBiblio);

    const li = document.createElement('li');
    li.className = 'sub' + (fait ? ' is-done' : '');
    // L'état ne va PAS dans le nom : il est porté par aria-pressed, qui lui
    // se met à jour au moment du clic. Un nom qui dirait « à faire » resterait
    // faux dès la première coche.
    li.innerHTML = `
      <button class="sub__coche" aria-pressed="${fait}" aria-label="${echapper(s.nom)}">
        <span class="sub__rond">${CHECK_SVG}</span>
      </button>
      <button class="sub__hit" aria-label="${d ? 'Lire le texte : ' + echapper(s.nom) : echapper(s.nom)}">
        <span class="sub__nom">${echapper(s.nom)}</span>
        <span class="sub__fois">${s.repetitions > 1 ? s.repetitions + '×' : ''}</span>
        ${d ? FLECHE_SVG : ''}
      </button>`;

    li.querySelector('.sub__coche').addEventListener('click', () => basculerSous(t, s, li, liParent));
    li.querySelector('.sub__hit').addEventListener('click', () => {
      if (d) ouvrirLecture(t, s, d, li, liParent);
      else   basculerSous(t, s, li, liParent);
    });
    ul.appendChild(li);
  });

  const ajout = document.createElement('li');
  ajout.className = 'sub sub--ajout';
  ajout.innerHTML = `
    <button class="sub__ajout">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
      Ajouter un dhikr
    </button>`;
  ajout.querySelector('.sub__ajout').addEventListener('click', () => ouvrirBiblio(t));
  ul.appendChild(ajout);
}

/* Cocher un dhikr. Si c'était le dernier, l'intention entière se coche
   toute seule — c'est store.js qui s'en charge, on ne fait que l'afficher. */
function basculerSous(t, s, liSous, liParent) {
  const avant = Store.estFaite(t, JOUR);
  const coche = Store.basculerSous(t, s.id, JOUR);
  const apres = Store.estFaite(t, JOUR);

  if (apres && !avant) {
    depliees.delete(t.id);
    liParent.classList.add('is-done');
    toast(`${t.nom} : tout est accompli 🤍`);
    setTimeout(() => liParent.classList.add('is-leaving'), 340);
    setTimeout(afficherTaches, 700);
    return;
  }
  if (!apres && avant) { afficherTaches(); return; }

  // Rien de spectaculaire : on met simplement la ligne à jour sur place.
  liSous.classList.toggle('is-done', coche);
  liSous.querySelector('.sub__coche').setAttribute('aria-pressed', String(coche));

  const av = Store.avancement(t, JOUR);
  liParent.querySelector('.task__prog').textContent = `${av.faits} / ${av.total}`;
  liParent.querySelector('.task__hit').setAttribute('aria-label',
    `${t.nom} : ${av.faits} sur ${av.total}, ouvrir la liste`);
  afficherEnTete();
}

function basculer(t, li) {
  const cochee = Store.basculerTache(t, JOUR);

  if (cochee) {
    // Petite animation : la tâche se coche, puis glisse vers « Terminées »
    li.classList.add('is-done');
    depliees.delete(t.id);
    toast(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
    setTimeout(() => li.classList.add('is-leaving'), 340);
    setTimeout(afficherTaches, 700);
  } else {
    afficherTaches();
  }
}

function afficherEnTete() {
  const p = Store.progression(JOUR);

  $('#ring-percent').textContent = p.pourcent + '%';
  $('#ring-sub').textContent     = `${p.faits} / ${p.total} accomplis`;
  $('#ring-fill').style.strokeDashoffset = 327 - (327 * p.pourcent / 100);
  $('#ring').setAttribute('aria-label',
    `Progression du jour : ${p.pourcent} pour cent, ${p.faits} sur ${p.total}`);

  $('#hero-streak').textContent     = Store.serie();
  $('#hero-regularite').textContent = Store.regulariteGlobale().pourcent + ' %';

  $('#hero-msg').textContent =
    p.pourcent === 0  ? 'Une nouvelle journée t\'est offerte.' :
    p.pourcent < 40   ? 'Tu as commencé, c\'est le plus important.' :
    p.pourcent < 80   ? 'Belle avancée, continue tranquillement.' :
    p.pourcent < 100  ? 'Presque tout est accompli, ma sha Allah.' :
                        'Journée complète — qu\'Allah accepte de toi 🤍';
}

/* ─── Écran « Progrès » ─────────────────────────────────────
   Aucun point nulle part : on ne mesure que la constance. */

const BADGES = [
  { ico: '🌱', nom: '7 jours d\'affilée',          gagne: c => c.meilleure >= 7 },
  { ico: '🌳', nom: '30 jours d\'affilée',         gagne: c => c.meilleure >= 30 },
  { ico: '🏔️', nom: '60 jours d\'affilée',         gagne: c => c.meilleure >= 60 },
  { ico: '🕌', nom: 'Fajr tenu tout un mois',      gagne: c => c.fajr.prevus >= 28 && c.fajr.pourcent === 100 },
  { ico: '🤍', nom: 'Une intention tenue 40 fois', gagne: c => c.fidelite >= 40 },
  { ico: '📖', nom: '10 journées entières',        gagne: c => c.completes >= 10 }
];

const LETTRES_SEMAINE = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function afficherStats() {
  const serie = Store.serie();
  const reg   = Store.regulariteGlobale();
  const pri   = Store.regularitePrieres();

  $('#st-streak').textContent     = serie;
  $('#st-best').textContent       = Store.meilleureSerie();
  $('#st-regularite').textContent = reg.pourcent + ' %';
  $('#st-prieres').textContent    = pri.pourcent + ' %';

  afficherGraphique();
  afficherMois();
  afficherRegularites();

  const contexte = {
    serie,
    meilleure: Store.meilleureSerie(),
    fajr:      Store.regularitePriere('Fajr'),
    fidelite:  Store.meilleureFidelite(),
    completes: Store.journeesCompletes()
  };

  $('#badges').innerHTML = BADGES.map(b => `
    <div class="badge ${b.gagne(contexte) ? 'is-won' : ''}">
      <span class="badge__ico" aria-hidden="true">${b.ico}</span>
      <span class="badge__name">${b.nom}</span>
    </div>`).join('');
}

function afficherGraphique() {
  const jours = Store.septDerniersJours();

  $('#chart').innerHTML = jours.map(j => `
    <div class="chart__col">
      <div class="chart__track">
        <div class="chart__bar ${j.estCeJour ? '' : 'chart__bar--soft'}"
             style="--v:${Math.max(0.035, j.part / 100).toFixed(3)}"
             title="${j.cle} : ${j.part} % de la journée"></div>
      </div>
      <span class="chart__day">${j.lettre}</span>
    </div>`).join('');

  $('#chart').setAttribute('aria-label',
    'Part de la journée accomplie sur 7 jours : ' +
    jours.map(j => `${j.lettre} ${j.part} pour cent`).join(', '));
}

function afficherMois() {
  const cases = Store.grilleDuMois();
  const d = Store.dateDepuisCle(JOUR);
  $('#month-name').textContent = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const entete = LETTRES_SEMAINE
    .map(l => `<div class="month__tete" aria-hidden="true">${l}</div>`).join('');

  const grille = cases.map(c => {
    if (!c) return '<div class="month__case month__case--vide" aria-hidden="true"></div>';
    const ceJour = c.estCeJour ? ' month__case--ce-jour' : '';
    if (c.part < 0) {
      return `<div class="month__case month__case--futur${ceJour}" aria-hidden="true"></div>`;
    }
    const niveau = c.part === 0 ? '' : c.part === 100 ? ' month__case--complet' : ' month__case--partiel';
    return `<div class="month__case${niveau}${ceJour}" title="${c.jour} : ${c.part} % de la journée"></div>`;
  }).join('');

  $('#month').innerHTML = entete + grille;

  const faits = cases.filter(c => c && c.part > 0).length;
  $('#month').setAttribute('aria-label',
    `Grille du mois : ${faits} jours où quelque chose a été accompli.`);
}

function afficherRegularites() {
  const liste = Store.toutesLesTaches()
    .map(t => ({ t, r: Store.regularite(t) }))
    .filter(x => x.r.prevus > 0)
    .sort((a, b) => b.r.pourcent - a.r.pourcent);

  $('#regularites').innerHTML = liste.map(x => `
    <div class="reg">
      <span class="reg__nom">${echapper(x.t.nom)}</span>
      <span class="reg__barre" role="img"
            aria-label="${x.r.faits} fois sur ${x.r.prevus} jours prévus">
        <span class="reg__jauge" style="width:${x.r.pourcent}%"></span>
      </span>
      <span class="reg__val">${x.r.faits} / ${x.r.prevus}</span>
    </div>`).join('');

  $('#regularites').hidden       = liste.length === 0;
  $('#regularites-empty').hidden = liste.length > 0;
}

/* ─── Écran « Hadith » ──────────────────────────────────── */

/* Réserve de secours : utilisée si internet ne répond pas.
   Les 40 hadiths de l'Imam an-Nawawi, traduction Rachid Maach.
   ⚠️ À faire relire par une personne de science avant la vraie mise en ligne. */
const HADITH_SECOURS = [
  { text: "Les actes ne valent que par leurs intentions et à chacun selon son intention.",
    source: "Abou Hafs, 'Oumar ibn Al-Khattâb — Sahih al-Bukhari et Sahih Muslim" },
  { text: "Alors que nous étions assis en compagnie du Messager d'Allah ﷺ se présenta à nous un homme portant des vêtements extrêmement blancs...",
    source: "Oumar — L'islam, la foi et l'excellence" },
  { text: "L'Islam repose sur cinq piliers.",
    source: "Abou 'Abd Ar-Rahmân 'Abdoullah ibn 'Umar ibn Al-Khattâb" },
  { text: "Le Messager d'Allah ﷺ, l'homme véridique et digne de foi, nous affirma l'ordre de sa mère durant quarante jours d'abord...",
    source: "Abou 'Abd Ar-Rahmân 'Abdoullah ibn Mas'oud" },
  { text: "Quiconque accomplit un acte qui ne conforme à notre religion verra son acte rejeté.",
    source: "Oumm 'Abdillah 'Aichah" },
  { text: "Le licite est clair et l'illicite est clair également, mais à la frontière entre le licite et l'illicite...",
    source: "Abou 'Abdillah An-Nou'mân ibn Bachir" },
  { text: "La religion repose sur la sincérité.",
    source: "Tamim ibn Aws Ad-Dâri — Hadith Muslim" },
  { text: "J'ai reçu l'ordre de combattre les gens jusqu'à ce qu'ils témoignent qu'il n'y a de divinité en droit d'être adorée qu'Allah...",
    source: "Ibn 'Oumar — Sahih al-Bukhari et Sahih Muslim" },
  { text: "Si vous interdits une chose, écartez-vous-en et si je vous donne un ordre, exécutez-le dans la mesure du possible.",
    source: "Abou Hourayrah 'Abd Ar-Rahmân ibn Sakhr" },
  { text: "Allah le Très Haut est pur et n'accepte que ce qui est pur.",
    source: "Abou Hourayrah" },
  { text: "J'ai retenu ces paroles du Messager d'Allah ﷺ: Renonce à ce qui suscite en toi des doutes...",
    source: "Abou Mouhammad Al-Hasan, fils de 'Ali — Hadith Hasan" },
  { text: "Le bon musulman ne se mêle jamais de ce qui ne le regarde pas.",
    source: "Hadith authentique (hasan), rapporté par At-Tirmidhi" },
  { text: "Nul d'entre vous ne possèdera véritablement la foi tant qu'il n'aimera pas pour son frère croyant ce qu'il aime pour lui-même.",
    source: "Abou Hamzah Anas ibn Mâlik" },
  { text: "Il n'est pas permis de verser le sang du musulman que dans trois cas.",
    source: "Ibn Mas'oud — Sahih al-Bukhari et Sahih Muslim" },
  { text: "Que celui qui croit en Allah et au Jour dernier dise du bien ou se taise. Que celui qui croit en Allah et au Jour dernier honore son hôte. Que celui qui croit en Allah et au Jour dernier honore son voisin.",
    source: "Abou Hourayrah" },
  { text: "Ne te mets pas en colère. L'homme réitéra sa demande, obtenant à chaque fois la même réponse: Ne te mets pas en colère.",
    source: "Hadith authentique (hasan), rapporté par Al-Boukhâri" },
  { text: "Allah a prescrit la bonté en toute chose.",
    source: "Abou Ya'la Chaddâd ibn Aws" },
  { text: "Crains Allah où que tu sois, fais suivre la mauvaise action par la bonne action, elle l'effacera, et comporte-toi avec ton prochain de la meilleure façon.",
    source: "Abou Dharr Jouandoub ibn Jounadâh et Abou 'Abd Ar-Rahmân Mou'âdh ibn Jabal" },
  { text: "Mon garçon ! Je vais te prodiguer certains enseignements... Les calamités sont levés et l'encre a séché.",
    source: "Abou Al-'Abbâs 'Abdoullah ibn 'Abbâs" },
  { text: "Parmi les paroles héritées des premiers prophètes figurent celles-ci: Si tu n'éprouves aucune pudeur, fais ce qu'il te plaît.",
    source: "Abou Mas'oud 'Ouqbah ibn 'Amr Al-Ansâri Al-Badri" },
  { text: "Messager d'Allah! Enseigne-moi une parole au sujet de l'Islam sur laquelle je n'interrogerai plus personne après toi...",
    source: "Soufyân ibn 'Abdillah — Hadith Muslim" },
  { text: "Si je me contente d'accomplir les prières obligatoires et de jeûner le mois de Ramadan, liciterai-je et en fuyant ce qui est illicite...",
    source: "Abou 'Abdillah Jâbir ibn 'Abdillah Al-Ansâri" },
  { text: "La purification représente la moitié de la foi. Louange à Allah remplit la Balance de bonnes actions.",
    source: "Abou Mâlik Al-Hârith ibn 'Âsim Al-Ash'ari" },
  { text: "Mes riches ont accaparé les récompenses d'Allah. Ils prient et jeûnent comme nous...",
    source: "Abou Dharr Al-Ghifâri" },
  { text: "Toute bonne action est une aumône.",
    source: "Abou Dharr" },
  { text: "Chaque jour l'homme est redevable d'une aumône pour chacune de ses articulations: juger ou réconcilier...",
    source: "Abou Hourayrah" },
  { text: "La vertu, c'est la noblesse de caractère et le vice, c'est ce qui te donne mauvaise conscience...",
    source: "An-Nawwâs ibn Sam'ân" },
  { text: "Le Messager d'Allah ﷺ prononça devant nous un sermon si éloquent qu'on en eut les larmes...",
    source: "Abou Najh Al-Irbâd ibn Sâriyah" },
  { text: "Messager d'Allah! Indique-moi une œuvre qui me fasse entrer au Paradis et m'éloigne de l'Enfer...",
    source: "Mou'âdh ibn Jabal" },
  { text: "Le Très Haut a imposé des obligations que vous ne devez pas négliger, Il a fixé des limites...",
    source: "Abou Tha'labah Al-Khouchani" },
  { text: "L'amour d'Allah et des hommes: Renonce à ce monde, Allah t'aimera, et renonce à ce qui appartient aux gens...",
    source: "Abou Al-'Abbâs Sahl ibn Sa'd As-Sa'idi" },
  { text: "Ne faites de tort à personne, pas même à celui qui vous en a fait.",
    source: "Hadith authentique (hasan), rapporté par Ibn Mâjah et Ad-Dâraqoutni" },
  { text: "Si l'on jugeait en faveur des accusateurs sur la seule base de leurs déclarations...",
    source: "Hadith authentique (hasan), rapporté notammement par Al-Bayhaqi en ces termes et par Al-Boukhâri" },
  { text: "Que celui d'entre vous qui voit un acte répréhensible s'efforce d'y mettre un terme...",
    source: "Abou Sa'îd Al-Khoudri" },
  { text: "Ne vous envier pas les uns les autres, ne vous surenchérissez pas frauduleusement...",
    source: "Abou Hourayrah" },
  { text: "Celui qui soulage la peine d'un musulman ici-bas, Allah lui soulagera une peine le Jour de la résurrection...",
    source: "Abou Hourayrah" },
  { text: "Allah le Très Haut a inscrit les bonnes et les mauvaises actions, puis Il a explicité...",
    source: "Ibn 'Abbâs" },
  { text: "Allah le Très Haut dit: Je déclare la guerre à celui qui se fait l'ennemi d'un ami de Mien...",
    source: "Abou Hourayrah" },
  { text: "Par égard pour moi, Allah a pardonné à ma nation tout acte commis par erreur, par oubli ou sous la contrainte.",
    source: "Hadith authentique (hasan), rapporté notammement par Ibn Mâjah et Al-Bayhaqi" },
  { text: "Sois dans ce monde comme un étranger ou un voyageur de passage.",
    source: "Ibn 'Oumar" }
];

/* Source en ligne : recueils traduits en français, servis par le CDN jsDelivr.
   On tire dans deux recueils courts et très connus (les 40 de an-Nawawi et
   les hadiths qudsi) : 82 textes, soit près de 3 mois sans répétition. */
const CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';
const RECUEILS = [
  { edition: 'fra-nawawi', nombre: 42, titre: 'Les 40 hadiths de an-Nawawi' },
  { edition: 'fra-qudsi',  nombre: 40, titre: 'Hadith qudsi' }
];

function numeroDuJour() {
  return Math.floor(Store.dateDepuisCle(JOUR).getTime() / 86400000);
}

/* Petit cache : on ne rappelle internet qu'une fois par hadith. */
function lireCache(cle) {
  try {
    const c = JSON.parse(localStorage.getItem('ibadah-hadith') || '{}');
    return c.cle === cle ? c.valeur : null;
  } catch (e) { return null; }
}
function ecrireCache(cle, valeur) {
  try { localStorage.setItem('ibadah-hadith', JSON.stringify({ cle, valeur })); } catch (e) {}
}

async function chargerHadith(auHasard = false) {
  $('#hadith-loading').hidden = false;
  $('#hadith-content').hidden = true;

  const total = RECUEILS.reduce((s, c) => s + c.nombre, 0);
  const graine = auHasard ? Math.floor(Math.random() * total) : numeroDuJour() % total;

  // On transforme cet index en (recueil, numéro)
  let i = graine, recueil = RECUEILS[0];
  for (const c of RECUEILS) { if (i < c.nombre) { recueil = c; break; } i -= c.nombre; }
  const num = i + 1;

  const cache = !auHasard && lireCache(recueil.edition + '/' + num);
  if (cache) { montrerHadith(cache); return; }

  // On essaie le recueil choisi, puis l'autre en secours
  const ordre = [recueil].concat(RECUEILS.filter(c => c !== recueil));
  for (const c of ordre) {
    const n = (c === recueil) ? num : (graine % c.nombre) + 1;
    try {
      const ctrl  = new AbortController();
      const chrono = setTimeout(() => ctrl.abort(), 7000);
      const res = await fetch(`${CDN}/${c.edition}/${n}.min.json`, { signal: ctrl.signal });
      clearTimeout(chrono);
      if (!res.ok) continue;

      const data = await res.json();
      const h = data.hadiths && data.hadiths[0];
      let txt = h && String(h.text || '').replace(/\s+/g, ' ').trim();
      if (!txt || txt.length < 40) continue;
      if (txt.length > 900) txt = txt.slice(0, 900).replace(/\S+$/, '').trim() + '…';

      const item = { text: txt, source: `${c.titre} — n° ${h.hadithnumber}`, note: '', enLigne: true };
      ecrireCache(c.edition + '/' + n, item);
      montrerHadith(item);
      return;
    } catch (e) { /* on essaie le recueil suivant */ }
  }

  // Aucune source en ligne n'a répondu → réserve locale
  const f = HADITH_SECOURS[auHasard
    ? Math.floor(Math.random() * HADITH_SECOURS.length)
    : numeroDuJour() % HADITH_SECOURS.length];
  montrerHadith(Object.assign({ enLigne: false }, f));
}

function montrerHadith(h) {
  $('#hadith-text').textContent   = h.text;
  $('#hadith-source').textContent = h.source;

  let note = h.note ? `<p style="margin:0">${echapper(h.note)}</p>` : '';
  note += h.enLigne
    ? '<p class="hadith__warn">Texte récupéré automatiquement en ligne. La traduction doit être vérifiée avant la mise en ligne réelle.</p>'
    : '<p class="hadith__warn">Pas de connexion : hadith affiché depuis la réserve de l\'application.</p>';

  $('#hadith-note').innerHTML = note;
  $('#hadith-loading').hidden = true;
  $('#hadith-content').hidden = false;
}

const INFOS = [
  { tag: 'Rappel',     text: 'Le jeûne du lundi et du jeudi est une sunna régulière du Prophète ﷺ.' },
  { tag: 'Calendrier', text: 'Les jours blancs (13, 14, 15 du mois hégirien) approchent — pense à les noter.' },
  { tag: 'Conseil',    text: 'Place tes adhkar du matin juste après la prière du Fajr : le geste devient automatique.' },
  { tag: 'Communauté', text: 'Une aumône, même petite, chaque vendredi : c\'est une habitude simple à tenir.' }
];

function afficherInfos() {
  $('#info-list').innerHTML = INFOS.map(i =>
    `<li><b>${i.tag}</b>${echapper(i.text)}</li>`).join('');
}

/* ─── Feuille « Ajouter / Modifier une intention » ──────── */
let frequenceChoisie = 'daily';
let jourChoisi       = Store.dateDepuisCle(JOUR).getDay();
let tacheEnEdition   = null;

function ouvrirFeuille(t) {
  tacheEnEdition = t || null;

  $('#sheet-title').textContent  = t ? 'Modifier l\'intention' : 'Nouvelle intention';
  $('#sheet-submit').textContent = t ? 'Enregistrer' : 'Ajouter';
  $('#f-name').value = t ? t.nom : '';
  $('#f-time').value = t ? t.heure : '';
  choisirJour(t ? Store.jourSemaineDe(t) : Store.dateDepuisCle(JOUR).getDay());
  choisirFrequence(t ? t.frequence : 'daily');

  $('#sheet-backdrop').hidden = false;
  $('#sheet').hidden = false;
  setTimeout(() => $('#f-name').focus(), 120);
}

function fermerFeuille() {
  $('#sheet-backdrop').hidden = true;
  $('#sheet').hidden = true;
  tacheEnEdition = null;
  $('#task-form').reset();
  $('#f-name').classList.remove('has-error');
  $('#f-name-err').hidden = true;
  choisirFrequence('daily');
}

function choisirFrequence(f) {
  frequenceChoisie = f;
  $$('#f-freq .chip').forEach(c => {
    const actif = c.dataset.freq === f;
    c.classList.toggle('is-on', actif);
    c.setAttribute('aria-checked', actif);
  });
  // Le choix du jour n'a de sens que pour une intention hebdomadaire
  $('#f-day-wrap').hidden = (f !== 'weekly');
}

function choisirJour(j) {
  jourChoisi = Number(j);
  $$('#f-day .day').forEach(b => {
    const actif = Number(b.dataset.day) === jourChoisi;
    b.classList.toggle('is-on', actif);
    b.setAttribute('aria-checked', actif);
  });
}

/* ─── Menu d'une intention : modifier / dhikr / supprimer ─ */
let tacheDuMenu = null;

function ouvrirMenu(t) {
  tacheDuMenu = t;
  $('#menu-name').textContent = t.nom;
  $('#menu-confirm').hidden = true;
  $('#menu-choices').hidden = false;
  $('#menu-backdrop').hidden = false;
  $('#menu-sheet').hidden = false;
}

function fermerMenu() {
  $('#menu-backdrop').hidden = true;
  $('#menu-sheet').hidden = true;
  tacheDuMenu = null;
}

/* ═══════════════════════════════════════════════════════════
   La bibliothèque de dhikr
   ═══════════════════════════════════════════════════════════ */

let biblioTache  = null;     // l'intention que l'on garnit
let biblioCat    = 'matin';
let biblioChoix  = [];       // la liste voulue à la sortie
let biblioAvant  = new Map();// ce qui existait déjà, rangé par dhikr
const biblioOuverts = new Set();

function ouvrirBiblio(t) {
  biblioTache = t;
  biblioAvant = new Map();
  biblioOuverts.clear();

  biblioChoix = Store.sousTachesDe(t).map(s => {
    const copie = { id: s.id, nom: s.nom, repetitions: s.repetitions, refBiblio: s.refBiblio };
    if (s.refBiblio) biblioAvant.set(s.refBiblio, copie);
    return copie;
  });

  biblioCat = categoriePour(t);
  $('#biblio-for').textContent = t.nom;
  // Le bandeau ne s'affiche que s'il reste au moins un texte non relu.
  $('#biblio-warn').hidden = BIBLIO.every(d => d.verifie);

  afficherBiblioCats();
  afficherBiblio();
  $('#biblio').hidden = false;
  $('#biblio-back').focus();
}

function fermerBiblio() {
  $('#biblio').hidden = true;
  biblioTache = null;
}

/* On devine la bonne catégorie d'après le nom de l'intention :
   « Adhkar du matin » ouvre directement sur les dhikr du matin. */
function categoriePour(t) {
  const n = t.nom.toLowerCase();
  if (n.indexOf('matin') !== -1) return 'matin';
  if (n.indexOf('soir') !== -1)  return 'soir';
  if (n.indexOf('dormir') !== -1 || n.indexOf('coucher') !== -1 || n.indexOf('nuit') !== -1) return 'avant-dormir';
  if (n.indexOf('prière') !== -1 || n.indexOf('priere') !== -1 || n.indexOf('salat') !== -1) return 'apres-priere';
  return BIBLIO_CATS.length ? BIBLIO_CATS[0].id : 'matin';
}

function afficherBiblioCats() {
  $('#biblio-cats').innerHTML = BIBLIO_CATS.map(c => `
    <button type="button" class="chip ${c.id === biblioCat ? 'is-on' : ''}"
            role="radio" aria-checked="${c.id === biblioCat}" data-cat="${c.id}">${c.nom}</button>`).join('');

  $$('#biblio-cats .chip').forEach(b => b.addEventListener('click', () => {
    biblioCat = b.dataset.cat;
    afficherBiblioCats();
    afficherBiblio();
  }));
}

function afficherBiblio() {
  const boite = $('#biblio-list');
  boite.innerHTML = '';

  const dhikrs = BIBLIO.filter(d => (d.categories || []).indexOf(biblioCat) !== -1);

  if (!dhikrs.length) {
    boite.innerHTML = '<p class="note">Aucun dhikr dans cette catégorie pour le moment.</p>';
  }
  dhikrs.forEach(d => boite.appendChild(ligneBiblio(d)));

  // Les dhikr que l'utilisateur a écrits lui-même n'appartiennent à
  // aucune catégorie : on les montre à part, pour pouvoir les retirer.
  const perso = biblioChoix.filter(c => !c.refBiblio);
  if (perso.length) {
    const titre = document.createElement('h2');
    titre.className = 'section-title';
    titre.textContent = 'Tes propres dhikr';
    boite.appendChild(titre);
    perso.forEach(c => boite.appendChild(lignePerso(c)));
  }

  majCompteurBiblio();
}

function ligneBiblio(d) {
  const choisi = biblioChoix.some(c => c.refBiblio === d.id);
  const ouvert = biblioOuverts.has(d.id);

  const el = document.createElement('div');
  el.className = 'bib' + (choisi ? ' is-on' : '') + (ouvert ? ' is-open' : '');
  el.innerHTML = `
    <div class="bib__ligne">
      <button class="bib__hit" aria-pressed="${choisi}"
              aria-label="${echapper(d.nom)}${choisi ? ' : dans ma liste' : ' : à ajouter'}">
        <span class="bib__box">${CHECK_SVG}</span>
        <span class="bib__body">
          <span class="bib__nom">${echapper(d.nom)}</span>
          <span class="bib__src">${echapper(d.source)}</span>
        </span>
        <span class="bib__fois">${d.repetitions}×</span>
      </button>
      <button class="bib__voir" aria-expanded="${ouvert}" aria-label="Voir le texte de ${echapper(d.nom)}">
        <span class="bib__chev" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span>
      </button>
    </div>
    <div class="bib__texte"${ouvert ? '' : ' hidden'}>${texteDuDhikr(d)}</div>`;

  el.querySelector('.bib__hit').addEventListener('click', () => {
    const i = biblioChoix.findIndex(c => c.refBiblio === d.id);
    if (i !== -1) {
      biblioChoix.splice(i, 1);
    } else {
      // S'il était déjà là avant, on récupère son identifiant : ce qui a
      // été coché aujourd'hui n'est pas perdu.
      biblioChoix.push(biblioAvant.get(d.id) ||
        { nom: d.nom, repetitions: d.repetitions, refBiblio: d.id });
    }
    afficherBiblio();
  });

  el.querySelector('.bib__voir').addEventListener('click', () => {
    if (biblioOuverts.has(d.id)) biblioOuverts.delete(d.id); else biblioOuverts.add(d.id);
    afficherBiblio();
  });

  return el;
}

function lignePerso(c) {
  const el = document.createElement('div');
  el.className = 'bib is-on';
  el.innerHTML = `
    <div class="bib__ligne">
      <button class="bib__hit" aria-pressed="true" aria-label="${echapper(c.nom)} : dans ma liste">
        <span class="bib__box">${CHECK_SVG}</span>
        <span class="bib__body">
          <span class="bib__nom">${echapper(c.nom)}</span>
          <span class="bib__src">Écrit par toi</span>
        </span>
        <span class="bib__fois">${c.repetitions}×</span>
      </button>
    </div>`;

  el.querySelector('.bib__hit').addEventListener('click', () => {
    const i = biblioChoix.indexOf(c);
    if (i !== -1) biblioChoix.splice(i, 1);
    afficherBiblio();
  });
  return el;
}

function texteDuDhikr(d) {
  let html = '';
  if (d.arabe)      html += `<p class="arabe" lang="ar" dir="rtl">${echapper(d.arabe)}</p>`;
  if (d.phonetique) html += `<p class="lecture__pho">${echapper(d.phonetique)}</p>`;
  if (d.traduction) html += `<p class="lecture__trad">${echapper(d.traduction)}</p>`;
  if (!d.verifie) {
    html += '<p class="lecture__warn">Texte pas encore relu par une personne de science.</p>';
  }
  return html || '<p class="lecture__trad">Ce dhikr n\'a pas encore de texte.</p>';
}

function majCompteurBiblio() {
  const n = biblioChoix.length;
  $('#biblio-count').textContent =
    n === 0 ? 'Aucun dhikr choisi' : n === 1 ? '1 dhikr choisi' : n + ' dhikr choisis';
}

/* ─── Feuille de lecture d'un dhikr ─────────────────────── */
let lectureCtx = null;

function ouvrirLecture(t, s, d, liSous, liParent) {
  // adhkar.js se corrige à la main : si un identifiant disparaît, on
  // affiche la feuille sans texte plutôt que de casser l'application.
  d = d || {};
  lectureCtx = { t, s, liSous, liParent };

  $('#lecture-nom').textContent  = s.nom;
  $('#lecture-fois').textContent = s.repetitions > 1
    ? `À répéter ${s.repetitions} fois` : 'Une fois';

  remplir('#lecture-arabe', d.arabe);
  remplir('#lecture-pho',   d.phonetique);
  remplir('#lecture-trad',  d.traduction);
  remplir('#lecture-src',   d.source);
  $('#lecture-warn').hidden = !!d.verifie;

  $('#lecture-done').textContent = Store.sousFaite(s.id, JOUR) ? 'Décocher' : 'C\'est fait';
  $('#lecture-backdrop').hidden = false;
  $('#lecture').hidden = false;
}

function remplir(sel, valeur) {
  const el = $(sel);
  el.textContent = valeur || '';
  el.hidden = !valeur;
}

function fermerLecture() {
  $('#lecture-backdrop').hidden = true;
  $('#lecture').hidden = true;
  lectureCtx = null;
}

/* ─── Utilitaire ────────────────────────────────────────── */
function echapper(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ─── Branchements ──────────────────────────────────────── */
$$('[data-go]').forEach(el => el.addEventListener('click', () => {
  const cible = el.dataset.go;
  if (cible === 'add') ouvrirFeuille(); else aller(cible);
}));

$('#fab').addEventListener('click', () => ouvrirFeuille());
$('#sheet-cancel').addEventListener('click', fermerFeuille);
$('#sheet-backdrop').addEventListener('click', fermerFeuille);
$('#menu-backdrop').addEventListener('click', fermerMenu);
$('#menu-cancel').addEventListener('click', fermerMenu);
$('#lecture-backdrop').addEventListener('click', fermerLecture);
$('#lecture-close').addEventListener('click', fermerLecture);
$('#biblio-back').addEventListener('click', fermerBiblio);

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('#perso-sheet').hidden)     fermerPerso();
  else if (!$('#lecture').hidden)    fermerLecture();
  else if (!$('#biblio').hidden)     fermerBiblio();
  else if (!$('#menu-sheet').hidden) fermerMenu();
  else if (!$('#sheet').hidden)      fermerFeuille();
});

$$('#f-freq .chip').forEach(c =>
  c.addEventListener('click', () => choisirFrequence(c.dataset.freq)));

$$('#f-day .day').forEach(b =>
  b.addEventListener('click', () => choisirJour(b.dataset.day)));

$('#task-form').addEventListener('submit', e => {
  e.preventDefault();
  const nom = $('#f-name').value.trim();
  if (!nom) {
    $('#f-name').classList.add('has-error');
    $('#f-name-err').hidden = false;
    $('#f-name').focus();
    return;
  }

  const champs = {
    nom,
    frequence:   frequenceChoisie,
    heure:       $('#f-time').value || '',
    jourSemaine: frequenceChoisie === 'weekly' ? jourChoisi : null
  };

  if (tacheEnEdition) {
    Store.modifierTache(tacheEnEdition.id, champs);
    fermerFeuille();
    afficherTaches();
    toast('Intention modifiée ✍️');
  } else {
    Store.ajouterTache(champs);
    fermerFeuille();
    aller('today');
    afficherTaches();
    toast('Intention ajoutée — qu\'Allah te facilite 🤍');
  }
  planifierRappels();
});

$('#f-name').addEventListener('input', () => {
  $('#f-name').classList.remove('has-error');
  $('#f-name-err').hidden = true;
});

$('#menu-edit').addEventListener('click', () => {
  const t = tacheDuMenu;
  fermerMenu();
  ouvrirFeuille(t);
});

$('#menu-dhikr').addEventListener('click', () => {
  const t = tacheDuMenu;
  fermerMenu();
  ouvrirBiblio(t);
});

$('#menu-delete').addEventListener('click', () => {
  $('#menu-choices').hidden = true;
  $('#menu-confirm').hidden = false;
});

$('#confirm-no').addEventListener('click', () => {
  $('#menu-confirm').hidden = true;
  $('#menu-choices').hidden = false;
});

$('#confirm-yes').addEventListener('click', () => {
  Store.supprimerTache(tacheDuMenu.id);
  fermerMenu();
  afficherTaches();
  toast('Intention retirée. Ce qui est accompli reste inscrit.');
  planifierRappels();
});

/* La bibliothèque */
$('#biblio-save').addEventListener('click', () => {
  const t = biblioTache;
  Store.remplacerSousTaches(t.id, biblioChoix);
  if (Store.sousTachesDe(t).length) depliees.add(t.id); else depliees.delete(t.id);
  fermerBiblio();
  afficherTaches();
  planifierRappels();
  toast('Ta liste de dhikr est à jour 🤍');
});

$('#lecture-done').addEventListener('click', () => {
  if (!lectureCtx) return;
  const { t, s, liSous, liParent } = lectureCtx;
  fermerLecture();
  basculerSous(t, s, liSous, liParent);
});

/* Écrire son propre dhikr */
function ouvrirPerso() {
  $('#p-nom').value  = '';
  $('#p-fois').value = 1;
  $('#p-nom-err').hidden = true;
  $('#p-nom').classList.remove('has-error');
  $('#perso-backdrop').hidden = false;
  $('#perso-sheet').hidden = false;
  setTimeout(() => $('#p-nom').focus(), 120);
}

function fermerPerso() {
  $('#perso-backdrop').hidden = true;
  $('#perso-sheet').hidden = true;
}

$('#biblio-perso').addEventListener('click', ouvrirPerso);
$('#perso-cancel').addEventListener('click', fermerPerso);
$('#perso-backdrop').addEventListener('click', fermerPerso);

$('#perso-form').addEventListener('submit', e => {
  e.preventDefault();
  const nom = $('#p-nom').value.trim();
  if (!nom) {
    $('#p-nom').classList.add('has-error');
    $('#p-nom-err').hidden = false;
    $('#p-nom').focus();
    return;
  }
  biblioChoix.push({
    nom,
    repetitions: Math.max(1, Number($('#p-fois').value) || 1),
    refBiblio: null
  });
  fermerPerso();
  afficherBiblio();
});

$('#p-nom').addEventListener('input', () => {
  $('#p-nom').classList.remove('has-error');
  $('#p-nom-err').hidden = true;
});

$('#theme-toggle').addEventListener('click', () => appliquerTheme(!Store.reglages().sombre));
$('#set-dark').addEventListener('change', e => appliquerTheme(e.target.checked));

$('#set-quiet').addEventListener('change', e => {
  Store.reglerOption('silenceNuit', e.target.checked);
  planifierRappels();
});

$('#btn-demo').addEventListener('click', () => {
  Store.chargerDemo();
  appliquerTheme(Store.reglages().sombre);
  depliees.clear();
  toutAfficher();
  aller('today');
  toast('Données d\'exemple chargées ↺');
});

$('#btn-clear').addEventListener('click', () => {
  Store.repartirDeZero();
  appliquerTheme(Store.reglages().sombre);
  depliees.clear();
  toutAfficher();
  aller('today');
  // Repartir de zéro, c'est comme une première ouverture
  $('#welcome-1').hidden = false;
  $('#welcome-2').hidden = true;
  $('#welcome').hidden = false;
});

$('#hadith-refresh').addEventListener('click', () => chargerHadith(true));

/* ─── Écran de bienvenue et packs de départ ─────────────── */

/* Quels dhikr arrivent déjà dans « Adhkar du matin » et « Adhkar du soir ».
   L'utilisateur pourra en ajouter ou en retirer ensuite. */
const DEPART = {
  matin: ['ayat-kursi', 'sourate-ikhlas', 'sourate-falaq', 'sourate-nas',
          'bika-asbahna', 'sayyid-istighfar', 'subhanallah-bihamdih-100', 'salat-nabi-10'],
  soir:  ['ayat-kursi', 'sourate-ikhlas', 'sourate-falaq', 'sourate-nas',
          'bika-amsayna', 'sayyid-istighfar', 'kalimat-tammat', 'salat-nabi-10']
};

const PACKS = [
  { id: 'coran',  ico: '📖', nom: 'Coran quotidien', desc: 'Une page chaque jour',
    taches: [{ nom: 'Lire une page de Coran', frequence: 'daily', heure: '07:30' }] },

  { id: 'adhkar', ico: '🌅', nom: 'Adhkar matin et soir', desc: 'Avec 8 dhikr déjà prêts dans chacun',
    taches: [{ nom: 'Adhkar du matin', frequence: 'daily', heure: '08:00', depuis: 'matin' },
             { nom: 'Adhkar du soir',  frequence: 'daily', heure: '18:30', depuis: 'soir' }] },

  { id: 'sunna',  ico: '🌙', nom: 'Sunna de la semaine', desc: 'Jeûne du lundi, sourate Al-Kahf le vendredi',
    taches: [{ nom: 'Jeûner le lundi',        frequence: 'weekly', heure: '', jourSemaine: 1 },
             { nom: 'Lire sourate Al-Kahf',   frequence: 'weekly', heure: '', jourSemaine: 5 }] },

  { id: 'liens',  ico: '🤝', nom: 'Bienfaisance', desc: 'Aumône et liens familiaux',
    taches: [{ nom: 'Faire une aumône (sadaqa)',        frequence: 'weekly', heure: '',      jourSemaine: 5 },
             { nom: 'Prendre des nouvelles d\'un proche', frequence: 'weekly', heure: '19:00', jourSemaine: 0 }] },

  { id: 'savoir', ico: '🧠', nom: 'Apprendre', desc: 'Un hadith nouveau chaque jour',
    taches: [{ nom: 'Apprendre un nouveau hadith', frequence: 'daily', heure: '21:00' }] }
];

const packsChoisis = new Set(['coran', 'adhkar']);

function afficherPacks() {
  $('#packs').innerHTML = PACKS.map(p => `
    <button type="button" class="pack ${packsChoisis.has(p.id) ? 'is-on' : ''}"
            data-pack="${p.id}" aria-pressed="${packsChoisis.has(p.id)}"
            aria-label="${echapper(p.nom)}">
      <span class="pack__ico" aria-hidden="true">${p.ico}</span>
      <span class="pack__body">
        <span class="pack__name">${p.nom}</span>
        <span class="pack__desc">${p.desc}</span>
      </span>
      <span class="pack__dot">${CHECK_SVG}</span>
    </button>`).join('');

  $$('#packs .pack').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.pack;
    if (packsChoisis.has(id)) packsChoisis.delete(id); else packsChoisis.add(id);
    afficherPacks();
  }));
}

/* Transforme un modèle de pack en intention prête à créer, en allant
   chercher ses dhikr dans la bibliothèque quand il y en a. */
function tacheDepuisModele(m) {
  const t = {
    nom: m.nom, frequence: m.frequence, heure: m.heure,
    jourSemaine: m.jourSemaine === undefined ? null : m.jourSemaine
  };
  if (m.depuis) {
    t.sousTaches = (DEPART[m.depuis] || [])
      .map(id => dhikrDeLaBiblio(id))
      .filter(Boolean)
      .map(d => ({ nom: d.nom, repetitions: d.repetitions, refBiblio: d.id }));
  }
  return t;
}

function terminerBienvenue(avecPacks) {
  if (avecPacks) {
    // On ajoute dans l'ordre inverse : ajouterTache empile par le haut
    PACKS.filter(p => packsChoisis.has(p.id))
      .flatMap(p => p.taches)
      .reverse()
      .forEach(m => Store.ajouterTache(tacheDepuisModele(m)));
  }
  Store.marquerAccueilli();
  $('#welcome').hidden = true;
  toutAfficher();
  planifierRappels();
  if (avecPacks && packsChoisis.size) toast('Ta liste est prête — qu\'Allah te facilite 🤍');
}

$('#w-next').addEventListener('click', () => {
  $('#welcome-1').hidden = true;
  $('#welcome-2').hidden = false;
  afficherPacks();
});
$('#w-done').addEventListener('click', () => terminerBienvenue(true));
$('#w-skip').addEventListener('click', () => terminerBienvenue(false));

/* ─── Installer sur l'écran d'accueil ───────────────────── */
let inviteInstallation = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  inviteInstallation = e;
  if (localStorage.getItem('ibadah-install-masque') !== '1') {
    $('#install-bar').hidden = false;
  }
});

$('#install-yes').addEventListener('click', async () => {
  if (!inviteInstallation) return;
  $('#install-bar').hidden = true;
  inviteInstallation.prompt();
  await inviteInstallation.userChoice;
  inviteInstallation = null;
});

$('#install-no').addEventListener('click', () => {
  $('#install-bar').hidden = true;
  try { localStorage.setItem('ibadah-install-masque', '1'); } catch (e) {}
});

window.addEventListener('appinstalled', () => {
  $('#install-bar').hidden = true;
  toast('Ibadah est installée 🤍');
});

/* ─── Le gardien hors-ligne ─────────────────────────────── */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* pas de mode hors-ligne : l'appli fonctionne quand même */
    });
  });
}

/* ─── Démarrage ─────────────────────────────────────────── */
function toutAfficher() {
  afficherDate();
  afficherPrieres();
  afficherTaches();
  afficherInfos();
  $('#set-quiet').checked = Store.reglages().silenceNuit;
}

appliquerTheme(Store.reglages().sombre);
toutAfficher();
chargerHadith(false);

if (!Store.estAccueilli()) $('#welcome').hidden = false;
