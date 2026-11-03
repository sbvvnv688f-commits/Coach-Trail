import { test, vrai, egal } from "./harness.js";
import { chargerFictive } from "./fiche.test.js";
import { validerFiche } from "../../docs/js/data/fiche.js";
import { genererPlan, appliquerDeplacements, joursLibres } from "../../docs/js/core/planner.js";
import { jourSemaine, ajouterJours } from "../../docs/js/core/units.js";

const CONSTRUCTION = ["base", "developpement", "specifique"];

// Invariants valables pour toute fiche : utilisés aussi sur les fiches réelles (tests locaux).
export function verifierPlan(plan, fiche) {
  const e = [];
  if (plan.erreur) return [plan.erreur];
  const jours = new Set(fiche.disponibilites.jours.map((j) => j.jour));
  const dureeLongue = fiche.disponibilites.jours.find((j) => j.role === "longue").dureeMax;

  const course = plan.semaines.at(-1).seances.find((s) => s.role === "course" && s.date === plan.objectif.date);
  if (!course) e.push("course absente de la dernière semaine");
  else if (course.distance !== plan.objectif.distance) e.push(`course : ${course.distance} m au lieu de ${plan.objectif.distance}`);

  let reference = null, rang = 0;
  const construction = plan.semaines.filter((s) => CONSTRUCTION.includes(s.phase)).length;
  for (const sem of plan.semaines) {
    for (const s of sem.seances) {
      const somme = s.blocs.reduce((t, b) => t + b.duree, 0);
      if (s.role !== "course" && Math.abs(somme - s.duree) > 1) e.push(`${s.id} : durée ${s.duree} ≠ somme des blocs ${somme}`);
      const distBlocs = s.blocs.filter((b) => b.filiere === "longue" || b.filiere === "course");
      if (distBlocs.length && Math.abs(distBlocs.reduce((t, b) => t + b.distance, 0) - s.distance) > 1) e.push(`${s.id} : distance de sortie longue modifiée`);
      if (s.role !== "course" && !s.id.includes("-imp-") && !jours.has(jourSemaine(s.datePrevue))) e.push(`${s.id} : jour non disponible`);
      if (s.role === "longue" && s.duree > dureeLongue) e.push(`${s.id} : sortie longue de ${s.duree} s, au-delà de la durée maximale`);
      if (s.date > plan.objectif.date) e.push(`${s.id} : séance après la course`);
      for (const ind of fiche.disponibilites.indisponibilites || []) {
        if (s.date >= ind.du && s.date <= ind.au) e.push(`${s.id} : pendant une indisponibilité`);
      }
    }
    if (sem.seances.filter((s) => s.niveau >= 4).length > 1) e.push(`semaine ${sem.numero} : plus d'une séance dure`);
    if (CONSTRUCTION.includes(sem.phase)) {
      rang++;
      const attendue = rang % 4 === 0 && rang !== construction;
      if (sem.allegee !== attendue) e.push(`semaine ${sem.numero} : semaine allégée ${sem.allegee ? "inattendue" : "manquante"}`);
      if (!sem.allegee && !sem.perturbee) {
        if (reference !== null && sem.totaux.distance > reference * 1.1 + 1) {
          e.push(`semaine ${sem.numero} : charge + ${Math.round((sem.totaux.distance / reference - 1) * 100)} %`);
        }
        reference = sem.totaux.distance;
      }
    }
  }
  const premiere = plan.semaines.find((s) => CONSTRUCTION.includes(s.phase));
  if (premiere && premiere.totaux.distance > fiche.etat.volumeHebdo * 1.1) e.push("première semaine de construction au-delà du volume récent + 10 %");
  return e;
}

async function planFictif() {
  const v = validerFiche(await chargerFictive());
  return { fiche: v.fiche, plan: genererPlan(v.fiche) };
}

test("plan fictif : invariants respectés", async () => {
  const { fiche, plan } = await planFictif();
  const e = verifierPlan(plan, fiche);
  vrai(!e.length, e.join(" ; "));
});

test("plan fictif : 25 semaines, récupération 2, affûtage 3", async () => {
  const { plan } = await planFictif();
  egal(plan.semaines.length, 25);
  egal(plan.debut, "2026-10-05");
  egal(plan.semaines.filter((s) => s.phase === "recuperation").length, 2);
  egal(plan.semaines.filter((s) => s.phase === "affutage").length, 3);
  egal(plan.semaines.at(-1).seances.at(-1).date, "2027-03-28");
});

test("plan fictif : séance imposée et alternatives ski", async () => {
  const { plan } = await planFictif();
  const toutes = plan.semaines.flatMap((s) => s.seances);
  vrai(toutes.some((s) => s.date === "2027-02-14" && s.titre === "Course de préparation fictive"), "course de préparation absente");
  vrai(toutes.filter((s) => s.role === "longue").every((s) => s.alternatives.some((a) => a.activite === "Ski de randonnée")), "alternative ski absente");
});

test("plan fictif : points de contrôle et scénarios", async () => {
  const { plan } = await planFictif();
  vrai(plan.pointsControle.length >= 3, `${plan.pointsControle.length} points de contrôle`);
  egal(plan.scenarios.length, 3);
});

test("déplacement : dans la semaine accepté, hors semaine ignoré", async () => {
  const { plan } = await planFictif();
  const sem = plan.semaines[5];
  const s = sem.seances[0];
  const libre = joursLibres(sem, s)[0];
  appliquerDeplacements(plan, { [s.id]: libre });
  egal(s.date, libre);
  vrai(s.deplacee, "séance non marquée déplacée");
  appliquerDeplacements(plan, { [s.id]: ajouterJours(sem.lundi, 10) });
  egal(s.date, s.datePrevue);
});
