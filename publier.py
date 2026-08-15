# ═══════════════════════════════════════════════════════════
# Ibadah Daily Planner — préparer le dossier à mettre en ligne
# ───────────────────────────────────────────────────────────
# Ce script fabrique un dossier « docs » qui contient UNIQUEMENT
# l'application. Les fichiers de travail (réglages, outils,
# scripts) restent sur ton ordinateur et ne sont jamais publiés.
#
# C'est ce dossier « docs » que GitHub Pages met en ligne.
#
# Pour le lancer :   python publier.py
# ═══════════════════════════════════════════════════════════

import hashlib
import pathlib
import re
import shutil

RACINE = pathlib.Path(__file__).resolve().parent
SITE = RACINE / "docs"          # GitHub Pages publie le contenu du dossier « docs »

# Les seuls fichiers qui partent en ligne.
FICHIERS = [
    "index.html",
    "styles.css",
    "store.js",
    "adhkar.js",
    "feuille.js",
    "app.js",
    "rappels.js",
    "sw.js",
    "manifest.webmanifest",
    # Exigée par le Play Store, et consultable par n'importe qui à l'adresse
    # .../confidentialite.html. Elle n'est pas estampillée : la page principale
    # ne la charge pas, elle porte sa propre mise en forme.
    "confidentialite.html",
]

DOSSIERS = ["icons"]

# Réglages destinés à un hébergeur qui lit ce fichier (Netlify, Cloudflare…).
# ⚠️ GitHub Pages, l'hébergeur actuel, l'ignore complètement. On le garde au
# cas où le site déménagerait, mais il ne faut compter dessus pour rien :
# c'est sw.js qui garantit l'arrivée des nouvelles versions, en allant
# chercher index.html sur le réseau avant de regarder sa réserve.
HEADERS = """/sw.js
  Cache-Control: no-cache

/manifest.webmanifest
  Content-Type: application/manifest+json

/index.html
  Cache-Control: no-cache
"""


# Fichiers dont le navigateur pourrait garder une vieille copie.
ESTAMPILLES = ["styles.css", "store.js", "adhkar.js", "feuille.js", "app.js", "rappels.js"]


def estampiller(dossier):
    """Colle un numéro de version sur les fichiers de l'appli.

    Sans cela, quelqu'un qui a déjà ouvert l'appli continue de voir
    l'ancienne version pendant des heures : son navigateur garde une
    copie et ne redemande pas le fichier. En changeant l'adresse
    (styles.css?v=a1b2c3), on l'oblige à télécharger la nouvelle.

    Le numéro est calculé à partir du contenu : il ne change que si
    quelque chose a réellement été modifié.
    """
    empreinte = hashlib.sha256()
    for nom in ESTAMPILLES:
        empreinte.update((dossier / nom).read_bytes())
    version = empreinte.hexdigest()[:8]

    # 1. La page principale pointe vers les adresses estampillées
    page = (dossier / "index.html").read_text(encoding="utf-8")
    for nom in ESTAMPILLES:
        page = page.replace(f'"{nom}"', f'"{nom}?v={version}"')
    (dossier / "index.html").write_text(page, encoding="utf-8")

    # 2. Le mode hors-ligne doit garder exactement les mêmes adresses,
    #    sinon il conserverait les anciennes en réserve.
    sw = (dossier / "sw.js").read_text(encoding="utf-8")
    sw = re.sub(r"const VERSION = '[^']*';", f"const VERSION = 'ibadah-{version}';", sw)
    for nom in ESTAMPILLES:
        sw = sw.replace(f"'./{nom}'", f"'./{nom}?v={version}'")
    (dossier / "sw.js").write_text(sw, encoding="utf-8")

    print(f"  version {version}  (apposée sur {len(ESTAMPILLES)} fichiers)")
    return version


def main():
    if SITE.exists():
        # On vide le dossier sans le supprimer, pour ne pas détruire
        # d'éventuels fichiers cachés de suivi de version.
        for item in SITE.iterdir():
            if item.name.startswith("."):
                continue
            shutil.rmtree(item) if item.is_dir() else item.unlink()
    else:
        SITE.mkdir()

    manquants = []

    for nom in FICHIERS:
        source = RACINE / nom
        if source.exists():
            shutil.copy2(source, SITE / nom)
            print(f"  copié   {nom}")
        else:
            manquants.append(nom)

    for nom in DOSSIERS:
        source = RACINE / nom
        if source.is_dir():
            shutil.copytree(source, SITE / nom)
            nb = len(list((SITE / nom).iterdir()))
            print(f"  copié   {nom}/  ({nb} fichiers)")
        else:
            manquants.append(nom + "/")

    estampiller(SITE)

    (SITE / "_headers").write_text(HEADERS, encoding="utf-8")
    print("  créé    _headers")

    # Sans ce fichier vide, GitHub Pages fait passer le site dans un
    # moteur de blog qui ignore tout fichier commençant par « _ ».
    (SITE / ".nojekyll").write_text("", encoding="utf-8")
    print("  créé    .nojekyll")

    print()
    if manquants:
        print("ATTENTION, fichiers introuvables : " + ", ".join(manquants))
        print()

    poids = sum(f.stat().st_size for f in SITE.rglob("*") if f.is_file())
    print(f"Dossier prêt : {SITE}")
    print(f"Poids total  : {poids / 1024:.0f} Ko")
    print()
    print("Étape suivante, pour mettre la nouvelle version en ligne :")
    print('  git add -A && git commit -m "mise à jour" && git push')


if __name__ == "__main__":
    main()
