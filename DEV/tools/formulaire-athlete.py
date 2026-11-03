"""Génère le formulaire athlète vierge : un PDF remplissable, sans connexion ni script.

L'athlète le remplit dans Fichiers (iPhone), Aperçu, Acrobat Reader ou un navigateur, puis le renvoie.
DEV/tools/lire-formulaire.py en tire un brouillon de fiche. Les noms de champs (« coeur.fcMax »,
« dispo.j2.duree »…) sont le contrat entre les deux scripts : les changer ici impose de les changer là.

Contrôles utilisés : champs de texte, cases et boutons radio, les seuls fiables sur iOS. Aucun JavaScript.

Dépendances : reportlab (voir DEV/tools/requirements-formulaire.txt), dans un environnement dédié :
    "%LOCALAPPDATA%\\casse-pattes\\.venv-formulaire\\Scripts\\python.exe" DEV/tools/formulaire-athlete.py [sortie.pdf]
"""
import sys
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen.canvas import Canvas

RACINE = Path(__file__).resolve().parents[2]
SORTIE = RACINE / "DEV" / "formulaire" / "Casse-Pattes-formulaire-athlete.pdf"
LOGO = RACINE / "docs" / "icons" / "icon-512.png"
VERSION = "1"

# Palette de docs/css/tokens.css
PAPIER, CARTE, ENCRE, DOUX = HexColor("#F4F3EE"), HexColor("#FFFFFF"), HexColor("#16281F"), HexColor("#55645B")
TRAIT, SAPIN, SAPIN_PALE, BISTRE = HexColor("#DAD8D0"), HexColor("#2E6B4F"), HexColor("#E4EDE7"), HexColor("#9C6B3F")

LARGEUR, HAUTEUR = A4
MARGE = 40
UTILE = LARGEUR - 2 * MARGE
H_CHAMP = 20


class Formulaire:
    def __init__(self, chemin):
        self.c = Canvas(str(chemin), pagesize=A4)
        self.c.setTitle("Casse-Pattes — formulaire athlète")
        self.c.setAuthor("Casse-Pattes")
        self.c.setSubject("Questionnaire pour construire une fiche athlète")
        self.noms = set()
        self.page = 0
        self.nouvelle_page()

    # ---------- mise en page ----------
    def nouvelle_page(self):
        if self.page:
            self.c.showPage()
        self.page += 1
        self.c.setFillColor(PAPIER)
        self.c.rect(0, 0, LARGEUR, HAUTEUR, stroke=0, fill=1)
        self.c.setFont("Helvetica", 8)
        self.c.setFillColor(DOUX)
        self.c.drawString(MARGE, 22, f"Casse-Pattes · formulaire athlète · version {VERSION}")
        self.c.drawRightString(LARGEUR - MARGE, 22, f"page {self.page}")
        self.y = HAUTEUR - MARGE

    def place(self, h):
        if self.y - h < 40:
            self.nouvelle_page()

    def texte(self, s, taille=10, couleur=ENCRE, police="Helvetica", largeur=UTILE, x=MARGE, interligne=1.35):
        lignes = simpleSplit(s, police, taille, largeur)
        self.place(len(lignes) * taille * interligne)
        self.c.setFont(police, taille)
        self.c.setFillColor(couleur)
        for l in lignes:
            self.y -= taille * interligne
            self.c.drawString(x, self.y, l)
        return self

    def espace(self, h=8):
        self.y -= h
        return self

    def section(self, numero, titre, intro=None):
        self.place(150)
        self.espace(10)
        self.c.setFillColor(SAPIN)
        self.c.rect(MARGE, self.y - 24, UTILE, 24, stroke=0, fill=1)
        self.c.setFillColor(CARTE)
        self.c.setFont("Helvetica-Bold", 13)
        self.c.drawString(MARGE + 10, self.y - 17, f"{numero}. {titre}")
        self.y -= 30
        if intro:
            self.texte(intro, 9, DOUX)
        self.espace(4)

    # ---------- champs ----------
    def _nom(self, nom):
        assert nom not in self.noms, f"champ en double : {nom}"
        self.noms.add(nom)
        return nom

    def _texte(self, nom, x, y, l, h, aide, multi=False):
        self.c.acroForm.textfield(
            name=self._nom(nom), tooltip=aide or nom, x=x, y=y, width=l, height=h,
            borderStyle="solid", borderWidth=0.8, borderColor=TRAIT, fillColor=CARTE, textColor=ENCRE,
            forceBorder=True, fontName="Helvetica", fontSize=0 if multi else 10,
            fieldFlags="multiline" if multi else "", maxlen=None)

    def _case(self, nom, x, y, aide, taille=14):
        self.c.acroForm.checkbox(
            name=self._nom(nom), tooltip=aide, x=x, y=y, size=taille, buttonStyle="check",
            borderStyle="solid", borderWidth=0.8, borderColor=SAPIN, fillColor=CARTE, textColor=SAPIN,
            forceBorder=True)

    def ligne(self, champs):
        """champs : liste de (nom, libellé, aide, part de la largeur). Libellé au-dessus, aide en dessous."""
        aides = any(a for _, _, a, _ in champs)
        self.place(14 + H_CHAMP + (12 if aides else 0) + 6)
        x = MARGE
        y_lib = self.y - 11
        for nom, lib, aide, part in champs:
            l = UTILE * part - (8 if part < 1 else 0)
            self.c.setFont("Helvetica-Bold", 9)
            self.c.setFillColor(ENCRE)
            self.c.drawString(x, y_lib, lib)
            self._texte(nom, x, y_lib - 4 - H_CHAMP, l, H_CHAMP, aide)
            if aide:
                self.c.setFont("Helvetica", 7.5)
                self.c.setFillColor(DOUX)
                self.c.drawString(x, y_lib - 4 - H_CHAMP - 9, simpleSplit(aide, "Helvetica", 7.5, l)[0])
            x += UTILE * part
        self.y = y_lib - 4 - H_CHAMP - (12 if aides else 0) - 6
        return self

    def zone(self, nom, lib, aide=None, lignes=3):
        h = 14 * lignes + 6
        self.place(14 + h + (12 if aide else 0) + 6)
        self.c.setFont("Helvetica-Bold", 9)
        self.c.setFillColor(ENCRE)
        self.c.drawString(MARGE, self.y - 11, lib)
        self._texte(nom, MARGE, self.y - 15 - h, UTILE, h, aide, multi=True)
        self.y -= 15 + h
        if aide:
            self.c.setFont("Helvetica", 7.5)
            self.c.setFillColor(DOUX)
            self.c.drawString(MARGE, self.y - 9, aide)
            self.y -= 12
        self.y -= 6
        return self

    def choix(self, nom, lib, options, aide=None):
        """Boutons radio sur une ligne (une seule réponse). options : liste de (valeur ASCII, libellé).
        Forme carrée : la forme ronde de reportlab s'affiche avec un double cercle."""
        self.place(36)
        self.c.setFont("Helvetica-Bold", 9)
        self.c.setFillColor(ENCRE)
        self.c.drawString(MARGE, self.y - 11, lib)
        y = self.y - 31
        x = MARGE
        self._nom(nom)
        for valeur, libelle in options:
            l = 14 + 6 + self.c.stringWidth(libelle, "Helvetica", 9.5) + 16
            if x + l > MARGE + UTILE:
                x, y = MARGE, y - 20
            self.c.acroForm.radio(
                name=nom, value=valeur, selected=False, tooltip=f"{lib} {libelle}", x=x, y=y, size=14,
                buttonStyle="check", shape="square", borderStyle="solid", borderWidth=0.8,
                borderColor=SAPIN, fillColor=CARTE, textColor=SAPIN, forceBorder=True)
            self.c.setFont("Helvetica", 9.5)
            self.c.setFillColor(ENCRE)
            self.c.drawString(x + 20, y + 3.5, libelle)
            x += l
        self.y = y - 6
        if aide:
            self.texte(aide, 7.5, DOUX)
        self.y -= 6
        return self

    def cases(self, lib, options):
        """Cases à cocher sur une ligne. options : liste de (nom, libellé)."""
        self.place(36)
        self.c.setFont("Helvetica-Bold", 9)
        self.c.setFillColor(ENCRE)
        self.c.drawString(MARGE, self.y - 11, lib)
        y, x = self.y - 31, MARGE
        for nom, libelle in options:
            l = 14 + 6 + self.c.stringWidth(libelle, "Helvetica", 9.5) + 16
            if x + l > MARGE + UTILE:
                x, y = MARGE, y - 20
            self._case(nom, x, y, libelle)
            self.c.setFont("Helvetica", 9.5)
            self.c.setFillColor(ENCRE)
            self.c.drawString(x + 20, y + 3.5, libelle)
            x += l
        self.y = y - 12
        return self

    def tableau(self, prefixe, colonnes, lignes, larg_entete=0.0):
        """colonnes : (id, titre, sous-titre, part, type « texte » ou « case ») ;
        lignes : (id, libellé). Champ : <prefixe>.<ligne>.<colonne>."""
        hl = H_CHAMP + 4
        self.place(30 + hl * min(len(lignes), 3))
        x0 = MARGE + UTILE * larg_entete
        reste = UTILE - UTILE * larg_entete
        x = x0
        self.c.setFillColor(ENCRE)
        for _, titre, sous, part, _ in colonnes:
            self.c.setFont("Helvetica-Bold", 8.5)
            self.c.setFillColor(ENCRE)
            self.c.drawString(x, self.y - 10, titre)
            if sous:
                self.c.setFont("Helvetica", 7)
                self.c.setFillColor(DOUX)
                self.c.drawString(x, self.y - 19, sous)
            x += reste * part
        self.y -= 24
        for id_l, lib in lignes:
            self.place(hl)
            if larg_entete:
                self.c.setFont("Helvetica-Bold", 9)
                self.c.setFillColor(ENCRE)
                for i, l in enumerate(simpleSplit(lib, "Helvetica-Bold", 9, UTILE * larg_entete - 6)[:2]):
                    self.c.drawString(MARGE, self.y - 9 - i * 10, l)
            x = x0
            for id_c, titre, _, part, genre in colonnes:
                l = reste * part - 5
                nom = f"{prefixe}.{id_l}.{id_c}"
                if genre == "case":
                    self._case(nom, x + 2, self.y - H_CHAMP + 3, f"{lib} : {titre}")
                else:
                    self._texte(nom, x, self.y - H_CHAMP, l, H_CHAMP, f"{lib} : {titre}")
                x += reste * part
            self.y -= hl
        self.y -= 6
        return self

    def fin(self):
        self.c.save()
        return len(self.noms)


DATE = "AAAA-MM-JJ"


def construire(f: Formulaire):
    # ---------- accueil ----------
    if LOGO.exists():
        f.c.drawImage(str(LOGO), MARGE, f.y - 64, 64, 64, mask="auto")
    f.c.setFillColor(ENCRE)
    f.c.setFont("Helvetica-Bold", 24)
    f.c.drawString(MARGE + 80, f.y - 30, "Casse-Pattes")
    f.c.setFont("Helvetica", 13)
    f.c.setFillColor(SAPIN)
    f.c.drawString(MARGE + 80, f.y - 50, "Formulaire athlète")
    f.y -= 84
    f.texte("Ce formulaire sert à construire ta fiche athlète. L'application Casse-Pattes la lit pour générer "
            "ton plan d'entraînement : séances jour par jour, charge progressive, temps visés pour ta course. "
            "Décris ce que tu fais vraiment ; les choix d'entraînement sont faits ensuite à partir de tes réponses.", 10.5)
    f.espace(6)
    f.texte("Compte une vingtaine de minutes. Les champs marqués * sont indispensables ; laisse vide ce que tu ne "
            "sais pas, une question te sera posée plus tard si besoin.", 10.5)

    f.espace(10)
    f.texte("Remplir et renvoyer", 12, SAPIN, "Helvetica-Bold")
    for l in [
        "Sur iPhone : enregistre le PDF dans Fichiers, ouvre-le, touche un champ pour écrire. Les modifications "
        "sont enregistrées en quittant (bouton OK).",
        "Sur ordinateur : ouvre-le avec Acrobat Reader (gratuit), Aperçu sur Mac ou un navigateur, remplis, "
        "puis « Enregistrer » ou « Enregistrer sous ».",
        "Renvoie le PDF rempli par mail ou message. Aucune connexion n'est nécessaire pour le remplir.",
        "Si possible, joins les fichiers de montre (FIT) de tes 4 à 6 dernières séances représentatives, "
        "et de ta dernière course : ils permettent de caler tes allures sur des mesures réelles.",
    ]:
        f.texte("–  " + l, 10, largeur=UTILE - 12, x=MARGE + 6)
        f.espace(3)

    f.espace(8)
    f.texte("Formats", 12, SAPIN, "Helvetica-Bold")
    f.texte("Dates : AAAA-MM-JJ (2027-04-25) ou JJ/MM/AAAA.   Durées : 1h15 ou 75 (minutes).   "
            "Distances en km (12,5).   Dénivelé positif (D+) en mètres.   Fréquence cardiaque (FC) en battements par minute.   "
            "Sous une question à choix, une seule case peut être cochée.", 10)

    f.espace(8)
    f.texte("Confidentialité", 12, SAPIN, "Helvetica-Bold")
    f.texte("Tes réponses ne sont lues que par ton coach, pour écrire ta fiche. La fiche t'est remise comme un "
            "fichier personnel que tu importes toi-même dans l'application : elle n'est jamais publiée en ligne et "
            "l'application ne l'envoie nulle part. Accède à ton plan quiconque détient ta fiche : ne la partage "
            "qu'avec qui tu veux. Les questions de santé servent seulement à adapter la prudence du plan ; elles "
            "ne remplacent pas un avis médical.", 10)

    # ---------- 1 ----------
    f.section(1, "Toi")
    f.ligne([("toi.prenom", "Prénom *", None, 0.4), ("toi.age", "Âge", "en années", 0.2),
             ("toi.anneesCourse", "Course à pied depuis", "en années", 0.2), ("toi.anneesTrail", "Trail depuis", "en années", 0.2)])
    f.ligne([("toi.montre", "Montre (marque et modèle)", "ex. Suunto Race, Garmin Fenix 7", 0.6),
             ("toi.contact", "Contact (facultatif)", "mail ou téléphone", 0.4)])
    f.choix("toi.ceinture", "Mesure du cœur", [("ceinture", "ceinture cardio"), ("poignet", "capteur au poignet"), ("aucune", "aucune mesure")])

    # ---------- 2 ----------
    f.section(2, "Fréquence cardiaque",
              "La FC max sert à calculer tes zones d'entraînement. Donne la plus haute valeur vue sur ta montre, "
              "en fin de course ou de côte à fond, et dis sur quelle séance.")
    f.ligne([("coeur.fcMax", "FC max observée", "bpm", 0.25), ("coeur.fcMaxDate", "Date", DATE, 0.25),
             ("coeur.fcMaxSeance", "Sur quelle séance ?", "ex. sprint final du trail de…", 0.5)])
    f.choix("coeur.fcMaxType", "Cette valeur vient", [("test", "d'un test à fond"), ("course", "d'une course"), ("seance", "d'une séance"), ("inconnu", "je ne sais pas")])
    f.ligne([("coeur.fcRepos", "FC au repos (facultatif)", "bpm, le matin au réveil", 0.35)])

    # ---------- 3 ----------
    f.section(3, "Séances récentes de référence",
              "Une séance typique de chaque genre, des 2 derniers mois, telle que ta montre l'a enregistrée. "
              "Ce sont elles qui fixent tes allures.")
    f.tableau("seance", [
        ("date", "Date", DATE, 0.15, "texte"), ("km", "Distance", "km", 0.11, "texte"),
        ("duree", "Durée", "1h05", 0.11, "texte"), ("dplus", "D+", "m", 0.1, "texte"),
        ("fc", "FC moy.", "bpm", 0.12, "texte"), ("ressenti", "Ressenti, terrain", "facile, dur, plat…", 0.41, "texte"),
    ], [("s1", "Footing facile"), ("s2", "Séance soutenue (tempo, fractionné)"), ("s3", "Sortie longue"), ("s4", "Sortie avec montée raide")],
        larg_entete=0.2)
    f.zone("seance.details", "Déroulé de la séance soutenue", "ex. 15 min échauffement, 3 × 8 min vite récup 3 min, 10 min retour au calme", 2)
    f.ligne([("seance.montee", "En montée raide, combien de mètres de D+ en 1 h ?", "m/h (si tu le sais)", 0.6)])

    # ---------- 4 ----------
    f.section(4, "Dernière course représentative", "La plus récente qui ressemble à ce que tu prépares.")
    f.ligne([("course.nom", "Nom", None, 0.4), ("course.date", "Date", DATE, 0.2), ("course.km", "Distance", "km", 0.13),
             ("course.dplus", "D+", "m", 0.13), ("course.temps", "Temps", "5h12", 0.14)])
    f.zone("course.deroule", "Comment s'est-elle passée ?", "départ, ravitaillement, crampes, coup de moins bien, fin de course", 3)

    # ---------- 5 ----------
    f.section(5, "Ton entraînement actuel", "Moyenne des 4 dernières semaines.")
    f.ligne([("volume.km", "Km par semaine *", "km", 0.25), ("volume.dplus", "D+ par semaine", "m", 0.25),
             ("volume.sorties", "Sorties par semaine", "nombre", 0.25), ("volume.plusLongue", "Plus longue sortie récente", "km ou durée", 0.25)])
    f.zone("volume.etat", "Comment te sens-tu en ce moment ?", "fatigue, courbatures, reprise après une pause…", 2)

    # ---------- 6 ----------
    f.section(6, "Santé",
              "Pour adapter la prudence du plan. Une douleur qui dure ou un symptôme inhabituel en effort mérite "
              "l'avis d'un médecin avant de reprendre l'entraînement.")
    f.zone("sante.blessures", "Blessures passées", "type, année, ce qui a aidé", 2)
    f.zone("sante.douleurs", "Douleurs ou gênes actuelles", "où, depuis quand, quand elles apparaissent", 2)
    f.zone("sante.symptomes", "Symptômes en effort", "digestion, crampes, malaises, respiration…", 2)
    f.ligne([("sante.medical", "Avis médical déjà obtenu", "sur quoi, quand", 0.6),
             ("sante.traitement", "Traitement qui modifie la FC", "ex. bêtabloquant", 0.4)])

    # ---------- 7 ----------
    f.section(7, "Disponibilités",
              "Coche les jours où tu peux courir. Durée habituelle : ce que tu peux faire chaque semaine ; "
              "ponctuelle : ce que tu peux faire de temps en temps pour une séance importante.")
    jours = [("j1", "Lundi"), ("j2", "Mardi"), ("j3", "Mercredi"), ("j4", "Jeudi"), ("j5", "Vendredi"), ("j6", "Samedi"), ("j7", "Dimanche")]
    f.tableau("dispo", [
        ("ok", "Dispo", None, 0.1, "case"), ("duree", "Durée habituelle", "1h15", 0.2, "texte"),
        ("ponctuelle", "Ponctuellement", "2h", 0.2, "texte"), ("remarque", "Remarque", "midi, soir, piste…", 0.5, "texte"),
    ], jours, larg_entete=0.15)
    f.choix("dispo.longueJour", "Jour de la sortie longue *", [("6", "samedi"), ("7", "dimanche"), ("autre", "autre jour")])
    f.choix("dispo.longueMax", "Durée maximale de la sortie longue *",
            [("7200", "2 h"), ("10800", "3 h"), ("14400", "4 h"), ("18000", "5 h"), ("21600", "6 h"), ("journee", "une journée")])
    f.place(130)
    f.texte("Absences prévues (vacances, déplacements, fêtes)", 9, ENCRE, "Helvetica-Bold")
    f.espace(4)
    f.tableau("absence", [("du", "Du", DATE, 0.25, "texte"), ("au", "Au", DATE, 0.25, "texte"),
                          ("motif", "Motif", "et possibilité de courir sur place", 0.5, "texte")],
              [("a1", ""), ("a2", ""), ("a3", ""), ("a4", "")])

    # ---------- 8 ----------
    f.section(8, "Terrain")
    f.choix("terrain.relief", "Autour de chez toi", [("plat", "plat"), ("vallonne", "vallonné"), ("montagne", "montagne")])
    f.ligne([("terrain.dplus", "D+ habituel d'une sortie d'1 h", "m", 0.4),
             ("terrain.cotes", "Côte praticable en semaine", "longueur, pente, temps d'accès", 0.6)])
    f.choix("terrain.technique", "Terrain technique (rochers, racines, descentes raides)", [("rarement", "rarement"), ("parfois", "parfois"), ("souvent", "souvent")])
    f.choix("terrain.batons", "Bâtons", [("jamais", "jamais"), ("parfois", "parfois"), ("toujours", "toujours en montagne")])

    # ---------- 9 ----------
    f.section(9, "Autres activités",
              "Peut remplacer une séance : par exemple une sortie en ski de randonnée à la place d'une sortie longue.")
    f.tableau("activite", [("ok", "Pratiquée", None, 0.14, "case"), ("frequence", "Fréquence, saison", "1 fois/sem. l'hiver", 0.56, "texte"),
                           ("remplace", "Peut remplacer", "une séance", 0.3, "case")],
              [("velo", "Vélo"), ("skiRando", "Ski de randonnée"), ("skiFond", "Ski de fond"), ("natation", "Natation"), ("autre", "Autre (préciser)")],
              larg_entete=0.22)
    f.ligne([("activite.autre.nom", "Autre activité", None, 0.5)])

    # ---------- 10 ----------
    f.section(10, "Objectifs", "La course principale est celle pour laquelle tout le plan est construit.")
    f.ligne([("obj.nom", "Course principale *", None, 0.45), ("obj.date", "Date *", DATE, 0.2),
             ("obj.km", "Distance *", "km", 0.17), ("obj.dplus", "D+ *", "m", 0.18)])
    f.ligne([("obj.lieu", "Lieu ou site de la course", None, 1)])
    f.choix("obj.technicite", "Terrain de la course", [("roulant", "roulant"), ("mixte", "mixte"), ("technique", "technique")])
    f.choix("obj.batons", "Bâtons sur la course", [("oui", "oui"), ("non", "non"), ("inconnu", "je ne sais pas")])
    f.choix("obj.ambition", "Ambition", [("finir", "finir en forme"), ("temps", "un temps visé"), ("place", "un classement")])
    f.ligne([("obj.tempsVise", "Temps visé (si tu en as un)", "6h30", 0.35)])
    f.place(110)
    f.espace(4)
    f.texte("Autres courses envisagées (préparation ou objectif secondaire)", 9, ENCRE, "Helvetica-Bold")
    f.espace(4)
    f.tableau("course2", [("nom", "Nom", None, 0.4, "texte"), ("date", "Date", DATE, 0.18, "texte"),
                          ("km", "Distance", "km", 0.12, "texte"), ("dplus", "D+", "m", 0.12, "texte"),
                          ("statut", "Statut", "sûre, possible", 0.18, "texte")],
              [("c1", ""), ("c2", ""), ("c3", "")])

    # ---------- 11 ----------
    f.section(11, "Habitudes")
    f.choix("habitude.depart", "En course, tu pars trop vite", [("souvent", "souvent"), ("parfois", "parfois"), ("rarement", "rarement")])
    f.choix("habitude.footing", "En footing facile, tu cours plutôt", [("tropVite", "trop vite"), ("juste", "à la bonne allure"), ("inconnu", "je ne sais pas")])
    f.zone("habitude.aimees", "Séances que tu aimes", None, 2)
    f.zone("habitude.evitees", "Séances que tu évites ou supportes mal", None, 2)

    # ---------- 12 ----------
    f.section(12, "Renforcement musculaire")
    f.cases("Matériel disponible", [("renfo.tapis", "tapis"), ("renfo.elastiques", "élastiques"), ("renfo.halteres", "haltères"),
                                    ("renfo.marche", "marche ou banc"), ("renfo.salle", "salle de sport")])
    f.zone("renfo.pratique", "Exercices déjà pratiqués", "gainage, squats, mollets…", 2)
    f.choix("renfo.seances", "Séances de 20 min possibles par semaine", [("0", "aucune"), ("1", "1"), ("2", "2"), ("3", "3 ou plus")])

    # ---------- 13 ----------
    f.section(13, "Autre chose à dire ?")
    f.zone("commentaires", "Commentaires", "contraintes, envies, questions", 6)
    f.espace(16)
    f.texte("Merci ! Enregistre ce PDF, puis renvoie-le à ton coach avec tes fichiers de montre si tu en as.", 11, SAPIN, "Helvetica-Bold")


def main():
    sortie = Path(sys.argv[1]) if len(sys.argv) > 1 else SORTIE
    sortie.parent.mkdir(parents=True, exist_ok=True)
    f = Formulaire(sortie)
    construire(f)
    n = f.fin()
    print(f"{sortie} : {f.page} pages, {n} champs")


if __name__ == "__main__":
    main()
