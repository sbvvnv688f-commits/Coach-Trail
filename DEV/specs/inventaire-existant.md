# Inventaire de l'existant — Coach Trail v4

Sources : `DEV/archive/applications/coach-v4-reference.html` (923 lignes, un seul fichier HTML) et
`DEV/specs/historique/synthese-conversation.md` (non publiée).
La version en ligne (`index.html` à la racine du dépôt, commit `8dddb4b` du 15 septembre) est **identique** à
`coach-v4-reference.html`, aux fins de ligne près (vérifié le 2 novembre 2026).

Ce document décrit ce que fait l'application, pas ce qu'elle devrait faire. Les écarts avec la synthèse
sont signalés au § 6 : ils sont à trancher avant de reprendre les données dans la refonte.

---

## 1. Vue d'ensemble

- Fichier unique : CSS, données et JavaScript (ES5, variables globales, `innerHTML` construit par concaténation).
- Aucune dépendance externe, aucun manifeste, aucun service worker : pas de fonctionnement hors ligne garanti.
- Balises iOS présentes : `apple-mobile-web-app-capable`, barre d'état translucide, `viewport-fit=cover`,
  marges `env(safe-area-inset-*)`.
- Palette : papier `#F4F3EE`, encre `#16281F`, sapin `#2E6B4F`, bistre `#9C6B3F`, alerte `#B03A2E`.
  Chiffres en `tabular-nums`. Pas de mode sombre.
- Deux athlètes codés en dur (Edgar, Laurie), sélecteur en en-tête.
- Plan figé sur 8 semaines datées du 7 septembre au 1er novembre 2026.

## 2. Fonctionnalités par onglet

| Onglet | Contenu | Interactions |
|---|---|---|
| **Plan** | Histogramme de charge (km) des 8 semaines ; en-tête de semaine (dates, étiquette allégée/pic/course) ; totaux km, D+, temps ; liste des séances | Toucher une barre change de semaine ; toucher une séance ouvre la fiche en volet bas |
| Fiche séance | Distance, D+, durée ; NGP à tenir ; déroulé bloc par bloc avec NGP du bloc ; zone et plage de FC ; ressenti attendu ; note du coach | Fermeture par la croix ou en touchant le fond |
| **Objectif** | Course visée, distance équivalente, trois scénarios (ambitieux, réaliste, repli), alerte, points de décision, table de projection depuis la semaine 6 | Lecture seule |
| **Carnet** | Import JSON Suunto (bouton ou glisser-déposer) ; saisie manuelle (date, type, km, minutes, D+, FC moyenne, note) ; liste des séances de l'athlète | Enregistrement, ajout d'une séance importée au carnet |
| Résultat d'import | Distance, D+, D−, durée, allure moyenne, FC moyenne ; comparaison à la séance du plan la plus proche ; tours au kilomètre (allure, D+, FC) ; lecture cardiaque ; cadence | Bouton « Ajouter au carnet » |
| **Renfo** | Introduction personnalisée, séances A et B (exercices : séries, technique, erreur à éviter, intérêt), progression en 3 paliers, règle d'arrêt | Lecture seule |
| **Lexique** | 21 termes avec définition et valeurs personnelles | Lecture seule |
| **Réglages** | Allures de référence (fondamental, tempo, seuil, récupération) en deux champs min/s ; FC max ; rythme 3 ou 4 séances (Edgar) ; zones de FC calculées ; sauvegarde par texte | Enregistrer, afficher la sauvegarde, restaurer |

Absents de la v4 alors que la synthèse les mentionne : import FIT, GPX et TCX ; carnet avec tours et
détail conservés (seuls les totaux sont stockés) ; plan retravaillé des semaines 3 à 8 (§ 3 de la synthèse) ;
renforcement Nordic hamstring et Copenhague ; analyse de course par portions.

## 3. Données

### 3.1 Données codées en dur

| Constante | Rôle | Forme |
|---|---|---|
| `DATES` | Libellés des 8 semaines | 8 chaînes |
| `PAR[ath]` | Paramètres du plan par athlète | `vasc` (m/h), `seuil[i]` = [répétitions, min, filière], `cotes[i]` = [répétitions, min], `cible[i]` = durée cible des séances de semaine (min), `ef[i]` (min), `ap[i]` (min d'appoint, Edgar), `lg[i]` = [km, D+], `jours`, `ech` (min d'échauffement) |
| `DEF[ath]` | Allures (min/km décimales) et FC max par défaut | Edgar 5,65 / 5,05 / 4,70 / 6,50, FC 198 ; Laurie 8,0 / 7,5 / 7,2 / 8,5, FC 185 |
| `FEEL` | Ressenti attendu par filière | 8 textes : fond, tempo, seuil, recup, cote, longue, course, nat |
| `GOAL[ath]` | Objectif de course | Libellé, distance équivalente, scénarios, points de décision, table de projection, alerte |
| `LEX` | Lexique | [terme, définition, valeurs personnelles] |
| `DESC[ath]` | Consigne de descente par semaine | 8 textes |
| `RENFO[ath]` | Renforcement | Intro, 2 séances × 4 exercices, progression, règle |
| `HRZM` | Plage de FC par filière | [bas, haut, libellé] en fraction de FC max |

### 3.2 Données stockées (localStorage, origine `sbvvnv688f-commits.github.io`)

| Clé | Contenu |
|---|---|
| `ct_allures` | Objet `me` complet : `{edgar:{fond,tempo,seuil,recup,fc}, laurie:{…}}` |
| `ct_carnet` | Tableau de séances `{dt, ty, km, mn, dp, fc, no, a}` — valeurs en **chaînes** issues des champs |
| `ct_appoint` | `"1"` ou `"0"` |
| `ct_test` | Clé temporaire du test de stockage |

Ces clés existent probablement sur l'iPhone de l'utilisateur. La nouvelle application, servie depuis la même origine,
pourra les lire et les migrer (voir architecture, § 7). Attention : sur iOS, une application ajoutée à
l'écran d'accueil a un stockage **distinct** de celui de Safari ; la migration doit s'exécuter dans le contexte
où les données ont été saisies.

## 4. Règles de calcul

### 4.1 Allures et conversions
- Allures stockées en minutes décimales par km ; affichage `m'ss` (`mmss`).
- Saisie : deux champs entiers, minutes 3-15 et secondes 0-59 ; allure finale bornée à 3-15 min/km.
- FC max acceptée entre 120 et 230.
- Durées affichées `XhMM` ou `N min`.

### 4.2 Relief et allures dérivées
- `TERRAIN = 35` m de D+ par km (relief structurel du secteur).
- Allure terrain = allure de base + 35/100 × 2 = **base + 0,7 min/km** (pénalité de 2 min par 100 m de D+).
- Allure de montée courue (`cote`) = fondamental + 3,2 min/km ; allure de descente (`desc`) = tempo + 0,1.
- D+ des côtes = minutes de montée / 60 × vitesse ascensionnelle (`vasc`).
- Descentes des côtes = 80 % du temps de montée.

### 4.3 Construction d'une semaine (`build`)
1. **Qualité** : échauffement (`ech`) + n blocs de d min (+ 3 min de trot entre blocs) + liaison terrain
   (complément jusqu'à la durée cible, minimum 5 min) + 10 min de retour au calme. D+ affiché fixe : 60 m.
2. **Côtes** : échauffement + montées + descentes + liaison + 10 min de retour au calme.
3. **Endurance fondamentale** : `ef[i]` minutes à allure terrain ; km = durée / allure terrain ; D+ = km × 35.
4. **Appoint** (Edgar, si option 4 séances et `ap[i] > 0`) : même calcul à allure de récupération + terrain.
5. **Sortie longue** : durée = km × fondamental × usure + D+/100 × 2, avec usure **1,05 au-delà de 22 km**,
   **1,15 pour la course**. Distance **fixée** (`kmFix`), jamais déduite de la durée.
   Semaines 5 à 7 : bloc à allure course (moyenne fondamental/tempo) de 20, 30 puis 20 min inséré après 60 % du temps.
- Durée d'une séance = **somme des blocs** (`mk`). Distance = Σ durée de bloc / allure du bloc, sauf distance fixée.
- Calibrage revendiqué : 16,4 km et 615 m → 16,4 × 5,65 + 12,3 ≈ 105 min (réel 1h41).

### 4.4 NGP et fréquence cardiaque
- NGP par filière : tempo → tempo ; seuil et côte → seuil ; récupération → récupération ;
  descente, fondamental, longue, course → fondamental.
- Zones : Z1 60-70 %, Z2 70-80 %, Z3 80-88 %, Z4 88-94 %, Z5 94-100 % de la FC max.
- Plages par filière (`HRZM`) : côte 84-94 %, descente 68-78 %, course 72-85 %, sinon zone correspondante.

### 4.5 Import JSON Suunto
- Racine : `DeviceLog` ou `data.DeviceLog`. En-tête `Header` obligatoire.
- Distance (m), Duration (s), Ascent, Descent depuis l'en-tête.
- FC : `Header.HR.Avg/Max` si présent, sinon moyenne et max de `Samples[].HR` × 60.
  Heuristique `hrv` : valeur < 10 considérée en Hz (× 60), sinon déjà en bpm.
- Cadence moyenne = `StepCount` / durée en minutes.
- Tours : `Windows[].Window` dont le `Type` contient « lap » ; distance, durée, `Ascent`, FC `HR[0].Avg`.
  La cadence par tour (`Cadence[0].Avg` × 120) n'est **pas** exploitée.
- Tour « lent » : allure > 1,1 × allure moyenne.
- Comparaison au plan : séance de la **semaine affichée** minimisant |Δkm| + |ΔD+|/100, ignorée au-delà de 12.
  Tolérances : 1,5 km, 80 m, 10 min.
- Lecture cardiaque : zone de la FC moyenne, alerte si zone 4-5.
- Cadence (Edgar) : < 160 « nettement sous la cible », < 170 « proche », sinon « dans la cible de 170 à 180 ».

### 4.6 Stockage
- Test réel en écriture/lecture au démarrage ; bandeau d'alerte si indisponible (onglets Plan et Réglages).
- Chaque écriture renvoie un succès ou un échec, signalé à l'utilisateur.
- Sauvegarde : JSON `{me, appoint}` affiché dans une zone de texte ; restauration par collage.
  Le carnet n'est **pas** inclus dans la sauvegarde.

## 5. Défauts techniques relevés

- Code et données mêlés ; un ajout de semaine ou d'athlète impose de modifier le code.
- Plan daté en dur ; aucune notion de date courante (l'application ne sait pas quelle semaine on est).
- `innerHTML` alimenté par des saisies libres (note du carnet) : injection HTML possible.
- `compare()` cherche la séance dans la semaine affichée, pas dans celle de la date du fichier.
- `build()` recalcule tout le plan à chaque rendu, y compris pour l'histogramme (8 × 5 séances).
- Le carnet stocke des chaînes, pas des nombres ; aucune déduplication des imports.
- Pas de manifeste ni de service worker : pas d'icône propre, pas de mode hors ligne.
- Seul le JSON Suunto est lu ; le message d'erreur renvoie toujours vers l'export Suunto.

## 6. Incohérences entre la v4 et la synthèse (à trancher)

Ce document étant publié, les valeurs mesurées ne sont pas recopiées ici : la colonne de droite renvoie
à la section de la synthèse (non publiée) qui les contient.

| Sujet | v4 | Synthèse (fait foi après le 7 septembre) |
|---|---|---|
| Plan S3-S8 | Seuil le lundi, côtes le mercredi, EF le jeudi, appoint vendredi | Plan retravaillé, autre répartition des jours (§ 3) |
| Plafonds de FC | Aucun | Plafond par filière et zone 2 stricte (§ 3) |
| Cadence cible | 160-170 en côte, 170-180 sur le plat | Cible revue à la baisse selon le gabarit (§ 1) |
| Vitesse ascensionnelle | 1300 m/h | Valeur mesurée nettement inférieure (§ 1) |
| Lexique, valeurs perso | Valeurs antérieures aux mesures | Allures mesurées (§ 1) |
| Objectif | Scénarios avant course | Course courue, analyse par portions (§ 2) |
| Renforcement | Séances A et B | Deux exercices ajoutés (§ 2 et 3) |
| Sortie montagne | Absente | Remplace la sortie longue et fait partie du plan (§ 3) |

Le programme corrigé (`DEV/archive/programmes/Programme_Trail_8semaines_corrige.md`) est encore antérieur :
allures et objectifs (5h15-5h45) obsolètes. Il ne sert que de référence de structure.

## 7. Ce qui est à conserver

- Le principe des **séances en blocs**, la durée calculée, la distance fixée des longues.
- La fiche séance : NGP en tête, déroulé, FC, ressenti attendu, note du coach.
- La saisie d'allure en deux champs, les bornes de validation.
- Le test de stockage au démarrage et le message explicite en cas d'échec.
- Les textes de coaching (ressentis, renforcement, lexique), une fois mis à jour.
- La sobriété visuelle et la palette.
