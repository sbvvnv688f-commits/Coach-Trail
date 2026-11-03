# Feuille de route — Casse-Pattes

Chaque phase se termine par une version **publiée et testée sur iPhone** depuis l'écran d'accueil.
Une phase n'est close que lorsque sa liste de contrôle iPhone est passée intégralement.
Aucune publication sans accord explicite.

Contrôles communs à toutes les phases, à partir de la phase 1 :
- [ ] L'icône d'écran d'accueil ouvre la nouvelle version (numéro visible dans les réglages)
- [ ] Mode avion : l'application s'ouvre et les données sont présentes
- [ ] Fermeture forcée puis réouverture : aucune donnée perdue
- [ ] Aucun bandeau de stockage indisponible
- [ ] Les tests de `DEV/tests/` passent (fixtures publiées et samples locaux)

---

## Phase 0 — Cadrage *(terminée le 3 novembre 2026)*
Dossier relié au dépôt, structure, inventaire, architecture, feuille de route, README, CLAUDE.md.
Décisions D-01 à D-11 validées. Aucune publication.

## Phase 1 — Socle, fiche athlète, plan généré, calendrier *(réalisée le 3 novembre 2026, à publier)*
**Contenu**
- Coquille PWA (manifeste, icônes du logo 09A, service worker versionné, `.nojekyll`), v4 figée dans `docs/v4/`.
- Fiche athlète : schéma, guide d'entretien, validation avec messages précis ; import manuel depuis Fichiers.
- Générateur de plan et temps visés ; calendrier mensuel, fiche séance, déplacement dans la semaine.
- Onglets Objectif, Profil, Réglages (stockage vérifié, sauvegarde par fichier).
- Tests automatiques sans fenêtre et captures à la taille d'un iPhone.

**Publication** : bascule GitHub Pages vers `docs/` (procédure dans `README.md`), après accord.

**Test iPhone**
- [ ] Ajout à l'écran d'accueil : nom « Casse-Pattes » et icône 09A, ouverture plein écran
- [ ] Première ouverture : écran « Importe ta fiche athlète »
- [ ] Import de la fiche depuis Fichiers ; un fichier quelconque est refusé avec un message clair
- [ ] Le calendrier s'ouvre sur le mois en cours, aujourd'hui entouré, compte à rebours exact
- [ ] Une case ouvre la séance ; un déplacement est conservé après fermeture forcée
- [ ] Mode avion : l'application s'ouvre et le plan s'affiche
- [ ] Sauvegarde enregistrée dans Fichiers, puis restaurée après suppression de la fiche
- [ ] `…/Coach-Trail/v4/` affiche l'ancienne application

## Phase 2 — Import des fichiers de montre et carnet
**Contenu**
- `detect.js` et **lecteur FIT en premier** (format principal, D-08) : SDK Garmin dans `vendor/` ou lecteur
  maison selon la licence (D-12).
- Puis lecteurs JSON Suunto, GPX, TCX ; lissage d'altitude calibré.
- `anonymiser.py` et fixtures publiées ; `attendus.json` local construit depuis le journal des séances.
- Fiche activité : totaux, tours au kilomètre (allure, D+, FC, cadence), zones, cadence, avertissements.
- Carnet : liste, saisie manuelle, ressenti, dédoublonnage.

**Test iPhone**
- [ ] Import depuis Fichiers d'un FIT exporté de l'application Suunto (cas principal)
- [ ] Import d'un JSON Suunto, d'un GPX et d'un TCX réels
- [ ] Tours automatiques affichés pour un JSON Suunto (piège : `Windows`, pas `Samples`)
- [ ] D+ d'un GPX à moins de 5 % de la valeur de la montre
- [ ] TCX de 168 octets : message explicite, pas d'erreur technique
- [ ] Réimport du même fichier : aucun doublon
- [ ] Date affichée = date réelle de la séance

## Phase 3 — *(intégrée à la phase 1)*
Le plan est généré dès la phase 1 ; la suite porte sur le lien entre plan et réalisé.

## Phase 4 — Plan et réalisé
**Contenu**
- Association automatique activité ↔ séance prévue (par date, puis par ressemblance), corrigeable.
- Écarts prévu / réalisé : distance, D+, durée, temps au-dessus du plafond de FC.
- Charge hebdomadaire réalisée superposée à la charge prévue.
- Alerte de dérive vers l'intensité (séance facile courue en zone 3 ou plus).

**Test iPhone**
- [ ] Une séance importée se range sous la bonne séance du plan
- [ ] Une endurance trop rapide est signalée avec le temps passé hors zone

## Phase 5 — Objectif, renforcement, lexique
**Contenu**
- Objectif : distance équivalente, scénarios, projection depuis une sortie de référence.
- Analyse de course : allure ajustée par portion, passages réels contre plan.
- Renforcement : catalogue d'exercices public, programme personnel privé, progression par palier.
- Lexique : recherche et infobulles sur les termes du plan.

**Test iPhone**
- [ ] Import du FIT d'une course : tableau par portions cohérent avec l'analyse de la synthèse
- [ ] Séance de renforcement consultable hors ligne

## Phase 6 — Préparation 2027
**Contenu**
- Outil de génération de plan (`DEV/tools/`) produisant le format JSON de la phase 3.
- Plans été 2027 pour les deux athlètes, construits à partir des allures mesurées.
- Ajustements issus de l'usage des phases précédentes.

---

## Hors périmètre pour l'instant
Synchronisation entre appareils ou comptes, carte des traces, connexion directe à l'API Suunto ou Garmin,
notifications. À rediscuter après la phase 4.
