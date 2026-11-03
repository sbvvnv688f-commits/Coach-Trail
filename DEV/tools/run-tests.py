"""Exécute les tests de DEV/tests/ dans Chrome (ou Edge) sans interface : aucune fenêtre ouverte.

Chrome est essayé en premier : sur ce poste, Edge rend la main au processus déjà ouvert sans rien écrire.

Usage :
  python DEV/tools/run-tests.py                     lance les tests, affiche le rapport
  python DEV/tools/run-tests.py --capture URL SORTIE.png [LARGEURxHAUTEUR]
                                                    capture d'écran d'une page servie localement
                                                    (URL relative à la racine, ex. docs/?fiche=...)
"""
import html
import re
import subprocess
import sys
import tempfile
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from serve import demarrer  # noqa: E402

NAVIGATEURS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]


def navigateur():
    for chemin in NAVIGATEURS:
        if Path(chemin).exists():
            return chemin
    sys.exit("Ni Chrome ni Edge trouvé.")


def lancer(args, profil):
    commande = [navigateur(), "--headless=new", "--disable-gpu", "--no-first-run",
                "--no-default-browser-check", "--hide-scrollbars", f"--user-data-dir={profil}", *args]
    return subprocess.run(commande, capture_output=True, text=True, encoding="utf-8", timeout=120)


def tests():
    _, port = demarrer()
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as profil:
        res = lancer(["--virtual-time-budget=20000", "--dump-dom",
                      f"http://127.0.0.1:{port}/DEV/tests/index.html"], profil)
    m = re.search(r'<pre id="rapport"[^>]*>(.*?)</pre>', res.stdout, re.S)
    if not m:
        print(res.stdout[-3000:])
        print(res.stderr[-2000:])
        sys.exit("Rapport de test introuvable.")
    rapport = html.unescape(m.group(1)).strip()
    print(rapport)
    sys.exit(0 if "ÉCHEC" not in rapport and "RÉSULTAT" in rapport else 1)


def capture(url, sortie, taille="390x844"):
    # La page est affichée dans un cadre (DEV/tests/cadre.html) à la taille demandée : Chrome impose
    # une fenêtre d'au moins ~500 px de large. L'image garde une marge grise à droite.
    largeur, hauteur = taille.split("x")
    _, port = demarrer()
    cible = urllib.parse.quote(f"/{avec_attente(url.lstrip('/'))}", safe="")
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as profil:
        lancer(["--virtual-time-budget=15000", f"--window-size={max(int(largeur), 520)},{hauteur}",
                "--force-device-scale-factor=2", f"--screenshot={Path(sortie).resolve()}",
                f"http://127.0.0.1:{port}/DEV/tests/cadre.html?l={largeur}&h={hauteur}&url={cible}"], profil)
    print(f"Capture : {sortie}")


def avec_attente(url):
    # Ajoute ?attendre avant le fragment : l'application tient la page occupée jusqu'à la fin du démarrage.
    chemin, _, fragment = url.partition("#")
    chemin += ("&" if "?" in chemin else "?") + "attendre"
    return chemin + (f"#{fragment}" if fragment else "")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) >= 4 and sys.argv[1] == "--capture":
        capture(*sys.argv[2:5])
    else:
        tests()
