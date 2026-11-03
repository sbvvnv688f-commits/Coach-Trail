// Accès IndexedDB, sans bibliothèque.
// Magasins : fiches (clé = id d'athlète, valeur = fiche brute importée),
//            deplacements (clé = id d'athlète, valeur = { idSeance: date }), divers.

const NOM = "casse-pattes";
const VERSION = 1;
let connexion = null;

// Certaines versions d'iOS ont laissé indexedDB.open sans réponse : au-delà du délai, échec explicite.
const DELAI_OUVERTURE = 4000;

function ouvrir() {
  connexion ??= new Promise((resoudre, rejeter) => {
    const minuterie = setTimeout(() => rejeter(new Error("la base locale ne répond pas")), DELAI_OUVERTURE);
    const r = indexedDB.open(NOM, VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      for (const s of ["fiches", "deplacements", "divers"]) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
    };
    r.onsuccess = () => { clearTimeout(minuterie); resoudre(r.result); };
    r.onerror = () => { clearTimeout(minuterie); rejeter(r.error); };
    r.onblocked = () => { clearTimeout(minuterie); rejeter(new Error("base bloquée par un autre onglet")); };
  }).catch((e) => { connexion = null; throw e; });
  return connexion;
}

async function transaction(magasin, mode, action) {
  const db = await ouvrir();
  return new Promise((resoudre, rejeter) => {
    const t = db.transaction(magasin, mode);
    const req = action(t.objectStore(magasin));
    t.oncomplete = () => resoudre(req?.result);
    t.onerror = () => rejeter(t.error);
    t.onabort = () => rejeter(t.error || new Error("transaction annulée"));
  });
}

export const lire = (magasin, cle) => transaction(magasin, "readonly", (s) => s.get(cle));
export const ecrire = (magasin, cle, valeur) => transaction(magasin, "readwrite", (s) => s.put(valeur, cle));
export const supprimer = (magasin, cle) => transaction(magasin, "readwrite", (s) => s.delete(cle));
export const toutLire = (magasin) => transaction(magasin, "readonly", (s) => s.getAll());

// Test réel : écriture, relecture, suppression.
export async function testerBase() {
  try {
    const jeton = String(Date.now());
    await ecrire("divers", "test", jeton);
    const relu = await lire("divers", "test");
    await supprimer("divers", "test");
    return relu === jeton;
  } catch {
    return false;
  }
}
