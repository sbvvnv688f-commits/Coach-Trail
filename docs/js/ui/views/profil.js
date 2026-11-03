// Profil : fiche importée (résumé) et import. L'écran d'accueil s'affiche tant qu'aucune fiche n'existe.

import { h } from "../dom.js";
import { fmtAllure, fmtDuree, fmtDateLongue, fmtKm, fmtMetres, JOURS_LONGS } from "../../core/units.js";
import { ZONES } from "../../core/zones.js";

const ROLES = { qualite: "séance de qualité", endurance: "endurance", cotes: "côtes ou vallonné", longue: "sortie longue" };
const ALLURES = [["fond", "Fondamental"], ["tempo", "Tempo"], ["seuil", "Seuil"], ["recup", "Récupération"]];

function erreursImport(app) {
  const e = app.etat.erreursImport;
  if (!e?.length) return null;
  return h("div", { class: "bandeau alerte", role: "alert" },
    h("strong", {}, "Fiche refusée."),
    h("ul", {}, e.map((x) => h("li", {}, h("code", {}, x.chemin), ` : ${x.message}`))));
}

export function vueAccueil(app) {
  return h("section", { class: "vue vue-accueil" },
    h("img", { class: "accueil-logo", src: "icons/icon-512.png", alt: "Casse-Pattes" }),
    h("h1", {}, "Importe ta fiche athlète"),
    h("p", {}, "Casse-Pattes construit ton plan d'entraînement et tes objectifs à partir de ta fiche : un fichier qui t'est remis après l'entretien avec ton coach. Elle reste sur ce téléphone, rien n'est envoyé en ligne."),
    h("button", { type: "button", class: "bouton", onclick: app.choisirFichier }, "Choisir ma fiche"),
    h("p", { class: "discret" }, "Le fichier se termine par .casse-pattes.json. Enregistre-le d'abord dans Fichiers (iCloud Drive, OneDrive…) s'il t'arrive par message. Une sauvegarde complète s'importe de la même façon."),
    erreursImport(app));
}

export function vueProfil(app) {
  const f = app.ficheActive();
  const p = f.physiologie;
  return h("section", { class: "vue vue-profil" },
    h("h1", {}, f.athlete.prenom),
    h("p", { class: "sous-titre" }, `Fiche du ${fmtDateLongue(f.creee)}`),
    erreursImport(app),

    h("section", { class: "bloc" },
      h("h2", {}, "Allures de référence sur plat"),
      ALLURES.map(([id, nom]) => h("div", { class: "ligne" },
        h("span", {}, nom, h("em", {}, p.sourcesAllures[id])),
        h("b", {}, `${fmtAllure(p.allures[id])} /km`)))),

    h("section", { class: "bloc" },
      h("h2", {}, `Fréquence cardiaque · max ${p.fcMax} bpm${p.fcMaxSource === "estimee" ? " (estimée)" : ""}`),
      ZONES.map((z) => h("div", { class: "ligne" },
        h("span", {}, `${z.nom} · ${z.role}`),
        h("b", {}, `${Math.round(p.fcMax * z.bas)}-${Math.round(p.fcMax * z.haut)}`))),
      f.regles?.plafondsFc ? h("p", { class: "discret" },
        `Plafonds : endurance ${f.regles.plafondsFc.endurance ?? "—"} · tempo ${f.regles.plafondsFc.tempo ?? "—"} · seuil ${f.regles.plafondsFc.seuil ?? "—"} bpm`) : null),

    h("section", { class: "bloc" },
      h("h2", {}, "Disponibilités"),
      [...f.disponibilites.jours].sort((a, b) => a.jour - b.jour).map((j) => h("div", { class: "ligne" },
        h("span", {}, capitaliser(JOURS_LONGS[j.jour - 1]), h("em", {}, ROLES[j.role])),
        h("b", {}, `${fmtDuree(j.dureeMax)}${j.dureeMaxPonctuelle ? ` (jusqu'à ${fmtDuree(j.dureeMaxPonctuelle)})` : ""}`))),
      Object.entries(f.activites).filter(([, a]) => a.pratique).length
        ? h("p", { class: "discret" }, `Autres activités : ${Object.entries(f.activites).filter(([, a]) => a.pratique).map(([n]) => ({ skiRando: "ski de randonnée", skiFond: "ski de fond" }[n] ?? n)).join(", ")}.`) : null),

    f.reference ? h("section", { class: "bloc" },
      h("h2", {}, "Course de référence"),
      h("p", {}, h("b", {}, f.reference.nom), ` · ${fmtDateLongue(f.reference.date)}`),
      h("p", { class: "discret" }, `${fmtKm(f.reference.distance)} km, ${fmtMetres(f.reference.dplus)} m D+, ${fmtDuree(f.reference.temps)}`)) : null,

    f.sante?.vigilances?.length || f.sante?.consignes?.length ? h("section", { class: "bloc" },
      h("h2", {}, "Vigilances"),
      h("ul", { class: "liste" }, (f.sante.vigilances || []).map((v) => h("li", {}, v))),
      (f.sante.consignes || []).map((c) => h("div", { class: "encadre attention" }, c))) : null,

    h("section", { class: "bloc" },
      h("h2", {}, "Fiche"),
      h("p", { class: "discret" }, "Une nouvelle fiche du même athlète remplace l'actuelle ; une fiche d'un autre athlète s'ajoute, avec un sélecteur en haut de l'écran."),
      h("button", { type: "button", class: "bouton", onclick: app.choisirFichier }, "Importer une fiche"),
      h("button", { type: "button", class: "bouton danger", onclick: () => {
        if (confirm(`Supprimer la fiche de ${f.athlete.prenom} de ce téléphone ? Les déplacements de séances seront perdus.`)) app.supprimerFiche(f.athlete.id);
      } }, "Supprimer cette fiche")),
  );
}

function capitaliser(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
