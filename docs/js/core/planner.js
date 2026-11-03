// Génération du plan d'entraînement à partir d'une fiche athlète. Fonctions pures et déterministes.
//
// Principes (synthèse de l'historique) :
// - une seule séance dure par semaine (niveau 4 ou plus), tout le reste en endurance ;
// - charge hebdomadaire : + 10 % au plus d'une semaine chargée à la suivante, semaine allégée toutes les 4 ;
// - la distance d'une sortie longue ou d'une course est fixée, jamais déduite de sa durée ;
// - phases : récupération après la course de référence, base, développement, spécifique, affûtage.

import { ajouterJours, ecartJours, lundiDe, jourSemaine, fmtKm } from "./units.js";
import { calculerSeance } from "./session.js";
import { scenarios, distanceEffort } from "./predict.js";

export const PHASES = {
  recuperation: { nom: "Récupération", but: "Laisser le corps assimiler la dernière course. Aucune intensité." },
  base: { nom: "Base", but: "Construire le volume en endurance, installer le renforcement." },
  developpement: { nom: "Développement", but: "Travail au seuil, sorties longues plus longues et plus vallonnées." },
  specifique: { nom: "Spécifique", but: "Dénivelé et sorties longues au profil de la course, bâtons, nutrition." },
  affutage: { nom: "Affûtage", but: "Volume en baisse, intensité maintenue : arriver frais le jour J." },
};

const ROLES = ["qualite", "endurance", "cotes", "longue"];
const PAS_DUREE = 300;
const arrondirDuree = (s) => Math.max(PAS_DUREE, Math.round(s / PAS_DUREE) * PAS_DUREE);
const arrondirDistance = (m) => Math.round(m / 500) * 500;
const arrondirDplus = (m) => Math.round(m / 10) * 10;

// ---------- cadrage ----------

export function objectifPrincipal(fiche, depuis) {
  const futurs = (fiche.objectifs || [])
    .filter((o) => o.priorite === "A" && (!depuis || o.date >= depuis))
    .sort((a, b) => a.date.localeCompare(b.date));
  return futurs[0] || null;
}

export function dateDebut(fiche) {
  const ref = fiche.reference;
  if (ref && ecartJours(ref.date, fiche.creee) <= 28 && ecartJours(ref.date, fiche.creee) >= 0) {
    return lundiDe(ajouterJours(ref.date, 1));
  }
  return lundiDe(fiche.creee);
}

export function decouperPhases(nbSemaines, fiche, objectif, debut) {
  const ref = fiche.reference;
  let recup = 0;
  if (ref && ecartJours(ref.date, debut) <= 14) {
    recup = ref.distance >= 40000 ? 2 : ref.distance >= 21000 ? 1 : 0;
  }
  let affutage = objectif.distance >= 40000 || distanceEffort(objectif.distance, objectif.dplus) >= 60 ? 3
    : objectif.distance >= 21000 ? 2 : 1;
  let reste = nbSemaines - recup - affutage;
  while (reste < 3 && (recup > 0 || affutage > 1)) {
    if (recup > 0) recup--; else affutage--;
    reste = nbSemaines - recup - affutage;
  }
  reste = Math.max(0, reste);
  const base = Math.round(reste * 0.4);
  const dev = Math.round(reste * 0.35);
  const spe = reste - base - dev;
  const liste = [];
  const ajouter = (id, n) => { for (let i = 0; i < n; i++) liste.push({ id, rang: i, total: n }); };
  ajouter("recuperation", recup);
  ajouter("base", base);
  ajouter("developpement", dev);
  ajouter("specifique", spe);
  ajouter("affutage", affutage);
  return { liste, recup, base, dev, spe, affutage, construction: reste };
}

// ---------- briques de séances ----------

const echauffement = (s = 1200) => ({ duree: s, filiere: "fond", terrain: true, titre: "Échauffement progressif", consigne: "Départ très souple, jusqu'au lieu de la séance" });
const retourCalme = () => ({ duree: 600, filiere: "recup", titre: "Retour au calme", consigne: "Foulée relâchée" });
const liaison = (s) => ({ duree: s, filiere: "fond", terrain: true, titre: "Footing de liaison", consigne: "Sur le relief habituel, allure facile" });

function avecLiaison(blocs, cible) {
  const utilise = blocs.reduce((t, b) => t + (b.repeter ? b.repeter * b.blocs.reduce((u, x) => u + x.duree, 0) - (b.sansDernier ? b.blocs.slice(-b.sansDernier).reduce((u, x) => u + x.duree, 0) : 0) : b.duree), 0);
  const reste = arrondirDuree(cible) - utilise - 600;
  const out = [...blocs];
  if (reste >= PAS_DUREE) out.push(liaison(reste));
  out.push(retourCalme());
  return out;
}

const TEMPO = [[2, 8], [3, 8], [2, 12], [3, 10], [2, 15], [1, 20], [3, 12], [2, 20]];
const SEUIL = [[3, 8], [4, 8], [3, 10], [2, 15], [4, 10], [3, 12], [2, 20]];
const MONTEES = [[4, 8], [3, 12], [5, 8], [3, 15], [2, 20]];

function qualite(phase, rang, allegee, cible) {
  if (phase === "specifique" && !allegee) {
    const [n, d] = MONTEES[Math.min(rang, MONTEES.length - 1)];
    return {
      type: "Montées", titre: `Montées ${n} × ${d} min`, filiere: "cote",
      blocs: avecLiaison([echauffement(), {
        repeter: n, blocs: [
          { duree: d * 60, filiere: "cote", titre: "Montée {i} sur {n}", consigne: "Effort de seuil, courue ou marchée avec bâtons selon la pente ; régulière du début à la fin" },
          { duree: Math.round(d * 60 * 0.8), filiere: "desc", titre: "Descente", consigne: "Appuis actifs, cadence élevée, sans freiner" },
        ],
      }], cible),
      note: "Séance clé de la phase spécifique : l'effort de course en montée.",
    };
  }
  const seuil = phase === "developpement" || phase === "specifique" || phase === "affutage";
  const [n, d] = allegee ? (seuil ? [3, 6] : [2, 8]) : (seuil ? SEUIL : TEMPO)[Math.min(rang, (seuil ? SEUIL : TEMPO).length - 1)];
  const filiere = seuil ? "seuil" : "tempo";
  const nom = seuil ? "Seuil" : "Tempo";
  const corps = n === 1
    ? [{ duree: d * 60, filiere, titre: `${d} min continues à allure ${nom.toLowerCase()}`, consigne: "Allure régulière, sans accélérer en fin de bloc" }]
    : [{
      repeter: n, sansDernier: 1, blocs: [
        { duree: d * 60, filiere, titre: `Bloc {i} sur {n} à allure ${nom.toLowerCase()}`, consigne: "Allure régulière du début à la fin" },
        { duree: 180, filiere: "recup", titre: "Trot de récupération", consigne: "Assez lent pour que le souffle redescende" },
      ],
    }];
  return {
    type: nom,
    titre: n === 1 ? `${nom} ${d} min continu` : `${nom} ${n} × ${d} min`,
    filiere,
    blocs: avecLiaison([echauffement(), ...corps], cible),
    note: allegee ? "Semaine allégée : séance courte, pour garder le rythme sans fatigue." : "",
  };
}

function endurance(cible) {
  return {
    type: "EF", titre: "Endurance fondamentale", filiere: "fond",
    blocs: [{ duree: arrondirDuree(Math.max(2400, cible)), filiere: "fond", terrain: true, titre: "Footing continu", consigne: "Sur le relief habituel ; tu dois pouvoir parler par phrases entières" }],
    note: "Cette séance ne doit jamais être rapide. Si tu finis essoufflé, elle est ratée.",
  };
}

function cotes(phase, rang, cible, batons) {
  if (phase === "base" || phase === "recuperation") {
    const n = Math.min(6 + rang, 10);
    return {
      type: "Côtes", titre: `Côtes en endurance ${n} × 2 min`, filiere: "montee",
      blocs: avecLiaison([echauffement(900), {
        repeter: n, blocs: [
          { duree: 120, filiere: "montee", titre: "Montée {i} sur {n}", consigne: "Tonique mais contrôlée : petits pas, souffle maîtrisé" },
          { duree: 96, filiere: "desc", titre: "Descente trottinée", consigne: "Pose de pied douce" },
        ],
      }], cible),
      note: "Au-delà de 15-18 % de pente, marcher vite est plus économique que courir, et ménage l'Achille.",
    };
  }
  // Séance du vendredi : 1h20-1h30 au plus ; la séance longue de semaine reste la qualité du mardi.
  const n = 3;
  const d = phase === "specifique" ? 12 : 10;
  return {
    type: "Vallonné", titre: `Sortie vallonnée, ${n} montées de ${d} min`, filiere: "montee",
    blocs: avecLiaison([echauffement(900), {
      repeter: n, blocs: [
        { duree: d * 60, filiere: "montee", titre: "Montée {i} sur {n}", consigne: batons ? "En zone 2-3, avec bâtons : marche active dans le raide, course dans le roulant" : "En zone 2-3, marche active dans le raide, course dans le roulant" },
        { duree: Math.round(d * 60 * 0.8), filiere: "desc", titre: "Descente", consigne: "Appuis actifs, regard loin devant" },
      ],
    }], cible),
    note: "Dénivelé en endurance : la montée ne doit pas devenir une séance dure.",
  };
}

function longue(distance, ratio, phase, objectif) {
  const dplus = arrondirDplus(distance * ratio / 1000);
  const km = fmtKm(distance, distance % 1000 ? 1 : 0);
  if (phase === "specifique") {
    const d1 = arrondirDistance(distance * 0.6);
    return {
      type: "SL", titre: "Sortie longue", filiere: "longue",
      blocs: [
        { distance: d1, dplus: arrondirDplus(dplus * 0.6), filiere: "longue", titre: `Première partie, ${fmtKm(d1, 1)} km`, consigne: "Allure fondamentale, montées marchées dès que la pente l'impose" },
        { distance: distance - d1, dplus: dplus - arrondirDplus(dplus * 0.6), filiere: "longue", titre: `Seconde partie, ${fmtKm(distance - d1, 1)} km sur jambes fatiguées`, consigne: objectif.batons ? "Allure de course : montées avec bâtons, descentes en appui actif" : "Allure de course : montées marchées, descentes en appui actif" },
      ],
      note: "Sur terrain proche de celui de la course. Prise alimentaire toutes les 40 min, glucides dans la boisson.",
    };
  }
  return {
    type: "SL", titre: "Sortie longue", filiere: "longue",
    blocs: [{ distance, dplus, filiere: "longue", titre: `${km} km avec ${dplus} m D+`, consigne: "Allure fondamentale, sans bloc rapide" }],
    note: phase === "developpement"
      ? "Test nutrition : une prise toutes les 40 min dès la 45e, 400 à 500 ml de boisson par heure." + (objectif.batons ? " Sortie avec bâtons pour s'y habituer." : "")
      : "Facile pendant la première heure, puis c'est la durée qui pèse, jamais l'allure.",
  };
}

function footing(duree, titre, filiere = "fond", terrain = false, consigne = "Très facile, aucun essoufflement") {
  return { type: "Footing", titre, filiere, blocs: [{ duree, filiere, terrain, titre, consigne }], note: "" };
}

// ---------- génération ----------

export function genererPlan(fiche, options = {}) {
  const objectif = options.objectif || objectifPrincipal(fiche, fiche.creee);
  if (!objectif) return { erreur: "Aucun objectif de priorité A à venir dans la fiche." };

  const debut = dateDebut(fiche);
  const lundiCourse = lundiDe(objectif.date);
  const nbSemaines = ecartJours(debut, lundiCourse) / 7 + 1;
  if (nbSemaines < 2) return { erreur: "L'objectif est trop proche pour construire un plan." };

  const phases = decouperPhases(nbSemaines, fiche, objectif, debut);
  const terrain = { dplusParKm: 35, penaliteParCentM: 120, ...(fiche.terrain || {}) };
  const jours = new Map(fiche.disponibilites.jours.map((j) => [j.role, j]));
  const dureeMax = (role) => jours.get(role)?.dureeMax ?? 4500;
  const ratioCourse = objectif.dplus / objectif.distance * 1000;
  const ratioPhase = { base: terrain.dplusParKm, developpement: (terrain.dplusParKm + ratioCourse) / 2, specifique: ratioCourse, affutage: ratioCourse, recuperation: terrain.dplusParKm };

  const prediction = scenarios(fiche.reference, objectif, fiche.ajustement?.facteurPrediction ?? 1);
  const tempsCourse = prediction.find((s) => s.id === "realiste")?.temps ?? null;

  // Sortie longue : de ~ 1/3 du volume récent jusqu'à ~ 72 % de la distance de course.
  const longueMax = Math.max(10000, arrondirDistance(objectif.distance * 0.72));
  const longueDepart = Math.min(Math.max(10000, arrondirDistance(fiche.etat.volumeHebdo / 3)), longueMax * 0.5);
  const plafondLongue = { base: 0.65, developpement: 0.85, specifique: 1 };
  // Une sortie longue ne dépasse jamais la durée maximale déclarée dans la fiche.
  const limiterLongue = (distance, ratio) => {
    const fond = fiche.physiologie.allures.fond.valeur ?? fiche.physiologie.allures.fond;
    let d = distance;
    const duree = (x) => x / 1000 * fond * (x > 22000 ? 1.05 : 1) + x * ratio / 1000 / 100 * terrain.penaliteParCentM;
    while (d > 10000 && duree(d) > dureeMax("longue")) d -= 500;
    return d;
  };
  const plafondCharge = { base: 0.85, developpement: 0.95, specifique: 1 };

  let charge = null, distLongue = null, longueAtteinte = 0, chargeAtteinte = 0.75;
  let totalReference = null;
  const semaines = [];

  phases.liste.forEach((ph, i) => {
    const lundi = ajouterJours(debut, i * 7);
    const k = i - phases.recup + 1; // rang de construction (base → spécifique)
    const enConstruction = ["base", "developpement", "specifique"].includes(ph.id);
    const allegee = enConstruction && k % 4 === 0 && k !== phases.construction;

    const specs = new Map(); // rôle → séance (sans date)
    const progression = { chargeAtteinte, longueAtteinte };
    if (ph.id === "recuperation") {
      const finale = ph.rang === ph.total - 1;
      if (ph.rang === 0 && ph.total > 1) {
        specs.set("endurance", footing(1800, "Footing de décrassage", "recup"));
        specs.set("cotes", footing(2100, "Footing souple"));
        specs.set("longue", footing(2700, "Footing vallonné souple", "fond", true, "Sur le relief habituel, sans chercher les côtes"));
      } else {
        specs.set("qualite", footing(2400, "Footing de reprise"));
        specs.set("endurance", endurance(3000));
        specs.set("cotes", footing(2700, "Footing vallonné", "fond", true, "Allure facile"));
        specs.set("longue", longue(arrondirDistance(longueDepart * (finale ? 0.75 : 0.6)), terrain.dplusParKm, "base", objectif));
      }
    } else if (enConstruction) {
      if (allegee) {
        charge = chargeAtteinte * 0.7;
        distLongue = arrondirDistance(longueAtteinte * 0.7);
      } else {
        charge = charge === null ? 0.75 : Math.min(plafondCharge[ph.id], chargeAtteinte * 1.1);
        distLongue = longueAtteinte === 0 ? arrondirDistance(longueDepart)
          : arrondirDistance(Math.min(longueMax * plafondLongue[ph.id], longueAtteinte * 1.1));
        chargeAtteinte = charge;
        longueAtteinte = distLongue;
      }
      specs.set("qualite", qualite(ph.id, ph.rang, allegee, charge * dureeMax("qualite")));
      specs.set("endurance", endurance(charge * dureeMax("endurance")));
      if (!allegee) specs.set("cotes", cotes(ph.id, ph.rang, charge * dureeMax("cotes"), objectif.batons));
      distLongue = limiterLongue(distLongue, ratioPhase[ph.id]);
      if (!allegee) longueAtteinte = Math.min(longueAtteinte, distLongue);
      specs.set("longue", longue(distLongue, ratioPhase[ph.id], ph.id, objectif));
    } else { // affûtage
      const t = ph.rang, T = ph.total;
      const semaineCourse = t === T - 1;
      if (semaineCourse) {
        specs.set("qualite", {
          type: "Rappel", titre: "Rappel d'allure 3 × 3 min", filiere: "tempo",
          blocs: [echauffement(1200), { repeter: 3, sansDernier: 1, blocs: [
            { duree: 180, filiere: "tempo", titre: "Bloc {i} sur {n}", consigne: "Vif mais facile, pour réveiller la foulée" },
            { duree: 120, filiere: "recup", titre: "Trot", consigne: "Récupération complète" },
          ] }, retourCalme()],
          note: "Court et vif : réveiller la foulée sans créer de fatigue.",
        });
        specs.set("endurance", endurance(2100));
        specs.set("cotes", footing(1200, "Footing et lignes droites", "fond", false, "20 min très faciles, puis 3 accélérations progressives de 20 s"));
      } else {
        const f = T - t === 3 ? 0.75 : 0.55;
        const base = chargeAtteinte * f;
        specs.set("qualite", qualite(T - t === 3 ? "affutage" : "base", 0, false, base * dureeMax("qualite")));
        specs.set("endurance", endurance(base * dureeMax("endurance")));
        specs.set("cotes", cotes("developpement", 0, base * dureeMax("cotes"), objectif.batons));
        specs.set("longue", longue(arrondirDistance(longueAtteinte * (T - t === 3 ? 0.6 : 0.4)), ratioCourse, "developpement", objectif));
      }
    }

    // Placement sur les jours de la fiche
    let seances = [];
    for (const role of ROLES) {
      const spec = specs.get(role);
      const jour = jours.get(role);
      if (!spec || !jour) continue;
      const date = ajouterJours(lundi, jour.jour - 1);
      seances.push({ ...spec, role, id: `s${i + 1}-${role}`, date, datePrevue: date });
    }

    // Semaine de course : la course remplace la séance du jour et celle de la veille.
    if (lundi === lundiCourse) {
      seances = seances.filter((s) => s.date < ajouterJours(objectif.date, -1));
      seances.push({
        role: "course", type: "Course", titre: objectif.nom, filiere: "course", cle: true,
        id: `s${i + 1}-course`, date: objectif.date, datePrevue: objectif.date,
        blocs: [{ distance: objectif.distance, dplus: objectif.dplus, filiere: "course", titre: `${fmtKm(objectif.distance, 0)} km avec ${objectif.dplus} m D+`, consigne: "Les deux premières heures doivent sembler trop lentes" }],
        dureeFixe: tempsCourse ?? undefined,
        note: "Départ calé sur l'effort de sortie longue, pas sur les sensations des premiers kilomètres. Prise alimentaire toutes les 30 à 40 min dès la première heure.",
      });
    }

    // Séances imposées par la fiche
    for (const imp of fiche.seancesImposees || []) {
      if (imp.date < lundi || imp.date > ajouterJours(lundi, 6) || imp.date === objectif.date) continue;
      seances = seances.filter((s) => s.date !== imp.date);
      seances.push({
        role: imp.type === "course" ? "course" : "longue", type: imp.type === "course" ? "Course" : imp.type === "montagne" ? "Montagne" : "SL",
        titre: imp.nom || "Séance imposée", filiere: imp.type === "course" ? "course" : "longue", cle: true,
        id: `s${i + 1}-imp-${imp.date}`, date: imp.date, datePrevue: imp.date,
        blocs: [{ distance: imp.distance, dplus: imp.dplus || 0, filiere: "longue", titre: `${fmtKm(imp.distance, 0)} km avec ${imp.dplus || 0} m D+`, consigne: imp.consigne || "Allure de sortie longue" }],
        note: imp.consigne || "",
      });
    }

    // Indisponibilités
    const avant = seances.length;
    for (const ind of fiche.disponibilites.indisponibilites || []) {
      seances = seances.filter((s) => s.date < ind.du || s.date > ind.au);
    }
    // Semaine modifiée par une indisponibilité ou une séance imposée : hors de la règle des 10 %.
    const perturbee = seances.length !== avant || seances.some((s) => s.id.includes("-imp-"));
    if (perturbee) ({ chargeAtteinte, longueAtteinte } = progression); // la progression reprend la semaine suivante

    // Calculs, renforcement, alternatives
    let calc = calculerSemaine(seances, fiche, ph, i);

    // Charge : pas plus de + 10 % par rapport à la dernière semaine chargée.
    if (enConstruction && !allegee && !perturbee) {
      if (totalReference !== null) {
        const limite = totalReference * 1.1;
        for (const role of ["endurance", "cotes"]) {
          const s = seances.find((x) => x.role === role);
          if (!s) continue;
          while (totalSemaine(calc) > limite && reduire(s)) calc = calculerSemaine(seances, fiche, ph, i);
        }
      }
      totalReference = totalSemaine(calc);
    }

    semaines.push({
      numero: i + 1, lundi, phase: ph.id, rangPhase: ph.rang, allegee,
      seances: calc, perturbee,
      totaux: totaliser(calc),
    });
  });

  marquerSeancesCles(semaines);

  return {
    athlete: fiche.athlete.id,
    objectif, debut, fin: objectif.date,
    phases: resumePhases(semaines),
    semaines,
    scenarios: prediction,
    pointsControle: pointsDeControle(semaines),
  };
}

function reduire(seance) {
  // Raccourcit d'abord la liaison, sinon le footing continu ; jamais sous 40 min au total.
  const b = seance.blocs.find((x) => x.titre === "Footing de liaison") || seance.blocs.find((x) => x.titre === "Footing continu");
  const total = seance.blocs.reduce((t, x) => t + (x.duree || 0), 0);
  if (!b || b.duree <= PAS_DUREE || total <= 2400) return false;
  b.duree -= PAS_DUREE;
  return true;
}

function calculerSemaine(seances, fiche, phase, i) {
  const renfoJours = new Set(fiche.renfo?.jours || []);
  const ski = fiche.activites || {};
  const fcMax = fiche.physiologie.fcMax;
  return seances
    .map((s) => {
      const c = calculerSeance(s, fiche);
      const jour = jourSemaine(s.date);
      const renfo = renfoJours.has(jour) && phase.id !== "recuperation"
        && !(phase.id === "affutage" && phase.rang === phase.total - 1) && s.role !== "course";
      return {
        ...s, ...c, deroule: s.blocs, phase: phase.id, semaine: i + 1, fcMax,
        renfo, alternatives: alternatives(s.role, c, ski),
        datePrevue: s.datePrevue || s.date,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function alternatives(role, c, ski) {
  const out = [];
  const heures = c.duree / 3600;
  if (ski.skiRando?.pratique && role === "longue") {
    out.push({ activite: "Ski de randonnée", duree: c.duree, dplus: arrondirDplus(Math.max(c.dplus, heures * 360)), texte: "Montées en zone 2, conversation possible ; descente prudente, jambes encore fraîches pour le reste de la semaine." });
  }
  if (ski.skiRando?.pratique && role === "cotes") {
    out.push({ activite: "Ski de randonnée", duree: c.duree, dplus: arrondirDplus(heures * 500), texte: "Montée régulière en zone 2-3, sans pic d'intensité." });
  }
  if (ski.skiFond?.pratique && role === "endurance") {
    out.push({ activite: "Ski de fond", duree: c.duree, dplus: null, texte: "Même durée, en zone 2 stricte." });
  }
  return out;
}

export function totaliser(seances) {
  return seances.reduce((t, s) => ({
    distance: t.distance + s.distance, dplus: t.dplus + s.dplus, duree: t.duree + s.duree,
  }), { distance: 0, dplus: 0, duree: 0 });
}

const totalSemaine = (seances) => totaliser(seances).distance;

function marquerSeancesCles(semaines) {
  const longues = (phase) => semaines.filter((s) => s.phase === phase && !s.allegee).map((s) => s.seances.find((x) => x.role === "longue")).filter(Boolean);
  const derniere = (l) => l[l.length - 1];
  const finBase = derniere(longues("base"));
  const finDev = derniere(longues("developpement"));
  const spe = longues("specifique");
  const test = spe.length >= 3 ? spe[Math.floor((spe.length - 1) / 2)] : null;
  const pic = derniere(spe);
  if (finBase) Object.assign(finBase, { cle: true, controle: "Fin de la base : la sortie longue doit rester facile du début à la fin, FC sous le plafond d'endurance." });
  if (finDev) Object.assign(finDev, { cle: true, controle: "Fin du développement : test de nutrition complet et bâtons sur toute la sortie." });
  if (test && test !== pic) Object.assign(test, { cle: true, titre: "Sortie test", controle: "Sortie test, remplaçable par une course de préparation de distance proche. Son chrono affine la cible de course." });
  if (pic) Object.assign(pic, { cle: true, titre: "Répétition générale", controle: "Répétition générale : tenue, chaussures, sac, nutrition et horaire du jour J." });
}

function resumePhases(semaines) {
  const out = [];
  for (const s of semaines) {
    const last = out[out.length - 1];
    if (last && last.id === s.phase) { last.fin = ajouterJours(s.lundi, 6); last.semaines++; }
    else out.push({ id: s.phase, nom: PHASES[s.phase].nom, but: PHASES[s.phase].but, debut: s.lundi, fin: ajouterJours(s.lundi, 6), semaines: 1 });
  }
  return out;
}

function pointsDeControle(semaines) {
  return semaines.flatMap((s) => s.seances.filter((x) => x.controle).map((x) => ({ id: x.id, date: x.date, titre: x.titre, texte: x.controle, distance: x.distance, dplus: x.dplus })));
}

// ---------- déplacements ----------

// Applique les déplacements enregistrés ({ idSeance: date }), limités à la semaine de la séance.
export function appliquerDeplacements(plan, deplacements = {}) {
  for (const sem of plan.semaines) {
    const dimanche = ajouterJours(sem.lundi, 6);
    for (const s of sem.seances) {
      const cible = deplacements[s.id];
      s.date = cible && cible >= sem.lundi && cible <= dimanche ? cible : s.datePrevue;
      s.deplacee = s.date !== s.datePrevue;
    }
    sem.seances.sort((a, b) => a.date.localeCompare(b.date));
  }
  return plan;
}

// Marque les séances validées par l'athlète ({ idSeance: date de validation }) et compte, par semaine,
// les séances faites parmi celles déjà passées ou du jour.
export function marquerRealisees(plan, realisees = {}, aujourdhui = null) {
  for (const sem of plan.semaines) {
    for (const s of sem.seances) {
      s.faite = !!realisees[s.id];
      s.valideeLe = realisees[s.id] || null;
    }
    const echues = sem.seances.filter((s) => s.faite || (aujourdhui && s.date <= aujourdhui));
    sem.bilan = { faites: sem.seances.filter((s) => s.faite).length, echues: echues.length, total: sem.seances.length };
  }
  return plan;
}

export function joursLibres(semaine, seance) {
  const pris = new Set(semaine.seances.filter((s) => s !== seance).map((s) => s.date));
  const out = [];
  for (let j = 0; j < 7; j++) {
    const d = ajouterJours(semaine.lundi, j);
    if (!pris.has(d) && d !== seance.date) out.push(d);
  }
  return out;
}
