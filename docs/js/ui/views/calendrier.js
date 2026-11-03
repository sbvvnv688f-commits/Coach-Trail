// Calendrier mensuel : une case par jour, du lundi au dimanche, résumé sous chaque semaine.

import { h, icone, ICONES } from "../dom.js";
import { ajouterJours, lundiDe, ecartJours, fmtMois, fmtKm, fmtDuree, fmtMetres, fmtDateLongue, fmtDateCourte, JOURS_COURTS } from "../../core/units.js";
import { PHASES } from "../../core/planner.js";
import { LIBELLES_NIVEAU } from "../../core/zones.js";

// Abréviations courtes : une case fait environ 50 px de large sur iPhone.
const COURT = { Vallonné: "Vallon.", Footing: "Foot.", Montagne: "Mont." };

function premierDuMois(iso) { return `${iso.slice(0, 7)}-01`; }
function moisVoisin(mois, delta) {
  const [a, m] = mois.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + delta, 1)).toISOString().slice(0, 10);
}

export function vueCalendrier(app) {
  const { plan, aujourdhui } = app.etat;
  if (!app.etat.mois) {
    app.etat.mois = premierDuMois(aujourdhui >= plan.debut && aujourdhui <= plan.fin ? aujourdhui : plan.debut);
  }
  const mois = app.etat.mois;

  const parDate = new Map();
  const parLundi = new Map();
  for (const sem of plan.semaines) {
    parLundi.set(sem.lundi, sem);
    for (const s of sem.seances) parDate.set(s.date, s);
  }

  const dernier = ajouterJours(moisVoisin(mois, 1), -1);
  const lignes = [];
  for (let lundi = lundiDe(mois); lundi <= dernier; lundi = ajouterJours(lundi, 7)) {
    const sem = parLundi.get(lundi);
    if (!sem && (lundi < plan.debut || lundi > plan.fin)) continue; // semaine hors du plan
    const cases = [];
    for (let j = 0; j < 7; j++) {
      const d = ajouterJours(lundi, j);
      cases.push(caseJour(app, d, parDate.get(d), mois, aujourdhui, plan));
    }
    lignes.push(h("div", { class: `semaine${sem?.allegee ? " allegee" : ""}` }, cases));
    if (sem) lignes.push(resumeSemaine(sem, lundi === lundiDe(aujourdhui)));
  }

  const premierPlan = premierDuMois(plan.debut);
  const changer = (delta) => { app.etat.mois = moisVoisin(mois, delta); app.rendre(); };

  return h("section", { class: "vue vue-calendrier" },
    compteARebours(plan, aujourdhui, parLundi),
    h("div", { class: "mois-nav" },
      h("button", { type: "button", class: "nav-mois", "aria-label": "Mois précédent", disabled: mois <= premierPlan, onclick: () => changer(-1) }, icone(ICONES.precedent)),
      h("h1", { "aria-live": "polite" }, fmtMois(mois)),
      h("button", { type: "button", class: "nav-mois", "aria-label": "Mois suivant", disabled: moisVoisin(mois, 1) > plan.fin, onclick: () => changer(1) }, icone(ICONES.suivant))),
    mois !== premierDuMois(aujourdhui) && aujourdhui >= plan.debut && aujourdhui <= plan.fin
      ? h("button", { type: "button", class: "lien retour-aujourdhui", onclick: () => { app.etat.mois = premierDuMois(aujourdhui); app.rendre(); } }, "Revenir à aujourd'hui")
      : null,
    h("div", { class: "jours-entete", "aria-hidden": "true" }, JOURS_COURTS.map((j) => h("span", {}, j))),
    h("div", { class: "grille" }, lignes),
    legende(),
  );
}

function compteARebours(plan, aujourdhui, parLundi) {
  const reste = ecartJours(aujourdhui, plan.objectif.date);
  const sem = parLundi.get(lundiDe(aujourdhui));
  return h("div", { class: "compte" },
    h("div", { class: "compte-jours" },
      reste > 0 ? h("b", {}, `J-${reste}`) : reste === 0 ? h("b", {}, "Jour J") : h("b", {}, "Terminé")),
    h("div", { class: "compte-texte" },
      h("strong", {}, plan.objectif.nom),
      h("span", {}, `${fmtDateCourte(plan.objectif.date)} · ${fmtKm(plan.objectif.distance, 0)} km · ${fmtMetres(plan.objectif.dplus)} m D+`),
      sem ? h("span", { class: "compte-phase" }, `Semaine ${sem.numero} · ${PHASES[sem.phase].nom}${sem.allegee ? " · allégée" : ""}`) : null));
}

function caseJour(app, d, s, mois, aujourdhui, plan) {
  const classes = ["case"];
  if (d.slice(0, 7) !== mois.slice(0, 7)) classes.push("hors-mois");
  if (d === aujourdhui) classes.push("aujourdhui");
  if (d < aujourdhui) classes.push("passe");
  const num = h("span", { class: "case-num" }, String(Number(d.slice(8))));

  if (!s) {
    if (d >= plan.debut && d <= plan.fin) classes.push("repos");
    return h("div", { class: classes.join(" "), "aria-label": d >= plan.debut && d <= plan.fin ? `${fmtDateLongue(d)} : repos` : null }, num);
  }

  classes.push(`n${s.niveau}`);
  if (s.role === "course") classes.push("course");
  if (s.deplacee) classes.push("deplacee");
  const etiquette = `${fmtDateLongue(d)} : ${s.titre}, ${fmtKm(s.distance)} km, ${s.dplus} m de D+, ${fmtDuree(s.duree)}, intensité ${LIBELLES_NIVEAU[s.niveau].toLowerCase()}${s.renfo ? ", avec renforcement" : ""}${s.cle ? ", séance clé" : ""}`;
  return h("button", { type: "button", class: classes.join(" "), "aria-label": etiquette, onclick: () => app.ouvrirSeance(s.id) },
    num,
    s.cle ? h("span", { class: "case-cle", "aria-hidden": "true" }, "★") : null,
    h("span", { class: "case-type" }, COURT[s.type] ?? s.type),
    h("span", { class: "case-km" }, fmtKm(s.distance, s.distance >= 9950 ? 0 : 1)),
    s.dplus >= 50 ? h("span", { class: "case-dp" }, `+${s.dplus}`) : null,
    s.renfo ? h("span", { class: "case-renfo", "aria-hidden": "true" }) : null);
}

function resumeSemaine(sem, courante) {
  const t = sem.totaux;
  return h("div", { class: `resume${courante ? " courante" : ""}` },
    h("span", { class: "resume-phase" }, `S${sem.numero} · ${PHASES[sem.phase].nom}${sem.allegee ? " · allégée" : ""}`),
    h("span", { class: "resume-totaux" }, `${fmtKm(t.distance, 0)} km · ${fmtMetres(t.dplus)} m · ${fmtDuree(t.duree)}`));
}

function legende() {
  return h("div", { class: "legende" },
    [1, 2, 3, 4].map((n) => h("span", { class: "legende-item" }, h("i", { class: `pastille n${n}` }), LIBELLES_NIVEAU[n])),
    h("span", { class: "legende-item" }, h("i", { class: "pastille-renfo" }), "Renfo"),
    h("span", { class: "legende-item" }, "★ Séance clé"));
}
