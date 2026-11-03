// Ajustements de l'athlète : allures de référence, FC max et zones modifiées dans l'application.
// Ils se superposent à la fiche sans la modifier ; le plan et les temps visés sont recalculés à partir
// de la fiche ajustée.
//
// Forme : { allures?: { fond, tempo, seuil, recup } (s/km), fcMax?: bpm, zones?: [5 débuts de zone en bpm], date }

import { zonesBpm } from "./zones.js";

export const FILIERES_ALLURE = ["fond", "tempo", "seuil", "recup"];

// Temps visés : un athlète dont les allures progressent de x % court sa course environ x % plus vite.
// Moyenne des rapports sur les trois allures de travail (la récupération ne dit rien de la forme).
export function facteurAllures(avant, apres) {
  const f = ["fond", "tempo", "seuil"].map((k) => apres[k] / avant[k]);
  return f.reduce((t, x) => t + x, 0) / f.length;
}

export function validerAjustements(aj) {
  const erreurs = [];
  const a = aj.allures;
  if (a) {
    for (const k of FILIERES_ALLURE) {
      if (!Number.isFinite(a[k]) || a[k] < 150 || a[k] > 900) erreurs.push({ champ: `allures.${k}`, message: "entre 2'30 et 15'00 par km" });
    }
    if (!erreurs.length && !(a.seuil < a.tempo && a.tempo < a.fond && a.fond < a.recup)) {
      erreurs.push({ champ: "allures", message: "le seuil doit être plus rapide que le tempo, lui-même plus rapide que le fondamental, puis la récupération" });
    }
  }
  if (aj.fcMax != null && (!Number.isInteger(aj.fcMax) || aj.fcMax < 120 || aj.fcMax > 230)) {
    erreurs.push({ champ: "fcMax", message: "entre 120 et 230 bpm" });
  }
  if (aj.zones) {
    const z = aj.zones;
    const max = aj.fcMax;
    if (z.length !== 5 || z.some((x) => !Number.isInteger(x))) erreurs.push({ champ: "zones", message: "cinq valeurs en bpm" });
    else if (z.some((x, i) => i && x <= z[i - 1])) erreurs.push({ champ: "zones", message: "chaque zone doit commencer au-dessus de la précédente" });
    else if (max && z[4] >= max) erreurs.push({ champ: "zones", message: "la zone 5 doit commencer sous la FC max" });
    else if (z[0] < 60) erreurs.push({ champ: "zones", message: "la zone 1 commence au moins à 60 bpm" });
  }
  return erreurs;
}

// Fiche normalisée (data/fiche.js) + ajustements → fiche effective.
// Ajoute physiologie.zones (débuts de zone en bpm) et `ajustement` ({ facteurPrediction, allures, fcMax, zones }).
export function appliquerAjustements(fiche, aj) {
  const p = fiche.physiologie;
  const allures = { ...p.allures, ...(aj?.allures || {}) };
  const fcMax = aj?.fcMax ?? p.fcMax;
  const zones = aj?.zones ?? zonesBpm(fcMax).map((z) => z.bas);
  const modifie = {
    allures: !!aj?.allures && FILIERES_ALLURE.some((k) => aj.allures[k] !== p.allures[k]),
    fcMax: aj?.fcMax != null && aj.fcMax !== p.fcMax,
    zones: !!aj?.zones,
  };
  return {
    ...fiche,
    physiologie: { ...p, allures, fcMax, zones },
    ajustement: {
      ...modifie,
      date: aj?.date ?? null,
      facteurPrediction: modifie.allures ? facteurAllures(p.allures, allures) : 1,
      origine: { allures: p.allures, fcMax: p.fcMax },
    },
  };
}
