// Démarrage, état, navigation. Aucune donnée d'athlète n'est embarquée : tout vient de la fiche
// importée par l'utilisateur et conservée dans le stockage local de l'appareil.

import { h, vider, icone, ICONES } from "./ui/dom.js";
import { validerFiche } from "./data/fiche.js";
import { genererPlan, appliquerDeplacements, marquerRealisees } from "./core/planner.js";
import { appliquerAjustements } from "./core/ajustements.js";
import { aujourdhui } from "./core/units.js";
import * as db from "./store/db.js";
import { lirePref, ecrirePref, testerPrefs } from "./store/settings.js";
import { lireFichierTexte, FORMAT_SAUVEGARDE } from "./store/backup.js";
import { vueCalendrier } from "./ui/views/calendrier.js";
import { ficheSeance } from "./ui/views/seance.js";
import { vueObjectif } from "./ui/views/objectif.js";
import { vueProfil, vueAccueil } from "./ui/views/profil.js";
import { vueReglages } from "./ui/views/reglages.js";

const ONGLETS = [
  { id: "calendrier", nom: "Calendrier" },
  { id: "objectif", nom: "Objectif" },
  { id: "profil", nom: "Profil" },
  { id: "reglages", nom: "Réglages" },
];

const etat = {
  fiches: new Map(),          // id → { brut, fiche }
  actif: null,
  ficheEffective: null,       // fiche active + ajustements de l'athlète (allures, FC max, zones)
  ajustements: null,
  plan: null,
  deplacements: {},
  realisees: {},              // { idSeance: date de validation }
  onglet: "calendrier",
  mois: null,
  aujourdhui: aujourdhui(),
  stockage: { base: null, prefs: null, persistant: null },
  erreursImport: null,
  majEnAttente: null,
};

const el = {
  entete: document.getElementById("entete"),
  bandeaux: document.getElementById("bandeaux"),
  vue: document.getElementById("vue"),
  onglets: document.getElementById("onglets"),
  volet: document.getElementById("volet"),
  voletContenu: document.getElementById("volet-contenu"),
  messages: document.getElementById("messages"),
  fichier: document.getElementById("fichier"),
};

export const app = {
  etat,
  rendre,
  aller,
  message,
  choisirFichier,
  ficheActive: () => etat.ficheEffective,
  ficheOrigine: () => etat.fiches.get(etat.actif)?.fiche ?? null,
  ouvrirSeance,
  ouvrirVolet,
  fermerVolet,
  deplacerSeance,
  basculerRealisee,
  enregistrerAjustements,
  choisirAthlete,
  supprimerFiche,
  importerTexte,
  activerMiseAJour,
};

// ---------- données ----------

const cleAjustements = (id) => `ajustements:${id}`;
const cleRealisees = (id) => `realisees:${id}`;

function recalculerPlan() {
  const origine = app.ficheOrigine();
  etat.ficheEffective = origine ? appliquerAjustements(origine, etat.ajustements) : null;
  const fiche = etat.ficheEffective;
  etat.plan = null;
  if (!fiche) return;
  const plan = genererPlan(fiche);
  if (plan.erreur) { etat.plan = plan; return; }
  etat.plan = marquerRealisees(appliquerDeplacements(plan, etat.deplacements), etat.realisees, etat.aujourdhui);
}

async function chargerFiches() {
  etat.fiches.clear();
  let bruts = [];
  try { bruts = await db.toutLire("fiches"); } catch { /* stockage indisponible : signalé par le bandeau */ }
  for (const brut of bruts) {
    const v = validerFiche(brut);
    if (v.ok) etat.fiches.set(v.fiche.athlete.id, { brut, fiche: v.fiche });
  }
  const pref = lirePref("athlete");
  etat.actif = etat.fiches.has(pref) ? pref : etat.fiches.keys().next().value ?? null;
  await chargerDeplacements();
}

async function chargerDeplacements() {
  etat.deplacements = {};
  etat.ajustements = null;
  etat.realisees = {};
  if (etat.actif) {
    try { etat.realisees = (await db.lire("divers", cleRealisees(etat.actif))) || {}; } catch { /* idem */ }
    try { etat.deplacements = (await db.lire("deplacements", etat.actif)) || {}; } catch { /* idem */ }
    try { etat.ajustements = (await db.lire("divers", cleAjustements(etat.actif))) || null; } catch { /* idem */ }
  }
  recalculerPlan();
}

async function enregistrerFiche(brut, fiche) {
  await db.ecrire("fiches", fiche.athlete.id, brut);
  etat.fiches.set(fiche.athlete.id, { brut, fiche });
}

// Importe une fiche ou une sauvegarde complète. Renvoie { ok, erreurs }.
async function importerTexte(texte) {
  let json;
  try { json = JSON.parse(texte); }
  catch { return { ok: false, erreurs: [{ chemin: "(fichier)", message: "ce fichier n'est pas du JSON valide" }] }; }

  try {
    if (json?.format === FORMAT_SAUVEGARDE) {
      const erreurs = [];
      let premier = null;
      for (const brut of json.fiches || []) {
        const v = validerFiche(brut);
        if (!v.ok) { erreurs.push(...v.erreurs); continue; }
        await enregistrerFiche(brut, v.fiche);
        premier ??= v.fiche.athlete.id;
      }
      for (const [id, d] of Object.entries(json.deplacements || {})) await db.ecrire("deplacements", id, d);
      for (const [id, a] of Object.entries(json.ajustements || {})) await db.ecrire("divers", cleAjustements(id), a);
      for (const [id, r] of Object.entries(json.realisees || {})) await db.ecrire("divers", cleRealisees(id), r);
      if (premier) await choisirAthlete(premier, false);
      message(erreurs.length ? "Sauvegarde restaurée en partie" : "Sauvegarde restaurée");
      return { ok: !erreurs.length, erreurs };
    }

    const v = validerFiche(json);
    if (!v.ok) return v;
    await enregistrerFiche(json, v.fiche);
    // Une nouvelle fiche du coach fait foi : les allures et zones modifiées dans l'application sont remplacées.
    const id = v.fiche.athlete.id;
    const avaitAjustements = await db.lire("divers", cleAjustements(id)).catch(() => null);
    if (avaitAjustements) await db.supprimer("divers", cleAjustements(id));
    await choisirAthlete(id, false);
    message(`Fiche de ${v.fiche.athlete.prenom} importée${avaitAjustements ? " ; tes allures et zones modifiées sont remplacées par celles de la fiche" : ""}`);
    return { ok: true, erreurs: [] };
  } catch (e) {
    return { ok: false, erreurs: [{ chemin: "(stockage)", message: `enregistrement impossible sur cet appareil : ${e.message}` }] };
  }
}

function choisirFichier() {
  el.fichier.value = "";
  el.fichier.click();
}

el.fichier.addEventListener("change", async () => {
  const f = el.fichier.files[0];
  if (!f) return;
  let texte;
  try { texte = await lireFichierTexte(f); }
  catch (e) { etat.erreursImport = [{ chemin: f.name, message: e.message }]; rendre(); return; }
  if (f.size < 400 && !texte.trim().startsWith("{")) {
    etat.erreursImport = [{ chemin: f.name, message: "fichier presque vide : s'il vient de Messages ou Mail, enregistre-le d'abord dans Fichiers, puis importe-le depuis Fichiers" }];
    rendre();
    return;
  }
  const r = await importerTexte(texte);
  etat.erreursImport = r.ok ? null : r.erreurs;
  if (r.ok) etat.onglet = "calendrier";
  rendre();
});

async function choisirAthlete(id, afficher = true) {
  etat.actif = id;
  etat.mois = null;
  ecrirePref("athlete", id);
  await chargerDeplacements();
  if (afficher) rendre();
}

async function supprimerFiche(id) {
  await db.supprimer("fiches", id);
  await db.supprimer("deplacements", id);
  await db.supprimer("divers", cleAjustements(id));
  await db.supprimer("divers", cleRealisees(id));
  etat.fiches.delete(id);
  etat.actif = etat.fiches.keys().next().value ?? null;
  await chargerDeplacements();
  message("Fiche supprimée de cet appareil");
  rendre();
}

// Allures, FC max et zones modifiées par l'athlète ; null revient aux valeurs de la fiche.
async function enregistrerAjustements(aj) {
  etat.ajustements = aj ? { ...aj, date: etat.aujourdhui } : null;
  let conserve = true;
  try {
    if (aj) await db.ecrire("divers", cleAjustements(etat.actif), etat.ajustements);
    else await db.supprimer("divers", cleAjustements(etat.actif));
  } catch { conserve = false; }
  recalculerPlan();
  fermerVolet();
  message(conserve
    ? (aj ? "Plan et temps visés recalculés" : "Valeurs de la fiche rétablies")
    : "Plan recalculé, mais modification non conservée après fermeture");
  rendre();
}

// Valide une séance comme faite, ou annule la validation.
async function basculerRealisee(seance) {
  const faite = !etat.realisees[seance.id];
  if (faite) etat.realisees[seance.id] = etat.aujourdhui;
  else delete etat.realisees[seance.id];
  let conserve = true;
  try { await db.ecrire("divers", cleRealisees(etat.actif), etat.realisees); } catch { conserve = false; }
  recalculerPlan();
  message(!conserve ? "Validation non conservée après fermeture" : faite ? "Séance validée" : "Validation annulée");
  if (faite) fermerVolet();
  else ouvrirSeance(seance.id);
  rendre();
}

async function deplacerSeance(seance, date) {
  if (date === seance.datePrevue) delete etat.deplacements[seance.id];
  else etat.deplacements[seance.id] = date;
  try {
    await db.ecrire("deplacements", etat.actif, etat.deplacements);
    message(date === seance.datePrevue ? "Séance remise au jour prévu" : "Séance déplacée");
  } catch {
    message("Séance déplacée, mais non conservée après fermeture");
  }
  recalculerPlan();
  fermerVolet();
  rendre();
}

// ---------- affichage ----------

function aller(onglet) {
  if (location.hash !== `#${onglet}`) location.hash = onglet;
  else { etat.onglet = onglet; rendre(); }
}

window.addEventListener("hashchange", () => {
  const id = location.hash.slice(1);
  if (ONGLETS.some((o) => o.id === id)) { etat.onglet = id; fermerVolet(); rendre(); el.vue.scrollTop = 0; }
});

function rendreEntete() {
  const fiche = app.ficheActive();
  vider(el.entete,
    h("div", { class: "marque" }, h("img", { class: "marque-logo", src: "icons/icon-192.png", alt: "" }), h("span", { class: "marque-casse" }, "Casse"), h("span", { class: "marque-pattes" }, "Pattes")),
    fiche && etat.fiches.size > 1
      ? h("label", { class: "athlete-choix" },
        h("span", { class: "visuellement-cache" }, "Athlète"),
        h("select", { onchange: (e) => choisirAthlete(e.target.value) },
          [...etat.fiches.values()].map(({ fiche: f }) => h("option", { value: f.athlete.id, selected: f.athlete.id === etat.actif }, f.athlete.prenom))))
      : fiche ? h("button", { class: "athlete", type: "button", onclick: () => aller("profil") }, fiche.athlete.prenom) : null,
  );
}

function rendreBandeaux() {
  const b = [];
  if (etat.stockage.base === false || etat.stockage.prefs === false) {
    b.push(h("div", { class: "bandeau alerte", role: "alert" },
      h("strong", {}, "Les données ne seront pas conservées ici. "),
      "Ce navigateur refuse le stockage local. Ouvre Casse-Pattes depuis son adresse, puis ajoute-la à l'écran d'accueil par le bouton Partager de Safari."));
  }
  if (etat.majEnAttente) {
    b.push(h("div", { class: "bandeau info" }, "Une nouvelle version est disponible. ",
      h("button", { type: "button", class: "lien", onclick: activerMiseAJour }, "Mettre à jour")));
  }
  vider(el.bandeaux, b);
}

function rendreOnglets() {
  const avecFiche = !!app.ficheActive();
  vider(el.onglets, ONGLETS.map((o) => h("a", {
    href: `#${o.id}`,
    class: "onglet",
    "aria-current": etat.onglet === o.id ? "page" : null,
    "aria-disabled": !avecFiche && o.id !== "reglages" && o.id !== "profil" ? "true" : null,
  }, icone(ICONES[o.id]), h("span", {}, o.nom))));
}

function rendre() {
  rendreEntete();
  rendreBandeaux();
  rendreOnglets();
  let vue;
  if (etat.onglet === "reglages") vue = vueReglages(app);
  else if (!app.ficheActive()) vue = vueAccueil(app);
  else if (etat.onglet === "profil") vue = vueProfil(app);
  else if (etat.plan?.erreur) vue = h("section", { class: "vue" }, h("div", { class: "bandeau alerte" }, etat.plan.erreur));
  else if (etat.onglet === "objectif") vue = vueObjectif(app);
  else vue = vueCalendrier(app);
  vider(el.vue, vue);
}

let declencheur = null;

function ouvrirSeance(id) {
  const seance = etat.plan?.semaines.flatMap((s) => s.seances).find((s) => s.id === id);
  if (seance) ouvrirVolet(ficheSeance(app, seance), "seance-titre");
}

// Volet bas générique : `titreId` = id du titre qui nomme la boîte de dialogue.
function ouvrirVolet(contenu, titreId) {
  declencheur = document.activeElement;
  el.voletContenu.setAttribute("aria-labelledby", titreId);
  vider(el.voletContenu, contenu);
  el.volet.hidden = false;
  document.body.classList.add("volet-ouvert");
  el.voletContenu.scrollTop = 0;
  el.voletContenu.querySelector(".fermer")?.focus();
}

function fermerVolet() {
  if (el.volet.hidden) return;
  el.volet.hidden = true;
  document.body.classList.remove("volet-ouvert");
  declencheur?.focus?.();
}

el.volet.addEventListener("click", (e) => { if (e.target === el.volet) fermerVolet(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") fermerVolet(); });

function message(texte) {
  const m = h("div", { class: "message" }, texte);
  el.messages.append(m);
  setTimeout(() => m.remove(), 2800);
}

// ---------- service worker ----------

function activerMiseAJour() {
  etat.majEnAttente?.postMessage({ type: "activer" });
}

async function enregistrerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register("./sw.js");
    const signaler = (sw) => { etat.majEnAttente = sw; rendreBandeaux(); };
    if (reg.waiting && navigator.serviceWorker.controller) signaler(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const sw = reg.installing;
      sw?.addEventListener("statechange", () => {
        if (sw.state === "installed" && navigator.serviceWorker.controller) signaler(sw);
      });
    });
    let recharge = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (recharge) return;
      recharge = true;
      location.reload();
    });
  } catch { /* hors ligne indisponible : l'application reste utilisable */ }
}

// ---------- démarrage ----------

async function demarrer() {
  const local = ["127.0.0.1", "localhost"].includes(location.hostname);
  const p = new URLSearchParams(location.search);
  // Captures d'écran sans interface (DEV/tools/run-tests.py) : une requête lente tenue ouverte empêche
  // Chrome de figer la page avant la fin du démarrage. Poste local uniquement.
  let pret = false;
  if (local && p.has("attendre")) (async () => { while (!pret) await fetch("/__attendre").catch(() => {}); })();

  const [base, persistant] = await Promise.all([db.testerBase(), navigator.storage?.persisted?.() ?? Promise.resolve(null)]);
  etat.stockage = { base, prefs: testerPrefs(), persistant };
  await chargerFiches();

  const id = location.hash.slice(1);
  if (ONGLETS.some((o) => o.id === id)) etat.onglet = id;

  // Outil de développement, actif uniquement sur le poste local : ?fiche=<fichier> charge une fiche
  // servie par DEV/tools/serve.py ; ?ouvrir=<date> ouvre la séance de ce jour ; ?jour=<date> fixe la date ;
  // ?cliquer=<sélecteur CSS> clique sur un élément après l'affichage (captures d'un volet).
  if (local) {
    if (p.get("jour")) etat.aujourdhui = p.get("jour");
    if (p.get("fiche")) {
      const r = await fetch(`/fiches/${encodeURIComponent(p.get("fiche"))}`);
      if (r.ok) await importerTexte(await r.text());
    }
  }
  rendre();
  if (local && p.get("ouvrir")) {
    const s = etat.plan?.semaines?.flatMap((x) => x.seances).find((x) => x.date === p.get("ouvrir"));
    if (s) ouvrirSeance(s.id);
  }
  if (local && p.get("cliquer")) document.querySelector(p.get("cliquer"))?.click();
  pret = true;
  if (!local || !p.has("attendre")) enregistrerServiceWorker();
}

demarrer();
