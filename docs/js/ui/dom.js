// Construction du DOM sans innerHTML : tout texte passe par des nœuds texte.

export function h(tag, attrs = {}, ...enfants) {
  const el = document.createElement(tag);
  for (const [cle, val] of Object.entries(attrs || {})) {
    if (val == null || val === false) continue;
    if (cle === "class") el.className = val;
    else if (cle === "style" && typeof val === "object") Object.assign(el.style, val);
    else if (cle.startsWith("on") && typeof val === "function") el.addEventListener(cle.slice(2).toLowerCase(), val);
    else if (cle === "dataset") Object.assign(el.dataset, val);
    else if (val === true) el.setAttribute(cle, "");
    else el.setAttribute(cle, val);
  }
  ajouter(el, enfants);
  return el;
}

function ajouter(el, enfants) {
  for (const e of enfants) {
    if (e == null || e === false) continue;
    if (Array.isArray(e)) ajouter(el, e);
    else el.append(e instanceof Node ? e : document.createTextNode(String(e)));
  }
}

export function vider(el, ...enfants) {
  el.replaceChildren();
  ajouter(el, enfants);
  return el;
}

const NS = "http://www.w3.org/2000/svg";
// Petite icône de trait (24 × 24), chemins fournis par l'appelant.
export function icone(chemins, taille = 22) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", taille);
  svg.setAttribute("height", taille);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  for (const d of [].concat(chemins)) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    svg.append(p);
  }
  return svg;
}

export const ICONES = {
  calendrier: ["M4 6h16v14H4z", "M4 10h16", "M8 3v4", "M16 3v4"],
  objectif: ["M3 20l6-10 4 6 3-4 5 8z", "M9 10V4l4 2-4 2"],
  profil: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"],
  reglages: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19 12h2M3 12h2M12 3v2M12 19v2M17 7l1.5-1.5M5.5 18.5 7 17M17 17l1.5 1.5M5.5 5.5 7 7"],
  precedent: ["M15 5l-7 7 7 7"],
  suivant: ["M9 5l7 7-7 7"],
  fermer: ["M6 6l12 12M18 6 6 18"],
};
