// Allures et zones modifiées dans l'application : validation, zones en bpm, recalcul du plan et des temps visés.

import { test, egal, vrai, proche } from "./harness.js";
import { validerFiche } from "../../docs/js/data/fiche.js";
import { appliquerAjustements, validerAjustements } from "../../docs/js/core/ajustements.js";
import { zonesBpm, plageFc } from "../../docs/js/core/zones.js";
import { genererPlan } from "../../docs/js/core/planner.js";
import { LEXIQUE } from "../../docs/js/data/lexique.js";

async function ficheFictive() {
  const brut = await (await fetch("./fixtures/fiche-fictive.json")).json();
  return validerFiche(brut).fiche;
}

const realiste = (plan) => plan.scenarios.find((s) => s.id === "realiste").temps;

test("zones par défaut : 190 bpm → zone 2 de 133 à 152", () => {
  const z = zonesBpm(190);
  egal(z[1].bas, 133);
  egal(z[1].haut, 152);
  egal(z[4].haut, 190);
});

test("zones personnalisées : la plage d'une séance suit les bornes saisies", () => {
  const bornes = [110, 125, 150, 165, 178];
  const p = plageFc("fond", 190, {}, bornes);
  egal(p.bas, 125);
  egal(p.haut, 150);
  egal(plageFc("cote", 190, {}, bornes).haut, 178, "côtes zones 3-4 :");
  egal(plageFc("seuil", 190, { seuil: 172 }, bornes).haut, 172, "le plafond de la fiche reste appliqué :");
});

test("validation : ordre des allures, zones croissantes sous la FC max", () => {
  vrai(!validerAjustements({ allures: { fond: 340, tempo: 310, seuil: 290, recup: 400 }, fcMax: 190, zones: [114, 133, 152, 167, 179] }).length, "valeurs correctes refusées");
  vrai(validerAjustements({ allures: { fond: 300, tempo: 310, seuil: 290, recup: 400 } }).length, "tempo plus lent que le fondamental accepté");
  vrai(validerAjustements({ allures: { fond: 53, tempo: 40, seuil: 30, recup: 60 } }).length, "53 s/km accepté");
  vrai(validerAjustements({ fcMax: 190, zones: [114, 133, 130, 167, 179] }).length, "zones non croissantes acceptées");
  vrai(validerAjustements({ fcMax: 190, zones: [114, 133, 152, 167, 195] }).length, "zone 5 au-dessus de la FC max acceptée");
});

test("sans ajustement, la fiche effective donne le même plan", async () => {
  const f = await ficheFictive();
  const a = genererPlan(f), b = genererPlan(appliquerAjustements(f, null));
  egal(b.semaines.length, a.semaines.length);
  egal(realiste(b), realiste(a));
  egal(b.semaines[5].totaux.distance, a.semaines[5].totaux.distance);
});

test("allures plus rapides de 5 % : temps visés −5 %, séances en durée plus longues en km", async () => {
  const f = await ficheFictive();
  const vite = Object.fromEntries(Object.entries(f.physiologie.allures).map(([k, v]) => [k, Math.round(v * 0.95)]));
  const fe = appliquerAjustements(f, { allures: vite });
  proche(fe.ajustement.facteurPrediction, 0.95, 0.005);
  const a = genererPlan(f), b = genererPlan(fe);
  proche(realiste(b) / realiste(a), 0.95, 0.005, "temps réaliste :");
  const course = (p) => p.semaines.at(-1).seances.find((s) => s.role === "course");
  vrai(course(b).duree < course(a).duree, "la durée de la course ne baisse pas");
  const qualite = (p) => p.semaines[6].seances.find((s) => s.role === "qualite");
  egal(qualite(b).duree, qualite(a).duree, "une séance en durée garde sa durée :");
  vrai(qualite(b).distance > qualite(a).distance, "sa distance n'augmente pas");
  egal(fe.physiologie.allures.recup, vite.recup);
});

test("FC max modifiée sans zones : les zones suivent la FC max", async () => {
  const f = await ficheFictive();
  const fe = appliquerAjustements(f, { fcMax: 200 });
  egal(fe.physiologie.fcMax, 200);
  egal(fe.physiologie.zones[1], 140);
  vrai(fe.ajustement.fcMax && !fe.ajustement.zones, "drapeaux");
  egal(fe.ajustement.facteurPrediction, 1, "la FC max ne change pas les temps visés :");
});

test("lexique : termes uniques et définis", () => {
  const termes = LEXIQUE.flatMap((t) => t.termes);
  vrai(termes.length > 30, "lexique trop court");
  egal(new Set(termes.map(([t]) => t)).size, termes.length, "doublon :");
  vrai(termes.every(([t, d]) => t && d.length > 20), "définition manquante");
});
