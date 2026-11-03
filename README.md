# Casse-Pattes

Application web de coaching trail, conçue pour iPhone (Safari et écran d'accueil) et utilisable sur
ordinateur. Elle remplace Coach Trail à la même adresse :
**https://sbvvnv688f-commits.github.io/Coach-Trail/**

- Application commune à tous les athlètes : chacun importe sa **fiche athlète**, un fichier personnel
  construit lors d'un entretien avec Claude (schéma : [DEV/specs/fiche-athlete.md](DEV/specs/fiche-athlete.md))
- Plan d'entraînement et temps visés **générés** à partir de la fiche : phases, charge progressive,
  semaines allégées, séances décrites par blocs (durée, distance, D+, allure ajustée à la pente, FC)
- **Calendrier** de cases-jours (type, distance, D+, intensité) ; un toucher ouvre le détail de la séance,
  qui peut être déplacée dans sa semaine
- Fonctionne hors ligne ; les données restent sur l'appareil
- À venir : import des fichiers de montre (FIT en priorité) et carnet

État : refonte en cours, voir [DEV/specs/roadmap.md](DEV/specs/roadmap.md).

## Structure

| Dossier | Contenu |
|---|---|
| `docs/` | Application publiée par GitHub Pages |
| `DEV/specs/` | Inventaire de l'existant, architecture, feuille de route, décisions |
| `DEV/tests/` | Tests des calculs et des lecteurs de fichiers, fichiers d'exemple anonymisés |
| `DEV/tools/` | Scripts utilitaires |

## Travailler en local

Les modules ES et le service worker ne fonctionnent pas en ouvrant `index.html` directement :
il faut un serveur local.

```
python DEV/tools/serve.py          # application : http://127.0.0.1:8000/docs/
                                   # tests       : http://127.0.0.1:8000/DEV/tests/
python DEV/tools/run-tests.py      # tests sans fenêtre, rapport dans la console
python DEV/tools/make-icons.py     # icônes depuis DEV/specs/logo-09a.svg
```

## Publication (GitHub Pages)

Le site est servi depuis le dossier `docs/` de la branche `main` :
**Settings → Pages → Build and deployment → Source : Deploy from a branch → Branch : `main`, dossier `/docs` → Save.**

Ce réglage ne doit être changé qu'après avoir poussé un commit contenant `docs/index.html` ;
sinon le site renvoie une erreur 404. La mise en ligne prend une à deux minutes après chaque push.

Sur iPhone, une nouvelle version est proposée par un bandeau au lancement suivant. Le numéro de version
est affiché dans les réglages.

## Confidentialité

Le dépôt est public. Les fichiers de montre réels, l'historique de conception et les anciennes versions
restent sur le poste de travail (exclus par `.gitignore`). Les fiches athlètes ne sont jamais dans le
dépôt : chacun importe la sienne dans l'application, qui la garde sur l'appareil. Le site publié ne
contient ni ne télécharge aucune donnée d'athlète. Les tests publiés utilisent une fiche fictive.
