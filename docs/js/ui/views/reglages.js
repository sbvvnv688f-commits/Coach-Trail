// Réglages : lexique, état du stockage, sauvegarde par fichier, version.

import { h, icone, ICONES } from "../dom.js";
import { LEXIQUE } from "../../data/lexique.js";
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
    const ajustements = {};
    const realisees = {};
    for (const id of app.etat.fiches.keys()) {
      deplacements[id] = (await db.lire("deplacements", id)) || {};
      const a = await db.lire("divers", `ajustements:${id}`);
      if (a) ajustements[id] = a;
      const r = await db.lire("divers", `realisees:${id}`);
      if (r) realisees[id] = r;
    }
    const r = await partagerFichier(construireSauvegarde(fiches, deplacements, ajustements, realisees), nomSauvegarde());
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
      h("h2", {}, "Aide"),
      h("button", { type: "button", class: "menu-entree", onclick: () => app.ouvrirVolet(lexique(app), "lexique-titre") },
        h("span", {}, h("b", {}, "Lexique"), h("em", {}, "Allures, zones, séances, phases du plan : les mots de l'application")),
        icone(ICONES.suivant))),

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
      h("p", { class: "discret" }, "Le fichier contient tes fiches, tes séances déplacées ou validées et tes allures ou zones modifiées. Enregistre-le dans Fichiers ; pour restaurer, importe-le comme une fiche."),
      h("button", { type: "button", class: "bouton", disabled: !app.etat.fiches.size, onclick: sauvegarder }, "Créer une sauvegarde"),
      h("button", { type: "button", class: "bouton secondaire", onclick: app.choisirFichier }, "Restaurer une sauvegarde")),

    h("section", { class: "bloc" },
      h("h2", {}, "Application"),
      h("p", {}, `Casse-Pattes, version ${VERSION_APP}`),
      app.etat.majEnAttente ? h("button", { type: "button", class: "bouton", onclick: app.activerMiseAJour }, "Installer la nouvelle version") : null),
  );
}

function lexique(app) {
  const liste = h("div", {});
  const termes = LEXIQUE.flatMap((t) => t.termes.map(([terme, def]) => ({ theme: t.theme, terme, def })));
  const afficher = (filtre = "") => {
    const f = normaliser(filtre);
    const garde = termes.filter((x) => !f || normaliser(`${x.terme} ${x.def}`).includes(f));
    liste.replaceChildren(...(garde.length ? LEXIQUE.filter((t) => garde.some((x) => x.theme === t.theme)).map((t) => h("section", { class: "bloc" },
      h("h3", {}, t.theme),
      h("dl", { class: "lexique" }, garde.filter((x) => x.theme === t.theme).map((x) => [h("dt", {}, x.terme), h("dd", {}, x.def)])))) : [h("p", { class: "discret" }, "Aucun terme ne correspond.")]));
  };
  afficher();
  return h("article", { class: "seance" },
    h("header", { class: "seance-entete" },
      h("div", {}, h("h2", { id: "lexique-titre" }, "Lexique")),
      h("button", { type: "button", class: "fermer", "aria-label": "Fermer", onclick: app.fermerVolet }, icone(ICONES.fermer))),
    h("input", { type: "search", class: "recherche", placeholder: "Chercher un terme", "aria-label": "Chercher un terme", oninput: (e) => afficher(e.target.value) }),
    liste);
}

function normaliser(t) {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function etat(nom, ok, sinon = "indisponible") {
  return h("div", { class: "ligne" }, h("span", {}, nom),
    h("b", { class: ok ? "ok" : "ko" }, ok ? "actif" : ok === null ? "inconnu" : sinon));
}
