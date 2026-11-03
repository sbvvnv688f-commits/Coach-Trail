import { test, egal, proche, vrai } from "./harness.js";
import { fmtAllure, fmtDuree, ajouterJours, jourSemaine, lundiDe, ecartJours, estDateISO } from "../../docs/js/core/units.js";
import { zoneDeFc, plageFc } from "../../docs/js/core/zones.js";
import { calculerSeance } from "../../docs/js/core/session.js";
import { predireTemps, distanceEffort } from "../../docs/js/core/predict.js";

const profil = {
  physiologie: { fcMax: 190, allures: { fond: 339, tempo: 320, seuil: 295, recup: 400 }, vitesseAscensionnelle: 800 },
  terrain: { dplusParKm: 35, penaliteParCentM: 120 },
};

test("allure : 357 s/km s'affiche 5'57", () => egal(fmtAllure(357), "5'57"));
test("allure : arrondi sans 60 secondes", () => egal(fmtAllure(359.7), "6'00"));
test("durée : 1h05 et 44 min", () => { egal(fmtDuree(3900), "1h05"); egal(fmtDuree(2640), "44 min"); });

test("dates : jours de la semaine et lundi", () => {
  egal(jourSemaine("2027-03-28"), 7, "28 mars 2027 est un dimanche :");
  egal(lundiDe("2026-11-01"), "2026-10-26");
  egal(ajouterJours("2027-02-28", 1), "2027-03-01");
  egal(ecartJours("2026-10-05", "2027-03-22"), 168);
  vrai(estDateISO("2027-02-28") && !estDateISO("2027-02-30"), "validation de date");
});

test("zones : 140 bpm à 190 = zone 2, 172 = zone 4", () => {
  egal(zoneDeFc(140, 190), 2);
  egal(zoneDeFc(172, 190), 4);
});

test("plafond de FC appliqué à la plage", () => {
  const p = plageFc("seuil", 190, { seuil: 172 });
  egal(p.haut, 172);
});

test("durée d'une séance = somme des blocs (44 min de blocs → 44 min)", () => {
  const s = { blocs: [
    { duree: 900, filiere: "fond" },
    { repeter: 3, sansDernier: 1, blocs: [{ duree: 480, filiere: "seuil" }, { duree: 180, filiere: "recup" }] },
    { duree: 180, filiere: "recup" },
  ] };
  const c = calculerSeance(s, profil);
  egal(c.duree, 900 + 3 * 480 + 2 * 180 + 180);
  egal(Math.round(c.duree / 60), 48);
  const s2 = { blocs: [{ duree: 1500, filiere: "fond" }, { duree: 1140, filiere: "tempo" }] };
  egal(Math.round(calculerSeance(s2, profil).duree / 60), 44);
});

test("sortie longue : la distance fixée reste la distance (42 km = 42 km)", () => {
  const c = calculerSeance({ role: "longue", blocs: [{ distance: 42000, dplus: 1200, filiere: "longue" }] }, profil);
  egal(c.distance, 42000);
  egal(c.dplus, 1200);
});

test("calibrage : 16,4 km et 615 m D+ ≈ 1h45 au modèle", () => {
  const c = calculerSeance({ role: "longue", blocs: [{ distance: 16400, dplus: 615, filiere: "longue" }] }, profil);
  proche(c.duree / 60, 105, 1.5);
});

test("intensité : seuil = niveau 4, endurance = niveau 2", () => {
  egal(calculerSeance({ blocs: [{ duree: 600, filiere: "fond" }, { duree: 480, filiere: "seuil" }] }, profil).niveau, 4);
  egal(calculerSeance({ blocs: [{ duree: 3600, filiere: "fond", terrain: true }] }, profil).niveau, 2);
});

test("prédiction : la course de référence se prédit elle-même", () => {
  const ref = { distance: 42000, dplus: 1200, temps: 16200 };
  proche(predireTemps(ref, { ...ref }), 16200, 16200 * 0.02);
  proche(distanceEffort(50000, 2500), 75, 1e-9);
});
