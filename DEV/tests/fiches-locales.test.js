// Fiches réelles : servies par DEV/tools/serve.py depuis le dossier Casse-Pattes-fiches (hors dépôt).
// Ignoré quand ce dossier n'existe pas. Aucune valeur propre à un athlète n'est écrite ici.

import { test, ignorer, vrai } from "./harness.js";
import { validerFiche } from "../../docs/js/data/fiche.js";
import { genererPlan } from "../../docs/js/core/planner.js";
import { verifierPlan } from "./planner.test.js";

test("fiches locales : validation et invariants du plan", async () => {
  let r;
  try { r = await fetch("/fiches/"); } catch { ignorer("serveur local sans dossier de fiches"); }
  if (!r.ok) ignorer("dossier des fiches absent (normal hors du poste de travail)");
  const noms = [...(await r.text()).matchAll(/href="([^"]+\.casse-pattes\.json)"/g)].map((m) => decodeURIComponent(m[1]));
  if (!noms.length) ignorer("aucune fiche dans le dossier");
  const erreurs = [];
  for (const nom of noms) {
    const v = validerFiche(await (await fetch(`/fiches/${encodeURIComponent(nom)}`)).json());
    if (!v.ok) { erreurs.push(`${nom} : ${v.erreurs.map((e) => `${e.chemin} ${e.message}`).join(", ")}`); continue; }
    const e = verifierPlan(genererPlan(v.fiche), v.fiche);
    if (e.length) erreurs.push(`${nom} : ${e.join(" ; ")}`);
  }
  vrai(!erreurs.length, erreurs.join(" | "));
});
