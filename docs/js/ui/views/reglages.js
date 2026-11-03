// Réglages : état du stockage, sauvegarde par fichier, version.

import { h } from "../dom.js";
import { VERSION_APP } from "../../version.js";
import { construireSauvegarde, partagerFichier, nomSauvegarde } from "../../store/backup.js";
import { lirePref, ecrirePref } from "../../store/settings.js";
import { fmtDateLongue } from "../../core/units.js";
import * as db from "../../store/db.js";

export function vueReglages(app) {
  const s = app.etat.stockage;
  const derniere = lirePref("derniereSauvegarde");

  async function sauvegarder() {
    const fiches = [...app.etat.fiches.values()].map((x) => x.brut);
    const deplacements = {};
    for (const id of app.etat.fiches.keys()) deplacements[id] = (await db.lire("deplacements", id)) || {};
    const r = await partagerFichier(construireSauvegarde(fiches, deplacements), nomSauvegarde());
    if (r !== "annule") {
      ecrirePref("derniereSauvegarde", new Date().toISOString().slice(0, 10));
      app.message("Sauvegarde créée");
      app.rendre();
    }
  }

  async function persister() {
    const ok = await navigator.storage?.persist?.();
    app.etat.stockage.persistant = !!ok;
    app.message(ok ? "Stockage persistant accordé" : "Le navigateur n'a pas accordé le stockage persistant");
    app.rendre();
  }

  return h("section", { class: "vue vue-reglages" },
    h("h1", {}, "Réglages"),

    h("section", { class: "bloc" },
      h("h2", {}, "Stockage sur cet appareil"),
      etat("Base de données locale", s.base),
      etat("Préférences", s.prefs),
      etat("Stockage persistant", s.persistant, "non demandé ou refusé"),
      s.persistant ? null : h("button", { type: "button", class: "bouton secondaire", onclick: persister }, "Demander le stockage persistant"),
      h("p", { class: "discret" }, "Sur iPhone, utilise Casse-Pattes depuis l'écran d'accueil : Safari peut effacer les données d'un site inutilisé pendant sept jours, pas celles d'une application de l'écran d'accueil.")),

    h("section", { class: "bloc" },
      h("h2", {}, "Sauvegarde"),
      h("p", {}, derniere ? `Dernière sauvegarde : ${fmtDateLongue(derniere)}.` : "Aucune sauvegarde depuis cet appareil."),
      h("p", { class: "discret" }, "Le fichier contient tes fiches et tes séances déplacées. Enregistre-le dans Fichiers ; pour restaurer, importe-le comme une fiche."),
      h("button", { type: "button", class: "bouton", disabled: !app.etat.fiches.size, onclick: sauvegarder }, "Créer une sauvegarde"),
      h("button", { type: "button", class: "bouton secondaire", onclick: app.choisirFichier }, "Restaurer une sauvegarde")),

    h("section", { class: "bloc" },
      h("h2", {}, "Application"),
      h("p", {}, `Casse-Pattes, version ${VERSION_APP}`),
      app.etat.majEnAttente ? h("button", { type: "button", class: "bouton", onclick: app.activerMiseAJour }, "Installer la nouvelle version") : null,
      h("p", { class: "discret" }, h("a", { href: "./v4/" }, "Ancienne application Coach Trail (v4)"))),
  );
}

function etat(nom, ok, sinon = "indisponible") {
  return h("div", { class: "ligne" }, h("span", {}, nom),
    h("b", { class: ok ? "ok" : "ko" }, ok ? "actif" : ok === null ? "inconnu" : sinon));
}
