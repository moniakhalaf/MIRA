/* MIRA service worker — offline launch for the installed PWA.
   Strategy: network-first for the app shell (so fresh deploys land the
   moment you're online), falling back to the last cached copy offline.
   Cross-origin requests (api.anthropic.com, Wikimedia photos, OpenFoodFacts)
   are never intercepted — they go straight to the network. */
const CACHE = "mira-shell-v1";
const SHELL = ["./", "./index.html"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
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
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;           // leave API/CDN calls untouched

  // App shell / navigations: network-first, cache the latest, fall back offline.
  if (req.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/")) {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return res; })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }
  // Other same-origin GETs: cache-first with network fallback.
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
