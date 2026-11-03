// Cohérence de la publication : version du service worker et fichiers mis en cache.

import { test, egal, vrai } from "./harness.js";
import { VERSION_APP } from "../../docs/js/version.js";

async function sourceSw() {
  return (await fetch("../../docs/sw.js")).text();
}

test("version du service worker = version de l'application", async () => {
  const m = (await sourceSw()).match(/const VERSION = "([^"]+)"/);
  egal(m?.[1], VERSION_APP);
});

test("chaque fichier mis en cache par le service worker existe", async () => {
  const src = await sourceSw();
  const liste = [...src.slice(src.indexOf("FICHIERS")).matchAll(/"(\.\/[^"]*)"/g)].map((m) => m[1]);
  vrai(liste.length > 10, "liste de fichiers introuvable");
  const absents = [];
  for (const f of liste) {
    const r = await fetch(new URL(f, new URL("../../docs/", location.href)));
    if (!r.ok) absents.push(f);
  }
  vrai(!absents.length, `absents : ${absents.join(", ")}`);
});

test("le site publié ne contient aucune fiche athlète", async () => {
  const src = await sourceSw();
  vrai(!/casse-pattes\.json/.test(src), "une fiche est listée dans le cache");
});
