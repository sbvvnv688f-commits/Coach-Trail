// Mini-cadre de test, sans dépendance. Le rapport est écrit dans <pre id="rapport">,
// lu par DEV/tools/run-tests.py.

const tests = [];

export class Ignore extends Error {}

export function test(nom, fn) { tests.push({ nom, fn }); }
export function ignorer(raison) { throw new Ignore(raison); }

export function vrai(condition, message = "condition fausse") {
  if (!condition) throw new Error(message);
}

export function egal(obtenu, attendu, message = "") {
  if (obtenu !== attendu) throw new Error(`${message} obtenu ${JSON.stringify(obtenu)}, attendu ${JSON.stringify(attendu)}`.trim());
}

export function proche(obtenu, attendu, tolerance, message = "") {
  if (!(Math.abs(obtenu - attendu) <= tolerance)) throw new Error(`${message} obtenu ${obtenu}, attendu ${attendu} ± ${tolerance}`.trim());
}

export async function executer() {
  const lignes = [];
  let ok = 0, echecs = 0, ignores = 0;
  for (const t of tests) {
    try {
      await t.fn();
      ok++;
      lignes.push(`OK      ${t.nom}`);
    } catch (e) {
      if (e instanceof Ignore) { ignores++; lignes.push(`IGNORÉ  ${t.nom} : ${e.message}`); }
      else { echecs++; lignes.push(`ÉCHEC   ${t.nom} : ${e.message}`); }
    }
  }
  lignes.push("", `RÉSULTAT ${ok} réussis, ${echecs} en échec, ${ignores} ignorés`);
  const pre = document.getElementById("rapport");
  pre.textContent = lignes.join("\n");
  pre.dataset.statut = echecs ? "echec" : "ok";
}
