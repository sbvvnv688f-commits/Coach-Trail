// Glissé d'une séance au doigt (docs/js/ui/glisser.js), avec des événements de pointeur simulés.

import { test, egal, vrai } from "./harness.js";
import { activerGlisser } from "../../docs/js/ui/glisser.js";

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

function monter() {
  const grille = document.createElement("div");
  grille.style.cssText = "display:grid;grid-template-columns:repeat(4,60px);gap:4px;position:fixed;left:0;top:0;z-index:9";
  const dates = ["2027-01-04", "2027-01-05", "2027-01-06", "2027-01-07"];
  for (const [i, d] of dates.entries()) {
    const c = document.createElement(i === 0 ? "button" : "div");
    c.className = "case";
    c.dataset.date = d;
    if (i === 0) c.dataset.seance = "s1";
    c.style.cssText = "height:60px;background:#ddd";
    grille.append(c);
  }
  document.body.append(grille);
  const journal = { depose: null, clics: 0 };
  grille.firstChild.addEventListener("click", () => journal.clics++);
  activerGlisser(grille, {
    cibles: () => new Set(["2027-01-06"]),
    deposer: (c, date) => { journal.depose = date; },
  });
  const centre = (i) => {
    const r = grille.children[i].getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };
  return { grille, journal, centre };
}

const pointeur = (el, type, [x, y]) => el.dispatchEvent(new PointerEvent(type, {
  bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, pointerType: "touch", isPrimary: true,
}));

test("appui long puis glissé vers un jour autorisé : séance déposée, pas d'ouverture", async () => {
  const { grille, journal, centre } = monter();
  pointeur(grille.children[0], "pointerdown", centre(0));
  await attendre(520);
  vrai(grille.classList.contains("glisse-actif"), "le glissé n'a pas démarré");
  vrai(grille.children[2].classList.contains("cible") && !grille.children[1].classList.contains("cible"), "cibles mal marquées");
  pointeur(grille.children[0], "pointermove", centre(2));
  pointeur(grille.children[0], "pointerup", centre(2));
  grille.children[0].click();
  egal(journal.depose, "2027-01-06");
  egal(journal.clics, 0, "la séance s'est ouverte :");
  vrai(!document.querySelector(".fantome"), "fantôme resté affiché");
  grille.remove();
});

test("relâcher sur un jour non autorisé : rien ne bouge", async () => {
  const { grille, journal, centre } = monter();
  pointeur(grille.children[0], "pointerdown", centre(0));
  await attendre(520);
  pointeur(grille.children[0], "pointermove", centre(1));
  pointeur(grille.children[0], "pointerup", centre(1));
  egal(journal.depose, null);
  grille.remove();
});

test("geste qui bouge avant la fin de l'appui : défilement, pas de glissé", async () => {
  const { grille, journal, centre } = monter();
  const [x, y] = centre(0);
  pointeur(grille.children[0], "pointerdown", [x, y]);
  pointeur(grille.children[0], "pointermove", [x, y + 30]);
  await attendre(520);
  vrai(!grille.classList.contains("glisse-actif"), "glissé démarré pendant un défilement");
  pointeur(grille.children[0], "pointerup", [x, y + 30]);
  egal(journal.depose, null);
  grille.remove();
});

test("appui bref : la séance s'ouvre normalement", async () => {
  const { grille, journal, centre } = monter();
  pointeur(grille.children[0], "pointerdown", centre(0));
  await attendre(100);
  pointeur(grille.children[0], "pointerup", centre(0));
  await attendre(450);
  grille.children[0].click();
  egal(journal.clics, 1);
  grille.remove();
});
