var SW_VERSION = "v3";
var OFFLINE_URL = "/offline.html";
var NAV_CACHE = "35mm-nav-" + SW_VERSION;
var STATIC_CACHE = "35mm-static-" + SW_VERSION;
var IMAGE_CACHE = "35mm-image-" + SW_VERSION;
var API_CACHE = "35mm-api-" + SW_VERSION;

var ALL_CACHES = [NAV_CACHE, STATIC_CACHE, IMAGE_CACHE, API_CACHE];

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

function isApiRequest(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/v1/");
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

function canCacheApiResponse(request, response) {
  if (!response) return false;
  if (!response.ok) return false;
  if (request.headers.get("authorization")) return false;

  var cacheControl = (response.headers.get("cache-control") || "").toLowerCase();
  if (cacheControl.includes("no-store")) return false;
  if (cacheControl.includes("private")) return false;
  return true;
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

async function networkFirstApi(request) {
  var cache = await caches.open(API_CACHE);
  try {
    var response = await fetch(request);
    if (canCacheApiResponse(request, response)) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (_error) {
    var cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ code: "OFFLINE", message: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
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

  if (isApiRequest(url)) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  if (isStaticAssetRequest(request, url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (isImmutableImageRequest(request, url)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  }
});
