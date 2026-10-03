// Copie complète de l'appli (coquille + données + TOUS les schémas) pour un
// usage 100% hors-ligne dès la première installation -- l'intérêt de cette
// appli est justement d'être consultée dans la voiture, pas toujours avec
// du réseau (parking souterrain, zone blanche...). Contrairement au réseau-
// d'abord des autres appli (Coffre, TrajetVE), ici on précharge tout au
// moment de l'installation : le contenu ne change pas entre deux sessions.

const CACHE_NOM = "noticekona-v3";
const FICHIERS_COQUILLE = ["./", "./index.html", "./style.css", "./manifest.json", "./js/main.js", "./js/markdown.js", "./js/mentions.js", "./js/stockage.js", "./js/checklists.js", "./data/notice.json", "./data/voyants.json", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NOM);
      await cache.addAll(FICHIERS_COQUILLE.map((f) => new Request(f, { cache: "reload" })));
      // Toutes les images de schémas citées dans notice.json, en plus de la
      // coquille -- sans ça, seules les fiches déjà ouvertes en ligne
      // auraient leurs images disponibles hors-ligne.
      try {
        const notice = await (await fetch("./data/notice.json")).json();
        const images = new Set();
        for (const cat of notice.categories || []) {
          for (const section of cat.sections || []) {
            for (const img of section.images || []) images.add(`./images/${img}`);
          }
        }
        await cache.addAll([...images].map((f) => new Request(f, { cache: "reload" })));
      } catch (e) {
        console.error("[NoticeKona SW] Préchargement des images impossible :", e);
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((n) => n.startsWith("noticekona-v") && n !== CACHE_NOM).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  // Cache d'abord (contenu figé, jamais modifié en arrière-plan) avec
  // repli réseau pour tout fichier pas encore en cache.
  event.respondWith(
    caches.match(event.request).then(
      (reponse) =>
        reponse ||
        fetch(event.request).then((reseau) => {
          if (reseau.ok) {
            const copie = reseau.clone();
            caches.open(CACHE_NOM).then((cache) => cache.put(event.request, copie));
          }
          return reseau;
        }),
    ),
  );
});
