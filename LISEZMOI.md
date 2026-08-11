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
