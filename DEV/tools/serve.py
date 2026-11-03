"""Serveur local de développement Casse-Pattes.

Sert la racine du dépôt sur 127.0.0.1 uniquement :
  /docs/        application
  /DEV/tests/   tests
  /fiches/      dossier Casse-Pattes-fiches (hors dépôt), pour tester les vraies fiches en local

Usage : python DEV/tools/serve.py [port]
"""
import functools
import http.server
import sys
import threading
import time
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]
FICHES = RACINE.parent / "Casse-Pattes-fiches"


class Gestionnaire(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".json": "application/json",
        ".webmanifest": "application/manifest+json",
        ".svg": "image/svg+xml",
    }

    def do_GET(self):
        # Requête lente utilisée par les captures sans interface (voir docs/js/app.js, paramètre ?attendre).
        if self.path.startswith("/__attendre"):
            time.sleep(0.2)
            self.send_response(204)
            self.end_headers()
            return
        super().do_GET()

    def translate_path(self, path):
        chemin = path.split("?", 1)[0].split("#", 1)[0]
        if chemin == "/fiches" or chemin.startswith("/fiches/"):
            reste = chemin[len("/fiches"):].lstrip("/")
            return str(FICHES / reste) if reste else str(FICHES) + "/"
        return super().translate_path(path)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass


def demarrer(port=0):
    """Démarre le serveur dans un fil d'exécution ; renvoie (serveur, port)."""
    gestionnaire = functools.partial(Gestionnaire, directory=str(RACINE))
    serveur = http.server.ThreadingHTTPServer(("127.0.0.1", port), gestionnaire)
    threading.Thread(target=serveur.serve_forever, daemon=True).start()
    return serveur, serveur.server_address[1]


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    _, port = demarrer(port)
    print(f"Application : http://127.0.0.1:{port}/docs/")
    print(f"Tests       : http://127.0.0.1:{port}/DEV/tests/")
    print("Ctrl+C pour arrêter.")
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        pass
