// Préférences légères dans localStorage (athlète actif, date de dernière sauvegarde).
// Chaque accès est protégé : le stockage peut être refusé (navigation privée, aperçu iOS).

const PREFIXE = "cp_";

export function lirePref(cle, defaut = null) {
  try {
    const v = localStorage.getItem(PREFIXE + cle);
    return v === null ? defaut : JSON.parse(v);
  } catch {
    return defaut;
  }
}

export function ecrirePref(cle, valeur) {
  try {
    localStorage.setItem(PREFIXE + cle, JSON.stringify(valeur));
    return true;
  } catch {
    return false;
  }
}

export function testerPrefs() {
  try {
    localStorage.setItem(PREFIXE + "test", "1");
    const ok = localStorage.getItem(PREFIXE + "test") === "1";
    localStorage.removeItem(PREFIXE + "test");
    return ok;
  } catch {
    return false;
  }
}
