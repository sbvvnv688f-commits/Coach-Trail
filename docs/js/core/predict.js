// Prédiction de temps de course, calibrée sur une course de référence de l'athlète.
//
// Distance-effort = km + D+ / 100 (convention du plan : 100 m de D+ pèsent 1 km).
// Passage d'une distance-effort à une autre : loi de Riegel, T2 = T1 × (E2 / E1)^1,06.
// Majoration selon la technicité du terrain, la référence étant supposée roulante.

export const EXPOSANT_RIEGEL = 1.06;
export const MAJORATION_TECHNICITE = { roulant: 1.0, mixte: 1.04, technique: 1.08 };
export const SCENARIOS = [
  { id: "ambitieux", nom: "Ambitieux", facteur: 0.95, texte: "Départ maîtrisé, nutrition sans accroc, préparation complète." },
  { id: "realiste", nom: "Réaliste", facteur: 1.0, texte: "La cible autour de laquelle construire la stratégie de course." },
  { id: "prudent", nom: "Prudent", facteur: 1.08, texte: "Chaleur, terrain gras, ou fatigue en fin de préparation." },
];

export function distanceEffort(distanceM, dplusM) {
  return distanceM / 1000 + dplusM / 100;
}

export function predireTemps(reference, objectif) {
  const eRef = distanceEffort(reference.distance, reference.dplus);
  const eObj = distanceEffort(objectif.distance, objectif.dplus);
  const base = reference.temps * Math.pow(eObj / eRef, EXPOSANT_RIEGEL);
  return base * (MAJORATION_TECHNICITE[objectif.technicite] ?? 1);
}

// `facteur` : correction issue des allures modifiées par l'athlète (core/ajustements.js), 1 sinon.
export function scenarios(reference, objectif, facteur = 1) {
  if (!reference) return [];
  const t = predireTemps(reference, objectif) * facteur;
  return SCENARIOS.map((s) => ({ ...s, temps: t * s.facteur }));
}

// Allure moyenne par km-effort, utile pour comparer deux courses de profils différents.
export function allureEffort(temps, distanceM, dplusM) {
  return temps / distanceEffort(distanceM, dplusM);
}
