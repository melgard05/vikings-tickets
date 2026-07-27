/* Vikings Season Ticket Board — service worker
   BUMP THIS to the same number as BUILD in index.html on every deploy. */
const BUILD = 2;
const CACHE = "viktix-v" + BUILD;
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
               "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png",
               "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Fetch handler — required for installability.
   App shell: cache first, refreshed in the background.
   Firebase (and any cross-origin call): straight to the network, never cached. */
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

/* Let the page trigger an immediate update when the user taps the green light. */
self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});
