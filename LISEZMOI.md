# Ibadah Daily Planner

Un carnet doux pour ne rien oublier de son quotidien spirituel.
Tout reste sur l'appareil de la personne : rien n'est envoyé sur internet,
sauf la recherche du hadith du jour.

---

## Travailler sur l'appli (sur ton ordinateur)

Ouvre une fenêtre de commande dans ce dossier et lance :

```
python serve.py
```

Puis ouvre `http://localhost:5173` dans ton navigateur.

Pour arrêter le serveur : `Ctrl` + `C`.

> Pourquoi ne pas juste double-cliquer sur `index.html` ?
> Parce qu'une page ouverte comme un fichier n'a pas le droit de s'installer
> sur un téléphone ni de fonctionner hors-ligne. Il lui faut une vraie
> adresse `http://...`.

**Astuce de test :** ajoute `?jour=2026-08-15` à l'adresse pour voir
à quoi ressemblera l'appli à une autre date, sans attendre.

---

## L'appli en ligne

**https://mucahitt69.github.io/ibadah-daily-planner/**

Hébergée gratuitement par GitHub Pages, sans limite ni crédit.
Ouvre cette adresse sur ton téléphone, puis « Ajouter à l'écran d'accueil ».

### Publier une modification

Trois commandes, dans cet ordre :

```
python publier.py
git add -A
git commit -m "ce que j'ai change"
git push
```

`publier.py` recopie l'application dans le dossier **`docs`** — c'est ce
dossier-là que GitHub met en ligne. Les fichiers de travail (`.claude`,
archives) sont exclus et ne partent jamais sur internet.

Compte une à deux minutes entre le `git push` et l'apparition de la
nouvelle version en ligne.

> Si le site ne se met pas à jour sur ton téléphone : ferme complètement
> l'appli et rouvre-la. Le mode hors-ligne garde une copie de l'ancienne
> version jusqu'au prochain démarrage.

---

## À quoi sert chaque fichier

| Fichier | Rôle |
|---|---|
| `index.html` | La structure de tous les écrans |
| `styles.css` | Toutes les couleurs, tailles et animations |
| `store.js` | **Le carnet** : les données, les dates, les récurrences, les calculs |
| `adhkar.js` | La bibliothèque de dhikr d'origine |
| `feuille.js` | Va chercher les dhikr ajoutés depuis ta feuille Google |
| `modele-adhkar.csv` | Le modèle à importer dans Google Sheets |
| `app.js` | L'affichage : dessine à l'écran ce que dit le carnet |
| `rappels.js` | Les notifications |
| `sw.js` | Le mode hors-ligne |
| `manifest.webmanifest` | La carte d'identité de l'appli (nom, icône, couleur) |
| `icons/` | L'icône dorée |
| `serve.py` | Le serveur pour travailler en local |
| `publier.py` | Recopie l'application dans `docs/` pour la mise en ligne |

Le dossier `docs/` est fabriqué automatiquement : ne le modifie jamais à la
main, tes changements seraient écrasés. Modifie les fichiers de la racine.
Le dossier `.claude/` contient les outils de l'assistant.

---

## Ajouter des dhikr sans toucher au code

Tu peux ajouter des dhikr depuis une **feuille Google**, sans ouvrir un seul
fichier de code. Tu écris une ligne, et le dhikr apparaît dans la
bibliothèque de tout le monde.

Personne d'autre ne peut écrire dans ta feuille : c'est ton compte Google
qui garde la porte. L'application, elle, se contente de **lire**. C'est ça,
le « mode admin » — il n'y a aucun mot de passe à retenir dans l'appli.

### À faire une seule fois

1. Va sur [sheets.google.com](https://sheets.google.com) → **Fichier → Importer**
   → dépose `modele-adhkar.csv`. Les bonnes colonnes sont déjà en place.
2. Menu **Fichier → Partager → Publier sur le Web**.
3. Choisis **« Valeurs séparées par des virgules (.csv) »**, puis **Publier**.
4. Copie le lien que Google affiche.
5. Ouvre `feuille.js`, et colle ce lien entre les apostrophes de la
   toute première ligne de réglage :

   ```
   const FEUILLE_URL = 'colle-le-lien-ici';
   ```

6. Publie l'application (`python publier.py`, puis `git add -A`,
   `git commit`, `git push`).

C'est fini. Tu n'auras plus jamais à refaire ces étapes.

### Ensuite, au quotidien

Tu ouvres ta feuille, tu ajoutes une ligne, et c'est tout.

| Colonne | Ce qu'on y met |
|---|---|
| **Nom** | Le titre affiché. **Obligatoire** — une ligne sans nom est ignorée. |
| **Categories** | Quand il apparaît, séparés par des virgules. Au choix : `matin`, `soir`, `apres-priere`, `avant-dormir`, `general`. Si tu laisses vide, il ira dans « À tout moment ». |
| **Arabe** | Le texte en arabe |
| **Phonetique** | La prononciation en lettres latines |
| **Traduction** | Le sens en français |
| **Source** | D'où vient le texte |
| **Repetitions** | Combien de fois. Vide ou illisible = 1. |
| **Verifie** | `oui` seulement si une personne de science a relu. Tout le reste, y compris vide, veut dire **non** — et l'avertissement reste affiché. |

L'ordre des colonnes n'a aucune importance, et les accents ou majuscules
dans les titres sont acceptés (`Répétitions` = `repetitions`).

### Trois choses à savoir

- **Ce n'est pas instantané.** Google garde une copie quelques minutes.
  Ajoute ta ligne, patiente un peu, puis rouvre l'appli.
- **Hors connexion, l'appli garde la dernière version reçue.** Tes ajouts
  restent visibles dans le métro.
- **Si la feuille est mal remplie, ou injoignable, l'appli continue de
  marcher** avec les dhikr qu'elle avait déjà. Elle ne peut pas se vider
  ni planter à cause de la feuille.

> Le lien publié est lisible par toute personne qui l'a. Ce n'est pas
> gênant — ces textes sont faits pour être vus dans l'appli. Ce qui compte,
> c'est que personne ne puisse *modifier* : ça, seul ton compte Google le peut.

---

## Le principe à ne jamais casser

L'appli n'écrit **jamais** « faite » sur une tâche.
Elle tient un **carnet avec une page par jour** :

```
journal["2026-08-11"] = { taches: [3, 7], prieres: ["Fajr", "Dhuhr"] }
```

Demain, la page est vierge → la tâche revient toute seule.
Et comme les points, la série de jours et les statistiques sont
**recalculés depuis ce carnet**, ils ne peuvent jamais être faux.

---

## Ce qui reste à faire

- Les hadiths viennent d'une traduction française **non vérifiée** par une
  autorité religieuse. Une relecture par une personne de science est
  nécessaire avant de partager l'appli largement.
- La page « Infos importantes » contient encore des textes d'exemple.
- Les rappels ne fonctionnent que si l'appli est ouverte ou en arrière-plan.
  Un site web ne peut pas réveiller un téléphone quand il est fermé,
  sauf à ajouter un serveur.
