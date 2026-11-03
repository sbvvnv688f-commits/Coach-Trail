// Objectif : course, scénarios de temps, phases du plan, points de contrôle.

import { h } from "../dom.js";
import { fmtDuree, fmtKm, fmtMetres, fmtDateLongue, fmtDateCourte, ecartJours, fmtAllure } from "../../core/units.js";
import { distanceEffort, allureEffort, EXPOSANT_RIEGEL, MAJORATION_TECHNICITE } from "../../core/predict.js";

const TECHNICITE = { roulant: "roulant", mixte: "mixte", technique: "technique" };

export function vueObjectif(app) {
  const { plan, aujourdhui } = app.etat;
  const fiche = app.ficheActive();
  const o = plan.objectif;
  const ref = fiche.reference;
  const reste = ecartJours(aujourdhui, o.date);

  return h("section", { class: "vue vue-objectif" },
    h("h1", {}, o.nom),
    h("p", { class: "sous-titre" }, `${capitaliser(fmtDateLongue(o.date))}${reste > 0 ? ` · dans ${reste} jours` : ""}`),
    h("div", { class: "chiffres" },
      h("div", { class: "chiffre" }, h("b", {}, `${fmtKm(o.distance, 0)} km`), h("span", {}, "distance")),
      h("div", { class: "chiffre" }, h("b", {}, `${fmtMetres(o.dplus)} m`), h("span", {}, "dénivelé +")),
      h("div", { class: "chiffre" }, h("b", {}, `${Math.round(distanceEffort(o.distance, o.dplus))} km`), h("span", {}, "distance-effort"))),
    h("p", { class: "discret" },
      `Terrain ${TECHNICITE[o.technicite] ?? "non précisé"}${o.batons ? ", avec bâtons" : ""}. La distance-effort ajoute 1 km par 100 m de D+ : elle rend comparables des courses de profils différents.`),

    plan.scenarios.length ? h("section", { class: "bloc" },
      h("h2", {}, "Temps visés"),
      plan.scenarios.map((s) => h("div", { class: `scenario${s.id === "realiste" ? " retenu" : ""}` },
        h("div", { class: "scenario-tete" }, h("b", {}, s.nom), h("span", { class: "scenario-temps" }, fmtDuree(s.temps))),
        h("p", {}, s.texte),
        h("p", { class: "discret" }, `${fmtAllure(allureEffort(s.temps, o.distance, o.dplus))} par km-effort`))),
      h("p", { class: "discret" },
        `Calcul : ${ref.nom} (${fmtKm(ref.distance)} km, ${fmtMetres(ref.dplus)} m D+, ${fmtDuree(ref.temps)}) transposé par la loi de Riegel (exposant ${String(EXPOSANT_RIEGEL).replace(".", ",")}), `
        + `majoré de ${Math.round(((MAJORATION_TECHNICITE[o.technicite] ?? 1) - 1) * 100)} % pour le terrain. La sortie test de la phase spécifique affinera la cible.`),
      ref.commentaire ? h("div", { class: "encadre attention" }, h("b", {}, "Leçon de la course de référence. "), ref.commentaire) : null)
      : h("p", { class: "discret" }, "Ajoute une course de référence à la fiche pour obtenir des temps visés."),

    h("section", { class: "bloc" },
      h("h2", {}, "Les phases du plan"),
      h("ol", { class: "frise" }, plan.phases.map((p) => h("li", { class: aujourdhui >= p.debut && aujourdhui <= p.fin ? "en-cours" : aujourdhui > p.fin ? "faite" : "" },
        h("b", {}, p.nom),
        h("span", { class: "discret" }, ` · ${fmtDateCourte(p.debut)} → ${fmtDateCourte(p.fin)} · ${p.semaines} sem.`),
        h("p", {}, p.but))))),

    h("section", { class: "bloc" },
      h("h2", {}, "Points de contrôle"),
      plan.pointsControle.map((p) => h("button", { type: "button", class: "controle", onclick: () => app.ouvrirSeance(p.id) },
        h("span", { class: "controle-date" }, fmtDateCourte(p.date)),
        h("span", {}, h("b", {}, p.titre), ` · ${fmtKm(p.distance, 0)} km, ${fmtMetres(p.dplus)} m D+`, h("em", {}, p.texte))))),
  );
}

function capitaliser(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
