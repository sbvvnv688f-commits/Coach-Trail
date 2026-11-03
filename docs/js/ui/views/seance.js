// Détail d'une séance, affiché dans le volet bas.

import { h, icone, ICONES } from "../dom.js";
import { fmtAllure, fmtDuree, fmtKm, fmtMetres, fmtDateLongue, JOURS_LONGS, jourSemaine } from "../../core/units.js";
import { ngpFiliere } from "../../core/session.js";
import { plageFc, LIBELLES_NIVEAU } from "../../core/zones.js";
import { PHASES, joursLibres } from "../../core/planner.js";
import { RESSENTIS, NGP_EXPLICATION, RENFO_REGLE } from "../../data/textes.js";
import { seanceRenfo } from "../../data/exercices.js";

export function ficheSeance(app, s) {
  const fiche = app.ficheActive();
  const semaine = app.etat.plan.semaines.find((x) => x.numero === s.semaine);
  const fc = plageFc(s.filiere, fiche.physiologie.fcMax, fiche.regles?.plafondsFc || {}, fiche.physiologie.zones);

  return h("article", { class: "seance", "aria-labelledby": "seance-titre" },
    h("header", { class: "seance-entete" },
      h("div", {},
        h("h2", { id: "seance-titre" }, s.cle ? "★ " : "", s.titre),
        h("p", { class: "sous-titre" }, `${capitaliser(fmtDateLongue(s.date))} · semaine ${s.semaine} · ${PHASES[s.phase].nom}`),
        s.deplacee ? h("p", { class: "sous-titre" }, `Prévue le ${fmtDateLongue(s.datePrevue)}`) : null),
      h("button", { type: "button", class: "fermer", "aria-label": "Fermer", onclick: app.fermerVolet }, icone(ICONES.fermer))),

    h("div", { class: "chiffres" },
      chiffre(`${fmtKm(s.distance)} km`, "distance"),
      chiffre(s.dplus ? `${fmtMetres(s.dplus)} m` : "—", "dénivelé +"),
      chiffre(fmtDuree(s.duree), s.role === "course" ? "temps visé" : "durée")),

    h("p", { class: `intensite n${s.niveau}` }, h("i", { class: `pastille n${s.niveau}` }), `Intensité : ${LIBELLES_NIVEAU[s.niveau].toLowerCase()} (${s.niveau}/5)`),

    bloc("Allure ajustée à tenir (NGP)",
      h("div", { class: "ngp" }, h("b", {}, fmtAllure(s.ngp)), " /km", h("span", {}, NGP_EXPLICATION))),

    bloc("Déroulé", deroule(s, fiche.physiologie.allures)),

    bloc("Fréquence cardiaque",
      h("p", {}, `${capitaliser(fc.libelle)}, ${fc.bas}-${fc.haut} bpm`),
      fc.plafond ? h("p", { class: "discret" }, `Plafond de ta fiche : ${fc.plafond} bpm. Au-delà, ralentis ou marche.`) : null),

    bloc("Ressenti attendu", h("div", { class: "encadre" }, RESSENTIS[s.filiere] || RESSENTIS.fond)),

    s.note || s.controle ? bloc("Consigne du coach",
      s.controle ? h("div", { class: "encadre cle" }, s.controle) : null,
      s.note ? h("div", { class: "encadre attention" }, s.note) : null) : null,

    s.alternatives?.length ? bloc("S'il y a de la neige", s.alternatives.map((a) => h("div", { class: "alternative" },
      h("b", {}, a.activite),
      h("span", {}, `${fmtDuree(a.duree)}${a.dplus ? ` · environ ${fmtMetres(a.dplus)} m D+` : ""}`),
      h("em", {}, a.texte)))) : null,

    s.renfo ? renfo(fiche, s) : null,

    deplacement(app, s, semaine),
  );
}

// Déroulé tel que décrit (répétitions regroupées), et non déplié bloc par bloc.
function deroule(s, allures) {
  const etape = (b, duree) => h("div", { class: "etape-texte" },
    h("span", {}, b.titre.replace(/ \{i\} sur \{n\}/, "").replace(/ sur \{n\}/, "")),
    h("span", { class: "ngp-mini" }, `NGP ${fmtAllure(ngpFiliere(b.filiere, allures))}`),
    duree ? h("span", { class: "discret" }, ` · ${duree}`) : null,
    b.consigne ? h("em", {}, b.consigne) : null);
  let i = 0;
  return (s.deroule || []).map((b) => {
    if (b.repeter) {
      const total = b.blocs.reduce((t, x) => t + x.duree, 0) * b.repeter
        - (b.sansDernier ? b.blocs.slice(-b.sansDernier).reduce((t, x) => t + x.duree, 0) : 0);
      i += b.repeter * b.blocs.length - (b.sansDernier || 0);
      return h("div", { class: "etape" },
        h("div", { class: "etape-duree" }, `${b.repeter} ×`, h("small", {}, fmtDuree(total))),
        h("div", { class: "etape-groupe" }, b.blocs.map((x, k) => etape(x,
          `${dureeCourte(x.duree)}${b.sansDernier && k >= b.blocs.length - b.sansDernier ? " (sauf après le dernier)" : ""}`))));
    }
    const calc = s.blocs[i++];
    const longue = b.filiere === "longue" || b.filiere === "course";
    return h("div", { class: "etape" },
      h("div", { class: "etape-duree" }, longue ? `${fmtKm(calc.distance)} km` : fmtDuree(calc.duree)),
      etape(b, longue ? fmtDuree(calc.duree) : null));
  });
}

function dureeCourte(s) {
  if (s >= 600 || s % 60 === 0) return fmtDuree(s);
  return `${Math.floor(s / 60)}'${String(Math.round(s % 60)).padStart(2, "0")}`;
}

function renfo(fiche, s) {
  const jours = [...(fiche.renfo.jours || [])].sort();
  const rang = Math.max(0, jours.indexOf(jourSemaine(s.datePrevue)));
  const exercices = seanceRenfo(fiche.renfo.exercices || [], rang);
  if (!exercices.length) return null;
  const allege = s.phase === "affutage";
  return bloc(`Renforcement ${rang === 0 ? "A — force" : "B — stabilité"}, après la course`,
    allege ? h("p", { class: "discret" }, "Affûtage : moitié des séries, aucune charge additionnelle.") : null,
    exercices.map((e) => h("details", { class: "exercice" },
      h("summary", {}, h("span", {}, e.nom), h("b", {}, e.series)),
      h("p", {}, e.technique),
      h("p", { class: "eviter" }, `À éviter : ${e.eviter}`),
      h("p", { class: "discret" }, e.interet))),
    h("p", { class: "discret" }, RENFO_REGLE));
}

function deplacement(app, s, semaine) {
  if (!semaine || s.role === "course") return null;
  const libres = joursLibres(semaine, s).filter((d) => d !== s.datePrevue);
  return bloc("Déplacer dans la semaine",
    h("div", { class: "jours-libres" },
      libres.map((d) => h("button", { type: "button", class: "puce", onclick: () => app.deplacerSeance(s, d) },
        `${capitaliser(JOURS_LONGS[jourSemaine(d) - 1])} ${Number(d.slice(8))}`))),
    s.deplacee ? h("button", { type: "button", class: "bouton secondaire", onclick: () => app.deplacerSeance(s, s.datePrevue) }, "Remettre au jour prévu") : null,
    h("p", { class: "discret" }, "Le reste du plan ne bouge pas. Évite d'enchaîner deux séances exigeantes. Dans le calendrier, tu peux aussi faire un appui long sur une case puis la glisser vers un autre jour."));
}

function chiffre(valeur, libelle) {
  return h("div", { class: "chiffre" }, h("b", {}, valeur), h("span", {}, libelle));
}

function bloc(titre, ...contenu) {
  return h("section", { class: "bloc" }, h("h3", {}, titre), contenu);
}

function capitaliser(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
