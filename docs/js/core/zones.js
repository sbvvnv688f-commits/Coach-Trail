// Zones de fréquence cardiaque et niveaux d'intensité.
// Zones en fraction de la FC max : Z1 60-70 %, Z2 70-80 %, Z3 80-88 %, Z4 88-94 %, Z5 94-100 %.

export const ZONES = [
  { nom: "Zone 1", role: "récupération", bas: 0.60, haut: 0.70 },
  { nom: "Zone 2", role: "fondamental", bas: 0.70, haut: 0.80 },
  { nom: "Zone 3", role: "tempo", bas: 0.80, haut: 0.88 },
  { nom: "Zone 4", role: "seuil", bas: 0.88, haut: 0.94 },
  { nom: "Zone 5", role: "maximale", bas: 0.94, haut: 1.00 },
];

// Plage de FC visée par filière, et plafond de la fiche qui s'y applique.
const PLAGES = {
  recup:   { bas: 0.60, haut: 0.70, libelle: "zone 1", plafond: "endurance" },
  fond:    { bas: 0.70, haut: 0.80, libelle: "zone 2", plafond: "endurance" },
  longue:  { bas: 0.70, haut: 0.80, libelle: "zone 2", plafond: "endurance" },
  desc:    { bas: 0.68, haut: 0.78, libelle: "zone 2", plafond: "endurance" },
  montee:  { bas: 0.75, haut: 0.86, libelle: "zones 2-3", plafond: "tempo" },
  tempo:   { bas: 0.80, haut: 0.88, libelle: "zone 3", plafond: "tempo" },
  course:  { bas: 0.72, haut: 0.85, libelle: "zones 2-3", plafond: "tempo" },
  cote:    { bas: 0.84, haut: 0.94, libelle: "zones 3-4", plafond: "seuil" },
  seuil:   { bas: 0.88, haut: 0.94, libelle: "zone 4", plafond: "seuil" },
};

// 1 récupération · 2 endurance · 3 soutenu · 4 dur · 5 maximal
export const NIVEAUX = {
  recup: 1, fond: 2, longue: 2, desc: 2,
  montee: 3, tempo: 3, course: 3,
  cote: 4, seuil: 4,
};

export const LIBELLES_NIVEAU = ["Repos", "Récupération", "Endurance", "Soutenu", "Dur", "Maximal"];

export function zoneDeFc(fc, fcMax) {
  const r = fc / fcMax;
  for (let i = ZONES.length - 1; i >= 0; i--) if (r >= ZONES[i].bas) return i + 1;
  return 0;
}

export function plageFc(filiere, fcMax, plafonds = {}) {
  const p = PLAGES[filiere] || PLAGES.fond;
  const plafond = plafonds[p.plafond] ?? null;
  let haut = Math.round(fcMax * p.haut);
  if (plafond != null && plafond < haut) haut = plafond;
  return { bas: Math.round(fcMax * p.bas), haut, libelle: p.libelle, plafond };
}

export function niveauFiliere(filiere) {
  return NIVEAUX[filiere] ?? 2;
}
