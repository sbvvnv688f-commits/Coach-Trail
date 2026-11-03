// Sauvegarde complète par fichier : fiches importées, séances déplacées et validées, allures et zones modifiées.
// Sur iPhone, le fichier passe par la feuille de partage (Enregistrer dans Fichiers, AirDrop…).

import { VERSION_APP } from "../version.js";
import { aujourdhui } from "../core/units.js";

export const FORMAT_SAUVEGARDE = "casse-pattes/sauvegarde";

export function construireSauvegarde(fiches, deplacements, ajustements = {}, realisees = {}) {
  return {
    format: FORMAT_SAUVEGARDE,
    version: 1,
    application: VERSION_APP,
    date: new Date().toISOString(),
    fiches,
    deplacements,
    ajustements,
    realisees,
  };
}

export async function partagerFichier(contenu, nom) {
  const fichier = new File([JSON.stringify(contenu, null, 2)], nom, { type: "application/json" });
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: nom });
      return "partage";
    } catch (e) {
      if (e.name === "AbortError") return "annule";
    }
  }
  const url = URL.createObjectURL(fichier);
  const a = Object.assign(document.createElement("a"), { href: url, download: nom });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return "telechargement";
}

export function nomSauvegarde() {
  return `casse-pattes-sauvegarde-${aujourdhui()}.json`;
}

export function lireFichierTexte(fichier) {
  return new Promise((resoudre, rejeter) => {
    const r = new FileReader();
    r.onload = () => resoudre(r.result);
    r.onerror = () => rejeter(new Error("le fichier n'a pas pu être lu"));
    r.readAsText(fichier);
  });
}
