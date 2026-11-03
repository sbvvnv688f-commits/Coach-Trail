r"""Test du formulaire athlète : génération, remplissage fictif, lecture du brouillon.

Valeurs entièrement fictives. Usage :
    "%LOCALAPPDATA%\casse-pattes\.venv-formulaire\Scripts\python.exe" DEV/tests/formulaire_test.py
"""
import datetime as dt
import importlib.util
import sys
import tempfile
from pathlib import Path

from pypdf import PdfReader, PdfWriter

OUTILS = Path(__file__).resolve().parents[1] / "tools"


def charger(nom):
    spec = importlib.util.spec_from_file_location(nom.replace("-", "_"), OUTILS / f"{nom}.py")
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


sys.stdout.reconfigure(encoding="utf-8")
gen, lire = charger("formulaire-athlete"), charger("lire-formulaire")

REPONSES = {
    "toi.prenom": "Alex", "toi.age": "40", "toi.ceinture": "/ceinture",
    "coeur.fcMax": "190", "coeur.fcMaxDate": "12/05/2026", "coeur.fcMaxType": "/course",
    "seance.s1.date": "2026-10-20", "seance.s1.km": "10", "seance.s1.duree": "1h00", "seance.s1.dplus": "100", "seance.s1.fc": "143",
    "seance.s2.date": "2026-10-22", "seance.s2.km": "12,5", "seance.s2.duree": "65", "seance.s2.fc": "160",
    "course.nom": "Trail de printemps", "course.date": "2026-05-17", "course.km": "30", "course.dplus": "1200", "course.temps": "3h30",
    "volume.km": "45", "volume.dplus": "1400",
    "dispo.j2.ok": "/Yes", "dispo.j2.duree": "1h15", "dispo.j2.ponctuelle": "2h",
    "dispo.j4.ok": "/Yes", "dispo.j4.duree": "1h",
    "dispo.j7.ok": "/Yes", "dispo.j7.duree": "3h",
    "dispo.longueJour": "/7", "dispo.longueMax": "/18000",
    "absence.a1.du": "2026-12-24", "absence.a1.au": "2026-12-27", "absence.a1.motif": "fêtes",
    "obj.nom": "Trail d'exemple", "obj.date": "13/06/2027", "obj.km": "42", "obj.dplus": "2000",
    "obj.technicite": "/mixte", "obj.batons": "/oui",
    "activite.skiFond.ok": "/Yes", "activite.skiFond.remplace": "/Yes",
    "renfo.tapis": "/Yes", "renfo.seances": "/2",
}

echecs = 0


def verifier(cond, message):
    global echecs
    print(("ok   " if cond else "ÉCHEC") + " " + message)
    echecs += not cond


with tempfile.TemporaryDirectory() as d:
    vierge, rempli = Path(d) / "vierge.pdf", Path(d) / "rempli.pdf"
    f = gen.Formulaire(vierge)
    gen.construire(f)
    n = f.fin()
    champs = PdfReader(vierge).get_fields()
    verifier(len(champs) == n and n > 100, f"{n} champs, tous lisibles")
    verifier(all(nom in champs for nom in REPONSES), "chaque champ du test existe dans le formulaire")

    w = PdfWriter(clone_from=vierge)
    for page in w.pages:
        w.update_page_form_field_values(page, REPONSES, auto_regenerate=False)
    w.write(rempli)

    v = lire.lire_champs(rempli)
    verifier(len(v) == len(REPONSES), f"{len(v)} réponses relues sur {len(REPONSES)}")
    b = lire.construire(v, dt.date(2026, 11, 3))

verifier(b["athlete"]["id"] == "alex", "identifiant tiré du prénom")
verifier(b["coeur"]["fcMax"] == 190 and b["coeur"]["fcMaxDate"] == "2026-05-12", "FC max et date JJ/MM/AAAA")
s1, s2 = b["seancesReference"][:2]
verifier(s1["allure"] == 360 and s1["allurePlat"] == 348, "footing : 6'00 brut, 5'48 ajusté du D+")
verifier(s2["distance"] == 12500 and s2["duree"] == 3900, "virgule décimale et durée en minutes")
verifier(b["reference"]["temps"] == 12600, "temps de course 3h30")
verifier(b["etat"]["volumeHebdo"] == 45000, "volume en mètres")
jours = {j["jour"]: j for j in b["disponibilites"]["jours"]}
verifier(sorted(jours) == [2, 4, 7] and jours[2]["dureeMaxPonctuelle"] == 7200, "jours cochés et durée ponctuelle")
verifier(b["disponibilites"]["longue"] == {"jour": 7, "dureeMax": 18000}, "sortie longue le dimanche, 5 h")
o = b["objectifs"][0]
verifier(o["date"] == "2027-06-13" and o["jourSemaine"] == "dimanche", "date d'objectif contrôlée (dimanche)")
verifier(o["batons"] is True and o["technicite"] == "mixte", "boutons radio relus")
verifier(b["activites"]["skiFond"]["peutRemplacer"], "activité et case « peut remplacer »")
verifier(b["renfo"] == {"materiel": ["tapis"], "pratique": None, "seancesParSemaine": 2}, "renforcement")
verifier(b["aDemander"] == [], f"rien à demander pour un formulaire complet ({b['aDemander']})")
verifier(not b["alertes"], f"aucune alerte ({b['alertes']})")

vide = lire.construire({}, dt.date(2026, 11, 3))
verifier(len(vide["aDemander"]) >= 8, f"formulaire vide : {len(vide['aDemander'])} éléments à demander")

print(f"\n{'Tous les tests passent' if not echecs else f'{echecs} échec(s)'}")
sys.exit(1 if echecs else 0)
