# Architecture — Casse-Pattes

Statut : **validée**, révisée le 3 novembre 2026 (décisions D-14 à D-19) : l'application est commune à
tous les athlètes ; chacun importe sa **fiche athlète** (`fiche-athlete.md`), à partir de laquelle
l'application **génère** le plan et les objectifs, affichés dans un **calendrier** de cases-jours.
Reste ouverte : D-12, choix du lecteur FIT.

## 1. Contraintes qui pilotent les choix

| Contrainte | Conséquence |
|---|---|
| Hébergement GitHub Pages, dépôt public, adresse `…/Coach-Trail/` conservée | Site statique, chemins **relatifs**, rien de personnel dans `docs/` |
| Usage principal : iPhone, Safari et écran d'accueil | PWA (manifeste + service worker), hors ligne, zones tactiles larges, saisie numérique iOS |
| HTML, CSS, JS natifs en modules ES, sans compilation obligatoire | Pas de framework ; dépendances tierces copiées et versionnées dans `docs/vendor/` |
| Données d'athlètes et de plans séparées du code | Fichiers JSON validés au chargement ; le code ne contient aucun nom ni aucune allure |
| Imports robustes (JSON Suunto, FIT, GPX, TCX) | Lecteurs isolés, détection par le contenu, modèle d'activité commun, tests sur fichiers réels |
| Poste de travail : Python présent, pas de Node | Tests exécutés dans le navigateur ; outils en Python |

Cible navigateur : **Safari iOS 16.4 et plus** (modules ES, `import maps`, Web Share avec fichiers,
IndexedDB fiable). Ordinateur : Edge, Chrome, Firefox récents.

## 2. Arborescence

```
Projet-Casse-Pattes/
├── docs/                         ← publié par GitHub Pages (aucune donnée d'athlète)
│   ├── index.html                ← coquille : en-tête, bandeaux, vue, barre d'onglets, volet
│   ├── manifest.webmanifest, sw.js, .nojekyll
│   ├── icons/                    ← icônes 180/192/512 générées depuis le logo 09A
│   ├── css/tokens.css, css/app.css
│   ├── v4/index.html             ← Coach Trail v4 figée
│   └── js/
│       ├── app.js                ← démarrage, état, navigation, import, service worker
│       ├── version.js            ← numéro de version (= VERSION de sw.js, vérifié par test)
│       ├── core/                 ← calculs purs, sans DOM ni stockage
│       │   ├── units.js          ← allures, durées, dates AAAA-MM-JJ (UTC)
│       │   ├── zones.js          ← zones et plages de FC, plafonds, niveaux d'intensité 1-5
│       │   ├── session.js        ← blocs → durée, distance, D+, NGP
│       │   ├── planner.js        ← fiche → phases → semaines → séances ; déplacements
│       │   ├── ajustements.js    ← allures, FC max et zones modifiées par l'athlète → fiche effective
│       │   └── predict.js        ← temps visés calibrés sur la course de référence
│       ├── data/
│       │   ├── fiche.js          ← validation et normalisation de la fiche athlète
│       │   ├── textes.js         ← ressentis attendus, explications (génériques)
│       │   ├── exercices.js      ← catalogue de renforcement (générique)
│       │   └── lexique.js        ← lexique affiché dans les réglages
│       ├── store/db.js, settings.js, backup.js
│       └── ui/dom.js, ui/glisser.js (appui long et glissé), ui/views/ ← calendrier, seance, objectif,
│                                   profil (+ accueil), ajustements, reglages (+ lexique)
├── DEV/
│   ├── specs/                    ← architecture, roadmap, décisions, fiche-athlete, logo (+ historique/, non publié)
│   ├── archive/                  ← versions précédentes (non publié)
│   ├── samples/                  ← fichiers de montre réels (non publié)
│   ├── tests/                    ← index.html (exécuteur), *.test.js, fixtures/fiche-fictive.json,
│   │                               apercu-plan.html (plan en texte), cadre.html (captures)
│   └── tools/                    ← serve.py, run-tests.py (tests et captures sans fenêtre), make-icons.py
├── README.md, CLAUDE.md, .gitignore, .gitattributes
└── (hors dépôt) ../Casse-Pattes-fiches/   ← fiches athlètes réelles, jamais dans Git
```

Écart avec la structure demandée : ajout de `docs/data/`, `docs/vendor/`, `DEV/tests/fixtures/` et
`.gitattributes`. Le reste est conforme.

## 3. Principes de code

1. **Trois couches étanches** : `core/` (calculs purs) ← `import/` et `store/` ← `ui/`.
   `core/` n'importe rien du DOM ni du stockage : c'est ce qui rend les calculs testables isolément.
2. **Une valeur, une source** : la durée d'une séance est toujours la somme de ses blocs ; la distance d'une
   longue ou d'une course est une donnée, jamais déduite d'une durée ; les allures du plan référencent une
   filière (`"fond"`), jamais une valeur en dur.
3. **Unités SI en interne** : mètres, secondes, bpm, pas/min. Les allures en secondes par km.
   Conversion en `m'ss` et `XhMM` uniquement à l'affichage (`core/units.js`).
4. **Aucune donnée injectée par `innerHTML`** : les vues construisent le DOM avec `ui/dom.js`.
5. **Erreurs explicites** : chaque lecteur renvoie soit une activité, soit une erreur typée avec un message
   destiné à l'utilisateur. Aucune exception silencieuse, aucun `catch` vide.
6. **Pas de dépendance non figée** : toute bibliothèque est copiée dans `docs/vendor/` avec son numéro de
   version et sa licence. Aucun appel à un CDN au chargement : l'application doit fonctionner hors ligne.

## 4. Modèle de données

### 4.1 Profil d'athlète

Remplacé par la **fiche athlète** : schéma complet dans `fiche-athlete.md`. Extrait historique :
```json
{
  "id": "a1",
  "nom": "…",
  "fcMax": 190, "fcMaxMesuree": true,
  "allures": { "fond": 360, "tempo": 320, "seuil": 295, "recup": 400 },
  "plafondsFc": { "seuil": 178, "tempo": 168, "zone2": 152 },
  "vitesseAscensionnelle": 800,
  "terrain": { "dplusParKm": 35, "penaliteParCentM": 120 },
  "cadenceCible": [160, 170]
}
```
Valeurs fictives. Allures en secondes par km. Historique des modifications d'allure conservé (date, ancienne valeur, séance
de référence) : une allure doit toujours pouvoir être rattachée à une mesure.

### 4.2 Plan : généré par l'application à partir de la fiche

Le plan n'est plus un fichier écrit à la main : `core/planner.js` le construit à chaque ouverture, de façon
déterministe, à partir de la fiche (`fiche-athlete.md`). Il n'est pas stocké ; seuls les **déplacements**
de séances (`{ idSeance: date }`, limités à la semaine) sont enregistrés.

- **Phases** : récupération après la course de référence (2 semaines au-delà de 40 km), puis base,
  développement, spécifique (≈ 40 / 35 / 25 % du temps restant), affûtage (3 semaines pour ≥ 40 km).
- **Charge** : + 10 % au plus d'une semaine chargée à la suivante ; semaine allégée (− 30 %) toutes les
  4 semaines ; une semaine modifiée par une indisponibilité ou une séance imposée est hors règle et ne
  fait pas avancer la progression.
- **Trame** : rôle de chaque jour donné par la fiche (qualité, endurance, côtes, sortie longue). Qualité :
  tempo en base, seuil en développement, montées à effort de seuil en spécifique. Une seule séance de
  niveau ≥ 4 par semaine.
- **Sortie longue** : de ≈ 1/3 du volume récent jusqu'à ≈ 72 % de la distance de course ; D+ par km
  passant du relief habituel à celui de la course ; plafonnée par la durée maximale de la fiche.
- **Séances clés** : fin de base, fin de développement, sortie test, répétition générale (points de contrôle).
- **Alternatives** : ski de randonnée (longue, côtes), ski de fond (endurance), au choix selon la neige.
- **Séances imposées** et **indisponibilités** de la fiche priment sur la trame.

### 4.3 Activité (sortie d'un lecteur, quel que soit le format)
```json
{
  "id": "<empreinte date + durée + distance>",
  "source": "suunto-json | fit | gpx | tcx",
  "debut": "2026-05-17T08:12:00+02:00",
  "totaux": { "distance": 21400, "duree": 8100, "dplus": 640, "dmoins": 655,
              "fcMoy": 144, "fcMax": 171, "cadence": 158, "pas": 21300 },
  "tours": [{ "debut": 0, "distance": 1000, "duree": 372, "dplus": 41, "fcMoy": 139, "cadence": 151 }],
  "series": { "t": [], "distance": [], "altitude": [], "fc": [], "cadence": [] },
  "zones": [12, 1780, 7120, 1450, 0],
  "avertissements": ["FC absente de l'en-tête, recalculée depuis les échantillons"]
}
```
- Les **coordonnées GPS ne sont pas conservées** : elles ne servent à aucun calcul et révèlent le domicile.
  Distance et altitude suffisent.
- Les champs absents restent `null` ; l'interface affiche « — » et l'avertissement correspondant.
- `avertissements` trace toute correction appliquée (FC recalculée, D+ lissé, cadence doublée…).

### 4.4 Entrée de carnet
Référence une activité importée **ou** porte une saisie manuelle, plus : séance du plan associée
(automatique d'après la date, modifiable), ressenti, douleurs, note libre.

## 5. Stockage

| Donnée | Support | Raison |
|---|---|---|
| Activités, carnet, profils, plans importés | **IndexedDB** | Volume (séries de plusieurs milliers de points), transactions, pas de limite de 5 Mo |
| Préférences d'affichage (athlète actif, dernier onglet) | localStorage | Petites valeurs lues au démarrage |
| Contenus génériques | `docs/data/*.json` | Publics, mis en cache par le service worker |

Règles, reprises de la v4 et renforcées :
- **Test réel au démarrage** (écriture, relecture, suppression) dans IndexedDB et localStorage ;
  bandeau permanent si l'un échoue.
- `navigator.storage.persist()` demandé à l'installation ; résultat affiché dans les réglages.
- **Sauvegarde par fichier** : export JSON complet (profils, plans, carnet, activités) via la feuille de
  partage iOS (enregistrer dans Fichiers ou iCloud Drive) ; import par sélection du fichier.
  Date de la dernière sauvegarde affichée, rappel au-delà de 30 jours.
- Schéma versionné (`schemaVersion`) ; chaque montée de version a une fonction de migration testée.

Particularités iOS à connaître :
- Safari peut effacer les données d'un **site** inutilisé depuis 7 jours ; une application ajoutée à
  l'écran d'accueil n'y est pas soumise. L'usage depuis l'écran d'accueil est donc la cible.
- L'application d'écran d'accueil a un stockage **séparé** de celui de Safari. Données saisies dans l'une
  invisibles dans l'autre : la sauvegarde par fichier est le seul pont.

## 6. Import des fichiers de montre

**Le FIT est le format principal** (export de l'application Suunto, D-08) : son lecteur est écrit et testé en premier.

Chaîne : fichier → `detect.js` → lecteur → `activity.js` (validation, empreinte) → aperçu → carnet.

| Format | Détection | Lecture | Points d'attention (vérifiés sur les vrais fichiers) |
|---|---|---|---|
| JSON Suunto | 1er caractère `{`, présence de `DeviceLog` (racine ou `data.`) | `JSON.parse` | Totaux dans `Header` ; FC en Hz (× 60), parfois absente de l'en-tête → recalcul depuis `Samples[].HR` ; tours dans `Windows[].Window` de type `Autolap`, **pas dans `Samples`** ; FC du tour `HR[0].Avg` × 60 ; cadence du tour `Cadence[0].Avg` × 120 ; cadence de séance = `StepCount` / minutes |
| FIT | Octets 8-11 = `.FIT` | SDK officiel Garmin, copié dans `vendor/` | `fitparse` échoue sur certains fichiers, le SDK officiel non ; cadence par jambe → × 2 (+ `fractional_cadence`) ; horodatage FIT (époque 1989) |
| GPX | `<gpx` | `DOMParser` | Altitude bruitée : lissage puis D+ par hystérésis, sinon D+ gonflé ; FC et cadence dans les extensions (`gpxtpx`) si présentes |
| TCX | `<TrainingCenterDatabase` | `DOMParser` | Espaces de noms (`ns3:RunCadence`) ; fichier de 168 octets = raccourci iOS de Messages, message dédié « enregistre d'abord dans Fichiers » |

- Le lissage d'altitude (`elevation.js`) est commun à GPX, TCX et FIT sans D+ natif. Son seuil est
  **calibré** sur les samples où la montre fournit son propre D+ (écart cible < 5 %).
- Le sélecteur de fichier n'impose pas de filtre `accept` restrictif : sur iOS, une extension sans type
  reconnu (`.fit`) apparaît grisée. La détection se fait sur le contenu.
- iOS ne permet pas à une PWA de recevoir un fichier par « Partager vers » : l'import passe par le
  sélecteur Fichiers.
- Dédoublonnage par empreinte : réimporter le même fichier ne crée pas de doublon.
- La date d'une activité vient du fichier, convertie dans le fuseau local, et est affichée à l'aperçu
  pour vérification avant ajout au carnet.

Licence du SDK FIT Garmin à vérifier avant de le publier dans `vendor/` (D-12). Repli : un
lecteur FIT minimal écrit pour le projet (messages `session`, `lap`, `record` uniquement).

## 7. Reprise de Coach Trail v4

`migrate-v4.js` s'exécute au premier démarrage s'il trouve les clés `ct_allures`, `ct_carnet`,
`ct_appoint` sur l'origine `sbvvnv688f-commits.github.io` :
- allures et FC max → profils (minutes décimales → secondes) ;
- carnet → entrées manuelles (chaînes → nombres) ;
- les clés `ct_*` sont **laissées intactes**, un indicateur `cp_migration_v4` empêche de rejouer.

La v4 reste consultable à `…/Coach-Trail/v4/` (copie figée dans `docs/v4/`).

## 8. PWA et mises à jour

- Manifeste réel (pas d'URL `data:` comme dans les premières versions) : nom, icônes 180/192/512,
  `display: standalone`, `start_url: "./"`, `scope: "./"`.
- Service worker : coquille et données mises en cache à l'installation, servies en cache d'abord.
  Le nom du cache inclut `version.js`. Nouvelle version détectée → bandeau « Mise à jour disponible »,
  rechargement sur action, jamais en pleine saisie.
- **Piège** : oublier d'incrémenter la version = l'iPhone garde l'ancienne application. Le numéro de
  version est affiché dans les réglages pour le vérifier.

## 9. Interface

- Barre d'onglets **en bas** (atteignable au pouce), cinq entrées : Plan, Carnet, Objectif, Renfo, Réglages.
  Le lexique devient une recherche accessible depuis Plan et Renfo, et une infobulle sur les termes.
- Volet bas pour les fiches (séance, activité), comme en v4.
- Reprise de la palette v4, ajout d'un mode sombre.
- Saisies numériques : `inputmode="numeric"`, allures en deux champs, bornes vérifiées.
- Accessibilité : contrastes AA, rôles ARIA sur les onglets, zones tactiles de 44 px minimum.

## 10. Tests

- **Calculs** (`core/`) : cas de référence de la synthèse (sortie du 13/09 : 16,4 km, 615 m → 1h45 au
  modèle ; durée = somme des blocs ; 42 km fixés quelle que soit la durée ; zones à 198 bpm).
- **Lecteurs** : deux niveaux.
  1. `DEV/tests/fixtures/` — fichiers anonymisés, publiés, toujours exécutés.
  2. `DEV/samples/` — fichiers réels, exécutés seulement s'ils sont présents (poste local), comparés à
     `DEV/samples/attendus.json` construit depuis `journal-seances.md` (distance, D+, durée, FC, cadence,
     nombre de tours, à tolérance près).
- Exécution : `DEV/tests/index.html` servi par `DEV/tools/serve.py` ; `DEV/tools/run-tests.py` lance Edge
  sans interface (`--headless`) et lit le résultat, sans ouvrir de fenêtre.
- Test sur iPhone à chaque phase : liste de contrôle dans `roadmap.md`.

## 11. Confidentialité (rappel d'architecture)

- `docs/` ne contient **aucune donnée personnelle** : ni nom réel, ni allure mesurée, ni antécédent médical,
  ni trace. Les profils, plans et objectifs personnels sont préparés dans `DEV/private/` (non publié),
  puis importés à la main dans l'application depuis Fichiers (D-04).
- Les activités importées restent sur le téléphone, sans coordonnées GPS.
- Les fixtures publiées sont produites par `anonymiser.py` : coordonnées décalées, noms, numéros de
  série et identifiants d'appareil supprimés.
