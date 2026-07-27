/* Vikings Season Ticket Board — service worker
   No editing required. The version comes from the ?v= value that index.html
   passes at registration, which is derived from index.html's Last-Modified time.
   Deploy a new index.html and this worker versions itself automatically. */
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE = "viktix-" + VERSION;
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
               "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png",
               "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Fetch handler — required for installability.
   Page HTML: network first, so a fresh deploy is picked up immediately and a stale
   copy can never get stuck; the cache is the offline fallback.
   Icons/manifest: cache first, refreshed in the background.
   Firebase and anything cross-origin: network only, never cached. */
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isSync = /firebaseio\.com|firebasedatabase\.app/.test(url.hostname);

  if (isSync || !sameOrigin) {
    e.respondWith(fetch(req).catch(() => new Response("", { status: 503 })));
    return;
  }

  const isPage = req.mode === "navigate" ||
                 (req.headers.get("accept") || "").includes("text/html");

  if (isPage) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

/* Let the page activate a waiting worker when the user taps the green light. */
self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});
