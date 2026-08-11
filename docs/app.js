/* ═══════════════════════════════════════════════════════════
   Ibadah Daily Planner — l'affichage
   ───────────────────────────────────────────────────────────
   Ce fichier ne calcule presque rien : il demande tout à
   store.js et se contente de dessiner à l'écran.
   ═══════════════════════════════════════════════════════════ */

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>';

// Le jour affiché (la vraie date, ou celle simulée par ?jour=...)
const JOUR = Store.aujourdhui();

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
  const li = document.createElement('li');
  li.className = 'task' + (faite ? ' is-done' : '');
  li.dataset.id = t.id;

  const meta = [`<span class="task__tag">${echapper(Store.libelleFrequence(t))}</span>`];
  if (t.heure) meta.push(`<span>🔔 ${t.heure}</span>`);
  if (!faite)  meta.push(`<span class="task__pts">+${Store.PTS.tache}</span>`);

  li.innerHTML = `
    <button class="task__hit" aria-pressed="${faite}"
            aria-label="${echapper(t.nom)}${faite ? ' : terminée' : ' : à faire'}">
      <span class="check">${CHECK_SVG}</span>
      <span class="task__body">
        <span class="task__name">${echapper(t.nom)}</span>
        <span class="task__meta">${meta.join('')}</span>
      </span>
    </button>
    <button class="task__more" aria-label="Options pour ${echapper(t.nom)}">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>
      </svg>
    </button>`;

  li.querySelector('.task__hit').addEventListener('click', () => basculer(t, li, faite));
  li.querySelector('.task__more').addEventListener('click', e => {
    e.stopPropagation();
    ouvrirMenu(t);
  });
  return li;
}

function basculer(t, el, etaitFaite) {
  const cochee = Store.basculerTache(t, JOUR);

  if (cochee) {
    // Petite animation : la tâche se coche, puis glisse vers « Terminées »
    el.classList.add('is-done');
    toast(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
    setTimeout(() => el.classList.add('is-leaving'), 340);
    setTimeout(afficherTaches, 700);
  } else {
    afficherTaches();
  }
}

function afficherEnTete() {
  const p = Store.progression(JOUR);
  const total = Store.totaux();

  $('#ring-percent').textContent = p.pourcent + '%';
  $('#ring-sub').textContent     = `${p.faits} / ${p.total} accomplis`;
  $('#ring-fill').style.strokeDashoffset = 327 - (327 * p.pourcent / 100);
  $('#ring').setAttribute('aria-label',
    `Progression du jour : ${p.pourcent} pour cent, ${p.faits} sur ${p.total}`);

  $('#hero-streak').textContent = Store.serie();
  $('#hero-points').textContent = total.points.toLocaleString('fr-FR');

  $('#hero-msg').textContent =
    p.pourcent === 0  ? 'Une nouvelle journée t\'est offerte.' :
    p.pourcent < 40   ? 'Tu as commencé, c\'est le plus important.' :
    p.pourcent < 80   ? 'Belle avancée, continue tranquillement.' :
    p.pourcent < 100  ? 'Presque tout est accompli, ma sha Allah.' :
                        'Journée complète — qu\'Allah accepte de toi 🤍';
}

/* ─── Écran « Progrès » ─────────────────────────────────── */
const BADGES = [
  { ico: '🌱', nom: '7 jours d\'affilée',  gagne: (t, s) => s >= 7 },
  { ico: '🌳', nom: '30 jours d\'affilée', gagne: (t, s) => s >= 30 },
  { ico: '💯', nom: '100 actes',           gagne: (t)    => t.actes >= 100 },
  { ico: '🕌', nom: '50 prières',          gagne: (t)    => t.prieres >= 50 },
  { ico: '📖', nom: '500 points',          gagne: (t)    => t.points >= 500 },
  { ico: '⭐', nom: '2000 points',         gagne: (t)    => t.points >= 2000 }
];

function afficherStats() {
  const t = Store.totaux();
  const s = Store.serie();

  $('#st-streak').textContent  = s;
  $('#st-points').textContent  = t.points.toLocaleString('fr-FR');
  $('#st-total').textContent   = t.actes;
  $('#st-prayers').textContent = t.prieres;

  const jours = Store.septDerniersJours();
  const max   = Math.max(...jours.map(j => j.valeur), 1);

  $('#chart').innerHTML = jours.map(j => `
    <div class="chart__col">
      <div class="chart__track">
        <div class="chart__bar ${j.estCeJour ? '' : 'chart__bar--soft'}"
             style="--v:${Math.max(0.035, j.valeur / max).toFixed(3)}"
             title="${j.cle} : ${j.valeur} acte(s)"></div>
      </div>
      <span class="chart__day">${j.lettre}</span>
    </div>`).join('');

  $('#chart').setAttribute('aria-label',
    'Actes accomplis sur 7 jours : ' + jours.map(j => `${j.lettre} ${j.valeur}`).join(', '));

  $('#badges').innerHTML = BADGES.map(b => `
    <div class="badge ${b.gagne(t, s) ? 'is-won' : ''}">
      <span class="badge__ico" aria-hidden="true">${b.ico}</span>
      <span class="badge__name">${b.nom}</span>
    </div>`).join('');
}

/* ─── Écran « Hadith » ──────────────────────────────────── */

/* Réserve de secours : utilisée si internet ne répond pas.
   ⚠️ À faire relire par une personne de science avant la vraie mise en ligne. */
const HADITH_SECOURS = [
  { text: "Les actions ne valent que par les intentions, et à chacun selon son intention.",
    source: "Sahih al-Bukhari 1 — Sahih Muslim 1907",
    note: "Avant chaque acte, prends un instant pour te rappeler pour qui tu le fais." },
  { text: "L'œuvre la plus aimée d'Allah est celle qui est accomplie avec constance, même si elle est petite.",
    source: "Sahih al-Bukhari 6464 — Sahih Muslim 783",
    note: "Mieux vaut une petite chose chaque jour qu'un grand effort une seule fois." },
  { text: "Le musulman est celui dont les autres musulmans sont à l'abri de sa langue et de sa main.",
    source: "Sahih al-Bukhari 10",
    note: "La foi se voit aussi dans la façon dont on traite les gens autour de soi." },
  { text: "Souris à ton frère, c'est une aumône.",
    source: "Jami' at-Tirmidhi 1956 — hadith hasan",
    note: "Faire le bien ne demande pas toujours de l'argent." },
  { text: "Celui qui ne remercie pas les gens ne remercie pas Allah.",
    source: "Sunan Abi Dawud 4811 — hadith sahih",
    note: "Dire merci autour de soi fait partie de la gratitude envers Allah." },
  { text: "Qu'Allah fasse miséricorde à l'homme indulgent lorsqu'il vend, lorsqu'il achète et lorsqu'il réclame son dû.",
    source: "Sahih al-Bukhari 2076",
    note: "La douceur dans les affaires du quotidien est une adoration." }
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

/* ─── Feuille « Ajouter / Modifier une tâche » ──────────── */
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
  // Le choix du jour n'a de sens que pour une tâche hebdomadaire
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

/* ─── Menu d'une tâche : modifier / supprimer ───────────── */
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

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('#menu-sheet').hidden) fermerMenu();
  else if (!$('#sheet').hidden) fermerFeuille();
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

$('#theme-toggle').addEventListener('click', () => appliquerTheme(!Store.reglages().sombre));
$('#set-dark').addEventListener('change', e => appliquerTheme(e.target.checked));

$('#set-quiet').addEventListener('change', e => {
  Store.reglerOption('silenceNuit', e.target.checked);
  planifierRappels();
});

$('#btn-demo').addEventListener('click', () => {
  Store.chargerDemo();
  appliquerTheme(Store.reglages().sombre);
  toutAfficher();
  aller('today');
  toast('Données d\'exemple chargées ↺');
});

$('#btn-clear').addEventListener('click', () => {
  Store.repartirDeZero();
  appliquerTheme(Store.reglages().sombre);
  toutAfficher();
  aller('today');
  // Repartir de zéro, c'est comme une première ouverture
  $('#welcome-1').hidden = false;
  $('#welcome-2').hidden = true;
  $('#welcome').hidden = false;
});

$('#hadith-refresh').addEventListener('click', () => chargerHadith(true));

/* ─── Écran de bienvenue et packs de départ ─────────────── */
const PACKS = [
  { id: 'coran',  ico: '📖', nom: 'Coran quotidien', desc: 'Une page chaque jour',
    taches: [{ nom: 'Lire une page de Coran', frequence: 'daily', heure: '07:30' }] },

  { id: 'adhkar', ico: '🌅', nom: 'Adhkar matin et soir', desc: 'Les invocations du matin et du soir',
    taches: [{ nom: 'Adhkar du matin', frequence: 'daily', heure: '08:00' },
             { nom: 'Adhkar du soir',  frequence: 'daily', heure: '18:30' }] },

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
            data-pack="${p.id}" aria-pressed="${packsChoisis.has(p.id)}">
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

function terminerBienvenue(avecPacks) {
  if (avecPacks) {
    // On ajoute dans l'ordre inverse : ajouterTache empile par le haut
    PACKS.filter(p => packsChoisis.has(p.id))
      .flatMap(p => p.taches)
      .reverse()
      .forEach(t => Store.ajouterTache(t));
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
