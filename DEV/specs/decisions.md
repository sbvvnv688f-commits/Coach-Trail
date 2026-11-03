# Décisions

Format : numéro, date, statut (**proposée**, **validée**, **rejetée**), décision, raison.
Une décision validée ne se rediscute que sur un fait nouveau, noté ici.

## Validées

| N° | Date | Décision | Raison |
|---|---|---|---|
| D-01 | 2026-11-02 | Application publiée depuis `docs/`, à l'adresse actuelle `…/Coach-Trail/` | Demande initiale |
| D-02 | 2026-11-02 | HTML, CSS, JS natifs en modules ES, sans compilation obligatoire | Demande initiale |
| D-03 | 2026-11-02 | `DEV/samples/` et `DEV/specs/historique/` jamais publiés | Traces GPS et données de santé, dépôt public |
| D-04 | 2026-11-03 | Fiches athlètes **jamais dans le dépôt** : écrites dans `Projets_Perso-Dev-IA/Casse-Pattes-fiches/` (hors Git), remises à l'utilisateur comme une clé et importées à la main. `docs/` ne contient aucune fiche, même fictive (la fiche fictive des tests est dans `DEV/tests/fixtures/`) | Dépôt public ; données de santé ; la seconde athlète est une tierce personne |
| D-05 | 2026-11-03 | Nouvelle application à la racine dès la phase 1, v4 figée dans `docs/v4/` | Le plan v4 s'est terminé le 1er novembre ; allures et carnet repris automatiquement ; un chemin séparé couperait le stockage iPhone en deux |
| D-06 | 2026-11-03 | `DEV/archive/` non publié (exclu par `.gitignore`) | Les programmes contiennent prénoms, antécédents et disponibilités |
| D-07 | 2026-11-03 | Identité Git du dépôt : `sbvvnv688f-commits`, adresse de relais Apple des commits existants (configuration locale au dépôt) | Ne pas publier l'adresse professionnelle |
| D-08 | 2026-11-03 | **FIT = format principal** (export de l'application Suunto) ; lecteur FIT construit en premier. JSON Suunto, GPX et TCX restent pris en charge, en second | La montre est une Suunto ; le FIT est le format d'export courant |
| D-09 | 2026-11-03 | Tests exécutés dans le navigateur (Edge sans interface) ; pas d'installation de Node | Python disponible, Node absent |
| D-10 | 2026-11-03 | Coordonnées GPS non conservées dans les activités importées | Inutiles aux calculs, révèlent le domicile |
| D-11 | 2026-11-03 | Nom de l'application : **Casse-Pattes** | Choix de l'utilisateur (avec majuscules, précisé le 3 novembre) |
| D-13 | 2026-11-03 | Logo : variante **09A « Papier, profil »** — CASSE (encre) et PATTES (sapin) sur fond papier, séparés par un profil bistre. Source : `DEV/specs/logo-09a.svg` | Choix de l'utilisateur parmi 12 pistes et 5 variantes |
| D-14 | 2026-11-03 | Application commune ; une **fiche athlète** par personne, construite par Claude lors d'un entretien (`fiche-athlete.md`) ; plan et objectifs **générés par l'application** à partir de la fiche | Demande de l'utilisateur |
| D-15 | 2026-11-03 | Interface principale : **calendrier mensuel** de cases-jours (type, distance, D+, intensité) ; un toucher ouvre le détail | Demande de l'utilisateur |
| D-16 | 2026-11-03 | Une séance peut être **déplacée** à un autre jour de la même semaine ; le reste du plan ne bouge pas | Choix de l'utilisateur |
| D-17 | 2026-11-03 | Ski de randonnée et ski de fond proposés en **alternative au choix** sur les cases concernées | Choix de l'utilisateur |
| D-18 | 2026-11-03 | Tests et captures avec Chrome sans interface (Edge rend la main au processus ouvert sans rien produire sur ce poste) | Constat technique |
| D-19 | 2026-11-03 | Contenus génériques (ressentis, exercices) en modules JS dans `docs/js/data/` plutôt qu'en JSON chargé | Mis en cache avec le code, aucun chargement asynchrone |
| D-20 | 2026-11-03 | Règle d'accès : **détenir la fiche d'un athlète = accéder à son plan et à ses informations** ; rien d'autre n'y donne accès. Plusieurs athlètes possibles sur un même appareil (coach) | Demande de l'utilisateur |
| D-21 | 2026-11-03 | Athlète à distance : **formulaire PDF remplissable** hors ligne (`DEV/formulaire/`), relu par `DEV/tools/lire-formulaire.py` en brouillon de fiche ; réponses hors dépôt | Choix de l'utilisateur ; contrôles iOS fiables (texte, cases) |
## Ouvertes

| N° | Question | Proposition |
|---|---|---|
| D-12 | Lecteur FIT : SDK officiel Garmin (copié dans `docs/vendor/`) ou lecteur maison | SDK Garmin si sa licence autorise la redistribution dans un dépôt public ; sinon lecteur maison limité aux messages `session`, `lap`, `record`. Vérification au début de la phase 2 |
