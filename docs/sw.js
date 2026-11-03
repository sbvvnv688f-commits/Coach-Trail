// Service worker : application disponible hors ligne, mise à jour sur demande de l'utilisateur.
// VERSION doit être égale à VERSION_APP de js/version.js (vérifié par les tests) : sans changement
// de version, l'iPhone garde l'ancienne application en cache.

const VERSION = "1.0.0";
const CACHE = `casse-pattes-${VERSION}`;

const FICHIERS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/tokens.css",
  "./css/app.css",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./js/app.js",
  "./js/version.js",
  "./js/core/units.js",
  "./js/core/zones.js",
  "./js/core/session.js",
  "./js/core/predict.js",
  "./js/core/planner.js",
  "./js/data/fiche.js",
  "./js/data/textes.js",
  "./js/data/exercices.js",
  "./js/store/db.js",
  "./js/store/settings.js",
  "./js/store/backup.js",
  "./js/ui/dom.js",
  "./js/ui/views/calendrier.js",
  "./js/ui/views/seance.js",
  "./js/ui/views/objectif.js",
  "./js/ui/views/profil.js",
  "./js/ui/views/reglages.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS.map((f) => new Request(f, { cache: "reload" })))));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const nom of await caches.keys()) if (nom.startsWith("casse-pattes-") && nom !== CACHE) await caches.delete(nom);
    await self.clients.claim();
  })());
});

self.addEventListener("message", (e) => {
  if (e.data?.type === "activer") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const enCache = await caches.match(req, { ignoreSearch: req.mode === "navigate" });
    if (enCache) return enCache;
    try {
      return await fetch(req);
    } catch {
      if (req.mode === "navigate") return caches.match("./index.html");
      throw new Error("hors ligne");
    }
  })());
});
