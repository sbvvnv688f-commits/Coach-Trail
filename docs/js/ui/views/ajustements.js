// Modification des allures de référence, de la FC max et des zones, dans le volet bas.
// Les valeurs s'ajoutent à la fiche sans la modifier (core/ajustements.js) ; le plan et les temps visés
// sont recalculés à l'enregistrement. Allures en deux champs (min, s) : saisie possible au clavier
// numérique iOS, et « 53 » ne peut pas passer pour 53 min/km.

import { h, vider, icone, ICONES } from "../dom.js";
import { fmtAllure, fmtDuree } from "../../core/units.js";
import { ZONES, zonesBpm } from "../../core/zones.js";
import { validerAjustements, facteurAllures, FILIERES_ALLURE } from "../../core/ajustements.js";

const NOMS = { fond: "Fondamental", tempo: "Tempo", seuil: "Seuil", recup: "Récupération" };

export function formulaireAjustements(app) {
  const origine = app.ficheOrigine();
  const actuelle = app.ficheActive();
  const realiste = app.etat.plan?.scenarios?.find((s) => s.id === "realiste");
  const tempsSansAjustement = realiste ? realiste.temps / actuelle.ajustement.facteurPrediction : null;

  const champ = (attrs) => h("input", { type: "text", inputmode: "numeric", pattern: "[0-9]*", autocomplete: "off", class: "saisie", ...attrs });
  const allures = {};
  const lignesAllures = FILIERES_ALLURE.map((k) => {
    const v = Math.round(actuelle.physiologie.allures[k]);
    allures[k] = {
      min: champ({ value: String(Math.floor(v / 60)), maxlength: 2, "aria-label": `${NOMS[k]}, minutes`, oninput: apercu }),
      s: champ({ value: String(v % 60).padStart(2, "0"), maxlength: 2, "aria-label": `${NOMS[k]}, secondes`, oninput: apercu }),
    };
    return h("div", { class: "ligne-saisie" },
      h("span", {}, NOMS[k], h("em", {}, `fiche : ${fmtAllure(origine.physiologie.allures[k])}`)),
      h("span", { class: "allure-saisie" }, allures[k].min, h("b", {}, "'"), allures[k].s, h("small", {}, "/km")));
  });

  const fcMax = champ({ value: String(actuelle.physiologie.fcMax), maxlength: 3, "aria-label": "FC max en bpm", oninput: apercu });
  const zones = actuelle.physiologie.zones.map((z, i) => champ({ value: String(z), maxlength: 3, "aria-label": `Début de la ${ZONES[i].nom.toLowerCase()} en bpm`, oninput: apercu }));
  const fins = zones.map(() => h("b", { class: "zone-fin" }));
  const erreurs = h("div", { role: "alert" });
  const temps = h("p", { class: "apercu-temps" });

  const lire = () => {
    const n = (el) => (/^\d+$/.test(el.value.trim()) ? Number(el.value.trim()) : NaN);
    const a = {};
    for (const k of FILIERES_ALLURE) {
      const s = n(allures[k].s);
      a[k] = s >= 60 ? NaN : n(allures[k].min) * 60 + s;
    }
    return { allures: a, fcMax: n(fcMax), zones: zones.map(n) };
  };

  function apercu() {
    const v = lire();
    v.zones.forEach((z, i) => { fins[i].textContent = `→ ${i < 4 ? (Number.isFinite(v.zones[i + 1]) ? v.zones[i + 1] : "?") : (Number.isFinite(v.fcMax) ? v.fcMax : "?")}`; });
    if (tempsSansAjustement && FILIERES_ALLURE.every((k) => Number.isFinite(v.allures[k]))) {
      const t = tempsSansAjustement * facteurAllures(origine.physiologie.allures, v.allures);
      temps.textContent = fmtDuree(t) === fmtDuree(realiste.temps)
        ? `Temps visé réaliste : ${fmtDuree(t)}`
        : `Temps visé réaliste : ${fmtDuree(realiste.temps)} → ${fmtDuree(t)}`;
    } else temps.textContent = "";
  }

  function recalculerZones() {
    const max = lire().fcMax;
    if (!Number.isFinite(max)) return;
    zonesBpm(max).forEach((z, i) => { zones[i].value = String(z.bas); });
    apercu();
  }

  function enregistrer(e) {
    e.preventDefault();
    const v = lire();
    const liste = validerAjustements(v);
    vider(erreurs, liste.length ? h("div", { class: "bandeau alerte" }, h("ul", {}, liste.map((x) => h("li", {}, x.message)))) : null);
    if (liste.length) return;
    // Ne retenir que ce qui diffère de la fiche ; des zones égales aux zones par défaut suivent la FC max.
    const aj = {};
    if (FILIERES_ALLURE.some((k) => v.allures[k] !== origine.physiologie.allures[k])) aj.allures = v.allures;
    if (v.fcMax !== origine.physiologie.fcMax) aj.fcMax = v.fcMax;
    if (zonesBpm(v.fcMax).some((z, i) => z.bas !== v.zones[i])) aj.zones = v.zones;
    app.enregistrerAjustements(Object.keys(aj).length ? aj : null);
  }

  apercu();
  return h("form", { class: "seance ajustements", "aria-labelledby": "ajustements-titre", novalidate: true, onsubmit: enregistrer },
    h("header", { class: "seance-entete" },
      h("div", {},
        h("h2", { id: "ajustements-titre" }, "Allures et zones"),
        h("p", { class: "sous-titre" }, "Le plan et les temps visés suivent ces valeurs.")),
      h("button", { type: "button", class: "fermer", "aria-label": "Fermer", onclick: app.fermerVolet }, icone(ICONES.fermer))),

    h("section", { class: "bloc" },
      h("h3", {}, "Allures de référence sur plat"),
      lignesAllures,
      h("p", { class: "discret" }, "Cale-les sur des séances réelles : une sortie facile récente pour le fondamental, une séance de seuil pour le seuil."),
      temps),

    h("section", { class: "bloc" },
      h("h3", {}, "Fréquence cardiaque"),
      h("div", { class: "ligne-saisie" }, h("span", {}, "FC max", h("em", {}, `fiche : ${origine.physiologie.fcMax} bpm`)), h("span", { class: "allure-saisie" }, fcMax, h("small", {}, "bpm"))),
      ZONES.map((z, i) => h("div", { class: "ligne-saisie" },
        h("span", {}, `${z.nom} · ${z.role}`),
        h("span", { class: "allure-saisie" }, zones[i], fins[i]))),
      h("button", { type: "button", class: "bouton secondaire", onclick: recalculerZones }, "Recalculer les zones depuis la FC max"),
      h("p", { class: "discret" }, "Chaque zone commence à la valeur saisie et finit où commence la suivante. Les plafonds de ta fiche restent appliqués.")),

    erreurs,
    h("button", { type: "submit", class: "bouton" }, "Enregistrer et recalculer le plan"),
    actuelle.ajustement.allures || actuelle.ajustement.fcMax || actuelle.ajustement.zones
      ? h("button", { type: "button", class: "bouton secondaire", onclick: () => app.enregistrerAjustements(null) }, "Revenir aux valeurs de la fiche")
      : null,
  );
}
