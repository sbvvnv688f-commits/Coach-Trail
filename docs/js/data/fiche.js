// Validation et normalisation d'une fiche athlète (format « casse-pattes/fiche », version 1).
// Schéma documenté dans DEV/specs/fiche-athlete.md.
//
// validerFiche(json) → { ok, erreurs: [{ chemin, message }], fiche }
// La fiche normalisée porte des allures numériques (s/km) ; les sources sont conservées à part.

import { estDateISO } from "../core/units.js";

export const FORMAT = "casse-pattes/fiche";
export const VERSION = 1;

const ROLES = ["qualite", "endurance", "cotes", "longue"];
const USAGES = ["alternative", "remplace-longue", "remplace-cotes", "remplace-endurance"];
const TECHNICITES = ["roulant", "mixte", "technique"];

export function validerFiche(brut) {
  const erreurs = [];
  const err = (chemin, message) => erreurs.push({ chemin, message });
  const estObjet = (v) => v && typeof v === "object" && !Array.isArray(v);
  const nombre = (v, chemin, min, max, unite = "") => {
    if (typeof v !== "number" || !Number.isFinite(v)) { err(chemin, "nombre attendu"); return false; }
    if (v < min || v > max) { err(chemin, `${v} hors de la plage plausible (${min}-${max}${unite})`); return false; }
    return true;
  };
  const date = (v, chemin) => { if (!estDateISO(v)) { err(chemin, "date attendue au format AAAA-MM-JJ"); return false; } return true; };

  if (!estObjet(brut)) return { ok: false, erreurs: [{ chemin: "(fichier)", message: "ce fichier ne contient pas un objet JSON" }], fiche: null };
  if (brut.format !== FORMAT) err("format", `« ${FORMAT} » attendu : ce fichier n'est pas une fiche Casse-Pattes`);
  if (brut.version !== VERSION) err("version", `version ${VERSION} attendue`);
  if (erreurs.length) return { ok: false, erreurs, fiche: null };

  date(brut.creee, "creee");

  const a = brut.athlete;
  if (!estObjet(a)) err("athlete", "section manquante");
  else {
    if (typeof a.id !== "string" || !/^[a-z0-9-]{1,32}$/.test(a.id)) err("athlete.id", "minuscules, chiffres et tirets uniquement");
    if (typeof a.prenom !== "string" || !a.prenom.trim()) err("athlete.prenom", "prénom manquant");
  }

  const p = brut.physiologie;
  const allures = {};
  const sources = {};
  if (!estObjet(p)) err("physiologie", "section manquante");
  else {
    nombre(p.fcMax, "physiologie.fcMax", 120, 230, " bpm");
    if (!["mesuree", "estimee"].includes(p.fcMaxSource)) err("physiologie.fcMaxSource", "« mesuree » ou « estimee »");
    for (const f of ["fond", "tempo", "seuil", "recup"]) {
      const v = p.allures?.[f];
      const chemin = `physiologie.allures.${f}`;
      if (!estObjet(v)) { err(chemin, "allure manquante"); continue; }
      if (nombre(v.valeur, `${chemin}.valeur`, 150, 900, " s/km")) allures[f] = v.valeur;
      if (typeof v.source !== "string" || !v.source.trim()) err(`${chemin}.source`, "indiquer la séance qui a servi à fixer cette allure");
      sources[f] = v.source;
    }
    if (Object.keys(allures).length === 4 && !(allures.seuil < allures.tempo && allures.tempo < allures.fond && allures.fond < allures.recup)) {
      err("physiologie.allures", "ordre attendu : seuil plus rapide que tempo, plus rapide que fondamental, plus rapide que récupération");
    }
    if (p.vitesseAscensionnelle != null) nombre(p.vitesseAscensionnelle, "physiologie.vitesseAscensionnelle", 300, 2000, " m/h");
  }

  if (brut.terrain != null) {
    if (brut.terrain.dplusParKm != null) nombre(brut.terrain.dplusParKm, "terrain.dplusParKm", 0, 150, " m/km");
    if (brut.terrain.penaliteParCentM != null) nombre(brut.terrain.penaliteParCentM, "terrain.penaliteParCentM", 0, 600, " s");
  }

  const r = brut.reference;
  if (r != null) {
    date(r.date, "reference.date");
    nombre(r.distance, "reference.distance", 1000, 400000, " m");
    nombre(r.dplus, "reference.dplus", 0, 20000, " m");
    nombre(r.temps, "reference.temps", 600, 200000, " s");
  }

  if (!estObjet(brut.etat)) err("etat", "section manquante");
  else nombre(brut.etat.volumeHebdo, "etat.volumeHebdo", 0, 300000, " m");

  const d = brut.disponibilites;
  if (!estObjet(d) || !Array.isArray(d.jours)) err("disponibilites.jours", "liste des jours manquante");
  else {
    if (d.jours.length < 2 || d.jours.length > 6) err("disponibilites.jours", "2 à 6 jours attendus");
    const vus = new Set();
    d.jours.forEach((j, i) => {
      const c = `disponibilites.jours[${i}]`;
      if (!Number.isInteger(j.jour) || j.jour < 1 || j.jour > 7) err(`${c}.jour`, "1 (lundi) à 7 (dimanche)");
      if (vus.has(j.jour)) err(`${c}.jour`, "jour en double");
      vus.add(j.jour);
      if (!ROLES.includes(j.role)) err(`${c}.role`, `rôle attendu : ${ROLES.join(", ")}`);
      nombre(j.dureeMax, `${c}.dureeMax`, 1200, 43200, " s");
      if (j.dureeMaxPonctuelle != null) nombre(j.dureeMaxPonctuelle, `${c}.dureeMaxPonctuelle`, 1200, 43200, " s");
    });
    if (d.jours.filter((j) => j.role === "longue").length !== 1) err("disponibilites.jours", "un et un seul jour de sortie longue");
    (d.indisponibilites || []).forEach((x, i) => {
      date(x.du, `disponibilites.indisponibilites[${i}].du`);
      date(x.au, `disponibilites.indisponibilites[${i}].au`);
    });
  }

  for (const [nom, act] of Object.entries(brut.activites || {})) {
    if (act.usage != null && !USAGES.includes(act.usage)) err(`activites.${nom}.usage`, `valeur attendue : ${USAGES.join(", ")}`);
  }

  if (!Array.isArray(brut.objectifs) || !brut.objectifs.length) err("objectifs", "au moins un objectif");
  else {
    brut.objectifs.forEach((o, i) => {
      const c = `objectifs[${i}]`;
      if (!["A", "B", "C"].includes(o.priorite)) err(`${c}.priorite`, "A, B ou C");
      if (typeof o.nom !== "string" || !o.nom.trim()) err(`${c}.nom`, "nom manquant");
      date(o.date, `${c}.date`);
      nombre(o.distance, `${c}.distance`, 1000, 400000, " m");
      nombre(o.dplus, `${c}.dplus`, 0, 30000, " m");
      if (o.technicite != null && !TECHNICITES.includes(o.technicite)) err(`${c}.technicite`, `valeur attendue : ${TECHNICITES.join(", ")}`);
    });
    if (!brut.objectifs.some((o) => o.priorite === "A")) err("objectifs", "un objectif de priorité A est nécessaire pour construire le plan");
  }

  (brut.seancesImposees || []).forEach((s, i) => {
    const c = `seancesImposees[${i}]`;
    date(s.date, `${c}.date`);
    if (!["course", "montagne", "longue"].includes(s.type)) err(`${c}.type`, "course, montagne ou longue");
    nombre(s.distance, `${c}.distance`, 1000, 200000, " m");
  });

  if (erreurs.length) return { ok: false, erreurs, fiche: null };

  const fiche = structuredClone(brut);
  fiche.physiologie.allures = allures;
  fiche.physiologie.sourcesAllures = sources;
  fiche.physiologie.vitesseAscensionnelle ??= 900;
  fiche.terrain = { dplusParKm: 35, penaliteParCentM: 120, ...(brut.terrain || {}) };
  fiche.disponibilites.indisponibilites ??= [];
  fiche.seancesImposees ??= [];
  fiche.activites ??= {};
  fiche.regles ??= {};
  fiche.renfo ??= { seancesParSemaine: 0, jours: [], exercices: [] };
  return { ok: true, erreurs: [], fiche };
}
