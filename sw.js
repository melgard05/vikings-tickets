/* Vikings Season Ticket Board — service worker
   No editing required. index.html hashes its own bytes and passes the result as ?v=,
   so every deploy gets its own cache name and the previous cache is deleted below. */
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE = "viktix-" + VERSION;
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
               "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png",
               "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // cache:"reload" forces these off the network — otherwise the browser's own
      // HTTP cache can hand us the previous deploy and we'd cache a stale shell.
      Promise.all(SHELL.map(u =>
        fetch(new Request(u, { cache: "reload" }))
          .then(r => (r && r.ok) ? c.put(u, r) : null)
          .catch(() => null)
      ))
    )
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Build probe: must always reflect what is actually deployed, never the cache.
  if (url.searchParams.has("_bt")) {
    e.respondWith(fetch(req).catch(() => new Response("", { status: 503 })));
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isSync = /firebaseio\.com|firebasedatabase\.app/.test(url.hostname);

  if (isSync || !sameOrigin) {
    e.respondWith(fetch(req).catch(() => new Response("", { status: 503 })));
    return;
  }

  const isPage = req.mode === "navigate" ||
                 (req.headers.get("accept") || "").includes("text/html");

  // Page: network first, so a fresh deploy always wins; cache is the offline fallback.
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

  // Icons and manifest: cache first, refreshed in the background.
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

self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});
