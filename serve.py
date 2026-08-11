# ═══════════════════════════════════════════════════════════
# Ibadah Daily Planner — petit serveur pour travailler en local
# ───────────────────────────────────────────────────────────
# Une page web ne peut pas s'installer sur un téléphone ni
# fonctionner hors-ligne si on l'ouvre par double-clic : il lui
# faut une vraie adresse « http://... ». Ce fichier la fournit.
#
# Pour le lancer à la main :   python serve.py
# ═══════════════════════════════════════════════════════════

import functools
import http.server
import os
import pathlib
import socketserver

# Le port est donné par l'outil de prévisualisation (variable PORT).
# Sans lui, on prend 5173 par défaut.
PORT = int(os.environ.get("PORT") or 5173)

DOSSIER = pathlib.Path(__file__).resolve().parent


class Handler(http.server.SimpleHTTPRequestHandler):

    # Le navigateur refuse d'installer l'application si le manifeste
    # n'est pas annoncé avec le bon type. On le lui dit explicitement.
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json",
        ".json": "application/json",
        ".js": "text/javascript",
        ".css": "text/css",
    }

    def end_headers(self):
        # En développement, on interdit au navigateur de garder des copies :
        # sinon une modification de fichier ne se voit pas au rechargement.
        self.send_header("Cache-Control", "no-store, max-age=0")

        # Autorise une autre page ouverte dans le navigateur à lire ces
        # fichiers. Sert à déposer l'archive sur un hébergeur sans avoir à
        # la faire transiter ailleurs. Sans risque : ce serveur n'écoute que
        # sur cet ordinateur (127.0.0.1), aucune machine extérieure ne l'atteint.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Allow-Headers", "*")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def log_message(self, format, *args):
        # Journal plus court et lisible
        print("  %s" % (format % args), flush=True)


# Un serveur qui traite plusieurs demandes en même temps.
# Sans cela, une seule connexion restée ouverte (le navigateur en garde
# souvent) suffirait à bloquer tout le reste.
class Serveur(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    gestionnaire = functools.partial(Handler, directory=str(DOSSIER))
    with Serveur(("127.0.0.1", PORT), gestionnaire) as httpd:
        print(f"Ibadah Daily Planner  ->  http://localhost:{PORT}", flush=True)
        print(f"Dossier servi         :  {DOSSIER}", flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("Serveur arrêté.", flush=True)
