// Zones de fréquence cardiaque et niveaux d'intensité.
// Zones par défaut en fraction de la FC max : Z1 60-70 %, Z2 70-80 %, Z3 80-88 %, Z4 88-94 %, Z5 94-100 %.
// L'athlète peut les redéfinir en bpm (core/ajustements.js) : les plages des séances suivent.

export const ZONES = [
  { nom: "Zone 1", role: "récupération", bas: 0.60, haut: 0.70 },
  { nom: "Zone 2", role: "fondamental", bas: 0.70, haut: 0.80 },
  { nom: "Zone 3", role: "tempo", bas: 0.80, haut: 0.88 },
  { nom: "Zone 4", role: "seuil", bas: 0.88, haut: 0.94 },
  { nom: "Zone 5", role: "maximale", bas: 0.94, haut: 1.00 },
];

// Zones en bpm : [{ nom, role, bas, haut }]. `bornes` = début de chaque zone en bpm (5 valeurs croissantes) ;
// sans bornes, zones par défaut calculées sur la FC max. Chaque zone finit où commence la suivante.
export function zonesBpm(fcMax, bornes = null) {
  const debuts = bornes?.length === 5 ? bornes : ZONES.map((z) => Math.round(fcMax * z.bas));
  return ZONES.map((z, i) => ({ nom: z.nom, role: z.role, bas: debuts[i], haut: i < 4 ? debuts[i + 1] : fcMax }));
}

// Zones visées par filière (de, à) et plafond de la fiche qui s'y applique.
const PLAGES = {
  recup:   { de: 1, a: 1, plafond: "endurance" },
  fond:    { de: 2, a: 2, plafond: "endurance" },
  longue:  { de: 2, a: 2, plafond: "endurance" },
  desc:    { de: 2, a: 2, plafond: "endurance" },
  montee:  { de: 2, a: 3, plafond: "tempo" },
  tempo:   { de: 3, a: 3, plafond: "tempo" },
  course:  { de: 2, a: 3, plafond: "tempo" },
  cote:    { de: 3, a: 4, plafond: "seuil" },
  seuil:   { de: 4, a: 4, plafond: "seuil" },
};

// 1 récupération · 2 endurance · 3 soutenu · 4 dur · 5 maximal
export const NIVEAUX = {
  recup: 1, fond: 2, longue: 2, desc: 2,
  montee: 3, tempo: 3, course: 3,
  cote: 4, seuil: 4,
};

export const LIBELLES_NIVEAU = ["Repos", "Récupération", "Endurance", "Soutenu", "Dur", "Maximal"];

export function zoneDeFc(fc, fcMax, bornes = null) {
  const zones = zonesBpm(fcMax, bornes);
  for (let i = zones.length - 1; i >= 0; i--) if (fc >= zones[i].bas) return i + 1;
  return 0;
}

export function plageFc(filiere, fcMax, plafonds = {}, bornes = null) {
  const p = PLAGES[filiere] || PLAGES.fond;
  const zones = zonesBpm(fcMax, bornes);
  const plafond = plafonds[p.plafond] ?? null;
  let haut = zones[p.a - 1].haut;
  if (plafond != null && plafond < haut) haut = plafond;
  return { bas: zones[p.de - 1].bas, haut, libelle: p.de === p.a ? `zone ${p.de}` : `zones ${p.de}-${p.a}`, plafond };
}

export function niveauFiliere(filiere) {
  return NIVEAUX[filiere] ?? 2;
}
