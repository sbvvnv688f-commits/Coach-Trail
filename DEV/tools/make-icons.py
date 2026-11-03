"""Génère les icônes de l'application à partir du logo 09A (DEV/specs/logo-09a.svg).

Rendu par Chrome sans interface, police Barlow Condensed chargée depuis Google Fonts au moment du rendu
(connexion nécessaire). Icônes plein cadre : iOS et Android arrondissent eux-mêmes les angles.

Usage : python DEV/tools/make-icons.py
"""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from importlib import import_module  # noqa: E402

RACINE = Path(__file__).resolve().parents[2]
SOURCE = RACINE / "DEV" / "specs" / "logo-09a.svg"
SORTIE = RACINE / "docs" / "icons"
TAILLES = [180, 192, 512]

navigateur = import_module("run-tests").navigateur


def main():
    svg = SOURCE.read_text(encoding="utf-8")
    svg = re.sub(r"<!--.*?-->", "", svg, flags=re.S)
    svg = svg.replace('rx="22.5"', 'rx="0"')
    SORTIE.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        for taille in TAILLES:
            page = Path(tmp) / f"icone-{taille}.html"
            corps = re.sub(r'width="\d+" height="\d+"', f'width="{taille}" height="{taille}"', svg, count=1)
            page.write_text(
                "<!doctype html><meta charset='utf-8'>"
                "<link rel='stylesheet' href='https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800&display=block'>"
                f"<style>html,body{{margin:0;overflow:hidden;background:#F4F3EE}}svg{{display:block}}</style>{corps}",
                encoding="utf-8")
            sortie = SORTIE / f"icon-{taille}.png"
            subprocess.run([navigateur(), "--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars",
                            f"--user-data-dir={Path(tmp) / 'profil'}", "--virtual-time-budget=8000",
                            f"--window-size={taille},{taille}", "--force-device-scale-factor=1",
                            f"--screenshot={sortie}", page.as_uri()], capture_output=True, timeout=120)
            print(f"{sortie.relative_to(RACINE)} : {'ok' if sortie.exists() else 'ÉCHEC'}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
