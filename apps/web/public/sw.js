var SW_VERSION = "v5";
var OFFLINE_URL = "/offline.html";
var NAV_CACHE = "35mm-nav-" + SW_VERSION;
var STATIC_CACHE = "35mm-static-" + SW_VERSION;
var IMAGE_CACHE = "35mm-image-" + SW_VERSION;
var ALL_CACHES = [NAV_CACHE, STATIC_CACHE, IMAGE_CACHE];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(NAV_CACHE).then(function (cache) {
      return cache.add(OFFLINE_URL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key.indexOf("35mm-") === 0 && !ALL_CACHES.includes(key);
          })
          .map(function (key) {
            return caches.delete(key);
          })
      )
    })
  );
  self.clients.claim();
});

function isNavigationRequest(request) {
  return request.mode === "navigate";
}

function isStaticAssetRequest(request, url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/fonts/")) return true;
  if (url.pathname.startsWith("/icons/")) return true;
  return (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font"
  );
}

function isImmutableImageRequest(request, url) {
  if (request.destination !== "image") return false;
  if (url.hostname.endsWith(".r2.dev")) return true;
  if (url.hostname.endsWith("imagedelivery.net")) return true;
  if (url.origin === self.location.origin && url.pathname.startsWith("/images/")) return true;
  return false;
}

async function networkFirstNavigation(request) {
  try {
    return await fetch(request);
  } catch (_error) {
    var cache = await caches.open(NAV_CACHE);
    var cached = await cache.match(OFFLINE_URL);
    if (cached) return cached;

    return new Response(
      "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Offline</title></head><body style='font-family:sans-serif;padding:2rem;text-align:center;background:#faf9f7;color:#1a1917'><h1>You're offline</h1><p>Reconnect and try again.</p></body></html>",
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}

function isLocalDevHost(url) {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1";
}

async function networkFirstWithCache(request, cacheName) {
  try {
    var response = await fetch(request);
    if (response.ok || response.type === "opaque") {
      var cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (_error) {
    var cache = await caches.open(cacheName);
    var cached = await cache.match(request);
    if (cached) return cached;
    throw _error;
  }
}

async function cacheFirst(request, cacheName) {
  var cache = await caches.open(cacheName);
  var cached = await cache.match(request);
  if (cached) return cached;

  var response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url = new URL(request.url);

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAssetRequest(request, url)) {
    // Dev + Turbopack reuse URLs; cache-first caused stale layout JS in Safari.
    if (isLocalDevHost(url)) return;
    event.respondWith(networkFirstWithCache(request, STATIC_CACHE));
    return;
  }

  if (isImmutableImageRequest(request, url)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  }
});
