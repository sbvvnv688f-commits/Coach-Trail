# Fiche athlète — schéma et guide d'entretien

La fiche est le **seul** fichier propre à un athlète. L'application est commune : elle lit la fiche,
génère le plan d'entraînement et calcule les objectifs.

**Règle de confidentialité.** Une fiche n'est jamais dans le dépôt Git. Claude l'écrit dans
`Projets_Perso-Dev-IA/Casse-Pattes-fiches/` (hors du dépôt) et la remet à l'utilisateur, qui la transfère
sur son téléphone et l'importe lui-même dans l'onglet Profil. Le site publié ne contient ni ne télécharge
aucune donnée d'athlète.

Nom du fichier : `<prenom>.casse-pattes.json`. Encodage UTF-8.

---

## 1. Schéma — version 1

Unités : distances en mètres, durées en secondes, allures en **secondes par kilomètre**, FC en bpm,
dates au format `AAAA-MM-JJ`. Jours de la semaine : 1 = lundi … 7 = dimanche.
Les valeurs ci-dessous sont **fictives**.

```json
{
  "format": "casse-pattes/fiche",
  "version": 1,
  "creee": "2026-11-03",
  "athlete": { "id": "alex", "prenom": "Alex" },

  "physiologie": {
    "fcMax": 190, "fcMaxSource": "mesuree",
    "allures": {
      "fond":  { "valeur": 360, "source": "sortie du 2026-05-10, 16 km à 76 % FC max" },
      "tempo": { "valeur": 320, "source": "…" },
      "seuil": { "valeur": 295, "source": "…" },
      "recup": { "valeur": 400, "source": "…" }
    },
    "vitesseAscensionnelle": 800,
    "cadence": { "cible": [160, 170] }
  },

  "terrain": { "dplusParKm": 30, "penaliteParCentM": 120 },

  "reference": {
    "nom": "Trail de printemps", "date": "2026-05-17",
    "distance": 30000, "dplus": 1200, "temps": 12600,
    "commentaire": "départ trop rapide"
  },

  "etat": {
    "volumeHebdo": 45000, "dplusHebdo": 1400,
    "commentaire": "…"
  },

  "sante": {
    "vigilances": ["…"],
    "consignes": ["Une douleur tendineuse qui persiste le lendemain impose de sauter la séance suivante."]
  },

  "disponibilites": {
    "jours": [
      { "jour": 2, "role": "qualite",  "dureeMax": 4500, "dureeMaxPonctuelle": 7200 },
      { "jour": 3, "role": "endurance", "dureeMax": 5400 },
      { "jour": 5, "role": "cotes",    "dureeMax": 5400 },
      { "jour": 7, "role": "longue",   "dureeMax": 18000 }
    ],
    "indisponibilites": [ { "du": "2026-12-24", "au": "2026-12-27", "motif": "fêtes" } ]
  },

  "activites": {
    "skiRando": { "pratique": true, "usage": "alternative" },
    "skiFond":  { "pratique": true, "usage": "alternative" }
  },

  "objectifs": [
    {
      "id": "obj1", "priorite": "A", "nom": "Trail d'exemple",
      "date": "2027-06-13", "distance": 42000, "dplus": 2000,
      "terrain": "montagne", "technicite": "mixte", "batons": true
    }
  ],

  "seancesImposees": [
    { "date": "2027-03-14", "type": "course", "nom": "Trail de préparation",
      "distance": 25000, "dplus": 1000, "consigne": "à allure de sortie longue" }
  ],

  "regles": {
    "seancesDuresParSemaine": 1,
    "plafondsFc": { "seuil": 178, "tempo": 168, "endurance": 152 }
  },

  "renfo": {
    "seancesParSemaine": 2,
    "jours": [3, 5],
    "exercices": ["mollet-excentrique", "chaise", "fentes", "gainage", "pont-fessier",
                  "gainage-lateral", "proprioception", "nordic-hamstring", "copenhague"]
  }
}
```

### Champs

| Champ | Obligatoire | Règle |
|---|---|---|
| `format`, `version` | oui | `"casse-pattes/fiche"`, `1` |
| `athlete.id` | oui | minuscules, chiffres, tiret ; unique par téléphone |
| `physiologie.fcMax` | oui | 120-230 ; `fcMaxSource` = `mesuree` ou `estimee` |
| `physiologie.allures.*.valeur` | oui | 150-900 s/km ; `seuil < tempo < fond < recup` |
| `physiologie.allures.*.source` | oui | séance réelle ayant servi à fixer la valeur |
| `physiologie.vitesseAscensionnelle` | non | m/h en montée raide ; 900 par défaut |
| `terrain.dplusParKm` | non | relief des sorties habituelles ; 35 par défaut |
| `terrain.penaliteParCentM` | non | secondes ajoutées par 100 m de D+ ; 120 par défaut |
| `reference` | recommandé | dernière course représentative ; sert à calibrer les prédictions et la récupération |
| `etat.volumeHebdo` | oui | moyenne des 4 dernières semaines ; point de départ de la charge |
| `disponibilites.jours` | oui | 2 à 6 jours ; rôles `qualite`, `endurance`, `cotes`, `longue` ; un seul `longue` ; `dureeMax` = durée habituelle, `dureeMaxPonctuelle` (facultatif) = durée possible pour quelques séances clés |
| `disponibilites.indisponibilites` | non | aucune séance générée sur ces dates |
| `activites` | non | `usage` : `alternative` (proposée sur les cases, au choix selon la neige), `remplace-longue`, `remplace-cotes`, `remplace-endurance` |
| `objectifs` | oui | au moins un objectif `A` dans le futur ; `technicite` : `roulant`, `mixte`, `technique` |
| `seancesImposees` | non | prioritaires sur la trame ; `type` : `course`, `montagne`, `longue` |
| `regles` | non | plafonds de FC affichés dans les séances |
| `renfo.exercices` | non | identifiants du catalogue `docs/data/exercices.json` |

Toute erreur de validation est affichée avec le chemin du champ et la raison, par exemple :
`physiologie.allures.seuil.valeur : 53 n'est pas une allure plausible (150-900 s/km)`.

---

## 2. Guide d'entretien (à suivre par Claude)

Objectif : produire une fiche complète en un seul échange structuré, sans faire porter à l'athlète les
choix de coaching évidents.

1. **Pré-remplir** tout ce qui est déjà connu (historique, fichiers de montre, journal des séances).
   Ne demander que ce qui manque ou a pu changer.
2. **Questions groupées par thème**, quatre au plus à la fois, avec des propositions de réponse.
3. **Valeurs mesurées, pas estimées** : une allure ou une FC max se rattache à une séance réelle.
   Si elle est estimée, l'indiquer (`fcMaxSource: "estimee"`) et prévoir un test dans le plan.
4. **Dates vérifiées** : jour de la semaine contrôlé pour chaque date d'objectif.
5. **Santé** : noter les vigilances et consignes de prudence, sans diagnostic. Recommander une
   consultation quand un symptôme le justifie.
6. Relire la fiche avec l'athlète (résumé en clair), puis l'écrire hors du dépôt et donner son chemin.

### Athlète à distance : formulaire PDF

Quand l'entretien en direct n'est pas possible :
1. Envoyer `DEV/formulaire/Casse-Pattes-formulaire-athlete.pdf` (vierge, remplissable hors ligne sur iPhone ou
   ordinateur). L'athlète le renvoie rempli, si possible avec les fichiers FIT de ses séances de référence.
2. Ranger la réponse dans `Projets_Perso-Dev-IA/Casse-Pattes-fiches/reponses/` (hors dépôt), puis lancer
   `DEV/tools/lire-formulaire.py <pdf>` : brouillon `<id>.brouillon.json` en unités SI, avec la liste
   **aDemander** (manques) et **alertes** (incohérences, douleurs, traitement modifiant la FC).
3. Poser à l'athlète les seules questions de `aDemander` et des alertes, puis écrire la fiche selon les
   règles ci-dessus : allures de fond, tempo, seuil tirées des séances (`allurePlat`, `pctFcMax`), rôle des
   jours, plafonds de FC, objectifs avec jour de la semaine contrôlé.

### Questions par section

| Section | Questions |
|---|---|
| Athlète | Prénom ; identifiant court |
| Physiologie | FC max mesurée (sur quelle séance ?) ; dernières séances de référence pour chaque allure ; vitesse en montée raide ; cadence |
| Référence | Dernière course représentative : date, distance, D+, temps, déroulé |
| État | Volume des 4 dernières semaines ; état physique depuis la dernière course |
| Santé | Antécédents ; douleurs actuelles ; symptômes en course ; avis médical obtenu |
| Disponibilités | Jours possibles ; durée maximale par jour ; durée maximale de la sortie longue ; périodes d'absence |
| Activités | Autres sports pratiqués et dans quelles conditions ils remplacent une séance |
| Objectifs | Course principale (nom, date, distance, D+, technicité, bâtons) ; courses secondaires ou de préparation |
| Règles | Tendance à dériver vers l'intensité ? Plafonds de FC à imposer |
| Renforcement | Matériel disponible ; exercices déjà pratiqués ; nombre de séances possibles |
