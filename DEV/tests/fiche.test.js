import { test, vrai, egal } from "./harness.js";
import { validerFiche } from "../../docs/js/data/fiche.js";

export async function chargerFictive() {
  const r = await fetch("./fixtures/fiche-fictive.json");
  return r.json();
}

test("fiche fictive valide et normalisée", async () => {
  const v = validerFiche(await chargerFictive());
  vrai(v.ok, JSON.stringify(v.erreurs));
  egal(v.fiche.physiologie.allures.fond, 360);
  egal(v.fiche.physiologie.sourcesAllures.fond, "Valeur fictive");
});

test("fichier qui n'est pas une fiche : refus explicite", () => {
  const v = validerFiche({ format: "autre" });
  vrai(!v.ok && v.erreurs[0].chemin === "format", JSON.stringify(v.erreurs));
});

test("allure « 53 » refusée avec le chemin du champ", async () => {
  const f = await chargerFictive();
  f.physiologie.allures.seuil.valeur = 53;
  const v = validerFiche(f);
  vrai(!v.ok, "aurait dû échouer");
  vrai(v.erreurs.some((e) => e.chemin === "physiologie.allures.seuil.valeur"), JSON.stringify(v.erreurs));
});

test("deux jours de sortie longue refusés", async () => {
  const f = await chargerFictive();
  f.disponibilites.jours[0].role = "longue";
  vrai(validerFiche(f).erreurs.some((e) => e.chemin === "disponibilites.jours"));
});

test("date impossible refusée", async () => {
  const f = await chargerFictive();
  f.objectifs[0].date = "2027-02-30";
  vrai(validerFiche(f).erreurs.some((e) => e.chemin === "objectifs[0].date"));
});
