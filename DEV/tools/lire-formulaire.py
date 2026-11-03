"""Lit un formulaire athlète rempli et écrit un brouillon de fiche à côté du PDF.

Le brouillon (<prenom>.brouillon.json) n'est pas importable dans l'application : il rassemble les réponses
en unités SI (m, s, bpm, s/km) et liste les manques et incohérences. La fiche définitive s'écrit ensuite
selon le guide de DEV/specs/fiche-athlete.md (allures déduites des séances, rôle des jours, plafonds).

Les PDF remplis et les brouillons contiennent des données personnelles : uniquement dans
Projets_Perso-Dev-IA/Casse-Pattes-fiches/reponses/, jamais dans le dépôt.

Usage :
    "%LOCALAPPDATA%\\casse-pattes\\.venv-formulaire\\Scripts\\python.exe" DEV/tools/lire-formulaire.py reponse.pdf [--sortie brouillon.json]
"""
import argparse
import datetime as dt
import json
import re
import sys
import unicodedata
from pathlib import Path

from pypdf import PdfReader

JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
SEANCES = {"s1": "footing", "s2": "soutenue", "s3": "longue", "s4": "montee"}
ACTIVITES = ["velo", "skiRando", "skiFond", "natation", "autre"]
PENALITE_D_PLUS = 120  # s par 100 m, valeur calibrée (CLAUDE.md)


def lire_champs(chemin):
    champs = PdfReader(str(chemin)).get_fields() or {}
    v = {}
    for nom, c in champs.items():
        x = c.get("/V")
        if x is None:
            continue
        x = str(x).strip()
        if x.startswith("/"):  # case ou bouton radio
            x = x[1:]
            if x == "Off":
                continue
        if x:
            v[nom] = x
    return v


def nombre(s):
    if s is None:
        return None
    m = re.search(r"-?\d+(?:[.,]\d+)?", s.replace(" ", "").replace(" ", ""))
    return float(m.group().replace(",", ".")) if m else None


def duree(s):
    """« 1h15 », « 1:15 », « 1 h », « 75 », « 45 min », « 5h12'30 » → secondes."""
    if not s:
        return None
    t = s.lower().replace(" ", "")
    m = re.fullmatch(r"(\d+)[h:](\d{1,2})?(?:[:'m](\d{1,2}))?(?:min|s|'')?", t)
    if m:
        return int(m.group(1)) * 3600 + int(m.group(2) or 0) * 60 + int(m.group(3) or 0)
    m = re.fullmatch(r"(\d+)(?:min|mn|m)?", t)
    if m:
        return int(m.group(1)) * 60
    return None


def date(s):
    if not s:
        return None
    s = s.strip()
    for motif, ordre in [(r"(\d{4})-(\d{1,2})-(\d{1,2})", "amj"), (r"(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})", "jma"),
                         (r"(\d{1,2})[/.-](\d{1,2})[/.-](\d{2})", "jma")]:
        m = re.fullmatch(motif, s)
        if m:
            a, b, c = map(int, m.groups())
            j, mo, an = (c, b, a) if ordre == "amj" else (a, b, c if c > 99 else 2000 + c)
            try:
                return dt.date(an, mo, j)
            except ValueError:
                return None
    return None


def metres(s_km):
    k = nombre(s_km)
    return round(k * 1000) if k is not None else None


def entier(s):
    n = nombre(s)
    return round(n) if n is not None else None


def slug(prenom):
    s = unicodedata.normalize("NFKD", prenom).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-") or "athlete"


def construire(v, aujourd_hui):
    alertes, a_demander = [], []

    def texte(nom):
        return v.get(nom)

    def dt_iso(nom, libelle):
        brut = v.get(nom)
        if not brut:
            return None
        d = date(brut)
        if d is None:
            alertes.append(f"{libelle} : date illisible « {brut} »")
            return None
        return d.isoformat()

    def du(nom, libelle):
        brut = v.get(nom)
        if not brut:
            return None
        s = duree(brut)
        if s is None:
            alertes.append(f"{libelle} : durée illisible « {brut} »")
        return s

    prenom = texte("toi.prenom")
    if not prenom:
        a_demander.append("prénom")
    age = entier(texte("toi.age"))

    # Fréquence cardiaque
    fc_max = entier(texte("coeur.fcMax"))
    if fc_max is not None and not 120 <= fc_max <= 230:
        alertes.append(f"FC max {fc_max} hors plage plausible (120-230)")
    if fc_max is None:
        est = f" ; estimation 208 - 0,7 × âge = {round(208 - 0.7 * age)} bpm" if age else ""
        a_demander.append(f"FC max mesurée (prévoir un test dans le plan{est})")

    # Séances de référence → allures brutes et ajustées du D+
    seances = []
    for sid, genre in SEANCES.items():
        p = f"seance.{sid}."
        s = {"genre": genre, "date": dt_iso(p + "date", f"séance {genre}"), "distance": metres(texte(p + "km")),
             "duree": du(p + "duree", f"séance {genre}"), "dplus": entier(texte(p + "dplus")),
             "fcMoy": entier(texte(p + "fc")), "ressenti": texte(p + "ressenti")}
        if not any(x is not None for k, x in s.items() if k != "genre"):
            continue
        if s["distance"] and s["duree"]:
            km = s["distance"] / 1000
            s["allure"] = round(s["duree"] / km)
            s["allurePlat"] = round((s["duree"] - (s["dplus"] or 0) / 100 * PENALITE_D_PLUS) / km)
            if not 150 <= s["allurePlat"] <= 900:
                alertes.append(f"séance {genre} : allure {s['allurePlat']} s/km peu plausible, vérifier distance et durée")
        if s["fcMoy"] and fc_max:
            s["pctFcMax"] = round(100 * s["fcMoy"] / fc_max)
        seances.append(s)
    if not any(s["genre"] == "footing" and s.get("allure") for s in seances):
        a_demander.append("une séance de footing facile complète (allure de fond)")
    if not any(s["genre"] == "soutenue" and s.get("allure") for s in seances):
        a_demander.append("une séance soutenue complète (allures tempo et seuil)")

    # Course de référence
    reference = None
    if texte("course.km") or texte("course.nom"):
        reference = {"nom": texte("course.nom"), "date": dt_iso("course.date", "dernière course"),
                     "distance": metres(texte("course.km")), "dplus": entier(texte("course.dplus")),
                     "temps": du("course.temps", "dernière course"), "commentaire": texte("course.deroule")}
        if not (reference["distance"] and reference["temps"]):
            a_demander.append("distance et temps de la dernière course (calibrage des prédictions)")
    else:
        a_demander.append("une course de référence (facultatif, améliore les temps visés)")

    # Volume
    volume = metres(texte("volume.km"))
    if volume is None:
        a_demander.append("volume hebdomadaire des 4 dernières semaines")

    # Disponibilités
    jours = []
    for i in range(1, 8):
        p = f"dispo.j{i}."
        if v.get(p + "ok") or v.get(p + "duree"):
            jours.append({"jour": i, "nom": JOURS[i - 1], "dureeMax": du(p + "duree", JOURS[i - 1]),
                          "dureeMaxPonctuelle": du(p + "ponctuelle", JOURS[i - 1]), "remarque": texte(p + "remarque")})
    if len(jours) < 2:
        alertes.append(f"{len(jours)} jour(s) disponible(s) : il en faut au moins 2")
    for j in jours:
        if j["dureeMax"] is None:
            a_demander.append(f"durée habituelle du {j['nom']}")
    longue_jour = texte("dispo.longueJour")
    longue_max = texte("dispo.longueMax")
    longue = {"jour": int(longue_jour) if longue_jour and longue_jour.isdigit() else longue_jour,
              "dureeMax": 36000 if longue_max == "journee" else entier(longue_max)}
    if longue["jour"] is None:
        a_demander.append("jour de la sortie longue")
    elif isinstance(longue["jour"], int) and longue["jour"] not in [j["jour"] for j in jours]:
        alertes.append(f"sortie longue le {JOURS[longue['jour'] - 1]}, mais ce jour n'est pas coché disponible")
    if longue["dureeMax"] is None:
        a_demander.append("durée maximale de la sortie longue")

    absences = []
    for i in range(1, 5):
        p = f"absence.a{i}."
        du_, au = dt_iso(p + "du", f"absence {i}"), dt_iso(p + "au", f"absence {i}")
        if du_ or au:
            if du_ and au and au < du_:
                alertes.append(f"absence {i} : fin avant le début")
            absences.append({"du": du_, "au": au or du_, "motif": texte(p + "motif")})

    # Objectif principal
    obj_date = dt_iso("obj.date", "course principale")
    objectif = {"priorite": "A", "nom": texte("obj.nom"), "date": obj_date, "distance": metres(texte("obj.km")),
                "dplus": entier(texte("obj.dplus")), "lieu": texte("obj.lieu"), "technicite": texte("obj.technicite"),
                "batons": {"oui": True, "non": False}.get(texte("obj.batons")), "ambition": texte("obj.ambition"),
                "tempsVise": du("obj.tempsVise", "temps visé")}
    for cle, lib in [("nom", "nom"), ("date", "date"), ("distance", "distance"), ("dplus", "D+")]:
        if objectif[cle] is None:
            a_demander.append(f"{lib} de la course principale")
    if obj_date:
        d = dt.date.fromisoformat(obj_date)
        objectif["jourSemaine"] = JOURS[d.weekday()]
        if d <= aujourd_hui:
            alertes.append(f"course principale le {obj_date} : date passée")
        else:
            objectif["semainesRestantes"] = (d - aujourd_hui).days // 7
    if objectif["technicite"] is None:
        a_demander.append("technicité de la course principale (roulant, mixte, technique)")

    secondaires = []
    for i in range(1, 4):
        p = f"course2.c{i}."
        if texte(p + "nom") or texte(p + "date"):
            d = dt_iso(p + "date", f"course secondaire {i}")
            secondaires.append({"nom": texte(p + "nom"), "date": d, "distance": metres(texte(p + "km")),
                                "dplus": entier(texte(p + "dplus")), "statut": texte(p + "statut"),
                                "jourSemaine": JOURS[dt.date.fromisoformat(d).weekday()] if d else None})
            if d and obj_date and d >= obj_date:
                alertes.append(f"course secondaire {i} après la course principale")

    activites = {}
    for a in ACTIVITES:
        p = f"activite.{a}."
        if v.get(p + "ok") or texte(p + "frequence"):
            activites[a] = {"frequence": texte(p + "frequence"), "peutRemplacer": bool(v.get(p + "remplace"))}
    if "autre" in activites:
        activites["autre"]["nom"] = texte("activite.autre.nom")

    sante = {k: texte(f"sante.{k}") for k in ["blessures", "douleurs", "symptomes", "medical", "traitement"]}
    if sante["douleurs"]:
        alertes.append("douleur actuelle signalée : à examiner avant de fixer la charge")
    if sante["traitement"]:
        alertes.append("traitement qui modifie la FC : zones de FC à confirmer")

    return {
        "format": "casse-pattes/brouillon",
        "version": 1,
        "lu": aujourd_hui.isoformat(),
        "athlete": {"id": slug(prenom or ""), "prenom": prenom, "age": age, "contact": texte("toi.contact"),
                    "anneesCourse": nombre(texte("toi.anneesCourse")), "anneesTrail": nombre(texte("toi.anneesTrail")),
                    "montre": texte("toi.montre"), "mesureCoeur": texte("toi.ceinture")},
        "coeur": {"fcMax": fc_max, "fcMaxDate": dt_iso("coeur.fcMaxDate", "FC max"), "fcMaxSeance": texte("coeur.fcMaxSeance"),
                  "fcMaxType": texte("coeur.fcMaxType"), "fcRepos": entier(texte("coeur.fcRepos"))},
        "seancesReference": seances,
        "seanceSoutenueDeroule": texte("seance.details"),
        "vitesseAscensionnelle": entier(texte("seance.montee")),
        "reference": reference,
        "etat": {"volumeHebdo": volume, "dplusHebdo": entier(texte("volume.dplus")),
                 "sortiesHebdo": entier(texte("volume.sorties")), "plusLongue": texte("volume.plusLongue"),
                 "commentaire": texte("volume.etat")},
        "sante": sante,
        "disponibilites": {"jours": jours, "longue": longue, "indisponibilites": absences},
        "terrain": {"relief": texte("terrain.relief"), "dplusParHeure": entier(texte("terrain.dplus")),
                    "cotes": texte("terrain.cotes"), "technique": texte("terrain.technique"), "batons": texte("terrain.batons")},
        "activites": activites,
        "objectifs": [objectif] + secondaires,
        "habitudes": {k: texte(f"habitude.{k}") for k in ["depart", "footing", "aimees", "evitees"]},
        "renfo": {"materiel": [m for m in ["tapis", "elastiques", "halteres", "marche", "salle"] if v.get(f"renfo.{m}")],
                  "pratique": texte("renfo.pratique"), "seancesParSemaine": entier(texte("renfo.seances"))},
        "commentaires": texte("commentaires"),
        "aDemander": a_demander,
        "alertes": alertes,
    }


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--sortie", type=Path)
    ap.add_argument("--date", help="date du jour AAAA-MM-JJ (tests)")
    a = ap.parse_args()
    aujourd_hui = dt.date.fromisoformat(a.date) if a.date else dt.date.today()
    v = lire_champs(a.pdf)
    b = construire(v, aujourd_hui)
    sortie = a.sortie or a.pdf.with_name(f"{b['athlete']['id']}.brouillon.json")
    sortie.write_text(json.dumps(b, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(v)} champs remplis → {sortie}")
    for titre, liste in [("À demander", b["aDemander"]), ("Alertes", b["alertes"])]:
        print(f"{titre} : {len(liste)}")
        for x in liste:
            print(f"  - {x}")


if __name__ == "__main__":
    main()
