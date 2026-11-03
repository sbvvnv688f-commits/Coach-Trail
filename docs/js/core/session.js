// Séance décrite en blocs → durée, distance, D+, allure ajustée (NGP), intensité.
//
// Règles issues de l'historique (ne pas les contourner) :
// - la durée d'une séance est toujours la somme de ses blocs ;
// - un bloc défini par une distance (sortie longue, course) garde cette distance :
//   elle n'est jamais déduite d'une durée ;
// - pénalité de dénivelé : `penaliteParCentM` secondes par 100 m de D+ (120 s, calibré sur une boucle) ;
// - usure au-delà de 22 km : × 1,05 ; en course : × 1,15.

import { niveauFiliere } from "./zones.js";

const DEFAUT_TERRAIN = { dplusParKm: 35, penaliteParCentM: 120 };
const DEFAUT_VASC = 900;

// Écarts d'allure sur plat, en s/km, des filières dérivées.
const ECART_COTE = 192;     // montée courue soutenue : fondamental + 3'12
const ECART_MONTEE = 150;   // montée en endurance, courue ou marchée
const ECART_DESC = 6;       // descente : tempo + 0'06

export function allureFiliere(filiere, allures) {
  switch (filiere) {
    case "tempo": return allures.tempo;
    case "seuil": return allures.seuil;
    case "recup": return allures.recup;
    case "cote": return allures.fond + ECART_COTE;
    case "montee": return allures.fond + ECART_MONTEE;
    case "desc": return allures.tempo + ECART_DESC;
    default: return allures.fond; // fond, longue, course
  }
}

// Allure ajustée à la pente (Normalized Graded Pace de la montre) : l'effort exprimé en équivalent plat.
export function ngpFiliere(filiere, allures) {
  switch (filiere) {
    case "tempo": return allures.tempo;
    case "seuil":
    case "cote": return allures.seuil;
    case "recup": return allures.recup;
    default: return allures.fond;
  }
}

export function deplierBlocs(blocs) {
  const out = [];
  for (const b of blocs) {
    if (b.repeter) {
      const n = b.repeter;
      const sauter = b.sansDernier || 0;
      for (let i = 0; i < n; i++) {
        const sous = i === n - 1 && sauter ? b.blocs.slice(0, b.blocs.length - sauter) : b.blocs;
        for (const s of sous) out.push({ ...s, titre: s.titre?.replace("{i}", i + 1).replace("{n}", n) });
      }
    } else {
      out.push(b);
    }
  }
  return out;
}

export function calculerSeance(seance, profil) {
  const allures = profil.physiologie.allures;
  const terrain = { ...DEFAUT_TERRAIN, ...(profil.terrain || {}) };
  const vasc = profil.physiologie.vitesseAscensionnelle || DEFAUT_VASC;
  const ajoutTerrain = terrain.dplusParKm / 100 * terrain.penaliteParCentM;

  const blocs = deplierBlocs(seance.blocs || []);
  const distanceFixe = blocs.reduce((t, b) => t + (b.distance || 0), 0);
  const usure = seance.role === "course" ? 1.15 : distanceFixe > 22000 ? 1.05 : 1;

  let duree = 0, distance = 0, dplus = 0, niveau = 0;
  const detail = blocs.map((b) => {
    const allure = allureFiliere(b.filiere, allures) + (b.terrain ? ajoutTerrain : 0);
    let d, t, dp;
    if (b.distance) {
      d = b.distance;
      dp = b.dplus || 0;
      t = b.duree ?? (d / 1000 * allure * usure + dp / 100 * terrain.penaliteParCentM);
    } else {
      t = b.duree;
      d = t / allure * 1000;
      if (b.dplus != null) dp = b.dplus;
      else if (b.terrain) dp = d / 1000 * terrain.dplusParKm;
      else if (b.filiere === "cote") dp = t / 3600 * vasc * 0.8;
      else if (b.filiere === "montee") dp = t / 3600 * vasc * 0.6;
      else dp = 0;
    }
    duree += t;
    distance += d;
    dplus += dp;
    niveau = Math.max(niveau, niveauFiliere(b.filiere));
    return { ...b, duree: t, distance: d, dplus: dp, ngp: ngpFiliere(b.filiere, allures) };
  });

  if (seance.dureeFixe != null) duree = seance.dureeFixe;
  if (seance.dplus != null) dplus = seance.dplus;

  return {
    duree,
    distance,
    dplus: Math.round(dplus),
    niveau,
    ngp: ngpFiliere(seance.filiere || "fond", allures),
    blocs: detail,
  };
}
