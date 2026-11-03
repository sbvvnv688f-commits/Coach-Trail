// Déplacement d'une séance au doigt : appui long sur sa case, puis glissé vers un jour libre de la même
// semaine. Un geste qui bouge avant la fin de l'appui reste un défilement ; un appui bref reste un toucher
// (ouverture de la séance).
//
// iOS : le défilement est bloqué pendant le glissé par un écouteur touchmove non passif ; l'appel du menu
// contextuel et la sélection de texte sont neutralisés en CSS (.grille).

const DELAI_APPUI = 450;     // ms
const TOLERANCE = 10;        // px de mouvement admis pendant l'appui

// options : { cibles(caseSource) → Set de dates autorisées, deposer(caseSource, date) }
export function activerGlisser(grille, options) {
  let g = null; // geste en cours
  let bloquerClicJusqua = 0;

  const caseSous = (x, y) => document.elementFromPoint(x, y)?.closest?.(".case[data-date]");

  const annuler = () => {
    if (!g) return;
    clearTimeout(g.minuterie);
    g.fantome?.remove();
    grille.classList.remove("glisse-actif");
    grille.querySelectorAll(".cible, .survol, .source").forEach((c) => c.classList.remove("cible", "survol", "source"));
    g = null;
  };

  const demarrer = () => {
    const autorisees = options.cibles(g.source);
    if (!autorisees.size) { annuler(); return; }
    g.actif = true;
    g.autorisees = autorisees;
    grille.classList.add("glisse-actif");
    g.source.classList.add("source");
    for (const c of grille.querySelectorAll(".case[data-date]")) if (autorisees.has(c.dataset.date)) c.classList.add("cible");
    const r = g.source.getBoundingClientRect();
    g.fantome = g.source.cloneNode(true);
    g.fantome.classList.add("fantome");
    g.fantome.removeAttribute("aria-label");
    Object.assign(g.fantome.style, { width: `${r.width}px`, height: `${r.height}px` });
    g.dx = g.x - r.left;
    g.dy = g.y - r.top;
    document.body.append(g.fantome);
    placer(g.x, g.y);
    navigator.vibrate?.(15);
  };

  const placer = (x, y) => {
    g.fantome.style.transform = `translate(${x - g.dx}px, ${y - g.dy}px) scale(1.08)`;
    const c = caseSous(x, y);
    grille.querySelectorAll(".survol").forEach((e) => e.classList.remove("survol"));
    if (c && g.autorisees.has(c.dataset.date)) c.classList.add("survol");
  };

  grille.addEventListener("pointerdown", (e) => {
    const source = e.target.closest("button.case[data-seance]");
    if (!source || e.button > 0) return;
    annuler();
    g = { source, x: e.clientX, y: e.clientY, id: e.pointerId, actif: false };
    g.minuterie = setTimeout(demarrer, DELAI_APPUI);
  });

  grille.addEventListener("pointermove", (e) => {
    if (!g || e.pointerId !== g.id) return;
    if (!g.actif) {
      if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > TOLERANCE) annuler();
      return;
    }
    e.preventDefault();
    placer(e.clientX, e.clientY);
  });

  const finir = (e) => {
    if (!g || e.pointerId !== g.id) return;
    if (!g.actif) { annuler(); return; }
    const c = e.type === "pointerup" ? caseSous(e.clientX, e.clientY) : null;
    const source = g.source;
    const date = c && g.autorisees.has(c.dataset.date) ? c.dataset.date : null;
    annuler();
    bloquerClicJusqua = performance.now() + 400; // le clic qui suit le relâcher n'ouvre pas la séance
    if (date) options.deposer(source, date);
  };
  grille.addEventListener("pointerup", finir);
  grille.addEventListener("pointercancel", finir);

  grille.addEventListener("click", (e) => {
    if (performance.now() < bloquerClicJusqua) { e.stopPropagation(); e.preventDefault(); }
  }, { capture: true });
  grille.addEventListener("touchmove", (e) => { if (g?.actif) e.preventDefault(); }, { passive: false });
  grille.addEventListener("contextmenu", (e) => { if (e.target.closest(".case[data-seance]")) e.preventDefault(); });
}
