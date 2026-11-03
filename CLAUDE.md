# CLAUDE.md — Casse-Pattes

Application **Casse-Pattes** : refonte de Coach Trail, application web de coaching trail utilisée sur iPhone.
Publication : GitHub Pages, dossier `docs/` de `main`, adresse `https://sbvvnv688f-commits.github.io/Coach-Trail/`.

## Avant toute tâche

1. **Référence métier** : `DEV/specs/historique/synthese-conversation.md` (local, non publié).
   Profils, allures mesurées, modèles de calcul, plan, analyse de course, fonctionnalités validées.
   En cas de contradiction avec la v4 ou les anciens programmes, la synthèse fait foi.
2. Séances réelles : `DEV/specs/historique/journal-seances.md` (local, non publié).
3. Conception : `DEV/specs/architecture.md`, `roadmap.md`, `decisions.md`, `fiche-athlete.md`, `inventaire-existant.md`.
4. Dernière version de l'ancienne application : `DEV/archive/applications/coach-v4-reference.html` (local, non publié).

## CONFIDENTIALITÉ — règle absolue

Le dépôt est **public**. `DEV/samples/` et `DEV/specs/historique/` contiennent des traces GPS révélant
le domicile et des données de santé. `DEV/archive/` (antécédents, disponibilités) et `DEV/private/`
(fiches athlètes, plans et objectifs personnels) sont également exclus.
- Ne jamais modifier `.gitignore` pour inclure ces dossiers. Ajouter des exclusions est permis.
- Ne jamais copier leur contenu brut (ni les valeurs mesurées des athlètes, ni les antécédents médicaux)
  dans un fichier suivi par Git : code, tests, documentation, messages de commit.
- `docs/` ne contient aucune donnée personnelle : ni nom réel, ni allure mesurée, ni trace.
- **Fiches athlètes : jamais dans le dépôt.** Claude les écrit dans `../Casse-Pattes-fiches/` (dossier
  frère du dépôt, hors Git) et les remet à l'utilisateur, qui les importe lui-même dans l'application.
  Aucune fiche, même fictive, dans `docs/` ; la fiche fictive des tests est `DEV/tests/fixtures/fiche-fictive.json`.
- Captures d'écran d'une vraie fiche : dans le dossier temporaire de session, jamais dans le dépôt.
- Tests publiés : uniquement des fichiers de `DEV/tests/fixtures/`, anonymisés (coordonnées décalées,
  aucun nom, aucun numéro de série d'appareil).
- **Avant chaque commit**, vérifier qu'aucun fichier sensible n'est suivi ni indexé :
  ```
  git ls-files DEV/samples DEV/specs/historique DEV/archive DEV/private          # doit être vide
  git diff --cached --name-only | grep -E 'samples/|historique/|archive/|private/'  # doit être vide
  ```
- **Ne jamais pousser sur GitHub sans accord explicite** de l'utilisateur, à chaque fois.

## Conventions

- Langue : français pour l'interface, la documentation, les commentaires et les messages de commit.
  Formulations directes, sans répétition lexicale dans un même paragraphe.
- HTML, CSS, JavaScript natifs en **modules ES**, sans étape de compilation. Aucun framework.
- Couches : `docs/js/core/` (calculs purs, sans DOM ni stockage) ← `import/`, `store/` ← `ui/`.
- Unités SI en interne (m, s, bpm, pas/min ; allures en s/km). Formatage uniquement à l'affichage.
- Jamais de `innerHTML` alimenté par des données : construire le DOM avec `ui/dom.js`.
- Dépendances tierces figées dans `docs/vendor/<nom>-<version>/` avec leur licence. Aucun CDN.
- Chemins relatifs partout (le site est servi sous `/Coach-Trail/`).
- Toute modification publiée de `docs/` incrémente `docs/js/version.js` (sinon l'iPhone garde l'ancienne
  version en cache).
- Cible : Safari iOS 16.4+. Zones tactiles ≥ 44 px, `inputmode="numeric"` pour les saisies chiffrées.

## Fiche athlète et plan

- Une fiche par athlète, construite par entretien : suivre le guide de `DEV/specs/fiche-athlete.md`
  (pré-remplir depuis l'historique, ne demander que ce qui manque, valeurs mesurées, dates vérifiées).
- Le plan est **généré** par `docs/js/core/planner.js` à partir de la fiche ; il n'est jamais écrit à la main.
- Après toute modification du générateur : `python DEV/tools/run-tests.py` (invariants vérifiés sur la
  fiche fictive et sur les fiches réelles du poste), puis lecture du plan en texte :
  `/DEV/tests/apercu-plan.html?fiche=<fichier>` via `serve.py`.

## Tests

- Serveur local : `python DEV/tools/serve.py` (sert aussi `/fiches/` depuis `../Casse-Pattes-fiches/`,
  sur 127.0.0.1 uniquement). Tests sur `/DEV/tests/`.
- Exécution automatique : `python DEV/tools/run-tests.py` ; captures :
  `python DEV/tools/run-tests.py --capture "docs/?fiche=<fichier>" sortie.png 390x844`.
  Chrome **sans interface** (Edge rend la main au processus ouvert sans rien produire). Ne jamais ouvrir
  de fenêtre sur l'écran de l'utilisateur.
- Piège : en « temps virtuel », Chrome considère la page inactive pendant qu'IndexedDB travaille ; le
  paramètre `?attendre` (ajouté automatiquement aux captures) maintient une requête ouverte jusqu'à la fin
  du démarrage. Chrome impose aussi une fenêtre d'au moins ~500 px : les captures passent par `DEV/tests/cadre.html`.
- Les tests sur `DEV/samples/` ne s'exécutent que si les fichiers sont présents ; leurs valeurs attendues
  sont dans `DEV/samples/attendus.json`, jamais dans un fichier publié.

## Formats de fichiers — vérifié sur les vrais fichiers

La montre est une Suunto ; **le FIT exporté par l'application Suunto est le format principal**.

- **JSON Suunto** : en-tête dans `DeviceLog.Header` (Distance, Duration, Ascent, Descent, StepCount,
  HrZones en secondes). FC parfois absente de l'en-tête : la recalculer depuis `Samples[].HR`
  (en Hz → × 60). Tours automatiques dans `DeviceLog.Windows[].Window` avec `Type: "Autolap"`
  (**pas dans `Samples`**) ; FC du tour dans `HR[0].Avg` (× 60) ; cadence du tour dans `Cadence[0].Avg`
  (× 120 → pas/min). Cadence moyenne de séance = StepCount / durée en minutes.
- **FIT** : `fitparse` (Python) échoue sur certains fichiers ; le SDK officiel Garmin les lit sans erreur.
  Cadence par jambe (× 2).
- **GPX** : export Suunto ou trace de course ; altitude à **lisser** avant de calculer le D+
  (le D+ brut point à point est gonflé).
- **TCX** : un partage depuis Messages iOS produit un fichier de 168 octets (raccourci binaire, pas les
  données). Détecter ce cas et demander d'enregistrer d'abord le fichier dans Fichiers.
- Ne pas filtrer le sélecteur de fichiers par extension : sur iOS, un `.fit` peut apparaître grisé.
  Détecter le format d'après le contenu.

## Erreurs déjà commises — à ne pas reproduire

- Tours automatiques Suunto cherchés dans `Samples` au lieu de `Windows` : aucun tour affiché.
- Durées de séance saisies à la main, indépendantes du déroulé (44 min de blocs affichées 1h00).
  **La durée est toujours la somme des blocs.**
- Distance de sortie longue déduite d'une durée incluant la pénalité de D+ : kilométrage gonflé
  (51 km affichés pour 42). **La distance d'une longue ou d'une course est fixée, jamais déduite.**
- Pénalité de dénivelé de 5 min par 100 m : beaucoup trop forte sur une boucle. Valeur calibrée :
  **2 min par 100 m**.
- Allures par défaut posées sans mesure : toujours caler les allures sur des séances réelles.
- Champ d'allure unique au format 5'45 : impossible au clavier numérique iOS, et « 53 » accepté comme
  53 min/km. **Deux champs (min, s) et validation de plage.**
- Stockage local qui échouait en silence : réglages perdus sans message. **Tester le stockage au
  démarrage, signaler tout échec d'écriture.**
- Dates : vérifier la date réelle des fichiers (plusieurs confusions d'un jour pendant le suivi).
- Premières versions : manifeste en URL `data:` et fichier HTML ouvert depuis un aperçu iOS, où le
  stockage n'est pas disponible. Toujours passer par l'adresse GitHub Pages et l'écran d'accueil.

## Pièges iOS

- L'application d'écran d'accueil a un stockage séparé de Safari : la sauvegarde par fichier est le seul
  pont entre les deux.
- Safari peut effacer les données d'un site inutilisé depuis 7 jours ; pas l'application d'écran d'accueil.
- Une PWA ne peut pas recevoir de fichier via « Partager vers » sur iOS : import par le sélecteur Fichiers.

## Environnement de travail

- Windows, Git 2.55, Python 3.13 ; pas de Node, pas de `gh`.
- Dossier dans OneDrive : ne pas travailler sur le dépôt depuis deux postes en même temps
  (risque de corruption de `.git` par la synchronisation).
- Identité Git configurée localement au dépôt (D-07). Ne jamais utiliser l'adresse professionnelle.
