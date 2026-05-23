const OFFLINE_CACHE = "35mm-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("35mm-offline-") && k !== OFFLINE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.open(OFFLINE_CACHE).then((cache) =>
        cache.match(OFFLINE_URL).then((res) => {
          if (!res) {
            return new Response(
              `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head><body style="font-family:sans-serif;padding:2rem;text-align:center;background:#faf9f7;color:#1a1917"><h1>You're offline</h1><p>Reconnect and try again.</p></body></html>`,
              {
                headers: { "Content-Type": "text/html; charset=utf-8" },
              }
            );
          }
          return res;
        })
      )
    )
  );
});
